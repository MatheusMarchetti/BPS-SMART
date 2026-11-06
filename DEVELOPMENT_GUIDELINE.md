# BPS SMART — Development Guideline

A web app that calculates the **acceleration envelope at a point of a floating unit** from its RAO tables. The user adds the RAO files (`.txt`, one per loading condition and sea state), enters the centre of gravity (LCG, TCG, KG) of each load case and the point coordinates, and clicks Calculate. All the work is done by a **C++ engine compiled to WebAssembly with Emscripten**, running inside the user's browser. Files never leave the user's machine. The project is organized so the **frontend/UX team** and the **backend (engine) team** can work in parallel without blocking each other.

### Why WebAssembly instead of a server

The first version sent files to a Python (Flask) function on Vercel. That design was replaced because:
- **Privacy**: no file is uploaded. Vercel only hosts static files.
- **No server limits**: no 4.5 MB request body cap, no function timeouts, no cold starts.
- **Performance**: native-speed C++ for the numerical work ahead (RAO/motion processing).
- **Cost and operations**: a static site has no backend to run, scale or secure.

---

## 1. Project structure

```
./
├── contract/engine.d.ts          # The contract between both teams
├── backend/                      # Backend team: C++17 engine
│   ├── CMakeLists.txt            # Native (tests) and Emscripten (WebAssembly) builds
│   ├── CMakePresets.json         # presets: native, wasm
│   ├── include/bps/              # rao.hpp, envelope.hpp, engine.hpp, json.hpp
│   ├── src/
│   │   ├── rao.cpp               # RAO file reader
│   │   ├── envelope.cpp          # Acceleration envelope at a point
│   │   ├── engine.cpp            # Boundary: validation, stored files, JSON in/out
│   │   ├── json.cpp              # Minimal JSON writer/parser
│   │   └── bindings.cpp          # embind: the JS functions listed in the contract
│   ├── cmake/GenerateVersion.cmake  # semver (VERSION) + commit hash -> bps/version.hpp
│   ├── tests/                    # Native contract-level tests (ctest)
│   │   └── data/                 # Synthetic RAO fixture (never real client files)
│   └── scripts/build-wasm.sh     # WebAssembly build used by Vercel
├── frontend/                     # Frontend team: React + Vite
│   ├── src/services/api.js       # ONLY module that calls the engine
│   ├── src/services/mock.js      # Fake engine following the contract
│   ├── src/services/config.js    # USE_MOCK, ENGINE_URL
│   └── public/wasm/              # bps_engine.js + .wasm (backend build output, gitignored)
├── vercel.json                   # Static build: engine, then Vite
├── VERSION                       # App semver
├── CLAUDE.md                     # Workflow, branches, versioning
└── README.md
```

---

## 2. Core principle: the contract is the boundary

`contract/engine.d.ts` is the single source of truth. Both teams build against it, never against each other's code.

The engine is an ES module (`/wasm/bps_engine.js`) whose default export `createBpsEngine()` resolves to an object with these functions. Each returns a **JSON string**:

| Function | Returns |
|---|---|
| `getHealth()` | `{status: "ok"}`. Proves the module loaded |
| `getVersion()` | `{version, semver, commit}`, e.g. `0.1.0+a1b2c3d` |
| `getLimits()` | `{allowed_extensions, max_file_bytes}` (the UI never hardcodes these) |
| `checkFile(name, sizeBytes)` | `""` if the file may be read, else an error `RaoFileResult` |
| `readRaoFile(name, bytes: Uint8Array)` | `RaoFileResult`: `file_id`, `load_case`, `sea_state`, headings and frequencies |
| `releaseRaoFile(fileId)` | `{released}` |
| `calculateEnvelope(requestJson)` | `EnvelopeResult`, or `{error}` |

### Flow: read on add, calculate on click

1. **Files are read as soon as the user adds them, one by one.** `api.js` `readRaoHeaders(files, onResult)` calls `readRaoFile` for each file in turn. The engine parses the file once and keeps it in memory under a `file_id`. The page shows each file's load case and sea state as it is read. A bad file gets `status: "error"` and never fails the batch.
2. **Calculate sends only the form data.** `calculateEnvelope({files, loadCases, x, y, z, pointName})` maps the files to their `file_id`s and sends `{file_ids, load_cases: [{load_case, lcg, tcg, kg}], point: {x, y, z}, point_name}`. The files are not read or sent again. (If the engine was reloaded in between, `api.js` re-reads them automatically.)
3. **Removing a file** calls `forgetRaoFile(file)` → `releaseRaoFile`.

