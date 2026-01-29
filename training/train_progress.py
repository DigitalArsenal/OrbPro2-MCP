#!/usr/bin/env python3
"""
Wrapper for MLX training with clean progress output.
Clears terminal and shows only: Training header + status + progress bar.
"""

import sys
import re
import subprocess
import shutil
import os

def get_terminal_width():
    return shutil.get_terminal_size().columns

def create_progress_bar(current, total, width=50):
    if total == 0:
        return "[" + "░" * width + "]   0.0%"
    filled = int(width * current / total)
    bar = '█' * filled + '░' * (width - filled)
    percent = current / total * 100
    return f"[{bar}] {percent:5.1f}%"

def clear_screen():
    """Clear terminal and move cursor to top."""
    sys.stdout.write('\033[2J')  # Clear entire screen
    sys.stdout.write('\033[H')   # Move cursor to home
    sys.stdout.flush()

def move_to_top():
    """Move cursor to home position."""
    sys.stdout.write('\033[H')
    sys.stdout.flush()

def render(status, progress, term_width):
    """Render the display (header + status + progress)."""
    move_to_top()

    # Clear and print header
    print('\033[K' + '\033[1;33mTraining\033[0m')  # Yellow bold
    print('\033[K')  # Empty line

    # Truncate status if needed
    if len(status) > term_width - 2:
        status = status[:term_width - 5] + "..."

    print('\033[K' + status)
    print('\033[K' + progress)

    # Clear any leftover lines below
    print('\033[K')

    sys.stdout.flush()

def main():
    if len(sys.argv) < 3:
        print("Usage: train_progress.py <total_iters> <command...>")
        sys.exit(1)

    total_iters = int(sys.argv[1])
    cmd = sys.argv[2:]

    # Track state
    current_iter = 0
    train_loss = 0.0
    val_loss = 0.0
    tokens_per_sec = 0.0
    peak_mem = 0.0
    saved = False

    # Regex patterns for MLX output
    iter_pattern = re.compile(r'Iter (\d+): Train loss ([\d.]+).*It/sec ([\d.]+).*Tokens/sec ([\d.]+).*Peak mem ([\d.]+)')
    val_pattern = re.compile(r'Iter \d+: Val loss ([\d.]+)')
    save_pattern = re.compile(r'Saved adapter weights')

    process = subprocess.Popen(
        cmd,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        bufsize=1
    )

    term_width = get_terminal_width()

    # Clear screen and show initial state
    clear_screen()

    # Initial render
    bar_width = min(50, term_width - 20)
    status = f"iter:0/{total_iters} | loss:-.--- | 0 tok/s | 0.0GB"
    progress = create_progress_bar(0, total_iters, bar_width)
    render(status, progress, term_width)

    try:
        for line in process.stdout:
            line = line.strip()

            # Parse iteration info
            iter_match = iter_pattern.search(line)
            if iter_match:
                current_iter = int(iter_match.group(1))
                train_loss = float(iter_match.group(2))
                tokens_per_sec = float(iter_match.group(4))
                peak_mem = float(iter_match.group(5))
                saved = False  # Reset save indicator

            # Parse validation loss
            val_match = val_pattern.search(line)
            if val_match:
                val_loss = float(val_match.group(1))

            # Check for save
            if save_pattern.search(line):
                saved = True

            # Only update display on training iterations
            if iter_match or val_match:
                # Build status line
                save_indicator = " 💾" if saved else ""
                val_indicator = f" | val:{val_loss:.3f}" if val_loss > 0 else ""
                status = f"iter:{current_iter}/{total_iters} | loss:{train_loss:.3f}{val_indicator} | {tokens_per_sec:.0f} tok/s | {peak_mem:.1f}GB{save_indicator}"

                # Progress bar
                progress = create_progress_bar(current_iter, total_iters, bar_width)

                # Render
                render(status, progress, term_width)

    except KeyboardInterrupt:
        process.terminate()
        print("\n\nTraining interrupted.")
        sys.exit(1)

    process.wait()

    # Final state - move below the display
    print('\n')

    if process.returncode == 0:
        print('\033[1;32m✓ Training complete\033[0m')
    else:
        print(f'\033[1;31m✗ Training failed (exit code {process.returncode})\033[0m')

    return process.returncode

if __name__ == '__main__':
    sys.exit(main())
