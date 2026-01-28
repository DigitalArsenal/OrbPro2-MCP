#!/bin/bash
# Upload OrbPro OrbPro2 MCP to HuggingFace
# Run this AFTER testing the model locally

set -e

# Configuration - UPDATE THESE
HF_USERNAME="${HF_USERNAME:-YOUR_USERNAME}"
MODEL_NAME="OrbPro-Cesium-SLM-0.5B-q4f16_1-MLC"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
MODEL_DIR="${PROJECT_DIR}/mlc-models/${MODEL_NAME}"

echo -e "${GREEN}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║     Upload OrbPro OrbPro2 MCP to HuggingFace               ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Check if model directory exists
if [ ! -d "${MODEL_DIR}" ]; then
    echo -e "${RED}Error: Model directory not found at ${MODEL_DIR}${NC}"
    exit 1
fi

# Check HF_USERNAME
if [ "$HF_USERNAME" = "YOUR_USERNAME" ]; then
    echo -e "${YELLOW}Please set your HuggingFace username:${NC}"
    echo ""
    echo "  Option 1: Set environment variable"
    echo "    export HF_USERNAME=your-username"
    echo "    ./scripts/upload-to-huggingface.sh"
    echo ""
    echo "  Option 2: Edit this script and change HF_USERNAME"
    echo ""
    exit 1
fi

echo -e "${YELLOW}Model Directory:${NC} ${MODEL_DIR}"
echo -e "${YELLOW}HuggingFace Repo:${NC} ${HF_USERNAME}/${MODEL_NAME}"
echo ""

# Check if logged in
if ! huggingface-cli whoami &>/dev/null; then
    echo -e "${YELLOW}>>> Logging in to HuggingFace...${NC}"
    huggingface-cli login
fi

# Create repo if it doesn't exist
echo -e "${YELLOW}>>> Creating HuggingFace repository (if needed)...${NC}"
huggingface-cli repo create "${MODEL_NAME}" --type model 2>/dev/null || echo "Repo already exists or created"

# Upload files
echo ""
echo -e "${YELLOW}>>> Uploading model files...${NC}"
echo "This may take a few minutes depending on your connection."
echo ""

cd "${MODEL_DIR}"
huggingface-cli upload "${HF_USERNAME}/${MODEL_NAME}" . --commit-message "Upload OrbPro OrbPro2 MCP model"

echo ""
echo -e "${GREEN}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║                    Upload Complete!                        ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${YELLOW}Model URL:${NC} https://huggingface.co/${HF_USERNAME}/${MODEL_NAME}"
echo ""
echo -e "${YELLOW}Next Steps:${NC}"
echo ""
echo "1. Update src/llm/web-llm-engine.ts with your username:"
echo ""
echo "   CUSTOM_MODEL_REGISTRY = {"
echo "     '${MODEL_NAME}': {"
echo "       modelId: '${MODEL_NAME}',"
echo "       modelLibUrl: 'https://raw.githubusercontent.com/mlc-ai/binary-mlc-llm-libs/main/web-llm-models/v0_2_80/Qwen2-0.5B-Instruct-q4f16_1-ctx4k_cs1k-webgpu.wasm',"
echo "       modelWeightsUrl: 'https://huggingface.co/${HF_USERNAME}/${MODEL_NAME}',"
echo "       vramRequired: 512,"
echo "       contextWindowSize: 4096,"
echo "     },"
echo "   };"
echo ""
echo "2. Update the trained models list in RECOMMENDED_MODELS"
echo ""
