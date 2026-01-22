/**
 * Training Data Generator
 * Generates comprehensive training examples for fine-tuning the Cesium SLM
 * Target: 10,000+ varied examples covering all MCP tools
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ============================================================================
// Location Database
// ============================================================================

interface Location {
  name: string;
  aliases: string[];
  longitude: number;
  latitude: number;
  height?: number;
  type: 'city' | 'landmark' | 'natural' | 'country' | 'region';
}

const LOCATIONS: Location[] = [
  // Major World Cities
  { name: 'New York', aliases: ['NYC', 'New York City', 'Manhattan', 'the Big Apple'], longitude: -74.006, latitude: 40.7128, type: 'city' },
  { name: 'London', aliases: ['London UK', 'London England'], longitude: -0.1276, latitude: 51.5074, type: 'city' },
  { name: 'Paris', aliases: ['Paris France'], longitude: 2.3522, latitude: 48.8566, type: 'city' },
  { name: 'Tokyo', aliases: ['Tokyo Japan'], longitude: 139.6917, latitude: 35.6895, type: 'city' },
  { name: 'Sydney', aliases: ['Sydney Australia'], longitude: 151.2093, latitude: -33.8688, type: 'city' },
  { name: 'Los Angeles', aliases: ['LA', 'L.A.'], longitude: -118.2437, latitude: 34.0522, type: 'city' },
  { name: 'San Francisco', aliases: ['SF', 'San Fran', 'Frisco'], longitude: -122.4194, latitude: 37.7749, type: 'city' },
  { name: 'Chicago', aliases: ['Chi-Town', 'the Windy City'], longitude: -87.6298, latitude: 41.8781, type: 'city' },
  { name: 'Moscow', aliases: ['Moscow Russia'], longitude: 37.6173, latitude: 55.7558, type: 'city' },
  { name: 'Beijing', aliases: ['Beijing China', 'Peking'], longitude: 116.4074, latitude: 39.9042, type: 'city' },
  { name: 'Dubai', aliases: ['Dubai UAE'], longitude: 55.2708, latitude: 25.2048, type: 'city' },
  { name: 'Singapore', aliases: ['Singapore City'], longitude: 103.8198, latitude: 1.3521, type: 'city' },
  { name: 'Hong Kong', aliases: ['HK'], longitude: 114.1694, latitude: 22.3193, type: 'city' },
  { name: 'Shanghai', aliases: ['Shanghai China'], longitude: 121.4737, latitude: 31.2304, type: 'city' },
  { name: 'Mumbai', aliases: ['Bombay', 'Mumbai India'], longitude: 72.8777, latitude: 19.0760, type: 'city' },
  { name: 'Delhi', aliases: ['New Delhi', 'Delhi India'], longitude: 77.1025, latitude: 28.7041, type: 'city' },
  { name: 'Cairo', aliases: ['Cairo Egypt'], longitude: 31.2357, latitude: 30.0444, type: 'city' },
  { name: 'Istanbul', aliases: ['Constantinople', 'Istanbul Turkey'], longitude: 28.9784, latitude: 41.0082, type: 'city' },
  { name: 'Rome', aliases: ['Rome Italy', 'Roma'], longitude: 12.4964, latitude: 41.9028, type: 'city' },
  { name: 'Berlin', aliases: ['Berlin Germany'], longitude: 13.4050, latitude: 52.5200, type: 'city' },
  { name: 'Madrid', aliases: ['Madrid Spain'], longitude: -3.7038, latitude: 40.4168, type: 'city' },
  { name: 'Barcelona', aliases: ['Barcelona Spain'], longitude: 2.1734, latitude: 41.3851, type: 'city' },
  { name: 'Amsterdam', aliases: ['Amsterdam Netherlands'], longitude: 4.9041, latitude: 52.3676, type: 'city' },
  { name: 'Vienna', aliases: ['Vienna Austria', 'Wien'], longitude: 16.3738, latitude: 48.2082, type: 'city' },
  { name: 'Prague', aliases: ['Prague Czech Republic', 'Praha'], longitude: 14.4378, latitude: 50.0755, type: 'city' },
  { name: 'Stockholm', aliases: ['Stockholm Sweden'], longitude: 18.0686, latitude: 59.3293, type: 'city' },
  { name: 'Copenhagen', aliases: ['Copenhagen Denmark'], longitude: 12.5683, latitude: 55.6761, type: 'city' },
  { name: 'Athens', aliases: ['Athens Greece'], longitude: 23.7275, latitude: 37.9838, type: 'city' },
  { name: 'Lisbon', aliases: ['Lisbon Portugal', 'Lisboa'], longitude: -9.1393, latitude: 38.7223, type: 'city' },
  { name: 'Dublin', aliases: ['Dublin Ireland'], longitude: -6.2603, latitude: 53.3498, type: 'city' },
  { name: 'Toronto', aliases: ['Toronto Canada'], longitude: -79.3832, latitude: 43.6532, type: 'city' },
  { name: 'Vancouver', aliases: ['Vancouver Canada'], longitude: -123.1207, latitude: 49.2827, type: 'city' },
  { name: 'Mexico City', aliases: ['CDMX', 'Ciudad de Mexico'], longitude: -99.1332, latitude: 19.4326, type: 'city' },
  { name: 'Sao Paulo', aliases: ['Sao Paulo Brazil'], longitude: -46.6333, latitude: -23.5505, type: 'city' },
  { name: 'Rio de Janeiro', aliases: ['Rio', 'Rio Brazil'], longitude: -43.1729, latitude: -22.9068, type: 'city' },
  { name: 'Buenos Aires', aliases: ['Buenos Aires Argentina'], longitude: -58.3816, latitude: -34.6037, type: 'city' },
  { name: 'Cape Town', aliases: ['Cape Town South Africa'], longitude: 18.4241, latitude: -33.9249, type: 'city' },
  { name: 'Seoul', aliases: ['Seoul South Korea'], longitude: 126.9780, latitude: 37.5665, type: 'city' },
  { name: 'Bangkok', aliases: ['Bangkok Thailand'], longitude: 100.5018, latitude: 13.7563, type: 'city' },
  { name: 'Jakarta', aliases: ['Jakarta Indonesia'], longitude: 106.8456, latitude: -6.2088, type: 'city' },
  { name: 'Kuala Lumpur', aliases: ['KL', 'Kuala Lumpur Malaysia'], longitude: 101.6869, latitude: 3.1390, type: 'city' },
  { name: 'Manila', aliases: ['Manila Philippines'], longitude: 120.9842, latitude: 14.5995, type: 'city' },
  { name: 'Melbourne', aliases: ['Melbourne Australia'], longitude: 144.9631, latitude: -37.8136, type: 'city' },
  { name: 'Auckland', aliases: ['Auckland New Zealand'], longitude: 174.7633, latitude: -36.8485, type: 'city' },
  { name: 'Wellington', aliases: ['Wellington New Zealand'], longitude: 174.7762, latitude: -41.2866, type: 'city' },
  { name: 'Helsinki', aliases: ['Helsinki Finland'], longitude: 24.9384, latitude: 60.1699, type: 'city' },
  { name: 'Oslo', aliases: ['Oslo Norway'], longitude: 10.7522, latitude: 59.9139, type: 'city' },
  { name: 'Warsaw', aliases: ['Warsaw Poland', 'Warszawa'], longitude: 21.0122, latitude: 52.2297, type: 'city' },
  { name: 'Budapest', aliases: ['Budapest Hungary'], longitude: 19.0402, latitude: 47.4979, type: 'city' },
  { name: 'Brussels', aliases: ['Brussels Belgium'], longitude: 4.3517, latitude: 50.8503, type: 'city' },

  // Famous Landmarks
  { name: 'Eiffel Tower', aliases: ['the Eiffel Tower', 'Tour Eiffel'], longitude: 2.2945, latitude: 48.8584, height: 50000, type: 'landmark' },
  { name: 'Statue of Liberty', aliases: ['the Statue of Liberty', 'Lady Liberty'], longitude: -74.0445, latitude: 40.6892, height: 30000, type: 'landmark' },
  { name: 'Big Ben', aliases: ['Elizabeth Tower', 'the Big Ben'], longitude: -0.1246, latitude: 51.5007, height: 30000, type: 'landmark' },
  { name: 'Colosseum', aliases: ['the Colosseum', 'Roman Colosseum'], longitude: 12.4924, latitude: 41.8902, height: 30000, type: 'landmark' },
  { name: 'Taj Mahal', aliases: ['the Taj Mahal'], longitude: 78.0421, latitude: 27.1751, height: 30000, type: 'landmark' },
  { name: 'Great Wall of China', aliases: ['the Great Wall', 'Great Wall'], longitude: 116.5704, latitude: 40.4319, height: 50000, type: 'landmark' },
  { name: 'Pyramids of Giza', aliases: ['the Pyramids', 'Giza Pyramids', 'Great Pyramid'], longitude: 31.1342, latitude: 29.9792, height: 50000, type: 'landmark' },
  { name: 'Machu Picchu', aliases: ['Machu Pichu'], longitude: -72.5450, latitude: -13.1631, height: 30000, type: 'landmark' },
  { name: 'Christ the Redeemer', aliases: ['Cristo Redentor'], longitude: -43.2105, latitude: -22.9519, height: 30000, type: 'landmark' },
  { name: 'Sydney Opera House', aliases: ['the Opera House'], longitude: 151.2153, latitude: -33.8568, height: 30000, type: 'landmark' },
  { name: 'Burj Khalifa', aliases: ['Burj Dubai'], longitude: 55.2744, latitude: 25.1972, height: 50000, type: 'landmark' },
  { name: 'Golden Gate Bridge', aliases: ['the Golden Gate', 'GG Bridge'], longitude: -122.4783, latitude: 37.8199, height: 30000, type: 'landmark' },
  { name: 'Empire State Building', aliases: ['ESB'], longitude: -73.9857, latitude: 40.7484, height: 30000, type: 'landmark' },
  { name: 'Tower of Pisa', aliases: ['Leaning Tower', 'Pisa Tower'], longitude: 10.3963, latitude: 43.7230, height: 20000, type: 'landmark' },
  { name: 'Stonehenge', aliases: ['the Stonehenge'], longitude: -1.8262, latitude: 51.1789, height: 30000, type: 'landmark' },
  { name: 'Petra', aliases: ['Petra Jordan', 'the Treasury'], longitude: 35.4444, latitude: 30.3285, height: 30000, type: 'landmark' },
  { name: 'Angkor Wat', aliases: ['Angkor', 'Angkor Temple'], longitude: 103.8670, latitude: 13.4125, height: 30000, type: 'landmark' },
  { name: 'Acropolis', aliases: ['the Acropolis', 'Parthenon'], longitude: 23.7257, latitude: 37.9715, height: 20000, type: 'landmark' },
  { name: 'Brandenburg Gate', aliases: ['Brandenburger Tor'], longitude: 13.3777, latitude: 52.5163, height: 20000, type: 'landmark' },
  { name: 'Notre Dame', aliases: ['Notre Dame Cathedral', 'Notre-Dame'], longitude: 2.3499, latitude: 48.8530, height: 20000, type: 'landmark' },

  // Natural Wonders
  { name: 'Grand Canyon', aliases: ['the Grand Canyon'], longitude: -112.1401, latitude: 36.0544, height: 100000, type: 'natural' },
  { name: 'Mount Everest', aliases: ['Everest', 'Mt. Everest', 'Mt Everest'], longitude: 86.9250, latitude: 27.9881, height: 100000, type: 'natural' },
  { name: 'Niagara Falls', aliases: ['the Niagara Falls', 'Niagara'], longitude: -79.0377, latitude: 43.0962, height: 30000, type: 'natural' },
  { name: 'Mount Fuji', aliases: ['Fuji', 'Mt. Fuji', 'Fujiyama'], longitude: 138.7274, latitude: 35.3606, height: 100000, type: 'natural' },
  { name: 'Victoria Falls', aliases: ['the Victoria Falls'], longitude: 25.8572, latitude: -17.9243, height: 50000, type: 'natural' },
  { name: 'Great Barrier Reef', aliases: ['the Great Barrier Reef', 'Barrier Reef'], longitude: 145.7731, latitude: -16.2864, height: 100000, type: 'natural' },
  { name: 'Amazon Rainforest', aliases: ['the Amazon', 'Amazon Basin'], longitude: -60.0217, latitude: -3.4653, height: 500000, type: 'natural' },
  { name: 'Yellowstone', aliases: ['Yellowstone National Park', 'Yellowstone Park'], longitude: -110.5885, latitude: 44.4280, height: 200000, type: 'natural' },
  { name: 'Yosemite', aliases: ['Yosemite National Park', 'Yosemite Valley'], longitude: -119.5383, latitude: 37.8651, height: 100000, type: 'natural' },
  { name: 'Sahara Desert', aliases: ['the Sahara', 'Sahara'], longitude: 9.3174, latitude: 23.4162, height: 1000000, type: 'natural' },
  { name: 'Antarctica', aliases: ['the Antarctic', 'South Pole region'], longitude: 0, latitude: -82.8628, height: 5000000, type: 'natural' },
  { name: 'Arctic', aliases: ['the Arctic', 'North Pole region'], longitude: 0, latitude: 90, height: 5000000, type: 'natural' },
  { name: 'Mount Kilimanjaro', aliases: ['Kilimanjaro', 'Mt Kilimanjaro'], longitude: 37.3556, latitude: -3.0674, height: 100000, type: 'natural' },
  { name: 'Dead Sea', aliases: ['the Dead Sea'], longitude: 35.4732, latitude: 31.5111, height: 50000, type: 'natural' },
  { name: 'Matterhorn', aliases: ['the Matterhorn', 'Monte Cervino'], longitude: 7.6585, latitude: 45.9763, height: 50000, type: 'natural' },
];

// ============================================================================
// Command Templates
// ============================================================================

const FLY_TO_TEMPLATES = [
  'Show me {location}',
  'Fly to {location}',
  'Go to {location}',
  'Navigate to {location}',
  'Take me to {location}',
  'Zoom to {location}',
  'Move to {location}',
  "Let's go to {location}",
  'Can you show me {location}?',
  'I want to see {location}',
  'Fly the camera to {location}',
  'Center on {location}',
  'Focus on {location}',
  'Pan to {location}',
  'Jump to {location}',
  'Teleport to {location}',
  'View {location}',
  "What does {location} look like?",
  'Display {location}',
  'Bring up {location}',
];

const ADD_POINT_TEMPLATES = [
  'Add a {color} marker at {location}',
  'Put a {color} point at {location}',
  'Mark {location} with a {color} marker',
  'Place a {color} pin at {location}',
  'Add a marker at {location}',
  'Put a point on {location}',
  'Mark {location}',
  'Add a {color} dot at {location}',
  'Drop a {color} marker on {location}',
  'Place a marker at {location} in {color}',
  'Create a {color} point at {location}',
  'Show a {color} marker at {location}',
];

const ADD_LABEL_TEMPLATES = [
  'Add a label {text} at {location}',
  'Put text {text} at {location}',
  'Label {location} with {text}',
  'Add text {text} to {location}',
  'Write {text} at {location}',
  'Display {text} at {location}',
  'Show text {text} near {location}',
  'Create a label saying {text} at {location}',
];

const ADD_POLYLINE_TEMPLATES = [
  'Draw a line from {loc1} to {loc2}',
  'Connect {loc1} to {loc2}',
  'Draw a {color} line from {loc1} to {loc2}',
  'Create a path from {loc1} to {loc2}',
  'Add a line connecting {loc1} and {loc2}',
  'Draw a route from {loc1} to {loc2}',
  'Show the connection between {loc1} and {loc2}',
  'Trace a line from {loc1} to {loc2}',
];

const ADD_POLYGON_TEMPLATES = [
  'Draw a triangle connecting {loc1}, {loc2}, and {loc3}',
  'Create a polygon around {loc1}',
  'Add a {color} polygon at {location}',
  'Draw a shape connecting {loc1}, {loc2}, and {loc3}',
  'Create a filled area from {loc1} to {loc2} to {loc3}',
];

const ADD_CIRCLE_TEMPLATES = [
  'Draw a circle around {location} with {radius}km radius',
  'Create a {radius}km circle at {location}',
  'Add a {color} circle around {location}',
  'Draw a {radius} kilometer radius circle at {location}',
  'Create a circular area of {radius}km around {location}',
  'Add a {radius}km radius circle centered on {location}',
];

const ZOOM_IN_TEMPLATES = [
  'Zoom in',
  'Get closer',
  'Zoom in more',
  'Move closer',
  'Zoom in a bit',
  'Get a closer look',
  'Magnify',
  'Zoom in slightly',
  'Increase zoom',
  'Closer please',
];

const ZOOM_OUT_TEMPLATES = [
  'Zoom out',
  'Move back',
  'Zoom out more',
  'Pull back',
  'Zoom out a bit',
  'Get a wider view',
  'Zoom out slightly',
  'Decrease zoom',
  'Further away',
  'Show more area',
];

const SCENE_MODE_TEMPLATES = {
  '2D': [
    'Switch to 2D mode',
    'Show the flat map',
    'Use 2D view',
    'Change to 2D',
    'Go to 2D mode',
    'Show me the flat view',
    'Display as a flat map',
    'Switch to map view',
  ],
  '3D': [
    'Switch to 3D mode',
    'Show the globe',
    'Use 3D view',
    'Change to 3D',
    'Go to 3D mode',
    'Show the 3D globe',
    'Display as a globe',
    'Switch to globe view',
  ],
  'COLUMBUS_VIEW': [
    'Switch to Columbus view',
    'Use 2.5D view',
    'Show Columbus projection',
    'Change to Columbus view',
    'Go to Columbus mode',
    'Use the flat globe view',
  ],
};

const TIME_TEMPLATES = {
  play: [
    'Play the animation',
    'Start the animation',
    'Play',
    'Start time',
    'Animate',
    'Begin animation',
    'Start the simulation',
    'Play the timeline',
    'Unpause',
    'Resume animation',
  ],
  pause: [
    'Pause the animation',
    'Stop the animation',
    'Pause',
    'Stop time',
    'Freeze',
    'Pause the simulation',
    'Stop the timeline',
    'Hold animation',
    'Pause here',
  ],
};

const COLORS = ['red', 'blue', 'green', 'yellow', 'orange', 'purple', 'pink', 'cyan', 'white', 'black', 'gray'];

const RADII = [10, 25, 50, 100, 200, 500, 1000];

const LABEL_TEXTS = [
  'Hello',
  'Here',
  'Important',
  'Note',
  'Visit',
  'Start',
  'End',
  'Destination',
  'Home',
  'Work',
  'Point of Interest',
  'Landmark',
  'Check this out',
  'Meeting point',
];

// ============================================================================
// Data Generation Functions
// ============================================================================

function randomChoice<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]!;
}

function shuffle<T>(arr: T[]): T[] {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j]!, result[i]!];
  }
  return result;
}

function generateFlyToExample(): { instruction: string; output: string } {
  const location = randomChoice(LOCATIONS);
  const template = randomChoice(FLY_TO_TEMPLATES);
  const nameOrAlias = Math.random() > 0.3 ? location.name : randomChoice([location.name, ...location.aliases]);

  const instruction = template.replace('{location}', nameOrAlias);
  const output = JSON.stringify({
    tool: 'flyTo',
    arguments: {
      longitude: location.longitude,
      latitude: location.latitude,
      height: location.height || 500000,
    },
  });

  return { instruction, output };
}

function generateAddPointExample(): { instruction: string; output: string } {
  const location = randomChoice(LOCATIONS);
  const color = randomChoice(COLORS);
  const template = randomChoice(ADD_POINT_TEMPLATES);
  const nameOrAlias = Math.random() > 0.3 ? location.name : randomChoice([location.name, ...location.aliases]);

  const instruction = template
    .replace('{location}', nameOrAlias)
    .replace('{color}', color);

  const output = JSON.stringify({
    tool: 'addPoint',
    arguments: {
      longitude: location.longitude,
      latitude: location.latitude,
      name: location.name,
      color,
    },
  });

  return { instruction, output };
}

function generateAddLabelExample(): { instruction: string; output: string } {
  const location = randomChoice(LOCATIONS);
  const text = randomChoice(LABEL_TEXTS);
  const template = randomChoice(ADD_LABEL_TEMPLATES);
  const nameOrAlias = Math.random() > 0.3 ? location.name : randomChoice([location.name, ...location.aliases]);

  const instruction = template
    .replace('{location}', nameOrAlias)
    .replace('{text}', text);

  const output = JSON.stringify({
    tool: 'addLabel',
    arguments: {
      longitude: location.longitude,
      latitude: location.latitude,
      text,
      color: 'white',
    },
  });

  return { instruction, output };
}

function generateAddPolylineExample(): { instruction: string; output: string } {
  const locations = shuffle(LOCATIONS).slice(0, 2);
  const loc1 = locations[0]!;
  const loc2 = locations[1]!;
  const color = randomChoice(COLORS);
  const template = randomChoice(ADD_POLYLINE_TEMPLATES);

  const instruction = template
    .replace('{loc1}', loc1.name)
    .replace('{loc2}', loc2.name)
    .replace('{color}', color);

  const output = JSON.stringify({
    tool: 'addPolyline',
    arguments: {
      positions: [
        { longitude: loc1.longitude, latitude: loc1.latitude },
        { longitude: loc2.longitude, latitude: loc2.latitude },
      ],
      name: `${loc1.name} to ${loc2.name}`,
      color,
    },
  });

  return { instruction, output };
}

function generateAddPolygonExample(): { instruction: string; output: string } {
  const locations = shuffle(LOCATIONS.filter(l => l.type === 'city')).slice(0, 3);
  const loc1 = locations[0]!;
  const loc2 = locations[1]!;
  const loc3 = locations[2]!;
  const color = randomChoice(COLORS);
  const template = randomChoice(ADD_POLYGON_TEMPLATES);

  const instruction = template
    .replace('{loc1}', loc1.name)
    .replace('{loc2}', loc2.name)
    .replace('{loc3}', loc3.name)
    .replace('{location}', loc1.name)
    .replace('{color}', color);

  const output = JSON.stringify({
    tool: 'addPolygon',
    arguments: {
      positions: [
        { longitude: loc1.longitude, latitude: loc1.latitude },
        { longitude: loc2.longitude, latitude: loc2.latitude },
        { longitude: loc3.longitude, latitude: loc3.latitude },
      ],
      name: `${loc1.name} Triangle`,
      color,
    },
  });

  return { instruction, output };
}

function generateAddCircleExample(): { instruction: string; output: string } {
  const location = randomChoice(LOCATIONS);
  const radius = randomChoice(RADII);
  const color = randomChoice(COLORS);
  const template = randomChoice(ADD_CIRCLE_TEMPLATES);
  const nameOrAlias = Math.random() > 0.3 ? location.name : randomChoice([location.name, ...location.aliases]);

  const instruction = template
    .replace('{location}', nameOrAlias)
    .replace('{radius}', radius.toString())
    .replace('{color}', color);

  const output = JSON.stringify({
    tool: 'addCircle',
    arguments: {
      longitude: location.longitude,
      latitude: location.latitude,
      radius: radius * 1000, // Convert km to meters
      name: `${location.name} Area`,
      color,
    },
  });

  return { instruction, output };
}

function generateZoomExample(): { instruction: string; output: string } {
  const zoomIn = Math.random() > 0.5;
  const templates = zoomIn ? ZOOM_IN_TEMPLATES : ZOOM_OUT_TEMPLATES;
  const instruction = randomChoice(templates);

  const amounts = [100000, 200000, 500000, 1000000, 2000000];
  const amount = randomChoice(amounts) * (zoomIn ? 1 : -1);

  const output = JSON.stringify({
    tool: 'zoom',
    arguments: { amount },
  });

  return { instruction, output };
}

function generateSceneModeExample(): { instruction: string; output: string } {
  const mode = randomChoice(['2D', '3D', 'COLUMBUS_VIEW'] as const);
  const templates = SCENE_MODE_TEMPLATES[mode];
  const instruction = randomChoice(templates);

  const output = JSON.stringify({
    tool: 'setSceneMode',
    arguments: { mode },
  });

  return { instruction, output };
}

function generateTimeExample(): { instruction: string; output: string } {
  const action = Math.random() > 0.5 ? 'play' : 'pause';
  const templates = TIME_TEMPLATES[action];
  const instruction = randomChoice(templates);

  const output = JSON.stringify({
    tool: action === 'play' ? 'playAnimation' : 'pauseAnimation',
    arguments: {},
  });

  return { instruction, output };
}

function generateCoordinateExample(): { instruction: string; output: string } {
  // Generate random coordinate examples
  const lat = Math.round((Math.random() * 180 - 90) * 1000) / 1000;
  const lon = Math.round((Math.random() * 360 - 180) * 1000) / 1000;

  const templates = [
    `Go to coordinates ${lat}, ${lon}`,
    `Fly to ${lat}, ${lon}`,
    `Navigate to latitude ${lat}, longitude ${lon}`,
    `Show me location ${lat}N, ${lon}E`,
    `Take me to ${lat}, ${lon}`,
  ];

  const instruction = randomChoice(templates);
  const output = JSON.stringify({
    tool: 'flyTo',
    arguments: {
      longitude: lon,
      latitude: lat,
      height: 500000,
    },
  });

  return { instruction, output };
}

// ============================================================================
// Main Generator
// ============================================================================

function generateTrainingData(count: number): Array<{ instruction: string; output: string }> {
  const examples: Array<{ instruction: string; output: string }> = [];
  const generators = [
    { fn: generateFlyToExample, weight: 25 },
    { fn: generateAddPointExample, weight: 20 },
    { fn: generateAddLabelExample, weight: 10 },
    { fn: generateAddPolylineExample, weight: 10 },
    { fn: generateAddPolygonExample, weight: 5 },
    { fn: generateAddCircleExample, weight: 10 },
    { fn: generateZoomExample, weight: 8 },
    { fn: generateSceneModeExample, weight: 5 },
    { fn: generateTimeExample, weight: 5 },
    { fn: generateCoordinateExample, weight: 2 },
  ];

  const totalWeight = generators.reduce((sum, g) => sum + g.weight, 0);

  for (let i = 0; i < count; i++) {
    let r = Math.random() * totalWeight;
    for (const gen of generators) {
      r -= gen.weight;
      if (r <= 0) {
        examples.push(gen.fn());
        break;
      }
    }
  }

  return examples;
}

// ============================================================================
// Output
// ============================================================================

function main() {
  const targetCount = 10000;
  console.log(`Generating ${targetCount} training examples...`);

  const examples = generateTrainingData(targetCount);

  // Deduplicate
  const seen = new Set<string>();
  const unique = examples.filter(ex => {
    const key = ex.instruction.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  console.log(`Generated ${unique.length} unique examples`);

  // Write to file
  const outputPath = path.join(__dirname, 'generated-training-data.jsonl');
  const content = unique.map(ex => JSON.stringify(ex)).join('\n');
  fs.writeFileSync(outputPath, content);

  console.log(`Wrote training data to ${outputPath}`);

  // Statistics
  const toolCounts: Record<string, number> = {};
  for (const ex of unique) {
    try {
      const output = JSON.parse(ex.output);
      toolCounts[output.tool] = (toolCounts[output.tool] || 0) + 1;
    } catch {}
  }

  console.log('\nTool distribution:');
  for (const [tool, count] of Object.entries(toolCounts).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${tool}: ${count} (${((count / unique.length) * 100).toFixed(1)}%)`);
  }
}

main();
