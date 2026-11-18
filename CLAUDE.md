# CLAUDE.md

BPS SMART: users add RAO files (`.txt`), enter the centre of gravity of each load case and a point, and get the acceleration envelope at that point. A C++ engine compiled to WebAssembly (Emscripten) does all the work **inside the browser**. No file is ever sent to a server. Vercel only builds and hosts static files. Two teams (frontend and backend) work in parallel. See `DEVELOPMENT_GUIDELINE.md` for the full rationale.

## Layout

```
contract/engine.d.ts      Engine contract: the single source of truth between teams
backend/                  C++17 engine (CMake), backend team
  src/rao.cpp               RAO file reader (format documented in rao.hpp and the contract)
  src/envelope.cpp          acceleration envelope at a point
  src/engine.cpp            validation, stored files, JSON in/out (was app.py)
  src/json.cpp              minimal JSON writer/parser
  src/bindings.cpp          embind surface = BpsEngine in the contract
  tests/                    native contract-level tests (ctest), synthetic RAO fixture
  scripts/build-wasm.sh     WebAssembly build, used by Vercel
frontend/                 React + Vite app, frontend team
  src/services/api.js       ONLY module that calls the engine
  src/services/mock.js      fake engine that follows the contract
  public/wasm/              build output of backend/ (gitignored)
VERSION                   Semver of the app (e.g. 0.1.0)
vercel.json               static build: WebAssembly engine, then Vite
```

## Commands

```bash
# Backend: native build + tests (any C++17 compiler, CMake >= 3.21, Ninja)
cd backend && cmake --preset native && cmake --build --preset native && ctest --preset native
#   also check real RAO tables (client data, never committed):
#   BPS_RAO_SAMPLES=<folder> ./build/native/bps_tests tests/data

# Backend: WebAssembly build -> frontend/public/wasm/ (needs the Emscripten SDK, $EMSDK set)
cd backend && cmake --preset wasm && cmake --build --preset wasm
#   this machine: SDK in C:\dev\emsdk (4.0.10, activated with --permanent; open a new shell)
bash backend/scripts/build-wasm.sh     # same, and installs a pinned SDK if none is active

# Frontend (no engine needed: uses the mock on :8080 by default)
npm ci --prefix frontend && npm run dev --prefix frontend      # http://localhost:8080
# Against the real WebAssembly engine (build it first): http://localhost:8080/?mock=0
```

## Rules

- **Contract first.** Any engine interface change starts as an edit to `contract/engine.d.ts`, merged to `dev` with approval from both teams, before implementation. Prefer additive changes. Breaking changes bump the contract MAJOR.
- **Team boundaries.** Frontend team: `frontend/` only (except `frontend/public/wasm/`, a backend build output). Backend team: `backend/` only. Shared files (`contract/`, `vercel.json`, `VERSION`, `CLAUDE.md`, `DEVELOPMENT_GUIDELINE.md`, `README.md`) change only via PR to `dev`.
- **Frontend**: all engine calls go through `frontend/src/services/api.js`. Never hardcode limits; read `getLimits()`. Never insert engine strings as raw HTML (React escapes text; avoid `dangerouslySetInnerHTML`). Keep `mock.js` in sync with the contract.
- **Flow**: files are read by the engine one by one as soon as they are added (`readRaoFile`, kept in memory under a `file_id`). Calculate sends only the form data (`calculateEnvelope` with file ids, LCG/TCG/KG per load case, point). Removing a file calls `releaseRaoFile`.
- **Backend**: RAO parsing lives in `rao.cpp`, the calculation in `envelope.cpp`. `engine.cpp` is the boundary layer and `bindings.cpp` only maps it to JS. Validate extension, size, UTF-8 and RAO format in the engine, with line numbers in error messages. One bad file never fails the batch. Keep the core free of Emscripten headers so it builds and tests natively.
- **Client data**: real RAO files never go into the repo. Tests use the synthetic fixture in `backend/tests/data/`.
- **Uploads**: `.txt` only. The per-file limit (`max_file_bytes`, 32 MiB) lives in `backend/include/bps/engine.hpp`.
- Add or adjust a test in `backend/tests/test_engine.cpp` whenever the contract changes.

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
- The semver comes from the `VERSION` file. Bump it in the PR that promotes `dev` → `main` (MAJOR for breaking contract changes, MINOR for features, PATCH for fixes), then tag the merge commit on `main` as `v<semver>`.
- The commit hash is baked into the engine at build time by `backend/cmake/GenerateVersion.cmake`: `VERCEL_GIT_COMMIT_SHA` on Vercel, `git rev-parse HEAD` locally, else `unknown`. It is regenerated on every build.
- Exposed by the engine's `getVersion()` and shown in the page footer. Each deployment is therefore traceable to an exact commit.
