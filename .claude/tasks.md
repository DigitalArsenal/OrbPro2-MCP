# Cesium SLM - Complete Implementation Tasks

## Overview
Make the Cesium SLM accurately execute ALL CesiumJS capabilities using a fine-tuned small language model.

---

## PHASE 1: MCP Server Tools (Can run in parallel - 6 independent streams)

### Stream 1: Entity Creation Tools
```
Implement these tools in src/mcp/cesium-mcp-server.ts with Zod schemas:
- addBillboard (image at location)
- addModel (glTF/glb 3D model)
- addPath (time-dynamic path)
For each: add types to types.ts, CZML generator to czml-generator.ts, handler to command-executor.ts
```

### Stream 2: Data Loading Tools
```
Implement these tools in src/mcp/cesium-mcp-server.ts:
- loadGeoJSON (url, name, stroke, fill, strokeWidth, clampToGround)
- loadKML (url, name, clampToGround)
- loadCZML (url, name)
- loadGPX (url, name, clampToGround)
- addWMS (url, layers, name)
- addWMTS (url, layer, name)
For each: add command interface to types.ts, handler to command-executor.ts
```

### Stream 3: Camera Tools
```
Implement these tools in src/mcp/cesium-mcp-server.ts:
- setView (instant camera position: longitude, latitude, height, heading, pitch, roll)
- getCamera (returns current position)
- rotateCamera (heading, pitch delta)
- trackEntity (entityId - follow moving entity)
- stopTracking ()
- orbitTarget (longitude, latitude, height, duration)
- stopOrbit ()
For each: add command interface to types.ts, handler to command-executor.ts
```

### Stream 4: Scene Settings Tools
```
Implement these tools in src/mcp/cesium-mcp-server.ts:
- setFog (enabled, density)
- setShadows (enabled, softShadows)
- setLighting (enableLighting)
- setAtmosphere (show, hueShift, saturationShift, brightnessShift)
- setGlobe (show, baseColor, showGroundAtmosphere, enableLighting)
- enableDepthTest (enabled)
- setSkybox (show)
- enableFXAA (enabled)
- setBloom (enabled, brightness, delta, sigma)
For each: add command interface to types.ts, handler to command-executor.ts
```

### Stream 5: Entity Management Tools
```
Implement these tools in src/mcp/cesium-mcp-server.ts:
- selectEntity (entityId)
- listEntities () - returns all entity names/ids
- getEntityInfo (entityId) - returns entity properties
- updateEntity (entityId, properties) - modify entity
- cloneEntity (entityId, newName)
For each: add command interface to types.ts, handler to command-executor.ts
```

### Stream 6: Advanced Tools
```
Implement these tools in src/mcp/cesium-mcp-server.ts:
- measureDistance (start, end positions)
- sampleTerrainHeight (longitude, latitude)
- setTerrainExaggeration (factor)
- load3DTiles (url, assetId, id)
- style3DTiles (id, color)
- remove3DTiles (id)
- setImageryAlpha (index, alpha)
- setImageryBrightness (index, brightness, saturation)
For each: add command interface to types.ts, handler to command-executor.ts
```

---

## PHASE 2: Training Data Generation (Can run in parallel - 4 independent streams)

### Stream 1: Camera Training Examples
```
Add to training/generate-training-data.ts:
- setView templates (instant teleport, jump to, go directly to)
- getCamera templates (where am I, current position, camera location)
- rotateCamera templates (turn left/right, look up/down, pan)
- trackEntity templates (follow the..., track the...)
Generate 1000+ examples for each tool
```

### Stream 2: Data Loading Training Examples
```
Add to training/generate-training-data.ts:
- loadGeoJSON templates (load geojson from, import geojson)
- loadKML templates (load kml, import kml/kmz)
- loadCZML templates (load czml from)
Generate 500+ examples for each tool
```