```json
{
  "point_name": "Crane",
  "files_used": ["INT1_RAO_Table1_A1.txt", "…"],
  "basis": { "conditions": ["LCINT1", "LCMAX"], "headings_count": 19,
             "frequency_min": 0.1, "frequency_max": 1.7 },
  "calculated_at": "2026-11-06T03:44:36Z",
  "results": [
    { "axis": "az", "value": 0.5528, "condition": "LCMAX", "sea_state": "2.5<Hs<=4.5",
      "file": "MAX_RAO_Table2_A1.txt", "heading_deg": 307.5, "period_s": 16.11, "frequency_rad_s": 0.39 }
  ]
}
```

### The RAO format and the calculation
- The file format is documented in `contract/engine.d.ts` and `backend/include/bps/rao.hpp`: a `RAO TABLE` / `Loading Condition` header whose legends give the sea state and load case, then one `DIRECTION (deg)` block per heading with 13 columns (frequency in rad/s, 6 amplitudes per metre of wave amplitude, 6 phases).
- For each row, the motion of the point is `u + θ × r`, with `r = point − (LCG, TCG, KG)` and complex amplitudes `A·e^{iφ}`. The acceleration amplitude is `ω²·|u_P|` per axis. The envelope is the maximum per axis over every file, heading and frequency (`backend/include/bps/envelope.hpp`).
- Values are **m/s² per metre of wave amplitude** (RAO-based, not an MPM).
- Assumptions to confirm: RAOs are at the CoG of each loading condition; axes are right-handed (x forward, y to port, z up); no gravity component from roll/pitch is added.

### Why JSON strings across the WebAssembly boundary
- A tiny, stable surface: seven functions taking strings, numbers and bytes.
- The native C++ tests check exactly the strings the browser receives.
- File bytes go in as `Uint8Array`. The engine does its own UTF-8 validation, so it never trusts the caller.

### Rules for changing the contract
1. Edit `contract/engine.d.ts` **first**, via pull request to `dev`.
2. Both teams must approve before either implements.
3. Prefer **additive** changes (new functions, new optional fields). The frontend and engine always deploy together, so production cannot drift, but additive changes keep the other team's in-progress branch working.
4. Breaking changes bump the contract MAJOR (and the `VERSION` MAJOR when promoted to `main`).
5. If the mock or the engine drifts from the contract, fix it to match the contract.

---

## 3. Frontend team workflow

No C++ toolchain required.

```bash
npm ci --prefix frontend
npm run dev --prefix frontend          # http://localhost:8080, uses the mock engine
```

- On `localhost:8080`, `config.js` uses the mock (`mock.js`) by default. Add `?mock=0` to load the real engine from `/wasm/bps_engine.js`; ask the backend team for a build, or run `bash backend/scripts/build-wasm.sh`. When deployed, the real engine is always used.
- Edit `mock.js` to simulate slow processing, failures, large batches, etc.
- Keep all engine calls in `api.js`. Pages import only from `services/api.js`.
- Render engine strings as React text, never through `dangerouslySetInnerHTML`.

---

## 4. Backend team workflow

No UI required.

```bash
cd backend
cmake --preset native && cmake --build --preset native && ctest --preset native
```

- RAO parsing is in `src/rao.cpp` (`parse_rao(text)` → `RaoFile`, or `RaoFormatError` with a line number). Calculation is in `src/envelope.cpp` (`compute_envelope(files, cogs, point)`). Neither knows about JSON or JavaScript.
- `engine.cpp` handles the extension allow-list, name cleanup, size limit, UTF-8 validation (and BOM stripping), per-file error isolation, the store of parsed files (`file_id`), request validation and JSON encoding.
- Real RAO tables are client data: never commit them. To check them locally: `BPS_RAO_SAMPLES=<folder> ./build/native/bps_tests tests/data`.
- `bindings.cpp` is the only file that includes Emscripten headers. Everything else must build with a normal compiler so it can be tested natively and debugged with normal tools.
- Defaults: allowed extension `.txt`; max file size 32 MiB (`kMaxFileBytes` in `engine.hpp`). Files are processed one at a time, and the WebAssembly heap grows as needed (up to 2 GB).

### Building the WebAssembly module

