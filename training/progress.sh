#!/bin/bash
# Show MLX training progress

TOTAL=59523
OUTPUT_FILE="/private/tmp/claude/-Users-tj-software-OrbPro-Small-Language-Model/tasks/be0c933.output"

if [ ! -f "$OUTPUT_FILE" ]; then
    echo "Training output not found at $OUTPUT_FILE"
    exit 1
fi

LAST_LINE=$(grep "^Iter " "$OUTPUT_FILE" | tail -1)

if [ -z "$LAST_LINE" ]; then
    echo "No training iterations found yet"
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
