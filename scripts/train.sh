#!/bin/bash
# Complete training pipeline for OrbPro2 MCP
# Usage: ./scripts/train.sh [--size 0.5B|1.5B|3B] [--epochs N] [--skip-train] [--skip-compile]

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
TRAINING_DIR="${PROJECT_DIR}/training"

# Defaults
MODEL_SIZE="0.5B"
EPOCHS=3
SKIP_TRAIN=false
SKIP_COMPILE=false
QUANTIZATION="q4f32_1"

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --size)
            MODEL_SIZE="$2"
            shift 2
            ;;
        --epochs)
            EPOCHS="$2"
            shift 2
            ;;
        --skip-train)
            SKIP_TRAIN=true
            shift
            ;;
        --skip-compile)
            SKIP_COMPILE=true
            shift
            ;;
        --quant)
            QUANTIZATION="$2"
            shift 2
            ;;
        -h|--help)
            echo "Usage: $0 [options]"
            echo ""
            echo "Options:"
            echo "  --size SIZE      Model size: 0.5B, 1.5B, or 3B (default: 0.5B)"
            echo "  --epochs N       Number of training epochs (default: 3)"
            echo "  --quant Q        Quantization: q4f16_1, q4f32_1 (default: q4f32_1)"
            echo "  --skip-train     Skip training, only compile existing model"
            echo "  --skip-compile   Skip compilation, only train"
            echo "  -h, --help       Show this help"
            exit 0
            ;;
        *)
            echo -e "${RED}Unknown option: $1${NC}"
            exit 1
            ;;
    esac
done

# Map size to model name
case $MODEL_SIZE in
    0.5B|0.5b)
        BASE_MODEL="Qwen/Qwen2.5-0.5B-Instruct"
        LORA_DIR="orbpro2-lora-0.5b"
        OUTPUT_NAME="OrbPro2-MCP-0.5B-${QUANTIZATION}-MLC"
        VRAM_EST="600MB"
        ;;
    1.5B|1.5b)
        BASE_MODEL="Qwen/Qwen2.5-1.5B-Instruct"
        LORA_DIR="orbpro2-lora-1.5b"
        OUTPUT_NAME="OrbPro2-MCP-1.5B-${QUANTIZATION}-MLC"
        VRAM_EST="1GB"
        ;;
    3B|3b)
        BASE_MODEL="Qwen/Qwen2.5-3B-Instruct"
        LORA_DIR="orbpro2-lora-3b"
        OUTPUT_NAME="OrbPro2-MCP-3B-${QUANTIZATION}-MLC"
        VRAM_EST="2GB"
        ;;
    *)
        echo -e "${RED}Invalid model size: $MODEL_SIZE${NC}"
        echo "Valid sizes: 0.5B, 1.5B, 3B"
        exit 1
        ;;
esac

LORA_OUTPUT_DIR="${TRAINING_DIR}/${LORA_DIR}"
MERGED_DIR="${LORA_OUTPUT_DIR}/merged"
MLC_OUTPUT_DIR="${PROJECT_DIR}/mlc-models"
PUBLIC_MODEL_DIR="${PROJECT_DIR}/public/models/${OUTPUT_NAME}/resolve/main"

echo -e "${GREEN}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║        OrbPro2 MCP - Complete Training Pipeline           ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${CYAN}Configuration:${NC}"
echo -e "  Model Size:    ${BLUE}${MODEL_SIZE}${NC} (${BASE_MODEL})"
echo -e "  Quantization:  ${BLUE}${QUANTIZATION}${NC}"
echo -e "  Epochs:        ${BLUE}${EPOCHS}${NC}"
echo -e "  Output:        ${BLUE}${OUTPUT_NAME}${NC}"
echo -e "  Est. VRAM:     ${BLUE}${VRAM_EST}${NC}"
echo ""

# Check requirements
echo -e "${YELLOW}>>> Checking requirements...${NC}"

# Check Python/MLX - use venv if available
VENV_DIR="${TRAINING_DIR}/venv"
if [ -d "$VENV_DIR" ]; then
    echo -e "  ${GREEN}✓${NC} Using venv at ${VENV_DIR}"
    source "${VENV_DIR}/bin/activate"
elif ! command -v python3 &> /dev/null; then
    echo -e "${RED}Error: Python 3 is required${NC}"
    exit 1
fi

if ! python3 -c "import mlx" 2>/dev/null; then
    echo -e "${YELLOW}MLX not found. Creating venv and installing...${NC}"
    python3 -m venv "$VENV_DIR"
    source "${VENV_DIR}/bin/activate"
    pip install mlx mlx-lm
fi
echo -e "  ${GREEN}✓${NC} Python/MLX available"

# Check Docker (for compilation)
if [ "$SKIP_COMPILE" = false ]; then
    if ! command -v docker &> /dev/null; then
        echo -e "${RED}Error: Docker is required for WebGPU compilation${NC}"
        exit 1
    fi
    echo -e "  ${GREEN}✓${NC} Docker available"
fi

# Check training data
TRAINING_DATA="${TRAINING_DIR}/generated-training-data.jsonl"
if [ ! -f "$TRAINING_DATA" ]; then
    echo -e "${RED}Error: Training data not found at ${TRAINING_DATA}${NC}"
    echo "Generate it first with the data generation script."
    exit 1
fi
EXAMPLE_COUNT=$(wc -l < "$TRAINING_DATA" | tr -d ' ')
echo -e "  ${GREEN}✓${NC} Training data: ${EXAMPLE_COUNT} examples"

