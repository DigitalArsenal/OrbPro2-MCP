#!/usr/bin/env python3
"""
Fine-tune a small language model for CesiumJS commands using LoRA.

Requirements:
    pip install transformers peft datasets accelerate torch

Usage:
    python finetune_lora.py --model_name Qwen/Qwen2.5-0.5B-Instruct --num_epochs 3
"""

import argparse
import json
import os
from pathlib import Path

import torch
from datasets import Dataset
from peft import LoraConfig, get_peft_model, TaskType
from transformers import (
    AutoModelForCausalLM,
    AutoTokenizer,
    TrainingArguments,
    Trainer,
    DataCollatorForLanguageModeling,
)


def load_dataset(file_path: str) -> Dataset:
    """Load the JSONL training dataset."""
    data = []
    with open(file_path, 'r') as f:
        for line in f:
            item = json.loads(line.strip())
            data.append(item)
    return Dataset.from_list(data)


def format_prompt(instruction: str, output: str = None) -> str:
    """Format the prompt for training."""
    prompt = f"""You are a CesiumJS controller assistant. Convert natural language commands to tool calls.

### Instruction:
{instruction}

### Response:
"""
    if output:
        prompt += output
    return prompt


def preprocess_function(examples, tokenizer, max_length=512):
    """Tokenize the examples."""
    prompts = [
        format_prompt(inst, out)
        for inst, out in zip(examples['instruction'], examples['output'])
    ]

    tokenized = tokenizer(
        prompts,
        truncation=True,
        max_length=max_length,
        padding='max_length',
        return_tensors='pt'
    )

    # Set labels equal to input_ids for causal LM training
    tokenized['labels'] = tokenized['input_ids'].clone()

    return tokenized


def main():
    parser = argparse.ArgumentParser(description='Fine-tune LLM for CesiumJS commands')
    parser.add_argument('--model_name', type=str, default='Qwen/Qwen2.5-0.5B-Instruct',
                       help='Base model name or path')
    parser.add_argument('--dataset', type=str, default='cesium-commands-dataset.jsonl',
                       help='Path to training dataset')
    parser.add_argument('--output_dir', type=str, default='./cesium-slm-lora',
                       help='Output directory for fine-tuned model')
    parser.add_argument('--num_epochs', type=int, default=3,
                       help='Number of training epochs')
    parser.add_argument('--batch_size', type=int, default=4,
                       help='Training batch size')
    parser.add_argument('--learning_rate', type=float, default=2e-5,
                       help='Learning rate')
    parser.add_argument('--lora_r', type=int, default=16,
                       help='LoRA rank')
    parser.add_argument('--lora_alpha', type=int, default=32,
                       help='LoRA alpha')
    parser.add_argument('--max_length', type=int, default=512,
                       help='Maximum sequence length')
    args = parser.parse_args()

    print(f"Loading model: {args.model_name}")

    # Load tokenizer
    tokenizer = AutoTokenizer.from_pretrained(args.model_name, trust_remote_code=True)
    if tokenizer.pad_token is None:
        tokenizer.pad_token = tokenizer.eos_token

    # Load model
    model = AutoModelForCausalLM.from_pretrained(
        args.model_name,
        torch_dtype=torch.float16 if torch.cuda.is_available() else torch.float32,
        device_map='auto' if torch.cuda.is_available() else None,
        trust_remote_code=True,
    )

    # Configure LoRA
    lora_config = LoraConfig(
        r=args.lora_r,
        lora_alpha=args.lora_alpha,
        lora_dropout=0.05,
        target_modules=['q_proj', 'k_proj', 'v_proj', 'o_proj', 'gate_proj', 'up_proj', 'down_proj'],
        bias='none',
        task_type=TaskType.CAUSAL_LM,
    )

    # Apply LoRA
    model = get_peft_model(model, lora_config)
    model.print_trainable_parameters()

    # Load and preprocess dataset
    print(f"Loading dataset: {args.dataset}")
    dataset = load_dataset(args.dataset)

    # Split into train/eval
    split_dataset = dataset.train_test_split(test_size=0.1, seed=42)
    train_dataset = split_dataset['train']
    eval_dataset = split_dataset['test']

    # Tokenize
    def tokenize_fn(examples):
        return preprocess_function(examples, tokenizer, args.max_length)

    train_dataset = train_dataset.map(
        tokenize_fn,
        batched=True,
        remove_columns=train_dataset.column_names
    )
    eval_dataset = eval_dataset.map(
        tokenize_fn,
        batched=True,
        remove_columns=eval_dataset.column_names
    )

    # Set format for PyTorch
    train_dataset.set_format('torch')
    eval_dataset.set_format('torch')

    # Training arguments
    training_args = TrainingArguments(
        output_dir=args.output_dir,
        num_train_epochs=args.num_epochs,
        per_device_train_batch_size=args.batch_size,
        per_device_eval_batch_size=args.batch_size,
        gradient_accumulation_steps=4,
        learning_rate=args.learning_rate,
        weight_decay=0.01,
        warmup_ratio=0.1,
        lr_scheduler_type='cosine',
        logging_steps=10,
        eval_strategy='epoch',
        save_strategy='epoch',
        load_best_model_at_end=True,
        fp16=torch.cuda.is_available(),
        report_to='none',
    )

    # Data collator
    data_collator = DataCollatorForLanguageModeling(
        tokenizer=tokenizer,
        mlm=False,
    )

    # Trainer
    trainer = Trainer(
        model=model,
        args=training_args,
        train_dataset=train_dataset,
        eval_dataset=eval_dataset,
        data_collator=data_collator,
    )

    # Train
    print("Starting training...")
    trainer.train()

    # Save
    print(f"Saving model to {args.output_dir}")
    trainer.save_model()
    tokenizer.save_pretrained(args.output_dir)

    # Merge LoRA weights for deployment
    merged_dir = os.path.join(args.output_dir, 'merged')
    print(f"Merging LoRA weights to {merged_dir}")
    merged_model = model.merge_and_unload()
    merged_model.save_pretrained(merged_dir)
    tokenizer.save_pretrained(merged_dir)

    print("Training complete!")
    print(f"\nTo convert for WebGPU, run:")
    print(f"  mlc_llm compile --model {merged_dir} --quantization q4f16_1 --target webgpu")


if __name__ == '__main__':
    main()
