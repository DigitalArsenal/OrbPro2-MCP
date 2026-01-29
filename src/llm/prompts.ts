/**
 * LLM Prompt Templates for CesiumJS Control
 * Contains structured prompts, few-shot examples, and helper functions for tool call generation
 */

import type { ToolDefinition } from './web-llm-engine';
import { buildTerminologyGuide } from './terminology-mapping';

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

  // ============ 3D SHAPES ============
  {
    category: 'entity',
    tool: 'addSphere',
    userInput: 'Add a red sphere at the Eiffel Tower',
    response: '{"tool": "addSphere", "arguments": {"longitude": 2.2945, "latitude": 48.8584, "radius": 100, "name": "Eiffel Tower Sphere", "color": "red"}}',
    explanation: 'Sphere with name and color at known landmark',
  },
  {
    category: 'entity',
    tool: 'addSphere',
    userInput: 'Put a 500 meter blue sphere over Tokyo',
    response: '{"tool": "addSphere", "arguments": {"longitude": 139.6917, "latitude": 35.6895, "radius": 500, "name": "Tokyo Sphere", "color": "blue"}}',
    explanation: 'Sphere with specified radius at known city',
  },
  {
    category: 'entity',
    tool: 'addSphere',
    userInput: 'Add a sphere to Washington DC',
    response: '{"tool": "addSphere", "arguments": {"longitude": -77.0369, "latitude": 38.9072, "radius": 1000, "name": "DC Sphere", "color": "red"}}',
    explanation: 'Sphere at known city with default radius',
  },
  {
    category: 'entity',
    tool: 'addSphere',
    userInput: 'Create a 100km radius sphere at New York',
    response: '{"tool": "addSphere", "arguments": {"longitude": -74.006, "latitude": 40.7128, "radius": 100000, "name": "NY Sphere", "color": "red"}}',
    explanation: 'Large sphere with 100km radius (100000 meters)',
  },
  {
    category: 'entity',
    tool: 'addSphere',
    userInput: 'Add a sphere to tokyo 100km in radius and 10 km above the ground',
    response: '{"tool": "addSphere", "arguments": {"longitude": 139.6917, "latitude": 35.6895, "radius": 100000, "height": 10000, "name": "Tokyo Sphere", "color": "red"}}',
    explanation: 'Sphere with specified radius and height above ground',
  },
  {
    category: 'entity',
    tool: 'addSphere',
    userInput: 'Put a ball over Paris',
    response: '{"tool": "addSphere", "arguments": {"longitude": 2.3522, "latitude": 48.8566, "radius": 1000, "name": "Paris Ball", "color": "red"}}',
    explanation: 'Ball is a synonym for sphere',
  },
  {
    category: 'entity',
    tool: 'addSphere',
    userInput: 'Add a large green sphere above London',
    response: '{"tool": "addSphere", "arguments": {"longitude": -0.1276, "latitude": 51.5074, "radius": 5000, "name": "London Sphere", "color": "green"}}',
    explanation: 'Large sphere at city location',
  },
  {
    category: 'entity',
    tool: 'addSphere',
    userInput: 'Create a 3D sphere at coordinates 40.7, -74.0',
    response: '{"tool": "addSphere", "arguments": {"longitude": -74.0, "latitude": 40.7, "radius": 1000, "name": "Sphere", "color": "red"}}',
    explanation: 'Sphere at explicit coordinates',
  },
  {
    category: 'entity',
    tool: 'addSphere',
    userInput: 'I want a sphere',
    response: '{"tool": "addSphere", "arguments": {"longitude": 0, "latitude": 0, "radius": 10000, "name": "Sphere", "color": "red"}}',
    explanation: 'Sphere request without location defaults to origin',
  },
  {
    category: 'entity',
    tool: 'addEllipsoid',
    userInput: 'Create an ellipsoid at the Statue of Liberty with radii 100x200x150',
    response: '{"tool": "addEllipsoid", "arguments": {"longitude": -74.0445, "latitude": 40.6892, "radiiX": 100, "radiiY": 200, "radiiZ": 150, "name": "Ellipsoid", "color": "green"}}',
    explanation: 'Ellipsoid with different radii in each direction',
  },
  {
    category: 'entity',
    tool: 'addCylinder',
    userInput: 'Add a 300 meter tall cylinder in London',
    response: '{"tool": "addCylinder", "arguments": {"longitude": -0.1276, "latitude": 51.5074, "length": 300, "topRadius": 50, "bottomRadius": 50, "name": "London Cylinder", "color": "gray"}}',
    explanation: 'Cylinder with equal top and bottom radii',
  },
  {
    category: 'entity',
    tool: 'addCylinder',
    userInput: 'Create a cone at Mount Fuji',
    response: '{"tool": "addCylinder", "arguments": {"longitude": 138.7274, "latitude": 35.3606, "length": 500, "topRadius": 0, "bottomRadius": 200, "name": "Cone", "color": "orange"}}',
    explanation: 'Cone is a cylinder with topRadius of 0',
  },
  {
    category: 'entity',
    tool: 'addSensorConeAtLocation',
    userInput: 'Add a sensor fan that is 30 degrees wide and 50 degrees tall in Paris',
    response: '{"tool": "addSensorConeAtLocation", "arguments": {"locationName": "Paris", "radius": 50000, "horizontalAngle": 30, "verticalAngle": 50, "color": "lime", "opacity": 0.5}}',
    explanation: 'Sensor cone with horizontal and vertical FOV angles',
  },
  {
    category: 'entity',
    tool: 'addSensorConeAtLocation',
    userInput: 'Add a radar cone at London pointing east, semi-transparent cyan',
    response: '{"tool": "addSensorConeAtLocation", "arguments": {"locationName": "London", "radius": 100000, "horizontalAngle": 45, "verticalAngle": 30, "heading": 90, "color": "cyan", "opacity": 0.4}}',
    explanation: 'Sensor cone with heading direction (90=east)',
  },
  {
    category: 'entity',
    tool: 'addSensorConeAtLocation',
    userInput: 'Create a camera field of view visualization at the Eiffel Tower',
    response: '{"tool": "addSensorConeAtLocation", "arguments": {"locationName": "Eiffel Tower", "radius": 500, "horizontalAngle": 60, "verticalAngle": 40, "color": "yellow", "opacity": 0.3}}',
    explanation: 'Camera FOV is visualized as a sensor cone',
  },
  {
    category: 'entity',
    tool: 'addSensorCone',
    userInput: 'Add a 30x50 degree sensor at coordinates 2.35, 48.85, lime green, semi-opaque',
    response: '{"tool": "addSensorCone", "arguments": {"longitude": 2.35, "latitude": 48.85, "radius": 50000, "horizontalAngle": 30, "verticalAngle": 50, "color": "lime", "opacity": 0.5}}',
    explanation: 'Coordinate-based sensor cone when user provides lat/lon',
  },
  {
    category: 'entity',
    tool: 'addSensorConeHere',
    userInput: 'Add a sensor fan that is 30 degrees wide and 50 degrees tall',
    response: '{"tool": "addSensorConeHere", "arguments": {"radius": 50000, "horizontalAngle": 30, "verticalAngle": 50, "color": "lime", "opacity": 0.5}}',
    explanation: 'Sensor without location uses addSensorConeHere (places at camera view center)',
  },
  {
    category: 'entity',
    tool: 'addBox',
    userInput: 'Put a 100x200x150 meter box in Sydney',
    response: '{"tool": "addBox", "arguments": {"longitude": 151.2093, "latitude": -33.8688, "dimensionX": 100, "dimensionY": 200, "dimensionZ": 150, "name": "Sydney Box", "color": "blue"}}',
    explanation: 'Box with specified dimensions',
  },
  {
    category: 'entity',
    tool: 'addCorridor',
    userInput: 'Draw a 50 meter wide road from Berlin to Prague',
    response: '{"tool": "addCorridor", "arguments": {"positions": [{"longitude": 13.4050, "latitude": 52.5200}, {"longitude": 14.4378, "latitude": 50.0755}], "width": 50, "name": "Berlin-Prague Route", "color": "gray"}}',
    explanation: 'Corridor (road) with width connecting two cities',
  },
  {
    category: 'entity',
    tool: 'addRectangle',
    userInput: 'Draw a rectangle covering Central Park',
    response: '{"tool": "addRectangle", "arguments": {"west": -73.973, "south": 40.764, "east": -73.949, "north": 40.800, "name": "Central Park", "color": "green"}}',
    explanation: 'Rectangle defined by west/south/east/north bounds',
  },
  {
    category: 'entity',
    tool: 'addWall',
    userInput: 'Create a wall around Washington DC',
    response: '{"tool": "addWall", "arguments": {"positions": [{"longitude": -77.05, "latitude": 38.92}, {"longitude": -77.02, "latitude": 38.92}, {"longitude": -77.02, "latitude": 38.88}, {"longitude": -77.05, "latitude": 38.88}, {"longitude": -77.05, "latitude": 38.92}], "maximumHeights": [500, 500, 500, 500, 500], "minimumHeights": [0, 0, 0, 0, 0], "name": "DC Wall", "color": "purple"}}',
    explanation: 'Wall with minimum and maximum heights',
  },
  {
    category: 'entity',
    tool: 'addModel',
    userInput: 'Add a 3D model at coordinates 51.5, -0.1',
    response: '{"tool": "addModel", "arguments": {"longitude": -0.1, "latitude": 51.5, "url": "https://example.com/model.glb", "scale": 1, "name": "3D Model"}}',
    explanation: 'Load a glTF model at specified coordinates',
  },

  // ============ BILLBOARDS ============
  {
    category: 'entity',
    tool: 'addBillboard',
    userInput: 'Add a pin icon at the Eiffel Tower',
    response: '{"tool": "addBillboard", "arguments": {"longitude": 2.2945, "latitude": 48.8584, "image": "https://cdn-icons-png.flaticon.com/512/684/684908.png", "name": "Eiffel Tower Pin"}}',
    explanation: 'Billboard with image URL at landmark',
  },
  {
    category: 'entity',
    tool: 'addBillboard',
    userInput: 'Put a marker image at 40.7128, -74.006',
    response: '{"tool": "addBillboard", "arguments": {"longitude": -74.006, "latitude": 40.7128, "image": "https://cdn-icons-png.flaticon.com/512/684/684908.png", "name": "Marker", "scale": 1}}',
    explanation: 'Billboard at specified coordinates',
  },
  {
    category: 'entity',
    tool: 'addBillboard',
    userInput: 'Add a large billboard icon at Tokyo',
    response: '{"tool": "addBillboard", "arguments": {"longitude": 139.6917, "latitude": 35.6895, "image": "https://cdn-icons-png.flaticon.com/512/684/684908.png", "name": "Tokyo Billboard", "scale": 2}}',
    explanation: 'Billboard with increased scale',
  },

  // ============ CAMERA SET VIEW (INSTANT) ============
  {
    category: 'camera',
    tool: 'setView',
    userInput: 'Jump to Paris instantly',
    response: '{"tool": "setView", "arguments": {"longitude": 2.3522, "latitude": 48.8566, "height": 500000}}',
    explanation: 'Instant camera positioning without animation',
  },
  {
    category: 'camera',
    tool: 'setView',
    userInput: 'Set camera to look at New York from above',
    response: '{"tool": "setView", "arguments": {"longitude": -74.006, "latitude": 40.7128, "height": 100000, "pitch": -90}}',
    explanation: 'setView with pitch looking straight down',
  },
  {
    category: 'camera',
    tool: 'setView',
    userInput: 'Teleport to 35.6895, 139.6917 facing east',
    response: '{"tool": "setView", "arguments": {"longitude": 139.6917, "latitude": 35.6895, "height": 1000, "heading": 90}}',
    explanation: 'setView with heading (90 = east)',
  },
  {
    category: 'camera',
    tool: 'setView',
    userInput: 'Position camera at street level in London',
    response: '{"tool": "setView", "arguments": {"longitude": -0.1276, "latitude": 51.5074, "height": 100, "pitch": 0}}',
    explanation: 'Street-level view with horizontal pitch',
  },

  // ============ GET CAMERA ============
  {
    category: 'camera',
    tool: 'getCamera',
    userInput: 'Where is the camera?',
    response: '{"tool": "getCamera", "arguments": {}}',
    explanation: 'Get current camera position and orientation',
  },
  {
    category: 'camera',
    tool: 'getCamera',
    userInput: 'What are my current coordinates?',
    response: '{"tool": "getCamera", "arguments": {}}',
    explanation: 'Retrieve camera state',
  },
  {
    category: 'camera',
    tool: 'getCamera',
    userInput: 'Show camera position',
    response: '{"tool": "getCamera", "arguments": {}}',
    explanation: 'Query camera location',
  },

  // ============ ROTATE CAMERA ============
  {
    category: 'camera',
    tool: 'rotateCamera',
    userInput: 'Turn the camera 45 degrees to the right',
    response: '{"tool": "rotateCamera", "arguments": {"heading": 45}}',
    explanation: 'Rotate camera heading (positive = clockwise)',
  },
  {
    category: 'camera',
    tool: 'rotateCamera',
    userInput: 'Look up a bit',
    response: '{"tool": "rotateCamera", "arguments": {"pitch": 15}}',
    explanation: 'Rotate camera pitch (positive = up)',
  },
  {
    category: 'camera',
    tool: 'rotateCamera',
    userInput: 'Pan left 90 degrees',
    response: '{"tool": "rotateCamera", "arguments": {"heading": -90}}',
    explanation: 'Rotate camera heading (negative = counter-clockwise)',
  },

  // ============ ENTITY MANAGEMENT ============
  {
    category: 'management',
    tool: 'selectEntity',
    userInput: 'Select the marker named Paris',
    response: '{"tool": "selectEntity", "arguments": {"entityId": "Paris"}}',
    explanation: 'Select entity by name to highlight and show info',
  },
  {
    category: 'management',
    tool: 'selectEntity',
    userInput: 'Click on the Eiffel Tower marker',
    response: '{"tool": "selectEntity", "arguments": {"entityId": "Eiffel Tower"}}',
    explanation: 'Select entity to show info box',
  },
  {
    category: 'management',
    tool: 'listEntities',
    userInput: 'What entities are on the map?',
    response: '{"tool": "listEntities", "arguments": {}}',
    explanation: 'Get list of all entities',
  },
  {
    category: 'management',
    tool: 'listEntities',
    userInput: 'Show all markers',
    response: '{"tool": "listEntities", "arguments": {}}',
    explanation: 'List all entities in scene',
  },
  {
    category: 'management',
    tool: 'getEntityInfo',
    userInput: 'Get details about the Tokyo marker',
    response: '{"tool": "getEntityInfo", "arguments": {"entityId": "Tokyo"}}',
    explanation: 'Get detailed information about specific entity',
  },
  {
    category: 'management',
    tool: 'showEntity',
    userInput: 'Show the hidden marker',
    response: '{"tool": "showEntity", "arguments": {"entityId": "hidden marker"}}',
    explanation: 'Make entity visible',
  },
  {
    category: 'management',
    tool: 'hideEntity',
    userInput: 'Hide the London point',
    response: '{"tool": "hideEntity", "arguments": {"entityId": "London point"}}',
    explanation: 'Hide entity from view',
  },
  {
    category: 'management',
    tool: 'flyToEntity',
    userInput: 'Fly to the Tokyo marker',
    response: '{"tool": "flyToEntity", "arguments": {"entityId": "Tokyo marker", "duration": 3}}',
    explanation: 'Fly camera to view specific entity',
  },

  // ============ DATA LOADING ============
  {
    category: 'data',
    tool: 'loadGeoJSON',
    userInput: 'Load GeoJSON from https://example.com/data.geojson',
    response: '{"tool": "loadGeoJSON", "arguments": {"url": "https://example.com/data.geojson", "name": "Loaded Data"}}',
    explanation: 'Load GeoJSON data from URL',
  },
  {
    category: 'data',
    tool: 'loadGeoJSON',
    userInput: 'Import the GeoJSON file and make it red',
    response: '{"tool": "loadGeoJSON", "arguments": {"url": "https://example.com/data.geojson", "stroke": "red", "fill": "red"}}',
    explanation: 'Load GeoJSON with styling',
  },
  {
    category: 'data',
    tool: 'loadKML',
    userInput: 'Load KML from https://example.com/places.kml',
    response: '{"tool": "loadKML", "arguments": {"url": "https://example.com/places.kml", "name": "KML Data"}}',
    explanation: 'Load KML file from URL',
  },
  {
    category: 'data',
    tool: 'loadKML',
    userInput: 'Import a KMZ file and clamp to ground',
    response: '{"tool": "loadKML", "arguments": {"url": "https://example.com/data.kmz", "clampToGround": true}}',
    explanation: 'Load KMZ with ground clamping',
  },
  {
    category: 'data',
    tool: 'loadCZML',
    userInput: 'Load CZML from https://example.com/data.czml',
    response: '{"tool": "loadCZML", "arguments": {"url": "https://example.com/data.czml", "name": "CZML Data"}}',
    explanation: 'Load CZML file from URL',
  },

  // ============ SCENE SETTINGS ============
  {
    category: 'scene',
    tool: 'setFog',
    userInput: 'Enable fog',
    response: '{"tool": "setFog", "arguments": {"enabled": true}}',
    explanation: 'Enable atmospheric fog',
  },
  {
    category: 'scene',
    tool: 'setFog',
    userInput: 'Turn on dense fog',
    response: '{"tool": "setFog", "arguments": {"enabled": true, "density": 0.001}}',
    explanation: 'Enable fog with higher density',
  },
  {
    category: 'scene',
    tool: 'setFog',
    userInput: 'Disable fog',
    response: '{"tool": "setFog", "arguments": {"enabled": false}}',
    explanation: 'Disable atmospheric fog',
  },
  {
    category: 'scene',
    tool: 'setShadows',
    userInput: 'Turn on shadows',
    response: '{"tool": "setShadows", "arguments": {"enabled": true}}',
    explanation: 'Enable shadow rendering',
  },
  {
    category: 'scene',
    tool: 'setShadows',
    userInput: 'Enable soft shadows',
    response: '{"tool": "setShadows", "arguments": {"enabled": true, "softShadows": true}}',
    explanation: 'Enable soft shadow edges',
  },
  {
    category: 'scene',
    tool: 'setShadows',
    userInput: 'Disable shadows',
    response: '{"tool": "setShadows", "arguments": {"enabled": false}}',
    explanation: 'Disable shadow rendering',
  },

  // ============ ANIMATION SPEED ============
  {
    category: 'time',
    tool: 'setAnimationSpeed',
    userInput: 'Speed up time 10x',
    response: '{"tool": "setAnimationSpeed", "arguments": {"multiplier": 10}}',
    explanation: 'Set time multiplier to 10x',
  },
  {
    category: 'time',
    tool: 'setAnimationSpeed',
    userInput: 'Slow down animation to half speed',
    response: '{"tool": "setAnimationSpeed", "arguments": {"multiplier": 0.5}}',
    explanation: 'Set time multiplier to 0.5x',
  },
  {
    category: 'time',
    tool: 'setAnimationSpeed',
    userInput: 'Run time backwards',
    response: '{"tool": "setAnimationSpeed", "arguments": {"multiplier": -1}}',
    explanation: 'Negative multiplier for reverse',
  },
  {
    category: 'time',
    tool: 'setAnimationSpeed',
    userInput: 'Reset animation to normal speed',
    response: '{"tool": "setAnimationSpeed", "arguments": {"multiplier": 1}}',
    explanation: 'Reset to real-time',
  },

  // ============ IMAGERY ============
  {
    category: 'imagery',
    tool: 'removeImagery',
    userInput: 'Remove the first imagery layer',
    response: '{"tool": "removeImagery", "arguments": {"index": 0}}',
    explanation: 'Remove imagery layer at index 0',
  },
  {
    category: 'imagery',
    tool: 'setImageryAlpha',
    userInput: 'Make the base map 50% transparent',
    response: '{"tool": "setImageryAlpha", "arguments": {"index": 0, "alpha": 0.5}}',
    explanation: 'Set imagery layer transparency',
  },
  {
    category: 'imagery',
    tool: 'setImageryAlpha',
    userInput: 'Set imagery layer 1 to fully opaque',
    response: '{"tool": "setImageryAlpha", "arguments": {"index": 1, "alpha": 1.0}}',
    explanation: 'Set alpha to 1.0 for full opacity',
  },

  // ============ 3D TILES ============
  {
    category: '3dtiles',
    tool: 'load3DTiles',
    userInput: 'Load 3D buildings from Cesium Ion',
    response: '{"tool": "load3DTiles", "arguments": {"id": "buildings", "url": "https://tiles.cesium.com/tileset.json", "assetId": 96188}}',
    explanation: 'Load 3D tileset from Cesium Ion',
  },
  {
    category: '3dtiles',
    tool: 'style3DTiles',
    userInput: 'Make all buildings red',
    response: '{"tool": "style3DTiles", "arguments": {"id": "buildings", "color": "color(\'red\')"}}',
    explanation: 'Apply color style to 3D tileset',
  },
  {
    category: '3dtiles',
    tool: 'remove3DTiles',
    userInput: 'Remove the buildings tileset',
    response: '{"tool": "remove3DTiles", "arguments": {"id": "buildings"}}',
    explanation: 'Remove 3D tileset by ID',
  },

  // ============ TERRAIN ============
  {
    category: 'terrain',
    tool: 'setTerrainExaggeration',
    userInput: 'Exaggerate the terrain 2x',
    response: '{"tool": "setTerrainExaggeration", "arguments": {"factor": 2}}',
    explanation: 'Double the vertical exaggeration',
  },
  {
    category: 'terrain',
    tool: 'setTerrainExaggeration',
    userInput: 'Reset terrain to normal',
    response: '{"tool": "setTerrainExaggeration", "arguments": {"factor": 1}}',
    explanation: 'Reset terrain exaggeration to 1x',
  },
  {
    category: 'terrain',
    tool: 'sampleTerrainHeight',
    userInput: 'What is the elevation at Mount Everest?',
    response: '{"tool": "sampleTerrainHeight", "arguments": {"longitude": 86.9250, "latitude": 27.9881}}',
    explanation: 'Sample terrain height at coordinates',
  },
  {
    category: 'terrain',
    tool: 'sampleTerrainHeight',
    userInput: 'Get terrain height at 40.7, -74.0',
    response: '{"tool": "sampleTerrainHeight", "arguments": {"longitude": -74.0, "latitude": 40.7}}',
    explanation: 'Sample terrain elevation at given coordinates',
  },

  // ============ LIGHTING AND ATMOSPHERE ============
  {
    category: 'scene',
    tool: 'setLighting',
    userInput: 'Enable sun lighting on the globe',
    response: '{"tool": "setLighting", "arguments": {"enableLighting": true}}',
    explanation: 'Enable globe lighting based on sun position',
  },
  {
    category: 'scene',
    tool: 'setLighting',
    userInput: 'Turn off day/night lighting',
    response: '{"tool": "setLighting", "arguments": {"enableLighting": false}}',
    explanation: 'Disable sun-based lighting',
  },
  {
    category: 'scene',
    tool: 'setAtmosphere',
    userInput: 'Show the atmosphere',
    response: '{"tool": "setAtmosphere", "arguments": {"show": true}}',
    explanation: 'Show sky atmosphere effect',
  },
  {
    category: 'scene',
    tool: 'setAtmosphere',
    userInput: 'Make the sky more orange',
    response: '{"tool": "setAtmosphere", "arguments": {"show": true, "hueShift": 0.3}}',
    explanation: 'Shift atmosphere hue toward orange',
  },
  {
    category: 'scene',
    tool: 'setAtmosphere',
    userInput: 'Make the atmosphere brighter',
    response: '{"tool": "setAtmosphere", "arguments": {"show": true, "brightnessShift": 0.5}}',
    explanation: 'Increase atmosphere brightness',
  },
  {
    category: 'scene',
    tool: 'setGlobe',
    userInput: 'Hide the globe',
    response: '{"tool": "setGlobe", "arguments": {"show": false}}',
    explanation: 'Hide the globe (show only entities)',
  },
  {
    category: 'scene',
    tool: 'setGlobe',
    userInput: 'Show the ground atmosphere',
    response: '{"tool": "setGlobe", "arguments": {"showGroundAtmosphere": true}}',
    explanation: 'Enable ground-level atmosphere',
  },
  {
    category: 'scene',
    tool: 'setGlobe',
    userInput: 'Make the ocean blue',
    response: '{"tool": "setGlobe", "arguments": {"baseColor": "blue"}}',
    explanation: 'Set globe base color',
  },
  {
    category: 'scene',
    tool: 'enableDepthTest',
    userInput: 'Enable depth testing against terrain',
    response: '{"tool": "enableDepthTest", "arguments": {"enabled": true}}',
    explanation: 'Make entities hidden behind terrain',
  },
  {
    category: 'scene',
    tool: 'enableDepthTest',
    userInput: 'Show entities through terrain',
    response: '{"tool": "enableDepthTest", "arguments": {"enabled": false}}',
    explanation: 'Disable depth testing so entities show through terrain',
  },

  // ============ WMS AND DATA LOADING ============
  {
    category: 'data',
    tool: 'addWMS',
    userInput: 'Add a WMS weather layer',
    response: '{"tool": "addWMS", "arguments": {"url": "https://example.com/wms", "layers": "precipitation", "name": "Weather"}}',
    explanation: 'Add WMS imagery layer',
  },
  {
    category: 'data',
    tool: 'loadGPX',
    userInput: 'Load my hiking track from gpx file',
    response: '{"tool": "loadGPX", "arguments": {"url": "https://example.com/track.gpx", "name": "Hiking Track", "clampToGround": true}}',
    explanation: 'Load GPX track file',
  },

  // ============ MEASUREMENT ============
  {
    category: 'measurement',
    tool: 'measureDistance',
    userInput: 'Measure distance from New York to London',
    response: '{"tool": "measureDistance", "arguments": {"start": {"longitude": -74.006, "latitude": 40.7128}, "end": {"longitude": -0.1276, "latitude": 51.5074}}}',
    explanation: 'Calculate distance between two cities',
  },
  {
    category: 'measurement',
    tool: 'measureDistance',
    userInput: 'How far is it from 0,0 to 10,10?',
    response: '{"tool": "measureDistance", "arguments": {"start": {"longitude": 0, "latitude": 0}, "end": {"longitude": 10, "latitude": 10}}}',
    explanation: 'Distance between coordinate pairs',
  },

  // ============ IMAGERY SETTINGS ============
  {
    category: 'imagery',
    tool: 'setImageryBrightness',
    userInput: 'Increase brightness of the base map',
    response: '{"tool": "setImageryBrightness", "arguments": {"index": 0, "brightness": 1.5}}',
    explanation: 'Increase imagery brightness',
  },
  {
    category: 'imagery',
    tool: 'setImageryBrightness',
    userInput: 'Make the map more saturated',
    response: '{"tool": "setImageryBrightness", "arguments": {"index": 0, "saturation": 1.5}}',
    explanation: 'Increase imagery saturation',
  },
  {
    category: 'imagery',
    tool: 'setImageryBrightness',
    userInput: 'Desaturate the map layer',
    response: '{"tool": "setImageryBrightness", "arguments": {"index": 0, "saturation": 0.3}}',
    explanation: 'Lower saturation for muted colors',
  },
  {
    category: 'imagery',
    tool: 'splitImagery',
    userInput: 'Enable split screen view',
    response: '{"tool": "splitImagery", "arguments": {"enabled": true}}',
    explanation: 'Enable side-by-side imagery comparison',
  },
  {
    category: 'imagery',
    tool: 'splitImagery',
    userInput: 'Compare two map layers side by side',
    response: '{"tool": "splitImagery", "arguments": {"enabled": true, "position": 0.5}}',
    explanation: 'Split screen at center',
  },
  {
    category: 'imagery',
    tool: 'splitImagery',
    userInput: 'Disable split screen',
    response: '{"tool": "splitImagery", "arguments": {"enabled": false}}',
    explanation: 'Turn off split screen mode',
  },

  // ============ POST-PROCESSING EFFECTS ============
  {
    category: 'scene',
    tool: 'enableFXAA',
    userInput: 'Enable anti-aliasing',
    response: '{"tool": "enableFXAA", "arguments": {"enabled": true}}',
    explanation: 'Enable FXAA anti-aliasing',
  },
  {
    category: 'scene',
    tool: 'enableFXAA',
    userInput: 'Turn off anti-aliasing',
    response: '{"tool": "enableFXAA", "arguments": {"enabled": false}}',
    explanation: 'Disable FXAA',
  },
  {
    category: 'scene',
    tool: 'setBloom',
    userInput: 'Enable bloom effect',
    response: '{"tool": "setBloom", "arguments": {"enabled": true}}',
    explanation: 'Enable bloom post-processing',
  },
  {
    category: 'scene',
    tool: 'setBloom',
    userInput: 'Make bright objects glow more',
    response: '{"tool": "setBloom", "arguments": {"enabled": true, "brightness": 0.5}}',
    explanation: 'Increase bloom brightness',
  },
  {
    category: 'scene',
    tool: 'setBloom',
    userInput: 'Disable bloom effect',
    response: '{"tool": "setBloom", "arguments": {"enabled": false}}',
    explanation: 'Turn off bloom',
  },

  // ============ SCREEN COORDINATE TOOLS ============
  {
    category: 'pick',
    tool: 'getScreenPosition',
    userInput: 'Where is New York on screen?',
    response: '{"tool": "getScreenPosition", "arguments": {"longitude": -74.006, "latitude": 40.7128}}',
    explanation: 'Convert geographic to screen coordinates',
  },
  {
    category: 'pick',
    tool: 'getScreenPosition',
    userInput: 'Get pixel coordinates for lat 51.5, lon -0.1',
    response: '{"tool": "getScreenPosition", "arguments": {"longitude": -0.1, "latitude": 51.5}}',
    explanation: 'Screen position for given coordinates',
  },
  {
    category: 'pick',
    tool: 'getCartographic',
    userInput: 'What location is at pixel 500, 300?',
    response: '{"tool": "getCartographic", "arguments": {"x": 500, "y": 300}}',
    explanation: 'Convert screen position to geographic',
  },
  {
    category: 'pick',
    tool: 'getCartographic',
    userInput: 'Get lat/lon at screen position 1000, 500',
    response: '{"tool": "getCartographic", "arguments": {"x": 1000, "y": 500}}',
    explanation: 'Pick geographic coordinates from screen',
  },
  {
    category: 'pick',
    tool: 'pickEntity',
    userInput: 'What entity is at pixel 400, 300?',
    response: '{"tool": "pickEntity", "arguments": {"x": 400, "y": 300}}',
    explanation: 'Get entity at screen position',
  },
  {
    category: 'pick',
    tool: 'pickEntity',
    userInput: 'Click at screen position 600, 400',
    response: '{"tool": "pickEntity", "arguments": {"x": 600, "y": 400}}',
    explanation: 'Pick entity at coordinates',
  },

  // ============ SKYBOX ============
  {
    category: 'scene',
    tool: 'setSkybox',
    userInput: 'Hide the sky background',
    response: '{"tool": "setSkybox", "arguments": {"show": false}}',
    explanation: 'Hide the skybox',
  },
  {
    category: 'scene',
    tool: 'setSkybox',
    userInput: 'Show the stars',
    response: '{"tool": "setSkybox", "arguments": {"show": true}}',
    explanation: 'Show the skybox',
  },

  // ============ 3D TILES HIGHLIGHT ============
  {
    category: '3dtiles',
    tool: 'highlight3DTile',
    userInput: 'Highlight the buildings in yellow',
    response: '{"tool": "highlight3DTile", "arguments": {"id": "buildings", "color": "yellow"}}',
    explanation: 'Highlight tileset features',
  },
  {
    category: '3dtiles',
    tool: 'highlight3DTile',
    userInput: 'Make the tileset red',
    response: '{"tool": "highlight3DTile", "arguments": {"id": "buildings", "color": "red"}}',
    explanation: 'Change tileset highlight color',
  },

  // ============ TRACKING AND ORBIT ============
  {
    category: 'camera',
    tool: 'trackEntity',
    userInput: 'Follow the airplane',
    response: '{"tool": "trackEntity", "arguments": {"entityId": "airplane"}}',
    explanation: 'Track a moving entity',
  },
  {
    category: 'camera',
    tool: 'orbitTarget',
    userInput: 'Orbit around the Eiffel Tower for 30 seconds',
    response: '{"tool": "orbitTarget", "arguments": {"longitude": 2.2945, "latitude": 48.8584, "duration": 30}}',
    explanation: 'Camera orbit animation around target',
  },
  {
    category: 'camera',
    tool: 'stopTracking',
    userInput: 'Stop following the entity',
    response: '{"tool": "stopTracking", "arguments": {}}',
    explanation: 'Stop entity tracking',
  },
  {
    category: 'camera',
    tool: 'stopOrbit',
    userInput: 'Stop the orbit animation',
    response: '{"tool": "stopOrbit", "arguments": {}}',
    explanation: 'Stop orbit animation',
  },

  // ============ STYLED POLYLINES ============
  {
    category: 'entity',
    tool: 'addGlowingPolyline',
    userInput: 'Draw a glowing line from Tokyo to Sydney',
    response: '{"tool": "addGlowingPolyline", "arguments": {"positions": [{"longitude": 139.6917, "latitude": 35.6895}, {"longitude": 151.2093, "latitude": -33.8688}], "name": "Glowing Route", "color": "cyan", "glowPower": 0.25}}',
    explanation: 'Glowing polyline between two cities',
  },
  {
    category: 'entity',
    tool: 'addGlowingPolyline',
    userInput: 'Make a bright glowing path from New York to LA',
    response: '{"tool": "addGlowingPolyline", "arguments": {"positions": [{"longitude": -74.006, "latitude": 40.7128}, {"longitude": -118.2437, "latitude": 34.0522}], "color": "green", "glowPower": 0.5}}',
    explanation: 'Glowing line with increased glow power',
  },
  {
    category: 'entity',
    tool: 'addDashedPolyline',
    userInput: 'Draw a dashed line from London to Paris',
    response: '{"tool": "addDashedPolyline", "arguments": {"positions": [{"longitude": -0.1276, "latitude": 51.5074}, {"longitude": 2.3522, "latitude": 48.8566}], "name": "Dashed Route", "color": "yellow"}}',
    explanation: 'Dashed polyline between two cities',
  },
  {
    category: 'entity',
    tool: 'addDashedPolyline',
    userInput: 'Create a dotted line from Berlin to Rome',
    response: '{"tool": "addDashedPolyline", "arguments": {"positions": [{"longitude": 13.4050, "latitude": 52.5200}, {"longitude": 12.4964, "latitude": 41.9028}], "color": "white", "dashLength": 8}}',
    explanation: 'Dashed line with shorter dash length',
  },
  {
    category: 'entity',
    tool: 'addArrowPolyline',
    userInput: 'Draw an arrow from Washington DC to New York',
    response: '{"tool": "addArrowPolyline", "arguments": {"positions": [{"longitude": -77.0369, "latitude": 38.9072}, {"longitude": -74.006, "latitude": 40.7128}], "name": "Arrow Route", "color": "red"}}',
    explanation: 'Arrow-tipped polyline showing direction',
  },
  {
    category: 'entity',
    tool: 'addArrowPolyline',
    userInput: 'Show the direction from Boston to Miami with an arrow',
    response: '{"tool": "addArrowPolyline", "arguments": {"positions": [{"longitude": -71.0589, "latitude": 42.3601}, {"longitude": -80.1918, "latitude": 25.7617}], "color": "orange", "width": 15}}',
    explanation: 'Arrow polyline with wider width',
  },
  {
    category: 'entity',
    tool: 'addOutlinedPolyline',
    userInput: 'Draw an outlined route from Seattle to Denver',
    response: '{"tool": "addOutlinedPolyline", "arguments": {"positions": [{"longitude": -122.3321, "latitude": 47.6062}, {"longitude": -104.9903, "latitude": 39.7392}], "name": "Outlined Route", "color": "white", "outlineColor": "blue"}}',
    explanation: 'Polyline with outline for visibility',
  },
  {
    category: 'entity',
    tool: 'addOutlinedPolyline',
    userInput: 'Make a black bordered white line from Chicago to Toronto',
    response: '{"tool": "addOutlinedPolyline", "arguments": {"positions": [{"longitude": -87.6298, "latitude": 41.8781}, {"longitude": -79.3832, "latitude": 43.6532}], "color": "white", "outlineColor": "black", "outlineWidth": 3}}',
    explanation: 'Outlined polyline with thicker outline',
  },

  // ============ MATERIALS ============
  {
    category: 'material',
    tool: 'setImageMaterial',
    userInput: 'Apply a brick texture to the polygon',
    response: '{"tool": "setImageMaterial", "arguments": {"entityId": "polygon1", "imageUrl": "https://example.com/brick.jpg"}}',
    explanation: 'Apply image material to entity',
  },
  {
    category: 'material',
    tool: 'setImageMaterial',
    userInput: 'Put a tiled texture on the rectangle with 4x4 repeat',
    response: '{"tool": "setImageMaterial", "arguments": {"entityId": "rectangle1", "imageUrl": "https://example.com/tiles.png", "repeatX": 4, "repeatY": 4}}',
    explanation: 'Image material with repeat',
  },
  {
    category: 'material',
    tool: 'setGridMaterial',
    userInput: 'Apply a grid pattern to the polygon',
    response: '{"tool": "setGridMaterial", "arguments": {"entityId": "polygon1", "color": "white"}}',
    explanation: 'Grid material on entity',
  },
  {
    category: 'material',
    tool: 'setGridMaterial',
    userInput: 'Make a blue grid with 12 lines on the circle',
    response: '{"tool": "setGridMaterial", "arguments": {"entityId": "circle1", "color": "blue", "lineCountX": 12, "lineCountY": 12}}',
    explanation: 'Grid with custom line count',
  },
  {
    category: 'material',
    tool: 'setStripeMaterial',
    userInput: 'Add stripes to the polygon',
    response: '{"tool": "setStripeMaterial", "arguments": {"entityId": "polygon1", "evenColor": "white", "oddColor": "blue"}}',
    explanation: 'Stripe material on entity',
  },
  {
    category: 'material',
    tool: 'setStripeMaterial',
    userInput: 'Make vertical red and white stripes on the rectangle',
    response: '{"tool": "setStripeMaterial", "arguments": {"entityId": "rectangle1", "evenColor": "red", "oddColor": "white", "orientation": "VERTICAL", "repeat": 8}}',
    explanation: 'Vertical stripes with custom colors',
  },
  {
    category: 'material',
    tool: 'setCheckerboardMaterial',
    userInput: 'Make the polygon a checkerboard pattern',
    response: '{"tool": "setCheckerboardMaterial", "arguments": {"entityId": "polygon1", "evenColor": "white", "oddColor": "black"}}',
    explanation: 'Checkerboard material on entity',
  },
  {
    category: 'material',
    tool: 'setCheckerboardMaterial',
    userInput: 'Apply a red and white checkerboard to the rectangle',
    response: '{"tool": "setCheckerboardMaterial", "arguments": {"entityId": "rectangle1", "evenColor": "red", "oddColor": "white", "repeatX": 8, "repeatY": 8}}',
    explanation: 'Checkerboard with custom colors and repeat',
  },

  // ============ CLIPPING PLANES ============
  {
    category: '3dtiles',
    tool: 'clip3DTiles',
    userInput: 'Cut through the buildings tileset',
    response: '{"tool": "clip3DTiles", "arguments": {"id": "buildings", "enabled": true}}',
    explanation: 'Enable clipping on 3D tileset',
  },
  {
    category: '3dtiles',
    tool: 'clip3DTiles',
    userInput: 'Disable clipping on the city tileset',
    response: '{"tool": "clip3DTiles", "arguments": {"id": "city", "enabled": false}}',
    explanation: 'Disable clipping planes',
  },
  {
    category: '3dtiles',
    tool: 'clip3DTiles',
    userInput: 'Clip the tileset horizontally at 100 meters',
    response: '{"tool": "clip3DTiles", "arguments": {"id": "buildings", "enabled": true, "distance": 100}}',
    explanation: 'Clipping with distance parameter',
  },
  {
    category: 'terrain',
    tool: 'clipTerrain',
    userInput: 'Enable terrain clipping',
    response: '{"tool": "clipTerrain", "arguments": {"enabled": true, "height": 0}}',
    explanation: 'Enable terrain clipping at sea level',
  },
  {
    category: 'terrain',
    tool: 'clipTerrain',
    userInput: 'Cut the terrain at 500 meters',
    response: '{"tool": "clipTerrain", "arguments": {"enabled": true, "height": 500}}',
    explanation: 'Clip terrain at specific height',
  },
  {
    category: 'terrain',
    tool: 'clipTerrain',
    userInput: 'Disable terrain clipping',
    response: '{"tool": "clipTerrain", "arguments": {"enabled": false}}',
    explanation: 'Turn off terrain clipping',
  },

  // ============ PARTICLE SYSTEMS ============
  {
    category: 'particles',
    tool: 'addParticleSystem',
    userInput: 'Add fire at the Eiffel Tower',
    response: '{"tool": "addParticleSystem", "arguments": {"id": "fire1", "longitude": 2.2945, "latitude": 48.8584, "height": 0, "particleType": "fire"}}',
    explanation: 'Fire particle effect at landmark',
  },
  {
    category: 'particles',
    tool: 'addParticleSystem',
    userInput: 'Create smoke at 51.5, -0.1',
    response: '{"tool": "addParticleSystem", "arguments": {"id": "smoke1", "longitude": -0.1, "latitude": 51.5, "particleType": "smoke"}}',
    explanation: 'Smoke effect at coordinates',
  },
  {
    category: 'particles',
    tool: 'addParticleSystem',
    userInput: 'Add an explosion effect at Tokyo',
    response: '{"tool": "addParticleSystem", "arguments": {"id": "explosion1", "longitude": 139.6917, "latitude": 35.6895, "particleType": "explosion", "emissionRate": 100}}',
    explanation: 'Explosion with higher emission rate',
  },
  {
    category: 'particles',
    tool: 'addParticleSystem',
    userInput: 'Create a blue fire effect in New York',
    response: '{"tool": "addParticleSystem", "arguments": {"id": "blueFire", "longitude": -74.006, "latitude": 40.7128, "particleType": "fire", "startColor": "blue", "endColor": "cyan"}}',
    explanation: 'Fire with custom colors',
  },

  // ============ WEATHER EFFECTS ============
  {
    category: 'weather',
    tool: 'addWeatherEffect',
    userInput: 'Make it rain',
    response: '{"tool": "addWeatherEffect", "arguments": {"effectType": "rain", "intensity": 0.5}}',
    explanation: 'Add rain effect',
  },
  {
    category: 'weather',
    tool: 'addWeatherEffect',
    userInput: 'Add snow effect',
    response: '{"tool": "addWeatherEffect", "arguments": {"effectType": "snow", "intensity": 0.7}}',
    explanation: 'Add snow effect',
  },
  {
    category: 'weather',
    tool: 'addWeatherEffect',
    userInput: 'Create heavy fog',
    response: '{"tool": "addWeatherEffect", "arguments": {"effectType": "fog", "intensity": 0.9}}',
    explanation: 'Dense fog effect',
  },
  {
    category: 'weather',
    tool: 'addWeatherEffect',
    userInput: 'Add light rain',
    response: '{"tool": "addWeatherEffect", "arguments": {"effectType": "rain", "intensity": 0.2}}',
    explanation: 'Low intensity rain',
  },

  // ============ VOLUMETRIC CLOUDS ============
  {
    category: 'clouds',
    tool: 'addVolumetricCloud',
    userInput: 'Add a cloud above Paris',
    response: '{"tool": "addVolumetricCloud", "arguments": {"id": "cloud1", "longitude": 2.3522, "latitude": 48.8566, "height": 3000}}',
    explanation: 'Volumetric cloud at location',
  },
  {
    category: 'clouds',
    tool: 'addVolumetricCloud',
    userInput: 'Create a large cloud over the Grand Canyon',
    response: '{"tool": "addVolumetricCloud", "arguments": {"id": "grandCloud", "longitude": -112.1401, "latitude": 36.0544, "height": 5000, "scale": 2}}',
    explanation: 'Larger cloud with scale parameter',
  },
  {
    category: 'clouds',
    tool: 'addVolumetricCloud',
    userInput: 'Add clouds at 40.7, -74.0',
    response: '{"tool": "addVolumetricCloud", "arguments": {"id": "nycCloud", "longitude": -74.0, "latitude": 40.7, "height": 2000}}',
    explanation: 'Cloud at coordinates',
  },

  // ============ LENS FLARE ============
  {
    category: 'effects',
    tool: 'addLensFlare',
    userInput: 'Enable lens flare',
    response: '{"tool": "addLensFlare", "arguments": {"enabled": true}}',
    explanation: 'Enable lens flare effect',
  },
  {
    category: 'effects',
    tool: 'addLensFlare',
    userInput: 'Turn on sun glare with high intensity',
    response: '{"tool": "addLensFlare", "arguments": {"enabled": true, "intensity": 1.5}}',
    explanation: 'Lens flare with intensity',
  },
  {
    category: 'effects',
    tool: 'addLensFlare',
    userInput: 'Disable lens flare',
    response: '{"tool": "addLensFlare", "arguments": {"enabled": false}}',
    explanation: 'Turn off lens flare',
  },
  {
    category: 'effects',
    tool: 'addLensFlare',
    userInput: 'Add subtle sun flare',
    response: '{"tool": "addLensFlare", "arguments": {"enabled": true, "intensity": 0.5}}',
    explanation: 'Low intensity lens flare',
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

  // ============ ADDITIONAL CAMERA EXAMPLES ============
  {
    category: 'camera',
    tool: 'setView',
    userInput: 'Teleport to New York',
    response: '{"tool": "setView", "arguments": {"longitude": -74.006, "latitude": 40.7128, "height": 500000}}',
    explanation: 'Instant camera move without animation',
  },
  {
    category: 'camera',
    tool: 'setView',
    userInput: 'Set camera to Sydney instantly facing south',
    response: '{"tool": "setView", "arguments": {"longitude": 151.2093, "latitude": -33.8688, "height": 100000, "heading": 180}}',
    explanation: 'setView with heading (180 = south)',
  },
  {
    category: 'camera',
    tool: 'setView',
    userInput: 'Jump to Berlin looking down',
    response: '{"tool": "setView", "arguments": {"longitude": 13.4050, "latitude": 52.5200, "height": 50000, "pitch": -90}}',
    explanation: 'setView with pitch looking straight down',
  },
  {
    category: 'camera',
    tool: 'rotateCamera',
    userInput: 'Turn left 45 degrees',
    response: '{"tool": "rotateCamera", "arguments": {"heading": -45}}',
    explanation: 'Rotate camera left (negative heading)',
  },
  {
    category: 'camera',
    tool: 'rotateCamera',
    userInput: 'Look down more',
    response: '{"tool": "rotateCamera", "arguments": {"pitch": -20}}',
    explanation: 'Tilt camera downward (negative pitch)',
  },
  {
    category: 'camera',
    tool: 'rotateCamera',
    userInput: 'Pan the camera 180 degrees',
    response: '{"tool": "rotateCamera", "arguments": {"heading": 180}}',
    explanation: 'Full 180 degree camera rotation',
  },
  {
    category: 'camera',
    tool: 'trackEntity',
    userInput: 'Follow the satellite',
    response: '{"tool": "trackEntity", "arguments": {"entityId": "satellite"}}',
    explanation: 'Track a named entity',
  },
  {
    category: 'camera',
    tool: 'trackEntity',
    userInput: 'Lock camera to the ship',
    response: '{"tool": "trackEntity", "arguments": {"entityId": "ship"}}',
    explanation: 'Follow entity with camera',
  },
  {
    category: 'camera',
    tool: 'trackEntity',
    userInput: 'Track the car marker',
    response: '{"tool": "trackEntity", "arguments": {"entityId": "car marker"}}',
    explanation: 'Keep camera focused on moving entity',
  },
  {
    category: 'camera',
    tool: 'stopTracking',
    userInput: 'Stop tracking',
    response: '{"tool": "stopTracking", "arguments": {}}',
    explanation: 'Disable entity tracking',
  },
  {
    category: 'camera',
    tool: 'stopTracking',
    userInput: 'Unfollow the entity',
    response: '{"tool": "stopTracking", "arguments": {}}',
    explanation: 'Stop camera tracking',
  },
  {
    category: 'camera',
    tool: 'orbitTarget',
    userInput: 'Circle around New York for 60 seconds',
    response: '{"tool": "orbitTarget", "arguments": {"longitude": -74.006, "latitude": 40.7128, "duration": 60}}',
    explanation: 'Orbit animation around city',
  },
  {
    category: 'camera',
    tool: 'orbitTarget',
    userInput: 'Rotate around the Statue of Liberty',
    response: '{"tool": "orbitTarget", "arguments": {"longitude": -74.0445, "latitude": 40.6892, "duration": 30}}',
    explanation: 'Orbit around landmark',
  },
  {
    category: 'camera',
    tool: 'orbitTarget',
    userInput: 'Orbit Tokyo Tower for 20 seconds at 5000m',
    response: '{"tool": "orbitTarget", "arguments": {"longitude": 139.7454, "latitude": 35.6586, "duration": 20, "radius": 5000}}',
    explanation: 'Orbit with custom radius',
  },
  {
    category: 'camera',
    tool: 'stopOrbit',
    userInput: 'Stop orbiting',
    response: '{"tool": "stopOrbit", "arguments": {}}',
    explanation: 'Stop orbit animation',
  },

  // ============ ADDITIONAL SPHERE EXAMPLES ============
  {
    category: 'entity',
    tool: 'addSphere',
    userInput: 'Add a blue ball at Sydney',
    response: '{"tool": "addSphere", "arguments": {"longitude": 151.2093, "latitude": -33.8688, "radius": 1000, "name": "Sydney Ball", "color": "blue"}}',
    explanation: 'Ball synonym for sphere',
  },
  {
    category: 'entity',
    tool: 'addSphere',
    userInput: 'Put a sphere over the Kremlin',
    response: '{"tool": "addSphere", "arguments": {"longitude": 37.6176, "latitude": 55.7520, "radius": 500, "name": "Kremlin Sphere", "color": "red"}}',
    explanation: 'Sphere at landmark',
  },
  {
    category: 'entity',
    tool: 'addSphere',
    userInput: 'Create a yellow sphere in Dubai',
    response: '{"tool": "addSphere", "arguments": {"longitude": 55.2708, "latitude": 25.2048, "radius": 2000, "name": "Dubai Sphere", "color": "yellow"}}',
    explanation: 'Sphere with color at city',
  },
  {
    category: 'entity',
    tool: 'addSphere',
    userInput: 'Add a tiny sphere at the Pyramids',
    response: '{"tool": "addSphere", "arguments": {"longitude": 31.1342, "latitude": 29.9792, "radius": 100, "name": "Pyramids Sphere", "color": "gold"}}',
    explanation: 'Small radius sphere',
  },
  {
    category: 'entity',
    tool: 'addSphere',
    userInput: 'Make a giant sphere covering Europe',
    response: '{"tool": "addSphere", "arguments": {"longitude": 10, "latitude": 50, "radius": 1000000, "name": "Europe Sphere", "color": "blue"}}',
    explanation: 'Very large sphere',
  },
  {
    category: 'entity',
    tool: 'addSphere',
    userInput: 'Add spheres at Berlin and Rome',
    response: '{"tool": "addSphere", "arguments": {"longitude": 13.4050, "latitude": 52.5200, "radius": 1000, "name": "Berlin Sphere", "color": "red"}}\n{"tool": "addSphere", "arguments": {"longitude": 12.4964, "latitude": 41.9028, "radius": 1000, "name": "Rome Sphere", "color": "green"}}',
    explanation: 'Multiple spheres at different locations',
  },
  {
    category: 'entity',
    tool: 'addSphere',
    userInput: 'Put a transparent green sphere at Chicago',
    response: '{"tool": "addSphere", "arguments": {"longitude": -87.6298, "latitude": 41.8781, "radius": 5000, "name": "Chicago Sphere", "color": "green"}}',
    explanation: 'Sphere with descriptive color',
  },
  {
    category: 'entity',
    tool: 'addSphere',
    userInput: 'Sphere at coordinates 45, 90',
    response: '{"tool": "addSphere", "arguments": {"longitude": 90, "latitude": 45, "radius": 1000, "name": "Sphere", "color": "red"}}',
    explanation: 'Sphere at explicit lat/lon',
  },
  {
    category: 'entity',
    tool: 'addSphere',
    userInput: 'Add a 3D orb to San Francisco',
    response: '{"tool": "addSphere", "arguments": {"longitude": -122.4194, "latitude": 37.7749, "radius": 2000, "name": "SF Orb", "color": "cyan"}}',
    explanation: 'Orb synonym for sphere',
  },
  {
    category: 'entity',
    tool: 'addSphere',
    userInput: 'Place a floating ball 5km high at Denver',
    response: '{"tool": "addSphere", "arguments": {"longitude": -104.9903, "latitude": 39.7392, "radius": 1000, "height": 5000, "name": "Denver Ball", "color": "purple"}}',
    explanation: 'Sphere with height offset',
  },

  // ============ SCENE SETTINGS EXAMPLES ============
  {
    category: 'scene',
    tool: 'setFog',
    userInput: 'Add light fog',
    response: '{"tool": "setFog", "arguments": {"enabled": true, "density": 0.0002}}',
    explanation: 'Light fog with low density',
  },
  {
    category: 'scene',
    tool: 'setFog',
    userInput: 'Turn off the fog',
    response: '{"tool": "setFog", "arguments": {"enabled": false}}',
    explanation: 'Disable fog',
  },
  {
    category: 'scene',
    tool: 'setShadows',
    userInput: 'Enable shadows with soft edges',
    response: '{"tool": "setShadows", "arguments": {"enabled": true, "softShadows": true}}',
    explanation: 'Soft shadow rendering',
  },
  {
    category: 'scene',
    tool: 'setShadows',
    userInput: 'Turn shadows off',
    response: '{"tool": "setShadows", "arguments": {"enabled": false}}',
    explanation: 'Disable shadows',
  },
  {
    category: 'scene',
    tool: 'setLighting',
    userInput: 'Turn on day/night cycle',
    response: '{"tool": "setLighting", "arguments": {"enableLighting": true}}',
    explanation: 'Enable sun-based lighting',
  },
  {
    category: 'scene',
    tool: 'setLighting',
    userInput: 'Disable globe lighting',
    response: '{"tool": "setLighting", "arguments": {"enableLighting": false}}',
    explanation: 'Turn off sun lighting',
  },
  {
    category: 'scene',
    tool: 'setAtmosphere',
    userInput: 'Enable atmosphere effect',
    response: '{"tool": "setAtmosphere", "arguments": {"show": true}}',
    explanation: 'Show sky atmosphere',
  },
  {
    category: 'scene',
    tool: 'setAtmosphere',
    userInput: 'Hide the atmosphere',
    response: '{"tool": "setAtmosphere", "arguments": {"show": false}}',
    explanation: 'Disable atmosphere',
  },
  {
    category: 'scene',
    tool: 'setAtmosphere',
    userInput: 'Make the sky more saturated',
    response: '{"tool": "setAtmosphere", "arguments": {"show": true, "saturationShift": 0.5}}',
    explanation: 'Increase atmosphere saturation',
  },
  {
    category: 'scene',
    tool: 'setGlobe',
    userInput: 'Show the globe',
    response: '{"tool": "setGlobe", "arguments": {"show": true}}',
    explanation: 'Make globe visible',
  },
  {
    category: 'scene',
    tool: 'setGlobe',
    userInput: 'Turn on ground atmosphere',
    response: '{"tool": "setGlobe", "arguments": {"showGroundAtmosphere": true}}',
    explanation: 'Enable ground-level atmosphere effect',
  },
  {
    category: 'scene',
    tool: 'setGlobe',
    userInput: 'Change ocean color to dark blue',
    response: '{"tool": "setGlobe", "arguments": {"baseColor": "darkblue"}}',
    explanation: 'Change globe base color',
  },

  // ============ DATA LOADING EXAMPLES ============
  {
    category: 'data',
    tool: 'loadGeoJSON',
    userInput: 'Import GeoJSON boundaries',
    response: '{"tool": "loadGeoJSON", "arguments": {"url": "https://example.com/boundaries.geojson", "name": "Boundaries"}}',
    explanation: 'Load GeoJSON data',
  },
  {
    category: 'data',
    tool: 'loadGeoJSON',
    userInput: 'Load the parks GeoJSON with green fill',
    response: '{"tool": "loadGeoJSON", "arguments": {"url": "https://example.com/parks.geojson", "name": "Parks", "fill": "green", "stroke": "darkgreen"}}',
    explanation: 'GeoJSON with styling',
  },
  {
    category: 'data',
    tool: 'loadKML',
    userInput: 'Import the flight path KML',
    response: '{"tool": "loadKML", "arguments": {"url": "https://example.com/flight.kml", "name": "Flight Path"}}',
    explanation: 'Load KML data',
  },
  {
    category: 'data',
    tool: 'loadKML',
    userInput: 'Load KMZ and clamp to terrain',
    response: '{"tool": "loadKML", "arguments": {"url": "https://example.com/data.kmz", "name": "KMZ Data", "clampToGround": true}}',
    explanation: 'KMZ with terrain clamping',
  },
  {
    category: 'data',
    tool: 'loadCZML',
    userInput: 'Load the satellite orbits CZML',
    response: '{"tool": "loadCZML", "arguments": {"url": "https://example.com/satellites.czml", "name": "Satellite Orbits"}}',
    explanation: 'Load CZML time-dynamic data',
  },
  {
    category: 'data',
    tool: 'loadCZML',
    userInput: 'Import CZML animation',
    response: '{"tool": "loadCZML", "arguments": {"url": "https://example.com/animation.czml", "name": "Animation"}}',
    explanation: 'Load animated CZML',
  },

  // ============ DISAMBIGUATION EXAMPLES ============
  {
    category: 'disambiguation',
    tool: 'addSphere',
    userInput: 'Add a 3D ball',
    response: '{"tool": "addSphere", "arguments": {"longitude": 0, "latitude": 0, "radius": 10000, "name": "Ball", "color": "red"}}',
    explanation: '3D ball is a sphere (use addSphere)',
  },
  {
    category: 'disambiguation',
    tool: 'addCircle',
    userInput: 'Draw a circle on the ground',
    response: '{"tool": "addCircle", "arguments": {"longitude": 0, "latitude": 0, "radius": 10000, "name": "Circle", "color": "yellow"}}',
    explanation: 'Flat circle on ground (use addCircle)',
  },
  {
    category: 'disambiguation',
    tool: 'addSphere',
    userInput: 'Create a spherical marker',
    response: '{"tool": "addSphere", "arguments": {"longitude": 0, "latitude": 0, "radius": 500, "name": "Marker", "color": "red"}}',
    explanation: 'Spherical marker is a sphere',
  },
  {
    category: 'disambiguation',
    tool: 'addCircle',
    userInput: 'Add a flat disk at London',
    response: '{"tool": "addCircle", "arguments": {"longitude": -0.1276, "latitude": 51.5074, "radius": 5000, "name": "Disk", "color": "blue"}}',
    explanation: 'Flat disk is a circle',
  },
  {
    category: 'disambiguation',
    tool: 'flyTo',
    userInput: 'Go to Tokyo',
    response: '{"tool": "flyTo", "arguments": {"longitude": 139.6917, "latitude": 35.6895, "height": 500000, "duration": 3}}',
    explanation: 'Go to location uses flyTo',
  },
  {
    category: 'disambiguation',
    tool: 'flyToEntity',
    userInput: 'Go to the red sphere',
    response: '{"tool": "flyToEntity", "arguments": {"entityId": "red sphere", "duration": 3}}',
    explanation: 'Go to existing entity uses flyToEntity',
  },
  {
    category: 'disambiguation',
    tool: 'flyTo',
    userInput: 'Navigate to Sydney',
    response: '{"tool": "flyTo", "arguments": {"longitude": 151.2093, "latitude": -33.8688, "height": 500000, "duration": 3}}',
    explanation: 'Navigate to place uses flyTo',
  },
  {
    category: 'disambiguation',
    tool: 'flyToEntity',
    userInput: 'Navigate to the marker called Tokyo',
    response: '{"tool": "flyToEntity", "arguments": {"entityId": "Tokyo", "duration": 3}}',
    explanation: 'Navigate to named entity uses flyToEntity',
  },
  {
    category: 'disambiguation',
    tool: 'addSphere',
    userInput: 'Make a round object at Paris',
    response: '{"tool": "addSphere", "arguments": {"longitude": 2.3522, "latitude": 48.8566, "radius": 1000, "name": "Round Object", "color": "red"}}',
    explanation: 'Round 3D object is a sphere',
  },
  {
    category: 'disambiguation',
    tool: 'addCircle',
    userInput: 'Draw a ring around the building',
    response: '{"tool": "addCircle", "arguments": {"longitude": 0, "latitude": 0, "radius": 100, "name": "Ring", "color": "white"}}',
    explanation: 'Ring/flat circular area uses addCircle',
  },
  {
    category: 'disambiguation',
    tool: 'addSensorConeAtLocation',
    userInput: 'Add a sensor fan at Paris',
    response: '{"tool": "addSensorConeAtLocation", "arguments": {"locationName": "Paris", "radius": 50000, "horizontalAngle": 45, "verticalAngle": 30, "color": "lime", "opacity": 0.5}}',
    explanation: 'Sensor fan is a sensor cone (partial ellipsoid)',
  },
  {
    category: 'disambiguation',
    tool: 'addSensorConeHere',
    userInput: 'Create a radar cone',
    response: '{"tool": "addSensorConeHere", "arguments": {"radius": 100000, "horizontalAngle": 45, "verticalAngle": 30, "color": "cyan", "opacity": 0.5}}',
    explanation: 'Radar cone without location uses addSensorConeHere (camera view center)',
  },
  {
    category: 'disambiguation',
    tool: 'addSensorConeHere',
    userInput: 'Show camera field of view',
    response: '{"tool": "addSensorConeHere", "arguments": {"radius": 1000, "horizontalAngle": 60, "verticalAngle": 40, "color": "yellow", "opacity": 0.3}}',
    explanation: 'Camera FOV without location uses addSensorConeHere (camera view center)',
  },
  {
    category: 'disambiguation',
    tool: 'addSensorConeHere',
    userInput: 'Add a detection zone',
    response: '{"tool": "addSensorConeHere", "arguments": {"radius": 50000, "horizontalAngle": 90, "verticalAngle": 45, "color": "cyan", "opacity": 0.4}}',
    explanation: 'Detection zone without location uses addSensorConeHere (camera view center)',
  },
] as const;

