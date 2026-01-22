/**
 * LLM Prompt Templates for CesiumJS Control
 * Contains structured prompts, few-shot examples, and helper functions for tool call generation
 */

import type { ToolDefinition } from './web-llm-engine';

/**
 * Height recommendations by location type (in meters)
 * Used for intelligent height inference when not specified
 */
export const LOCATION_HEIGHTS = {
  // Continents and large regions
  continent: 10000000,    // 10,000 km - view entire continent
  region: 5000000,        // 5,000 km - view large region (e.g., Western Europe)
  country: 2000000,       // 2,000 km - view country

  // Urban areas
  city: 500000,           // 500 km - view entire city area
  district: 100000,       // 100 km - view city district
  neighborhood: 20000,    // 20 km - neighborhood level

  // Specific features
  landmark: 50000,        // 50 km - famous landmarks (Eiffel Tower, Statue of Liberty)
  building: 1000,         // 1 km - individual building
  street: 500,            // 500 m - street level

  // Natural features
  mountain: 100000,       // 100 km - mountain ranges
  lake: 50000,            // 50 km - lakes
  river: 100000,          // 100 km - river systems

  // Default
  default: 1000000,       // 1,000 km - general overview
} as const;

/**
 * Duration recommendations for camera flights (in seconds)
 */
export const FLIGHT_DURATIONS = {
  nearby: 1,              // Short distance (same city/region)
  regional: 2,            // Different cities in same country
  continental: 3,         // Different countries on same continent
  global: 4,              // Cross-continental
  instant: 0,             // Immediate jump
} as const;

/**
 * Known locations with coordinates
 * Organized by type for better categorization
 */
export const KNOWN_LOCATIONS = {
  // Major cities
  cities: {
    'new york': { longitude: -74.006, latitude: 40.7128 },
    'london': { longitude: -0.1276, latitude: 51.5074 },
    'paris': { longitude: 2.3522, latitude: 48.8566 },
    'tokyo': { longitude: 139.6917, latitude: 35.6895 },
    'sydney': { longitude: 151.2093, latitude: -33.8688 },
    'los angeles': { longitude: -118.2437, latitude: 34.0522 },
    'san francisco': { longitude: -122.4194, latitude: 37.7749 },
    'moscow': { longitude: 37.6173, latitude: 55.7558 },
    'beijing': { longitude: 116.4074, latitude: 39.9042 },
    'dubai': { longitude: 55.2708, latitude: 25.2048 },
    'rome': { longitude: 12.4964, latitude: 41.9028 },
    'berlin': { longitude: 13.4050, latitude: 52.5200 },
    'cairo': { longitude: 31.2357, latitude: 30.0444 },
    'mumbai': { longitude: 72.8777, latitude: 19.0760 },
    'singapore': { longitude: 103.8198, latitude: 1.3521 },
    'hong kong': { longitude: 114.1694, latitude: 22.3193 },
    'chicago': { longitude: -87.6298, latitude: 41.8781 },
    'toronto': { longitude: -79.3832, latitude: 43.6532 },
    'seattle': { longitude: -122.3321, latitude: 47.6062 },
    'denver': { longitude: -104.9903, latitude: 39.7392 },
    'miami': { longitude: -80.1918, latitude: 25.7617 },
    'boston': { longitude: -71.0589, latitude: 42.3601 },
    'washington dc': { longitude: -77.0369, latitude: 38.9072 },
    'amsterdam': { longitude: 4.9041, latitude: 52.3676 },
    'barcelona': { longitude: 2.1734, latitude: 41.3851 },
    'vienna': { longitude: 16.3738, latitude: 48.2082 },
    'prague': { longitude: 14.4378, latitude: 50.0755 },
    'stockholm': { longitude: 18.0686, latitude: 59.3293 },
  },
  // Famous landmarks
  landmarks: {
    'eiffel tower': { longitude: 2.2945, latitude: 48.8584 },
    'statue of liberty': { longitude: -74.0445, latitude: 40.6892 },
    'big ben': { longitude: -0.1246, latitude: 51.5007 },
    'colosseum': { longitude: 12.4924, latitude: 41.8902 },
    'taj mahal': { longitude: 78.0421, latitude: 27.1751 },
    'great wall': { longitude: 116.5704, latitude: 40.4319 },
    'pyramids of giza': { longitude: 31.1342, latitude: 29.9792 },
    'machu picchu': { longitude: -72.5450, latitude: -13.1631 },
    'sydney opera house': { longitude: 151.2153, latitude: -33.8568 },
    'golden gate bridge': { longitude: -122.4783, latitude: 37.8199 },
    'mount rushmore': { longitude: -103.4591, latitude: 43.8791 },
    'christ the redeemer': { longitude: -43.2105, latitude: -22.9519 },
    'burj khalifa': { longitude: 55.2744, latitude: 25.1972 },
    'empire state building': { longitude: -73.9857, latitude: 40.7484 },
    'tower of london': { longitude: -0.0759, latitude: 51.5081 },
    'kremlin': { longitude: 37.6176, latitude: 55.7520 },
    'white house': { longitude: -77.0365, latitude: 38.8977 },
    'space needle': { longitude: -122.3493, latitude: 47.6205 },
    'leaning tower of pisa': { longitude: 10.3966, latitude: 43.7230 },
  },
  // Natural features
  natural: {
    'grand canyon': { longitude: -112.1401, latitude: 36.0544 },
    'mount everest': { longitude: 86.9250, latitude: 27.9881 },
    'mount fuji': { longitude: 138.7274, latitude: 35.3606 },
    'niagara falls': { longitude: -79.0849, latitude: 43.0962 },
    'amazon river': { longitude: -60.0217, latitude: -3.4653 },
    'victoria falls': { longitude: 25.8573, latitude: -17.9244 },
    'great barrier reef': { longitude: 145.7710, latitude: -16.2864 },
    'yellowstone': { longitude: -110.5885, latitude: 44.4280 },
    'mount kilimanjaro': { longitude: 37.3556, latitude: -3.0674 },
    'dead sea': { longitude: 35.4732, latitude: 31.5111 },
  },
} as const;

