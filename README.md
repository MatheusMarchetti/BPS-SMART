# BPS SMART - Structural Motion & Acceleration Response Tool

**Brownfield Project Services, SBM Offshore**

Add RAO tables, enter the centre of gravity of each load case and a point, and get the acceleration envelope at that point. A C++ engine compiled to WebAssembly (Emscripten) does the processing in your browser, so files are never uploaded. Hosted as a static site.

- Team workflow, branches, and versioning: [CLAUDE.md](CLAUDE.md)
- Design rationale and hosting notes: [DEVELOPMENT_GUIDELINE.md](DEVELOPMENT_GUIDELINE.md)
- Engine contract: [contract/engine.d.ts](contract/engine.d.ts)

## What it does

BPS SMART estimates design accelerations at any point of an FPSO from the vessel's motion RAOs (Response Amplitude Operators), including points that are not listed in the motion analysis report.

1. Add the RAO files (`.txt`). The engine reads each one as soon as it is added and identifies its load case and sea condition from the file header.
2. Enter LCG, TCG and KG for each load case.
3. Enter the point coordinates X, Y, Z, always measured from the ship origin.
4. Click **Calculate** to get the governing accelerations (ax, ay, az).

**Design philosophy:** acceleration envelope = maximum response over all frequencies, all wave headings, all RAO tables and all load cases. The tool does not try to reproduce the Most Probable Maximum (MPM) calculations of the original hydrodynamic software.

### Typical uses

- Equipment foundations
- Pipe supports
- Local structural modifications
- Deck reinforcement
- Crane foundations
- Flare structures
- New module installation

### Ship preview

Step 3 of the page shows a 2D preview of the FPSO with the point marked from its X, Y, Z coordinates, so the engineer can check that the point is in the right place.

- Four views, as tabs: **Side**, **Plan**, **Stern** and **Section A-A**.
- The tabs follow the WAI-ARIA tabs pattern and work with the keyboard.
- The preview only uses the point coordinates. It does not change the engine or the contract.

## Tech stack

| Layer | Technology | Owner |
|---|---|---|
| Engine | C++17, CMake, compiled to WebAssembly with Emscripten (`backend/`) | Backend team |
| Frontend | React 18 + Vite 5 (`frontend/`) | Frontend team |
| Contract | TypeScript declarations (`contract/engine.d.ts`) | Both teams |

There is no application server. The build produces static files only: the Vite app plus the engine in `frontend/public/wasm/`.

## Repository layout

```
contract/engine.d.ts      Engine contract, the single source of truth between teams
backend/                  C++17 engine (CMake)
  src/rao.cpp               RAO file reader
  src/envelope.cpp          acceleration envelope at a point
  src/engine.cpp            validation, stored files, JSON in/out
  src/bindings.cpp          JavaScript bindings (embind)
  tests/                    native tests, synthetic RAO fixture
  scripts/build-wasm.sh     WebAssembly build
frontend/                 React + Vite app
  src/services/api.js       the only module that calls the engine
  src/services/mock.js      fake engine that follows the contract
  public/wasm/              engine build output (gitignored)
VERSION                   App semver (e.g. 0.1.0)
```

## Getting started

### Requirements

- Node.js 20 or newer (frontend)
- A C++17 compiler, CMake 3.21 or newer and Ninja (engine)
- Emscripten SDK, only to build the WebAssembly engine

### Frontend only

No engine build is needed. On `localhost:8080` the app uses the mock engine by default.

```bash
npm ci --prefix frontend
npm run dev --prefix frontend        # http://localhost:8080
```

### Engine: native build and tests

```bash
cd backend
cmake --preset native
cmake --build --preset native
ctest --preset native
```

### Engine: WebAssembly build

```bash
bash backend/scripts/build-wasm.sh   # output in frontend/public/wasm/
```

The script installs a pinned Emscripten SDK if none is active. Then open `http://localhost:8080/?mock=0` to use the real engine.

### Production build

```bash
bash backend/scripts/build-wasm.sh
npm run build --prefix frontend      # output in frontend/dist
```

## Engine API

The engine is loaded with `createBpsEngine()` and exposes these calls. All of them return JSON strings. See [contract/engine.d.ts](contract/engine.d.ts) for the full specification.

| Call | Purpose |
|---|---|
| `getHealth()` | Engine status |
| `getVersion()` | App version, e.g. `0.1.0+a1b2c3d` |
| `getLimits()` | Accepted file types and limits (the UI never hardcodes them) |
| `checkFile(name, sizeBytes)` | Quick check before reading a file |
| `readRaoFile(name, bytes)` | Reads one RAO file and keeps it in memory under a `file_id` |
| `releaseRaoFile(fileId)` | Removes a file from memory |
| `calculateEnvelope(request)` | Computes the envelope from file ids, LCG/TCG/KG per load case and the point |

One bad file never fails the batch. Errors include line numbers.

## Data privacy

RAO files stay on the user's computer. They are processed in the browser and never sent to a server. Real client RAO files are never committed to this repository. Tests use the synthetic fixture in `backend/tests/data/`.

## License

[MIT](LICENSE)
