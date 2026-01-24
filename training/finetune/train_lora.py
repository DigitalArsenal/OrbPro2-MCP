#!/usr/bin/env python3
"""
LoRA Fine-tuning Script for Cesium SLM

Fine-tunes Qwen2.5 or SmolLM models using LoRA for efficient training.
Optimized for instruction-following on CesiumJS commands.
"""

import argparse
import json
import os
from dataclasses import dataclass, field
from pathlib import Path
from typing import Optional

import torch
from datasets import load_dataset, load_from_disk
from peft import LoraConfig, TaskType, get_peft_model, prepare_model_for_kbit_training
from transformers import (
    AutoModelForCausalLM,
    AutoTokenizer,
    BitsAndBytesConfig,
    DataCollatorForSeq2Seq,
    Trainer,
    TrainingArguments,
)


@dataclass
class ModelArguments:
    model_name_or_path: str = field(
        default="Qwen/Qwen2.5-0.5B-Instruct",
        metadata={"help": "Path to pretrained model or model identifier from huggingface.co/models"}
    )
    trust_remote_code: bool = field(
        default=True,
        metadata={"help": "Whether to trust remote code when loading model"}
    )


@dataclass
class DataArguments:
    train_file: str = field(
        default=None,
        metadata={"help": "Path to training data (JSONL or HuggingFace dataset)"}
    )
    eval_file: str = field(
        default=None,
        metadata={"help": "Path to evaluation data"}
    )
    max_length: int = field(
        default=512,
        metadata={"help": "Maximum sequence length"}
    )
    prompt_template: str = field(
        default="alpaca",
        metadata={"help": "Prompt template format: alpaca, sharegpt, or chatml"}
    )


@dataclass
class LoraArguments:
    lora_r: int = field(
        default=16,
        metadata={"help": "LoRA attention dimension (rank)"}
    )
    lora_alpha: int = field(
        default=32,
        metadata={"help": "LoRA alpha scaling factor"}
    )
    lora_dropout: float = field(
        default=0.05,
        metadata={"help": "LoRA dropout probability"}
    )
    target_modules: str = field(
        default="q_proj,k_proj,v_proj,o_proj,gate_proj,up_proj,down_proj",
        metadata={"help": "Comma-separated list of target modules for LoRA"}
    )


def get_prompt_template(template_name: str):
    """Return prompt formatting functions based on template type."""

    if template_name == "alpaca":
        def format_prompt(instruction: str, input_text: str = "", output: str = "") -> str:
            if input_text:
                prompt = f"""Below is an instruction that describes a task, paired with an input that provides further context. Write a response that appropriately completes the request.

### Instruction:
{instruction}

### Input:
{input_text}

### Response:
{output}"""
            else:
                prompt = f"""Below is an instruction that describes a task. Write a response that appropriately completes the request.

### Instruction:
{instruction}

### Response:
{output}"""
            return prompt
        return format_prompt

    elif template_name == "chatml":
        def format_prompt(instruction: str, input_text: str = "", output: str = "") -> str:
            user_content = instruction
            if input_text:
                user_content = f"{instruction}\n\nInput: {input_text}"
            return f"""<|im_start|>system
You are a helpful assistant that controls CesiumJS. Convert natural language commands to JSON tool calls.<|im_end|>
<|im_start|>user
{user_content}<|im_end|>
<|im_start|>assistant
{output}<|im_end|>"""
        return format_prompt

    else:  # sharegpt / default
        def format_prompt(instruction: str, input_text: str = "", output: str = "") -> str:
            user_content = instruction
            if input_text:
                user_content = f"{instruction}\n\nInput: {input_text}"
            return f"User: {user_content}\nAssistant: {output}"
        return format_prompt


