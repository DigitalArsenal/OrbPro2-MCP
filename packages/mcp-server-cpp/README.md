# Cesium MCP Server (C++/WebAssembly)

High-performance MCP (Model Context Protocol) server for CesiumJS control, compiled from C++ to WebAssembly.

## Features

- **Location Database**: 500+ pre-defined locations including cities, landmarks, airports, and scientific facilities
- **Location Aliases**: Supports nicknames ("Beantown" for Boston, "Chi-town" for Chicago)
- **Fast JSON-RPC**: Lightweight JSON-RPC 2.0 parser optimized for WASM
- **pthreads Support**: Built with pthread support for multi-threaded operations

## Building

### Prerequisites

- CMake 3.16+
- Emscripten SDK (installed locally in `../emsdk`)
- Node.js (for header generation)

### Build Commands

```bash
# Build WebAssembly
npm run build

# Build native (for testing)
npm run build:native

# Run tests
npm run test
```

## Usage in JavaScript

```javascript
import createMcpServer from '@cesium-slm/mcp-server-wasm';

const server = await createMcpServer();

// Resolve a location
const result = server.ccall('resolveLocation', 'string', ['string'], ['seattle']);
console.log(result);  // {"found":true,"longitude":-122.332100,"latitude":47.606200}

// Handle MCP message
const response = server.ccall('handleMessage', 'string', ['string'], [
  '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{}}'
]);
```

## MCP Tools

### Location-Aware Tools (Recommended)

These tools use the built-in location database for deterministic coordinate resolution:

- `resolveLocation` - Resolve a location name to coordinates
- `flyToLocation` - Fly camera to a named location
- `addSphereAtLocation` - Add sphere at named location
- `addBoxAtLocation` - Add box at named location
- `addPointAtLocation` - Add point at named location
- `addLabelAtLocation` - Add label at named location
- `listLocations` - List all known locations

### Standard Cesium Tools

- `flyTo` - Fly to longitude/latitude
- `lookAt` - Look at a point
- `zoom` - Zoom in/out
- `addSphere`, `addBox`, `addCylinder` - Add geometry
- `addPoint`, `addLabel` - Add markers
- `removeEntity`, `clearAll` - Entity management

## Project Structure

```
packages/mcp-server-cpp/
├── include/              # C++ headers
│   ├── mcp_server.h
│   ├── location_database.h
│   ├── json_rpc.h
│   └── cesium_commands.h
├── src/                  # C++ source files
│   ├── mcp_server.cpp
│   ├── location_database.cpp
│   ├── json_rpc.cpp
│   └── main.cpp
├── scripts/              # Build scripts
│   ├── build-wasm.sh
│   └── build-native.sh
├── dist/                 # Build output
│   ├── cesium-mcp-wasm.js
│   └── cesium-mcp-wasm.wasm
└── CMakeLists.txt
```
