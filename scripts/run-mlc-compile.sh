#!/bin/bash
# Build and run the MLC compilation Docker container
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
OUTPUT_DIR="${PROJECT_DIR}/mlc-models"

echo "=== MLC Model Compilation Runner ==="
echo "Output directory: ${OUTPUT_DIR}"
echo ""

# Create output directory
mkdir -p "${OUTPUT_DIR}"

# Build Docker image
echo ">>> Building Docker image..."
docker build -t mlc-compile -f "${SCRIPT_DIR}/Dockerfile.mlc-compile" "${SCRIPT_DIR}"

# Run compilation
echo ">>> Running compilation..."
docker run --rm \
    -v "${OUTPUT_DIR}:/workspace/output" \
    mlc-compile

echo ""
echo "=== Done! ==="
echo "Compiled model is in: ${OUTPUT_DIR}"
ls -la "${OUTPUT_DIR}/"
