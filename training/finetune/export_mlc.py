#!/usr/bin/env python3
"""
MLC LLM Export Script for Cesium SLM

Converts fine-tuned models to MLC format for WebGPU inference in browser.
Supports quantization for optimal browser performance.
"""

import argparse
import json
import os
import shutil
import subprocess
import sys
from pathlib import Path

from rich.console import Console
from rich.progress import Progress, SpinnerColumn, TextColumn

console = Console()


def check_mlc_installed() -> bool:
    """Check if MLC LLM is installed."""
    try:
        result = subprocess.run(
            ["mlc_llm", "--version"],
            capture_output=True,
            text=True,
        )
        return result.returncode == 0
    except FileNotFoundError:
        return False


def merge_lora_weights(
    base_model: str,
    lora_path: str,
    output_path: str,
    use_4bit: bool = False,
):
    """Merge LoRA weights into base model."""
    import torch
    from transformers import AutoModelForCausalLM, AutoTokenizer
    from peft import PeftModel

    console.print(f"Merging LoRA weights from {lora_path}...")

    # Load base model
    if use_4bit:
        from transformers import BitsAndBytesConfig
        quantization_config = BitsAndBytesConfig(
            load_in_4bit=True,
            bnb_4bit_quant_type="nf4",
            bnb_4bit_compute_dtype=torch.bfloat16,
        )
        model = AutoModelForCausalLM.from_pretrained(
            base_model,
            trust_remote_code=True,
            quantization_config=quantization_config,
            device_map="auto",
        )
    else:
        model = AutoModelForCausalLM.from_pretrained(
            base_model,
            trust_remote_code=True,
            torch_dtype=torch.float16,
            device_map="auto",
        )

    # Load and merge LoRA
    model = PeftModel.from_pretrained(model, lora_path)
    model = model.merge_and_unload()

    # Save merged model
    console.print(f"Saving merged model to {output_path}...")
    model.save_pretrained(output_path)

    # Save tokenizer
    tokenizer = AutoTokenizer.from_pretrained(base_model, trust_remote_code=True)
    tokenizer.save_pretrained(output_path)

    return output_path


def convert_to_mlc(
    model_path: str,
    output_dir: str,
    quantization: str = "q4f16_1",
    target: str = "webgpu",
):
    """Convert model to MLC format."""

    console.print(f"Converting to MLC format (quantization: {quantization})...")

    # Create output directory
    os.makedirs(output_dir, exist_ok=True)

    # MLC conversion command
    cmd = [
        "mlc_llm", "convert_weight",
        model_path,
        "--quantization", quantization,
        "--output", output_dir,
    ]

    with Progress(
        SpinnerColumn(),
        TextColumn("[progress.description]{task.description}"),
        console=console,
    ) as progress:
        task = progress.add_task("Converting weights...", total=None)

        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
        )

        if result.returncode != 0:
            console.print(f"[red]Error converting weights:[/red]\n{result.stderr}")
            return False

    # Generate model library for WebGPU
    console.print("Generating WebGPU library...")

    lib_cmd = [
        "mlc_llm", "gen_config",
        model_path,
        "--quantization", quantization,
        "--output", output_dir,
    ]

    result = subprocess.run(lib_cmd, capture_output=True, text=True)

    if result.returncode != 0:
        console.print(f"[yellow]Warning generating config:[/yellow]\n{result.stderr}")

    return True


def create_web_llm_config(
    model_id: str,
    output_dir: str,
    quantization: str = "q4f16_1",
    context_window: int = 4096,
    max_batch_size: int = 1,
):
    """Create Web-LLM compatible config."""

    config = {
        "model_id": model_id,
        "model_type": "llama",  # Compatible format
        "quantization": quantization,
        "context_window_size": context_window,
        "max_batch_size": max_batch_size,
        "prefill_chunk_size": 1024,
        "tensor_parallel_shards": 1,
        "conv_template": "chatml",
        "stop_tokens": [151643, 151644, 151645],  # Qwen stop tokens
        "system_prompt": "You are an AI assistant that controls CesiumJS. Convert natural language commands into JSON tool calls.",
    }

    config_path = os.path.join(output_dir, "mlc-chat-config.json")
    with open(config_path, "w") as f:
        json.dump(config, f, indent=2)

    console.print(f"Created Web-LLM config: {config_path}")
    return config_path


