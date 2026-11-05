"""Contract-level tests. Run from the repo root:  pytest backend"""

import io
import re

import pytest

from app import MAX_REQUEST_BYTES, create_app
from version import get_version


@pytest.fixture
def client():
    return create_app().test_client()


def upload(client, *files, headers=None):
    data = {"files": [(io.BytesIO(content), name) for name, content in files]}
    return client.post("/api/v1/files", data=data, content_type="multipart/form-data", headers=headers)


def test_health(client):
    r = client.get("/api/v1/health")
    assert r.status_code == 200
    assert r.get_json() == {"status": "ok"}


def test_version_format(client):
    body = client.get("/api/v1/version").get_json()
    assert set(body) == {"version", "semver", "commit"}
    assert re.fullmatch(r"\d+\.\d+\.\d+", body["semver"])
    assert body["version"] == f"{body['semver']}+{body['commit']}"


def test_version_prefers_vercel_sha(monkeypatch):
    get_version.cache_clear()
    monkeypatch.setenv("VERCEL_GIT_COMMIT_SHA", "abcdef1234567890")
    try:
        assert get_version()["commit"] == "abcdef1"
    finally:
        get_version.cache_clear()


def test_limits(client):
    body = client.get("/api/v1/limits").get_json()
    assert body == {"allowed_extensions": [".txt"], "max_request_bytes": MAX_REQUEST_BYTES}


def test_upload_ok(client):
    r = upload(client, ("a.txt", b"hello world\nfoo bar\n"))
    assert r.status_code == 200
    [result] = r.get_json()["results"]
    assert result["name"] == "a.txt"
    assert result["status"] == "ok"
    assert result["stats"] == {"lines": 2, "words": 4, "chars": 20}
    assert result["preview"].startswith("hello world")


def test_mixed_batch(client):
    r = upload(
        client,
        ("good.txt", b"ok"),
        ("notes.md", b"# not allowed"),
        ("bad.txt", b"\xff\xfe\xfa"),
    )
    assert r.status_code == 200
    statuses = {x["name"]: x["status"] for x in r.get_json()["results"]}
    assert statuses == {"good.txt": "ok", "notes.md": "error", "bad.txt": "error"}


def test_no_files(client):
    r = client.post("/api/v1/files", data={}, content_type="multipart/form-data")
    assert r.status_code == 400
    assert "error" in r.get_json()


def test_too_large(client):
    r = upload(client, ("big.txt", b"x" * (MAX_REQUEST_BYTES + 1)))
    assert r.status_code == 413


def test_cors_allowed_origin(client):
    r = client.get("/api/v1/health", headers={"Origin": "http://localhost:8080"})
    assert r.headers.get("Access-Control-Allow-Origin") == "http://localhost:8080"


def test_cors_blocked_origin(client):
    r = client.get("/api/v1/health", headers={"Origin": "https://evil.example"})
    assert "Access-Control-Allow-Origin" not in r.headers