### Stream 3: Scene Settings Training Examples
```
Add to training/generate-training-data.ts:
- setFog templates (enable fog, disable fog, add fog)
- setShadows templates (turn on shadows, enable shadows)
- setLighting templates (enable sun lighting, day/night mode)
- setAtmosphere templates (show atmosphere, sky effects)
Generate 300+ examples for each tool
```

### Stream 4: Special Case Training Examples
```
Add to training/generate-training-data.ts:
- SPHERE vs CIRCLE disambiguation (critical!)
  - "add a sphere" -> addSphere
  - "add a ball" -> addSphere
  - "add a 3D sphere" -> addSphere
  - "add a flat circle" -> addCircle
  - "draw a circle on the ground" -> addCircle
- flyTo vs flyToEntity disambiguation
  - "fly to Paris" -> flyTo
  - "fly to the marker" -> flyToEntity
  - "zoom to the sphere" -> flyToEntity
Generate 2000+ disambiguation examples
```

---

## PHASE 3: Fine-tuning (Sequential)

### Step 1: Prepare Training Data
```bash
# Run training data generator to get 20k+ examples
npx tsx training/generate-training-data.ts

# Verify tool distribution
wc -l training/generated-training-data.jsonl
```

### Step 2: Fine-tune Model
```bash
# Option A: Use existing QLoRA script
cd training
python finetune_lora.py \
  --model_name "Qwen/Qwen2.5-1.5B-Instruct" \
  --dataset_path "./generated-training-data.jsonl" \
  --output_dir "./cesium-slm-lora" \
  --num_train_epochs 3 \
  --per_device_train_batch_size 4

# Option B: Use Unsloth for faster training
pip install unsloth
python train_unsloth.py
```

### Step 3: Compile for WebGPU
```bash
# Convert to MLC format for browser inference
./scripts/compile-webgpu.sh cesium-slm-lora
```

---

## PHASE 4: Prompt Engineering (Can run in parallel - 2 streams)

### Stream 1: Update Compact System Prompt
```
File: src/llm/prompts.ts - COMPACT_SYSTEM_PROMPT

Add ALL tools with clear descriptions:
- Group tools by category
- Include critical examples for ambiguous cases
- Add "IMPORTANT DISTINCTIONS" section
- Limit to ~2000 tokens
```

### Stream 2: Update Few-Shot Examples
```
File: src/llm/prompts.ts - FEW_SHOT_EXAMPLES

Add 10+ examples per tool category:
- Camera: flyTo, flyToEntity, setView, zoom, getCamera
- 3D Shapes: addSphere (10+), addBox, addCylinder
- 2D Entities: addCircle (distinguish from sphere), addPolygon
- Scene: setFog, setShadows, setLighting
- Data: loadGeoJSON, loadKML
```

---

## Verification Checklist

After all phases complete, verify:

1. [ ] `npm run build` succeeds with no errors
2. [ ] All 85 tools listed in cesium-mcp-server.ts
3. [ ] Training data has 15k+ examples
4. [ ] addSphere has 15%+ of training examples
5. [ ] "add sphere to tokyo" produces addSphere tool call
6. [ ] "draw circle around paris" produces addCircle tool call
7. [ ] "fly to the marker" produces flyToEntity tool call
8. [ ] All scene settings work (fog, shadows, lighting)

---

## Quick Reference: File Locations

| Task | File |
|------|------|
| Tool definitions | `src/mcp/cesium-mcp-server.ts` |
| Type definitions | `src/cesium/types.ts` |
| CZML generators | `src/cesium/czml-generator.ts` |
| Command handlers | `src/cesium/command-executor.ts` |
| Training generator | `training/generate-training-data.ts` |
| System prompts | `src/llm/prompts.ts` |
| Fine-tune config | `training/finetune-config.json` |

---

## Ralph-Loop Command

To run all parallelizable tasks:

```
Implement all Phase 1 and Phase 2 tasks from tasks.md in parallel:
- Phase 1 has 6 independent streams (MCP Server tools)
- Phase 2 has 4 independent streams (Training data)
Run npm run build after each stream completes to verify.
Mark items complete in tasks.md as you finish them.
```
