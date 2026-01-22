# Ralph-Wiggum Parallel Agent Instructions

## Project: Cesium SLM (Small Language Model for CesiumJS Control)

This document provides complete instructions for the ralph-wiggum multi-agent plugin to execute this project in parallel.

---

## PROJECT OVERVIEW

**Goal:** Create a browser-based Small Language Model (SLM) that takes plain text commands and controls CesiumJS, including:
1. WebGPU-powered LLM inference in browser
2. MCP (Model Context Protocol) server compiled to WebAssembly
3. Natural language to CZML/CesiumJS command translation
4. Fine-tuned model optimized for geospatial commands

**Status:** Core implementation complete. Need training data, fine-tuning, WASM MCP, and polish.

---

## RECOMMENDED BASE MODELS FOR FINE-TUNING

Based on 2025 benchmarks, these are the best models for our use case:

| Model | Size | Best For | WebGPU Ready |
|-------|------|----------|--------------|
| **Qwen2.5-0.5B-Instruct** | 500M | Instruction following, multilingual | Yes (via MLC) |
| **Qwen2.5-1.5B-Instruct** | 1.5B | Better reasoning, good balance | Yes (via MLC) |
| **SmolLM2-360M-Instruct** | 360M | Ultra-fast, on-device | Yes (via MLC) |
| **SmolLM2-1.7B-Instruct** | 1.7B | Good performance/size ratio | Yes (via MLC) |

**Primary Target:** `Qwen2.5-1.5B-Instruct-q4f16_1-MLC` (best balance for WebGPU)
**Fallback:** `SmolLM2-360M-Instruct-q4f16_1-MLC` (fastest, mobile-friendly)

---

## PARALLEL AGENT ASSIGNMENTS

Launch these 8 agents IN PARALLEL. Each agent works independently.

### AGENT 1: WASM MCP Module Builder
```
TASK: Create WebAssembly-compatible MCP server for browser execution

CONTEXT:
- Read src/mcp/cesium-mcp-server.ts for current TypeScript implementation
- Read src/mcp/browser-transport.ts for message handling
- The MCP server needs to work in a WebAssembly context

DELIVERABLES:
1. src/wasm/mcp-core.ts - Core MCP logic extracted for WASM
2. src/wasm/wasm-bridge.ts - JavaScript <-> WASM bridge
3. src/wasm/cesium-bindings.ts - WASM-safe Cesium API stubs
4. wasm/Cargo.toml - Rust project for WASM compilation (optional)
5. wasm/src/lib.rs - Rust WASM implementation (optional)
6. Update package.json with wasm-pack or assemblyscript dependencies

APPROACH:
- Option A: AssemblyScript (TypeScript-like, easier)
- Option B: Rust with wasm-bindgen (more performant)
- The MCP server must handle JSON-RPC 2.0 messages
- Focus on the tool execution logic, not transport

REFERENCE:
- https://webassembly.org/getting-started/developers-guide/
- https://rustwasm.github.io/docs/book/
```

### AGENT 2: Training Data Generator (10,000+ Examples)
```
TASK: Generate comprehensive training dataset for CesiumJS command fine-tuning

CONTEXT:
- Read training/cesium-commands-dataset.jsonl for format examples
- Read src/llm/command-parser.ts for known locations
- Current examples: ~220. Target: 10,000+

DELIVERABLES:
1. training/data/camera-commands.jsonl (2500 examples)
2. training/data/entity-commands.jsonl (2500 examples)
3. training/data/czml-commands.jsonl (1500 examples)
4. training/data/scene-commands.jsonl (1500 examples)
5. training/data/natural-language-variations.jsonl (2000 examples)
6. training/generate-data.ts - Automated augmentation script
7. training/validate-data.ts - Deduplication and validation

DATA FORMAT (JSONL):
{"instruction": "Show me Paris", "output": "{\"tool\": \"flyTo\", \"arguments\": {\"longitude\": 2.3522, \"latitude\": 48.8566, \"height\": 500000}}"}

COVERAGE REQUIREMENTS:
- 300+ world locations (cities, landmarks, natural wonders)
- All MCP tools: flyTo, lookAt, zoom, addPoint, addLabel, addPolyline, addPolygon, addCircle, setSceneMode, playAnimation, pauseAnimation, setTime, removeEntity
- Multiple phrasings per command type (20+ variations)
- Include coordinate-based commands
- Include multi-step sequences
- Include ambiguous queries with clarification responses

CESIUM REFERENCE DATA:
- Fetch examples from: https://community.cesium.com/t/formatted-czml-examples/38417
- Use CZML Guide: https://github.com/AnalyticalGraphicsInc/czml-writer/wiki/CZML-Guide
- Sandcastle examples: https://cesium.com/learn/cesiumjs-sandcastle/
```