/**
 * Base system prompt with role definition and formatting rules
 */
export const SYSTEM_PROMPT_BASE = `You are a CesiumJS globe controller assistant. Your job is to help users interact with a 3D globe visualization by executing tool commands.

## CRITICAL: USE LOCATION-AWARE TOOLS

ALWAYS use location-aware tools when a place name is mentioned. NEVER guess or hallucinate coordinates.

PREFERRED TOOLS (use these when you have a place name):
- flyToLocation: Fly to a named place. Args: locationName, height, duration
- addSphereAtLocation: Add sphere at named place. Args: locationName, radius, color, name
- addBoxAtLocation: Add box at named place. Args: locationName, dimensionX, dimensionY, dimensionZ, color, name
- addPointAtLocation: Add marker at named place. Args: locationName, color, name
- addSensorConeAtLocation: Add sensor cone/fan/radar/camera FOV at named place. Args: locationName, radius, horizontalAngle (degrees), verticalAngle (degrees), heading, pitch, color, opacity, name
- resolveLocation: Get coordinates for a place name. Args: locationName

FALLBACK TOOLS (only use when user provides raw coordinates):
- flyTo, addSphere, addBox, addPoint, addSensorCone, etc.

"HERE" TOOLS (use when NO location is specified - places at camera view center):
- addSphereHere, addBoxHere, addPointHere, addLabelHere, addCylinderHere, addCircleHere, addSensorConeHere

## SENSOR TERMINOLOGY

"sensor fan", "radar cone", "camera FOV", "detection zone", "cone segment":
- With location name → addSensorConeAtLocation
- Without location → addSensorConeHere (places at camera view center)
- horizontalAngle: width in degrees (1-360)
- verticalAngle: height in degrees (1-180)
- heading: direction it points (0=North, 90=East)
- pitch: tilt angle (-90=down, 0=horizontal)
- opacity: transparency (0-1, default 0.5)

## YOUR RESPONSE FORMAT

When executing commands, respond with ONLY a JSON object. Do not include any other text, markdown, or explanation.

CORRECT format:
{"tool": "flyToLocation", "arguments": {"locationName": "Golden Gate Bridge", "height": 1000}}

INCORRECT formats (never do these):
- \`\`\`json {"tool": "flyTo", ...} \`\`\` (no markdown code blocks)
- "I'll fly you to New York: {"tool": ...}" (no text before/after)
- {"tool": "flyTo", "arguments": {"longitude": ...}} when user said a place NAME (use flyToLocation!)

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

## POPULATION QUERIES

Use showTopCitiesByPopulation when users want to VISUALIZE cities by population:
- "show me the biggest cities", "display most populous cities", "put circles on largest cities"
- Adds circles on the map sized proportionally to population

Examples:
User: "Show me the 100 most populous cities with circles" → {"tool": "showTopCitiesByPopulation", "arguments": {"count": 100}}
User: "Display the 50 largest cities" → {"tool": "showTopCitiesByPopulation", "arguments": {"count": 50, "color": "cyan"}}
User: "Put circles on top cities proportional to population" → {"tool": "showTopCitiesByPopulation", "arguments": {"count": 20}}

Use getTopCitiesByPopulation ONLY when users just want DATA (no visualization):
User: "What are the 10 biggest cities?" (just asking, not showing) → {"tool": "getTopCitiesByPopulation", "arguments": {"count": 10}}

## HANDLING SPECIAL CASES

1. NAMED LOCATIONS: ALWAYS use location-aware tools (flyToLocation, addBoxAtLocation, etc.)
   User: "fly to Paris" → {"tool": "flyToLocation", "arguments": {"locationName": "Paris"}}
   User: "add red sphere at CERN" → {"tool": "addSphereAtLocation", "arguments": {"locationName": "CERN", "radius": 1000, "color": "red"}}

2. SENSOR/RADAR/FOV REQUESTS: If location given, use addSensorConeAtLocation. If NO location given, use addSensorConeHere (places at camera view center).
   User: "add sensor fan 30 wide 50 tall at Paris" → {"tool": "addSensorConeAtLocation", "arguments": {"locationName": "Paris", "radius": 50000, "horizontalAngle": 30, "verticalAngle": 50, "color": "lime", "opacity": 0.5}}
   User: "add sensor fan 30 wide 50 tall" → {"tool": "addSensorConeHere", "arguments": {"radius": 50000, "horizontalAngle": 30, "verticalAngle": 50, "color": "lime", "opacity": 0.5}}
   User: "radar cone pointing east" → {"tool": "addSensorConeHere", "arguments": {"radius": 100000, "horizontalAngle": 45, "verticalAngle": 30, "heading": 90, "color": "cyan", "opacity": 0.5}}

3. USER PROVIDES COORDINATES: Only then use coordinate-based tools like flyTo, addBox.
   User: "fly to 40.7, -74.0" → {"tool": "flyTo", "arguments": {"longitude": -74.0, "latitude": 40.7}}

4. MULTIPLE OPERATIONS: Output multiple JSON objects on separate lines:
   {"tool": "flyToLocation", "arguments": {"locationName": "Paris"}}
   {"tool": "addPointAtLocation", "arguments": {"locationName": "Paris"}}
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
    buildTerminologyGuide(),
    buildToolsSection(tools),
    buildExamplesSection(),
    buildKnownLocationsSection(),
  ];

  return sections.join('\n\n');
}

/**
 * Compact system prompt for models with small context windows (< 8k tokens)
 * Includes all 85 tools grouped by category with clear descriptions
 */
const COMPACT_SYSTEM_PROMPT = `You are a CesiumJS globe controller. Output ONLY one CSV line: tool,param1,param2,...
Omit trailing empty optional params. No quotes needed.

