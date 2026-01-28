#!/bin/bash
# Build and run MLC compilation for OrbPro OrbPro2 MCP 1.5B via Docker

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
OUTPUT_DIR="${PROJECT_DIR}/mlc-models"
MODEL_DIR="${PROJECT_DIR}/training/cesium-qwen-1.5B-lora-mlx/merged"
CACHE_DIR="${PROJECT_DIR}/.cache/mlc-compile"

OUTPUT_NAME="OrbPro-Cesium-SLM-1.5B-q4f16_1-MLC"
QUANTIZATION="q4f16_1"
CONTEXT_WINDOW=4096

echo -e "${GREEN}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║  OrbPro OrbPro2 MCP 1.5B - Docker MLC Compilation           ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

if ! command -v docker &> /dev/null; then
    echo -e "${RED}Error: Docker is required${NC}"
    exit 1
fi

if [ ! -d "${MODEL_DIR}" ]; then
    echo -e "${RED}Error: Merged model not found at ${MODEL_DIR}${NC}"
    exit 1
fi

echo -e "${BLUE}Model:${NC} ${MODEL_DIR}"
echo -e "${BLUE}Output:${NC} ${OUTPUT_DIR}/${OUTPUT_NAME}"

mkdir -p "${OUTPUT_DIR}"
mkdir -p "${CACHE_DIR}/huggingface"
mkdir -p "${CACHE_DIR}/pip"

DOCKERFILE="${SCRIPT_DIR}/Dockerfile.cesium-slm"

echo -e "${YELLOW}>>> Building Docker image...${NC}"
docker build --platform linux/amd64 -t mlc-cesium-compile -f "${DOCKERFILE}" "${SCRIPT_DIR}"

echo -e "${YELLOW}>>> Running compilation...${NC}"

docker run --rm --platform linux/amd64 \
    -v "${MODEL_DIR}:/workspace/model_ro:ro" \
    -v "${OUTPUT_DIR}:/workspace/output" \
    -v "${CACHE_DIR}/huggingface:/root/.cache/huggingface" \
    -v "${CACHE_DIR}/pip:/root/.cache/pip" \
    mlc-cesium-compile \
    /bin/bash -c "
        set -e
        . /opt/emsdk/emsdk_env.sh

        TVM_LIB_PATH=\$(python3 -c \"import tvm; print(tvm.__path__[0])\")
        cp \$MLC_LLM_SOURCE_DIR/3rdparty/tvm/web/dist/wasm/*.bc \$TVM_LIB_PATH/
        cp \$MLC_LLM_SOURCE_DIR/web/dist/wasm/*.bc \$TVM_LIB_PATH/ 2>/dev/null || true

        cd /workspace/output

        echo '=== Copying model files ==='
        mkdir -p /workspace/model
        cp -r /workspace/model_ro/* /workspace/model/

        echo '=== Converting weights to MLC format ==='
        python3 -m mlc_llm convert_weight \
            /workspace/model \
            --quantization ${QUANTIZATION} \
            --output ./${OUTPUT_NAME}

        echo '=== Generating config ==='
        python3 -m mlc_llm gen_config \
            /workspace/model \
            --quantization ${QUANTIZATION} \
            --context-window-size ${CONTEXT_WINDOW} \
            --prefill-chunk-size 1024 \
            --conv-template qwen2 \
            --output ./${OUTPUT_NAME}

        echo '=== Compiling for WebGPU ==='
        python3 -m mlc_llm compile \
            ./${OUTPUT_NAME} \
            --device webgpu \
            --opt O3 \
            --output ./${OUTPUT_NAME}/${OUTPUT_NAME}.wasm

        echo '=== Copying tokenizer files ==='
        cp /workspace/model/tokenizer.json ./${OUTPUT_NAME}/ 2>/dev/null || true
        cp /workspace/model/tokenizer_config.json ./${OUTPUT_NAME}/ 2>/dev/null || true
        cp /workspace/model/vocab.json ./${OUTPUT_NAME}/ 2>/dev/null || true
        cp /workspace/model/merges.txt ./${OUTPUT_NAME}/ 2>/dev/null || true
        cp /workspace/model/special_tokens_map.json ./${OUTPUT_NAME}/ 2>/dev/null || true

        if [ -f ./${OUTPUT_NAME}/tensor-cache.json ]; then
            cp ./${OUTPUT_NAME}/tensor-cache.json ./${OUTPUT_NAME}/ndarray-cache.json
        fi

        echo '=== Done! ==='
        ls -lh ./${OUTPUT_NAME}/
    "

echo ""
echo -e "${GREEN}Compilation Complete!${NC}"
ls -lh "${OUTPUT_DIR}/${OUTPUT_NAME}/"
