# BPS SMART - Structural Motion & Acceleration Response Tool

Add RAO tables, enter the centre of gravity of each load case and a point, and get the acceleration envelope at that point. A C++ engine compiled to WebAssembly (Emscripten) does the processing in your browser, so files are never uploaded. Hosted as a static site on Vercel.

- Team workflow, branches, and versioning: [CLAUDE.md](CLAUDE.md)
- Design rationale and Vercel notes: [DEVELOPMENT_GUIDELINE.md](DEVELOPMENT_GUIDELINE.md)
- Engine contract: [contract/engine.d.ts](contract/engine.d.ts)

## Quick start

```bash
# Engine: native tests
cd backend && cmake --preset native && cmake --build --preset native && ctest --preset native && cd ..

# Engine: WebAssembly build -> frontend/public/wasm/ (needs the Emscripten SDK)
bash backend/scripts/build-wasm.sh

# Frontend on :8080 (mock engine; add ?mock=0 for the real one)
npm ci --prefix frontend && npm run dev --prefix frontend
```
