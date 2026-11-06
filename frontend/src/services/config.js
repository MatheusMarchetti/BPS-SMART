// Runtime configuration.
//
// USE_MOCK
//   Default: true on the local dev server (localhost:8080), so frontend work
//   needs no C++ toolchain; false everywhere else (Vercel, etc.).
//   Override with the URL query parameter ?mock=1 or ?mock=0.
//
// ENGINE_URL
//   The WebAssembly engine (contract/engine.d.ts). It is built from backend/
//   into frontend/public/wasm/, which Vite serves and copies as is.
//   For ?mock=0 locally, build it first: bash backend/scripts/build-wasm.sh

const params = new URLSearchParams(location.search);
const isLocalDev =
  ["localhost", "127.0.0.1"].includes(location.hostname) && location.port === "8080";

export const USE_MOCK = params.has("mock") ? params.get("mock") !== "0" : isLocalDev;

export const ENGINE_URL = new URL(`${import.meta.env.BASE_URL}wasm/bps_engine.js`, location.href).href;