### AGENT 3: Fine-Tuning Pipeline Setup
```
TASK: Create complete fine-tuning infrastructure for Qwen2.5 and SmolLM models

CONTEXT:
- Read training/finetune-config.json for current config
- Target deployment: MLC Web-LLM format for browser

DELIVERABLES:
1. training/finetune/requirements.txt - Python dependencies
2. training/finetune/prepare_data.py - Convert JSONL to training format
3. training/finetune/train_lora.py - LoRA fine-tuning script
4. training/finetune/train_qlora.py - QLoRA for memory efficiency
5. training/finetune/evaluate.py - Model evaluation on test set
6. training/finetune/export_mlc.py - Export to MLC format
7. training/finetune/config/qwen2.5-0.5b.yaml - Hyperparameters
8. training/finetune/config/smollm2-360m.yaml - Hyperparameters
9. training/finetune/README.md - Usage instructions

APPROACH:
- Use Hugging Face Transformers + PEFT for LoRA
- Use unsloth or axolotl for faster training
- Eval metrics: exact match, tool accuracy, coordinate accuracy
- Export using mlc-llm convert tools

REFERENCE:
- https://huggingface.co/learn/cookbook/en/fine_tuning_vlm_trl
- https://mikulskibartosz.name/fine-tune-small-language-model
- https://llm.mlc.ai/docs/deploy/web.html
```

### AGENT 4: Enhanced Prompt Engineering
```
TASK: Optimize system prompts and create comprehensive location database

CONTEXT:
- Read src/llm/web-llm-engine.ts for current system prompt
- Read src/llm/command-parser.ts for KNOWN_LOCATIONS

DELIVERABLES:
1. src/llm/prompts/system-prompt.ts - Optimized system prompt with tool definitions
2. src/llm/prompts/few-shot-examples.ts - Curated in-context examples
3. src/llm/prompts/location-database.ts - 1000+ locations with aliases
4. src/llm/prompts/command-templates.ts - Response format templates
5. src/llm/prompts/index.ts - Exports
6. Update src/llm/web-llm-engine.ts to use new prompts

OPTIMIZATION GOALS:
- Minimize coordinate hallucination
- Improve tool selection accuracy to 95%+
- Handle ambiguous commands gracefully
- Support follow-up commands with context
- Keep prompt under 2000 tokens

LOCATION DATABASE STRUCTURE:
interface Location {
  name: string;
  aliases: string[];
  longitude: number;
  latitude: number;
  height?: number;  // default view height
  type: 'city' | 'landmark' | 'natural' | 'country' | 'region';
  country?: string;
  continent?: string;
}
```

### AGENT 5: Comprehensive Test Suite
```
TASK: Create thorough test coverage for all components

CONTEXT:
- Read existing tests in tests/
- Current coverage: basic unit tests

DELIVERABLES:
1. tests/unit/web-llm-engine.test.ts - LLM engine tests
2. tests/unit/browser-transport.test.ts - Transport tests
3. tests/integration/full-pipeline.test.ts - End-to-end tests
4. tests/integration/tool-execution.test.ts - Tool call validation
5. tests/fixtures/sample-commands.json - Test fixtures
6. tests/fixtures/mock-cesium.ts - Cesium mock for testing
7. tests/e2e/browser.test.ts - Browser-based E2E tests (playwright)
8. vitest.config.ts updates for coverage reporting

TEST COVERAGE TARGETS:
- Command Parser: 95%
- CZML Generator: 90%
- MCP Server: 90%
- LLM Engine: 80%
- Overall: 85%+

TEST CASES TO COVER:
- All MCP tools with valid inputs
- Invalid/malformed inputs
- Edge cases (null island, date line crossing)
- Error handling and recovery
- Streaming responses
```

### AGENT 6: CZML Examples & Documentation
```
TASK: Create comprehensive CZML examples and enhance generator

CONTEXT:
- Read src/cesium/czml-generator.ts for current implementation
- Read src/cesium/types.ts for type definitions

DELIVERABLES:
1. public/czml-examples/satellite-orbit.czml - ISS tracking example
2. public/czml-examples/flight-path.czml - Aircraft trajectory
3. public/czml-examples/weather-radar.czml - Weather overlay
4. public/czml-examples/buildings-3d.czml - Extruded buildings
5. public/czml-examples/time-series.czml - Animated time data
6. public/czml-examples/multi-vehicle.czml - Fleet tracking
7. src/cesium/czml-loader.ts - Load CZML from URL/file
8. src/cesium/czml-validator.ts - Validate CZML structure

REFERENCE:
- https://github.com/AnalyticalGraphicsInc/czml-writer/wiki/CZML-Guide
- https://community.cesium.com/t/formatted-czml-examples/38417
- https://cesium.com/blog/2018/03/21/czml-time-animation/
```

