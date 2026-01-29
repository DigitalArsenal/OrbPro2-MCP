#!/bin/bash
# Complete pipeline: Generate data → Train → Compile for WebGPU
#
# Prerequisites:
#   Python 3.10+ (brew install python)
#   npm install
#   Docker Desktop running (for WebGPU compile step)
#
# A Python venv is created automatically at training/.venv
#
# Usage:
#   ./scripts/train-and-compile.sh           # Full pipeline
#   ./scripts/train-and-compile.sh --skip-train  # Skip training, just compile
#   ./scripts/train-and-compile.sh --skip-compile # Train only

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
TRAINING_DIR="${PROJECT_DIR}/training"

SKIP_TRAIN=false
SKIP_COMPILE=false

for arg in "$@"; do
    case $arg in
        --skip-train)
            SKIP_TRAIN=true
            ;;
        --skip-compile)
            SKIP_COMPILE=true
            ;;
    esac
done

echo -e "${GREEN}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║     CesiumJS SLM - Complete Training & Compile Pipeline   ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Check prerequisites
echo -e "${BLUE}Checking prerequisites...${NC}"

if ! command -v python3 &> /dev/null; then
    echo -e "${RED}Error: python3 is required (brew install python)${NC}"
    exit 1
fi

# Set up Python venv for MLX training
VENV_DIR="${TRAINING_DIR}/.venv"
if [ ! -d "${VENV_DIR}" ]; then
    echo -e "${YELLOW}Creating Python venv at ${VENV_DIR}...${NC}"
    python3 -m venv "${VENV_DIR}"
fi

# Activate venv for the rest of this script
source "${VENV_DIR}/bin/activate"
echo -e "${BLUE}Using Python: $(which python3)${NC}"

if ! python3 -c "import mlx" 2>/dev/null; then
    echo -e "${YELLOW}Installing MLX into venv...${NC}"
    pip install --upgrade pip
    pip install mlx mlx-lm
fi

if [ ! -d "${PROJECT_DIR}/node_modules" ]; then
    echo -e "${YELLOW}Installing npm dependencies...${NC}"
    cd "${PROJECT_DIR}" && npm install
fi

echo -e "${GREEN}Prerequisites OK${NC}"
echo ""

# Step 1: Generate training data
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}Step 1: Generating training data${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

cd "${TRAINING_DIR}"

if [ -f "mcp-training-data.jsonl" ]; then
    EXISTING_COUNT=$(wc -l < mcp-training-data.jsonl | tr -d ' ')
    echo -e "${BLUE}Found existing training data: ${EXISTING_COUNT} examples${NC}"
    read -p "Regenerate? [y/N] " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        npx tsx generate-mcp-training-data.ts --count 100000
    fi
else
    npx tsx generate-mcp-training-data.ts --count 100000
fi

TRAIN_COUNT=$(wc -l < mcp-training-data.jsonl | tr -d ' ')
echo -e "${GREEN}Training data ready: ${TRAIN_COUNT} examples${NC}"
echo ""

# Step 2: Train model
if [ "$SKIP_TRAIN" = false ]; then
    echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${YELLOW}Step 2: Training model with MLX${NC}"
    echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

    if [ -d "cesium-qwen-lora-mlx/merged" ]; then
        echo -e "${BLUE}Found existing trained model${NC}"
        read -p "Retrain? [y/N] " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            echo -e "${BLUE}Skipping training${NC}"
            SKIP_TRAIN=true
        fi
    fi

    if [ "$SKIP_TRAIN" = false ]; then
        echo -e "${BLUE}Starting training (this takes ~2 hours on Apple Silicon)...${NC}"
        echo ""

        python3 finetune_mlx.py \
            --dataset mcp-training-data.jsonl \
            --output-dir cesium-qwen-lora-mlx \
            --num-epochs 3 \
            --batch-size 4

        echo ""
        echo -e "${GREEN}Training complete!${NC}"
    fi
else
    echo -e "${BLUE}Skipping training (--skip-train)${NC}"
fi

# Verify model exists
if [ ! -d "cesium-qwen-lora-mlx/merged" ]; then
    echo -e "${RED}Error: Trained model not found at cesium-qwen-lora-mlx/merged${NC}"
    echo "Run training first or remove --skip-train flag"
    exit 1
fi

echo ""

# Step 3: Test model
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}Step 3: Testing model${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

python3 -c "
from mlx_lm import load, generate

model, tokenizer = load('cesium-qwen-lora-mlx/merged')

tests = ['fly to Paris', 'add a red sphere at CERN', 'add a box at Tokyo']
for prompt in tests:
    messages = [
        {'role': 'system', 'content': 'You are a CesiumJS controller assistant. Convert natural language commands to tool calls.'},
        {'role': 'user', 'content': prompt}
    ]
    formatted = tokenizer.apply_chat_template(messages, tokenize=False, add_generation_prompt=True)
    response = generate(model, tokenizer, prompt=formatted, max_tokens=256)
    print(f'✓ {prompt}')
    print(f'  → {response[:100]}...' if len(response) > 100 else f'  → {response}')
"

echo ""
echo -e "${GREEN}Model tests passed!${NC}"
echo ""

# Step 4: Compile for WebGPU
if [ "$SKIP_COMPILE" = false ]; then
    echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${YELLOW}Step 4: Compiling for WebGPU${NC}"
    echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

    if ! command -v docker &> /dev/null; then
        echo -e "${RED}Error: Docker is required for WebGPU compilation${NC}"
        echo "Install Docker Desktop from: https://www.docker.com/products/docker-desktop"
        exit 1
    fi

    if ! docker info &> /dev/null; then
        echo -e "${RED}Error: Docker daemon is not running${NC}"
        echo "Please start Docker Desktop"
        exit 1
    fi

    cd "${PROJECT_DIR}"
    ./scripts/compile-cesium-slm-docker.sh
else
    echo -e "${BLUE}Skipping compilation (--skip-compile)${NC}"
fi

echo ""
echo -e "${GREEN}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║                    Pipeline Complete!                      ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${BLUE}Outputs:${NC}"
echo "  • Trained model: training/cesium-qwen-lora-mlx/merged/"
if [ "$SKIP_COMPILE" = false ]; then
    echo "  • WebGPU model:  mlc-models/OrbPro-Cesium-SLM-0.5B-q4f16_1-MLC/"
fi
echo ""
echo -e "${BLUE}Next steps:${NC}"
echo "  1. Upload to HuggingFace:"
echo "     cd mlc-models/OrbPro-Cesium-SLM-0.5B-q4f16_1-MLC"
echo "     huggingface-cli upload YOUR_USERNAME/OrbPro-Cesium-SLM-0.5B-q4f16_1-MLC ."
echo ""
echo "  2. Update src/llm/web-llm-engine.ts with your model URL"
echo ""