def create_model_lib_wasm(output_dir: str, quantization: str):
    """Generate WASM library for the model."""

    console.print("Generating WASM library...")

    cmd = [
        "mlc_llm", "compile",
        "--model", output_dir,
        "--quantization", quantization,
        "--target", "webgpu",
        "--output", os.path.join(output_dir, "model.wasm"),
    ]

    result = subprocess.run(cmd, capture_output=True, text=True)

    if result.returncode != 0:
        console.print(f"[yellow]WASM compilation warning:[/yellow]\n{result.stderr}")
        console.print("Note: WASM compilation may require additional setup.")
        return False

    return True


def main():
    parser = argparse.ArgumentParser(
        description="Export Cesium SLM model to MLC format for WebGPU"
    )

    parser.add_argument("--model", type=str, required=True,
                       help="Path to fine-tuned model or LoRA adapter")
    parser.add_argument("--base-model", type=str, default=None,
                       help="Base model (required if exporting LoRA adapter)")
    parser.add_argument("--output", type=str, required=True,
                       help="Output directory for MLC model")
    parser.add_argument("--quantization", type=str, default="q4f16_1",
                       choices=["q4f16_1", "q4f32_1", "q8f16_1", "q0f16", "q0f32"],
                       help="Quantization format (default: q4f16_1)")
    parser.add_argument("--model-id", type=str, default="cesium-slm",
                       help="Model ID for Web-LLM config")
    parser.add_argument("--context-window", type=int, default=4096,
                       help="Context window size")
    parser.add_argument("--skip-merge", action="store_true",
                       help="Skip LoRA merge step (use if model is already merged)")

    args = parser.parse_args()

    # Check MLC installation
    if not check_mlc_installed():
        console.print("[red]MLC LLM not found![/red]")
        console.print("Install with: pip install mlc-ai-nightly mlc-chat-nightly")
        console.print("Or follow: https://llm.mlc.ai/docs/install/tvm.html")
        sys.exit(1)

    model_path = args.model
    output_dir = args.output

    # Check if this is a LoRA adapter
    adapter_config = Path(args.model) / "adapter_config.json"

    if adapter_config.exists() and not args.skip_merge:
        # Need to merge LoRA weights first
        if args.base_model is None:
            with open(adapter_config) as f:
                config = json.load(f)
                args.base_model = config.get("base_model_name_or_path")

        if args.base_model is None:
            console.print("[red]Base model required for LoRA adapter![/red]")
            sys.exit(1)

        # Merge to temporary directory
        merged_path = os.path.join(output_dir, "merged_model")
        model_path = merge_lora_weights(
            args.base_model,
            args.model,
            merged_path,
        )

    # Create output directory
    os.makedirs(output_dir, exist_ok=True)

    # Convert to MLC format
    success = convert_to_mlc(
        model_path,
        output_dir,
        quantization=args.quantization,
    )

    if not success:
        console.print("[red]Conversion failed![/red]")
        sys.exit(1)

    # Create Web-LLM config
    create_web_llm_config(
        args.model_id,
        output_dir,
        quantization=args.quantization,
        context_window=args.context_window,
    )

    # Try to create WASM library
    create_model_lib_wasm(output_dir, args.quantization)

    console.print("\n[green]Export complete![/green]")
    console.print(f"Output directory: {output_dir}")
    console.print("\nTo use with Web-LLM:")
    console.print(f"1. Host the {output_dir} directory on a web server")
    console.print("2. Load the model in your application:")
    console.print(f'   const engine = await CreateMLCEngine("{args.model_id}")')

    # Print file list
    console.print("\nGenerated files:")
    for path in sorted(Path(output_dir).rglob("*")):
        if path.is_file():
            size_mb = path.stat().st_size / (1024 * 1024)
            console.print(f"  {path.relative_to(output_dir)}: {size_mb:.1f} MB")


if __name__ == "__main__":
    main()
