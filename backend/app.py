"""HTTP layer: routing, validation, CORS, errors.

Real processing lives in processing.py. This file should rarely change.
Run locally:  python backend/app.py   ->  http://127.0.0.1:5000
"""

import os
import sys
from pathlib import Path

from flask import Flask, jsonify, request
from werkzeug.exceptions import RequestEntityTooLarge
from werkzeug.utils import secure_filename

# Allow `python backend/app.py` as well as `import backend.app`.
sys.path.insert(0, str(Path(__file__).resolve().parent))

from processing import process_text  # noqa: E402
from version import get_version  # noqa: E402

ALLOWED_EXTENSIONS = (".txt",)
# Vercel Functions reject request bodies over 4.5 MB; stay below that.
MAX_REQUEST_BYTES = 4 * 1024 * 1024
# Only needed for local development, when the frontend (port 8080) calls the
# backend (port 5000). On Vercel both are served from the same origin.
DEFAULT_ALLOWED_ORIGINS = "http://localhost:8080,http://127.0.0.1:8080"


def create_app() -> Flask:
    app = Flask(__name__)
    app.config["MAX_CONTENT_LENGTH"] = MAX_REQUEST_BYTES
    allowed_origins = {
        o.strip()
        for o in os.environ.get("ALLOWED_ORIGINS", DEFAULT_ALLOWED_ORIGINS).split(",")
        if o.strip()
    }

    @app.after_request
    def add_cors(response):
        origin = request.headers.get("Origin")
        if origin and origin in allowed_origins:
            response.headers["Access-Control-Allow-Origin"] = origin
            response.headers["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS"
            response.headers["Access-Control-Allow-Headers"] = "Content-Type"
            response.headers["Vary"] = "Origin"
        return response

    @app.errorhandler(RequestEntityTooLarge)
    def too_large(_e):
        return jsonify(error=f"Request too large (max {MAX_REQUEST_BYTES} bytes)"), 413

    @app.get("/api/v1/health")
    def health():
        return jsonify(status="ok")

    @app.get("/api/v1/version")
    def version():
        return jsonify(get_version())

    @app.get("/api/v1/limits")
    def limits():
        return jsonify(
            allowed_extensions=list(ALLOWED_EXTENSIONS),
            max_request_bytes=MAX_REQUEST_BYTES,
        )

    @app.route("/api/v1/files", methods=["POST", "OPTIONS"])
    def upload_files():
        if request.method == "OPTIONS":
            return "", 204
        files = [f for f in request.files.getlist("files") if f and f.filename]
        if not files:
            return jsonify(error="No files provided (field name: 'files')"), 400

        results = []
        for f in files:
            name = secure_filename(f.filename) or "unnamed"
            if not name.lower().endswith(ALLOWED_EXTENSIONS):
                results.append({"name": name, "status": "error", "error": "Unsupported file type"})
                continue
            try:
                text = f.read().decode("utf-8")
            except UnicodeDecodeError:
                results.append({"name": name, "status": "error", "error": "File is not valid UTF-8 text"})
                continue
            try:
                results.append({"name": name, "status": "ok", **process_text(name, text)})
            except Exception:  # one bad file never sinks the batch
                app.logger.exception("Processing failed for %s", name)
                results.append({"name": name, "status": "error", "error": "Processing failed"})
        return jsonify(results=results)

    return app


app = create_app()

if __name__ == "__main__":
    app.run(host="127.0.0.1", port=5000, debug=True)
