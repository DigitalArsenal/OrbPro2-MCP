#!/bin/bash
# Build C++ MCP Server to WebAssembly
#
# Usage:
#   ./scripts/build-wasm.sh          # Release build
#   ./scripts/build-wasm.sh debug    # Debug build

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
PACKAGES_DIR="$(dirname "$PROJECT_DIR")"
EMSDK_DIR="${PACKAGES_DIR}/emsdk"

BUILD_TYPE="${1:-Release}"
if [ "$1" = "debug" ]; then
    BUILD_TYPE="Debug"
fi

echo "============================================"
echo "Building Cesium MCP Server (WASM)"
echo "Build type: ${BUILD_TYPE}"
echo "============================================"
echo ""

# Check for emsdk
if [ ! -d "${EMSDK_DIR}" ]; then
    echo "Error: emsdk not found at ${EMSDK_DIR}"
    echo "Run: git clone https://github.com/emscripten-core/emsdk.git ${EMSDK_DIR}"
    echo "Then: cd ${EMSDK_DIR} && ./emsdk install latest && ./emsdk activate latest"
    exit 1
fi

# Source emsdk environment
echo "Setting up Emscripten environment..."
source "${EMSDK_DIR}/emsdk_env.sh"

# Verify emcc is available
if ! command -v emcc &> /dev/null; then
    echo "Error: emcc not found after sourcing emsdk_env.sh"
    exit 1
fi

echo "Using Emscripten: $(emcc --version | head -1)"
echo ""

# Create build directory
BUILD_DIR="${PROJECT_DIR}/build"
mkdir -p "${BUILD_DIR}"
cd "${BUILD_DIR}"

# Run CMake with Emscripten toolchain
echo "Configuring with CMake..."
emcmake cmake \
    -DCMAKE_BUILD_TYPE=${BUILD_TYPE} \
    -DCMAKE_TOOLCHAIN_FILE="${EMSDK_DIR}/upstream/emscripten/cmake/Modules/Platform/Emscripten.cmake" \
    ..

# Build
echo ""
echo "Building..."
emmake make -j$(nproc 2>/dev/null || sysctl -n hw.ncpu 2>/dev/null || echo 4)

# Copy outputs to dist/
DIST_DIR="${PROJECT_DIR}/dist"
mkdir -p "${DIST_DIR}"
cp "${BUILD_DIR}/cesium-mcp-wasm.js" "${DIST_DIR}/"
cp "${BUILD_DIR}/cesium-mcp-wasm.wasm" "${DIST_DIR}/"

echo ""
echo "============================================"
echo "Build complete!"
echo "============================================"
echo ""
echo "Output files:"
ls -la "${DIST_DIR}/cesium-mcp-wasm.js" "${DIST_DIR}/cesium-mcp-wasm.wasm"
