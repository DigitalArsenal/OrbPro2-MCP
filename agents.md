# Cesium SLM - Parallel Agent Execution Plan

## Project Status: ACTIVE DEVELOPMENT

### Current Implementation (Completed)
- ✅ WebLLM Engine with WebGPU support (`src/llm/web-llm-engine.ts`)
- ✅ Command Parser with natural language fallback (`src/llm/command-parser.ts`)
- ✅ CesiumJS Command Executor (`src/cesium/command-executor.ts`)
- ✅ CZML Generator (`src/cesium/czml-generator.ts`)
- ✅ MCP Server with browser transport (`src/mcp/cesium-mcp-server.ts`)
- ✅ UI Components (Chat, Status, Model Selector)
- ✅ Main Application Integration (`src/app.ts`)
- ✅ HTML/CSS Frontend (`index.html`)

---

## PARALLEL AGENT WORKSTREAMS

Execute these agent workstreams IN PARALLEL. Each workstream is independent and can run concurrently.

---

### WORKSTREAM 1: WebAssembly MCP Module
**Priority: HIGH | Parallelizable: YES**

Create a standalone MCP server that compiles to WebAssembly for browser execution.

**Tasks:**
1. Create `src/wasm/mcp-wasm.ts` - Core MCP logic for WASM compilation
2. Create `src/wasm/cesium-bindings.ts` - WASM-safe Cesium API bindings
3. Create `src/wasm/message-handler.ts` - JSON-RPC message handling for WASM
4. Add AssemblyScript or Rust toolchain for WASM compilation
5. Create `wasm/build.sh` script for WASM compilation
6. Create `src/wasm/index.ts` - Export WASM module loader

**Files to Create:**
```
src/wasm/
├── mcp-wasm.ts
├── cesium-bindings.ts
├── message-handler.ts
├── index.ts
└── types.ts
wasm/
├── build.sh
├── Cargo.toml (if using Rust)
└── src/lib.rs
```

**Reference Documentation:**
- https://webassembly.org/getting-started/developers-guide/
- https://rustwasm.github.io/docs/book/
- CesiumJS API: https://cesium.com/learn/cesiumjs/ref-doc/

---

### WORKSTREAM 2: Training Data Generation
**Priority: HIGH | Parallelizable: YES**

Generate comprehensive training data for fine-tuning the SLM on CesiumJS commands.

**Tasks:**
1. Create `training/data/camera-commands.jsonl` - Camera control examples
2. Create `training/data/entity-commands.jsonl` - Entity CRUD examples
3. Create `training/data/czml-commands.jsonl` - CZML generation examples
4. Create `training/data/scene-commands.jsonl` - Scene mode/terrain examples
5. Create `training/data/natural-language.jsonl` - NL variations mapping
6. Create `training/data/multi-step.jsonl` - Complex multi-command sequences
7. Create `training/generate-data.ts` - Automated data augmentation script
8. Create `training/validate-data.ts` - Data validation and deduplication

**Data Format (JSONL):**
```json
{"prompt": "Show me Paris", "completion": "{\"tool\": \"flyTo\", \"arguments\": {\"longitude\": 2.3522, \"latitude\": 48.8566, \"height\": 500000}}"}
{"prompt": "Add a red marker at the Eiffel Tower", "completion": "{\"tool\": \"addPoint\", \"arguments\": {\"longitude\": 2.2945, \"latitude\": 48.8584, \"name\": \"Eiffel Tower\", \"color\": \"red\"}}"}
```

**Target: 10,000+ training examples covering:**
- 200+ world locations
- All MCP tools (flyTo, lookAt, zoom, addPoint, addLabel, addPolyline, addPolygon, addCircle, etc.)
- Varied natural language phrasings
- Edge cases and error handling

---

### WORKSTREAM 3: Model Fine-Tuning Pipeline
**Priority: HIGH | Parallelizable: YES**

Set up fine-tuning infrastructure for optimizing small models on CesiumJS tasks.