def preprocess_data(examples, tokenizer, max_length: int, format_prompt):
    """Tokenize and prepare data for training."""

    texts = []
    for instruction, input_text, output in zip(
        examples.get("instruction", []),
        examples.get("input", [""] * len(examples.get("instruction", []))),
        examples.get("output", [])
    ):
        text = format_prompt(instruction, input_text, output)
        texts.append(text)

    tokenized = tokenizer(
        texts,
        truncation=True,
        max_length=max_length,
        padding=False,
        return_tensors=None,
    )

    # Set labels = input_ids for causal LM training
    tokenized["labels"] = tokenized["input_ids"].copy()

    return tokenized


def main():
    parser = argparse.ArgumentParser(description="Fine-tune LLM with LoRA for Cesium SLM")

    # Model arguments
    parser.add_argument("--model", type=str, default="Qwen/Qwen2.5-0.5B-Instruct")
    parser.add_argument("--trust-remote-code", action="store_true", default=True)

    # Data arguments
    parser.add_argument("--train-file", type=str, required=True)
    parser.add_argument("--eval-file", type=str, default=None)
    parser.add_argument("--max-length", type=int, default=512)
    parser.add_argument("--template", type=str, default="chatml", choices=["alpaca", "chatml", "sharegpt"])

    # LoRA arguments
    parser.add_argument("--lora-r", type=int, default=16)
    parser.add_argument("--lora-alpha", type=int, default=32)
    parser.add_argument("--lora-dropout", type=float, default=0.05)
    parser.add_argument("--target-modules", type=str,
                       default="q_proj,k_proj,v_proj,o_proj,gate_proj,up_proj,down_proj")

    # Training arguments
    parser.add_argument("--output-dir", type=str, default="./outputs/cesium-slm-lora")
    parser.add_argument("--epochs", type=int, default=3)
    parser.add_argument("--batch-size", type=int, default=4)
    parser.add_argument("--gradient-accumulation", type=int, default=4)
    parser.add_argument("--learning-rate", type=float, default=2e-4)
    parser.add_argument("--warmup-ratio", type=float, default=0.1)
    parser.add_argument("--weight-decay", type=float, default=0.01)
    parser.add_argument("--max-grad-norm", type=float, default=1.0)
    parser.add_argument("--fp16", action="store_true")
    parser.add_argument("--bf16", action="store_true")
    parser.add_argument("--logging-steps", type=int, default=10)
    parser.add_argument("--save-steps", type=int, default=500)
    parser.add_argument("--eval-steps", type=int, default=500)
    parser.add_argument("--seed", type=int, default=42)

    # Quantization
    parser.add_argument("--load-in-8bit", action="store_true")
    parser.add_argument("--load-in-4bit", action="store_true")

    args = parser.parse_args()

    print(f"Loading model: {args.model}")

    # Setup quantization config if needed
    quantization_config = None
    if args.load_in_4bit:
        quantization_config = BitsAndBytesConfig(
            load_in_4bit=True,
            bnb_4bit_quant_type="nf4",
            bnb_4bit_compute_dtype=torch.bfloat16 if args.bf16 else torch.float16,
            bnb_4bit_use_double_quant=True,
        )
    elif args.load_in_8bit:
        quantization_config = BitsAndBytesConfig(load_in_8bit=True)

    # Load tokenizer
    tokenizer = AutoTokenizer.from_pretrained(
        args.model,
        trust_remote_code=args.trust_remote_code,
        padding_side="right",
    )

    if tokenizer.pad_token is None:
        tokenizer.pad_token = tokenizer.eos_token

    # Load model
    model = AutoModelForCausalLM.from_pretrained(
        args.model,
        trust_remote_code=args.trust_remote_code,
        quantization_config=quantization_config,
        device_map="auto" if quantization_config else None,
        torch_dtype=torch.bfloat16 if args.bf16 else (torch.float16 if args.fp16 else torch.float32),
    )

    # Prepare model for k-bit training if using quantization
    if quantization_config:
        model = prepare_model_for_kbit_training(model)

    # Configure LoRA
    target_modules = [m.strip() for m in args.target_modules.split(",")]

    lora_config = LoraConfig(
        task_type=TaskType.CAUSAL_LM,
        r=args.lora_r,
        lora_alpha=args.lora_alpha,
        lora_dropout=args.lora_dropout,
        target_modules=target_modules,
        bias="none",
    )

    model = get_peft_model(model, lora_config)
    model.print_trainable_parameters()

    # Load dataset
    print(f"Loading training data from: {args.train_file}")

    train_path = Path(args.train_file)
    if train_path.is_dir():
        # HuggingFace dataset format
        train_dataset = load_from_disk(str(train_path))
        if "train" in train_dataset:
            train_dataset = train_dataset["train"]
    elif str(train_path).endswith(".jsonl"):
        train_dataset = load_dataset("json", data_files=str(train_path), split="train")
    else:
        raise ValueError(f"Unsupported data format: {args.train_file}")

    eval_dataset = None
    if args.eval_file:
        eval_path = Path(args.eval_file)
        if eval_path.is_dir():
            eval_dataset = load_from_disk(str(eval_path))
            if "test" in eval_dataset:
                eval_dataset = eval_dataset["test"]
        elif str(eval_path).endswith(".jsonl"):
            eval_dataset = load_dataset("json", data_files=str(eval_path), split="train")

    # Get prompt template
    format_prompt = get_prompt_template(args.template)

    # Preprocess data
    print("Preprocessing training data...")
    train_dataset = train_dataset.map(
        lambda x: preprocess_data(x, tokenizer, args.max_length, format_prompt),
        batched=True,
        remove_columns=train_dataset.column_names,
    )

    if eval_dataset:
        print("Preprocessing evaluation data...")
        eval_dataset = eval_dataset.map(
            lambda x: preprocess_data(x, tokenizer, args.max_length, format_prompt),
            batched=True,
            remove_columns=eval_dataset.column_names,
        )

    # Data collator
    data_collator = DataCollatorForSeq2Seq(
        tokenizer=tokenizer,
        model=model,
        padding=True,
        return_tensors="pt",
    )

    # Training arguments
    training_args = TrainingArguments(
        output_dir=args.output_dir,
        num_train_epochs=args.epochs,
        per_device_train_batch_size=args.batch_size,
        per_device_eval_batch_size=args.batch_size,
        gradient_accumulation_steps=args.gradient_accumulation,
        learning_rate=args.learning_rate,
        warmup_ratio=args.warmup_ratio,
        weight_decay=args.weight_decay,
        max_grad_norm=args.max_grad_norm,
        fp16=args.fp16,
        bf16=args.bf16,
        logging_steps=args.logging_steps,
        save_steps=args.save_steps,
        eval_steps=args.eval_steps if eval_dataset else None,
        evaluation_strategy="steps" if eval_dataset else "no",
        save_total_limit=3,
        load_best_model_at_end=True if eval_dataset else False,
        report_to="tensorboard",
        seed=args.seed,
        remove_unused_columns=False,
    )

    # Initialize trainer
    trainer = Trainer(
        model=model,
        args=training_args,
        train_dataset=train_dataset,
        eval_dataset=eval_dataset,
        tokenizer=tokenizer,
        data_collator=data_collator,
    )

    # Train
    print("Starting training...")
    trainer.train()

    # Save final model
    print(f"Saving model to {args.output_dir}")
    trainer.save_model()
    tokenizer.save_pretrained(args.output_dir)

    # Save training config
    config = {
        "model": args.model,
        "lora_r": args.lora_r,
        "lora_alpha": args.lora_alpha,
        "lora_dropout": args.lora_dropout,
        "target_modules": target_modules,
        "max_length": args.max_length,
        "template": args.template,
        "epochs": args.epochs,
        "learning_rate": args.learning_rate,
    }

    with open(os.path.join(args.output_dir, "training_config.json"), "w") as f:
        json.dump(config, f, indent=2)

    print("Training complete!")


if __name__ == "__main__":
    main()
