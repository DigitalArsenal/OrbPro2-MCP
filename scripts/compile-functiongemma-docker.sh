#!/bin/bash
# Compile FunctionGemma-270M inside Docker container
set -e

MODEL_NAME="google/functiongemma-270m-it"
OUTPUT_NAME="FunctionGemma-270M-it-q4f16_1-MLC"
QUANTIZATION="q4f16_1"
CONTEXT_WINDOW=4096

echo "=== FunctionGemma-270M MLC Compilation ==="
echo ""

# Activate emscripten
source /opt/emsdk/emsdk_env.sh

# Initialize git-lfs
git lfs install

# Create output directory
mkdir -p /workspace/output

# Step 1: Download model
echo ">>> Downloading FunctionGemma-270M..."
if [ ! -d "/workspace/functiongemma-270m-it" ]; then
    git clone "https://huggingface.co/${MODEL_NAME}" /workspace/functiongemma-270m-it
fi

# Step 2: Convert weights
echo ">>> Converting weights to MLC format..."
python3 -m mlc_llm convert_weight \
    /workspace/functiongemma-270m-it \
    --quantization "${QUANTIZATION}" \
    --output "/workspace/output/${OUTPUT_NAME}"

# Step 3: Generate config
echo ">>> Generating MLC config..."
python3 -m mlc_llm gen_config \
    /workspace/functiongemma-270m-it \
    --quantization "${QUANTIZATION}" \
    --context-window-size "${CONTEXT_WINDOW}" \
    --output "/workspace/output/${OUTPUT_NAME}"

# Step 4: Compile for WebGPU
echo ">>> Compiling for WebGPU..."
python3 -m mlc_llm compile \
    "/workspace/output/${OUTPUT_NAME}" \
    --device webgpu \
    --opt O3 \
    --output "/workspace/output/${OUTPUT_NAME}/${OUTPUT_NAME}.wasm"

echo ""
echo "=== Compilation Complete! ==="
echo "Output: /workspace/output/${OUTPUT_NAME}"
ls -la "/workspace/output/${OUTPUT_NAME}/"
