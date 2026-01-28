#!/bin/bash
# Compile OrbPro OrbPro2 MCP to MLC format for WebLLM
# This script compiles the fine-tuned Qwen2.5-0.5B model for WebGPU browser inference

set -e

# Configuration
MODEL_PATH="../training/cesium-qwen-lora/merged"
OUTPUT_NAME="OrbPro-Cesium-SLM-0.5B-q4f16_1-MLC"
QUANTIZATION="q4f16_1"
CONTEXT_WINDOW=4096  # Optimized for browser memory

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${GREEN}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║     OrbPro OrbPro2 MCP - MLC WebGPU Compilation            ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
WORK_DIR="${PROJECT_DIR}/mlc-models"
MODEL_FULL_PATH="${PROJECT_DIR}/training/cesium-qwen-lora/merged"

# Check prerequisites
check_prerequisites() {
    echo -e "${YELLOW}[1/6] Checking prerequisites...${NC}"

    # Check Python
    if ! command -v python3 &> /dev/null; then
        echo -e "${RED}Error: Python 3 is required${NC}"
        exit 1
    fi
    echo "  - Python 3: OK"

    # Check if merged model exists
    if [ ! -d "${MODEL_FULL_PATH}" ]; then
        echo -e "${RED}Error: Merged model not found at ${MODEL_FULL_PATH}${NC}"
        echo ""
        echo "Please ensure training is complete and the model is merged."
        echo "The merged model should be at: training/cesium-qwen-lora/merged/"
        exit 1
    fi
    echo "  - Merged model: OK (${MODEL_FULL_PATH})"

    # Check for required model files
    if [ ! -f "${MODEL_FULL_PATH}/config.json" ]; then
        echo -e "${RED}Error: config.json not found in merged model directory${NC}"
        exit 1
    fi
    echo "  - config.json: OK"

    if [ ! -f "${MODEL_FULL_PATH}/model.safetensors" ]; then
        echo -e "${RED}Error: model.safetensors not found in merged model directory${NC}"
        exit 1
    fi
    echo "  - model.safetensors: OK"

    # Check git-lfs
    if ! command -v git-lfs &> /dev/null; then
        echo -e "${YELLOW}Warning: git-lfs not installed. Install with: brew install git-lfs${NC}"
    else
        echo "  - git-lfs: OK"
    fi

    # Check for mlc_llm - try different python environments
    MLC_PYTHON=""

    # First try the project's mlc-venv
    if [ -f "/Users/tj/software/mlc-venv/bin/python" ]; then
        if /Users/tj/software/mlc-venv/bin/python -c "import mlc_llm" 2>/dev/null; then
            MLC_PYTHON="/Users/tj/software/mlc-venv/bin/python"
            echo "  - mlc_llm: OK (mlc-venv)"
        fi
    fi

    # Try system python
    if [ -z "$MLC_PYTHON" ]; then
        if python3 -c "import mlc_llm" 2>/dev/null; then
            MLC_PYTHON="python3"
            echo "  - mlc_llm: OK (system)"
        fi
    fi

    if [ -z "$MLC_PYTHON" ]; then
        echo -e "${RED}Error: mlc_llm not found${NC}"
        echo ""
        echo "Install mlc_llm with one of these methods:"
        echo ""
        echo "  Option 1 - pip (may need nightly builds):"
        echo "    pip install mlc-llm mlc-ai-nightly"
        echo ""
        echo "  Option 2 - Use Docker (recommended):"
        echo "    ./scripts/compile-cesium-slm-docker.sh"
        echo ""
        exit 1
    fi

    export MLC_PYTHON

    # Check for emscripten (required for WebGPU WASM compilation)
    if ! command -v emcc &> /dev/null; then
        # Check if emsdk is available
        if [ -f "/Users/tj/software/emsdk/emsdk_env.sh" ]; then
            echo "  - Emscripten: Loading from emsdk..."
            source /Users/tj/software/emsdk/emsdk_env.sh
        else
            echo -e "${RED}Error: Emscripten is required for WebGPU compilation${NC}"
            echo ""
            echo "Install with:"
            echo "  git clone https://github.com/emscripten-core/emsdk.git"
            echo "  cd emsdk && ./emsdk install latest && ./emsdk activate latest"
            echo "  source ./emsdk_env.sh"
            echo ""
            echo "Or use Docker: ./scripts/compile-cesium-slm-docker.sh"
            exit 1
        fi
    fi
    echo "  - Emscripten: OK"

    echo -e "${GREEN}  All prerequisites satisfied!${NC}"
    echo ""
}