/**
 * Few-shot examples for all tools
 * Each example includes user input and expected JSON output
 */
export const FEW_SHOT_EXAMPLES = [
  // ============ CAMERA CONTROLS ============
  {
    category: 'camera',
    tool: 'flyTo',
    userInput: 'Show me New York',
    response: '{"tool": "flyTo", "arguments": {"longitude": -74.006, "latitude": 40.7128, "height": 500000, "duration": 3}}',
    explanation: 'Basic flyTo with city coordinates and appropriate height',
  },
  {
    category: 'camera',
    tool: 'flyTo',
    userInput: 'Take me to the Eiffel Tower',
    response: '{"tool": "flyTo", "arguments": {"longitude": 2.2945, "latitude": 48.8584, "height": 50000, "duration": 2}}',
    explanation: 'Landmark with lower height for closer view',
  },
  {
    category: 'camera',
    tool: 'flyTo',
    userInput: 'Go to coordinates 35.6895, 139.6917',
    response: '{"tool": "flyTo", "arguments": {"longitude": 139.6917, "latitude": 35.6895, "height": 500000, "duration": 3}}',
    explanation: 'Direct coordinates provided by user',
  },
  {
    category: 'camera',
    tool: 'lookAt',
    userInput: 'Look at the Statue of Liberty',
    response: '{"tool": "lookAt", "arguments": {"longitude": -74.0445, "latitude": 40.6892, "range": 5000}}',
    explanation: 'Orient camera to look at landmark',
  },
  {
    category: 'camera',
    tool: 'zoom',
    userInput: 'Zoom in',
    response: '{"tool": "zoom", "arguments": {"amount": 2}}',
    explanation: 'Positive amount for zoom in',
  },
  {
    category: 'camera',
    tool: 'zoom',
    userInput: 'Zoom out a lot',
    response: '{"tool": "zoom", "arguments": {"amount": -5}}',
    explanation: 'Negative amount with larger value for zoom out',
  },

  // ============ ENTITY CREATION ============
  {
    category: 'entity',
    tool: 'addPoint',
    userInput: 'Add a red marker at the Eiffel Tower',
    response: '{"tool": "addPoint", "arguments": {"longitude": 2.2945, "latitude": 48.8584, "name": "Eiffel Tower", "color": "red"}}',
    explanation: 'Point with name and color at known location',
  },
  {
    category: 'entity',
    tool: 'addPoint',
    userInput: 'Place a marker at 40.7128, -74.006',
    response: '{"tool": "addPoint", "arguments": {"longitude": -74.006, "latitude": 40.7128, "name": "Marker"}}',
    explanation: 'Point at coordinates (note: latitude, longitude order in user input)',
  },
  {
    category: 'entity',
    tool: 'addLabel',
    userInput: 'Add a label saying "Hello" at Tokyo',
    response: '{"tool": "addLabel", "arguments": {"longitude": 139.6917, "latitude": 35.6895, "text": "Hello", "color": "white"}}',
    explanation: 'Text label at known city location',
  },
  {
    category: 'entity',
    tool: 'addPolyline',
    userInput: 'Draw a line from London to Paris',
    response: '{"tool": "addPolyline", "arguments": {"positions": [{"longitude": -0.1276, "latitude": 51.5074}, {"longitude": 2.3522, "latitude": 48.8566}], "name": "London to Paris", "color": "blue"}}',
    explanation: 'Line connecting two cities',
  },
  {
    category: 'entity',
    tool: 'addPolyline',
    userInput: 'Draw a red triangle connecting New York, Chicago, and Miami',
    response: '{"tool": "addPolyline", "arguments": {"positions": [{"longitude": -74.006, "latitude": 40.7128}, {"longitude": -87.6298, "latitude": 41.8781}, {"longitude": -80.1918, "latitude": 25.7617}, {"longitude": -74.006, "latitude": 40.7128}], "name": "Triangle", "color": "red"}}',
    explanation: 'Closed polyline (returns to start) forming a triangle',
  },
  {
    category: 'entity',
    tool: 'addPolygon',
    userInput: 'Draw a blue polygon around Central Park',
    response: '{"tool": "addPolygon", "arguments": {"positions": [{"longitude": -73.9654, "latitude": 40.8006}, {"longitude": -73.9496, "latitude": 40.7969}, {"longitude": -73.9580, "latitude": 40.7644}, {"longitude": -73.9738, "latitude": 40.7681}], "name": "Central Park", "color": "blue"}}',
    explanation: 'Filled polygon with multiple vertices',
  },
  {
    category: 'entity',
    tool: 'addPolygon',
    userInput: 'Create a 3D building in downtown Tokyo, 200 meters tall',
    response: '{"tool": "addPolygon", "arguments": {"positions": [{"longitude": 139.6917, "latitude": 35.6900}, {"longitude": 139.6927, "latitude": 35.6900}, {"longitude": 139.6927, "latitude": 35.6890}, {"longitude": 139.6917, "latitude": 35.6890}], "name": "Building", "color": "gray", "extrudedHeight": 200}}',
    explanation: 'Extruded polygon creating 3D building effect',
  },
  {
    category: 'entity',
    tool: 'addCircle',
    userInput: 'Draw a circle with 10km radius around Paris',
    response: '{"tool": "addCircle", "arguments": {"longitude": 2.3522, "latitude": 48.8566, "radius": 10000, "name": "Paris Area", "color": "yellow"}}',
    explanation: 'Circle with radius in meters (10km = 10000m)',
  },
  {
    category: 'entity',
    tool: 'addCircle',
    userInput: 'Add a 500 meter green circle at coordinates 51.5, -0.1',
    response: '{"tool": "addCircle", "arguments": {"longitude": -0.1, "latitude": 51.5, "radius": 500, "name": "Circle", "color": "green"}}',
    explanation: 'Circle at specified coordinates with color',
  },

  // ============ ENTITY MANAGEMENT ============
  {
    category: 'management',
    tool: 'removeEntity',
    userInput: 'Remove the marker called "Eiffel Tower"',
    response: '{"tool": "removeEntity", "arguments": {"id": "Eiffel Tower"}}',
    explanation: 'Remove entity by its ID/name',
  },
  {
    category: 'management',
    tool: 'clearAll',
    userInput: 'Clear everything from the map',
    response: '{"tool": "clearAll", "arguments": {}}',
    explanation: 'Clear all entities with empty arguments object',
  },
  {
    category: 'management',
    tool: 'clearAll',
    userInput: 'Remove all markers and lines',
    response: '{"tool": "clearAll", "arguments": {}}',
    explanation: 'Synonymous request for clearing all',
  },

  // ============ SCENE MODE ============
  {
    category: 'scene',
    tool: 'setSceneMode',
    userInput: 'Switch to 2D view',
    response: '{"tool": "setSceneMode", "arguments": {"mode": "2D"}}',
    explanation: '2D flat map mode',
  },
  {
    category: 'scene',
    tool: 'setSceneMode',
    userInput: 'Show me the 3D globe',
    response: '{"tool": "setSceneMode", "arguments": {"mode": "3D"}}',
    explanation: '3D globe mode',
  },
  {
    category: 'scene',
    tool: 'setSceneMode',
    userInput: 'Enable Columbus view',
    response: '{"tool": "setSceneMode", "arguments": {"mode": "COLUMBUS_VIEW"}}',
    explanation: 'Columbus/2.5D view mode',
  },

  // ============ TIME CONTROLS ============
  {
    category: 'time',
    tool: 'setTime',
    userInput: 'Set the time to January 1st, 2024',
    response: '{"tool": "setTime", "arguments": {"time": "2024-01-01T00:00:00Z"}}',
    explanation: 'Set simulation time with ISO 8601 format',
  },
  {
    category: 'time',
    tool: 'setTime',
    userInput: 'Set time to noon today and speed up 10x',
    response: '{"tool": "setTime", "arguments": {"time": "2024-01-15T12:00:00Z", "multiplier": 10}}',
    explanation: 'Set time with multiplier for faster animation',
  },
  {
    category: 'time',
    tool: 'playAnimation',
    userInput: 'Start the animation',
    response: '{"tool": "playAnimation", "arguments": {}}',
    explanation: 'Play time animation',
  },
  {
    category: 'time',
    tool: 'pauseAnimation',
    userInput: 'Pause the animation',
    response: '{"tool": "pauseAnimation", "arguments": {}}',
    explanation: 'Pause time animation',
  },
  {
    category: 'time',
    tool: 'pauseAnimation',
    userInput: 'Stop',
    response: '{"tool": "pauseAnimation", "arguments": {}}',
    explanation: 'Stop is interpreted as pause',
  },

  // ============ CZML GENERATION ============
  {
    category: 'czml',
    tool: 'generateCZML',
    userInput: 'Generate CZML for a point at Tokyo',
    response: '{"tool": "generateCZML", "arguments": {"entities": [{"type": "point", "position": {"longitude": 139.6917, "latitude": 35.6895}, "name": "Tokyo", "color": "red"}], "documentName": "Tokyo Point"}}',
    explanation: 'Generate CZML document with single point entity',
  },
  {
    category: 'czml',
    tool: 'generateCZML',
    userInput: 'Create CZML with markers for London, Paris, and Berlin',
    response: '{"tool": "generateCZML", "arguments": {"entities": [{"type": "point", "position": {"longitude": -0.1276, "latitude": 51.5074}, "name": "London", "color": "red"}, {"type": "point", "position": {"longitude": 2.3522, "latitude": 48.8566}, "name": "Paris", "color": "blue"}, {"type": "point", "position": {"longitude": 13.4050, "latitude": 52.5200}, "name": "Berlin", "color": "green"}], "documentName": "European Cities"}}',
    explanation: 'Generate CZML with multiple entities',
  },

  // ============ COMPLEX/MULTI-STEP REQUESTS ============
  {
    category: 'complex',
    tool: 'flyTo',
    userInput: 'Show me Paris and add a red marker there',
    response: '{"tool": "flyTo", "arguments": {"longitude": 2.3522, "latitude": 48.8566, "height": 500000, "duration": 3}}\n{"tool": "addPoint", "arguments": {"longitude": 2.3522, "latitude": 48.8566, "name": "Paris", "color": "red"}}',
    explanation: 'Multiple tool calls for complex requests - each on separate line',
  },
  {
    category: 'complex',
    tool: 'multiple',
    userInput: 'Fly to Tokyo, add a label, and switch to 2D',
    response: '{"tool": "flyTo", "arguments": {"longitude": 139.6917, "latitude": 35.6895, "height": 500000, "duration": 3}}\n{"tool": "addLabel", "arguments": {"longitude": 139.6917, "latitude": 35.6895, "text": "Tokyo", "color": "white"}}\n{"tool": "setSceneMode", "arguments": {"mode": "2D"}}',
    explanation: 'Chain of three operations',
  },
] as const;