RULE: Named place → location tools. Coordinates → coordinate tools.

=== LOCATION TOOLS (named places - USE FIRST!) ===
flyToLocation: location,height,duration
addPointAtLocation: location,color
addSphereAtLocation: location,radius,color,height
addBoxAtLocation: location,dimX,dimY,dimZ,color,heading
  heading: 0=N,90=E,180=S,270=W. dimY=along heading (length), dimX=perpendicular (width)
addLabelAtLocation: location,text
addSensorConeAtLocation: location,radius,hAngle,vAngle,heading,pitch,color,opacity
resolveLocation: location

=== COORDINATE CAMERA ===
flyTo: lon,lat,height,duration
lookAt: lon,lat,range
zoom: amount (positive=in, negative=out)
setView: lon,lat,height
getCamera

=== COORDINATE 3D SHAPES ===
addSphere: lon,lat,radius,color,height
addBox: lon,lat,dimX,dimY,dimZ,color
addCylinder: lon,lat,length,topRadius,bottomRadius,color
addSensorCone: lon,lat,radius,hAngle,vAngle,heading,pitch,color,opacity

=== 2D ENTITIES ===
addPoint: lon,lat,name,color
addLabel: lon,lat,text,color
addCircle: lon,lat,radius,color
addPolyline: positions[],name,color,width
addPolygon: positions[],name,color

