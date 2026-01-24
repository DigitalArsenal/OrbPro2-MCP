#!/usr/bin/env python3
"""
Evaluation Script for Cesium SLM

Evaluates fine-tuned models on test data for:
- Tool selection accuracy
- Coordinate precision
- JSON validity
- Overall response quality
"""

import argparse
import json
import re
from collections import defaultdict
from dataclasses import dataclass
from pathlib import Path
from typing import Optional

import torch
from datasets import load_dataset
from rich.console import Console
from rich.table import Table
from tqdm import tqdm
from transformers import AutoModelForCausalLM, AutoTokenizer, BitsAndBytesConfig
from peft import PeftModel


console = Console()


@dataclass
class EvalResult:
    instruction: str
    expected: str
    predicted: str
    tool_match: bool
    json_valid: bool
    coord_error: Optional[float]
    exact_match: bool


def load_model(
    model_path: str,
    base_model: Optional[str] = None,
    use_4bit: bool = False,
):
    """Load model (supports LoRA adapters and full models)."""

    quantization_config = None
    if use_4bit:
        quantization_config = BitsAndBytesConfig(
            load_in_4bit=True,
            bnb_4bit_quant_type="nf4",
            bnb_4bit_compute_dtype=torch.bfloat16,
        )

    # Check if this is a LoRA adapter
    adapter_config_path = Path(model_path) / "adapter_config.json"

    if adapter_config_path.exists():
        # Load base model and apply adapter
        if base_model is None:
            with open(adapter_config_path) as f:
                adapter_config = json.load(f)
                base_model = adapter_config.get("base_model_name_or_path")

        console.print(f"Loading base model: {base_model}")
        model = AutoModelForCausalLM.from_pretrained(
            base_model,
            trust_remote_code=True,
            quantization_config=quantization_config,
            device_map="auto",
            torch_dtype=torch.bfloat16 if use_4bit else torch.float16,
        )

        console.print(f"Loading LoRA adapter: {model_path}")
        model = PeftModel.from_pretrained(model, model_path)

    else:
        # Load full model
        console.print(f"Loading model: {model_path}")
        model = AutoModelForCausalLM.from_pretrained(
            model_path,
            trust_remote_code=True,
            quantization_config=quantization_config,
            device_map="auto",
            torch_dtype=torch.bfloat16 if use_4bit else torch.float16,
        )

    tokenizer = AutoTokenizer.from_pretrained(
        base_model or model_path,
        trust_remote_code=True,
    )

    return model, tokenizer


def generate_response(
    model,
    tokenizer,
    instruction: str,
    max_new_tokens: int = 256,
    temperature: float = 0.1,
) -> str:
    """Generate model response for an instruction."""

    # Format as ChatML (Qwen style)
    prompt = f"""<|im_start|>system
You are an AI assistant that controls CesiumJS. Convert natural language commands into JSON tool calls.<|im_end|>
<|im_start|>user
{instruction}<|im_end|>
<|im_start|>assistant
"""

    inputs = tokenizer(prompt, return_tensors="pt").to(model.device)

    with torch.no_grad():
        outputs = model.generate(
            **inputs,
            max_new_tokens=max_new_tokens,
            temperature=temperature,
            do_sample=temperature > 0,
            top_p=0.9,
            pad_token_id=tokenizer.pad_token_id or tokenizer.eos_token_id,
        )

    response = tokenizer.decode(outputs[0], skip_special_tokens=False)

    # Extract assistant response
    if "<|im_start|>assistant" in response:
        response = response.split("<|im_start|>assistant")[-1]
    if "<|im_end|>" in response:
        response = response.split("<|im_end|>")[0]

    return response.strip()


def parse_json_output(text: str) -> Optional[dict]:
    """Try to parse JSON from model output."""
    # Clean up the text
    text = text.strip()

    # Try direct parse
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass

    # Try to find JSON in the text
    json_patterns = [
        r'\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}',  # Nested JSON
        r'\{.*?\}',  # Simple JSON
    ]

    for pattern in json_patterns:
        matches = re.findall(pattern, text, re.DOTALL)
        for match in matches:
            try:
                return json.loads(match)
            except json.JSONDecodeError:
                continue

    return None


def compare_coordinates(expected: dict, predicted: dict) -> Optional[float]:
    """Calculate coordinate error between expected and predicted."""
    try:
        expected_args = expected.get("arguments", {})
        predicted_args = predicted.get("arguments", {})

        if "longitude" in expected_args and "latitude" in expected_args:
            exp_lon = float(expected_args["longitude"])
            exp_lat = float(expected_args["latitude"])
            pred_lon = float(predicted_args.get("longitude", 0))
            pred_lat = float(predicted_args.get("latitude", 0))

            # Euclidean distance in degrees
            error = ((exp_lon - pred_lon) ** 2 + (exp_lat - pred_lat) ** 2) ** 0.5
            return error

    except (TypeError, ValueError, KeyError):
        pass

    return None


def evaluate_sample(
    expected_str: str,
    predicted_str: str,
    instruction: str,
) -> EvalResult:
    """Evaluate a single sample."""

    expected_json = parse_json_output(expected_str)
    predicted_json = parse_json_output(predicted_str)

    # Check JSON validity
    json_valid = predicted_json is not None

    # Check tool match
    tool_match = False
    if expected_json and predicted_json:
        expected_tool = expected_json.get("tool")
        predicted_tool = predicted_json.get("tool")
        tool_match = expected_tool == predicted_tool

    # Calculate coordinate error
    coord_error = None
    if expected_json and predicted_json:
        coord_error = compare_coordinates(expected_json, predicted_json)

    # Check exact match
    exact_match = expected_str.strip() == predicted_str.strip()

    return EvalResult(
        instruction=instruction,
        expected=expected_str,
        predicted=predicted_str,
        tool_match=tool_match,
        json_valid=json_valid,
        coord_error=coord_error,
        exact_match=exact_match,
    )