echo ""

# ============================================================================
# STEP 1: MLX LoRA Training
# ============================================================================
if [ "$SKIP_TRAIN" = false ]; then
    echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${YELLOW}  STEP 1: MLX LoRA Fine-tuning${NC}"
    echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""

    cd "$TRAINING_DIR"

    # Calculate total iterations for progress display
    BATCH_SIZE=16
    TRAIN_EXAMPLES=$((EXAMPLE_COUNT * 9 / 10))  # 90% for training
    STEPS_PER_EPOCH=$((TRAIN_EXAMPLES / BATCH_SIZE))
    TOTAL_ITERS=$((STEPS_PER_EPOCH * EPOCHS))
    echo -e "  Training ${TRAIN_EXAMPLES} examples for ${EPOCHS} epochs (${TOTAL_ITERS} iterations)"
    echo ""

    # Run training with clean progress output
    python3 train_progress.py "$TOTAL_ITERS" \
        python3 finetune_mlx.py \
        --model "$BASE_MODEL" \
        --dataset "$TRAINING_DATA" \
        --output-dir "$LORA_OUTPUT_DIR" \
        --num-epochs "$EPOCHS" \
        --batch-size "$BATCH_SIZE" \
        --learning-rate 4e-5 \
        --lora-rank 16

    echo ""
    echo -e "${GREEN}✓ Training complete${NC}"
    echo ""
else
    echo -e "${YELLOW}>>> Skipping training (--skip-train)${NC}"
    if [ ! -d "$MERGED_DIR" ]; then
        echo -e "${RED}Error: Merged model not found at ${MERGED_DIR}${NC}"
        echo "Run training first or remove --skip-train"
        exit 1
    fi
fi

# ============================================================================
# STEP 2: WebGPU Compilation via Docker
# ============================================================================
if [ "$SKIP_COMPILE" = false ]; then
    echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${YELLOW}  STEP 2: WebGPU Compilation (Docker)${NC}"
    echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""

    # Update compile script with current model settings
    COMPILE_SCRIPT="${SCRIPT_DIR}/compile.sh"

    # Create a temporary modified compile script
    # Must override SCRIPT_DIR since temp file location differs
    TEMP_COMPILE=$(mktemp)
    sed -e "s|^SCRIPT_DIR=.*|SCRIPT_DIR=\"${SCRIPT_DIR}\"|" \
        -e "s|^PROJECT_DIR=.*|PROJECT_DIR=\"${PROJECT_DIR}\"|" \
        -e "s|^OUTPUT_DIR=.*|OUTPUT_DIR=\"${MLC_OUTPUT_DIR}\"|" \
        -e "s|^MODEL_DIR=.*|MODEL_DIR=\"${MERGED_DIR}\"|" \
        -e "s|^OUTPUT_NAME=.*|OUTPUT_NAME=\"${OUTPUT_NAME}\"|" \
        -e "s|^QUANTIZATION=.*|QUANTIZATION=\"${QUANTIZATION}\"|" \
        "$COMPILE_SCRIPT" > "$TEMP_COMPILE"
    chmod +x "$TEMP_COMPILE"

    # Run compilation
    "$TEMP_COMPILE"
    rm "$TEMP_COMPILE"

    echo ""
    echo -e "${GREEN}✓ Compilation complete${NC}"
    echo ""
else
    echo -e "${YELLOW}>>> Skipping compilation (--skip-compile)${NC}"
fi

# ============================================================================
# STEP 3: Deploy to public/models
# ============================================================================
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}  STEP 3: Deploy to public/models${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

MLC_MODEL_DIR="${MLC_OUTPUT_DIR}/${OUTPUT_NAME}"

if [ ! -d "$MLC_MODEL_DIR" ]; then
    echo -e "${RED}Error: Compiled model not found at ${MLC_MODEL_DIR}${NC}"
    exit 1
fi

# Create public model directory (web-llm expects /resolve/main/ path)
mkdir -p "$PUBLIC_MODEL_DIR"

# Copy all model files
echo "Copying model files to ${PUBLIC_MODEL_DIR}..."
cp -v "$MLC_MODEL_DIR"/* "$PUBLIC_MODEL_DIR/"

# Calculate sizes
TOTAL_SIZE=$(du -sh "$PUBLIC_MODEL_DIR" | awk '{print $1}')
WASM_SIZE=$(ls -lh "$PUBLIC_MODEL_DIR"/*.wasm 2>/dev/null | awk '{print $5}' || echo "N/A")

echo ""
echo -e "${GREEN}✓ Deployed to public/models${NC}"
echo ""

# ============================================================================
# Summary
# ============================================================================
echo -e "${GREEN}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║                    Training Complete!                      ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${CYAN}Model:${NC}      ${OUTPUT_NAME}"
echo -e "${CYAN}Location:${NC}   public/models/${OUTPUT_NAME}/resolve/main/"
echo -e "${CYAN}Total Size:${NC} ${TOTAL_SIZE}"
echo -e "${CYAN}WASM Size:${NC}  ${WASM_SIZE}"
echo ""
echo -e "${CYAN}Files:${NC}"
ls -lh "$PUBLIC_MODEL_DIR/"
echo ""
echo -e "${YELLOW}To test:${NC}"
echo "  npm run dev"
echo "  # Select '${OUTPUT_NAME}' from model selector"
echo ""
