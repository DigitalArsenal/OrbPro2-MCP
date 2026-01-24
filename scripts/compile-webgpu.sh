#!/bin/bash
# Compile SmolLM2 to WebGPU WASM
export PATH="/Users/tj/software/emsdk:/Users/tj/software/emsdk/upstream/emscripten:$PATH"
export MLC_LLM_SOURCE_DIR=/Users/tj/software/mlc-llm

/Users/tj/software/mlc-venv/bin/python -m mlc_llm compile \
    /Users/tj/software/OrbPro-Small-Language-Model/mlc-models/SmolLM2-360M-Instruct-q4f16_1-MLC \
    --device webgpu \
    --opt O3 \
    -o /Users/tj/software/OrbPro-Small-Language-Model/mlc-models/SmolLM2-360M-Instruct-q4f16_1-MLC/SmolLM2-360M-Instruct-q4f16_1-MLC.wasm