/**
 * Base system prompt with role definition and formatting rules
 */
export const SYSTEM_PROMPT_BASE = `You are a CesiumJS globe controller assistant. Your job is to help users interact with a 3D globe visualization by executing tool commands.

## YOUR RESPONSE FORMAT

When executing commands, respond with ONLY a JSON object. Do not include any other text, markdown, or explanation.

CORRECT format:
{"tool": "flyTo", "arguments": {"longitude": -74.006, "latitude": 40.7128, "height": 500000}}

INCORRECT formats (never do these):
- \`\`\`json {"tool": "flyTo", ...} \`\`\` (no markdown code blocks)
- "I'll fly you to New York: {"tool": ...}" (no text before/after)
- {"tool": "flyTo", args: {...}} (use "arguments" not "args")

## COORDINATE FORMAT

Always use this format for positions:
- longitude: number between -180 and 180 (negative = West, positive = East)
- latitude: number between -90 and 90 (negative = South, positive = North)
- height: positive number in meters

## HEIGHT RECOMMENDATIONS

Choose height based on what the user wants to see:
- Continent view: 10,000,000 meters
- Country view: 2,000,000 meters
- City view: 500,000 meters (default for most locations)
- Landmark view: 50,000 meters
- Building view: 1,000 meters
- Street level: 500 meters

## FLIGHT DURATION

- Same region: 1-2 seconds
- Different country: 3 seconds (default)
- Cross-continental: 4 seconds

## COLOR OPTIONS

Valid colors: red, green, blue, yellow, orange, purple, pink, cyan, white, black, gray

## HANDLING SPECIAL CASES

1. UNKNOWN LOCATIONS: If the user asks about a place you don't know the coordinates for, respond with text:
   "I don't have coordinates for that location. Could you provide the latitude and longitude, or describe a nearby major city?"

2. CAPABILITY QUESTIONS: If the user asks "what can you do?" or similar, respond with text explaining your tools.

3. MULTIPLE OPERATIONS: For requests like "go to Paris and add a marker", output multiple JSON objects on separate lines:
   {"tool": "flyTo", "arguments": {...}}
   {"tool": "addPoint", "arguments": {...}}

4. USER PROVIDES COORDINATES: When the user provides coordinates like "40.7128, -74.006", use them directly. Note that users often say "latitude, longitude" order.
`;