=== HERE (at camera center) ===
addPointHere: color
addSphereHere: radius,color
addBoxHere: dimX,dimY,dimZ,color
addLabelHere: text
addCircleHere: radius,color
addSensorConeHere: radius,hAngle,vAngle,heading,color,opacity

=== ROUTING & ANIMATION ===
walkTo: startLocation,endLocation,duration
driveTo: startLocation,endLocation,duration
flyPathTo: startLocation,endLocation,altitude,duration
getRoute: startLocation,endLocation,mode (walking|cycling|driving)
getIsochrone: location,minutes,mode (walking|cycling|driving)

=== POI ===
searchPOI: category,location,radius
findAndShow: category,location,radius,markerColor

=== ENTITY MANAGEMENT ===
removeEntity: id
clearAll
showEntity: id
hideEntity: id
selectEntity: id
listEntities
getEntityInfo: id
flyToEntity: id,duration
rotateEntity: id,heading
resizeEntity: id,scale
setEntityStyle: id,color,opacity
moveEntity: id,lon,lat

=== SCENE ===
setSceneMode: mode (2D|3D|COLUMBUS_VIEW)
setFog: enabled,density
setShadows: enabled,softShadows
setLighting: enableLighting
setAtmosphere: show,hueShift,brightnessShift
setGlobe: show,showGroundAtmosphere,baseColor
enableDepthTest: enabled
setSkybox: show
enableFXAA: enabled
setBloom: enabled,brightness
setTerrainProvider: provider,url
enableDepthTestAgainstTerrain: enabled
setGlobeTranslucency: enabled,alpha