def print_results(results: list[EvalResult], output_file: Optional[str] = None):
    """Print evaluation results."""

    # Calculate metrics
    total = len(results)
    tool_correct = sum(1 for r in results if r.tool_match)
    json_valid = sum(1 for r in results if r.json_valid)
    exact_matches = sum(1 for r in results if r.exact_match)

    coord_errors = [r.coord_error for r in results if r.coord_error is not None]
    avg_coord_error = sum(coord_errors) / len(coord_errors) if coord_errors else None

    # Tool accuracy breakdown
    tool_stats = defaultdict(lambda: {"total": 0, "correct": 0})
    for r in results:
        expected_json = parse_json_output(r.expected)
        if expected_json:
            tool = expected_json.get("tool", "unknown")
            tool_stats[tool]["total"] += 1
            if r.tool_match:
                tool_stats[tool]["correct"] += 1

    # Print summary table
    table = Table(title="Cesium SLM Evaluation Results")
    table.add_column("Metric", style="cyan")
    table.add_column("Value", style="green")
    table.add_column("Percentage", style="yellow")

    table.add_row("Total Examples", str(total), "")
    table.add_row("Tool Accuracy", str(tool_correct), f"{100*tool_correct/total:.1f}%")
    table.add_row("JSON Valid", str(json_valid), f"{100*json_valid/total:.1f}%")
    table.add_row("Exact Match", str(exact_matches), f"{100*exact_matches/total:.1f}%")

    if avg_coord_error is not None:
        table.add_row("Avg Coord Error", f"{avg_coord_error:.4f}°", "")

    console.print(table)

    # Print per-tool accuracy
    tool_table = Table(title="Per-Tool Accuracy")
    tool_table.add_column("Tool", style="cyan")
    tool_table.add_column("Correct", style="green")
    tool_table.add_column("Total", style="yellow")
    tool_table.add_column("Accuracy", style="magenta")

    for tool, stats in sorted(tool_stats.items()):
        acc = 100 * stats["correct"] / stats["total"] if stats["total"] > 0 else 0
        tool_table.add_row(
            tool,
            str(stats["correct"]),
            str(stats["total"]),
            f"{acc:.1f}%"
        )

    console.print(tool_table)

    # Save detailed results
    if output_file:
        output_data = {
            "summary": {
                "total": total,
                "tool_accuracy": tool_correct / total if total > 0 else 0,
                "json_valid_rate": json_valid / total if total > 0 else 0,
                "exact_match_rate": exact_matches / total if total > 0 else 0,
                "avg_coord_error": avg_coord_error,
            },
            "per_tool": {
                tool: {
                    "accuracy": stats["correct"] / stats["total"] if stats["total"] > 0 else 0,
                    **stats
                }
                for tool, stats in tool_stats.items()
            },
            "examples": [
                {
                    "instruction": r.instruction,
                    "expected": r.expected,
                    "predicted": r.predicted,
                    "tool_match": r.tool_match,
                    "json_valid": r.json_valid,
                    "coord_error": r.coord_error,
                    "exact_match": r.exact_match,
                }
                for r in results
            ]
        }

        with open(output_file, "w") as f:
            json.dump(output_data, f, indent=2)

        console.print(f"\nDetailed results saved to: {output_file}")


def main():
    parser = argparse.ArgumentParser(description="Evaluate Cesium SLM model")

    parser.add_argument("--model", type=str, required=True,
                       help="Path to model or LoRA adapter")
    parser.add_argument("--base-model", type=str, default=None,
                       help="Base model (required if loading LoRA adapter)")
    parser.add_argument("--test-file", type=str, required=True,
                       help="Path to test JSONL file")
    parser.add_argument("--output", type=str, default=None,
                       help="Path to save detailed results JSON")
    parser.add_argument("--max-samples", type=int, default=None,
                       help="Maximum number of samples to evaluate")
    parser.add_argument("--use-4bit", action="store_true",
                       help="Load model in 4-bit quantization")
    parser.add_argument("--temperature", type=float, default=0.1,
                       help="Generation temperature")

    args = parser.parse_args()

    # Load model
    model, tokenizer = load_model(
        args.model,
        base_model=args.base_model,
        use_4bit=args.use_4bit,
    )
    model.eval()

    # Load test data
    console.print(f"Loading test data: {args.test_file}")
    test_data = load_dataset("json", data_files=args.test_file, split="train")

    if args.max_samples:
        test_data = test_data.select(range(min(args.max_samples, len(test_data))))

    console.print(f"Evaluating on {len(test_data)} examples...")

    # Evaluate
    results = []
    for example in tqdm(test_data, desc="Evaluating"):
        instruction = example["instruction"]
        expected = example["output"]

        predicted = generate_response(
            model, tokenizer, instruction,
            temperature=args.temperature,
        )

        result = evaluate_sample(expected, predicted, instruction)
        results.append(result)

    # Print results
    print_results(results, args.output)


if __name__ == "__main__":
    main()
