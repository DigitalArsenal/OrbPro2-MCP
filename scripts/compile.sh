#!/bin/bash
# Build and run MLC compilation for OrbPro2 MCP via Docker
# This is the recommended method - no local dependencies required
#
# Caching:
# - Docker image layers are cached (emscripten, mlc-llm, pip packages)
# - Local .cache/mlc-compile/ stores HuggingFace/pip downloads between runs
# - Don't delete the orbpro2-mlc-compile image to keep cache warm

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
MODEL_DIR="${PROJECT_DIR}/training/orbpro2-lora-0.5b/merged"
CACHE_DIR="${PROJECT_DIR}/.cache/mlc-compile"

OUTPUT_NAME="OrbPro2-MCP-0.5B-q4f32_1-MLC"
QUANTIZATION="q4f32_1"
CONTEXT_WINDOW=4096

echo -e "${GREEN}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║        OrbPro2 MCP - Docker MLC Compilation                ║${NC}"
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

        # Copy WASM runtime files to where TVM/MLC expects them
        echo ''
        echo '=== Setting up WASM runtime for TVM ==='
        TVM_LIB_PATH=\$(python3 -c \"import tvm; print(tvm.__path__[0])\")

        # Copy all bc files from the TVM web build
        cp \$MLC_LLM_SOURCE_DIR/3rdparty/tvm/web/dist/wasm/*.bc \$TVM_LIB_PATH/

        # Also copy from mlc-llm web if different
        cp \$MLC_LLM_SOURCE_DIR/web/dist/wasm/*.bc \$TVM_LIB_PATH/ 2>/dev/null || true

        ls -la \$TVM_LIB_PATH/*.bc

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
        echo '=== Patching mlc-chat-config.json for web-llm ==='
        # gen_config outputs conv_template as a string (\"qwen2\") which works for
        # native MLC-LLM but NOT for web-llm (which needs the full object).
        # Patch it in-place with the full ConvTemplateConfig object.
        python3 -c \"
import json
config_path = './${OUTPUT_NAME}/mlc-chat-config.json'
with open(config_path) as f:
    config = json.load(f)

# Expand conv_template string to full ConvTemplateConfig object for web-llm
config['conv_template'] = {
    'name': 'qwen2',
    'system_template': '<|im_start|>system\n{system_message}<|im_end|>\n',
    'system_message': 'You are a helpful assistant.',
    'system_prefix_token_ids': None,
    'add_role_after_system_message': True,
    'roles': {
        'user': '<|im_start|>user',
        'assistant': '<|im_start|>assistant'
    },
    'role_templates': {
        'user': '{user_message}',
        'assistant': '{assistant_message}',
        'tool': '{tool_message}'
    },
    'messages': [],
    'seps': ['<|im_end|>\n'],
    'role_content_sep': '\n',
    'role_empty_sep': '\n',
    'stop_str': ['<|endoftext|>', '<|im_end|>'],
    'stop_token_ids': [151643, 151645],
    'function_string': '',
    'use_function_calling': False
}

# Add tokenizer info if missing
if 'tokenizer_info' not in config:
    config['tokenizer_info'] = {
        'token_postproc_method': 'byte_level',
        'prepend_space_in_encode': False,
        'strip_space_in_decode': False
    }

# Set inference defaults
config['temperature'] = 0.1
config['top_p'] = 0.9

# Ensure token IDs are set
config.setdefault('pad_token_id', 151643)
config.setdefault('bos_token_id', 151643)
config.setdefault('eos_token_id', [151645, 151643])

with open(config_path, 'w') as f:
    json.dump(config, f, indent=2)

print('Config patched successfully')
\"

        echo ''
        echo '=== Renaming cache file for web-llm compatibility ==='
        # web-llm expects ndarray-cache.json, MLC creates tensor-cache.json
        if [ -f ./${OUTPUT_NAME}/tensor-cache.json ]; then
            cp ./${OUTPUT_NAME}/tensor-cache.json ./${OUTPUT_NAME}/ndarray-cache.json
        fi

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
echo "  Option A: Local Development"
echo "     # web-llm expects HuggingFace-style /resolve/main/ path structure"
echo "     mkdir -p public/models/${OUTPUT_NAME}/resolve/main"
echo "     cp ${OUTPUT_DIR}/${OUTPUT_NAME}/* public/models/${OUTPUT_NAME}/resolve/main/"
echo ""
echo "  Option B: Upload to HuggingFace"
echo "     huggingface-cli repo create ${OUTPUT_NAME} --type model"
echo "     cd ${OUTPUT_DIR}/${OUTPUT_NAME}"
echo "     huggingface-cli upload YOUR_USERNAME/${OUTPUT_NAME} ."
echo "     # Then update modelWeightsUrl in web-llm-engine.ts to HuggingFace URL"
echo ""
echo -e "${BLUE}Tip:${NC} Keep the Docker image cached for faster rebuilds:"
echo "     docker images mlc-cesium-compile"
echo ""
