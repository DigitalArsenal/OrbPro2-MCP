#!/bin/bash
# Show MLX training progress
# Usage: ./progress.sh [output_file] [total_iters]

# Try to find the output file
if [ -n "$1" ]; then
    OUTPUT_FILE="$1"
elif [ -f "/private/tmp/claude/-Users-tj-software-OrbPro2-MCP/tasks/be0c933.output" ]; then
    OUTPUT_FILE="/private/tmp/claude/-Users-tj-software-OrbPro2-MCP/tasks/be0c933.output"
else
    # Find most recent training output
    OUTPUT_FILE=$(ls -t /private/tmp/claude/-Users-tj-software-OrbPro2-MCP/tasks/*.output 2>/dev/null | head -1)
fi

if [ -z "$OUTPUT_FILE" ] || [ ! -f "$OUTPUT_FILE" ]; then
    echo "No training output found"
    echo "Usage: ./progress.sh <output_file> [total_iters]"
    exit 1
fi

# Get total iterations from arg or default
TOTAL="${2:-59523}"

LAST_LINE=$(grep "^Iter " "$OUTPUT_FILE" 2>/dev/null | tail -1)

if [ -z "$LAST_LINE" ]; then
    echo "No training iterations found yet"
    echo "File: $OUTPUT_FILE"
    exit 0
fi

# Parse: Iter 23430: Train loss 0.411, Learning Rate 1.000e-05, It/sec 9.395, ...
CURRENT=$(echo "$LAST_LINE" | awk -F'[: ]+' '{print $2}')
LOSS=$(echo "$LAST_LINE" | awk -F'Train loss ' '{print $2}' | awk -F',' '{print $1}')
SPEED=$(echo "$LAST_LINE" | awk -F'It/sec ' '{print $2}' | awk -F',' '{print $1}')

PERCENT=$(awk "BEGIN {printf \"%.1f\", ($CURRENT/$TOTAL)*100}")
REMAINING=$(awk "BEGIN {printf \"%.0f\", ($TOTAL-$CURRENT)/$SPEED/60}")

echo "Progress: $CURRENT / $TOTAL ($PERCENT%)"
echo "Loss: $LOSS"
echo "Speed: $SPEED it/sec"
echo "ETA: ~${REMAINING} minutes"
