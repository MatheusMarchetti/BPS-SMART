# Text File Uploader — Development Guideline

A web app where the user selects one or more `.txt` files from their computer and clicks a button to send them to a Python backend for processing. The project is organized so the **frontend/UX team** and the **backend team** can work in parallel without blocking each other.

---

## 1. Project structure

```
./
├── contract/openapi.yaml # The contract between both teams
├── api/index.py          # Vercel entry point (imports backend/app.py)
├── backend/
│   ├── app.py            # HTTP layer (Flask): routing, validation, CORS, errors
│   ├── processing.py     # Real processing logic (backend team's playground)
│   ├── version.py        # semver (VERSION file) + commit hash
│   ├── test_api.py       # Contract-level tests
│   └── requirements-dev.txt
├── frontend/
│   ├── index.html        # Markup
│   ├── styles.css        # Styling (light/dark aware)
│   ├── app.js            # UI logic
│   ├── api.js            # ONLY file that talks to the network
│   ├── mock.js           # Fake backend following the contract
│   └── config.js         # USE_MOCK, API_BASE_URL
├── requirements.txt      # Runtime Python deps (Vercel installs these)
├── vercel.json           # Single-project config
├── VERSION               # App semver
├── CLAUDE.md             # Workflow, branches, versioning
└── README.md
```

> The contract lives in `contract/`, not `api/`, because Vercel reserves `api/` for serverless functions.

---

## 2. Core principle: the contract is the boundary

`contract/openapi.yaml` is the single source of truth. Both teams build against it, never against each other's code.

| Endpoint | Purpose |
|---|---|
| `GET /api/v1/health` | Liveness check |
| `GET /api/v1/version` | `{version, semver, commit}`, e.g. `0.1.0+a1b2c3d` |
| `GET /api/v1/limits` | Allowed extensions and max request size (the UI never hardcodes these) |
| `POST /api/v1/files` | Upload files as `multipart/form-data`, field name `files` |

**Upload response.** There is one entry per file, so a single bad file never fails the batch:

```json
{
  "results": [
    { "name": "a.txt", "status": "ok",
      "stats": { "lines": 2, "words": 4, "chars": 20 },
      "preview": "hello world…" },
    { "name": "b.exe", "status": "error", "error": "Unsupported file type" }
  ]
}
```

Request-level failures (no files, payload too large) return `400` / `413` with `{ "error": "..." }`.

### Rules for changing the contract
1. Edit `contract/openapi.yaml` **first**, via pull request to `dev`.
2. Both teams must approve before either implements.
3. Within `/v1`, only make **additive** changes. Breaking changes require `/api/v2`.
4. If the mock or the backend drifts from the spec, fix it to match the spec.

---

## 3. Frontend team workflow

No backend required.

```bash
python -m http.server 8080 -d frontend      # then open http://localhost:8080
```

- On `localhost:8080`, `config.js` uses the mock (`mock.js`) by default. Add `?mock=0` to call a local Flask backend at `127.0.0.1:5000` instead. When deployed, the page calls the same-origin `/api` automatically.
- Edit `mock.js` to simulate slow responses, request-level errors, large batches, etc.
- Keep all network code in `api.js`. UI code imports only `getLimits()`, `getVersion()` and `uploadFiles()`.
- Always escape server-provided strings before inserting them into the DOM (`esc()` in `app.js`).
- The app uses ES modules, so open it through an HTTP server, not `file://`.

### UI behavior
- A file field (`<input type="file" multiple>`) plus an **Upload** button.
- The `accept` attribute is populated from `/limits`.
- Controls are disabled during upload. Results render per file, with errors inline.
- The footer shows the app version from `/version`.

---

## 4. Backend team workflow

No UI required.

```bash
pip install -r backend/requirements-dev.txt
python backend/app.py            # http://127.0.0.1:5000
pytest backend                   # contract-level tests
curl -F files=@notes.txt http://127.0.0.1:5000/api/v1/files
```

- Put real processing in `processing.py` → `process_text(name, text)`. Keep the returned dict shape from `FileResult` in the spec, so `app.py` never needs to change.
- `app.py` handles the extension allow-list, `secure_filename`, UTF-8 decoding, per-file error isolation, the size limit and CORS.
- CORS is only needed locally (frontend on :8080, backend on :5000). The default allow-list is `http://localhost:8080,http://127.0.0.1:8080`. Override it with the env var `ALLOWED_ORIGINS` (comma-separated). On Vercel, the frontend and API share an origin.
- Defaults: allowed extension `.txt`. Max request size is 4 MB, to stay under Vercel's 4.5 MB body cap.
- Runtime dependencies go in the root `requirements.txt`. Dev-only tools go in `backend/requirements-dev.txt`.

---

## 5. Testing

Backend tests (`backend/test_api.py`) cover:
- the health endpoint
- the version format, including the preference for `VERCEL_GIT_COMMIT_SHA`
- limits
- a successful upload and its stats
- a mixed batch (valid file, unsupported extension, invalid UTF-8)
- missing files → `400`, oversized request → `413`
- CORS headers only for allowed origins

Add a test whenever the contract gains a field or endpoint.

---

## 6. Deploying to Vercel (single project)

`vercel.json` serves `frontend/` as static files. `/api/*` is rewritten to the Flask app in `api/index.py`. Vercel installs `requirements.txt` from the root.

### Steps
1. Push the repo to GitHub.
2. vercel.com/new → import the repo. Root Directory = repo root, Framework Preset = *Other*, no build command.
3. Production branch = `main`. Every other branch (`dev`, `frontend`, `backend`, feature branches) gets preview deployments.
4. Keep "Automatically expose System Environment Variables" enabled, so `VERCEL_GIT_COMMIT_SHA` reaches the function for versioning.

CLI alternative: run `vercel` at the repo root.

### Caveats
- The 4.5 MB request body cap applies. For larger files, upload directly from the browser to Vercel Blob storage.
- Functions are stateless with no persistent disk (fine, since nothing is stored).
- Functions have execution time limits. Heavy processing may need a different host.
- This deployment path has not been tested end to end. Verify it with a preview deploy first.

---

## 7. Working agreements

- **Contract first**, code second.
- **Frontend never hardcodes limits**; it reads `/api/v1/limits`.
- **Backend never trusts the client**: validate extension, encoding and size server-side, regardless of what the UI does.
- **One bad file never sinks the batch.**
- **Small PRs per team**. Cross-team changes touch only `contract/openapi.yaml` until approved.
- Branch flow and versioning: see `CLAUDE.md`.

---

## 8. Suggested next steps

- [ ] Add a GitHub remote and push all four branches
- [ ] Connect the repo to Vercel and verify a preview deploy from `dev`
- [ ] Replace the placeholder logic in `processing.py` with the real processing
- [ ] Add CI: run backend tests and validate `contract/openapi.yaml` on every PR
- [ ] Protect `main` and `dev` on GitHub (require PRs and reviews)
- [ ] Generate or validate the mock against the OpenAPI spec to prevent drift
- [ ] Decide on a large-file strategy (Vercel Blob direct upload) if files may exceed ~4 MB