**Tasks:**
1. Create `training/finetune/config.yaml` - Training hyperparameters
2. Create `training/finetune/prepare-data.py` - Data preprocessing for fine-tuning
3. Create `training/finetune/train.py` - Fine-tuning script (LoRA/QLoRA)
4. Create `training/finetune/export-mlc.py` - Export to MLC format for web-llm
5. Create `training/finetune/evaluate.py` - Model evaluation metrics
6. Create `training/finetune/requirements.txt` - Python dependencies

**Target Models for Fine-Tuning:**
- Qwen2.5-0.5B-Instruct (smallest, fastest)
- Qwen2.5-1.5B-Instruct (good balance)
- SmolLM2-360M-Instruct (ultra-small)

**Output:** Fine-tuned model weights in MLC format for browser deployment

---

### WORKSTREAM 4: Enhanced Prompt Engineering
**Priority: MEDIUM | Parallelizable: YES**

Optimize system prompts and few-shot examples for better command parsing.

**Tasks:**
1. Create `src/llm/prompts/system-prompt.ts` - Optimized system prompt
2. Create `src/llm/prompts/few-shot-examples.ts` - Curated few-shot examples
3. Create `src/llm/prompts/location-database.ts` - Expanded location DB (1000+ places)
4. Create `src/llm/prompts/command-templates.ts` - Command response templates
5. Update `src/llm/web-llm-engine.ts` to use new prompts
6. Add prompt versioning and A/B testing support

**Focus Areas:**
- Minimize hallucination of coordinates
- Improve tool selection accuracy
- Handle ambiguous commands gracefully
- Support follow-up/contextual commands

---

### WORKSTREAM 5: Comprehensive Test Suite
**Priority: MEDIUM | Parallelizable: YES**

Create end-to-end and unit tests for all components.

**Tasks:**
1. Create `tests/unit/command-parser.test.ts` - Parser unit tests
2. Create `tests/unit/czml-generator.test.ts` - CZML generation tests
3. Create `tests/unit/command-executor.test.ts` - Executor unit tests
4. Create `tests/unit/mcp-server.test.ts` - MCP protocol tests
5. Create `tests/integration/llm-pipeline.test.ts` - End-to-end LLM tests
6. Create `tests/integration/cesium-commands.test.ts` - Cesium integration tests
7. Create `tests/fixtures/` - Test fixtures and mocks

**Test Coverage Target: 80%+**

---

### WORKSTREAM 6: CZML Documentation & Examples
**Priority: MEDIUM | Parallelizable: YES**

Create comprehensive CZML examples and documentation integration.

**Tasks:**
1. Create `public/czml-examples/satellite-orbit.czml` - Satellite visualization
2. Create `public/czml-examples/flight-path.czml` - Aircraft trajectory
3. Create `public/czml-examples/weather-data.czml` - Weather overlay
4. Create `public/czml-examples/buildings-3d.czml` - 3D building extrusion
5. Create `public/czml-examples/time-series.czml` - Time-dynamic data
6. Create `src/czml/czml-loader.ts` - CZML file loader
7. Create `src/czml/czml-validator.ts` - CZML validation

**CZML Reference:** https://github.com/AnalyticalGraphicsInc/czml-writer/wiki/CZML-Guide

---

### WORKSTREAM 7: Advanced UI Features
**Priority: LOW | Parallelizable: YES**

Enhance the user interface with additional features.

**Tasks:**
1. Create `src/ui/command-history.ts` - Command history with recall
2. Create `src/ui/autocomplete.ts` - Location/command autocomplete
3. Create `src/ui/voice-input.ts` - Web Speech API integration
4. Create `src/ui/keyboard-shortcuts.ts` - Keyboard navigation
5. Create `src/ui/theme-switcher.ts` - Light/dark theme support
6. Update `index.html` with new UI containers

---

### WORKSTREAM 8: Performance Optimization
**Priority: LOW | Parallelizable: YES**

Optimize WebGPU inference and Cesium rendering performance.

