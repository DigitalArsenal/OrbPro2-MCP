# OrbPro2 MCP API Reference

Comprehensive API documentation for the OrbPro2 MCP (Small Language Model) project - a browser-based natural language interface for controlling CesiumJS 3D globe visualization.

## Table of Contents

1. [Overview](#overview)
2. [MCP Tools Reference](#mcp-tools-reference)
3. [WebLLM Configuration](#webllm-configuration)
4. [CZML Generation Functions](#czml-generation-functions)
5. [Type Definitions](#type-definitions)
6. [Example Code Snippets](#example-code-snippets)

---

## Overview

### Project Architecture

The OrbPro2 MCP project provides a complete pipeline for natural language control of a CesiumJS 3D globe:

```
┌─────────────────────────────────────────────────────────────┐
│                        Browser                              │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │   WebLLM     │  │  MCP Server  │  │    CesiumJS      │  │
│  │  (WebGPU)    │──│  (In-Browser)│──│    Viewer        │  │
│  └──────────────┘  └──────────────┘  └──────────────────┘  │
│         │                 │                   │             │
│         ▼                 ▼                   ▼             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │   Command    │  │    CZML      │  │    Command       │  │
│  │   Parser     │  │  Generator   │  │    Executor      │  │
│  └──────────────┘  └──────────────┘  └──────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### Core Components

| Component | File | Description |
|-----------|------|-------------|
| WebLLM Engine | `src/llm/web-llm-engine.ts` | Browser-based LLM inference using WebGPU |
| MCP Server | `src/mcp/cesium-mcp-server.ts` | Model Context Protocol tool definitions |
| CZML Generator | `src/cesium/czml-generator.ts` | CZML document creation for entities |
| Command Parser | `src/llm/command-parser.ts` | Parses LLM outputs into CesiumJS commands |
| Command Executor | `src/cesium/command-executor.ts` | Executes commands against CesiumJS Viewer |
| Types | `src/cesium/types.ts` | TypeScript type definitions |

### Data Flow

1. User enters a natural language command
2. WebLLM processes the input and generates tool calls
3. MCP Server validates and routes tool calls
4. CZML Generator creates entity definitions
5. Command Executor applies changes to the CesiumJS Viewer

---

## MCP Tools Reference

The MCP (Model Context Protocol) Server exposes tools that allow the LLM to control CesiumJS. Each tool has a defined schema, parameters, and expected response format.

### Camera Controls

#### flyTo

Fly the camera to a specific geographic location with smooth animation.

**Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `longitude` | `number` | Yes | - | Longitude in degrees (-180 to 180) |
| `latitude` | `number` | Yes | - | Latitude in degrees (-90 to 90) |
| `height` | `number` | No | `1000000` | Camera height in meters |
| `duration` | `number` | No | - | Flight duration in seconds |

**Example Usage:**

```json
{
  "tool": "flyTo",
  "arguments": {
    "longitude": 2.2945,
    "latitude": 48.8584,
    "height": 10000,
    "duration": 3
  }
}
```

**Response Format:**

```json
{
  "success": true,
  "message": "Camera flying to destination",
  "data": {
    "destination": {
      "longitude": 2.2945,
      "latitude": 48.8584,
      "height": 10000
    }
  }
}
```

---

#### lookAt

Orient the camera to look at a specific location from a given distance.

**Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `longitude` | `number` | Yes | - | Target longitude in degrees |
| `latitude` | `number` | Yes | - | Target latitude in degrees |
| `range` | `number` | No | - | Distance from target in meters |

**Example Usage:**

```json
{
  "tool": "lookAt",
  "arguments": {
    "longitude": -122.4194,
    "latitude": 37.7749,
    "range": 50000
  }
}
```

**Response Format:**

```json
{
  "success": true,
  "message": "Camera oriented to target",
  "data": {
    "target": {
      "longitude": -122.4194,
      "latitude": 37.7749
    },
    "offset": {
      "heading": 0,
      "pitch": -0.7854,
      "range": 50000
    }
  }
}
```

---

#### zoom

Zoom the camera in or out by a specified amount.

**Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `amount` | `number` | Yes | - | Zoom amount (positive = in, negative = out) |

**Example Usage:**

```json
{
  "tool": "zoom",
  "arguments": {
    "amount": 0.5
  }
}
```

**Response Format:**

```json
{
  "success": true,
  "message": "Camera zoomed",
  "data": {
    "amount": 0.5
  }
}
```

---

### Entity Creation

#### addPoint

Add a point marker at a geographic location.

**Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `longitude` | `number` | Yes | - | Longitude in degrees |
| `latitude` | `number` | Yes | - | Latitude in degrees |
| `name` | `string` | No | `"Point"` | Label for the point |
| `color` | `string` | No | `"red"` | Point color (see [Color Values](#color-values)) |
| `size` | `number` | No | `10` | Point size in pixels |

**Example Usage:**

```json
{
  "tool": "addPoint",
  "arguments": {
    "longitude": -73.9857,
    "latitude": 40.7484,
    "name": "Empire State Building",
    "color": "blue",
    "size": 12
  }
}
```

**Response Format:**

```json
{
  "success": true,
  "message": "Point added",
  "data": {
    "entityId": "point_1_1705123456789"
  }
}
```

---

#### addLabel

Add a text label at a geographic location.

**Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `longitude` | `number` | Yes | - | Longitude in degrees |
| `latitude` | `number` | Yes | - | Latitude in degrees |
| `text` | `string` | Yes | - | Label text |
| `color` | `string` | No | `"white"` | Text color |

**Example Usage:**

```json
{
  "tool": "addLabel",
  "arguments": {
    "longitude": 139.6917,
    "latitude": 35.6895,
    "text": "Tokyo",
    "color": "yellow"
  }
}
```

**Response Format:**

```json
{
  "success": true,
  "message": "Label added",
  "data": {
    "entityId": "label_1_1705123456789"
  }
}
```

---

#### addPolyline

Draw a line connecting multiple geographic points.

**Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `positions` | `Position[]` | Yes | - | Array of positions (minimum 2) |
| `name` | `string` | No | `"Polyline"` | Name for the line |
| `color` | `string` | No | `"blue"` | Line color |
| `width` | `number` | No | `3` | Line width in pixels |

**Position Object:**

```typescript
{
  longitude: number;  // degrees
  latitude: number;   // degrees
  height?: number;    // meters (optional)
}
```

**Example Usage:**

```json
{
  "tool": "addPolyline",
  "arguments": {
    "positions": [
      { "longitude": -0.1276, "latitude": 51.5074 },
      { "longitude": 2.3522, "latitude": 48.8566 }
    ],
    "name": "London to Paris",
    "color": "green",
    "width": 4
  }
}
```

**Response Format:**

```json
{
  "success": true,
  "message": "Polyline added",
  "data": {
    "entityId": "polyline_1_1705123456789"
  }
}
```

---

#### addPolygon

Draw a filled polygon with multiple vertices.

**Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `positions` | `Position[]` | Yes | - | Array of vertex positions (minimum 3) |
| `name` | `string` | No | `"Polygon"` | Name for the polygon |
| `color` | `string` | No | `"blue"` | Fill color |
| `extrudedHeight` | `number` | No | - | Height to extrude the polygon (for 3D effect) |

**Example Usage:**

```json
{
  "tool": "addPolygon",
  "arguments": {
    "positions": [
      { "longitude": -74.0060, "latitude": 40.7128 },
      { "longitude": -73.9352, "latitude": 40.7128 },
      { "longitude": -73.9352, "latitude": 40.7614 },
      { "longitude": -74.0060, "latitude": 40.7614 }
    ],
    "name": "Manhattan Area",
    "color": "purple",
    "extrudedHeight": 500
  }
}
```

**Response Format:**

```json
{
  "success": true,
  "message": "Polygon added",
  "data": {
    "entityId": "polygon_1_1705123456789"
  }
}
```

---

#### addCircle

Draw a circle at a geographic location with a specified radius.

**Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `longitude` | `number` | Yes | - | Center longitude in degrees |
| `latitude` | `number` | Yes | - | Center latitude in degrees |
| `radius` | `number` | Yes | - | Circle radius in meters |
| `name` | `string` | No | `"Circle"` | Name for the circle |
| `color` | `string` | No | `"blue"` | Fill color |

**Example Usage:**

```json
{
  "tool": "addCircle",
  "arguments": {
    "longitude": 139.6917,
    "latitude": 35.6895,
    "radius": 50000,
    "name": "Tokyo 50km Radius",
    "color": "cyan"
  }
}
```

**Response Format:**

```json
{
  "success": true,
  "message": "Circle added",
  "data": {
    "entityId": "ellipse_1_1705123456789"
  }
}
```

---

### Entity Management

#### removeEntity

Remove an entity from the scene by its ID.

**Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `id` | `string` | Yes | - | Entity ID to remove |

**Example Usage:**

```json
{
  "tool": "removeEntity",
  "arguments": {
    "id": "point_1_1705123456789"
  }
}
```

**Response Format:**

```json
{
  "success": true,
  "message": "Entity removed",
  "data": {
    "removedId": "point_1_1705123456789"
  }
}
```

---

#### clearAll

Remove all entities from the scene.

**Parameters:** None

**Example Usage:**

```json
{
  "tool": "clearAll",
  "arguments": {}
}
```

**Response Format:**

```json
{
  "success": true,
  "message": "All entities cleared",
  "data": {
    "action": "clearAll"
  }
}
```

---

### Scene Control

#### setSceneMode

Change the scene viewing mode between 2D, 3D, and Columbus View.

**Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `mode` | `string` | Yes | - | Scene mode: `"2D"`, `"3D"`, or `"COLUMBUS_VIEW"` |

**Example Usage:**

```json
{
  "tool": "setSceneMode",
  "arguments": {
    "mode": "2D"
  }
}
```

**Response Format:**

```json
{
  "success": true,
  "message": "Scene mode changed to 2D",
  "data": {
    "mode": "2D"
  }
}
```

---

### Time Controls

#### setTime

Set the simulation time and optionally the time multiplier.

**Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `time` | `string` | Yes | - | ISO 8601 date-time string |
| `multiplier` | `number` | No | `1` | Time multiplier for animation speed |

**Example Usage:**

```json
{
  "tool": "setTime",
  "arguments": {
    "time": "2024-01-01T12:00:00Z",
    "multiplier": 60
  }
}
```

**Response Format:**

```json
{
  "success": true,
  "message": "Time set",
  "data": {
    "currentTime": "2024-01-01T12:00:00Z",
    "multiplier": 60
  }
}
```

---

#### playAnimation

Start time animation playback.

**Parameters:** None

**Example Usage:**

```json
{
  "tool": "playAnimation",
  "arguments": {}
}
```

**Response Format:**

```json
{
  "success": true,
  "message": "Animation playing"
}
```

---

#### pauseAnimation

Pause time animation playback.

**Parameters:** None

**Example Usage:**

```json
{
  "tool": "pauseAnimation",
  "arguments": {}
}
```

**Response Format:**

```json
{
  "success": true,
  "message": "Animation paused"
}
```

---

### CZML Generation

#### generateCZML

Generate a CZML document from a collection of entity definitions.

**Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `entities` | `EntityDef[]` | Yes | - | Array of entity definitions |
| `documentName` | `string` | No | `"Generated CZML"` | Name for the CZML document |

**Entity Definition Object:**

```typescript
{
  type: 'point' | 'label' | 'polyline' | 'polygon' | 'circle';
  position?: { longitude: number; latitude: number; height?: number };
  positions?: Position[];  // For polyline/polygon
  name?: string;
  text?: string;           // For labels
  color?: string;
  radius?: number;         // For circles
}
```

**Example Usage:**

```json
{
  "tool": "generateCZML",
  "arguments": {
    "entities": [
      {
        "type": "point",
        "position": { "longitude": -122.4194, "latitude": 37.7749 },
        "name": "San Francisco",
        "color": "red"
      },
      {
        "type": "label",
        "position": { "longitude": -122.4194, "latitude": 37.7749 },
        "text": "SF",
        "color": "white"
      }
    ],
    "documentName": "San Francisco Markers"
  }
}
```

**Response Format:**

```json
{
  "success": true,
  "message": "CZML generated",
  "data": {
    "czml": [
      {
        "id": "document",
        "name": "San Francisco Markers",
        "version": "1.0"
      },
      {
        "id": "point_1_1705123456789",
        "name": "San Francisco",
        "position": { "cartographicDegrees": [-122.4194, 37.7749, 0] },
        "point": { "color": { "rgba": [255, 0, 0, 255] }, "pixelSize": 10 }
      }
    ]
  }
}
```

---

### Animation Tools

#### trackVehicle

Track a moving vehicle or aircraft with animated position updates along a defined path.

**Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `positions` | `Position[]` | Yes | - | Array of positions along the track (minimum 2) |
| `timestamps` | `string[]` | Yes | - | ISO 8601 timestamps for each position |
| `name` | `string` | No | `"Vehicle"` | Name for the vehicle |
| `color` | `string` | No | `"yellow"` | Trail color |
| `width` | `number` | No | `3` | Trail width in pixels |
| `showPath` | `boolean` | No | `true` | Show the trail path |
| `trailTime` | `number` | No | `3600` | Trail duration in seconds |
| `leadTime` | `number` | No | `0` | Lead time in seconds |
| `modelUrl` | `string` | No | - | URL to a 3D model (glTF/glb) |
| `modelScale` | `number` | No | `1` | Scale factor for the model |
| `orientAlongPath` | `boolean` | No | `true` | Orient model along movement direction |

**Example Usage:**

```json
{
  "tool": "trackVehicle",
  "arguments": {
    "positions": [
      { "longitude": -122.4194, "latitude": 37.7749, "height": 10000 },
      { "longitude": -118.2437, "latitude": 34.0522, "height": 10000 },
      { "longitude": -112.0740, "latitude": 33.4484, "height": 10000 }
    ],
    "timestamps": [
      "2024-01-01T10:00:00Z",
      "2024-01-01T11:00:00Z",
      "2024-01-01T12:00:00Z"
    ],
    "name": "Flight SF to Phoenix",
    "color": "orange",
    "showPath": true,
    "trailTime": 1800
  }
}
```

**Response Format:**

```json
{
  "success": true,
  "message": "Vehicle track created",
  "data": {
    "entityId": "vehicle_1_1705123456789",
    "czml": [ /* CZML document array */ ]
  }
}
```

---

#### addAnimatedPath

Add an animated path that draws itself progressively over time.

**Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `positions` | `Position[]` | Yes | - | Array of positions for the path (minimum 2) |
| `startTime` | `string` | Yes | - | ISO 8601 start time for the animation |
| `duration` | `number` | Yes | - | Duration in seconds to draw the entire path |
| `name` | `string` | No | `"Animated Line"` | Name for the path |
| `color` | `string` | No | `"blue"` | Path color |
| `width` | `number` | No | `3` | Path width in pixels |
| `clampToGround` | `boolean` | No | `true` | Clamp the path to terrain |
| `showPoint` | `boolean` | No | `true` | Show a tracing point |
| `pointColor` | `string` | No | Same as `color` | Tracing point color |
| `pointSize` | `number` | No | `12` | Tracing point size in pixels |

**Example Usage:**

```json
{
  "tool": "addAnimatedPath",
  "arguments": {
    "positions": [
      { "longitude": -0.1276, "latitude": 51.5074 },
      { "longitude": 2.3522, "latitude": 48.8566 },
      { "longitude": 12.4964, "latitude": 41.9028 },
      { "longitude": 23.7275, "latitude": 37.9838 }
    ],
    "startTime": "2024-01-01T00:00:00Z",
    "duration": 120,
    "name": "European Tour",
    "color": "green",
    "showPoint": true,
    "pointColor": "yellow"
  }
}
```

**Response Format:**

```json
{
  "success": true,
  "message": "Animated path created with 4 segments",
  "data": {
    "entityIds": [
      "animated_line_1_segment_0",
      "animated_line_1_segment_1",
      "animated_line_1_segment_2",
      "animated_line_1_tracer"
    ],
    "czml": [ /* CZML document array */ ]
  }
}
```

---

### Color Values

The following color names are supported for all color parameters:

| Color | RGB Value |
|-------|-----------|
| `red` | (255, 0, 0) |
| `green` | (0, 255, 0) |
| `blue` | (0, 0, 255) |
| `yellow` | (255, 255, 0) |
| `orange` | (255, 165, 0) |
| `purple` | (128, 0, 128) |
| `pink` | (255, 192, 203) |
| `cyan` | (0, 255, 255) |
| `white` | (255, 255, 255) |
| `black` | (0, 0, 0) |
| `gray` / `grey` | (128, 128, 128) |

---

## WebLLM Configuration

The WebLLM Engine handles browser-based LLM inference using WebGPU.

### LLMConfig Interface

```typescript
interface LLMConfig {
  modelId: string;           // Required: Model identifier
  temperature?: number;      // Default: 0.7
  topP?: number;             // Default: 0.9
  maxTokens?: number;        // Default: 512
  onProgress?: (progress: InitProgressReport) => void;
}
```

### Configuration Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `modelId` | `string` | Required | WebLLM model identifier |
| `temperature` | `number` | `0.7` | Sampling temperature (0-2). Higher = more creative |
| `topP` | `number` | `0.9` | Nucleus sampling threshold |
| `maxTokens` | `number` | `512` | Maximum tokens to generate |
| `onProgress` | `function` | - | Callback for model loading progress |

### Available Models

#### Small Models (Fast, 500MB-2GB)

Best for devices with limited GPU memory or when speed is priority.

| Model ID | Description |
|----------|-------------|
| `Qwen2.5-0.5B-Instruct-q4f16_1-MLC` | Smallest, fastest option |
| `Qwen2.5-1.5B-Instruct-q4f16_1-MLC` | Good balance for small model |
| `SmolLM2-360M-Instruct-q4f16_1-MLC` | Tiny but capable |
| `SmolLM2-1.7B-Instruct-q4f16_1-MLC` | Improved small model |

#### Medium Models (Balanced, 2-4GB)

Recommended for most use cases.

| Model ID | Description |
|----------|-------------|
| `Qwen2.5-3B-Instruct-q4f16_1-MLC` | Strong reasoning, good speed |
| `Phi-3.5-mini-instruct-q4f16_1-MLC` | Microsoft's efficient model |
| `gemma-2-2b-it-q4f16_1-MLC` | Google's instruction-tuned model |

#### Large Models (Powerful, 4-8GB)

For complex tasks requiring better understanding.

| Model ID | Description |
|----------|-------------|
| `Llama-3.2-3B-Instruct-q4f16_1-MLC` | Meta's latest small LLM |
| `Qwen2.5-7B-Instruct-q4f16_1-MLC` | High quality, needs more memory |
| `Mistral-7B-Instruct-v0.3-q4f16_1-MLC` | Excellent instruction following |

### Performance Considerations

| Factor | Recommendation |
|--------|----------------|
| **GPU Memory** | Small models: 4GB+, Medium: 6GB+, Large: 8GB+ |
| **First Load** | Models are cached after first download |
| **Inference Speed** | Smaller models = faster tokens/sec |
| **Quality** | Larger models = better reasoning |
| **Temperature** | Lower (0.3-0.5) for precise commands, Higher (0.7-1.0) for creativity |

### WebGPU Support Check

```typescript
import { checkWebGPUSupport } from './src/llm/web-llm-engine';

const { supported, adapter, error } = await checkWebGPUSupport();

if (!supported) {
  console.error('WebGPU not available:', error);
} else {
  console.log('WebGPU adapter:', adapter);
}
```

### Browser Requirements

| Browser | Minimum Version | Status |
|---------|-----------------|--------|
| Chrome | 113+ | Fully Supported |
| Edge | 113+ | Fully Supported |
| Firefox | N/A | In Development |
| Safari | N/A | In Development |

---

## CZML Generation Functions

The CZML Generator creates CZML (Cesium Language) documents for defining and animating entities.

### Core Functions

#### createCZMLDocument

Creates a CZML document header packet.

```typescript
function createCZMLDocument(
  name?: string,
  options?: {
    startTime?: string;
    stopTime?: string;
    currentTime?: string;
    multiplier?: number;
  }
): CZMLDocument
```

**Example:**

```typescript
const doc = createCZMLDocument('My Document', {
  startTime: '2024-01-01T00:00:00Z',
  stopTime: '2024-01-02T00:00:00Z',
  multiplier: 60
});
```

---

#### buildCZMLDocument

Builds a complete CZML document array from entities.

```typescript
function buildCZMLDocument(
  entities: CZMLPacket[],
  documentOptions?: {
    name?: string;
    startTime?: string;
    stopTime?: string;
    currentTime?: string;
    multiplier?: number;
  }
): CZMLDocumentArray
```

**Example:**

```typescript
const point = createPoint({ longitude: -122.4, latitude: 37.8 }, { name: 'SF' });
const czml = buildCZMLDocument([point], { name: 'San Francisco' });
// Returns: [{ id: 'document', ... }, { id: 'point_1_...', ... }]
```

---

### Entity Creation Functions

#### createPoint

Creates a CZML point packet.

```typescript
function createPoint(
  position: CartographicPosition,
  options?: {
    id?: string;
    name?: string;
    color?: string;
    pixelSize?: number;
    outlineColor?: string;
    outlineWidth?: number;
  }
): CZMLPacket
```

**Example:**

```typescript
const point = createPoint(
  { longitude: -73.9857, latitude: 40.7484 },
  { name: 'Empire State', color: 'yellow', pixelSize: 15 }
);
```

---

#### createLabel

Creates a CZML label packet.

```typescript
function createLabel(
  position: CartographicPosition,
  text: string,
  options?: {
    id?: string;
    font?: string;
    fillColor?: string;
    scale?: number;
    pixelOffset?: [number, number];
  }
): CZMLPacket
```

**Example:**

```typescript
const label = createLabel(
  { longitude: 2.2945, latitude: 48.8584 },
  'Eiffel Tower',
  { fillColor: 'white', scale: 1.2 }
);
```

---

#### createPolyline

Creates a CZML polyline packet.

```typescript
function createPolyline(
  positions: CartographicPosition[],
  options?: {
    id?: string;
    name?: string;
    color?: string;
    width?: number;
    clampToGround?: boolean;
  }
): CZMLPacket
```

**Example:**

```typescript
const line = createPolyline(
  [
    { longitude: -0.1276, latitude: 51.5074 },
    { longitude: 2.3522, latitude: 48.8566 }
  ],
  { name: 'London to Paris', color: 'blue', width: 4 }
);
```

---

#### createPolygon

Creates a CZML polygon packet.

```typescript
function createPolygon(
  positions: CartographicPosition[],
  options?: {
    id?: string;
    name?: string;
    color?: string;
    height?: number;
    extrudedHeight?: number;
    outline?: boolean;
    outlineColor?: string;
  }
): CZMLPacket
```

**Example:**

```typescript
const polygon = createPolygon(
  [
    { longitude: -74.01, latitude: 40.70 },
    { longitude: -73.97, latitude: 40.70 },
    { longitude: -73.97, latitude: 40.75 },
    { longitude: -74.01, latitude: 40.75 }
  ],
  { name: 'Manhattan', color: 'purple', extrudedHeight: 1000 }
);
```

---

#### createCircle

Creates a CZML circle (ellipse with equal axes) packet.

```typescript
function createCircle(
  position: CartographicPosition,
  radius: number,
  options?: {
    id?: string;
    name?: string;
    color?: string;
    height?: number;
    extrudedHeight?: number;
  }
): CZMLPacket
```

**Example:**

```typescript
const circle = createCircle(
  { longitude: 139.6917, latitude: 35.6895 },
  100000,  // 100km radius
  { name: 'Tokyo Area', color: 'cyan' }
);
```

---

#### createEllipse

Creates a CZML ellipse packet.

```typescript
function createEllipse(
  position: CartographicPosition,
  semiMajorAxis: number,
  semiMinorAxis: number,
  options?: {
    id?: string;
    name?: string;
    color?: string;
    height?: number;
    extrudedHeight?: number;
    rotation?: number;
  }
): CZMLPacket
```

---

#### createBox

Creates a CZML box packet.

```typescript
function createBox(
  position: CartographicPosition,
  dimensions: { x: number; y: number; z: number },
  options?: {
    id?: string;
    name?: string;
    color?: string;
  }
): CZMLPacket
```

---

#### createModel

Creates a CZML model packet for 3D glTF models.

```typescript
function createModel(
  position: CartographicPosition,
  gltfUrl: string,
  options?: {
    id?: string;
    name?: string;
    scale?: number;
    minimumPixelSize?: number;
  }
): CZMLPacket
```

---

#### createBillboard

Creates a CZML billboard packet.

```typescript
function createBillboard(
  position: CartographicPosition,
  imageUrl: string,
  options?: {
    id?: string;
    name?: string;
    scale?: number;
  }
): CZMLPacket
```

---

### Animation Functions

#### createSatelliteOrbit

Creates CZML packets for a satellite orbit from TLE (Two-Line Element) data.

```typescript
function createSatelliteOrbit(
  tle: TLEData,
  options?: {
    id?: string;
    name?: string;
    startTime?: string;
    stopTime?: string;
    sampleCount?: number;
    color?: string;
    width?: number;
    showPath?: boolean;
    leadTime?: number;
    trailTime?: number;
    showPoint?: boolean;
    pointColor?: string;
    pointSize?: number;
  }
): CZMLPacket[]
```

**Example:**

```typescript
const issOrbit = createSatelliteOrbit(
  {
    line1: '1 25544U 98067A   24001.50000000  .00016717  00000-0  10270-3 0  9999',
    line2: '2 25544  51.6400 123.4500 0006976  45.6789 314.5678 15.49234567123456'
  },
  {
    name: 'International Space Station',
    color: 'yellow',
    showPath: true,
    trailTime: 2700  // 45 minutes
  }
);
```

---

#### createVehicleTrack

Creates a CZML packet for an animated vehicle/aircraft track.

```typescript
function createVehicleTrack(
  positions: CartographicPosition[],
  timestamps: string[],
  options?: {
    id?: string;
    name?: string;
    color?: string;
    width?: number;
    showPath?: boolean;
    leadTime?: number;
    trailTime?: number;
    showPoint?: boolean;
    pointColor?: string;
    pointSize?: number;
    modelUrl?: string;
    modelScale?: number;
    orientAlongPath?: boolean;
  }
): CZMLPacket
```

**Example:**

```typescript
const flight = createVehicleTrack(
  [
    { longitude: -122.4, latitude: 37.8, height: 10000 },
    { longitude: -118.2, latitude: 34.0, height: 10000 }
  ],
  [
    '2024-01-01T10:00:00Z',
    '2024-01-01T11:30:00Z'
  ],
  {
    name: 'SFO to LAX',
    color: 'orange',
    modelUrl: '/models/aircraft.glb',
    modelScale: 500,
    orientAlongPath: true
  }
);
```

---

#### createTimeDynamicPoint

Creates a point that appears/disappears at specific times.

```typescript
function createTimeDynamicPoint(
  position: CartographicPosition,
  availability: string,
  options?: {
    id?: string;
    name?: string;
    color?: string;
    pixelSize?: number;
    outlineColor?: string;
    outlineWidth?: number;
  }
): CZMLPacket
```

**Example:**

```typescript
const event = createTimeDynamicPoint(
  { longitude: -122.4, latitude: 37.8 },
  '2024-01-01T10:00:00Z/2024-01-01T12:00:00Z',
  { name: 'Event Location', color: 'red', pixelSize: 20 }
);
```

---

#### createPulsatingMarker

Creates an animated pulsating circle effect.

```typescript
function createPulsatingMarker(
  position: CartographicPosition,
  options?: {
    id?: string;
    name?: string;
    startTime?: string;
    stopTime?: string;
    baseRadius?: number;
    maxRadius?: number;
    pulsePeriod?: number;
    color?: string;
    pulseCount?: number;
  }
): CZMLPacket[]
```

**Example:**

```typescript
const pulse = createPulsatingMarker(
  { longitude: -122.4, latitude: 37.8 },
  {
    name: 'Alert',
    baseRadius: 100,
    maxRadius: 500,
    pulsePeriod: 2,
    color: 'red'
  }
);
```

---

#### createAnimatedPolyline

Creates an animated polyline that "draws itself" over time.

```typescript
function createAnimatedPolyline(
  positions: CartographicPosition[],
  startTime: string,
  duration: number,
  options?: {
    id?: string;
    name?: string;
    color?: string;
    width?: number;
    clampToGround?: boolean;
    showPoint?: boolean;
    pointColor?: string;
    pointSize?: number;
  }
): CZMLPacket[]
```

**Example:**

```typescript
const animatedPath = createAnimatedPolyline(
  [
    { longitude: -0.1276, latitude: 51.5074 },
    { longitude: 2.3522, latitude: 48.8566 },
    { longitude: 12.4964, latitude: 41.9028 }
  ],
  '2024-01-01T00:00:00Z',
  60,  // 60 seconds
  {
    name: 'Europe Tour',
    color: 'green',
    showPoint: true,
    pointColor: 'yellow'
  }
);
```

---

### Utility Functions

#### createColor

Creates a CZML color object from RGBA values.

```typescript
function createColor(r: number, g: number, b: number, a?: number): CZMLColor
```

---

#### createColorFromName

Creates a CZML color object from a color name.

```typescript
function createColorFromName(colorName: string): CZMLColor
```

---

#### positionToCartographicDegrees

Converts a position object to cartographicDegrees array.

```typescript
function positionToCartographicDegrees(pos: CartographicPosition): number[]
```

---

#### createSolidColorMaterial

Creates a solid color material for CZML entities.

```typescript
function createSolidColorMaterial(color: CZMLColor): CZMLMaterial
```

---

## Type Definitions

### Position Types

```typescript
interface CartographicPosition {
  longitude: number;  // degrees (-180 to 180)
  latitude: number;   // degrees (-90 to 90)
  height?: number;    // meters above ellipsoid
}

interface Cartesian3Position {
  x: number;
  y: number;
  z: number;
}

type Position = CartographicPosition | Cartesian3Position;
```

### Command Types

```typescript
// Camera commands
interface CameraFlyToCommand {
  type: 'camera.flyTo';
  destination: CartographicPosition;
  orientation?: { heading?: number; pitch?: number; roll?: number };
  duration?: number;
}

interface CameraLookAtCommand {
  type: 'camera.lookAt';
  target: CartographicPosition;
  offset?: { heading: number; pitch: number; range: number };
}

interface CameraZoomCommand {
  type: 'camera.zoom';
  amount: number;
}

// Entity commands
interface AddEntityCommand {
  type: 'entity.add';
  entity: CZMLEntity;
}

interface RemoveEntityCommand {
  type: 'entity.remove';
  id: string;
}

// Scene commands
interface SetSceneMode {
  type: 'scene.mode';
  mode: '2D' | '3D' | 'COLUMBUS_VIEW';
}

// Time commands
interface SetTimeCommand {
  type: 'time.set';
  currentTime?: string;
  startTime?: string;
  stopTime?: string;
  multiplier?: number;
}

interface PlayTimeCommand {
  type: 'time.play';
}

interface PauseTimeCommand {
  type: 'time.pause';
}
```

### CZML Types

```typescript
interface CZMLPacket {
  id: string;
  name?: string;
  description?: string;
  availability?: string;
  position?: CZMLPosition;
  orientation?: CZMLOrientation;
  billboard?: CZMLBillboard;
  label?: CZMLLabel;
  point?: CZMLPoint;
  polyline?: CZMLPolyline;
  polygon?: CZMLPolygon;
  ellipse?: CZMLEllipse;
  box?: CZMLBox;
  model?: CZMLModel;
  path?: CZMLPath;
}

interface CZMLDocument extends CZMLPacket {
  id: 'document';
  version: '1.0';
  clock?: CZMLClock;
}

interface CZMLColor {
  rgba?: number[];   // [r, g, b, a] 0-255
  rgbaf?: number[];  // [r, g, b, a] 0-1
}

interface CZMLPosition {
  cartographicDegrees?: number[] | (string | number)[];
  cartesian?: number[] | (string | number)[];
  epoch?: string;
  interpolationAlgorithm?: 'LINEAR' | 'LAGRANGE' | 'HERMITE';
  interpolationDegree?: number;
  referenceFrame?: 'FIXED' | 'INERTIAL';
}

type CZMLDocumentArray = [CZMLDocument, ...CZMLPacket[]];
```

### TLE Data

```typescript
interface TLEData {
  line1: string;  // TLE line 1 (69 characters)
  line2: string;  // TLE line 2 (69 characters)
}
```

### LLM Response Types

```typescript
interface LLMResponse {
  content: string;
  toolCalls?: ToolCall[];
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

interface ToolCall {
  name: string;
  arguments: Record<string, unknown>;
}

interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: object;
}
```

---

## Example Code Snippets

### Basic Application Setup

```typescript
import { CesiumSLMApp } from './src/app';

const app = new CesiumSLMApp();

await app.initialize({
  cesiumContainer: 'cesium-container',
  chatContainer: 'chat-container',
  statusContainer: 'status-container',
  modelSelectorContainer: 'model-selector-container',
  cesiumToken: 'your-cesium-ion-token',
});
```

### Using WebLLM Independently

```typescript
import { WebLLMEngine, RECOMMENDED_MODELS } from './src/llm/web-llm-engine';

// Initialize with a small model
const llm = new WebLLMEngine({
  modelId: RECOMMENDED_MODELS.small[1], // Qwen2.5-1.5B
  temperature: 0.5,
  maxTokens: 256,
  onProgress: (p) => {
    console.log(`Loading: ${(p.progress * 100).toFixed(1)}%`);
  },
});

await llm.initialize();

// Generate response
const response = await llm.generate('Show me Paris');
console.log('Response:', response.content);

if (response.toolCalls) {
  console.log('Tool calls:', response.toolCalls);
}
```

### Streaming Responses

```typescript
const response = await llm.generateStream(
  'Add a marker at the Eiffel Tower',
  (token) => {
    process.stdout.write(token);
  }
);

console.log('\nFinal response:', response.content);
```

### Creating and Loading CZML

```typescript
import * as czml from './src/cesium/czml-generator';

// Create multiple entities
const entities = [
  czml.createPoint(
    { longitude: -122.4194, latitude: 37.7749 },
    { name: 'San Francisco', color: 'red' }
  ),
  czml.createPoint(
    { longitude: -118.2437, latitude: 34.0522 },
    { name: 'Los Angeles', color: 'blue' }
  ),
  czml.createPolyline(
    [
      { longitude: -122.4194, latitude: 37.7749 },
      { longitude: -118.2437, latitude: 34.0522 }
    ],
    { name: 'SF to LA', color: 'green', width: 3 }
  )
];

// Build complete CZML document
const czmlDoc = czml.buildCZMLDocument(entities, {
  name: 'California Cities',
});

// Load into Cesium viewer
viewer.dataSources.add(
  Cesium.CzmlDataSource.load(czmlDoc)
);
```

### Tracking a Satellite

```typescript
import { createSatelliteOrbit, buildCZMLDocument } from './src/cesium/czml-generator';

// ISS TLE data (example)
const issTLE = {
  line1: '1 25544U 98067A   24001.50000000  .00016717  00000-0  10270-3 0  9999',
  line2: '2 25544  51.6400 123.4500 0006976  45.6789 314.5678 15.49234567123456'
};

// Create orbit visualization
const orbitPackets = createSatelliteOrbit(issTLE, {
  name: 'ISS',
  color: 'yellow',
  showPath: true,
  trailTime: 2700,
  showPoint: true,
  pointColor: 'white'
});

// Build and load CZML
const czmlDoc = buildCZMLDocument(orbitPackets, {
  name: 'ISS Orbit',
  startTime: new Date().toISOString(),
  stopTime: new Date(Date.now() + 5400000).toISOString(), // 90 minutes
});

const dataSource = await Cesium.CzmlDataSource.load(czmlDoc);
viewer.dataSources.add(dataSource);

// Start animation
viewer.clock.shouldAnimate = true;
```

### Creating Animated Flight Path

```typescript
import { createVehicleTrack, buildCZMLDocument } from './src/cesium/czml-generator';

const flightPath = createVehicleTrack(
  [
    { longitude: -122.3750, latitude: 37.6189, height: 0 },      // SFO
    { longitude: -121.5000, latitude: 36.5000, height: 10000 },  // Climbing
    { longitude: -119.0000, latitude: 35.0000, height: 11000 },  // Cruising
    { longitude: -118.4085, latitude: 33.9425, height: 0 },      // LAX
  ],
  [
    '2024-01-01T10:00:00Z',
    '2024-01-01T10:15:00Z',
    '2024-01-01T10:45:00Z',
    '2024-01-01T11:30:00Z',
  ],
  {
    name: 'SFO to LAX',
    color: 'orange',
    showPath: true,
    trailTime: 1800,
    modelUrl: '/models/aircraft.glb',
    modelScale: 500,
    orientAlongPath: true,
  }
);

const czmlDoc = buildCZMLDocument([flightPath], {
  name: 'Flight Tracker',
  startTime: '2024-01-01T10:00:00Z',
  stopTime: '2024-01-01T11:30:00Z',
  multiplier: 60,
});

viewer.dataSources.add(Cesium.CzmlDataSource.load(czmlDoc));
viewer.clock.shouldAnimate = true;
```

### Processing Natural Language Commands

```typescript
import { WebLLMEngine } from './src/llm/web-llm-engine';
import { CommandParser } from './src/llm/command-parser';
import { CesiumCommandExecutor } from './src/cesium/command-executor';

// Setup components
const llm = new WebLLMEngine({ modelId: 'Qwen2.5-1.5B-Instruct-q4f16_1-MLC' });
await llm.initialize();

const parser = new CommandParser();
const executor = new CesiumCommandExecutor(viewer);

// Process user input
async function processCommand(userInput: string) {
  // Get LLM response
  const response = await llm.generate(userInput);

  // Parse tool calls
  if (response.toolCalls) {
    for (const toolCall of response.toolCalls) {
      const command = parser.toolCallToCommand(toolCall);
      if (command) {
        await executor.execute(command);
      }
    }
  }

  return response.content;
}

// Example usage
await processCommand('Fly to Paris and add a red marker');
await processCommand('Draw a circle with 10km radius around the Eiffel Tower');
await processCommand('Switch to 2D mode');
```

---

## Resources

- [CesiumJS Documentation](https://cesium.com/learn/cesiumjs/)
- [CZML Guide](https://github.com/AnalyticalGraphicsInc/czml-writer/wiki/CZML-Guide)
- [web-llm Repository](https://github.com/mlc-ai/web-llm)
- [Model Context Protocol](https://modelcontextprotocol.io/)
- [WebGPU Specification](https://www.w3.org/TR/webgpu/)