# Setup directories
setup_directories() {
    echo -e "${YELLOW}[2/6] Setting up directories...${NC}"

    mkdir -p "${WORK_DIR}"
    mkdir -p "${WORK_DIR}/${OUTPUT_NAME}"

    echo "  Output: ${WORK_DIR}/${OUTPUT_NAME}"
    echo ""
}

# Convert weights to MLC format
convert_weights() {
    echo -e "${YELLOW}[3/6] Converting weights to MLC format (${QUANTIZATION})...${NC}"
    echo "  This may take a few minutes..."
    echo ""

    cd "${WORK_DIR}"

    ${MLC_PYTHON} -m mlc_llm convert_weight \
        "${MODEL_FULL_PATH}" \
        --quantization "${QUANTIZATION}" \
        --output "./${OUTPUT_NAME}"

    echo -e "${GREEN}  Weights converted successfully!${NC}"
    echo ""
}

# Generate config
generate_config() {
    echo -e "${YELLOW}[4/6] Generating MLC config...${NC}"

    cd "${WORK_DIR}"

    ${MLC_PYTHON} -m mlc_llm gen_config \
        "${MODEL_FULL_PATH}" \
        --quantization "${QUANTIZATION}" \
        --context-window-size "${CONTEXT_WINDOW}" \
        --prefill-chunk-size 1024 \
        --output "./${OUTPUT_NAME}"

    echo -e "${GREEN}  Config generated!${NC}"
    echo ""
}

# Compile for WebGPU
compile_webgpu() {
    echo -e "${YELLOW}[5/6] Compiling for WebGPU...${NC}"
    echo "  This is the longest step - may take 5-15 minutes..."
    echo ""

    cd "${WORK_DIR}"

    ${MLC_PYTHON} -m mlc_llm compile \
        "./${OUTPUT_NAME}" \
        --device webgpu \
        --opt O3 \
        --output "./${OUTPUT_NAME}/${OUTPUT_NAME}.wasm"

    echo -e "${GREEN}  WebGPU compilation complete!${NC}"
    echo ""
}

