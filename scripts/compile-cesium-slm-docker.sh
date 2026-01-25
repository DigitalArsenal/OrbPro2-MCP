#!/bin/bash
# Build and run MLC compilation for OrbPro Cesium SLM via Docker
# This is the recommended method - no local dependencies required
#
# Caching:
# - Docker image layers are cached (emscripten, mlc-llm, pip packages)
# - Local .cache/mlc-compile/ stores HuggingFace/pip downloads between runs
# - Don't delete the mlc-cesium-compile image to keep cache warm

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
OUTPUT_DIR="${PROJECT_DIR}/mlc-models"
MODEL_DIR="${PROJECT_DIR}/training/cesium-qwen-lora/merged"
CACHE_DIR="${PROJECT_DIR}/.cache/mlc-compile"

OUTPUT_NAME="OrbPro-Cesium-SLM-0.5B-q4f16_1-MLC"
QUANTIZATION="q4f16_1"
CONTEXT_WINDOW=4096

echo -e "${GREEN}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║  OrbPro Cesium SLM - Docker MLC Compilation                ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Check Docker is available
if ! command -v docker &> /dev/null; then
    echo -e "${RED}Error: Docker is required${NC}"
    echo "Install Docker Desktop from: https://www.docker.com/products/docker-desktop"
    exit 1
fi
echo -e "${BLUE}Docker:${NC} OK"

# Check model exists
if [ ! -d "${MODEL_DIR}" ]; then
    echo -e "${RED}Error: Merged model not found at ${MODEL_DIR}${NC}"
    echo ""
    echo "Please ensure training is complete and the model is merged."
    exit 1
fi
echo -e "${BLUE}Model:${NC} ${MODEL_DIR}"
echo -e "${BLUE}Output:${NC} ${OUTPUT_DIR}/${OUTPUT_NAME}"
echo -e "${BLUE}Cache:${NC} ${CACHE_DIR}"
echo ""

# Create directories
mkdir -p "${OUTPUT_DIR}"
mkdir -p "${CACHE_DIR}/huggingface"
mkdir -p "${CACHE_DIR}/pip"

# Use the static Dockerfile (don't regenerate - preserves layer caching)
DOCKERFILE="${SCRIPT_DIR}/Dockerfile.cesium-slm"

if [ ! -f "${DOCKERFILE}" ]; then
    echo -e "${RED}Error: Dockerfile not found at ${DOCKERFILE}${NC}"
    exit 1
fi

# Build Docker image (uses cached layers if Dockerfile unchanged)
echo -e "${YELLOW}>>> Building Docker image (cached after first build)...${NC}"
docker build --platform linux/amd64 -t mlc-cesium-compile -f "${DOCKERFILE}" "${SCRIPT_DIR}"

echo ""
echo -e "${YELLOW}>>> Running compilation...${NC}"
echo ""

