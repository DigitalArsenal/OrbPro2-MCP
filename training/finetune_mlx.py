#!/usr/bin/env python3
"""
Fine-tune a small language model for CesiumJS commands using MLX (Apple Silicon optimized).

This is MUCH faster than PyTorch on Apple Silicon - typically 5-10x speedup.

Requirements:
    pip install mlx mlx-lm

Usage:
    python finetune_mlx.py --model Qwen/Qwen2.5-0.5B-Instruct --num-epochs 3
"""

import argparse
import json
import os
from pathlib import Path


def convert_jsonl_to_mlx_format(input_file: str, output_file: str):
    """Convert our JSONL format to MLX chat format."""
    data = []
    with open(input_file, 'r') as f:
        for line in f:
            item = json.loads(line.strip())
            # MLX expects chat format with messages
            data.append({
                "messages": [
                    {
                        "role": "system",
                        "content": "You are a CesiumJS controller assistant. Convert natural language commands to tool calls."
                    },
                    {
                        "role": "user",
                        "content": item["instruction"]
                    },
                    {
                        "role": "assistant",
                        "content": item["output"]
                    }
                ]
            })

    with open(output_file, 'w') as f:
        for item in data:
            f.write(json.dumps(item) + '\n')

    return len(data)


def main():
    parser = argparse.ArgumentParser(description='Fine-tune LLM for CesiumJS using MLX')
    parser.add_argument('--model', type=str, default='Qwen/Qwen2.5-0.5B-Instruct',
                       help='Base model name or path')
    parser.add_argument('--dataset', type=str, default='generated-training-data.jsonl',
                       help='Path to training dataset')
    parser.add_argument('--output-dir', type=str, default='./cesium-qwen-lora-mlx',
                       help='Output directory for fine-tuned model')
    parser.add_argument('--num-epochs', type=int, default=3,
                       help='Number of training epochs (default: 3)')
    parser.add_argument('--batch-size', type=int, default=4,
                       help='Training batch size')
    parser.add_argument('--learning-rate', type=float, default=1e-5,
                       help='Learning rate')
    parser.add_argument('--lora-rank', type=int, default=16,
                       help='LoRA rank')
    parser.add_argument('--lora-layers', type=int, default=16,
                       help='Number of layers to apply LoRA to')
    parser.add_argument('--test-split', type=float, default=0.1,
                       help='Fraction of data for validation')
    parser.add_argument('--iters', type=int, default=None,
                       help='Number of iterations (overrides epochs if set)')
    args = parser.parse_args()

    # Check MLX is available
    try:
        import mlx.core as mx
        from mlx_lm import load, generate
        print(f"MLX backend: {mx.default_device()}")
    except ImportError:
        print("ERROR: MLX not installed. Install with:")
        print("  pip install mlx mlx-lm")
        return 1

    # Convert dataset to MLX format
    dataset_dir = os.path.dirname(os.path.abspath(args.dataset)) or '.'
    mlx_train_file = os.path.join(dataset_dir, 'train.jsonl')
    mlx_valid_file = os.path.join(dataset_dir, 'valid.jsonl')

    print(f"Converting dataset: {args.dataset}")

    # Load and split data
    all_data = []
    with open(args.dataset, 'r') as f:
        for line in f:
            item = json.loads(line.strip())
            all_data.append({
                "messages": [
                    {
                        "role": "system",
                        "content": "You are a CesiumJS controller assistant. Convert natural language commands to tool calls."
                    },
                    {
                        "role": "user",
                        "content": item["instruction"]
                    },
                    {
                        "role": "assistant",
                        "content": item["output"]
                    }
                ]
            })

    # Split into train/valid
    import random
    random.seed(42)
    random.shuffle(all_data)
    split_idx = int(len(all_data) * (1 - args.test_split))
    train_data = all_data[:split_idx]
    valid_data = all_data[split_idx:]

    # Write files
    with open(mlx_train_file, 'w') as f:
        for item in train_data:
            f.write(json.dumps(item) + '\n')

    with open(mlx_valid_file, 'w') as f:
        for item in valid_data:
            f.write(json.dumps(item) + '\n')

    print(f"  Train: {len(train_data)} examples -> {mlx_train_file}")
    print(f"  Valid: {len(valid_data)} examples -> {mlx_valid_file}")

    # Calculate iterations if not specified
    if args.iters is None:
        steps_per_epoch = len(train_data) // args.batch_size
        args.iters = steps_per_epoch * args.num_epochs
        print(f"  Total iterations: {args.iters} ({args.num_epochs} epochs)")

    # Create output directory
    os.makedirs(args.output_dir, exist_ok=True)

    # Run MLX LoRA training
    print(f"\nStarting MLX LoRA training...")
    print(f"  Model: {args.model}")
    print(f"  Output: {args.output_dir}")
    print(f"  LoRA rank: {args.lora_rank}")
    print(f"  Learning rate: {args.learning_rate}")
    print(f"  Batch size: {args.batch_size}")
    print(f"  Iterations: {args.iters}")
    print()

    # Create LoRA config file
    config_file = os.path.join(dataset_dir, 'lora_config.yaml')
    config_content = f"""# LoRA configuration
lora_parameters:
  rank: {args.lora_rank}
  alpha: {args.lora_rank * 2}
  dropout: 0.05
  scale: 1.0
"""
    with open(config_file, 'w') as f:
        f.write(config_content)

    # Use mlx_lm lora to train (new CLI format)
    import subprocess
    cmd = [
        "python3", "-m", "mlx_lm", "lora",
        "--model", args.model,
        "--train",
        "--data", dataset_dir,
        "--adapter-path", os.path.abspath(args.output_dir),
        "--iters", str(args.iters),
        "--batch-size", str(args.batch_size),
        "--learning-rate", str(args.learning_rate),
        "--num-layers", str(args.lora_layers),
        "--val-batches", "25",
        "--steps-per-eval", "200",
        "--steps-per-report", "10",
        "--save-every", "1000",
        "--config", config_file,
    ]

    print("Running:", " ".join(cmd))
    print("-" * 60)

    result = subprocess.run(cmd, cwd=dataset_dir)

    if result.returncode != 0:
        print(f"\nTraining failed with code {result.returncode}")
        return 1

    print("\n" + "=" * 60)
    print("Training complete!")
    print(f"Adapter saved to: {args.output_dir}")
    print()

    # Fuse the adapter with the base model
    print("Fusing LoRA adapter with base model...")
    merged_dir = os.path.join(args.output_dir, 'merged')

    fuse_cmd = [
        "python", "-m", "mlx_lm.fuse",
        "--model", args.model,
        "--adapter-path", args.output_dir,
        "--save-path", merged_dir,
    ]

    print("Running:", " ".join(fuse_cmd))
    result = subprocess.run(fuse_cmd)

    if result.returncode == 0:
        print(f"\nMerged model saved to: {merged_dir}")
        print("\nTo convert for WebGPU, run:")
        print(f"  ./scripts/compile-cesium-slm-docker.sh")
    else:
        print("\nFuse failed - you can run it manually later:")
        print(f"  python -m mlx_lm.fuse --model {args.model} --adapter-path {args.output_dir} --save-path {merged_dir}")

    return 0


if __name__ == '__main__':
    exit(main())