### AGENT 7: Advanced UI Features
```
TASK: Add voice input, autocomplete, and command history

CONTEXT:
- Read src/ui/ for current UI components
- Read index.html for layout

DELIVERABLES:
1. src/ui/voice-input.ts - Web Speech API integration (if not exists)
2. src/ui/autocomplete.ts - Location/command autocomplete
3. src/ui/command-history.ts - Command recall with up/down arrows
4. src/ui/keyboard-shortcuts.ts - Keyboard navigation
5. src/ui/help-overlay.ts - Quick help panel
6. Update src/ui/chat-interface.ts to integrate new features
7. Update index.html with necessary containers
8. Add CSS for new components

UI REQUIREMENTS:
- Voice button with visual feedback (pulsing when active)
- Autocomplete dropdown with location suggestions
- Up/down arrow for command history
- Keyboard shortcuts: Ctrl+Enter to send, Escape to clear
- Help overlay with available commands
```

### AGENT 8: Performance & Production Ready
```
TASK: Optimize for production deployment

CONTEXT:
- Read vite.config.ts for build configuration
- Read package.json for dependencies

DELIVERABLES:
1. src/perf/webgpu-profiler.ts - Performance monitoring
2. src/perf/inference-cache.ts - Cache common responses
3. src/perf/model-preloader.ts - Background model loading
4. public/sw.js - Service Worker for offline support
5. vite.config.ts updates for optimal chunking
6. .env.example - Environment variables template
7. docker/Dockerfile - Container deployment
8. docker/docker-compose.yml - Local development setup
9. Update package.json scripts for production

OPTIMIZATIONS:
- Split CesiumJS and WebLLM into separate chunks
- Preload model weights during idle time
- Cache geocoding responses
- Lazy load UI components
- Enable gzip/brotli compression
```

---

## EXECUTION ORDER

```
Phase 1 (Parallel):
├── AGENT 2: Training Data (no dependencies)
├── AGENT 4: Prompt Engineering (no dependencies)
├── AGENT 5: Test Suite (no dependencies)
├── AGENT 6: CZML Examples (no dependencies)
├── AGENT 7: UI Features (no dependencies)
└── AGENT 8: Performance (no dependencies)

Phase 2 (After Phase 1):
├── AGENT 1: WASM MCP (uses finalized MCP server from tests)
└── AGENT 3: Fine-Tuning (needs training data from Agent 2)
```

---

## SHARED RESOURCES

### Files All Agents Should Read First
1. `.claude/Agents.md` - Workstream overview
2. `src/cesium/types.ts` - Type definitions
3. `src/mcp/cesium-mcp-server.ts` - Tool definitions
4. `src/llm/command-parser.ts` - Location database
5. `package.json` - Dependencies

### Code Style Guidelines
- Use TypeScript strict mode
- Follow existing patterns in src/
- Export from index.ts files
- Add JSDoc comments for public APIs
- Use async/await over promises

### Testing Guidelines
- Use vitest for unit/integration tests
- Mock external dependencies (Cesium, WebGPU)
- Aim for descriptive test names
- Include edge cases

---

## COMPLETION PROMISE

Output the following ONLY when ALL criteria below are met:

<promise>Cesium SLM Finished</promise>

**Criteria (ALL must be true):**

1. ✅ `npm run build` succeeds with no errors
2. ✅ `npm run test` passes with 80%+ coverage
3. ✅ 10,000+ training examples generated
4. ✅ Fine-tuning pipeline functional
5. ✅ WASM MCP module compiles
6. ✅ Voice input working
7. ✅ Autocomplete working
8. ✅ CZML examples load in Cesium
9. ✅ `npm run dev` serves working app
10. ✅ Natural language commands execute correctly

**CRITICAL:** Do NOT output the promise until genuinely complete. The loop is designed to continue until all criteria are met.

---

## PROGRESS TRACKING

Each agent should update `Progress.md` (in main folder) upon completing tasks:

```markdown
## Agent [N]: [Name]
- [x] Task 1: filename.ts
- [x] Task 2: filename.ts
- [ ] Task 3: pending
```

---

## RESOURCES

### CesiumJS Documentation
- API Reference: https://cesium.com/learn/cesiumjs/ref-doc/
- CZML Guide: https://github.com/AnalyticalGraphicsInc/czml-writer/wiki/CZML-Guide
- Sandcastle: https://cesium.com/learn/cesiumjs-sandcastle/
- Community: https://community.cesium.com/

### WebGPU/LLM Resources
- Web-LLM: https://webllm.mlc.ai/
- MLC LLM: https://llm.mlc.ai/docs/deploy/web.html
- MediaPipe: https://ai.google.dev/edge/mediapipe/solutions/genai/llm_inference/web_js

### Fine-Tuning Resources
- Hugging Face PEFT: https://huggingface.co/docs/peft
- Unsloth: https://github.com/unslothai/unsloth
- LoRA Guide: https://huggingface.co/docs/peft/conceptual_guides/lora

### Model Hubs
- Qwen2.5: https://huggingface.co/Qwen/Qwen2.5-0.5B-Instruct
- SmolLM2: https://huggingface.co/HuggingFaceTB/SmolLM2-360M-Instruct
- MLC Models: https://huggingface.co/mlc-ai
