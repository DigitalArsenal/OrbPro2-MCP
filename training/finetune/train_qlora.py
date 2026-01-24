#!/usr/bin/env python3
"""
QLoRA Fine-tuning Script for Cesium SLM

Memory-efficient fine-tuning using 4-bit quantization with LoRA.
Suitable for training on consumer GPUs with limited VRAM.
"""

import argparse
import json
import os
from pathlib import Path

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
from trl import SFTTrainer


def get_chatml_template():
    """Return ChatML format template for Qwen models."""
    system_prompt = """You are an AI assistant that controls CesiumJS. Your task is to convert natural language commands into JSON tool calls. Always respond with valid JSON containing a "tool" field and an "arguments" field."""

    def format_example(instruction: str, output: str) -> str:
        return f"""<|im_start|>system
{system_prompt}<|im_end|>
<|im_start|>user
{instruction}<|im_end|>
<|im_start|>assistant
{output}<|im_end|>"""

    return format_example


def formatting_prompts_func(examples):
    """Format examples for SFTTrainer."""
    format_fn = get_chatml_template()

    texts = []
    for instruction, output in zip(examples["instruction"], examples["output"]):
        text = format_fn(instruction, output)
        texts.append(text)

    return {"text": texts}


def main():
    parser = argparse.ArgumentParser(description="QLoRA fine-tuning for Cesium SLM")

    # Model arguments
    parser.add_argument("--model", type=str, default="Qwen/Qwen2.5-0.5B-Instruct",
                       help="Base model to fine-tune")

    # Data arguments
    parser.add_argument("--train-file", type=str, required=True,
                       help="Path to training JSONL file")
    parser.add_argument("--eval-file", type=str, default=None,
                       help="Path to evaluation JSONL file")
    parser.add_argument("--max-length", type=int, default=512,
                       help="Maximum sequence length")

    # QLoRA arguments
    parser.add_argument("--lora-r", type=int, default=64,
                       help="LoRA rank (higher for QLoRA)")
    parser.add_argument("--lora-alpha", type=int, default=16,
                       help="LoRA alpha")
    parser.add_argument("--lora-dropout", type=float, default=0.1,
                       help="LoRA dropout")

    # Training arguments
    parser.add_argument("--output-dir", type=str, default="./outputs/cesium-slm-qlora")
    parser.add_argument("--epochs", type=int, default=3)
    parser.add_argument("--batch-size", type=int, default=4)
    parser.add_argument("--gradient-accumulation", type=int, default=4)
    parser.add_argument("--learning-rate", type=float, default=2e-4)
    parser.add_argument("--warmup-ratio", type=float, default=0.03)
    parser.add_argument("--max-grad-norm", type=float, default=0.3)
    parser.add_argument("--logging-steps", type=int, default=25)
    parser.add_argument("--save-steps", type=int, default=500)
    parser.add_argument("--seed", type=int, default=42)

    args = parser.parse_args()

    print(f"Loading model: {args.model}")
    print(f"Using QLoRA with r={args.lora_r}, alpha={args.lora_alpha}")

    # 4-bit quantization config
    bnb_config = BitsAndBytesConfig(
        load_in_4bit=True,
        bnb_4bit_quant_type="nf4",
        bnb_4bit_compute_dtype=torch.bfloat16,
        bnb_4bit_use_double_quant=True,
    )

    # Load tokenizer
    tokenizer = AutoTokenizer.from_pretrained(
        args.model,
        trust_remote_code=True,
        padding_side="right",
    )

    if tokenizer.pad_token is None:
        tokenizer.pad_token = tokenizer.eos_token

    # Load model with 4-bit quantization
    model = AutoModelForCausalLM.from_pretrained(
        args.model,
        trust_remote_code=True,
        quantization_config=bnb_config,
        device_map="auto",
        torch_dtype=torch.bfloat16,
    )

    # Prepare for k-bit training
    model = prepare_model_for_kbit_training(model)

    # LoRA config (higher rank for QLoRA)
    lora_config = LoraConfig(
        task_type=TaskType.CAUSAL_LM,
        r=args.lora_r,
        lora_alpha=args.lora_alpha,
        lora_dropout=args.lora_dropout,
        target_modules=[
            "q_proj", "k_proj", "v_proj", "o_proj",
            "gate_proj", "up_proj", "down_proj",
        ],
        bias="none",
    )

    # Apply LoRA
    model = get_peft_model(model, lora_config)
    model.print_trainable_parameters()

    # Load datasets
    print(f"Loading training data: {args.train_file}")

    train_path = Path(args.train_file)
    if str(train_path).endswith(".jsonl"):
        train_dataset = load_dataset("json", data_files=str(train_path), split="train")
    else:
        train_dataset = load_from_disk(str(train_path))
        if hasattr(train_dataset, "keys") and "train" in train_dataset:
            train_dataset = train_dataset["train"]

    eval_dataset = None
    if args.eval_file:
        eval_path = Path(args.eval_file)
        if str(eval_path).endswith(".jsonl"):
            eval_dataset = load_dataset("json", data_files=str(eval_path), split="train")
        else:
            eval_dataset = load_from_disk(str(eval_path))
            if hasattr(eval_dataset, "keys") and "test" in eval_dataset:
                eval_dataset = eval_dataset["test"]

    # Apply formatting
    train_dataset = train_dataset.map(
        formatting_prompts_func,
        batched=True,
        remove_columns=train_dataset.column_names,
    )

    if eval_dataset:
        eval_dataset = eval_dataset.map(
            formatting_prompts_func,
            batched=True,
            remove_columns=eval_dataset.column_names,
        )

    print(f"Training examples: {len(train_dataset)}")
    if eval_dataset:
        print(f"Evaluation examples: {len(eval_dataset)}")

    # Training arguments optimized for QLoRA
    training_args = TrainingArguments(
        output_dir=args.output_dir,
        num_train_epochs=args.epochs,
        per_device_train_batch_size=args.batch_size,
        per_device_eval_batch_size=args.batch_size,
        gradient_accumulation_steps=args.gradient_accumulation,
        learning_rate=args.learning_rate,
        warmup_ratio=args.warmup_ratio,
        max_grad_norm=args.max_grad_norm,
        bf16=True,
        logging_steps=args.logging_steps,
        save_steps=args.save_steps,
        evaluation_strategy="steps" if eval_dataset else "no",
        eval_steps=args.save_steps if eval_dataset else None,
        save_total_limit=3,
        optim="paged_adamw_32bit",
        lr_scheduler_type="cosine",
        report_to="tensorboard",
        seed=args.seed,
        gradient_checkpointing=True,
        gradient_checkpointing_kwargs={"use_reentrant": False},
    )

    # Data collator
    data_collator = DataCollatorForSeq2Seq(
        tokenizer=tokenizer,
        model=model,
        padding=True,
        return_tensors="pt",
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
    print("Starting QLoRA training...")
    trainer.train()

    # Save model
    print(f"Saving model to {args.output_dir}")
    trainer.save_model()
    tokenizer.save_pretrained(args.output_dir)

    # Save config
    config = {
        "model": args.model,
        "method": "qlora",
        "lora_r": args.lora_r,
        "lora_alpha": args.lora_alpha,
        "lora_dropout": args.lora_dropout,
        "max_length": args.max_length,
        "epochs": args.epochs,
        "learning_rate": args.learning_rate,
        "batch_size": args.batch_size * args.gradient_accumulation,
    }

    with open(os.path.join(args.output_dir, "training_config.json"), "w") as f:
        json.dump(config, f, indent=2)

    print("QLoRA training complete!")


if __name__ == "__main__":
    main()
