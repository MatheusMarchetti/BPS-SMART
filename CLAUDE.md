# CLAUDE.md

Text File Uploader: users select one or more `.txt` files in a web page, and a Python (Flask) backend processes them. Two teams (frontend and backend) work in parallel. The app is deployed as **one Vercel project**. See `DEVELOPMENT_GUIDELINE.md` for the full rationale.

## Layout

```
contract/openapi.yaml   API contract: the single source of truth between teams
api/index.py            Vercel Python entry point (imports backend/app.py), backend team
backend/                Flask app (app.py), processing.py, version.py, tests, backend team
frontend/               Static HTML/CSS/vanilla-JS ES modules, frontend team
VERSION                 Semver of the app (e.g. 0.1.0)
vercel.json             outputDirectory=frontend; /api/* rewritten to api/index.py
requirements.txt        Runtime Python deps (installed by Vercel)
```

## Commands

```bash
# Backend (from repo root)
pip install -r backend/requirements-dev.txt
python backend/app.py            # API on http://127.0.0.1:5000
pytest backend                   # contract-level tests

# Frontend, no backend needed (uses frontend/mock.js automatically on :8080)
python -m http.server 8080 -d frontend
# Against the local Flask backend instead of the mock: http://localhost:8080/?mock=0
```

## Rules

- **Contract first.** Any API change starts as an edit to `contract/openapi.yaml`, merged to `dev` with approval from both teams, before implementation. Within `/api/v1`, changes must be additive only. Breaking changes go to `/api/v2`.
- **Team boundaries.** Frontend team: `frontend/` only. Backend team: `backend/`, `api/`, `requirements.txt` only. Shared files (`contract/`, `vercel.json`, `VERSION`, `CLAUDE.md`, `DEVELOPMENT_GUIDELINE.md`) change only via PR to `dev`.
- **Frontend**: all network calls go through `frontend/api.js`. Never hardcode limits; read `/api/v1/limits`. Escape server strings with `esc()` before inserting them into the DOM. Keep `frontend/mock.js` in sync with the spec.
- **Backend**: put processing logic in `backend/processing.py` (`process_text(name, text)` returns `{stats, preview}`). `app.py` is the HTTP layer only. Validate extension, encoding and size server-side. One bad file never fails the batch.
- **Uploads**: `.txt` only. Max request is 4 MB, because Vercel caps function bodies at 4.5 MB.
- Add or adjust a test in `backend/test_api.py` whenever the contract changes.

## Branches

| Branch | Purpose | Vercel |
|---|---|---|
| `main` | Production. Only receives merges from `dev`. | Production deploy |
| `dev` | Integration. Receives merges from `frontend` and `backend`. | Preview deploy |
| `frontend` | Frontend team integration branch | Preview deploy |
| `backend` | Backend team integration branch | Preview deploy |

Flow: `feature/<team>-<topic>` → `frontend` | `backend` → `dev` → `main`, always via pull request.
- Create feature branches from the team branch, and merge back into it.
- Keep team branches up to date by merging `dev` into them regularly.
- Never commit directly to `main` or `dev`.

## Versioning

Version string = `<semver>+<short commit hash>`, e.g. `0.1.0+a1b2c3d`.
- The semver comes from the `VERSION` file. Bump it in the PR that promotes `dev` → `main` (MAJOR for breaking `/api` changes, MINOR for features, PATCH for fixes), then tag the merge commit on `main` as `v<semver>`.
- The commit hash comes from `VERCEL_GIT_COMMIT_SHA` on Vercel, or from `git rev-parse HEAD` locally (`backend/version.py`). It falls back to `unknown`.
- Exposed at `GET /api/v1/version` and shown in the page footer. Each deployment is therefore traceable to an exact commit.
