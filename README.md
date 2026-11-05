# Text File Uploader

Upload one or more `.txt` files from the browser. A Python (Flask) backend processes them. Deployed as a single Vercel project.

- Team workflow, branches, and versioning: [CLAUDE.md](CLAUDE.md)
- Design rationale and Vercel notes: [DEVELOPMENT_GUIDELINE.md](DEVELOPMENT_GUIDELINE.md)
- API contract: [contract/openapi.yaml](contract/openapi.yaml)

## Quick start

```bash
pip install -r backend/requirements-dev.txt
pytest backend
python backend/app.py                      # backend on :5000
python -m http.server 8080 -d frontend     # frontend on :8080 (mock backend; add ?mock=0 for the real one)
```
