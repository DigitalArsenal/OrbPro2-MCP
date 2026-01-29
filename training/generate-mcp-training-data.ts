#!/usr/bin/env npx ts-node
/**
 * MCP Training Data Generator
 *
 * Generates training examples that match the EXACT tool names and parameter schemas
 * from the C++ WASM MCP server (packages/mcp-server-cpp/src/mcp_server.cpp).
 *
 * Output format: JSONL with {"instruction": "...", "output": "toolName,param1,param2,..."}
 * The output is a CSV tool call: toolName,param1,param2,...
 *
 * Usage:
 *   npx ts-node training/generate-mcp-training-data.ts [--count 100000] [--output training/mcp-training-data.jsonl]
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ============================================================================
// Location Database (subset for training - real coords from location_database.cpp)
// ============================================================================

interface Location {
  name: string;
  lon: number;
  lat: number;
  heading?: number;
  pop?: number;
}

const LOCATIONS: Location[] = [
  { name: 'New York City', lon: -74.006, lat: 40.7128, pop: 8336817 },
  { name: 'London', lon: -0.1276, lat: 51.5074, pop: 8982000 },
  { name: 'Paris', lon: 2.3522, lat: 48.8566, pop: 2161000 },
  { name: 'Tokyo', lon: 139.6917, lat: 35.6895, pop: 13960000 },
  { name: 'Sydney', lon: 151.2093, lat: -33.8688, pop: 5312000 },
  { name: 'Rome', lon: 12.4964, lat: 41.9028, pop: 2873000 },
  { name: 'Berlin', lon: 13.405, lat: 52.52, pop: 3645000 },
  { name: 'Moscow', lon: 37.6173, lat: 55.7558, pop: 12506000 },
  { name: 'Dubai', lon: 55.2708, lat: 25.2048, pop: 3331000 },
  { name: 'Singapore', lon: 103.8198, lat: 1.3521, pop: 5686000 },
  { name: 'San Francisco', lon: -122.4194, lat: 37.7749, pop: 874961 },
  { name: 'Los Angeles', lon: -118.2437, lat: 34.0522, pop: 3979576 },
  { name: 'Chicago', lon: -87.6298, lat: 41.8781, pop: 2693976 },
  { name: 'Toronto', lon: -79.3832, lat: 43.6532, pop: 2930000 },
  { name: 'Mumbai', lon: 72.8777, lat: 19.076, pop: 12442373 },
  { name: 'Shanghai', lon: 121.4737, lat: 31.2304, pop: 24870000 },
  { name: 'Beijing', lon: 116.4074, lat: 39.9042, pop: 21540000 },
  { name: 'Seoul', lon: 126.978, lat: 37.5665, pop: 9776000 },
  { name: 'Cairo', lon: 31.2357, lat: 30.0444, pop: 9540000 },
  { name: 'Istanbul', lon: 28.9784, lat: 41.0082, pop: 15462000 },
  { name: 'Bangkok', lon: 100.5018, lat: 13.7563, pop: 8281000 },
  { name: 'Buenos Aires', lon: -58.3816, lat: -34.6037, pop: 3054000 },
  { name: 'Mexico City', lon: -99.1332, lat: 19.4326, pop: 9209944 },
  { name: 'Lagos', lon: 3.3792, lat: 6.5244, pop: 15400000 },
  { name: 'Jakarta', lon: 106.8456, lat: -6.2088, pop: 10560000 },
  { name: 'Sao Paulo', lon: -46.6333, lat: -23.5505, pop: 12330000 },
  { name: 'Washington', lon: -77.0369, lat: 38.9072, pop: 689545 },
  { name: 'Miami', lon: -80.1918, lat: 25.7617, pop: 467963 },
  { name: 'Seattle', lon: -122.3321, lat: 47.6062, pop: 737015 },
  { name: 'Denver', lon: -104.9903, lat: 39.7392, pop: 715522 },
  { name: 'Boston', lon: -71.0589, lat: 42.3601, pop: 675647 },
  { name: 'Barcelona', lon: 2.1734, lat: 41.3851, pop: 1621000 },
  { name: 'Madrid', lon: -3.7038, lat: 40.4168, pop: 3223000 },
  { name: 'Amsterdam', lon: 4.9041, lat: 52.3676, pop: 821752 },
  { name: 'Vienna', lon: 16.3738, lat: 48.2082, pop: 1897000 },
  { name: 'Prague', lon: 14.4378, lat: 50.0755, pop: 1309000 },
  { name: 'Athens', lon: 23.7275, lat: 37.9838, pop: 664046 },
  { name: 'Lisbon', lon: -9.1393, lat: 38.7223, pop: 505526 },
  { name: 'Dublin', lon: -6.2603, lat: 53.3498, pop: 544107 },
  { name: 'Stockholm', lon: 18.0686, lat: 59.3293, pop: 975904 },
  { name: 'Oslo', lon: 10.7522, lat: 59.9139, pop: 693491 },
  { name: 'Helsinki', lon: 24.9384, lat: 60.1699, pop: 656229 },
  { name: 'Copenhagen', lon: 12.5683, lat: 55.6761, pop: 602481 },
  { name: 'Reykjavik', lon: -21.9426, lat: 64.1466, pop: 131136 },
  { name: 'Cape Town', lon: 18.4241, lat: -33.9249, pop: 4618000 },
  { name: 'Nairobi', lon: 36.8219, lat: -1.2921, pop: 4397073 },
  { name: 'Honolulu', lon: -157.8583, lat: 21.3069, pop: 350964 },
  { name: 'Anchorage', lon: -149.9003, lat: 61.2181, pop: 291247 },
  { name: 'Vancouver', lon: -123.1207, lat: 49.2827, pop: 631486 },
  { name: 'Montreal', lon: -73.5673, lat: 45.5017, pop: 1762949 },
];

// Landmarks (no coordinates - model should use location-aware tools)
const LANDMARKS: string[] = [
  'Eiffel Tower', 'Statue of Liberty', 'Colosseum', 'Big Ben', 'Taj Mahal',
  'Great Wall of China', 'Machu Picchu', 'Christ the Redeemer', 'Pyramids of Giza',
  'Sydney Opera House', 'Golden Gate Bridge', 'Brooklyn Bridge', 'Tower Bridge',
  'Burj Khalifa', 'Empire State Building', 'Times Square', 'Central Park',
  'Vatican', 'Buckingham Palace', 'Louvre Museum', 'Brandenburg Gate',
  'Acropolis', 'Petra', 'Angkor Wat', 'Hagia Sophia', 'Mount Fuji',
  'Grand Canyon', 'Niagara Falls', 'Stonehenge', 'Notre Dame Cathedral',
  'Sagrada Familia', 'Arc de Triomphe', 'Pantheon', 'Sistine Chapel',
  'Tower of London', 'Edinburgh Castle', 'Alcatraz Island', 'Hollywood Sign',
  'Lincoln Memorial', 'White House', 'Mount Rushmore', 'Space Needle',
  'CN Tower', 'Opera House', 'Forbidden City', 'Kremlin', 'Red Square',
  'SpaceX Starbase', 'Kennedy Space Center', 'CERN', 'NASA Goddard',
  'Pentagon', 'One World Trade Center', 'Willis Tower', 'Marina Bay Sands',
];

const COLORS = ['red', 'blue', 'green', 'yellow', 'cyan', 'magenta', 'orange', 'purple', 'pink', 'white', 'lime'];
const ENTITY_IDS = ['sphere-1', 'marker-1', 'box-1', 'my-label', 'point-1', 'route-1', 'polyline-1', 'building-1', 'model-1', 'circle-1'];
const POI_CATEGORIES = ['restaurant', 'hospital', 'park', 'airport', 'hotel', 'museum', 'pharmacy', 'school', 'bank', 'cafe', 'bar', 'library', 'police', 'fire_station', 'supermarket', 'bakery'];

// ============================================================================
// Random helpers
// ============================================================================

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]!;
}

function pickN<T>(arr: T[], n: number): T[] {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, n);
}

function rand(min: number, max: number): number {
  return Math.round((Math.random() * (max - min) + min) * 100) / 100;
}

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pickPair(): [Location, Location] {
  const a = pick(LOCATIONS);
  let b = pick(LOCATIONS);
  while (b.name === a.name) b = pick(LOCATIONS);
  return [a, b];
}

function pickLandmarkPair(): [string, string] {
  const a = pick(LANDMARKS);
  let b = pick(LANDMARKS);
  while (b === a) b = pick(LANDMARKS);
  return [a, b];
}

// ============================================================================
// Tool call generator: Returns {instruction, output} pairs
// Each tool has multiple natural language templates
// ============================================================================

type Example = { instruction: string; output: string };

// CSV column order per tool - must match CSV_SCHEMAS in web-llm-engine.ts
const CSV_SCHEMAS: Record<string, string[]> = {
  flyToLocation: ['location', 'height', 'duration'],
  flyTo: ['longitude', 'latitude', 'height', 'duration'],
  lookAt: ['longitude', 'latitude', 'range'],
  zoom: ['amount'],
  setView: ['longitude', 'latitude', 'height'],
  getCamera: [],
  addPointAtLocation: ['location', 'color'],
  addSphereAtLocation: ['location', 'radius', 'color', 'height'],
  addBoxAtLocation: ['location', 'dimensionX', 'dimensionY', 'dimensionZ', 'color', 'heading'],
  addLabelAtLocation: ['location', 'text'],
  addSensorConeAtLocation: ['location', 'radius', 'horizontalAngle', 'verticalAngle', 'heading', 'pitch', 'color', 'opacity'],
  addPoint: ['longitude', 'latitude', 'name', 'color'],
  addSphere: ['longitude', 'latitude', 'radius', 'color', 'height'],
  addBox: ['longitude', 'latitude', 'dimensionX', 'dimensionY', 'dimensionZ', 'color'],
  addLabel: ['longitude', 'latitude', 'text'],
  addCircle: ['longitude', 'latitude', 'radius', 'color'],
  addSphereHere: ['radius', 'color'],
  addBoxHere: ['dimensionX', 'dimensionY', 'dimensionZ', 'color'],
  addPointHere: ['color'],
  addLabelHere: ['text'],
  addCircleHere: ['radius', 'color'],
  addSensorConeHere: ['radius', 'horizontalAngle', 'verticalAngle', 'heading', 'color', 'opacity'],
  walkTo: ['startLocation', 'endLocation', 'duration'],
  driveTo: ['startLocation', 'endLocation', 'duration'],
  flyPathTo: ['startLocation', 'endLocation', 'altitude', 'duration'],
  getRoute: ['startLocation', 'endLocation', 'mode'],
  getIsochrone: ['location', 'minutes', 'mode'],
  searchPOI: ['category', 'location', 'radius'],
  findAndShow: ['category', 'location', 'radius', 'markerColor'],
  removeEntity: ['id'],
  clearAll: [],
  showEntity: ['id'],
  hideEntity: ['id'],
  flyToEntity: ['id', 'duration'],
  rotateEntity: ['id', 'heading'],
  resizeEntity: ['id', 'scale'],
  setEntityStyle: ['id', 'color', 'opacity'],
  moveEntity: ['id', 'longitude', 'latitude'],
  setSceneMode: ['mode'],
  setTime: ['iso8601'],
  playAnimation: [],
  pauseAnimation: [],
  setImagery: ['provider'],
  setTerrain: ['provider'],
  showTopCitiesByPopulation: ['count', 'color', 'shape'],
  resolveLocation: ['location'],
};

function toolCall(tool: string, args: Record<string, unknown>): string {
  const schema = CSV_SCHEMAS[tool];
  if (!schema || schema.length === 0) return tool;

  const values: string[] = [];
  for (const key of schema) {
    const val = args[key];
    if (val === undefined || val === null) {
      values.push('');
    } else {
      values.push(String(val));
    }
  }

  // Trim trailing empty values
  while (values.length > 0 && values[values.length - 1] === '') {
    values.pop();
  }

  if (values.length === 0) return tool;
  return `${tool},${values.join(',')}`;
}

// ---------- flyToLocation ----------
function genFlyToLocation(): Example {
  const loc = Math.random() > 0.4 ? pick(LOCATIONS).name : pick(LANDMARKS);
  const height = pick([undefined, 1000, 5000, 10000, 15000, 25000, 50000]);
  const duration = pick([undefined, 1, 2, 3, 5]);

  const args: Record<string, unknown> = { location: loc };
  if (height !== undefined) args.height = height;
  if (duration !== undefined) args.duration = duration;

  const templates = [
    `Fly to ${loc}`,
    `Go to ${loc}`,
    `Show me ${loc}`,
    `Take me to ${loc}`,
    `Navigate to ${loc}`,
    `Zoom to ${loc}`,
    `Let me see ${loc}`,
    `Can you show ${loc}?`,
    `I want to see ${loc}`,
    `Head over to ${loc}`,
    `Move the camera to ${loc}`,
    `Fly the camera to ${loc}`,
    `Jump to ${loc}`,
    `Go over to ${loc} please`,
    `Show ${loc} on the globe`,
    `Bring me to ${loc}`,
    `Pan to ${loc}`,
    `Center on ${loc}`,
    `Focus on ${loc}`,
    `Look at ${loc}`,
  ];

  let instruction = pick(templates);
  if (height !== undefined && Math.random() > 0.5) {
    instruction += ` at ${height}m`;
  }

  return { instruction, output: toolCall('flyToLocation', args) };
}

// ---------- flyTo (coordinate-based) ----------
function genFlyTo(): Example {
  const loc = pick(LOCATIONS);
  const height = pick([500, 1000, 5000, 10000, 50000, 500000]);
  const duration = pick([undefined, 1, 2, 3, 5]);

  const args: Record<string, unknown> = {
    longitude: loc.lon,
    latitude: loc.lat,
    height,
  };
  if (duration !== undefined) args.duration = duration;

  const templates = [
    `Fly to ${loc.lon}, ${loc.lat}`,
    `Go to coordinates ${loc.lat}N, ${loc.lon}E`,
    `Navigate to longitude ${loc.lon} latitude ${loc.lat}`,
    `Set position to ${loc.lat}, ${loc.lon}`,
    `Move to ${loc.lon}°E ${loc.lat}°N`,
  ];

  return { instruction: pick(templates), output: toolCall('flyTo', args) };
}

// ---------- lookAt ----------
function genLookAt(): Example {
  const loc = pick(LOCATIONS);
  const range = pick([1000, 5000, 10000, 50000, 100000, 500000]);

  const templates = [
    `Look at ${loc.name}`,
    `Point the camera at ${loc.name}`,
    `Aim at ${loc.name}`,
    `Direct camera toward ${loc.name}`,
    `Face ${loc.name}`,
  ];

  return {
    instruction: pick(templates),
    output: toolCall('lookAt', { longitude: loc.lon, latitude: loc.lat, range }),
  };
}

// ---------- zoom ----------
function genZoom(): Example {
  const zoomIn = Math.random() > 0.5;
  const amount = zoomIn ? rand(0.5, 5) : rand(-5, -0.5);

  const templates = zoomIn
    ? ['Zoom in', 'Zoom closer', 'Get closer', 'Zoom in more', 'Move closer', 'Magnify', 'Enhance']
    : ['Zoom out', 'Zoom away', 'Pull back', 'Zoom out more', 'Move farther', 'Wider view', 'Show more area'];

  return { instruction: pick(templates), output: toolCall('zoom', { amount }) };
}

// ---------- addPoint / addPointAtLocation ----------
function genAddPoint(): Example {
  const useLocation = Math.random() > 0.4;
  const color = pick(COLORS);
  const name = pick(['Marker', 'Point', 'Pin', 'Waypoint', 'Target', 'Location']);

  if (useLocation) {
    const loc = Math.random() > 0.5 ? pick(LOCATIONS).name : pick(LANDMARKS);
    const templates = [
      `Add a ${color} marker at ${loc}`,
      `Place a point at ${loc}`,
      `Put a pin at ${loc}`,
      `Mark ${loc}`,
      `Add marker at ${loc}`,
      `Drop a ${color} pin at ${loc}`,
      `Place a ${color} point at ${loc}`,
      `Add a waypoint at ${loc}`,
    ];
    return {
      instruction: pick(templates),
      output: toolCall('addPointAtLocation', { location: loc, color }),
    };
  } else {
    const loc = pick(LOCATIONS);
    const templates = [
      `Add a ${color} point at ${loc.lon}, ${loc.lat}`,
      `Place marker at coordinates ${loc.lat}, ${loc.lon}`,
      `Put a ${color} pin at longitude ${loc.lon} latitude ${loc.lat}`,
    ];
    return {
      instruction: pick(templates),
      output: toolCall('addPoint', { longitude: loc.lon, latitude: loc.lat, name, color }),
    };
  }
}

// ---------- addSphere / addSphereAtLocation ----------
function genAddSphere(): Example {
  const useLocation = Math.random() > 0.4;
  const color = pick(COLORS);
  const radius = pick([50, 100, 200, 500, 1000]);
  const height = pick([0, 100, 500, 1000]);

  if (useLocation) {
    const loc = Math.random() > 0.5 ? pick(LOCATIONS).name : pick(LANDMARKS);
    const templates = [
      `Add a ${color} sphere at ${loc}`,
      `Place a sphere at ${loc}`,
      `Put a ${color} ball at ${loc}`,
      `Create a ${radius}m sphere at ${loc}`,
      `Add an orb at ${loc}`,
      `Drop a ${color} sphere at ${loc}`,
      `Add a ${radius}m ${color} sphere at ${loc}`,
    ];
    const args: Record<string, unknown> = { location: loc, radius, color };
    if (height > 0) args.height = height;
    return { instruction: pick(templates), output: toolCall('addSphereAtLocation', args) };
  } else {
    const loc = pick(LOCATIONS);
    const templates = [
      `Add a ${color} sphere at ${loc.lon}, ${loc.lat}`,
      `Place a ${radius}m ball at coordinates ${loc.lat}, ${loc.lon}`,
    ];
    const args: Record<string, unknown> = { longitude: loc.lon, latitude: loc.lat, radius, color };
    if (height > 0) args.height = height;
    return { instruction: pick(templates), output: toolCall('addSphere', args) };
  }
}

// ---------- addBox / addBoxAtLocation ----------
function genAddBox(): Example {
  const useLocation = Math.random() > 0.4;
  const color = pick(COLORS);
  const dimX = pick([50, 100, 200, 500]);
  const dimY = pick([50, 100, 200, 500]);
  const dimZ = pick([50, 100, 200, 500]);

  if (useLocation) {
    const loc = Math.random() > 0.5 ? pick(LOCATIONS).name : pick(LANDMARKS);
    const templates = [
      `Add a ${color} box at ${loc}`,
      `Place a box at ${loc}`,
      `Put a ${color} cube at ${loc}`,
      `Create a building at ${loc}`,
      `Add a block at ${loc}`,
    ];
    return {
      instruction: pick(templates),
      output: toolCall('addBoxAtLocation', { location: loc, dimensionX: dimX, dimensionY: dimY, dimensionZ: dimZ, color }),
    };
  } else {
    const loc = pick(LOCATIONS);
    return {
      instruction: `Add a ${color} box at ${loc.lon}, ${loc.lat}`,
      output: toolCall('addBox', { longitude: loc.lon, latitude: loc.lat, dimensionX: dimX, dimensionY: dimY, dimensionZ: dimZ, color }),
    };
  }
}

// ---------- addLabel / addLabelAtLocation ----------
function genAddLabel(): Example {
  const useLocation = Math.random() > 0.5;
  const texts = ['Hello', 'Checkpoint', 'Base Camp', 'Meeting Point', 'Start', 'Finish', 'HQ', 'Waypoint A', 'Target Alpha'];
  const text = pick(texts);

  if (useLocation) {
    const loc = Math.random() > 0.5 ? pick(LOCATIONS).name : pick(LANDMARKS);
    const templates = [
      `Add a label "${text}" at ${loc}`,
      `Put text "${text}" at ${loc}`,
      `Label ${loc} with "${text}"`,
      `Write "${text}" at ${loc}`,
      `Add text label at ${loc} saying ${text}`,
    ];
    return {
      instruction: pick(templates),
      output: toolCall('addLabelAtLocation', { location: loc, text }),
    };
  } else {
    const loc = pick(LOCATIONS);
    return {
      instruction: `Add a label "${text}" at ${loc.lon}, ${loc.lat}`,
      output: toolCall('addLabel', { longitude: loc.lon, latitude: loc.lat, text }),
    };
  }
}

// ---------- addCircle ----------
function genAddCircle(): Example {
  const loc = pick(LOCATIONS);
  const radius = pick([500, 1000, 5000, 10000, 50000]);
  const color = pick(COLORS);

  const templates = [
    `Draw a ${color} circle around ${loc.name}`,
    `Add a circle at ${loc.name} with ${radius}m radius`,
    `Create a ${radius}m circle at ${loc.name}`,
    `Put a ${color} ring around ${loc.name}`,
  ];

  return {
    instruction: pick(templates),
    output: toolCall('addCircle', { longitude: loc.lon, latitude: loc.lat, radius, color }),
  };
}

// ---------- walkTo ----------
function genWalkTo(): Example {
  const useLandmarks = Math.random() > 0.5;
  const duration = pick([20, 30, 45, 60]);

  let startName: string, endName: string;
  if (useLandmarks) {
    [startName, endName] = pickLandmarkPair();
  } else {
    const [a, b] = pickPair();
    startName = a.name;
    endName = b.name;
  }

  const templates = [
    `Walk from ${startName} to ${endName}`,
    `Animate a person walking from ${startName} to ${endName}`,
    `Show someone walking from ${startName} to ${endName}`,
    `Create a walking animation from ${startName} to ${endName}`,
    `Show a pedestrian going from ${startName} to ${endName}`,
    `Animate walking route from ${startName} to ${endName}`,
    `Walk a person from ${startName} to ${endName}`,
    `Show walking path from ${startName} to ${endName}`,
    `Have someone walk from ${startName} to ${endName}`,
    `Display walking animation ${startName} to ${endName}`,
  ];

  return {
    instruction: pick(templates),
    output: toolCall('walkTo', { startLocation: startName, endLocation: endName, duration }),
  };
}

// ---------- driveTo ----------
function genDriveTo(): Example {
  const useLandmarks = Math.random() > 0.5;
  const duration = pick([15, 20, 30, 45]);

  let startName: string, endName: string;
  if (useLandmarks) {
    [startName, endName] = pickLandmarkPair();
  } else {
    const [a, b] = pickPair();
    startName = a.name;
    endName = b.name;
  }

  const templates = [
    `Drive from ${startName} to ${endName}`,
    `Animate a car driving from ${startName} to ${endName}`,
    `Show a vehicle going from ${startName} to ${endName}`,
    `Create a driving animation from ${startName} to ${endName}`,
    `Show a car route from ${startName} to ${endName}`,
    `Animate driving from ${startName} to ${endName}`,
    `Show driving directions from ${startName} to ${endName}`,
    `Drive a car from ${startName} to ${endName}`,
    `Simulate driving from ${startName} to ${endName}`,
    `Show a driving path from ${startName} to ${endName}`,
  ];

  return {
    instruction: pick(templates),
    output: toolCall('driveTo', { startLocation: startName, endLocation: endName, duration }),
  };
}

// ---------- flyPathTo ----------
function genFlyPathTo(): Example {
  const [a, b] = pickPair();
  const altitude = pick([5000, 10000, 15000, 30000]);
  const duration = pick([30, 45, 60, 90]);

  const templates = [
    `Fly from ${a.name} to ${b.name}`,
    `Show a plane flying from ${a.name} to ${b.name}`,
    `Create a flight from ${a.name} to ${b.name}`,
    `Animate an aircraft from ${a.name} to ${b.name}`,
    `Show flight path from ${a.name} to ${b.name}`,
    `Fly an airplane from ${a.name} to ${b.name}`,
    `Flight animation from ${a.name} to ${b.name}`,
    `Show a plane going from ${a.name} to ${b.name}`,
    `Simulate a flight from ${a.name} to ${b.name}`,
    `Create flight animation ${a.name} to ${b.name}`,
  ];

  return {
    instruction: pick(templates),
    output: toolCall('flyPathTo', {
      startLocation: a.name,
      endLocation: b.name,
      altitude,
      duration,
    }),
  };
}

// ---------- getRoute ----------
function genGetRoute(): Example {
  const [a, b] = pickPair();
  const mode = pick(['walking', 'cycling', 'driving']);

  const modeWords: Record<string, string[]> = {
    walking: ['walking', 'on foot', 'pedestrian'],
    cycling: ['cycling', 'biking', 'bicycle'],
    driving: ['driving', 'by car', 'vehicle'],
  };

  const modeWord = pick(modeWords[mode]!);

  const templates = [
    `Get ${modeWord} route from ${a.name} to ${b.name}`,
    `Find ${modeWord} directions from ${a.name} to ${b.name}`,
    `Calculate ${modeWord} path from ${a.name} to ${b.name}`,
    `Route from ${a.name} to ${b.name} ${modeWord}`,
    `Show ${modeWord} directions ${a.name} to ${b.name}`,
  ];

  return {
    instruction: pick(templates),
    output: toolCall('getRoute', { startLocation: a.name, endLocation: b.name, mode }),
  };
}

// ---------- getIsochrone ----------
function genGetIsochrone(): Example {
  const loc = pick(LOCATIONS);
  const minutes = pick([5, 10, 15, 20, 30]);
  const mode = pick(['walking', 'cycling', 'driving']);

  const templates = [
    `Show me everywhere I can ${mode === 'walking' ? 'walk' : mode === 'cycling' ? 'bike' : 'drive'} to in ${minutes} minutes from ${loc.name}`,
    `${minutes} minute ${mode} isochrone from ${loc.name}`,
    `How far can I ${mode === 'walking' ? 'walk' : mode === 'cycling' ? 'bike' : 'drive'} in ${minutes} minutes from ${loc.name}?`,
    `Show reachable area from ${loc.name} in ${minutes} minutes by ${mode}`,
    `What area is within ${minutes} minutes of ${loc.name}?`,
  ];

  return {
    instruction: pick(templates),
    output: toolCall('getIsochrone', { location: loc.name, minutes, mode }),
  };
}

// ---------- searchPOI ----------
function genSearchPOI(): Example {
  const loc = pick(LOCATIONS);
  const category = pick(POI_CATEGORIES);
  const radius = pick([500, 1000, 2000, 5000, 10000]);

  const catNames: Record<string, string[]> = {
    restaurant: ['restaurants', 'places to eat', 'dining spots', 'eateries'],
    hospital: ['hospitals', 'medical centers', 'emergency rooms'],
    park: ['parks', 'green spaces', 'gardens'],
    airport: ['airports', 'airfields'],
    hotel: ['hotels', 'lodging', 'places to stay', 'accommodations'],
    museum: ['museums', 'galleries', 'exhibitions'],
    pharmacy: ['pharmacies', 'drug stores', 'chemists'],
    school: ['schools', 'educational institutions'],
    bank: ['banks', 'ATMs', 'financial institutions'],
    cafe: ['cafes', 'coffee shops', 'coffee places'],
    bar: ['bars', 'pubs', 'nightlife spots'],
    library: ['libraries', 'public libraries'],
    police: ['police stations', 'law enforcement'],
    fire_station: ['fire stations', 'fire departments'],
    supermarket: ['supermarkets', 'grocery stores'],
    bakery: ['bakeries', 'bread shops'],
  };

  const catName = pick(catNames[category] || [category]);

  const templates = [
    `Find ${catName} near ${loc.name}`,
    `Search for ${catName} around ${loc.name}`,
    `Where are the nearest ${catName} to ${loc.name}?`,
    `Show ${catName} near ${loc.name}`,
    `What ${catName} are near ${loc.name}?`,
    `Locate ${catName} close to ${loc.name}`,
    `Find ${catName} within ${radius}m of ${loc.name}`,
  ];

  return {
    instruction: pick(templates),
    output: toolCall('searchPOI', { category, location: loc.name, radius }),
  };
}

// ---------- findAndShow ----------
function genFindAndShow(): Example {
  const loc = pick(LOCATIONS);
  const category = pick(POI_CATEGORIES);
  const radius = pick([500, 1000, 2000, 5000]);
  const markerColor = pick(COLORS);

  const catNames: Record<string, string> = {
    restaurant: 'restaurants', hospital: 'hospitals', park: 'parks',
    airport: 'airports', hotel: 'hotels', museum: 'museums',
    pharmacy: 'pharmacies', school: 'schools', bank: 'banks',
    cafe: 'cafes', bar: 'bars', library: 'libraries',
    police: 'police stations', fire_station: 'fire stations',
    supermarket: 'supermarkets', bakery: 'bakeries',
  };

  const catName = catNames[category] || category;

  const templates = [
    `Find and show ${catName} near ${loc.name}`,
    `Show me all ${catName} around ${loc.name}`,
    `Display ${catName} near ${loc.name} on the map`,
    `Find ${catName} near ${loc.name} and put markers`,
    `Search and visualize ${catName} around ${loc.name}`,
    `Show all the ${catName} close to ${loc.name}`,
    `Find the closest ${catName} to ${loc.name} and mark them`,
    `Map out the ${catName} near ${loc.name}`,
  ];

  return {
    instruction: pick(templates),
    output: toolCall('findAndShow', { category, location: loc.name, radius, markerColor }),
  };
}

// ---------- removeEntity ----------
function genRemoveEntity(): Example {
  const id = pick(ENTITY_IDS);

  const templates = [
    `Remove ${id}`,
    `Delete ${id}`,
    `Get rid of ${id}`,
    `Remove the ${id}`,
    `Delete the ${id} entity`,
    `Take away ${id}`,
  ];

  return { instruction: pick(templates), output: toolCall('removeEntity', { id }) };
}

// ---------- clearAll ----------
function genClearAll(): Example {
  const templates = [
    'Clear everything',
    'Remove all entities',
    'Clear the map',
    'Delete everything',
    'Remove all objects',
    'Clear all markers',
    'Wipe the globe clean',
    'Reset the map',
    'Remove all',
    'Clean up everything',
  ];

  return { instruction: pick(templates), output: toolCall('clearAll', {}) };
}

// ---------- showEntity / hideEntity ----------
function genShowHide(): Example {
  const id = pick(ENTITY_IDS);
  const show = Math.random() > 0.5;

  const templates = show
    ? [`Show ${id}`, `Make ${id} visible`, `Display ${id}`, `Unhide ${id}`, `Turn on ${id}`]
    : [`Hide ${id}`, `Make ${id} invisible`, `Conceal ${id}`, `Turn off ${id}`, `Don't show ${id}`];

  return {
    instruction: pick(templates),
    output: toolCall(show ? 'showEntity' : 'hideEntity', { id }),
  };
}

// ---------- flyToEntity ----------
function genFlyToEntity(): Example {
  const id = pick(ENTITY_IDS);
  const duration = pick([1, 2, 3, 5]);

  const templates = [
    `Fly to ${id}`,
    `Go to the ${id}`,
    `Zoom to ${id}`,
    `Navigate to ${id}`,
    `Focus on ${id}`,
    `Show me ${id}`,
    `Center on ${id}`,
  ];

  return {
    instruction: pick(templates),
    output: toolCall('flyToEntity', { id, duration }),
  };
}

// ---------- setSceneMode ----------
function genSetSceneMode(): Example {
  const mode = pick(['3D', '2D', 'columbus']);
  const modeTemplates: Record<string, string[]> = {
    '3D': ['Switch to 3D', 'Set 3D mode', 'Go to 3D view', 'Show globe in 3D', 'Enable 3D mode', '3D view'],
    '2D': ['Switch to 2D', 'Set 2D mode', 'Go to flat map', 'Show 2D view', 'Enable 2D mode', 'Flat map view'],
    columbus: ['Columbus view', 'Set Columbus mode', '2.5D view', 'Enable Columbus view', 'Switch to Columbus'],
  };

  return { instruction: pick(modeTemplates[mode]!), output: toolCall('setSceneMode', { mode }) };
}

// ---------- setTime ----------
function genSetTime(): Example {
  const year = randInt(2020, 2026);
  const month = String(randInt(1, 12)).padStart(2, '0');
  const day = String(randInt(1, 28)).padStart(2, '0');
  const hour = String(randInt(0, 23)).padStart(2, '0');
  const iso = `${year}-${month}-${day}T${hour}:00:00Z`;

  const templates = [
    `Set time to ${iso}`,
    `Change the time to ${year}-${month}-${day}`,
    `Go to ${month}/${day}/${year}`,
    `Set date to ${year}`,
    `Jump to ${year}-${month}-${day} at ${hour}:00`,
    `Move time to ${iso}`,
  ];

  return { instruction: pick(templates), output: toolCall('setTime', { iso8601: iso }) };
}

// ---------- playAnimation / pauseAnimation ----------
function genPlayPause(): Example {
  const play = Math.random() > 0.5;

  const templates = play
    ? ['Play animation', 'Start animation', 'Play the clock', 'Resume animation', 'Start time', 'Play']
    : ['Pause animation', 'Stop animation', 'Pause the clock', 'Freeze time', 'Stop time', 'Pause'];

  return {
    instruction: pick(templates),
    output: toolCall(play ? 'playAnimation' : 'pauseAnimation', {}),
  };
}

// ---------- setImagery ----------
function genSetImagery(): Example {
  const provider = pick(['bing', 'osm', 'arcgis', 'sentinel']);
  const providerNames: Record<string, string[]> = {
    bing: ['Bing maps', 'Bing imagery', 'Bing satellite'],
    osm: ['OpenStreetMap', 'OSM', 'open street map'],
    arcgis: ['ArcGIS', 'Esri', 'ArcGIS imagery'],
    sentinel: ['Sentinel', 'Sentinel satellite', 'Sentinel imagery'],
  };

  const templates = [
    `Switch to ${pick(providerNames[provider]!)}`,
    `Use ${pick(providerNames[provider]!)} imagery`,
    `Change map to ${pick(providerNames[provider]!)}`,
    `Set imagery to ${provider}`,
  ];

  return { instruction: pick(templates), output: toolCall('setImagery', { provider }) };
}

// ---------- setTerrain ----------
function genSetTerrain(): Example {
  const provider = pick(['cesium', 'ellipsoid']);
  const templates = provider === 'cesium'
    ? ['Enable terrain', 'Turn on Cesium terrain', 'Show terrain elevation', 'Use Cesium World Terrain', 'Add terrain']
    : ['Disable terrain', 'Flat earth', 'Use flat terrain', 'Remove terrain', 'Set ellipsoid terrain'];

  return { instruction: pick(templates), output: toolCall('setTerrain', { provider }) };
}

// ---------- getCamera ----------
function genGetCamera(): Example {
  const templates = [
    'Where am I?',
    'Get camera position',
    'Show current position',
    'What are the current coordinates?',
    'Camera info',
    'Get my position',
    'Current location?',
    'Where is the camera?',
  ];

  return { instruction: pick(templates), output: toolCall('getCamera', {}) };
}

// ---------- addSphereHere / addBoxHere / addPointHere ----------
function genAddHere(): Example {
  const entityType = pick(['sphere', 'box', 'point', 'label', 'circle']);
  const color = pick(COLORS);

  switch (entityType) {
    case 'sphere': {
      const radius = pick([50, 100, 200, 500]);
      const templates = [
        `Add a sphere here`, `Place a ${color} sphere here`, `Put a sphere`,
        `Add sphere at this location`, `Drop a ${color} ball here`,
        `Add a sphere right here`, `Place sphere here`,
      ];
      return { instruction: pick(templates), output: toolCall('addSphereHere', { radius, color }) };
    }
    case 'box': {
      const templates = [
        `Add a box here`, `Place a ${color} box here`, `Put a cube here`,
        `Add box at this location`, `Drop a block here`,
      ];
      return { instruction: pick(templates), output: toolCall('addBoxHere', { dimensionX: 100, dimensionY: 100, dimensionZ: 100, color }) };
    }
    case 'point': {
      const templates = [
        `Add a marker here`, `Place a point here`, `Drop a pin here`,
        `Mark this spot`, `Add point at current location`, `Pin this location`,
      ];
      return { instruction: pick(templates), output: toolCall('addPointHere', { color }) };
    }
    case 'label': {
      const text = pick(['Here', 'Waypoint', 'Target', 'Base', 'Start']);
      const templates = [
        `Add a label here`, `Put text "${text}" here`, `Label this spot "${text}"`,
        `Write "${text}" here`, `Add label at this location saying ${text}`,
      ];
      return { instruction: pick(templates), output: toolCall('addLabelHere', { text }) };
    }
    case 'circle': {
      const radius = pick([500, 1000, 5000, 10000]);
      const templates = [
        `Draw a circle here`, `Add a ${color} circle here`, `Create a circle at this spot`,
        `Draw a ${radius}m circle here`, `Circle this area`,
      ];
      return { instruction: pick(templates), output: toolCall('addCircleHere', { radius, color }) };
    }
  }
  return { instruction: '', output: '' };
}

// ---------- rotateEntity ----------
function genRotateEntity(): Example {
  const id = pick(ENTITY_IDS);
  const heading = pick([0, 45, 90, 135, 180, 225, 270, 315]);
  const headingNames: Record<number, string> = {
    0: 'north', 45: 'northeast', 90: 'east', 135: 'southeast',
    180: 'south', 225: 'southwest', 270: 'west', 315: 'northwest',
  };

  const templates = [
    `Rotate ${id} to face ${headingNames[heading]}`,
    `Turn ${id} ${heading} degrees`,
    `Set heading of ${id} to ${heading}`,
    `Point ${id} ${headingNames[heading]}`,
    `Rotate ${id} to ${heading}°`,
  ];

  return { instruction: pick(templates), output: toolCall('rotateEntity', { id, heading }) };
}

// ---------- setEntityStyle ----------
function genSetEntityStyle(): Example {
  const id = pick(ENTITY_IDS);
  const color = pick(COLORS);
  const opacity = pick([0.3, 0.5, 0.7, 1.0]);

  const templates = [
    `Make ${id} ${color}`,
    `Change ${id} color to ${color}`,
    `Set ${id} to ${color}`,
    `Color ${id} ${color}`,
    `Paint ${id} ${color}`,
    `Turn ${id} ${color}`,
  ];

  const args: Record<string, unknown> = { id, color };
  if (Math.random() > 0.5) args.opacity = opacity;

  return { instruction: pick(templates), output: toolCall('setEntityStyle', args) };
}

// ---------- showTopCitiesByPopulation ----------
function genShowTopCities(): Example {
  const count = pick([5, 10, 15, 20, 50]);
  const shape = pick(['circle', 'rectangle']);
  const color = pick(COLORS);

  const templates = [
    `Show top ${count} cities by population`,
    `Visualize the ${count} largest cities`,
    `Display the most populous cities`,
    `Show biggest cities on the map`,
    `Map the top ${count} cities by population`,
    `Show world's largest cities`,
    `Visualize population of top ${count} cities`,
  ];

  return {
    instruction: pick(templates),
    output: toolCall('showTopCitiesByPopulation', { count, color, shape }),
  };
}

// ---------- addPolyline ----------
function genAddPolyline(): Example {
  const locs = pickN(LOCATIONS, randInt(2, 4));
  const color = pick(COLORS);
  const positions = locs.map(l => ({ longitude: l.lon, latitude: l.lat }));
  const names = locs.map(l => l.name);

  const templates = [
    `Draw a line from ${names.join(' to ')}`,
    `Add a ${color} path from ${names[0]} to ${names[names.length - 1]}`,
    `Create a polyline connecting ${names.join(', ')}`,
    `Draw a ${color} line between ${names[0]} and ${names[names.length - 1]}`,
  ];

  return {
    instruction: pick(templates),
    output: toolCall('addPolyline', { positions, color, name: `${names[0]} to ${names[names.length - 1]}` }),
  };
}

// ---------- setView ----------
function genSetView(): Example {
  const loc = pick(LOCATIONS);
  const height = pick([500, 1000, 5000, 10000, 50000, 500000]);

  const templates = [
    `Set view to ${loc.name} instantly`,
    `Jump to ${loc.name} without animation`,
    `Teleport to ${loc.name}`,
    `Instantly go to ${loc.name}`,
    `Set camera position to ${loc.name} immediately`,
  ];

  return {
    instruction: pick(templates),
    output: toolCall('setView', { longitude: loc.lon, latitude: loc.lat, height }),
  };
}

// ---------- addSensorConeHere ----------
function genAddSensorCone(): Example {
  const radius = pick([10000, 50000, 100000]);
  const horizontalAngle = pick([15, 30, 45, 60, 90]);
  const verticalAngle = pick([15, 30, 45, 60]);
  const heading = pick([0, 45, 90, 180, 270]);
  const color = pick(COLORS);
  const opacity = pick([0.3, 0.4, 0.5, 0.6]);

  const templates = [
    `Add a sensor cone here`,
    `Create a radar fan here`,
    `Add a ${horizontalAngle} degree sensor`,
    `Add a FOV visualization here`,
    `Create a camera FOV cone`,
    `Add a ${color} sensor fan pointing ${heading === 0 ? 'north' : heading === 90 ? 'east' : heading === 180 ? 'south' : 'west'}`,
    `Add radar cone here`,
    `Show sensor coverage here`,
  ];

  return {
    instruction: pick(templates),
    output: toolCall('addSensorConeHere', { radius, horizontalAngle, verticalAngle, heading, color, opacity }),
  };
}

// ---------- resolveLocation ----------
function genResolveLocation(): Example {
  const loc = Math.random() > 0.5 ? pick(LOCATIONS).name : pick(LANDMARKS);

  const templates = [
    `Where is ${loc}?`,
    `What are the coordinates of ${loc}?`,
    `Resolve ${loc}`,
    `Get coordinates for ${loc}`,
    `Find ${loc} coordinates`,
    `Location of ${loc}`,
  ];

  return { instruction: pick(templates), output: toolCall('resolveLocation', { location: loc }) };
}

// ---------- moveEntity ----------
function genMoveEntity(): Example {
  const id = pick(ENTITY_IDS);
  const loc = pick(LOCATIONS);

  const templates = [
    `Move ${id} to ${loc.name}`,
    `Relocate ${id} to ${loc.lon}, ${loc.lat}`,
    `Put ${id} at ${loc.name}`,
    `Move ${id} to coordinates ${loc.lat}, ${loc.lon}`,
  ];

  return {
    instruction: pick(templates),
    output: toolCall('moveEntity', { id, longitude: loc.lon, latitude: loc.lat }),
  };
}

// ---------- resizeEntity ----------
function genResizeEntity(): Example {
  const id = pick(ENTITY_IDS);
  const scale = pick([0.5, 1.5, 2, 3, 5, 10]);

  const templates = [
    `Make ${id} ${scale}x bigger`,
    `Scale ${id} by ${scale}`,
    `Resize ${id} to ${scale}x`,
    `${scale > 1 ? 'Enlarge' : 'Shrink'} ${id}`,
    `Make ${id} ${scale > 1 ? 'larger' : 'smaller'}`,
  ];

  return { instruction: pick(templates), output: toolCall('resizeEntity', { id, scale }) };
}

// ============================================================================
// Generator registry - weighted by importance
// ============================================================================

interface Generator {
  fn: () => Example;
  weight: number; // Higher = more examples
}

const generators: Generator[] = [
  // Navigation (most common)
  { fn: genFlyToLocation, weight: 15 },
  { fn: genFlyTo, weight: 5 },
  { fn: genLookAt, weight: 3 },
  { fn: genZoom, weight: 5 },
  { fn: genSetView, weight: 3 },
  { fn: genGetCamera, weight: 3 },

  // Entity creation at named locations
  { fn: genAddPoint, weight: 10 },
  { fn: genAddSphere, weight: 8 },
  { fn: genAddBox, weight: 5 },
  { fn: genAddLabel, weight: 5 },
  { fn: genAddCircle, weight: 4 },
  { fn: genAddHere, weight: 8 },
  { fn: genAddSensorCone, weight: 3 },

  // Routing & animation (important new tools)
  { fn: genWalkTo, weight: 10 },
  { fn: genDriveTo, weight: 10 },
  { fn: genFlyPathTo, weight: 8 },
  { fn: genGetRoute, weight: 5 },
  { fn: genGetIsochrone, weight: 4 },

  // POI search
  { fn: genSearchPOI, weight: 8 },
  { fn: genFindAndShow, weight: 8 },

  // Entity management
  { fn: genRemoveEntity, weight: 4 },
  { fn: genClearAll, weight: 4 },
  { fn: genShowHide, weight: 3 },
  { fn: genFlyToEntity, weight: 5 },
  { fn: genRotateEntity, weight: 2 },
  { fn: genSetEntityStyle, weight: 3 },
  { fn: genMoveEntity, weight: 2 },
  { fn: genResizeEntity, weight: 2 },

  // Scene & settings
  { fn: genSetSceneMode, weight: 3 },
  { fn: genSetTime, weight: 3 },
  { fn: genPlayPause, weight: 3 },
  { fn: genSetImagery, weight: 2 },
  { fn: genSetTerrain, weight: 2 },

  // Data visualization
  { fn: genShowTopCities, weight: 3 },
  // genAddPolyline excluded: positions[] can't be represented in CSV
  // { fn: genAddPolyline, weight: 3 },

  // Location resolution
  { fn: genResolveLocation, weight: 4 },
];

// Build weighted array for sampling
function buildWeightedSampler(): (() => Example)[] {
  const sampler: (() => Example)[] = [];
  for (const gen of generators) {
    for (let i = 0; i < gen.weight; i++) {
      sampler.push(gen.fn);
    }
  }
  return sampler;
}

// ============================================================================
// Main
// ============================================================================

async function main() {
  const args = process.argv.slice(2);
  let count = 100000;
  let outputPath = path.join(__dirname, 'mcp-training-data.jsonl');

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--count' && args[i + 1]) {
      count = parseInt(args[i + 1]!, 10);
      i++;
    } else if (args[i] === '--output' && args[i + 1]) {
      outputPath = args[i + 1]!;
      i++;
    }
  }

  console.log(`Generating ${count} MCP training examples...`);
  console.log(`Output: ${outputPath}`);

  const sampler = buildWeightedSampler();
  const seen = new Set<string>();
  const stream = fs.createWriteStream(outputPath);
  let written = 0;
  let duplicates = 0;

  while (written < count) {
    const genFn = pick(sampler);
    const example = genFn();

    if (!example.instruction || !example.output) continue;

    // Deduplicate by instruction
    const key = example.instruction.toLowerCase();
    if (seen.has(key)) {
      duplicates++;
      if (duplicates > count * 10) {
        console.log(`Warning: Too many duplicates, stopping at ${written} examples`);
        break;
      }
      continue;
    }
    seen.add(key);

    stream.write(JSON.stringify(example) + '\n');
    written++;

    if (written % 10000 === 0) {
      console.log(`  ${written}/${count} generated...`);
    }
  }

  await new Promise<void>((resolve) => {
    stream.end(() => resolve());
  });

  // Print stats
  const toolCounts: Record<string, number> = {};
  const lines = fs.readFileSync(outputPath, 'utf-8').trim().split('\n');
  for (const line of lines) {
    try {
      const data = JSON.parse(line);
      const tool = data.output.split(',')[0];
      if (tool) toolCounts[tool] = (toolCounts[tool] || 0) + 1;
    } catch { /* skip */ }
  }

  console.log(`\nDone! Generated ${written} examples (${duplicates} duplicates skipped)`);
  console.log(`\nTool distribution:`);

  const sorted = Object.entries(toolCounts).sort((a, b) => b[1] - a[1]);
  for (const [tool, countN] of sorted) {
    const pct = ((countN / written) * 100).toFixed(1);
    console.log(`  ${tool.padEnd(30)} ${String(countN).padStart(6)} (${pct}%)`);
  }
}

main();
