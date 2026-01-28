# OrbPro2 MCP Fine-Tuning Pipeline

Fine-tune small language models for CesiumJS natural language control.

## Quick Start

### 1. Install Dependencies

```bash
pip install -r requirements.txt
```

### 2. Prepare Training Data

```bash
python prepare_data.py \
  --input ../generated-training-data.jsonl \
  --output ./data \
  --format alpaca \
  --test-size 0.1 \
  --hf-dataset
```

### 3. Fine-Tune with LoRA

```bash
python train_lora.py \
  --model Qwen/Qwen2.5-0.5B-Instruct \
  --train-file ./data/train_alpaca.jsonl \
  --eval-file ./data/test_alpaca.jsonl \
  --output-dir ./outputs/cesium-slm-lora \
  --epochs 3 \
  --batch-size 4 \
  --bf16
```

For memory-constrained systems, use QLoRA:

```bash
python train_qlora.py \
  --model Qwen/Qwen2.5-0.5B-Instruct \
  --train-file ./data/train_alpaca.jsonl \
  --output-dir ./outputs/cesium-slm-qlora \
  --epochs 3
```

### 4. Evaluate

```bash
python evaluate.py \
  --model ./outputs/cesium-slm-lora \
  --base-model Qwen/Qwen2.5-0.5B-Instruct \
  --test-file ./data/test_alpaca.jsonl \
  --output eval_results.json
```

### 5. Export for WebGPU

```bash
python export_mlc.py \
  --model ./outputs/cesium-slm-lora \
  --base-model Qwen/Qwen2.5-0.5B-Instruct \
  --output ./mlc-model \
  --quantization q4f16_1
```

## Supported Models

| Model | Parameters | VRAM (LoRA) | VRAM (QLoRA) | Best For |
|-------|------------|-------------|--------------|----------|
| Qwen2.5-0.5B | 500M | ~4GB | ~3GB | Production |
| Qwen2.5-1.5B | 1.5B | ~8GB | ~5GB | Quality |
| SmolLM2-360M | 360M | ~3GB | ~2GB | Mobile/Edge |
| SmolLM2-1.7B | 1.7B | ~10GB | ~6GB | Balance |

## Training Data Format

Input JSONL format:
```json
{"instruction": "Show me Paris", "output": "{\"tool\": \"flyTo\", \"arguments\": {\"longitude\": 2.3522, \"latitude\": 48.8566, \"height\": 500000}}"}
```

## Configuration Files

Pre-configured training settings in `config/`:
- `qwen2.5-0.5b.yaml` - Recommended for production
- `smollm2-360m.yaml` - Ultra-lightweight for mobile

## Directory Structure

```
finetune/
├── requirements.txt      # Python dependencies
├── prepare_data.py       # Data preprocessing
├── train_lora.py         # LoRA fine-tuning
├── train_qlora.py        # QLoRA (4-bit) fine-tuning
├── evaluate.py           # Model evaluation
├── export_mlc.py         # Export to MLC/WebGPU
├── config/               # Training configurations
│   ├── qwen2.5-0.5b.yaml
│   └── smollm2-360m.yaml
└── README.md             # This file
```

## Evaluation Metrics

- **Tool Accuracy**: Correct tool selection rate
- **JSON Validity**: Valid JSON output rate
- **Coordinate Precision**: Average coordinate error in degrees
- **Exact Match**: Exact output match rate

Target: 90%+ tool accuracy, <0.01° coordinate error

## Troubleshooting

### Out of Memory

Use QLoRA (`train_qlora.py`) or reduce batch size:
```bash
python train_lora.py --batch-size 2 --gradient-accumulation 8
```

### Slow Training

Enable bf16 and use larger batches:
```bash
python train_lora.py --bf16 --batch-size 8
```

### MLC Export Fails

Ensure MLC LLM is installed:
```bash
pip install mlc-ai-nightly mlc-chat-nightly
```

## Resources

- [Hugging Face PEFT](https://huggingface.co/docs/peft)
- [MLC LLM](https://llm.mlc.ai/docs/deploy/web.html)
- [Web-LLM](https://webllm.mlc.ai/)
- [Qwen2.5 Models](https://huggingface.co/Qwen)
