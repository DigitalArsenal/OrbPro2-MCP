#!/usr/bin/env python3
"""
Data Preparation Script for Cesium SLM Fine-tuning

Converts JSONL training data to format suitable for instruction tuning.
Supports multiple output formats: HuggingFace datasets, alpaca, sharegpt.
"""

import argparse
import json
import os
import random
from pathlib import Path
from typing import Optional

import jsonlines
from datasets import Dataset, DatasetDict


def load_jsonl(file_path: str) -> list[dict]:
    """Load JSONL file into list of dicts."""
    data = []
    with jsonlines.open(file_path) as reader:
        for obj in reader:
            data.append(obj)
    return data


def convert_to_alpaca_format(examples: list[dict]) -> list[dict]:
    """
    Convert to Alpaca instruction format.

    Output format:
    {
        "instruction": "...",
        "input": "",
        "output": "..."
    }
    """
    converted = []
    for ex in examples:
        converted.append({
            "instruction": ex.get("instruction", ""),
            "input": ex.get("input", ""),
            "output": ex.get("output", "")
        })
    return converted


def convert_to_sharegpt_format(examples: list[dict]) -> list[dict]:
    """
    Convert to ShareGPT conversation format.

    Output format:
    {
        "conversations": [
            {"from": "human", "value": "..."},
            {"from": "gpt", "value": "..."}
        ]
    }
    """
    converted = []
    for ex in examples:
        instruction = ex.get("instruction", "")
        input_text = ex.get("input", "")
        output = ex.get("output", "")

        # Combine instruction and input if both present
        human_msg = instruction
        if input_text:
            human_msg = f"{instruction}\n\nInput: {input_text}"

        converted.append({
            "conversations": [
                {"from": "human", "value": human_msg},
                {"from": "gpt", "value": output}
            ]
        })
    return converted


def convert_to_messages_format(examples: list[dict], system_prompt: str = "") -> list[dict]:
    """
    Convert to OpenAI messages format for chat fine-tuning.

    Output format:
    {
        "messages": [
            {"role": "system", "content": "..."},
            {"role": "user", "content": "..."},
            {"role": "assistant", "content": "..."}
        ]
    }
    """
    converted = []
    for ex in examples:
        instruction = ex.get("instruction", "")
        input_text = ex.get("input", "")
        output = ex.get("output", "")

        # Build user message
        user_msg = instruction
        if input_text:
            user_msg = f"{instruction}\n\nInput: {input_text}"

        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": user_msg})
        messages.append({"role": "assistant", "content": output})

        converted.append({"messages": messages})
    return converted


def create_train_test_split(
    data: list[dict],
    test_size: float = 0.1,
    seed: int = 42
) -> tuple[list[dict], list[dict]]:
    """Split data into train and test sets."""
    random.seed(seed)
    shuffled = data.copy()
    random.shuffle(shuffled)

    split_idx = int(len(shuffled) * (1 - test_size))
    return shuffled[:split_idx], shuffled[split_idx:]


def save_jsonl(data: list[dict], output_path: str):
    """Save data to JSONL file."""
    with jsonlines.open(output_path, mode='w') as writer:
        for item in data:
            writer.write(item)
    print(f"Saved {len(data)} examples to {output_path}")


def save_as_hf_dataset(
    train_data: list[dict],
    test_data: list[dict],
    output_dir: str
):
    """Save as HuggingFace dataset format."""
    train_dataset = Dataset.from_list(train_data)
    test_dataset = Dataset.from_list(test_data)

    dataset_dict = DatasetDict({
        "train": train_dataset,
        "test": test_dataset
    })

    dataset_dict.save_to_disk(output_dir)
    print(f"Saved HuggingFace dataset to {output_dir}")


def main():
    parser = argparse.ArgumentParser(
        description="Prepare training data for Cesium SLM fine-tuning"
    )
    parser.add_argument(
        "--input", "-i",
        type=str,
        required=True,
        help="Input JSONL file or directory containing JSONL files"
    )
    parser.add_argument(
        "--output", "-o",
        type=str,
        required=True,
        help="Output directory for processed data"
    )
    parser.add_argument(
        "--format", "-f",
        type=str,
        choices=["alpaca", "sharegpt", "messages", "all"],
        default="alpaca",
        help="Output format (default: alpaca)"
    )
    parser.add_argument(
        "--test-size",
        type=float,
        default=0.1,
        help="Fraction of data to use for test set (default: 0.1)"
    )
    parser.add_argument(
        "--system-prompt",
        type=str,
        default="",
        help="System prompt for messages format"
    )
    parser.add_argument(
        "--hf-dataset",
        action="store_true",
        help="Also save as HuggingFace dataset format"
    )
    parser.add_argument(
        "--seed",
        type=int,
        default=42,
        help="Random seed for train/test split"
    )

    args = parser.parse_args()

    # Load data
    input_path = Path(args.input)
    all_data = []

    if input_path.is_file():
        all_data = load_jsonl(str(input_path))
    elif input_path.is_dir():
        for jsonl_file in input_path.glob("*.jsonl"):
            all_data.extend(load_jsonl(str(jsonl_file)))
    else:
        raise FileNotFoundError(f"Input path not found: {args.input}")

    print(f"Loaded {len(all_data)} examples from {args.input}")

    # Create output directory
    output_dir = Path(args.output)
    output_dir.mkdir(parents=True, exist_ok=True)

    # Split data
    train_data, test_data = create_train_test_split(
        all_data,
        test_size=args.test_size,
        seed=args.seed
    )
    print(f"Split into {len(train_data)} train / {len(test_data)} test examples")

    # Convert and save based on format
    formats_to_save = [args.format] if args.format != "all" else ["alpaca", "sharegpt", "messages"]

    for fmt in formats_to_save:
        if fmt == "alpaca":
            train_converted = convert_to_alpaca_format(train_data)
            test_converted = convert_to_alpaca_format(test_data)
        elif fmt == "sharegpt":
            train_converted = convert_to_sharegpt_format(train_data)
            test_converted = convert_to_sharegpt_format(test_data)
        elif fmt == "messages":
            train_converted = convert_to_messages_format(train_data, args.system_prompt)
            test_converted = convert_to_messages_format(test_data, args.system_prompt)
        else:
            continue

        # Save JSONL files
        save_jsonl(train_converted, str(output_dir / f"train_{fmt}.jsonl"))
        save_jsonl(test_converted, str(output_dir / f"test_{fmt}.jsonl"))

        # Optionally save as HuggingFace dataset
        if args.hf_dataset:
            save_as_hf_dataset(
                train_converted,
                test_converted,
                str(output_dir / f"hf_dataset_{fmt}")
            )

    # Print sample
    print("\n--- Sample training example (alpaca format) ---")
    sample = convert_to_alpaca_format([all_data[0]])[0]
    print(json.dumps(sample, indent=2))

    print("\nData preparation complete!")


if __name__ == "__main__":
    main()