/**
 * Build the known locations section for the system prompt
 */
function buildKnownLocationsSection(): string {
  const sections: string[] = ['## KNOWN LOCATIONS\n'];

  sections.push('### Cities');
  for (const [name, coords] of Object.entries(KNOWN_LOCATIONS.cities)) {
    sections.push(`- ${name}: ${coords.longitude}, ${coords.latitude}`);
  }

  sections.push('\n### Landmarks');
  for (const [name, coords] of Object.entries(KNOWN_LOCATIONS.landmarks)) {
    sections.push(`- ${name}: ${coords.longitude}, ${coords.latitude}`);
  }

  sections.push('\n### Natural Features');
  for (const [name, coords] of Object.entries(KNOWN_LOCATIONS.natural)) {
    sections.push(`- ${name}: ${coords.longitude}, ${coords.latitude}`);
  }

  return sections.join('\n');
}

/**
 * Build the tools section with definitions
 */
function buildToolsSection(tools: ToolDefinition[]): string {
  if (tools.length === 0) {
    return '';
  }

  const sections: string[] = ['## AVAILABLE TOOLS\n'];

  for (const tool of tools) {
    sections.push(`### ${tool.name}`);
    sections.push(`${tool.description}`);
    sections.push(`Parameters: ${JSON.stringify(tool.inputSchema, null, 2)}`);
    sections.push('');
  }

  return sections.join('\n');
}