1. Install the Emscripten SDK once (https://emscripten.org/docs/getting_started/downloads.html). Use the version pinned in `backend/scripts/build-wasm.sh`:
   ```bash
   git clone https://github.com/emscripten-core/emsdk.git
   cd emsdk && ./emsdk install 4.0.10 && ./emsdk activate 4.0.10
   source ./emsdk_env.sh        # Windows: emsdk_env.bat (cmd) or emsdk_env.ps1 (PowerShell)
   ```
   On Windows without `python` on PATH, run `py -3 emsdk.py install 4.0.10` and `py -3 emsdk.py activate --permanent 4.0.10` instead; `--permanent` sets `EMSDK`, `EMSDK_PYTHON` and `PATH` for new shells. The emsdk also ships Node.js (`<emsdk>/node/<version>/bin`), usable for the frontend.
2. Build:
   ```bash
   cd backend && cmake --preset wasm && cmake --build --preset wasm
   ```
   or, on Linux/macOS/Git Bash, `bash backend/scripts/build-wasm.sh` from the repo root.
3. Output: `frontend/public/wasm/bps_engine.js` and `bps_engine.wasm`. Check them in the browser with `npm run dev --prefix frontend` and `http://localhost:8080/?mock=0`.

Key Emscripten flags (in `CMakeLists.txt`): `-sMODULARIZE -sEXPORT_ES6 -sEXPORT_NAME=createBpsEngine` (importable ES module), `-sALLOW_MEMORY_GROWTH`, `-lembind`, and `-fexceptions` so a failing file is caught instead of aborting the module. For a Node.js smoke test, configure with `-DBPS_WASM_ENVIRONMENT=web,worker,node`.

---

## 5. Testing

Native engine tests (`backend/tests/test_engine.cpp`, run by `ctest`) cover:
- health, limits, and the version format
- the commit hash preferring `VERCEL_GIT_COMMIT_SHA` (`tests/TestGenerateVersion.cmake`)
- `checkFile` (extension, size, name cleanup) and the JSON writer/parser
- RAO parsing of the synthetic fixture (legends, units, roll damping, CRLF, rad units) and every format error
- the kinematics (`u + θ × r`, including phase cancellation) against hand-calculated values
- the full engine flow: read one by one, bad files isolated, calculate with form data only, request validation, release
- optionally, the real RAO tables in `BPS_RAO_SAMPLES`

Add a test whenever the contract gains a field or function.

---

## 6. Deploying to Vercel (single static project)

`vercel.json` installs the frontend dependencies, then the build command runs `backend/scripts/build-wasm.sh` (which installs the pinned Emscripten SDK, and CMake/Ninja if missing) followed by `vite build`. The output, `frontend/dist`, contains the app and `wasm/bps_engine.{js,wasm}`. There are no serverless functions.

### Steps
1. vercel.com/new → import the repo. Root Directory = repo root, Framework Preset = *Other*. Commands come from `vercel.json`.
2. Production branch = `main`. Every other branch gets preview deployments.
3. Keep "Automatically expose System Environment Variables" enabled, so `VERCEL_GIT_COMMIT_SHA` is available **at build time** for versioning.

### Caveats
- Installing Emscripten adds about 1–2 minutes to each build. If this becomes a problem, cache `.emsdk/` or build the engine in CI and publish the artifacts.
- Everything runs in the user's browser. Today a 12-file envelope takes about 12 ms, but heavier processing would block the page: move the engine into a Web Worker then.
- This deployment path has not been tested end to end. Verify it with a preview deploy first.

---

## 7. Working agreements

- **Contract first**, code second.
- **Frontend never hardcodes limits**; it reads `getLimits()`.
- **The engine never trusts its caller**: it validates extension, size and encoding itself.
- **One bad file never sinks the batch.**
- **Small PRs per team**. Cross-team changes touch only `contract/engine.d.ts` until approved.
- Branch flow and versioning: see `CLAUDE.md`.

---

## 8. Suggested next steps

- [ ] Verify a preview deploy from `dev` (engine build on Vercel, `/wasm/bps_engine.wasm` served)
- [ ] Confirm the calculation assumptions with the RAO provider (reference point at CoG, axes, gravity component)
- [ ] Decide whether results stay per metre of wave amplitude or are scaled by a design wave
- [ ] Add CI: native engine tests, WebAssembly build and `vite build` on every PR
- [ ] Move the engine into a Web Worker so long processing does not freeze the UI
- [ ] Protect `main` and `dev` on GitHub (require PRs and reviews)
