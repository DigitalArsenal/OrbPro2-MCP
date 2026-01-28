# OrbPro2 MCP - Browser-based Natural Language Globe Control

A small language model (SLM) system that runs entirely in the browser using WebGPU and allows users to control a CesiumJS 3D globe using natural language commands.

## Features

- **Browser-based LLM Inference**: Runs language models directly in the browser using WebGPU via [web-llm](https://github.com/mlc-ai/web-llm)
- **CesiumJS Integration**: Full control over a 3D globe visualization including camera, entities, layers, and time
- **Model Context Protocol (MCP)**: Structured tool definitions for the LLM to control CesiumJS
- **CZML Generation**: Automatic CZML document generation for creating entities
- **Natural Language Commands**: Simple commands like "Show me Paris" or "Add a marker at the Eiffel Tower"
- **Multiple Model Support**: Choose from various small language models based on your device capabilities

## Requirements

- **Browser**: Chrome 113+ or Edge 113+ with WebGPU support
- **GPU**: A WebGPU-compatible graphics card
- **Memory**: 4GB+ RAM recommended (varies by model size)

## Quick Start

1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npm run dev
```

3. Open your browser to `http://localhost:5173`

4. Select a language model and wait for it to load

5. Start typing natural language commands!

## Example Commands

### Navigation
- "Show me New York"
- "Fly to the Eiffel Tower"
- "Go to Tokyo"
- "Navigate to the Grand Canyon"

### Adding Markers
- "Add a red marker at Paris"
- "Put a point at the Statue of Liberty"
- "Mark the location of Sydney Opera House"

### Drawing Shapes
- "Draw a line from London to Paris"
- "Create a circle around Tokyo with a 100km radius"
- "Draw a polygon around Manhattan"

### Scene Control
- "Switch to 2D mode"
- "Show me the 3D globe"
- "Zoom in"
- "Zoom out"

### Time Animation
- "Play the animation"
- "Pause"
- "Set time to January 1, 2024"

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Browser                               │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐   │
│  │   WebLLM     │  │  MCP Server  │  │    CesiumJS      │   │
│  │  (WebGPU)    │──│  (In-Browser)│──│    Viewer        │   │
│  └──────────────┘  └──────────────┘  └──────────────────┘   │
│         │                 │                   │              │
│         ▼                 ▼                   ▼              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐   │
│  │   Command    │  │    CZML      │  │    Command       │   │
│  │   Parser     │  │  Generator   │  │    Executor      │   │
│  └──────────────┘  └──────────────┘  └──────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### Components

1. **WebLLM Engine** (`src/llm/web-llm-engine.ts`)
   - Initializes and manages the language model
   - Handles inference with tool calling support
   - Provides streaming response capability

2. **MCP Server** (`src/mcp/cesium-mcp-server.ts`)
   - Implements Model Context Protocol
   - Defines tools for CesiumJS control
   - Handles tool calls from the LLM

3. **Command Parser** (`src/llm/command-parser.ts`)
   - Parses LLM outputs into CesiumJS commands
   - Fallback natural language parsing
   - Known location database

4. **CZML Generator** (`src/cesium/czml-generator.ts`)
   - Creates CZML documents for entities
   - Supports points, labels, polylines, polygons, etc.

5. **Command Executor** (`src/cesium/command-executor.ts`)
   - Executes commands against CesiumJS Viewer
   - Camera control, entity management, scene settings

## Supported Models

### Small (Fast, ~500MB-2GB)
- Qwen2.5-0.5B-Instruct
- Qwen2.5-1.5B-Instruct
- SmolLM2-360M-Instruct
- SmolLM2-1.7B-Instruct

### Medium (Balanced, ~2-4GB)
- Qwen2.5-3B-Instruct
- Phi-3.5-mini-instruct
- gemma-2-2b-it

### Large (Powerful, ~4-8GB)
- Llama-3.2-3B-Instruct
- Qwen2.5-7B-Instruct
- Mistral-7B-Instruct-v0.3

## API Usage

```typescript
import { CesiumSLMApp } from './src/app';

const app = new CesiumSLMApp();

await app.initialize({
  cesiumContainer: 'cesium-container',
  chatContainer: 'chat-container',
  statusContainer: 'status-container',
  modelSelectorContainer: 'model-selector-container',
  cesiumToken: 'your-cesium-ion-token', // Optional
});
```

### Using Components Independently

```typescript
import { WebLLMEngine, CommandParser, CesiumCommandExecutor } from './src';

// Initialize LLM
const llm = new WebLLMEngine({
  modelId: 'Qwen2.5-1.5B-Instruct-q4f16_1-MLC',
  onProgress: (p) => console.log(`Loading: ${p.progress * 100}%`),
});
await llm.initialize();

// Generate response
const response = await llm.generate('Show me Paris');

// Parse tool calls
const parser = new CommandParser();
const commands = parser.parseToolCalls(response.toolCalls);

// Execute commands
const executor = new CesiumCommandExecutor(viewer);
for (const cmd of commands.commands) {
  await executor.execute(cmd);
}
```

## MCP Tools

The system exposes the following MCP tools:

| Tool | Description |
|------|-------------|
| `flyTo` | Fly the camera to a location |
| `lookAt` | Orient camera to look at a location |
| `zoom` | Zoom in or out |
| `addPoint` | Add a point marker |
| `addLabel` | Add a text label |
| `addPolyline` | Draw a line |
| `addPolygon` | Draw a polygon |
| `addCircle` | Draw a circle |
| `removeEntity` | Remove an entity |
| `clearAll` | Clear all entities |
| `setSceneMode` | Change 2D/3D mode |
| `setTime` | Set simulation time |
| `playAnimation` | Start animation |
| `pauseAnimation` | Pause animation |
| `generateCZML` | Generate CZML document |

## Training & Deployment Pipeline

This section describes how to train and deploy your own custom CesiumJS language model.

### Prerequisites

```bash
# Python dependencies (for training)
pip install mlx mlx-lm

# Node dependencies (for data generation)
npm install

# Docker (for WebGPU compilation)
# Install from: https://www.docker.com/products/docker-desktop
```

### Step 1: Generate Training Data

Generate synthetic training data from the tool schemas:

```bash
cd training
npx tsx generate-training-data.ts
```

This creates `generated-training-data.jsonl` with ~88,000 examples covering:
- All CesiumJS tools (flyTo, addPoint, addSphere, etc.)
- Known locations (cities, landmarks, airports, scientific facilities)
- Various phrasings and parameter combinations

### Step 2: Train the Model (MLX - Apple Silicon)

Training uses Apple's MLX framework for fast Apple Silicon training:

```bash
cd training
python3 finetune_mlx.py \
  --dataset generated-training-data.jsonl \
  --output-dir cesium-qwen-lora-mlx \
  --num-epochs 3 \
  --batch-size 4
```

Monitor progress:
```bash
./progress.sh
```

Training takes ~2 hours on Apple Silicon (M1/M2/M3).

The script automatically:
1. Converts data to MLX format
2. Trains LoRA adapters
3. Fuses adapters with base model
4. Saves merged model to `cesium-qwen-lora-mlx/merged/`

### Step 3: Test the Model

Test the trained model locally:

```bash
cd training
python3 -c "
from mlx_lm import load, generate

model, tokenizer = load('cesium-qwen-lora-mlx/merged')

prompt = 'fly to CERN'
messages = [
    {'role': 'system', 'content': 'You are a CesiumJS controller assistant. Convert natural language commands to tool calls.'},
    {'role': 'user', 'content': prompt}
]
formatted = tokenizer.apply_chat_template(messages, tokenize=False, add_generation_prompt=True)
response = generate(model, tokenizer, prompt=formatted, max_tokens=256)
print(response)
"
```

### Step 4: Compile for WebGPU (Docker)

Compile the model for browser deployment using MLC-LLM:

```bash
./scripts/compile-cesium-slm-docker.sh
```

This requires Docker Desktop running with at least 16GB disk space.

The script:
1. Builds a Docker image with Emscripten + MLC-LLM
2. Converts weights to quantized format (q4f16_1 = ~300MB)
3. Compiles to WebGPU WASM
4. Outputs to `mlc-models/OrbPro-Cesium-SLM-0.5B-q4f16_1-MLC/`

All downloads are cached in `.cache/mlc-compile/` for faster subsequent builds.

### Step 5: Upload to HuggingFace

Upload the compiled model:

```bash
cd mlc-models/OrbPro-Cesium-SLM-0.5B-q4f16_1-MLC

huggingface-cli login
huggingface-cli repo create OrbPro-Cesium-SLM-0.5B-q4f16_1-MLC --type model
huggingface-cli upload YOUR_USERNAME/OrbPro-Cesium-SLM-0.5B-q4f16_1-MLC .
```

### Step 6: Update Application

Update `src/llm/web-llm-engine.ts` with your HuggingFace model URL.

### Complete Pipeline Script

Run the entire pipeline:

```bash
# Generate data
cd training && npx tsx generate-training-data.ts

# Train (takes ~2 hours)
python3 finetune_mlx.py --dataset generated-training-data.jsonl --output-dir cesium-qwen-lora-mlx --num-epochs 3

# Compile for WebGPU (requires Docker)
cd .. && ./scripts/compile-cesium-slm-docker.sh

# Upload
cd mlc-models/OrbPro-Cesium-SLM-0.5B-q4f16_1-MLC
huggingface-cli upload YOUR_USERNAME/OrbPro-Cesium-SLM-0.5B-q4f16_1-MLC .
```

### Caching

All large downloads are cached for fast subsequent runs:

| Cache Location | Contents |
|----------------|----------|
| `~/.cache/huggingface/` | Base model weights (~1GB) |
| `.cache/mlc-compile/` | Docker build cache |
| `training/cesium-qwen-lora-mlx/` | LoRA checkpoints |

To start fresh, delete these directories.

## Development

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Type check
npx tsc --noEmit

# Build for production
npm run build

# Preview production build
npm run preview
```

## Environment Variables

| Variable | Description |
|----------|-------------|
| `VITE_CESIUM_TOKEN` | Cesium Ion access token for terrain/imagery |

## Browser Support

| Browser | Version | Status |
|---------|---------|--------|
| Chrome | 113+ | Supported |
| Edge | 113+ | Supported |
| Firefox | Not yet | WebGPU in development |
| Safari | Not yet | WebGPU in development |

## References

- [web-llm](https://github.com/mlc-ai/web-llm) - High-performance in-browser LLM inference
- [CesiumJS](https://cesium.com/platform/cesiumjs/) - 3D geospatial visualization
- [CZML Guide](https://github.com/AnalyticalGraphicsInc/czml-writer/wiki/CZML-Guide) - CZML format specification
- [MCP Protocol](https://modelcontextprotocol.io/) - Model Context Protocol
- [mcp-wasm](https://github.com/beekmarks/mcp-wasm) - MCP in WebAssembly reference

## License

MIT