/**
 * Build the few-shot examples section
 * Selects the most relevant examples for common use cases
 */
function buildExamplesSection(): string {
  const sections: string[] = ['## EXAMPLES\n'];

  // Select key examples covering all major tool categories
  const selectedExamples = [
    // Camera
    FEW_SHOT_EXAMPLES.find(e => e.tool === 'flyTo' && e.userInput.includes('New York')),
    FEW_SHOT_EXAMPLES.find(e => e.tool === 'flyTo' && e.userInput.includes('Eiffel Tower')),
    FEW_SHOT_EXAMPLES.find(e => e.tool === 'lookAt'),
    FEW_SHOT_EXAMPLES.find(e => e.tool === 'zoom' && e.userInput === 'Zoom in'),
    // Entity creation
    FEW_SHOT_EXAMPLES.find(e => e.tool === 'addPoint' && e.userInput.includes('red marker')),
    FEW_SHOT_EXAMPLES.find(e => e.tool === 'addLabel'),
    FEW_SHOT_EXAMPLES.find(e => e.tool === 'addPolyline' && e.userInput.includes('London to Paris')),
    FEW_SHOT_EXAMPLES.find(e => e.tool === 'addPolygon' && !e.userInput.includes('3D')),
    FEW_SHOT_EXAMPLES.find(e => e.tool === 'addCircle' && e.userInput.includes('10km')),
    // Entity management
    FEW_SHOT_EXAMPLES.find(e => e.tool === 'removeEntity'),
    FEW_SHOT_EXAMPLES.find(e => e.tool === 'clearAll' && e.userInput.includes('Clear everything')),
    // Scene mode
    FEW_SHOT_EXAMPLES.find(e => e.tool === 'setSceneMode' && e.userInput.includes('2D')),
    FEW_SHOT_EXAMPLES.find(e => e.tool === 'setSceneMode' && e.userInput.includes('3D')),
    // Time controls
    FEW_SHOT_EXAMPLES.find(e => e.tool === 'setTime' && !e.userInput.includes('speed')),
    FEW_SHOT_EXAMPLES.find(e => e.tool === 'playAnimation'),
    FEW_SHOT_EXAMPLES.find(e => e.tool === 'pauseAnimation' && e.userInput === 'Pause the animation'),
    // CZML
    FEW_SHOT_EXAMPLES.find(e => e.tool === 'generateCZML' && e.userInput.includes('Tokyo')),
    // Complex
    FEW_SHOT_EXAMPLES.find(e => e.userInput.includes('Paris and add a red marker')),
  ].filter((e): e is typeof FEW_SHOT_EXAMPLES[number] => e !== undefined);

  for (const example of selectedExamples) {
    sections.push(`User: "${example.userInput}"`);
    sections.push(`Response: ${example.response}`);
    sections.push('');
  }

  return sections.join('\n');
}