# Run compilation in Docker with persistent cache mounts
docker run --rm --platform linux/amd64 \
    -v "${MODEL_DIR}:/workspace/model_ro:ro" \
    -v "${OUTPUT_DIR}:/workspace/output" \
    -v "${CACHE_DIR}/huggingface:/root/.cache/huggingface" \
    -v "${CACHE_DIR}/pip:/root/.cache/pip" \
    mlc-cesium-compile \
    /bin/bash -c "
        set -e

        # Source emscripten environment
        . /opt/emsdk/emsdk_env.sh

        # Verify MLC_LLM_SOURCE_DIR is set and wasm runtime exists
        echo '=== Environment check ==='
        echo \"MLC_LLM_SOURCE_DIR=\$MLC_LLM_SOURCE_DIR\"
        ls -la \$MLC_LLM_SOURCE_DIR/web/dist/wasm/mlc_wasm_runtime.bc

        cd /workspace/output

        echo ''
        echo '=== Copying model files (MLC needs write access) ==='
        mkdir -p /workspace/model
        cp -r /workspace/model_ro/* /workspace/model/

        echo ''
        echo '=== Converting weights to MLC format ==='
        python3 -m mlc_llm convert_weight \
            /workspace/model \
            --quantization ${QUANTIZATION} \
            --output ./${OUTPUT_NAME}

        echo ''
        echo '=== Generating config ==='
        python3 -m mlc_llm gen_config \
            /workspace/model \
            --quantization ${QUANTIZATION} \
            --context-window-size ${CONTEXT_WINDOW} \
            --prefill-chunk-size 1024 \
            --conv-template qwen2 \
            --output ./${OUTPUT_NAME}

        echo ''
        echo '=== Compiling for WebGPU (this takes a while) ==='
        python3 -m mlc_llm compile \
            ./${OUTPUT_NAME} \
            --device webgpu \
            --opt O3 \
            --output ./${OUTPUT_NAME}/${OUTPUT_NAME}.wasm

        echo ''
        echo '=== Copying tokenizer files ==='
        cp /workspace/model/tokenizer.json ./${OUTPUT_NAME}/ 2>/dev/null || true
        cp /workspace/model/tokenizer_config.json ./${OUTPUT_NAME}/ 2>/dev/null || true
        cp /workspace/model/vocab.json ./${OUTPUT_NAME}/ 2>/dev/null || true
        cp /workspace/model/merges.txt ./${OUTPUT_NAME}/ 2>/dev/null || true
        cp /workspace/model/special_tokens_map.json ./${OUTPUT_NAME}/ 2>/dev/null || true

        echo ''
        echo '=== Creating WebLLM config ==='
        cat > ./${OUTPUT_NAME}/mlc-chat-config.json << EOF
{
  \"model_type\": \"qwen2\",
  \"quantization\": \"${QUANTIZATION}\",
  \"model_config\": {
    \"hidden_size\": 896,
    \"intermediate_size\": 4864,
    \"num_attention_heads\": 14,
    \"num_hidden_layers\": 24,
    \"num_key_value_heads\": 2,
    \"vocab_size\": 151936,
    \"context_window_size\": ${CONTEXT_WINDOW},
    \"prefill_chunk_size\": 1024
  },
  \"vocab_size\": 151936,
  \"context_window_size\": ${CONTEXT_WINDOW},
  \"sliding_window_size\": -1,
  \"prefill_chunk_size\": 1024,
  \"attention_sink_size\": -1,
  \"tensor_parallel_shards\": 1,
  \"generation_config\": {
    \"temperature\": 0.7,
    \"top_p\": 0.9
  }
}
EOF

        echo ''
        echo '=== Done! ==='
        ls -lh ./${OUTPUT_NAME}/
    "

echo ""
echo -e "${GREEN}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║                  Compilation Complete!                     ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

echo -e "${BLUE}Output:${NC} ${OUTPUT_DIR}/${OUTPUT_NAME}"
echo ""

ls -lh "${OUTPUT_DIR}/${OUTPUT_NAME}/"

TOTAL_SIZE=$(du -sh "${OUTPUT_DIR}/${OUTPUT_NAME}" | awk '{print $1}')
echo ""
echo -e "${BLUE}Total Size:${NC} ${TOTAL_SIZE}"
echo ""

echo -e "${YELLOW}Next Steps:${NC}"
echo ""
echo "  1. Upload to HuggingFace:"
echo "     huggingface-cli repo create ${OUTPUT_NAME} --type model"
echo "     cd ${OUTPUT_DIR}/${OUTPUT_NAME}"
echo "     huggingface-cli upload YOUR_USERNAME/${OUTPUT_NAME} ."
echo ""
echo "  2. Update web-llm-engine.ts with the HuggingFace URL"
echo ""
echo -e "${BLUE}Tip:${NC} Keep the Docker image cached for faster rebuilds:"
echo "     docker images mlc-cesium-compile"
echo ""
