# Training a Custom CesiumJS SLM

This directory contains resources for fine-tuning a small language model specifically for CesiumJS commands.

## Dataset

The `cesium-commands-dataset.jsonl` file contains training examples mapping natural language commands to CesiumJS tool calls.

### Format
```json
{"instruction": "Show me Paris", "output": "{\"tool\": \"flyTo\", \"arguments\": {\"longitude\": 2.3522, \"latitude\": 48.8566, \"height\": 500000}}"}
```

### Categories
- Navigation commands (flyTo, lookAt)
- Marker/Point creation
- Shape drawing (polylines, polygons, circles)
- Scene control (zoom, 2D/3D mode)
- Animation control (play, pause, time)

## Fine-tuning Options

### Option 1: LoRA Fine-tuning with PEFT

```bash
pip install transformers peft datasets accelerate

python finetune_lora.py \
  --model_name Qwen/Qwen2.5-0.5B-Instruct \
  --dataset cesium-commands-dataset.jsonl \
  --output_dir ./cesium-slm-lora \
  --num_epochs 3
```

### Option 2: Using MLC-LLM for WebGPU Conversion

After fine-tuning, convert the model for browser use:

```bash
# Install MLC-LLM
pip install mlc-llm

# Compile model for WebGPU
mlc_llm compile \
  --model ./cesium-slm-lora/merged \
  --quantization q4f16_1 \
  --target webgpu \
  --output ./cesium-slm-webgpu
```

### Option 3: Using WebLLM's Built-in Models with Custom System Prompt

The simplest approach is to use pre-trained models with a carefully crafted system prompt (which is what we do in the main application). The system prompt teaches the model the expected output format.

## Extending the Dataset

To add more training examples:

1. Follow the JSONL format with `instruction` and `output` fields
2. Ensure the output is valid JSON matching the tool schemas
3. Include variations in natural language (synonyms, different phrasings)
4. Add examples for edge cases and complex commands

### Tool Schemas

```typescript
// flyTo
{longitude: number, latitude: number, height?: number, duration?: number}

// addPoint
{longitude: number, latitude: number, name?: string, color?: string, size?: number}

// addPolyline
{positions: Array<{longitude: number, latitude: number}>, name?: string, color?: string, width?: number}

// addPolygon
{positions: Array<{longitude: number, latitude: number}>, name?: string, color?: string, extrudedHeight?: number}

// addCircle
{longitude: number, latitude: number, radius: number, name?: string, color?: string}

// zoom
{amount: number}  // positive = in, negative = out

// setSceneMode
{mode: "2D" | "3D" | "COLUMBUS_VIEW"}

// setTime
{time?: string, multiplier?: number}  // time is ISO 8601 format
```

## Evaluation

Test your fine-tuned model by running:

```bash
python evaluate_model.py \
  --model ./cesium-slm-lora/merged \
  --test_file test-commands.jsonl
```

## Notes

- Start with a small model (0.5B-1.5B parameters) for browser deployment
- Use 4-bit quantization (q4f16_1) for optimal WebGPU performance
- The LoRA approach allows efficient fine-tuning without full model retraining
- WebLLM supports loading LoRA adapters at runtime