=== DATA ===
loadGeoJSON: url,name,stroke,fill
loadKML: url,name,clampToGround
loadCZML: url,name
loadGPX: url,name,clampToGround
addWMS: url,layers,name
generateCZML: entities[],documentName
showTopCitiesByPopulation: count,color,shape

=== TIME ===
setTime: iso8601
playAnimation
pauseAnimation
setAnimationSpeed: multiplier

=== IMAGERY ===
setImagery: provider
addImagery: provider,url,layer
removeImagery: index
setImageryAlpha: index,alpha
setImageryBrightness: index,brightness,saturation
splitImagery: enabled,position

=== 3D TILES ===
load3DTiles: id,url,assetId
style3DTiles: id,color
remove3DTiles: id
highlight3DTile: id,color
clip3DTiles: id,enabled,distance

=== TERRAIN ===
setTerrain: provider
setTerrainExaggeration: factor
sampleTerrainHeight: lon,lat
clipTerrain: enabled,height
enableTerrainLighting: enabled

=== MATERIALS ===
setImageMaterial: entityId,imageUrl,repeatX,repeatY
setGridMaterial: entityId,color,lineCountX,lineCountY
setStripeMaterial: entityId,evenColor,oddColor,orientation,repeat
setCheckerboardMaterial: entityId,evenColor,oddColor,repeatX,repeatY