# Create WebLLM configuration
create_webllm_config() {
    echo -e "${YELLOW}[6/6] Creating WebLLM configuration...${NC}"

    cd "${WORK_DIR}"

    # Copy tokenizer files from merged model
    cp "${MODEL_FULL_PATH}/tokenizer.json" "./${OUTPUT_NAME}/" 2>/dev/null || true
    cp "${MODEL_FULL_PATH}/tokenizer_config.json" "./${OUTPUT_NAME}/" 2>/dev/null || true
    cp "${MODEL_FULL_PATH}/vocab.json" "./${OUTPUT_NAME}/" 2>/dev/null || true
    cp "${MODEL_FULL_PATH}/merges.txt" "./${OUTPUT_NAME}/" 2>/dev/null || true
    cp "${MODEL_FULL_PATH}/special_tokens_map.json" "./${OUTPUT_NAME}/" 2>/dev/null || true

    # Create ndarray-cache.json for WebLLM (weight manifest)
    cat > "./${OUTPUT_NAME}/mlc-chat-config.json" << EOF
{
  "model_type": "qwen2",
  "quantization": "${QUANTIZATION}",
  "model_config": {
    "hidden_size": 896,
    "intermediate_size": 4864,
    "num_attention_heads": 14,
    "num_hidden_layers": 24,
    "num_key_value_heads": 2,
    "vocab_size": 151936,
    "context_window_size": ${CONTEXT_WINDOW},
    "prefill_chunk_size": 1024
  },
  "vocab_size": 151936,
  "context_window_size": ${CONTEXT_WINDOW},
  "sliding_window_size": -1,
  "prefill_chunk_size": 1024,
  "attention_sink_size": -1,
  "tensor_parallel_shards": 1,
  "generation_config": {
    "temperature": 0.7,
    "top_p": 0.9
  }
}
EOF

    # Create README
    cat > "./${OUTPUT_NAME}/README.md" << EOF
# OrbPro OrbPro2 MCP (0.5B)

Fine-tuned language model for CesiumJS globe control, optimized for WebGPU inference.

## Model Details

- **Base Model:** Qwen2.5-0.5B-Instruct
- **Fine-tuning:** LoRA on 11,000+ Cesium command examples
- **Quantization:** ${QUANTIZATION} (4-bit with float16)
- **Context Window:** ${CONTEXT_WINDOW} tokens
- **Target:** WebGPU (browser-based inference)

## Usage with WebLLM

\`\`\`typescript
import { CreateMLCEngine } from '@mlc-ai/web-llm';

const engine = await CreateMLCEngine("${OUTPUT_NAME}", {
  modelLibUrl: "path/to/${OUTPUT_NAME}.wasm",
  modelUrl: "path/to/weights/",
});
\`\`\`

## Training Data

Trained on natural language commands for:
- Camera navigation (flyTo, lookAt, zoom)
- Entity creation (markers, polylines, polygons)
- Scene control (2D/3D modes, lighting)
- Time animation (play, pause, timeline)
- Terrain and imagery layers

## License

Apache 2.0 (same as base Qwen2.5 model)
EOF

    echo -e "${GREEN}  Configuration files created!${NC}"
    echo ""
}

# Print summary and next steps
print_summary() {
    echo ""
    echo -e "${GREEN}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║                  Compilation Complete!                     ║${NC}"
    echo -e "${GREEN}╚════════════════════════════════════════════════════════════╝${NC}"
    echo ""

    OUTPUT_PATH="${WORK_DIR}/${OUTPUT_NAME}"

    echo -e "${BLUE}Output Directory:${NC}"
    echo "  ${OUTPUT_PATH}"
    echo ""

    echo -e "${BLUE}Generated Files:${NC}"
    ls -lh "${OUTPUT_PATH}" | grep -v "^total" | awk '{print "  " $9 " (" $5 ")"}'
    echo ""

    # Calculate total size
    TOTAL_SIZE=$(du -sh "${OUTPUT_PATH}" | awk '{print $1}')
    echo -e "${BLUE}Total Size:${NC} ${TOTAL_SIZE}"
    echo ""

    echo -e "${YELLOW}Next Steps:${NC}"
    echo ""
    echo "  1. Test locally (optional):"
    echo "     Update src/llm/web-llm-engine.ts to point to local files"
    echo ""
    echo "  2. Upload to HuggingFace:"
    echo "     huggingface-cli repo create ${OUTPUT_NAME} --type model"
    echo "     cd ${OUTPUT_PATH}"
    echo "     huggingface-cli upload YOUR_USERNAME/${OUTPUT_NAME} ."
    echo ""
    echo "  3. Update CUSTOM_MODEL_REGISTRY in web-llm-engine.ts:"
    echo "     '${OUTPUT_NAME}': {"
    echo "       modelId: '${OUTPUT_NAME}',"
    echo "       modelLibUrl: 'https://huggingface.co/YOUR_USERNAME/${OUTPUT_NAME}/resolve/main/${OUTPUT_NAME}.wasm',"
    echo "       modelWeightsUrl: 'https://huggingface.co/YOUR_USERNAME/${OUTPUT_NAME}',"
    echo "       vramRequired: 512,"
    echo "       contextWindowSize: ${CONTEXT_WINDOW},"
    echo "     }"
    echo ""
}

# Main execution
main() {
    echo ""
    check_prerequisites
    setup_directories
    convert_weights
    generate_config
    compile_webgpu
    create_webllm_config
    print_summary
}

main "$@"