/**
 * Build the complete system prompt with all components
 *
 * @param tools - Array of tool definitions to include
 * @returns Complete system prompt string
 */
export function buildSystemPrompt(tools: ToolDefinition[]): string {
  const sections: string[] = [
    SYSTEM_PROMPT_BASE,
    buildToolsSection(tools),
    buildExamplesSection(),
    buildKnownLocationsSection(),
  ];

  return sections.join('\n\n');
}

/**
 * Get height recommendation based on location type
 *
 * @param locationType - Type of location (city, landmark, building, etc.)
 * @returns Recommended height in meters
 */
export function getRecommendedHeight(locationType: keyof typeof LOCATION_HEIGHTS): number {
  return LOCATION_HEIGHTS[locationType] ?? LOCATION_HEIGHTS.default;
}

/**
 * Get flight duration recommendation based on distance type
 *
 * @param distanceType - Type of distance (nearby, regional, continental, global)
 * @returns Recommended duration in seconds
 */
export function getRecommendedDuration(distanceType: keyof typeof FLIGHT_DURATIONS): number {
  return FLIGHT_DURATIONS[distanceType] ?? FLIGHT_DURATIONS.continental;
}

/**
 * Look up coordinates for a known location
 *
 * @param locationName - Name of the location to look up
 * @returns Coordinates object or undefined if not found
 */