=== PICKING ===
getScreenPosition: lon,lat
getCartographic: x,y
pickEntity: x,y

=== EFFECTS ===
addParticleSystem: id,lon,lat,particleType (fire|smoke|explosion)
addWeatherEffect: effectType (rain|snow|fog),intensity
addVolumetricCloud: id,lon,lat,height,scale
addLensFlare: enabled,intensity
removeParticleSystem: id
removeWeatherEffect: effectType

=== MEASUREMENT ===
measureDistance: startLon,startLat,endLon,endLat

DISTINCTIONS:
- sphere/ball → addSphere (3D), circle → addCircle (2D flat)
- sensor/radar/FOV at place → addSensorConeAtLocation
- sensor/radar/FOV no place → addSensorConeHere
- "fly to Paris" → flyToLocation (camera nav)
- "fly to the marker" → flyToEntity (go to entity)
- "walk A to B" → walkTo, "drive A to B" → driveTo, "fly plane A to B" → flyPathTo
- "find nearby X" → findAndShow
- marker/point/pin → addPoint

EXAMPLES:
"fly to Paris" → flyToLocation,Paris,50000
"fly to 2.35,48.86" → flyTo,2.35,48.86,500000
"sphere at Tokyo" → addSphereAtLocation,Tokyo,1000,red
"sphere at -74,40.7" → addSphere,-74.006,40.7128,1000,red
"ball over London" → addSphereAtLocation,London,5000,red
"50km red sphere NYC" → addSphereAtLocation,New York City,50000,red
"sphere 10km above DC" → addSphereAtLocation,Washington,5000,red,10000
"box at Golden Gate" → addBoxAtLocation,Golden Gate Bridge,30,2700,227,red,28
"marker at NYC" → addPointAtLocation,New York City,blue
"circle around Paris" → addCircle,2.3522,48.8566,10000,yellow
"sensor 30deg at Paris" → addSensorConeAtLocation,Paris,50000,30,50,,,lime,0.5
"radar cone east" → addSensorConeHere,100000,45,30,90,cyan,0.4
"sensor fan here" → addSensorConeHere,50000,30,50,,lime,0.5
"walk Colosseum to Vatican" → walkTo,Colosseum,Vatican,30
"drive Times Sq to Central Park" → driveTo,Times Square,Central Park,20
"flight Paris to London" → flyPathTo,Paris,London,10000,60
"find restaurants near NYC" → findAndShow,restaurant,New York City,1000
"zoom in" → zoom,2
"zoom out" → zoom,-2
"clear all" → clearAll
"add point here" → addPointHere,red
"label here" → addLabelHere,Waypoint
"set time" → setTime,2024-06-15T12:00:00Z
"top 10 cities" → showTopCitiesByPopulation,10,blue,circle
"3D mode" → setSceneMode,3D
"enable fog" → setFog,true
"shadows on" → setShadows,true
"fly to marker" → flyToEntity,marker-1,3
"remove sphere" → removeEntity,sphere-1
"make it red" → setEntityStyle,sphere-1,red
"set view Tokyo" → setView,139.6917,35.6895,500000

HEIGHT: City=500000 Landmark=50000 Building=1000 Street=500
COLORS: red green blue yellow orange purple pink cyan white black gray lime`;

/**
 * Build a compact system prompt for small context window models
 * Uses a minimal prompt that fits within ~2000 tokens
 *
 * @param _tools - Array of tool definitions (not used, compact prompt has built-in tools)
 * @returns Compact system prompt string
 */
export function buildCompactSystemPrompt(_tools: ToolDefinition[]): string {
  return COMPACT_SYSTEM_PROMPT;
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
