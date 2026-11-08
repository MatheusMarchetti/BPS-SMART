#!/usr/bin/env bash
# Builds the C++ engine to WebAssembly:
#   backend/  ->  frontend/public/wasm/bps_engine.js + bps_engine.wasm
#
# Vercel runs this as part of the build command (see vercel.json). It also
# works locally on Linux, macOS and Git Bash.
#
# Toolchain lookup:
#   - Emscripten: uses emcmake from PATH if present (e.g. after
#     `source emsdk_env.sh`). Otherwise it installs the pinned SDK into
#     .emsdk/ at the repo root. Override the pin with EMSDK_VERSION.
#   - CMake and Ninja: uses them from PATH, or installs both into a Python
#     virtualenv in .buildtools/ (the Vercel build image has Python but no CMake).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
EMSDK_VERSION="${EMSDK_VERSION:-4.0.10}"

if ! command -v emcmake >/dev/null 2>&1; then
  EMSDK_DIR="$ROOT/.emsdk"
  if [ ! -f "$EMSDK_DIR/emsdk.py" ]; then
    rm -rf "$EMSDK_DIR"
    echo "Installing Emscripten SDK $EMSDK_VERSION into .emsdk/"
    git clone --depth 1 https://github.com/emscripten-core/emsdk.git "$EMSDK_DIR"
  fi
  if [ ! -f "$EMSDK_DIR/.bps-activated-$EMSDK_VERSION" ]; then
    "$EMSDK_DIR/emsdk" install "$EMSDK_VERSION"
    "$EMSDK_DIR/emsdk" activate "$EMSDK_VERSION"
    touch "$EMSDK_DIR/.bps-activated-$EMSDK_VERSION"
  fi
  # shellcheck disable=SC1091
  source "$EMSDK_DIR/emsdk_env.sh" >/dev/null
fi

if ! command -v cmake >/dev/null 2>&1 || ! command -v ninja >/dev/null 2>&1; then
  TOOLS_DIR="$ROOT/.buildtools"
  if [ ! -x "$TOOLS_DIR/bin/cmake" ] || [ ! -x "$TOOLS_DIR/bin/ninja" ]; then
    echo "Installing CMake and Ninja into .buildtools/"
    python3 -m venv "$TOOLS_DIR"
    "$TOOLS_DIR/bin/pip" install --quiet "cmake>=3.21" ninja
  fi
  export PATH="$TOOLS_DIR/bin:$PATH"
fi

BUILD_DIR="$ROOT/backend/build/wasm"
emcmake cmake -S "$ROOT/backend" -B "$BUILD_DIR" -G Ninja -DCMAKE_BUILD_TYPE=Release
cmake --build "$BUILD_DIR"

echo "Built:"
ls -l "$ROOT/frontend/public/wasm"
