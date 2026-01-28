# OrbPro2 MCP - Architecture & Development Tasks

This document tracks the architectural improvements and development tasks for the Cesium Small Language Model project.

---

## Current Architecture

- **WASM MCP Server**: C++ MCP server compiled to WebAssembly
- **Location Database**: 56K+ locations compiled into WASM (inefficient)
- **LLM Support**: WebLLM (browser) + API providers (Ollama, OpenAI, etc.)
- **Protocol**: JSON-RPC 2.0 over MCP

---

## PRIORITY 1: Binary Location Database

### Completed
- [x] Designed binary database format (header + fixed-size records + string table)
- [x] Created build script skeleton (`scripts/build-binary-locations.mjs`)
- [x] Added all 50 US states + DC + territories with aliases

### In Progress
- [ ] Fetch US Census cities (population > 1000) with coordinates
- [ ] Integrate SimpleMaps or GeoNames dataset for city coordinates
- [ ] Update C++ to load binary database at runtime (separate from WASM)

### Binary Format Spec
```
Header (64 bytes):
  Magic: "LOCDB001" (8 bytes)
  Version: uint32
  Flags: uint32
  Location count: uint32
  Record size: uint32
  String table offset: uint64
  String table size: uint64
  Reserved: 24 bytes

Location Record (28 bytes):
  Name offset: uint32
  Name length: uint16
  Type flags: uint16
  Longitude: float32
  Latitude: float32
  Heading: float32
  Population: uint32
  Reserved: uint32
```

---

## PRIORITY 2: Camera-Aware "Here" Tools

### Completed
- [x] Added camera state tracking to C++ WASM (`setCameraState`, `getCameraTarget`)
- [x] Added `addSphereHere`, `addBoxHere`, `addPointHere`, `addLabelHere`, `addCylinderHere`
- [x] Added `addCircleHere`, `addModelHere`, `addPolygonHere`
- [x] Added `addEntityHere` (generic tool routing to appropriate type)

### To Do
- [ ] Wire up camera state updates from Cesium viewer to WASM
- [ ] Add `addPolylineHere` (with configurable length/direction)
- [ ] Add `addRectangleHere` (with configurable size)

---

## PRIORITY 3: Comprehensive City Database

### Data Sources (choose one or combine)
1. **US Census Bureau API** - Population data (no coordinates)
2. **SimpleMaps US Cities** - Free dataset with coordinates
3. **GeoNames** - Global cities with population thresholds
4. **OpenStreetMap/Nominatim** - Open data

### Requirements
- All US cities > 1000 population (~10,000 cities)
- Major international cities (~5,000)
- Key landmarks and POIs (~2,000)
- Total target: ~75,000 entries

### Build Pipeline
```bash
# Fetch data
npm run fetch:census     # US population data
npm run fetch:geonames   # City coordinates

# Merge and deduplicate
npm run build:locations

# Generate binary database
npm run build:location-db
```

---

## PRIORITY 4: Model Fine-Tuning Pipeline

### Completed
- [x] Basic training data generator
- [x] LoRA fine-tuning script
- [x] MLX export for Apple Silicon

### To Do
- [ ] Update training data with new "Here" tools
- [ ] Train 1.5B and 3B parameter variants
- [ ] Evaluate on compound command test suite

---

## Quick Commands

```bash
# Development
npm run dev                 # Start dev server (auto-rebuilds WASM)
npm run build:wasm          # Build WASM only

# Database
npm run build:location-db   # Build binary location database

# Training
npm run train:generate      # Generate training data
npm run train:finetune      # Run LoRA fine-tuning
```

---

## File Structure

```
packages/
  mcp-server-cpp/           # C++/WASM MCP server
    src/
      mcp_server.cpp        # Main server logic
      location_database.cpp # Location lookup (to be replaced)
    include/
      location_db_format.h  # Binary format definitions
    data/
      locations.bin         # Binary location database

scripts/
  build-binary-locations.mjs  # Binary database builder
  fetch-census-data.mjs       # Census API fetcher
  fetch-geonames.mjs          # GeoNames fetcher

src/
  mcp/
    wasm-mcp-server.ts      # WASM wrapper
  llm/
    api-llm-engine.ts       # API-based LLM inference
    web-llm-engine.ts       # Browser-based inference
```