**Tasks:**
1. Create `src/perf/webgpu-profiler.ts` - WebGPU performance monitoring
2. Create `src/perf/inference-cache.ts` - Response caching for common queries
3. Create `src/perf/model-preloader.ts` - Background model preloading
4. Create `src/perf/cesium-optimizer.ts` - Cesium LOD and culling optimizations
5. Add Service Worker for offline support
6. Implement response streaming for faster perceived latency

---

## AGENT EXECUTION INSTRUCTIONS

### For Ralph-Wiggum Multi-Agent Execution:

```
SPAWN 8 PARALLEL AGENTS:

AGENT_1: "WASM MCP Module" -> Execute WORKSTREAM 1
AGENT_2: "Training Data Gen" -> Execute WORKSTREAM 2
AGENT_3: "Fine-Tune Pipeline" -> Execute WORKSTREAM 3
AGENT_4: "Prompt Engineering" -> Execute WORKSTREAM 4
AGENT_5: "Test Suite" -> Execute WORKSTREAM 5
AGENT_6: "CZML Examples" -> Execute WORKSTREAM 6
AGENT_7: "UI Features" -> Execute WORKSTREAM 7
AGENT_8: "Performance Opt" -> Execute WORKSTREAM 8

Each agent should:
1. Read this file for context
2. Read existing source files in src/ for patterns
3. Create files in the specified locations
4. Follow TypeScript conventions from existing code
5. Export from appropriate index.ts files
6. Mark completion in .claude/progress.md
```

### Dependencies Between Workstreams:
- WORKSTREAM 3 depends on WORKSTREAM 2 (needs training data)
- WORKSTREAM 4 enhances WORKSTREAM 3 output
- All other workstreams are fully independent

### Critical Files to Read First:
1. `src/llm/web-llm-engine.ts` - LLM integration patterns
2. `src/mcp/cesium-mcp-server.ts` - MCP tool definitions
3. `src/cesium/command-executor.ts` - Command execution
4. `src/cesium/types.ts` - Type definitions
5. `package.json` - Dependencies and scripts

---

## COMPLETION CRITERIA

The project is complete when:
1. [ ] WASM MCP module compiles and runs in browser
2. [ ] 10,000+ training examples generated
3. [ ] Fine-tuned model achieves 90%+ accuracy on test set
4. [ ] All tests pass with 80%+ coverage
5. [ ] CZML examples load and display correctly
6. [ ] UI enhancements integrated
7. [ ] Performance metrics meet targets (< 100ms inference on M1)
8. [ ] `npm run build` succeeds with no errors
9. [ ] `npm run dev` serves working application
10. [ ] Natural language commands work end-to-end

---

## RESOURCES

### Documentation
- MediaPipe LLM Inference: https://ai.google.dev/edge/mediapipe/solutions/genai/llm_inference/web_js
- MLC Web-LLM: https://webllm.mlc.ai/
- CesiumJS: https://cesium.com/learn/cesiumjs/ref-doc/
- CZML Guide: https://github.com/AnalyticalGraphicsInc/czml-writer/wiki/CZML-Guide
- WebGPU: https://www.w3.org/TR/webgpu/

### Model Resources
- Qwen2.5 Models: https://huggingface.co/Qwen
- SmolLM2: https://huggingface.co/HuggingFaceTB/SmolLM2-360M-Instruct
- MLC Model Conversion: https://llm.mlc.ai/docs/deploy/web.html

---

## Progress Tracking

Update `.claude/progress.md` as workstreams complete:

```markdown
# Progress

## Workstream 1: WASM MCP Module
- [ ] mcp-wasm.ts
- [ ] cesium-bindings.ts
- [ ] message-handler.ts
- [ ] WASM build script
- [ ] Integration test

## Workstream 2: Training Data
- [ ] camera-commands.jsonl (2000 examples)
- [ ] entity-commands.jsonl (2000 examples)
- [ ] czml-commands.jsonl (1000 examples)
- [ ] scene-commands.jsonl (1000 examples)
- [ ] natural-language.jsonl (3000 examples)
- [ ] multi-step.jsonl (1000 examples)
- [ ] Data validation

... (continue for all workstreams)
```