export function lookupLocation(locationName: string): { longitude: number; latitude: number } | undefined {
  const normalizedName = locationName.toLowerCase().trim();

  // Check cities
  if (normalizedName in KNOWN_LOCATIONS.cities) {
    return KNOWN_LOCATIONS.cities[normalizedName as keyof typeof KNOWN_LOCATIONS.cities];
  }

  // Check landmarks
  if (normalizedName in KNOWN_LOCATIONS.landmarks) {
    return KNOWN_LOCATIONS.landmarks[normalizedName as keyof typeof KNOWN_LOCATIONS.landmarks];
  }

  // Check natural features
  if (normalizedName in KNOWN_LOCATIONS.natural) {
    return KNOWN_LOCATIONS.natural[normalizedName as keyof typeof KNOWN_LOCATIONS.natural];
  }

  return undefined;
}

/**
 * Determine location type based on name patterns
 *
 * @param locationName - Name of the location
 * @returns Inferred location type
 */
export function inferLocationType(locationName: string): keyof typeof LOCATION_HEIGHTS {
  const normalizedName = locationName.toLowerCase().trim();

  // Check if it's a known landmark
  if (normalizedName in KNOWN_LOCATIONS.landmarks) {
    return 'landmark';
  }

  // Check if it's a known natural feature
  if (normalizedName in KNOWN_LOCATIONS.natural) {
    if (normalizedName.includes('mountain') || normalizedName.includes('mount')) {
      return 'mountain';
    }
    if (normalizedName.includes('river') || normalizedName.includes('falls')) {
      return 'river';
    }
    if (normalizedName.includes('lake') || normalizedName.includes('sea')) {
      return 'lake';
    }
    return 'region';
  }

  // Check if it's a known city
  if (normalizedName in KNOWN_LOCATIONS.cities) {
    return 'city';
  }

  // Pattern matching for common location types
  if (normalizedName.includes('building') || normalizedName.includes('tower') || normalizedName.includes('skyscraper')) {
    return 'building';
  }

  if (normalizedName.includes('street') || normalizedName.includes('avenue') || normalizedName.includes('road')) {
    return 'street';
  }

  if (normalizedName.includes('neighborhood') || normalizedName.includes('district')) {
    return 'neighborhood';
  }

  // Default to city-level view
  return 'city';
}
