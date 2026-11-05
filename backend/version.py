"""Version = semver from the VERSION file + short commit hash.

The commit hash comes from (in order):
  1. VERCEL_GIT_COMMIT_SHA  — set automatically on Vercel deployments
  2. `git rev-parse HEAD`   — local development
  3. "unknown"
"""

import os
import subprocess
from functools import lru_cache
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
VERSION_FILE = REPO_ROOT / "VERSION"
SHORT_SHA_LEN = 7


def _semver() -> str:
    try:
        return VERSION_FILE.read_text(encoding="utf-8").strip() or "0.0.0"
    except OSError:
        return "0.0.0"


def _commit() -> str:
    sha = os.environ.get("VERCEL_GIT_COMMIT_SHA", "").strip()
    if not sha:
        try:
            sha = subprocess.run(
                ["git", "rev-parse", "HEAD"],
                cwd=REPO_ROOT,
                capture_output=True,
                text=True,
                timeout=5,
                check=True,
            ).stdout.strip()
        except (OSError, subprocess.SubprocessError):
            sha = ""
    return sha[:SHORT_SHA_LEN] if sha else "unknown"


@lru_cache(maxsize=1)
def get_version() -> dict:
    semver, commit = _semver(), _commit()
    return {"version": f"{semver}+{commit}", "semver": semver, "commit": commit}
