/**
 * Training Data Generator v2.0
 * Generates comprehensive training examples for fine-tuning the Cesium SLM
 * Target: 150,000+ varied examples covering ALL 80+ MCP tools
 *
 * FEATURES:
 * - Complete coverage of all CesiumJS MCP tools
 * - Balanced distribution across tools
 * - Compound sentences (multiple commands in one request)
 * - Conversational follow-ups
 * - Varied phrasings and natural language patterns
 * - Loads thousands of locations from data/geonames.json
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

// Load locations from geonames.json
function loadGeonamesLocations(): Location[] {
  const geonamesPath = path.join(__dirname, '..', 'data', 'geonames.json');
  try {
    const data = JSON.parse(fs.readFileSync(geonamesPath, 'utf-8')) as Array<[string, number, number, number, string, string]>;
    const filtered = data.filter(loc => loc[3] > 10000);
    const sampled = filtered.sort(() => Math.random() - 0.5).slice(0, 3000);
    return sampled.map(loc => ({
      name: loc[0],
      aliases: [],
      longitude: loc[2],
      latitude: loc[1],
      type: 'city' as const
    }));
  } catch {
    console.log('Could not load geonames.json, using built-in locations only');
    return [];
  }
}

const GEONAMES_LOCATIONS = loadGeonamesLocations();

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
  { name: 'Denver', aliases: ['Denver Colorado'], longitude: -104.9903, latitude: 39.7392, type: 'city' },
  { name: 'Phoenix', aliases: ['Phoenix Arizona'], longitude: -112.0740, latitude: 33.4484, type: 'city' },
  { name: 'Philadelphia', aliases: ['Philly'], longitude: -75.1652, latitude: 39.9526, type: 'city' },
  { name: 'San Diego', aliases: ['SD'], longitude: -117.1611, latitude: 32.7157, type: 'city' },
  { name: 'Dallas', aliases: ['Dallas Texas'], longitude: -96.7970, latitude: 32.7767, type: 'city' },
  { name: 'Austin', aliases: ['Austin Texas'], longitude: -97.7431, latitude: 30.2672, type: 'city' },
  { name: 'Nashville', aliases: ['Nashville Tennessee'], longitude: -86.7816, latitude: 36.1627, type: 'city' },
  { name: 'Las Vegas', aliases: ['Vegas', 'Sin City'], longitude: -115.1398, latitude: 36.1699, type: 'city' },
  { name: 'Seattle', aliases: ['Seattle Washington'], longitude: -122.3321, latitude: 47.6062, type: 'city' },
  { name: 'Boston', aliases: ['Boston Massachusetts'], longitude: -71.0589, latitude: 42.3601, type: 'city' },

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

  // Scientific Facilities & Research Centers
  { name: 'CERN', aliases: ['the Large Hadron Collider', 'LHC', 'CERN Geneva'], longitude: 6.0536, latitude: 46.2330, height: 30000, type: 'landmark' },
  { name: 'NASA Kennedy Space Center', aliases: ['Kennedy Space Center', 'KSC', 'Cape Canaveral'], longitude: -80.6501, latitude: 28.5729, height: 50000, type: 'landmark' },
  { name: 'NASA JPL', aliases: ['Jet Propulsion Laboratory', 'JPL', 'JPL Pasadena'], longitude: -118.1726, latitude: 34.2013, height: 30000, type: 'landmark' },
  { name: 'NASA Houston', aliases: ['Johnson Space Center', 'JSC', 'Mission Control'], longitude: -95.0930, latitude: 29.5519, height: 30000, type: 'landmark' },
  { name: 'Baikonur Cosmodrome', aliases: ['Baikonur', 'Baikonur Kazakhstan'], longitude: 63.3420, latitude: 45.9646, height: 50000, type: 'landmark' },
  { name: 'Vandenberg Space Force Base', aliases: ['Vandenberg', 'VSFB', 'Vandenberg AFB'], longitude: -120.5724, latitude: 34.7420, height: 50000, type: 'landmark' },
  { name: 'European Space Agency', aliases: ['ESA', 'ESOC Darmstadt', 'ESA Headquarters'], longitude: 8.6220, latitude: 49.8700, height: 30000, type: 'landmark' },
  { name: 'Goddard Space Flight Center', aliases: ['Goddard', 'GSFC'], longitude: -76.8527, latitude: 38.9910, height: 30000, type: 'landmark' },
  { name: 'SpaceX Starbase', aliases: ['Starbase', 'Boca Chica', 'SpaceX Texas'], longitude: -97.1557, latitude: 25.9968, height: 30000, type: 'landmark' },
  { name: 'MIT', aliases: ['Massachusetts Institute of Technology', 'MIT Cambridge'], longitude: -71.0921, latitude: 42.3601, height: 30000, type: 'landmark' },
  { name: 'Stanford', aliases: ['Stanford University', 'Stanford Palo Alto'], longitude: -122.1697, latitude: 37.4275, height: 30000, type: 'landmark' },
  { name: 'Pentagon', aliases: ['the Pentagon', 'DoD Headquarters'], longitude: -77.0558, latitude: 38.8719, height: 30000, type: 'landmark' },
  { name: 'White House', aliases: ['the White House', 'US White House'], longitude: -77.0365, latitude: 38.8977, height: 30000, type: 'landmark' },
  { name: 'Fermilab', aliases: ['Fermi National Accelerator Laboratory'], longitude: -88.2575, latitude: 41.8319, height: 30000, type: 'landmark' },
  { name: 'Area 51', aliases: ['Groom Lake', 'Nevada Test Site'], longitude: -115.8111, latitude: 37.2350, height: 50000, type: 'landmark' },

  // Airports
  { name: 'JFK Airport', aliases: ['JFK', 'John F Kennedy Airport', 'New York JFK'], longitude: -73.7781, latitude: 40.6413, height: 20000, type: 'landmark' },
  { name: 'Heathrow Airport', aliases: ['Heathrow', 'London Heathrow', 'LHR'], longitude: -0.4543, latitude: 51.4700, height: 20000, type: 'landmark' },
  { name: 'LAX', aliases: ['Los Angeles Airport', 'LAX Airport'], longitude: -118.4085, latitude: 33.9416, height: 20000, type: 'landmark' },
  { name: 'Dubai Airport', aliases: ['DXB', 'Dubai International'], longitude: 55.3647, latitude: 25.2532, height: 20000, type: 'landmark' },

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
  { name: 'Mount Kilimanjaro', aliases: ['Kilimanjaro', 'Mt Kilimanjaro'], longitude: 37.3556, latitude: -3.0674, height: 100000, type: 'natural' },
  { name: 'Alps', aliases: ['the Alps', 'Swiss Alps'], longitude: 7.6500, latitude: 46.0000, height: 300000, type: 'natural' },
  { name: 'Rocky Mountains', aliases: ['the Rockies'], longitude: -105.7821, latitude: 40.3428, height: 300000, type: 'natural' },
];

const ALL_LOCATIONS = [...LOCATIONS, ...GEONAMES_LOCATIONS];

// ============================================================================
// Common Data
// ============================================================================

const COLORS = ['red', 'blue', 'green', 'yellow', 'orange', 'purple', 'pink', 'cyan', 'white', 'magenta', 'lime', 'navy', 'maroon', 'teal', 'gold', 'silver', 'coral', 'salmon', 'turquoise', 'indigo'];
const RADII = [5, 10, 25, 50, 100, 200, 500, 1000, 2000];
const DEGREES = [5, 10, 15, 20, 30, 45, 60, 90, 180];
const SPEEDS = [0.5, 1, 2, 5, 10, 50, 100, 1000];
const ALPHAS = [0.1, 0.25, 0.5, 0.75, 1.0];
const BRIGHTNESSES = [0.5, 0.75, 1.0, 1.25, 1.5, 2.0];
const EXAGGERATIONS = [1, 1.5, 2, 3, 5, 10];

const ENTITY_TYPES = ['satellite', 'aircraft', 'plane', 'ship', 'vehicle', 'drone', 'rocket', 'station', 'target', 'marker', 'point', 'vessel', 'helicopter', 'car', 'truck', 'train', 'balloon', 'missile', 'object', 'entity', 'spacecraft', 'debris', 'asteroid', 'comet'];
const ENTITY_NAMES = ['ISS', 'Hubble', 'Dragon', 'Starlink-1', 'GPS-IIF', 'Flight-123', 'Ship-Alpha', 'Drone-7', 'Rocket-X', 'Target-1', 'Vehicle-A', 'Station-3', 'Sat-42', 'Object-9', 'Aircraft-B', 'Helicopter-2', 'Vessel-5', 'MyMarker', 'TestPoint', 'DataPoint-1', 'Tiangong', 'TDRS-M', 'Sentinel-2', 'Landsat-9', 'GOES-18'];

// Astrodynamics and orbital mechanics terminology
const ASTRO_DIRECTIONS = ['radial', 'in-track', 'cross-track', 'along-track', 'prograde', 'retrograde', 'normal', 'anti-normal', 'nadir', 'zenith'];
const ORBITAL_TERMS = ['apogee', 'perigee', 'ascending node', 'descending node', 'orbital plane', 'inclination', 'eccentricity', 'semi-major axis', 'periapsis', 'apoapsis'];
const REFERENCE_FRAMES = ['ECI', 'ECEF', 'RIC', 'VNB', 'LVLH', 'TNW', 'RSW', 'NTW', 'body-fixed', 'inertial'];
const MANEUVER_TYPES = ['Hohmann transfer', 'bi-elliptic transfer', 'plane change', 'phasing maneuver', 'station keeping', 'rendezvous', 'docking', 'de-orbit burn'];

// Cesium API documentation terminology
const CESIUM_CAMERA_TERMS = ['heading', 'pitch', 'roll', 'position', 'direction', 'up vector', 'right vector', 'frustum', 'fov', 'field of view', 'near plane', 'far plane', 'aspect ratio'];
const CESIUM_POSITION_TERMS = ['Cartesian3', 'Cartographic', 'cartographicDegrees', 'cartographicRadians', 'WGS84', 'ellipsoid height', 'geodetic', 'ECEF'];
const CESIUM_SCENE_TERMS = ['scene mode', 'Columbus view', 'morphing', 'globe', 'terrain', 'imagery layer', 'primitive', 'ground primitive', 'billboards', 'labels', 'points'];
const CESIUM_ENTITY_TERMS = ['entity', 'data source', 'CZML', 'KML', 'GeoJSON', 'property', 'sampled property', 'time-dynamic', 'availability', 'interpolation'];
const CESIUM_RENDER_TERMS = ['post-process', 'FXAA', 'bloom', 'ambient occlusion', 'depth of field', 'silhouette', 'outline', 'shadows', 'fog', 'atmosphere'];
const CESIUM_UNITS = ['degrees', 'radians', 'meters', 'kilometers', 'pixels', 'seconds', 'milliseconds'];

const LABEL_TEXTS = ['Hello', 'Here', 'Important', 'Note', 'Visit', 'Start', 'End', 'Destination', 'Home', 'Work', 'Point of Interest', 'Landmark', 'Meeting point', 'Checkpoint', 'Target', 'Base', 'HQ', 'Site A', 'Location B', 'Waypoint'];

const SAMPLE_URLS = {
  geojson: ['https://example.com/data.geojson', 'https://api.example.com/features.json', '/data/local.geojson', './assets/regions.geojson', 'https://cdn.example.com/cities.geojson'],
  kml: ['https://example.com/data.kml', 'https://earth.google.com/places.kml', '/data/local.kml', './assets/tour.kmz', 'https://maps.example.org/route.kml'],
  czml: ['https://example.com/animation.czml', 'https://cesium.com/satellites.czml', '/data/simulation.czml', './assets/orbits.czml', 'https://api.example.com/trajectory.czml'],
  gpx: ['https://example.com/track.gpx', '/data/hike.gpx', './assets/route.gpx', 'https://gps.example.com/trail.gpx'],
  model: ['https://example.com/model.glb', '/assets/building.gltf', './models/vehicle.glb', 'https://cdn.example.com/aircraft.gltf'],
  tileset: ['https://example.com/tileset.json', 'https://tiles.example.com/buildings/tileset.json', '/data/3dtiles/tileset.json'],
  wms: ['https://wms.example.com/service', 'https://geoserver.example.org/wms', 'https://maps.example.com/wms'],
  image: ['https://example.com/texture.png', '/assets/image.jpg', './textures/surface.png', 'https://cdn.example.com/overlay.png'],
};

const WEATHER_TYPES = ['rain', 'snow', 'fog'];
const PARTICLE_TYPES = ['fire', 'smoke', 'explosion', 'fountain', 'dust', 'sparks'];
const SCENE_MODES = ['2D', '3D', 'COLUMBUS_VIEW'];

// ============================================================================
// Phrase Variations
// ============================================================================

const POLITE_PREFIXES = [
  '', '', '', // Empty for variety
  'Please ', 'Could you ', 'Can you ', 'Would you ', "I'd like you to ",
  'Go ahead and ', 'I want to ', 'I need to ', "Let's ", 'Help me ',
  'I would like to ', 'Kindly ', 'Just ',
];

const CASUAL_SUFFIXES = ['', '', '', '', ' please', ' for me', ' now', ' right now', ' quickly'];

// ============================================================================
// Utility Functions
// ============================================================================

function randomChoice<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]!;
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function shuffle<T>(arr: T[]): T[] {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j]!, result[i]!];
  }
  return result;
}

function applyVariedPhrasing(text: string): string {
  if (Math.random() < 0.35) {
    const prefix = randomChoice(POLITE_PREFIXES);
    if (prefix) {
      text = prefix + text.charAt(0).toLowerCase() + text.slice(1);
    }
  }
  if (Math.random() < 0.2) {
    text = text.replace(/[.?]?$/, randomChoice(CASUAL_SUFFIXES));
  }
  return text;
}

function getLocationName(loc: Location): string {
  return Math.random() > 0.3 ? loc.name : randomChoice([loc.name, ...loc.aliases]);
}

interface Example {
  instruction: string;
  output: string;
}

// ============================================================================
// CAMERA CONTROL GENERATORS
// ============================================================================

const FLY_TO_TEMPLATES = [
  'Show me {location}', 'Fly to {location}', 'Go to {location}', 'Navigate to {location}',
  'Take me to {location}', 'Zoom to {location}', 'Move to {location}', "Let's go to {location}",
  'Can you show me {location}?', 'I want to see {location}', 'Center on {location}',
  'Focus on {location}', 'Pan to {location}', 'Jump to {location}', 'View {location}',
  'Display {location}', 'Bring up {location}', 'Head to {location}', 'Travel to {location}',
  'Look at {location}', 'Point the camera at {location}', 'Where is {location}?',
  'Find {location}', 'Locate {location}', 'Search for {location}', 'Explore {location}',
  'Visit {location}', 'Show {location} on the map', 'Fly over {location}',
  'What does {location} look like?', 'How do I see {location}?', 'Take me there',
  'Go there', 'Fly there', 'Show me that place', 'Navigate there',
];

function generateFlyTo(): Example {
  const loc = randomChoice(ALL_LOCATIONS);
  const template = randomChoice(FLY_TO_TEMPLATES);
  const instruction = applyVariedPhrasing(template.replace('{location}', getLocationName(loc)));
  return {
    instruction,
    output: JSON.stringify({ tool: 'flyTo', arguments: { longitude: loc.longitude, latitude: loc.latitude, height: loc.height || 500000 } })
  };
}

const SET_VIEW_TEMPLATES = [
  'Jump to {location}', 'Teleport to {location}', 'Instantly go to {location}',
  'Set camera to {location}', 'Position camera at {location}', 'Set view to {location}',
  'Snap to {location}', 'Immediately show {location}', 'Quick jump to {location}',
  'Set the view to {location}', 'Snap the camera to {location}', 'Teleport camera to {location}',
  'Instant view of {location}', 'Direct jump to {location}', 'Set position at {location}',
];

function generateSetView(): Example {
  const loc = randomChoice(ALL_LOCATIONS);
  const template = randomChoice(SET_VIEW_TEMPLATES);
  const instruction = applyVariedPhrasing(template.replace('{location}', getLocationName(loc)));
  const args: Record<string, unknown> = { longitude: loc.longitude, latitude: loc.latitude, height: loc.height || 500000 };
  if (Math.random() > 0.5) args.heading = randomInt(0, 360);
  if (Math.random() > 0.5) args.pitch = randomInt(-90, 0);
  return { instruction, output: JSON.stringify({ tool: 'setView', arguments: args }) };
}

const LOOK_AT_TEMPLATES = [
  'Look at {location}', 'Focus on {location}', 'Point at {location}',
  'Aim at {location}', 'Direct view to {location}', 'Face {location}',
  'Turn towards {location}', 'Look towards {location}', 'Orient towards {location}',
];

function generateLookAt(): Example {
  const loc = randomChoice(ALL_LOCATIONS);
  const template = randomChoice(LOOK_AT_TEMPLATES);
  const instruction = applyVariedPhrasing(template.replace('{location}', getLocationName(loc)));
  return {
    instruction,
    output: JSON.stringify({ tool: 'lookAt', arguments: { longitude: loc.longitude, latitude: loc.latitude, height: loc.height || 0, range: randomChoice([50000, 100000, 500000, 1000000]) } })
  };
}

const ZOOM_IN_TEMPLATES = ['Zoom in', 'Get closer', 'Zoom in more', 'Move closer', 'Magnify', 'Increase zoom', 'Closer', 'Zoom in a bit', 'Get a closer look', 'Move in'];
const ZOOM_OUT_TEMPLATES = ['Zoom out', 'Move back', 'Zoom out more', 'Pull back', 'Decrease zoom', 'Further away', 'Show more area', 'Zoom out a bit', 'Get wider view', 'Move out'];

function generateZoom(): Example {
  const zoomIn = Math.random() > 0.5;
  const templates = zoomIn ? ZOOM_IN_TEMPLATES : ZOOM_OUT_TEMPLATES;
  const instruction = applyVariedPhrasing(randomChoice(templates));
  const amount = randomChoice([100000, 200000, 500000, 1000000]) * (zoomIn ? 1 : -1);
  return { instruction, output: JSON.stringify({ tool: 'zoom', arguments: { amount } }) };
}

const ROTATE_TEMPLATES = [
  'Turn left', 'Turn right', 'Look up', 'Look down', 'Pan left', 'Pan right',
  'Rotate left', 'Rotate right', 'Tilt up', 'Tilt down', 'Swivel left', 'Swivel right',
  'Turn left {degrees} degrees', 'Turn right {degrees} degrees', 'Rotate {degrees} degrees left',
  'Pan camera left', 'Pan camera right', 'Rotate view left', 'Rotate view right',
  'Turn the camera left', 'Turn the camera right', 'Pitch up', 'Pitch down',
  'Yaw left', 'Yaw right', 'Roll left', 'Roll right',
];

function generateRotateCamera(): Example {
  let template = randomChoice(ROTATE_TEMPLATES);
  const degrees = randomChoice(DEGREES);
  template = template.replace('{degrees}', degrees.toString());
  const instruction = applyVariedPhrasing(template);
  const isHorizontal = template.includes('left') || template.includes('right') || template.includes('yaw');
  const isPositive = template.includes('right') || template.includes('up');
  const args: Record<string, number> = {};
  if (isHorizontal) {
    args.heading = isPositive ? degrees : -degrees;
  } else {
    args.pitch = isPositive ? degrees : -degrees;
  }
  return { instruction, output: JSON.stringify({ tool: 'rotateCamera', arguments: args }) };
}

const GET_CAMERA_TEMPLATES = [
  'Where am I?', "What's my position?", 'Camera location', 'Current position',
  'Show coordinates', 'Get camera position', "What's the current location?",
  'Show my coordinates', 'Where is the camera?', 'Current camera location',
  'What are my coordinates?', 'Get my location', 'Position info', 'Camera info',
  'Tell me where I am', 'What location am I at?', 'Current lat long',
];

function generateGetCamera(): Example {
  const instruction = applyVariedPhrasing(randomChoice(GET_CAMERA_TEMPLATES));
  return { instruction, output: JSON.stringify({ tool: 'getCamera', arguments: {} }) };
}

const FLY_TO_ENTITY_TEMPLATES = [
  'Fly to the {entity}', 'Go to the {entity}', 'Zoom to the {entity}',
  'Navigate to the {entity}', 'Show me the {entity}', 'Fly to {entity}',
  'Go to {entity}', 'Focus on the {entity}', 'Center on {entity}',
  'Find {entity}', 'Locate {entity}', 'View {entity}', 'Show {entity}',
];

function generateFlyToEntity(): Example {
  const loc = randomChoice(ALL_LOCATIONS);
  const suffix = randomChoice(['Sphere', 'Marker', 'Point', 'Box', 'Label']);
  const entityName = `${loc.name} ${suffix}`;
  const template = randomChoice(FLY_TO_ENTITY_TEMPLATES);
  const instruction = applyVariedPhrasing(template.replace('{entity}', entityName));
  return { instruction, output: JSON.stringify({ tool: 'flyToEntity', arguments: { entityId: entityName, duration: 3 } }) };
}

const TRACK_ENTITY_TEMPLATES = [
  'Follow the {entity}', 'Track the {entity}', 'Keep eye on the {entity}',
  'Watch the {entity}', 'Follow {name}', 'Track {name}', 'Lock on to the {entity}',
  'Lock onto {name}', 'Keep tracking the {entity}', 'Stay with the {entity}',
  'Monitor the {entity}', 'Chase the {entity}', 'Shadow the {entity}',
  'Keep up with the {entity}', 'Follow that {entity}', 'Focus on the {entity}',
  // Astrodynamics tracking terminology
  'Track {name} through its orbit', 'Follow the {entity} along its trajectory',
  'Monitor {name} orbital position', 'Track {name} in the LVLH frame',
  'Follow {name} in the RIC frame', 'Keep camera on {name} at perigee',
  'Track {name} through apogee', 'Follow {name} past the ascending node',
  'Monitor {name} during the conjunction', 'Track the {entity} in ECI',
];

function generateTrackEntity(): Example {
  const entityType = randomChoice(ENTITY_TYPES);
  const entityName = randomChoice(ENTITY_NAMES);
  let template = randomChoice(TRACK_ENTITY_TEMPLATES);
  template = template.replace('{entity}', entityType).replace('{name}', entityName);
  const instruction = applyVariedPhrasing(template);
  const entityId = template.includes(entityName) ? entityName : `${entityType}-${randomInt(1, 99)}`;
  return { instruction, output: JSON.stringify({ tool: 'trackEntity', arguments: { entityId } }) };
}

const STOP_TRACKING_TEMPLATES = [
  'Stop tracking', 'Stop following', 'Unfollow', 'Release tracking',
  'Cancel tracking', 'End tracking', 'Stop watching', 'Unlock camera',
  'Free the camera', 'Detach camera', 'Stop the follow', 'Clear tracking',
];

function generateStopTracking(): Example {
  const instruction = applyVariedPhrasing(randomChoice(STOP_TRACKING_TEMPLATES));
  return { instruction, output: JSON.stringify({ tool: 'stopTracking', arguments: {} }) };
}

const ORBIT_TEMPLATES = [
  'Orbit around {location}', 'Circle around {location}', 'Spin around {location}',
  'Rotate around {location}', 'Fly around {location}', 'Orbit {location}',
  'Circle {location}', 'Go around {location}', 'Revolve around {location}',
  'Start orbiting {location}', 'Begin orbit around {location}',
];

function generateOrbitTarget(): Example {
  const loc = randomChoice(ALL_LOCATIONS);
  const template = randomChoice(ORBIT_TEMPLATES);
  const instruction = applyVariedPhrasing(template.replace('{location}', getLocationName(loc)));
  return {
    instruction,
    output: JSON.stringify({ tool: 'orbitTarget', arguments: { longitude: loc.longitude, latitude: loc.latitude, height: loc.height || 0, radius: randomChoice([100000, 500000, 1000000]), duration: randomChoice([30, 60, 120]) } })
  };
}

const STOP_ORBIT_TEMPLATES = [
  'Stop orbiting', 'Stop circling', 'End orbit', 'Cancel orbit',
  'Stop spinning around', 'Finish orbit', 'Halt orbit', 'Stop the rotation',
];

function generateStopOrbit(): Example {
  const instruction = applyVariedPhrasing(randomChoice(STOP_ORBIT_TEMPLATES));
  return { instruction, output: JSON.stringify({ tool: 'stopOrbit', arguments: {} }) };
}

// ============================================================================
// ENTITY GENERATORS
// ============================================================================

const ADD_POINT_TEMPLATES = [
  'Add a {color} marker at {location}', 'Put a {color} point at {location}',
  'Mark {location} with a {color} marker', 'Place a {color} pin at {location}',
  'Add a marker at {location}', 'Put a point on {location}', 'Mark {location}',
  'Drop a {color} marker on {location}', 'Create a {color} point at {location}',
  'Add a pin at {location}', 'Place a marker at {location}',
];

function generateAddPoint(): Example {
  const loc = randomChoice(ALL_LOCATIONS);
  const color = randomChoice(COLORS);
  const template = randomChoice(ADD_POINT_TEMPLATES);
  const instruction = applyVariedPhrasing(template.replace('{location}', getLocationName(loc)).replace('{color}', color));
  return {
    instruction,
    output: JSON.stringify({ tool: 'addPoint', arguments: { longitude: loc.longitude, latitude: loc.latitude, name: loc.name, color } })
  };
}

const ADD_LABEL_TEMPLATES = [
  'Add a label {text} at {location}', 'Put text {text} at {location}',
  'Label {location} with {text}', 'Add text {text} to {location}',
  'Write {text} at {location}', 'Display {text} at {location}',
  'Show text {text} near {location}', 'Create a label saying {text} at {location}',
  'Add annotation {text} at {location}', 'Put a label at {location} saying {text}',
];

function generateAddLabel(): Example {
  const loc = randomChoice(ALL_LOCATIONS);
  const text = randomChoice(LABEL_TEXTS);
  const template = randomChoice(ADD_LABEL_TEMPLATES);
  const instruction = applyVariedPhrasing(template.replace('{location}', getLocationName(loc)).replace('{text}', text));
  return {
    instruction,
    output: JSON.stringify({ tool: 'addLabel', arguments: { longitude: loc.longitude, latitude: loc.latitude, text, color: 'white' } })
  };
}

const ADD_POLYLINE_TEMPLATES = [
  'Draw a line from {loc1} to {loc2}', 'Connect {loc1} to {loc2}',
  'Draw a {color} line from {loc1} to {loc2}', 'Create a path from {loc1} to {loc2}',
  'Add a line connecting {loc1} and {loc2}', 'Draw a route from {loc1} to {loc2}',
  'Trace a line from {loc1} to {loc2}', 'Make a line between {loc1} and {loc2}',
];

function generateAddPolyline(): Example {
  const locs = shuffle(LOCATIONS).slice(0, 2);
  const color = randomChoice(COLORS);
  const template = randomChoice(ADD_POLYLINE_TEMPLATES);
  const instruction = applyVariedPhrasing(template.replace('{loc1}', locs[0]!.name).replace('{loc2}', locs[1]!.name).replace('{color}', color));
  return {
    instruction,
    output: JSON.stringify({
      tool: 'addPolyline',
      arguments: {
        positions: [{ longitude: locs[0]!.longitude, latitude: locs[0]!.latitude }, { longitude: locs[1]!.longitude, latitude: locs[1]!.latitude }],
        name: `${locs[0]!.name} to ${locs[1]!.name}`,
        color
      }
    })
  };
}

const ADD_POLYGON_TEMPLATES = [
  'Draw a triangle connecting {loc1}, {loc2}, and {loc3}',
  'Create a polygon around {location}', 'Add a {color} polygon at {location}',
  'Draw a shape connecting {loc1}, {loc2}, and {loc3}',
  'Create a filled area from {loc1} to {loc2} to {loc3}',
  'Draw a polygon between {loc1}, {loc2}, {loc3}',
];

function generateAddPolygon(): Example {
  const locs = shuffle(ALL_LOCATIONS.filter(l => l.type === 'city')).slice(0, 3);
  const color = randomChoice(COLORS);
  const template = randomChoice(ADD_POLYGON_TEMPLATES);
  const instruction = applyVariedPhrasing(
    template.replace('{loc1}', locs[0]!.name).replace('{loc2}', locs[1]!.name).replace('{loc3}', locs[2]!.name)
      .replace('{location}', locs[0]!.name).replace('{color}', color)
  );
  return {
    instruction,
    output: JSON.stringify({
      tool: 'addPolygon',
      arguments: {
        positions: locs.map(l => ({ longitude: l.longitude, latitude: l.latitude })),
        name: `${locs[0]!.name} Triangle`,
        color
      }
    })
  };
}

const ADD_CIRCLE_TEMPLATES = [
  'Draw a circle around {location} with {radius}km radius',
  'Create a {radius}km circle at {location}', 'Add a {color} circle around {location}',
  'Draw a {radius} kilometer radius circle at {location}',
  'Create a circular area of {radius}km around {location}',
  'Add a flat circle at {location}', 'Draw an ellipse around {location}',
];

function generateAddCircle(): Example {
  const loc = randomChoice(ALL_LOCATIONS);
  const radius = randomChoice(RADII);
  const color = randomChoice(COLORS);
  const template = randomChoice(ADD_CIRCLE_TEMPLATES);
  const instruction = applyVariedPhrasing(template.replace('{location}', getLocationName(loc)).replace('{radius}', radius.toString()).replace('{color}', color));
  return {
    instruction,
    output: JSON.stringify({ tool: 'addCircle', arguments: { longitude: loc.longitude, latitude: loc.latitude, radius: radius * 1000, name: `${loc.name} Area`, color } })
  };
}

const ADD_SPHERE_TEMPLATES = [
  'Add a {color} sphere at {location}', 'Put a sphere over {location}',
  'Create a sphere at {location}', 'Add a {radius}km sphere to {location}',
  'Put a {radius}km radius sphere at {location}', 'Create a {color} sphere over {location}',
  'Add a ball at {location}', 'Put a ball over {location}', 'Create a 3D sphere at {location}',
  'Add a {color} ball at {location}', 'Place a sphere at {location}',
  'Make a sphere at {location}', 'Show a sphere at {location}',
  'Add a {color} sphere to {location}', 'Put a {color} ball at {location}',
  // Astrodynamics-style templates
  'Add a {radius}km covariance sphere at {location}',
  'Create an uncertainty sphere of {radius}km at {location}',
  'Put a keep-out sphere of {radius}km at {location}',
  'Add a {radius}km exclusion zone sphere at {location}',
  'Create a conjunction assessment sphere {radius}km at {location}',
  'Add a {radius}km proximity sphere around the satellite at {location}',
  'Place a {radius}km miss distance sphere at {location}',
];

function generateAddSphere(): Example {
  const loc = randomChoice(ALL_LOCATIONS);
  const radius = randomChoice(RADII);
  const color = randomChoice(COLORS);
  const template = randomChoice(ADD_SPHERE_TEMPLATES);
  const instruction = applyVariedPhrasing(template.replace(/{location}/g, getLocationName(loc)).replace(/{radius}/g, radius.toString()).replace(/{color}/g, color));
  const args: Record<string, unknown> = { longitude: loc.longitude, latitude: loc.latitude, radius: radius * 1000, name: loc.name, color };
  if (Math.random() > 0.7) args.height = randomChoice([1000, 5000, 10000, 50000]);
  return { instruction, output: JSON.stringify({ tool: 'addSphere', arguments: args }) };
}

const ADD_BOX_TEMPLATES = [
  'Add a box at {location}', 'Put a {color} box at {location}',
  'Create a cube at {location}', 'Add a 3D box at {location}',
  'Place a box over {location}', 'Add a rectangular box at {location}',
  'Create a {color} cube at {location}', 'Make a box at {location}',
];

function generateAddBox(): Example {
  const loc = randomChoice(ALL_LOCATIONS);
  const color = randomChoice(COLORS);
  const size = randomChoice([100, 200, 500, 1000, 2000]);
  const template = randomChoice(ADD_BOX_TEMPLATES);
  const instruction = applyVariedPhrasing(template.replace('{location}', getLocationName(loc)).replace('{color}', color));
  return {
    instruction,
    output: JSON.stringify({ tool: 'addBox', arguments: { longitude: loc.longitude, latitude: loc.latitude, dimensionX: size, dimensionY: size, dimensionZ: size * 2, name: `${loc.name} Box`, color } })
  };
}

const ADD_CYLINDER_TEMPLATES = [
  'Add a cylinder at {location}', 'Put a {color} cylinder at {location}',
  'Create a cylinder at {location}', 'Add a tall cylinder at {location}',
  'Create a cone at {location}', 'Add a {color} cone at {location}',
  'Place a cylinder over {location}', 'Make a cylinder at {location}',
];

function generateAddCylinder(): Example {
  const loc = randomChoice(ALL_LOCATIONS);
  const color = randomChoice(COLORS);
  const template = randomChoice(ADD_CYLINDER_TEMPLATES);
  const isCone = template.includes('cone');
  const instruction = applyVariedPhrasing(template.replace('{location}', getLocationName(loc)).replace('{color}', color));
  return {
    instruction,
    output: JSON.stringify({
      tool: 'addCylinder',
      arguments: {
        longitude: loc.longitude, latitude: loc.latitude,
        length: randomChoice([100, 300, 500, 1000]),
        topRadius: isCone ? 0 : randomChoice([50, 100, 200]),
        bottomRadius: randomChoice([50, 100, 200]),
        name: isCone ? `${loc.name} Cone` : `${loc.name} Cylinder`,
        color
      }
    })
  };
}

const ADD_ELLIPSOID_TEMPLATES = [
  'Add an ellipsoid at {location}', 'Put an ellipsoid over {location}',
  'Create an ellipsoid at {location}', 'Add a stretched sphere at {location}',
  'Place an ellipsoid at {location}', 'Make an ellipsoid at {location}',
  // Astrodynamics-style templates with axis specifications
  'Add an ellipsoid with {xRadius}km radial, {yRadius}km in-track, {zRadius}km cross-track at {location}',
  'Create an ellipsoid {xRadius}km x {yRadius}km x {zRadius}km at {location}',
  'Add ellipsoid with radii {xRadius}, {yRadius}, {zRadius} km at {location}',
  'Put an ellipsoid with {xRadius}km along-track and {zRadius}km normal at {location}',
  'Create an ellipsoid {xRadius}km in the radial direction and {yRadius}km in-track at {location}',
  'Add a {xRadius}km by {yRadius}km by {zRadius}km ellipsoid at {location}',
  'Place an ellipsoid with RIC dimensions {xRadius}, {yRadius}, {zRadius} at {location}',
  'Create uncertainty ellipsoid {xRadius}km radial, {yRadius}km in-track, {zRadius}km cross-track at {location}',
];

function generateAddEllipsoid(): Example {
  const loc = randomChoice(ALL_LOCATIONS);
  const color = randomChoice(COLORS);
  const template = randomChoice(ADD_ELLIPSOID_TEMPLATES);
  const xRadius = randomChoice([5, 10, 25, 50, 100]);
  const yRadius = randomChoice([10, 25, 50, 100, 200]);
  const zRadius = randomChoice([5, 10, 25, 50]);
  const instruction = applyVariedPhrasing(
    template.replace('{location}', getLocationName(loc))
      .replace(/{xRadius}/g, xRadius.toString())
      .replace(/{yRadius}/g, yRadius.toString())
      .replace(/{zRadius}/g, zRadius.toString())
  );
  return {
    instruction,
    output: JSON.stringify({
      tool: 'addEllipsoid',
      arguments: {
        longitude: loc.longitude, latitude: loc.latitude,
        radii: { x: xRadius * 1000, y: yRadius * 1000, z: zRadius * 1000 },
        name: `${loc.name} Ellipsoid`,
        color
      }
    })
  };
}

const ADD_CORRIDOR_TEMPLATES = [
  'Draw a corridor from {loc1} to {loc2}', 'Create a road from {loc1} to {loc2}',
  'Add a {width}m wide corridor from {loc1} to {loc2}',
  'Draw a path {width} meters wide from {loc1} to {loc2}',
  'Create a corridor connecting {loc1} and {loc2}',
];

function generateAddCorridor(): Example {
  const locs = shuffle(LOCATIONS).slice(0, 2);
  const color = randomChoice(COLORS);
  const width = randomChoice([10, 50, 100, 500, 1000]);
  const template = randomChoice(ADD_CORRIDOR_TEMPLATES);
  const instruction = applyVariedPhrasing(template.replace('{loc1}', locs[0]!.name).replace('{loc2}', locs[1]!.name).replace('{width}', width.toString()).replace('{color}', color));
  return {
    instruction,
    output: JSON.stringify({
      tool: 'addCorridor',
      arguments: {
        positions: [{ longitude: locs[0]!.longitude, latitude: locs[0]!.latitude }, { longitude: locs[1]!.longitude, latitude: locs[1]!.latitude }],
        width,
        name: `${locs[0]!.name} to ${locs[1]!.name} Corridor`,
        color
      }
    })
  };
}

const ADD_WALL_TEMPLATES = [
  'Create a wall around {location}', 'Add walls around {location}',
  'Build a wall at {location}', 'Put walls around {location}',
  'Construct a wall near {location}', 'Make walls at {location}',
];

function generateAddWall(): Example {
  const loc = randomChoice(ALL_LOCATIONS);
  const color = randomChoice(COLORS);
  const template = randomChoice(ADD_WALL_TEMPLATES);
  const instruction = applyVariedPhrasing(template.replace('{location}', getLocationName(loc)).replace('{color}', color));
  const offset = 0.01;
  const positions = [
    { longitude: loc.longitude - offset, latitude: loc.latitude + offset },
    { longitude: loc.longitude + offset, latitude: loc.latitude + offset },
    { longitude: loc.longitude + offset, latitude: loc.latitude - offset },
    { longitude: loc.longitude - offset, latitude: loc.latitude - offset },
    { longitude: loc.longitude - offset, latitude: loc.latitude + offset },
  ];
  return {
    instruction,
    output: JSON.stringify({ tool: 'addWall', arguments: { positions, maximumHeights: [500, 500, 500, 500, 500], minimumHeights: [0, 0, 0, 0, 0], name: `${loc.name} Wall`, color } })
  };
}

const ADD_RECTANGLE_TEMPLATES = [
  'Draw a rectangle at {location}', 'Add a {color} rectangle over {location}',
  'Create a rectangular area at {location}', 'Put a rectangle at {location}',
  'Make a rectangle around {location}', 'Add a flat rectangle at {location}',
];

function generateAddRectangle(): Example {
  const loc = randomChoice(ALL_LOCATIONS);
  const color = randomChoice(COLORS);
  const template = randomChoice(ADD_RECTANGLE_TEMPLATES);
  const instruction = applyVariedPhrasing(template.replace('{location}', getLocationName(loc)).replace('{color}', color));
  const offset = 0.05;
  return {
    instruction,
    output: JSON.stringify({
      tool: 'addRectangle',
      arguments: { west: loc.longitude - offset, south: loc.latitude - offset, east: loc.longitude + offset, north: loc.latitude + offset, name: `${loc.name} Rectangle`, color }
    })
  };
}

// Polyline variants
const ADD_GLOWING_POLYLINE_TEMPLATES = [
  'Draw a glowing line from {loc1} to {loc2}', 'Add a glowing path from {loc1} to {loc2}',
  'Create a neon line from {loc1} to {loc2}', 'Make a glowing route between {loc1} and {loc2}',
];

function generateAddGlowingPolyline(): Example {
  const locs = shuffle(LOCATIONS).slice(0, 2);
  const color = randomChoice(COLORS);
  const template = randomChoice(ADD_GLOWING_POLYLINE_TEMPLATES);
  const instruction = applyVariedPhrasing(template.replace('{loc1}', locs[0]!.name).replace('{loc2}', locs[1]!.name));
  return {
    instruction,
    output: JSON.stringify({
      tool: 'addGlowingPolyline',
      arguments: {
        positions: [{ longitude: locs[0]!.longitude, latitude: locs[0]!.latitude }, { longitude: locs[1]!.longitude, latitude: locs[1]!.latitude }],
        name: `${locs[0]!.name} to ${locs[1]!.name}`,
        color,
        glowPower: 0.25
      }
    })
  };
}

const ADD_DASHED_POLYLINE_TEMPLATES = [
  'Draw a dashed line from {loc1} to {loc2}', 'Add a dashed path from {loc1} to {loc2}',
  'Create a dotted line from {loc1} to {loc2}', 'Make a dashed route between {loc1} and {loc2}',
];

function generateAddDashedPolyline(): Example {
  const locs = shuffle(LOCATIONS).slice(0, 2);
  const color = randomChoice(COLORS);
  const template = randomChoice(ADD_DASHED_POLYLINE_TEMPLATES);
  const instruction = applyVariedPhrasing(template.replace('{loc1}', locs[0]!.name).replace('{loc2}', locs[1]!.name));
  return {
    instruction,
    output: JSON.stringify({
      tool: 'addDashedPolyline',
      arguments: {
        positions: [{ longitude: locs[0]!.longitude, latitude: locs[0]!.latitude }, { longitude: locs[1]!.longitude, latitude: locs[1]!.latitude }],
        name: `${locs[0]!.name} to ${locs[1]!.name}`,
        color
      }
    })
  };
}

const ADD_ARROW_POLYLINE_TEMPLATES = [
  'Draw an arrow from {loc1} to {loc2}', 'Add an arrow pointing from {loc1} to {loc2}',
  'Create an arrow line from {loc1} to {loc2}', 'Make a directional line from {loc1} to {loc2}',
];

function generateAddArrowPolyline(): Example {
  const locs = shuffle(LOCATIONS).slice(0, 2);
  const color = randomChoice(COLORS);
  const template = randomChoice(ADD_ARROW_POLYLINE_TEMPLATES);
  const instruction = applyVariedPhrasing(template.replace('{loc1}', locs[0]!.name).replace('{loc2}', locs[1]!.name));
  return {
    instruction,
    output: JSON.stringify({
      tool: 'addArrowPolyline',
      arguments: {
        positions: [{ longitude: locs[0]!.longitude, latitude: locs[0]!.latitude }, { longitude: locs[1]!.longitude, latitude: locs[1]!.latitude }],
        name: `${locs[0]!.name} to ${locs[1]!.name}`,
        color
      }
    })
  };
}

const ADD_OUTLINED_POLYLINE_TEMPLATES = [
  'Draw an outlined line from {loc1} to {loc2}', 'Add a line with outline from {loc1} to {loc2}',
  'Create an outlined path from {loc1} to {loc2}', 'Make a bordered line between {loc1} and {loc2}',
];

function generateAddOutlinedPolyline(): Example {
  const locs = shuffle(LOCATIONS).slice(0, 2);
  const color = randomChoice(COLORS);
  const template = randomChoice(ADD_OUTLINED_POLYLINE_TEMPLATES);
  const instruction = applyVariedPhrasing(template.replace('{loc1}', locs[0]!.name).replace('{loc2}', locs[1]!.name));
  return {
    instruction,
    output: JSON.stringify({
      tool: 'addOutlinedPolyline',
      arguments: {
        positions: [{ longitude: locs[0]!.longitude, latitude: locs[0]!.latitude }, { longitude: locs[1]!.longitude, latitude: locs[1]!.latitude }],
        name: `${locs[0]!.name} to ${locs[1]!.name}`,
        color,
        outlineColor: 'black'
      }
    })
  };
}

// Billboard and Model
const ADD_BILLBOARD_TEMPLATES = [
  'Add an icon at {location}', 'Put an image marker at {location}',
  'Add a billboard at {location}', 'Place an icon at {location}',
  'Create a billboard at {location}', 'Add a picture marker at {location}',
];

function generateAddBillboard(): Example {
  const loc = randomChoice(ALL_LOCATIONS);
  const template = randomChoice(ADD_BILLBOARD_TEMPLATES);
  const instruction = applyVariedPhrasing(template.replace('{location}', getLocationName(loc)));
  return {
    instruction,
    output: JSON.stringify({ tool: 'addBillboard', arguments: { longitude: loc.longitude, latitude: loc.latitude, image: randomChoice(SAMPLE_URLS.image), name: `${loc.name} Billboard` } })
  };
}

const ADD_MODEL_TEMPLATES = [
  'Add a 3D model at {location}', 'Load a model at {location}',
  'Put a 3D model at {location}', 'Place a model at {location}',
  'Add model {url} at {location}', 'Import 3D model at {location}',
];

function generateAddModel(): Example {
  const loc = randomChoice(ALL_LOCATIONS);
  const url = randomChoice(SAMPLE_URLS.model);
  const template = randomChoice(ADD_MODEL_TEMPLATES);
  const instruction = applyVariedPhrasing(template.replace('{location}', getLocationName(loc)).replace('{url}', url));
  return {
    instruction,
    output: JSON.stringify({ tool: 'addModel', arguments: { longitude: loc.longitude, latitude: loc.latitude, url, name: `${loc.name} Model`, scale: 1 } })
  };
}

// ============================================================================
// ENTITY MANAGEMENT
// ============================================================================

const REMOVE_ENTITY_TEMPLATES = [
  'Remove the {entity}', 'Delete the {entity}', 'Remove {name}',
  'Delete {name}', 'Get rid of {entity}', 'Clear {name}',
  'Remove that {entity}', 'Delete that marker', 'Remove the marker',
];

function generateRemoveEntity(): Example {
  const entityName = randomChoice(ENTITY_NAMES);
  const entityType = randomChoice(['marker', 'point', 'sphere', 'label', 'entity']);
  const template = randomChoice(REMOVE_ENTITY_TEMPLATES);
  const instruction = applyVariedPhrasing(template.replace('{entity}', entityType).replace('{name}', entityName));
  return { instruction, output: JSON.stringify({ tool: 'removeEntity', arguments: { entityId: entityName } }) };
}

const CLEAR_ALL_TEMPLATES = [
  'Clear all', 'Remove everything', 'Delete all entities', 'Clear the map',
  'Remove all markers', 'Clear all entities', 'Delete everything',
  'Reset the view', 'Clear all objects', 'Remove all objects',
];

function generateClearAll(): Example {
  const instruction = applyVariedPhrasing(randomChoice(CLEAR_ALL_TEMPLATES));
  return { instruction, output: JSON.stringify({ tool: 'clearAll', arguments: {} }) };
}

const SELECT_ENTITY_TEMPLATES = [
  'Select the {entity}', 'Click on {name}', 'Select {name}',
  'Choose the {entity}', 'Pick {name}', 'Highlight {name}',
];

function generateSelectEntity(): Example {
  const entityName = randomChoice(ENTITY_NAMES);
  const entityType = randomChoice(['marker', 'point', 'sphere', 'entity']);
  const template = randomChoice(SELECT_ENTITY_TEMPLATES);
  const instruction = applyVariedPhrasing(template.replace('{entity}', entityType).replace('{name}', entityName));
  return { instruction, output: JSON.stringify({ tool: 'selectEntity', arguments: { entityId: entityName } }) };
}

const LIST_ENTITIES_TEMPLATES = [
  'List all entities', 'Show all markers', 'What entities are there?',
  'List everything on the map', 'Show me all objects', 'What have I added?',
  'List all objects', 'Show entities', 'Get entity list',
];

function generateListEntities(): Example {
  const instruction = applyVariedPhrasing(randomChoice(LIST_ENTITIES_TEMPLATES));
  return { instruction, output: JSON.stringify({ tool: 'listEntities', arguments: {} }) };
}

const GET_ENTITY_INFO_TEMPLATES = [
  'Get info about {name}', 'Show info for {name}', 'What is {name}?',
  'Tell me about {name}', 'Details for {name}', 'Info on {name}',
];

function generateGetEntityInfo(): Example {
  const entityName = randomChoice(ENTITY_NAMES);
  const template = randomChoice(GET_ENTITY_INFO_TEMPLATES);
  const instruction = applyVariedPhrasing(template.replace('{name}', entityName));
  return { instruction, output: JSON.stringify({ tool: 'getEntityInfo', arguments: { entityId: entityName } }) };
}

const SHOW_ENTITY_TEMPLATES = [
  'Show the {entity}', 'Make {name} visible', 'Show {name}',
  'Unhide {name}', 'Display {name}', 'Turn on {name}',
];

function generateShowEntity(): Example {
  const entityName = randomChoice(ENTITY_NAMES);
  const entityType = randomChoice(['marker', 'sphere', 'entity']);
  const template = randomChoice(SHOW_ENTITY_TEMPLATES);
  const instruction = applyVariedPhrasing(template.replace('{entity}', entityType).replace('{name}', entityName));
  return { instruction, output: JSON.stringify({ tool: 'showEntity', arguments: { entityId: entityName } }) };
}

const HIDE_ENTITY_TEMPLATES = [
  'Hide the {entity}', 'Make {name} invisible', 'Hide {name}',
  'Conceal {name}', 'Turn off {name}', 'Make {name} hidden',
];

function generateHideEntity(): Example {
  const entityName = randomChoice(ENTITY_NAMES);
  const entityType = randomChoice(['marker', 'sphere', 'entity']);
  const template = randomChoice(HIDE_ENTITY_TEMPLATES);
  const instruction = applyVariedPhrasing(template.replace('{entity}', entityType).replace('{name}', entityName));
  return { instruction, output: JSON.stringify({ tool: 'hideEntity', arguments: { entityId: entityName } }) };
}

// ============================================================================
// SCENE AND DISPLAY
// ============================================================================

const SCENE_MODE_TEMPLATES_MAP: Record<string, string[]> = {
  '2D': ['Switch to 2D mode', 'Show flat map', 'Use 2D view', 'Change to 2D', 'Go to 2D mode', 'Flat view', '2D map please', 'Show 2D'],
  '3D': ['Switch to 3D mode', 'Show the globe', 'Use 3D view', 'Change to 3D', 'Go to 3D mode', '3D globe', 'Show 3D', 'Globe view'],
  'COLUMBUS_VIEW': ['Switch to Columbus view', 'Use 2.5D view', 'Columbus projection', 'Change to Columbus view', 'Go to Columbus mode', 'Flat globe view'],
};

function generateSetSceneMode(): Example {
  const mode = randomChoice(SCENE_MODES);
  const templates = SCENE_MODE_TEMPLATES_MAP[mode]!;
  const instruction = applyVariedPhrasing(randomChoice(templates));
  return { instruction, output: JSON.stringify({ tool: 'setSceneMode', arguments: { mode } }) };
}

const SET_FOG_TEMPLATES = [
  'Enable fog', 'Turn on fog', 'Add fog', 'Show fog', 'Set fog density to {value}',
  'Disable fog', 'Turn off fog', 'Remove fog', 'No fog', 'Clear fog',
  'Make it foggy', 'Add atmospheric fog', 'Enable fog effect',
];

function generateSetFog(): Example {
  const template = randomChoice(SET_FOG_TEMPLATES);
  const enabled = !template.toLowerCase().includes('disable') && !template.toLowerCase().includes('off') && !template.toLowerCase().includes('no ') && !template.toLowerCase().includes('remove') && !template.toLowerCase().includes('clear');
  const instruction = applyVariedPhrasing(template.replace('{value}', randomChoice([0.1, 0.3, 0.5, 0.7, 1.0]).toString()));
  return { instruction, output: JSON.stringify({ tool: 'setFog', arguments: { enabled, density: enabled ? randomChoice([0.0001, 0.0002, 0.0005]) : 0 } }) };
}

const SET_SHADOWS_TEMPLATES = [
  'Enable shadows', 'Turn on shadows', 'Show shadows', 'Add shadows',
  'Disable shadows', 'Turn off shadows', 'Remove shadows', 'No shadows',
  'Enable sun shadows', 'Show realistic shadows',
];

function generateSetShadows(): Example {
  const template = randomChoice(SET_SHADOWS_TEMPLATES);
  const enabled = !template.toLowerCase().includes('disable') && !template.toLowerCase().includes('off') && !template.toLowerCase().includes('no ') && !template.toLowerCase().includes('remove');
  const instruction = applyVariedPhrasing(template);
  return { instruction, output: JSON.stringify({ tool: 'setShadows', arguments: { enabled } }) };
}

const SET_LIGHTING_TEMPLATES = [
  'Enable lighting', 'Turn on sun lighting', 'Use realistic lighting',
  'Disable lighting', 'Turn off lighting', 'No lighting', 'Flat lighting',
  'Enable dynamic lighting', 'Show sun position', 'Real time lighting',
];

function generateSetLighting(): Example {
  const template = randomChoice(SET_LIGHTING_TEMPLATES);
  const enabled = !template.toLowerCase().includes('disable') && !template.toLowerCase().includes('off') && !template.toLowerCase().includes('no ') && !template.toLowerCase().includes('flat');
  const instruction = applyVariedPhrasing(template);
  return { instruction, output: JSON.stringify({ tool: 'setLighting', arguments: { enabled } }) };
}

const SET_ATMOSPHERE_TEMPLATES = [
  'Enable atmosphere', 'Show atmosphere', 'Turn on atmosphere',
  'Disable atmosphere', 'Turn off atmosphere', 'No atmosphere',
  'Show sky', 'Enable sky atmosphere', 'Add atmospheric effects',
];

function generateSetAtmosphere(): Example {
  const template = randomChoice(SET_ATMOSPHERE_TEMPLATES);
  const enabled = !template.toLowerCase().includes('disable') && !template.toLowerCase().includes('off') && !template.toLowerCase().includes('no ');
  const instruction = applyVariedPhrasing(template);
  return { instruction, output: JSON.stringify({ tool: 'setAtmosphere', arguments: { enabled } }) };
}

const SET_GLOBE_TEMPLATES = [
  'Show the globe', 'Enable globe', 'Turn on globe', 'Display globe',
  'Hide the globe', 'Disable globe', 'Turn off globe', 'Remove globe',
  'Show earth', 'Enable earth rendering', 'Hide earth',
];

function generateSetGlobe(): Example {
  const template = randomChoice(SET_GLOBE_TEMPLATES);
  const show = !template.toLowerCase().includes('hide') && !template.toLowerCase().includes('disable') && !template.toLowerCase().includes('off') && !template.toLowerCase().includes('remove');
  const instruction = applyVariedPhrasing(template);
  return { instruction, output: JSON.stringify({ tool: 'setGlobe', arguments: { show } }) };
}

const ENABLE_DEPTH_TEST_TEMPLATES = [
  'Enable depth testing', 'Turn on depth test', 'Use depth testing',
  'Disable depth testing', 'Turn off depth test', 'No depth testing',
  'Enable proper depth', 'Show entities behind terrain',
];

function generateEnableDepthTest(): Example {
  const template = randomChoice(ENABLE_DEPTH_TEST_TEMPLATES);
  const enabled = !template.toLowerCase().includes('disable') && !template.toLowerCase().includes('off') && !template.toLowerCase().includes('no ');
  const instruction = applyVariedPhrasing(template);
  return { instruction, output: JSON.stringify({ tool: 'enableDepthTest', arguments: { enabled } }) };
}

const SET_SKYBOX_TEMPLATES = [
  'Change the skybox', 'Set skybox', 'Use custom skybox', 'Update skybox',
  'Change sky background', 'Set sky image', 'Modify skybox',
];

function generateSetSkybox(): Example {
  const instruction = applyVariedPhrasing(randomChoice(SET_SKYBOX_TEMPLATES));
  return { instruction, output: JSON.stringify({ tool: 'setSkybox', arguments: { show: true } }) };
}

const ENABLE_FXAA_TEMPLATES = [
  'Enable antialiasing', 'Turn on FXAA', 'Enable FXAA', 'Smooth edges',
  'Disable antialiasing', 'Turn off FXAA', 'Disable FXAA', 'No antialiasing',
];

function generateEnableFXAA(): Example {
  const template = randomChoice(ENABLE_FXAA_TEMPLATES);
  const enabled = !template.toLowerCase().includes('disable') && !template.toLowerCase().includes('off') && !template.toLowerCase().includes('no ');
  const instruction = applyVariedPhrasing(template);
  return { instruction, output: JSON.stringify({ tool: 'enableFXAA', arguments: { enabled } }) };
}

const SET_BLOOM_TEMPLATES = [
  'Enable bloom', 'Turn on bloom effect', 'Add bloom', 'Show bloom',
  'Disable bloom', 'Turn off bloom', 'Remove bloom', 'No bloom',
  'Enable glow effect', 'Add glow', 'Set bloom intensity to {value}',
];

function generateSetBloom(): Example {
  const template = randomChoice(SET_BLOOM_TEMPLATES);
  const enabled = !template.toLowerCase().includes('disable') && !template.toLowerCase().includes('off') && !template.toLowerCase().includes('no ') && !template.toLowerCase().includes('remove');
  const instruction = applyVariedPhrasing(template.replace('{value}', randomChoice([0.5, 1.0, 1.5, 2.0]).toString()));
  return { instruction, output: JSON.stringify({ tool: 'setBloom', arguments: { enabled, brightness: enabled ? 1.0 : 0 } }) };
}

// ============================================================================
// TIME AND ANIMATION
// ============================================================================

const PLAY_ANIMATION_TEMPLATES = [
  'Play animation', 'Start animation', 'Play', 'Start time', 'Animate',
  'Begin animation', 'Start the simulation', 'Play the timeline', 'Unpause', 'Resume',
];

function generatePlayAnimation(): Example {
  const instruction = applyVariedPhrasing(randomChoice(PLAY_ANIMATION_TEMPLATES));
  return { instruction, output: JSON.stringify({ tool: 'playAnimation', arguments: {} }) };
}

const PAUSE_ANIMATION_TEMPLATES = [
  'Pause animation', 'Stop animation', 'Pause', 'Stop time', 'Freeze',
  'Pause the simulation', 'Stop the timeline', 'Hold', 'Pause here',
];

function generatePauseAnimation(): Example {
  const instruction = applyVariedPhrasing(randomChoice(PAUSE_ANIMATION_TEMPLATES));
  return { instruction, output: JSON.stringify({ tool: 'pauseAnimation', arguments: {} }) };
}

const SET_TIME_TEMPLATES = [
  'Set time to {time}', 'Go to {time}', 'Jump to {time}', 'Set date to {time}',
  'Change time to {time}', 'Move to {time}', 'Set clock to {time}',
];

function generateSetTime(): Example {
  const times = ['2024-01-01T00:00:00Z', '2024-06-15T12:00:00Z', '2024-12-25T00:00:00Z', '2023-07-04T18:00:00Z'];
  const time = randomChoice(times);
  const template = randomChoice(SET_TIME_TEMPLATES);
  const instruction = applyVariedPhrasing(template.replace('{time}', time));
  return { instruction, output: JSON.stringify({ tool: 'setTime', arguments: { time } }) };
}

const SET_ANIMATION_SPEED_TEMPLATES = [
  'Set speed to {speed}x', 'Change animation speed to {speed}',
  'Speed up to {speed}x', 'Slow down to {speed}x', 'Set playback speed to {speed}',
  'Make it {speed} times faster', 'Run at {speed}x speed',
];

function generateSetAnimationSpeed(): Example {
  const speed = randomChoice(SPEEDS);
  const template = randomChoice(SET_ANIMATION_SPEED_TEMPLATES);
  const instruction = applyVariedPhrasing(template.replace('{speed}', speed.toString()));
  return { instruction, output: JSON.stringify({ tool: 'setAnimationSpeed', arguments: { multiplier: speed } }) };
}

// ============================================================================
// DATA LOADING
// ============================================================================

const LOAD_GEOJSON_TEMPLATES = [
  'Load GeoJSON from {url}', 'Import GeoJSON {url}', 'Open GeoJSON file {url}',
  'Load the GeoJSON {url}', 'Import GeoJSON data from {url}', 'Fetch GeoJSON from {url}',
  'Add GeoJSON from {url}', 'Load geo data from {url}',
];

function generateLoadGeoJSON(): Example {
  const url = randomChoice(SAMPLE_URLS.geojson);
  const template = randomChoice(LOAD_GEOJSON_TEMPLATES);
  const instruction = applyVariedPhrasing(template.replace('{url}', url));
  return { instruction, output: JSON.stringify({ tool: 'loadGeoJSON', arguments: { url } }) };
}

const LOAD_KML_TEMPLATES = [
  'Load KML from {url}', 'Import KML {url}', 'Open KML file {url}',
  'Load the KML {url}', 'Import KML data from {url}', 'Open KMZ {url}',
  'Load KMZ file {url}', 'Add KML from {url}',
];

function generateLoadKML(): Example {
  const url = randomChoice(SAMPLE_URLS.kml);
  const template = randomChoice(LOAD_KML_TEMPLATES);
  const instruction = applyVariedPhrasing(template.replace('{url}', url));
  return { instruction, output: JSON.stringify({ tool: 'loadKML', arguments: { url } }) };
}

const LOAD_CZML_TEMPLATES = [
  'Load CZML from {url}', 'Import CZML data {url}', 'Open CZML file {url}',
  'Load the CZML {url}', 'Import CZML from {url}', 'Add CZML from {url}',
  'Load animation data from {url}', 'Import time-dynamic data {url}',
];

function generateLoadCZML(): Example {
  const url = randomChoice(SAMPLE_URLS.czml);
  const template = randomChoice(LOAD_CZML_TEMPLATES);
  const instruction = applyVariedPhrasing(template.replace('{url}', url));
  return { instruction, output: JSON.stringify({ tool: 'loadCZML', arguments: { url } }) };
}

const LOAD_GPX_TEMPLATES = [
  'Load GPX from {url}', 'Import GPX {url}', 'Open GPX file {url}',
  'Load the GPX track {url}', 'Import GPS data from {url}', 'Add GPX from {url}',
];

function generateLoadGPX(): Example {
  const url = randomChoice(SAMPLE_URLS.gpx);
  const template = randomChoice(LOAD_GPX_TEMPLATES);
  const instruction = applyVariedPhrasing(template.replace('{url}', url));
  return { instruction, output: JSON.stringify({ tool: 'loadGPX', arguments: { url } }) };
}

const ADD_WMS_TEMPLATES = [
  'Add WMS layer from {url}', 'Load WMS from {url}', 'Import WMS {url}',
  'Add web map service from {url}', 'Load WMS layer {url}',
];

function generateAddWMS(): Example {
  const url = randomChoice(SAMPLE_URLS.wms);
  const template = randomChoice(ADD_WMS_TEMPLATES);
  const instruction = applyVariedPhrasing(template.replace('{url}', url));
  return { instruction, output: JSON.stringify({ tool: 'addWMS', arguments: { url, layers: 'default' } }) };
}

// ============================================================================
// 3D TILES
// ============================================================================

const LOAD_3DTILES_TEMPLATES = [
  'Load 3D tiles from {url}', 'Import 3D tileset {url}', 'Add 3D tiles {url}',
  'Load tileset from {url}', 'Import building tiles {url}', 'Add 3D buildings from {url}',
];

function generateLoad3DTiles(): Example {
  const url = randomChoice(SAMPLE_URLS.tileset);
  const template = randomChoice(LOAD_3DTILES_TEMPLATES);
  const instruction = applyVariedPhrasing(template.replace('{url}', url));
  return { instruction, output: JSON.stringify({ tool: 'load3DTiles', arguments: { url } }) };
}

const STYLE_3DTILES_TEMPLATES = [
  'Style the 3D tiles', 'Change 3D tiles style', 'Color the buildings',
  'Apply style to tiles', 'Update 3D tiles appearance', 'Set tile colors',
];

function generateStyle3DTiles(): Example {
  const color = randomChoice(COLORS);
  const instruction = applyVariedPhrasing(randomChoice(STYLE_3DTILES_TEMPLATES));
  return { instruction, output: JSON.stringify({ tool: 'style3DTiles', arguments: { tilesetId: 'tileset-1', style: { color } } }) };
}

const REMOVE_3DTILES_TEMPLATES = [
  'Remove 3D tiles', 'Delete the tileset', 'Remove buildings', 'Clear 3D tiles',
];

function generateRemove3DTiles(): Example {
  const instruction = applyVariedPhrasing(randomChoice(REMOVE_3DTILES_TEMPLATES));
  return { instruction, output: JSON.stringify({ tool: 'remove3DTiles', arguments: { tilesetId: 'tileset-1' } }) };
}

const HIGHLIGHT_3DTILE_TEMPLATES = [
  'Highlight building', 'Select that building', 'Highlight the tile',
  'Mark that building', 'Highlight 3D tile', 'Show selected tile',
];

function generateHighlight3DTile(): Example {
  const color = randomChoice(COLORS);
  const instruction = applyVariedPhrasing(randomChoice(HIGHLIGHT_3DTILE_TEMPLATES));
  return { instruction, output: JSON.stringify({ tool: 'highlight3DTile', arguments: { tilesetId: 'tileset-1', featureId: 'building-1', color } }) };
}

const CLIP_3DTILES_TEMPLATES = [
  'Clip 3D tiles at {location}', 'Cut the buildings at {location}',
  'Add clipping plane to tiles', 'Slice 3D tiles', 'Section the buildings',
];

function generateClip3DTiles(): Example {
  const loc = randomChoice(ALL_LOCATIONS);
  const template = randomChoice(CLIP_3DTILES_TEMPLATES);
  const instruction = applyVariedPhrasing(template.replace('{location}', getLocationName(loc)));
  return {
    instruction,
    output: JSON.stringify({ tool: 'clip3DTiles', arguments: { tilesetId: 'tileset-1', longitude: loc.longitude, latitude: loc.latitude, height: 100, heading: 0, pitch: 0 } })
  };
}

// ============================================================================
// TERRAIN
// ============================================================================

const SET_TERRAIN_EXAGGERATION_TEMPLATES = [
  'Set terrain exaggeration to {value}', 'Exaggerate terrain {value}x',
  'Make mountains {value} times taller', 'Terrain scale {value}',
  'Increase terrain height {value}x', 'Vertical exaggeration {value}',
];

function generateSetTerrainExaggeration(): Example {
  const value = randomChoice(EXAGGERATIONS);
  const template = randomChoice(SET_TERRAIN_EXAGGERATION_TEMPLATES);
  const instruction = applyVariedPhrasing(template.replace('{value}', value.toString()));
  return { instruction, output: JSON.stringify({ tool: 'setTerrainExaggeration', arguments: { exaggeration: value } }) };
}

const SAMPLE_TERRAIN_HEIGHT_TEMPLATES = [
  'Get elevation at {location}', 'What is the height at {location}?',
  'Sample terrain at {location}', 'Terrain height at {location}',
  'Elevation of {location}', 'How high is {location}?',
];

function generateSampleTerrainHeight(): Example {
  const loc = randomChoice(ALL_LOCATIONS);
  const template = randomChoice(SAMPLE_TERRAIN_HEIGHT_TEMPLATES);
  const instruction = applyVariedPhrasing(template.replace('{location}', getLocationName(loc)));
  return { instruction, output: JSON.stringify({ tool: 'sampleTerrainHeight', arguments: { longitude: loc.longitude, latitude: loc.latitude } }) };
}

const CLIP_TERRAIN_TEMPLATES = [
  'Clip terrain at {location}', 'Cut terrain at {location}',
  'Add clipping to terrain', 'Section the terrain', 'Slice terrain',
];

function generateClipTerrain(): Example {
  const loc = randomChoice(ALL_LOCATIONS);
  const template = randomChoice(CLIP_TERRAIN_TEMPLATES);
  const instruction = applyVariedPhrasing(template.replace('{location}', getLocationName(loc)));
  return {
    instruction,
    output: JSON.stringify({ tool: 'clipTerrain', arguments: { longitude: loc.longitude, latitude: loc.latitude, radius: randomChoice([10000, 50000, 100000]) } })
  };
}

// ============================================================================
// IMAGERY
// ============================================================================

const REMOVE_IMAGERY_TEMPLATES = [
  'Remove imagery layer', 'Delete the imagery', 'Remove map layer',
  'Clear imagery', 'Remove base map', 'Delete imagery layer',
];

function generateRemoveImagery(): Example {
  const instruction = applyVariedPhrasing(randomChoice(REMOVE_IMAGERY_TEMPLATES));
  return { instruction, output: JSON.stringify({ tool: 'removeImagery', arguments: { layerIndex: 0 } }) };
}

const SET_IMAGERY_ALPHA_TEMPLATES = [
  'Set imagery transparency to {value}', 'Make imagery {value} transparent',
  'Set map opacity to {value}', 'Imagery alpha {value}', 'Transparency {value}',
];

function generateSetImageryAlpha(): Example {
  const value = randomChoice(ALPHAS);
  const template = randomChoice(SET_IMAGERY_ALPHA_TEMPLATES);
  const instruction = applyVariedPhrasing(template.replace('{value}', value.toString()));
  return { instruction, output: JSON.stringify({ tool: 'setImageryAlpha', arguments: { layerIndex: 0, alpha: value } }) };
}

const SET_IMAGERY_BRIGHTNESS_TEMPLATES = [
  'Set imagery brightness to {value}', 'Make map brighter',
  'Set map brightness {value}', 'Imagery brightness {value}', 'Brighten the map',
  'Make imagery darker', 'Dim the map',
];

function generateSetImageryBrightness(): Example {
  const value = randomChoice(BRIGHTNESSES);
  const template = randomChoice(SET_IMAGERY_BRIGHTNESS_TEMPLATES);
  const instruction = applyVariedPhrasing(template.replace('{value}', value.toString()));
  return { instruction, output: JSON.stringify({ tool: 'setImageryBrightness', arguments: { layerIndex: 0, brightness: value } }) };
}

const SPLIT_IMAGERY_TEMPLATES = [
  'Split imagery view', 'Compare imagery layers', 'Side by side comparison',
  'Split screen imagery', 'Compare maps', 'Show split view',
];

function generateSplitImagery(): Example {
  const instruction = applyVariedPhrasing(randomChoice(SPLIT_IMAGERY_TEMPLATES));
  return { instruction, output: JSON.stringify({ tool: 'splitImagery', arguments: { enabled: true, position: 0.5 } }) };
}

// ============================================================================
// EFFECTS AND PARTICLES
// ============================================================================

const ADD_PARTICLE_SYSTEM_TEMPLATES = [
  'Add {type} effect at {location}', 'Create {type} at {location}',
  'Put {type} at {location}', 'Show {type} effect at {location}',
  'Add a {type} simulation at {location}', 'Generate {type} at {location}',
];

function generateAddParticleSystem(): Example {
  const loc = randomChoice(ALL_LOCATIONS);
  const particleType = randomChoice(PARTICLE_TYPES);
  const template = randomChoice(ADD_PARTICLE_SYSTEM_TEMPLATES);
  const instruction = applyVariedPhrasing(template.replace('{location}', getLocationName(loc)).replace('{type}', particleType));
  return {
    instruction,
    output: JSON.stringify({ tool: 'addParticleSystem', arguments: { longitude: loc.longitude, latitude: loc.latitude, type: particleType, name: `${loc.name} ${particleType}` } })
  };
}

const ADD_WEATHER_EFFECT_TEMPLATES = [
  'Add {type} at {location}', 'Make it {type} at {location}',
  'Show {type} at {location}', 'Create {type} effect at {location}',
  'Start {type} at {location}', 'Enable {type} effect',
];

function generateAddWeatherEffect(): Example {
  const loc = randomChoice(ALL_LOCATIONS);
  const weatherType = randomChoice(WEATHER_TYPES);
  const template = randomChoice(ADD_WEATHER_EFFECT_TEMPLATES);
  const instruction = applyVariedPhrasing(template.replace('{location}', getLocationName(loc)).replace('{type}', weatherType));
  return {
    instruction,
    output: JSON.stringify({ tool: 'addWeatherEffect', arguments: { type: weatherType, intensity: randomChoice([0.3, 0.5, 0.7, 1.0]) } })
  };
}

const ADD_VOLUMETRIC_CLOUD_TEMPLATES = [
  'Add clouds at {location}', 'Create cloud at {location}',
  'Put a cloud over {location}', 'Show clouds at {location}',
  'Add volumetric cloud at {location}', 'Generate cloud at {location}',
];

function generateAddVolumetricCloud(): Example {
  const loc = randomChoice(ALL_LOCATIONS);
  const template = randomChoice(ADD_VOLUMETRIC_CLOUD_TEMPLATES);
  const instruction = applyVariedPhrasing(template.replace('{location}', getLocationName(loc)));
  return {
    instruction,
    output: JSON.stringify({ tool: 'addVolumetricCloud', arguments: { longitude: loc.longitude, latitude: loc.latitude, height: randomChoice([5000, 10000, 15000]), scale: randomChoice([1, 2, 5]) } })
  };
}

const ADD_LENS_FLARE_TEMPLATES = [
  'Add lens flare', 'Enable sun flare', 'Show lens flare effect',
  'Add sun glare', 'Enable light flare', 'Turn on lens flare',
];

function generateAddLensFlare(): Example {
  const instruction = applyVariedPhrasing(randomChoice(ADD_LENS_FLARE_TEMPLATES));
  return { instruction, output: JSON.stringify({ tool: 'addLensFlare', arguments: { intensity: randomChoice([0.5, 1.0, 1.5, 2.0]) } }) };
}

// ============================================================================
// MATERIALS
// ============================================================================

const SET_IMAGE_MATERIAL_TEMPLATES = [
  'Set image texture for {entity}', 'Apply image to {entity}',
  'Use texture {url} for {entity}', 'Add image material to {entity}',
];

function generateSetImageMaterial(): Example {
  const entityName = randomChoice(ENTITY_NAMES);
  const url = randomChoice(SAMPLE_URLS.image);
  const template = randomChoice(SET_IMAGE_MATERIAL_TEMPLATES);
  const instruction = applyVariedPhrasing(template.replace('{entity}', entityName).replace('{url}', url));
  return { instruction, output: JSON.stringify({ tool: 'setImageMaterial', arguments: { entityId: entityName, imageUrl: url } }) };
}

const SET_GRID_MATERIAL_TEMPLATES = [
  'Add grid pattern to {entity}', 'Apply grid to {entity}',
  'Use grid texture for {entity}', 'Set grid material on {entity}',
];

function generateSetGridMaterial(): Example {
  const entityName = randomChoice(ENTITY_NAMES);
  const color = randomChoice(COLORS);
  const template = randomChoice(SET_GRID_MATERIAL_TEMPLATES);
  const instruction = applyVariedPhrasing(template.replace('{entity}', entityName));
  return { instruction, output: JSON.stringify({ tool: 'setGridMaterial', arguments: { entityId: entityName, color, cellAlpha: 0.1 } }) };
}

const SET_STRIPE_MATERIAL_TEMPLATES = [
  'Add stripes to {entity}', 'Apply stripe pattern to {entity}',
  'Use stripes for {entity}', 'Set stripe material on {entity}',
];

function generateSetStripeMaterial(): Example {
  const entityName = randomChoice(ENTITY_NAMES);
  const color = randomChoice(COLORS);
  const template = randomChoice(SET_STRIPE_MATERIAL_TEMPLATES);
  const instruction = applyVariedPhrasing(template.replace('{entity}', entityName));
  return { instruction, output: JSON.stringify({ tool: 'setStripeMaterial', arguments: { entityId: entityName, evenColor: color, oddColor: 'white' } }) };
}

const SET_CHECKERBOARD_MATERIAL_TEMPLATES = [
  'Add checkerboard to {entity}', 'Apply checkerboard pattern to {entity}',
  'Use checkerboard for {entity}', 'Set checkerboard material on {entity}',
];

function generateSetCheckerboardMaterial(): Example {
  const entityName = randomChoice(ENTITY_NAMES);
  const color = randomChoice(COLORS);
  const template = randomChoice(SET_CHECKERBOARD_MATERIAL_TEMPLATES);
  const instruction = applyVariedPhrasing(template.replace('{entity}', entityName));
  return { instruction, output: JSON.stringify({ tool: 'setCheckerboardMaterial', arguments: { entityId: entityName, evenColor: color, oddColor: 'white' } }) };
}

// ============================================================================
// PICKING AND MEASUREMENT
// ============================================================================

const MEASURE_DISTANCE_TEMPLATES = [
  'Measure distance from {loc1} to {loc2}', 'How far is {loc1} from {loc2}?',
  'Distance between {loc1} and {loc2}', 'Get distance from {loc1} to {loc2}',
  'Calculate distance {loc1} to {loc2}', 'What is the distance from {loc1} to {loc2}?',
];

function generateMeasureDistance(): Example {
  const locs = shuffle(LOCATIONS).slice(0, 2);
  const template = randomChoice(MEASURE_DISTANCE_TEMPLATES);
  const instruction = applyVariedPhrasing(template.replace('{loc1}', locs[0]!.name).replace('{loc2}', locs[1]!.name));
  return {
    instruction,
    output: JSON.stringify({
      tool: 'measureDistance',
      arguments: {
        positions: [{ longitude: locs[0]!.longitude, latitude: locs[0]!.latitude }, { longitude: locs[1]!.longitude, latitude: locs[1]!.latitude }]
      }
    })
  };
}

const GET_SCREEN_POSITION_TEMPLATES = [
  'Get screen position of {location}', 'Where is {location} on screen?',
  'Screen coordinates of {location}', 'Pixel position of {location}',
];

function generateGetScreenPosition(): Example {
  const loc = randomChoice(ALL_LOCATIONS);
  const template = randomChoice(GET_SCREEN_POSITION_TEMPLATES);
  const instruction = applyVariedPhrasing(template.replace('{location}', getLocationName(loc)));
  return { instruction, output: JSON.stringify({ tool: 'getScreenPosition', arguments: { longitude: loc.longitude, latitude: loc.latitude } }) };
}

const GET_CARTOGRAPHIC_TEMPLATES = [
  'Get coordinates at screen position', 'What location is at pixel {x}, {y}?',
  'Convert screen to coordinates', 'Coordinates at screen point',
];

function generateGetCartographic(): Example {
  const x = randomInt(100, 800);
  const y = randomInt(100, 600);
  const template = randomChoice(GET_CARTOGRAPHIC_TEMPLATES);
  const instruction = applyVariedPhrasing(template.replace('{x}', x.toString()).replace('{y}', y.toString()));
  return { instruction, output: JSON.stringify({ tool: 'getCartographic', arguments: { x, y } }) };
}

const PICK_ENTITY_TEMPLATES = [
  'Pick entity at screen position', 'What entity is at pixel {x}, {y}?',
  'Select entity at screen point', 'Get entity at position',
];

function generatePickEntity(): Example {
  const x = randomInt(100, 800);
  const y = randomInt(100, 600);
  const template = randomChoice(PICK_ENTITY_TEMPLATES);
  const instruction = applyVariedPhrasing(template.replace('{x}', x.toString()).replace('{y}', y.toString()));
  return { instruction, output: JSON.stringify({ tool: 'pickEntity', arguments: { x, y } }) };
}

// ============================================================================
// CZML GENERATION
// ============================================================================

const GENERATE_CZML_TEMPLATES = [
  'Generate CZML for satellite orbit', 'Create CZML animation',
  'Make CZML data', 'Generate trajectory CZML', 'Create orbit CZML',
  'Build CZML document', 'Export as CZML',
];

function generateGenerateCZML(): Example {
  const instruction = applyVariedPhrasing(randomChoice(GENERATE_CZML_TEMPLATES));
  return { instruction, output: JSON.stringify({ tool: 'generateCZML', arguments: { type: 'orbit', name: 'Satellite Orbit' } }) };
}

// ============================================================================
// COMPOUND AND CONVERSATIONAL EXAMPLES
// ============================================================================

const COMPOUND_PATTERNS = [
  { pattern: 'Go to {loc1} and add a {color} sphere', tools: ['flyTo', 'addSphere'] },
  { pattern: 'Fly to {loc1} and put a marker there', tools: ['flyTo', 'addPoint'] },
  { pattern: 'Take me to {loc1} and add a label saying {text}', tools: ['flyTo', 'addLabel'] },
  { pattern: 'Navigate to {loc1} then add a {color} point', tools: ['flyTo', 'addPoint'] },
  { pattern: 'Show me {loc1} and create a sphere there', tools: ['flyTo', 'addSphere'] },
  { pattern: 'Go to {loc1}, add a sphere, and zoom in', tools: ['flyTo', 'addSphere', 'zoom'] },
  { pattern: 'Fly to {loc1} and draw a circle around it', tools: ['flyTo', 'addCircle'] },
  { pattern: 'Add a sphere to {loc1} and zoom to it', tools: ['addSphere', 'flyToEntity'] },
  { pattern: 'Create a marker at {loc1} then fly to it', tools: ['addPoint', 'flyToEntity'] },
  { pattern: 'Add spheres to {loc1} and {loc2}', tools: ['addSphere', 'addSphere'] },
  { pattern: 'Put markers at {loc1} and {loc2}', tools: ['addPoint', 'addPoint'] },
  { pattern: 'Draw a line from {loc1} to {loc2} and add a label', tools: ['addPolyline', 'addLabel'] },
  { pattern: "I want to see {loc1} with a {color} sphere on it", tools: ['flyTo', 'addSphere'] },
  { pattern: 'Can you put a ball at {loc1} and fly there?', tools: ['addSphere', 'flyTo'] },
  { pattern: 'Mark {loc1} with a sphere and {loc2} with a point', tools: ['addSphere', 'addPoint'] },
  { pattern: 'Show me {loc1} and enable fog', tools: ['flyTo', 'setFog'] },
  { pattern: 'Go to {loc1} and turn on shadows', tools: ['flyTo', 'setShadows'] },
  { pattern: 'Fly to {loc1} and switch to 2D mode', tools: ['flyTo', 'setSceneMode'] },
  { pattern: 'Add a sphere at {loc1} and orbit around it', tools: ['addSphere', 'orbitTarget'] },
  { pattern: 'Draw a line from {loc1} to {loc2} and zoom to see it', tools: ['addPolyline', 'zoom'] },
];

function generateCompoundExample(): Example {
  const pattern = randomChoice(COMPOUND_PATTERNS);
  const loc1 = randomChoice(ALL_LOCATIONS);
  const loc2 = randomChoice(ALL_LOCATIONS);
  const color = randomChoice(COLORS);
  const text = randomChoice(LABEL_TEXTS);

  let instruction = pattern.pattern
    .replace('{loc1}', loc1.name)
    .replace('{loc2}', loc2.name)
    .replace('{color}', color)
    .replace('{text}', text);

  instruction = applyVariedPhrasing(instruction);

  const firstTool = pattern.tools[0];
  let output: object;

  switch (firstTool) {
    case 'flyTo':
      output = { tool: 'flyTo', arguments: { longitude: loc1.longitude, latitude: loc1.latitude, height: loc1.height || 500000 } };
      break;
    case 'addSphere':
      output = { tool: 'addSphere', arguments: { longitude: loc1.longitude, latitude: loc1.latitude, radius: 50000, name: loc1.name, color } };
      break;
    case 'addPoint':
      output = { tool: 'addPoint', arguments: { longitude: loc1.longitude, latitude: loc1.latitude, name: loc1.name, color } };
      break;
    case 'addLabel':
      output = { tool: 'addLabel', arguments: { longitude: loc1.longitude, latitude: loc1.latitude, text, name: loc1.name } };
      break;
    case 'addPolyline':
      output = { tool: 'addPolyline', arguments: { positions: [{ longitude: loc1.longitude, latitude: loc1.latitude }, { longitude: loc2.longitude, latitude: loc2.latitude }], name: `${loc1.name} to ${loc2.name}`, color } };
      break;
    case 'addCircle':
      output = { tool: 'addCircle', arguments: { longitude: loc1.longitude, latitude: loc1.latitude, radius: 100000, name: loc1.name, color } };
      break;
    default:
      output = { tool: 'flyTo', arguments: { longitude: loc1.longitude, latitude: loc1.latitude, height: 500000 } };
  }

  return { instruction, output: JSON.stringify(output) };
}

// Conversational follow-ups
const CONVERSATIONAL_FOLLOWUPS = [
  { instruction: 'Now zoom in', tool: 'zoom', args: { amount: 500000 } },
  { instruction: 'Zoom out a bit', tool: 'zoom', args: { amount: -300000 } },
  { instruction: 'Make it red', tool: 'addSphere', args: { color: 'red' } },
  { instruction: 'Change the color to blue', tool: 'addSphere', args: { color: 'blue' } },
  { instruction: 'Now add a label', tool: 'addLabel', args: { text: 'Here' } },
  { instruction: 'Turn on fog', tool: 'setFog', args: { enabled: true } },
  { instruction: 'Enable shadows', tool: 'setShadows', args: { enabled: true } },
  { instruction: 'Switch to 2D', tool: 'setSceneMode', args: { mode: '2D' } },
  { instruction: 'Go to 3D mode', tool: 'setSceneMode', args: { mode: '3D' } },
  { instruction: 'Clear everything', tool: 'clearAll', args: {} },
  { instruction: 'Remove that', tool: 'removeEntity', args: { entityId: 'last' } },
  { instruction: 'Play the animation', tool: 'playAnimation', args: {} },
  { instruction: 'Pause', tool: 'pauseAnimation', args: {} },
  { instruction: 'Speed up', tool: 'setAnimationSpeed', args: { multiplier: 10 } },
  { instruction: 'Slow down', tool: 'setAnimationSpeed', args: { multiplier: 0.5 } },
  { instruction: 'Where am I?', tool: 'getCamera', args: {} },
  { instruction: 'Turn left', tool: 'rotateCamera', args: { heading: -45 } },
  { instruction: 'Turn right', tool: 'rotateCamera', args: { heading: 45 } },
  { instruction: 'Look up', tool: 'rotateCamera', args: { pitch: 20 } },
  { instruction: 'Look down', tool: 'rotateCamera', args: { pitch: -20 } },
  { instruction: 'Orbit around it', tool: 'orbitTarget', args: { radius: 500000, duration: 60 } },
  { instruction: 'Stop orbiting', tool: 'stopOrbit', args: {} },
  { instruction: 'Follow that', tool: 'trackEntity', args: { entityId: 'target' } },
  { instruction: 'Stop following', tool: 'stopTracking', args: {} },
  { instruction: 'Make it bigger', tool: 'addSphere', args: { radius: 100000 } },
  { instruction: 'Make it smaller', tool: 'addSphere', args: { radius: 10000 } },
  { instruction: 'Show me all entities', tool: 'listEntities', args: {} },
  { instruction: 'Hide it', tool: 'hideEntity', args: { entityId: 'last' } },
  { instruction: 'Show it again', tool: 'showEntity', args: { entityId: 'last' } },
];

function generateConversationalFollowup(): Example {
  const followup = randomChoice(CONVERSATIONAL_FOLLOWUPS);
  return {
    instruction: applyVariedPhrasing(followup.instruction),
    output: JSON.stringify({ tool: followup.tool, arguments: followup.args })
  };
}

// Coordinate-based examples
function generateCoordinateExample(): Example {
  const lat = Math.round((Math.random() * 180 - 90) * 1000) / 1000;
  const lon = Math.round((Math.random() * 360 - 180) * 1000) / 1000;

  const templates = [
    `Go to coordinates ${lat}, ${lon}`,
    `Fly to ${lat}, ${lon}`,
    `Navigate to latitude ${lat}, longitude ${lon}`,
    `Show me location ${lat}, ${lon}`,
    `Take me to ${lat}, ${lon}`,
    `Set view to ${lat}N, ${lon}E`,
    `Jump to coordinates ${lat}, ${lon}`,
  ];

  const instruction = applyVariedPhrasing(randomChoice(templates));
  return {
    instruction,
    output: JSON.stringify({ tool: 'flyTo', arguments: { longitude: lon, latitude: lat, height: 500000 } })
  };
}

// Cesium documentation-based examples using proper API terminology
function generateCesiumDocExample(): Example {
  const loc = randomChoice(ALL_LOCATIONS);
  const heading = randomInt(0, 360);
  const pitch = randomInt(-90, 0);
  const roll = randomInt(-10, 10);
  const range = randomChoice([1000, 10000, 100000, 500000, 1000000]);
  const color = randomChoice(COLORS);
  const unit = randomChoice(CESIUM_UNITS);
  const entityName = randomChoice(ENTITY_NAMES);
  const cameraTerm = randomChoice(CESIUM_CAMERA_TERMS);
  const posTerm = randomChoice(CESIUM_POSITION_TERMS);
  const sceneTerm = randomChoice(CESIUM_SCENE_TERMS);
  const entityTerm = randomChoice(CESIUM_ENTITY_TERMS);
  const renderTerm = randomChoice(CESIUM_RENDER_TERMS);

  const cesiumDocTemplates = [
    // Camera with heading/pitch/roll (from Camera docs)
    { instruction: `Set camera heading to ${heading} degrees`, tool: 'setView', args: { longitude: loc.longitude, latitude: loc.latitude, height: 500000, heading } },
    { instruction: `Set camera pitch to ${pitch} degrees`, tool: 'setView', args: { longitude: loc.longitude, latitude: loc.latitude, height: 500000, pitch } },
    { instruction: `Set camera orientation with heading ${heading}° and pitch ${pitch}°`, tool: 'setView', args: { longitude: loc.longitude, latitude: loc.latitude, height: 500000, heading, pitch } },
    { instruction: `Set camera heading ${heading}, pitch ${pitch}, roll ${roll} at ${loc.name}`, tool: 'setView', args: { longitude: loc.longitude, latitude: loc.latitude, height: 500000, heading, pitch, roll } },
    { instruction: `Orient camera to heading ${heading} degrees, pitch ${pitch} degrees`, tool: 'rotateCamera', args: { heading, pitch } },
    { instruction: `Look down at ${pitch} degree pitch angle`, tool: 'rotateCamera', args: { pitch } },
    { instruction: `Face heading ${heading} degrees`, tool: 'rotateCamera', args: { heading } },
    { instruction: `Set camera ${cameraTerm} at ${loc.name}`, tool: 'setView', args: { longitude: loc.longitude, latitude: loc.latitude, height: 500000 } },
    // Cartographic/Cartesian position terminology
    { instruction: `Fly to Cartographic position longitude ${loc.longitude}, latitude ${loc.latitude}`, tool: 'flyTo', args: { longitude: loc.longitude, latitude: loc.latitude, height: 500000 } },
    { instruction: `Set camera position to ${loc.latitude}° latitude, ${loc.longitude}° longitude`, tool: 'setView', args: { longitude: loc.longitude, latitude: loc.latitude, height: 500000 } },
    { instruction: `Move camera to WGS84 coordinates ${loc.latitude}, ${loc.longitude}`, tool: 'flyTo', args: { longitude: loc.longitude, latitude: loc.latitude, height: 500000 } },
    { instruction: `Navigate to geodetic coordinates lat ${loc.latitude}, lon ${loc.longitude}`, tool: 'flyTo', args: { longitude: loc.longitude, latitude: loc.latitude, height: 500000 } },
    { instruction: `Set position using ${posTerm} at ${loc.name}`, tool: 'flyTo', args: { longitude: loc.longitude, latitude: loc.latitude, height: 500000 } },
    { instruction: `Convert ${posTerm} to view ${loc.name}`, tool: 'flyTo', args: { longitude: loc.longitude, latitude: loc.latitude, height: 500000 } },
    // HeadingPitchRange from lookAt docs
    { instruction: `Look at ${loc.name} from ${range} ${unit} range with heading ${heading}`, tool: 'lookAt', args: { longitude: loc.longitude, latitude: loc.latitude, height: 0, range } },
    { instruction: `View ${loc.name} using HeadingPitchRange of ${heading}, ${pitch}, ${range}`, tool: 'lookAt', args: { longitude: loc.longitude, latitude: loc.latitude, height: 0, range } },
    // Scene mode terminology
    { instruction: `Morph scene to 2D mode`, tool: 'setSceneMode', args: { mode: '2D' } },
    { instruction: `Morph scene to 3D globe`, tool: 'setSceneMode', args: { mode: '3D' } },
    { instruction: `Switch to Columbus view projection`, tool: 'setSceneMode', args: { mode: 'COLUMBUS_VIEW' } },
    { instruction: `Change ${sceneTerm} mode`, tool: 'setSceneMode', args: { mode: '3D' } },
    // Entity/DataSource terminology
    { instruction: `Add ${entityTerm} at Cartographic position ${loc.latitude}, ${loc.longitude}`, tool: 'addPoint', args: { longitude: loc.longitude, latitude: loc.latitude, name: loc.name, color } },
    { instruction: `Create point ${entityTerm} at ${loc.name}`, tool: 'addPoint', args: { longitude: loc.longitude, latitude: loc.latitude, name: loc.name, color } },
    { instruction: `Add billboard ${entityTerm} at ${loc.name}`, tool: 'addBillboard', args: { longitude: loc.longitude, latitude: loc.latitude, image: '/assets/marker.png', name: loc.name } },
    // Ellipsoid/Radii terminology from geometry docs
    { instruction: `Create ellipsoid with semi-axes ${randomChoice(RADII)}km, ${randomChoice(RADII)}km, ${randomChoice(RADII)}km`, tool: 'addEllipsoid', args: { longitude: loc.longitude, latitude: loc.latitude, radii: { x: 50000, y: 75000, z: 30000 }, name: loc.name, color } },
    { instruction: `Add sphere with radius ${randomChoice(RADII)} kilometers at ${loc.name}`, tool: 'addSphere', args: { longitude: loc.longitude, latitude: loc.latitude, radius: 50000, name: loc.name, color } },
    // Post-process/render terminology
    { instruction: `Enable FXAA anti-aliasing`, tool: 'enableFXAA', args: { enabled: true } },
    { instruction: `Enable bloom post-process effect`, tool: 'setBloom', args: { enabled: true, brightness: 1.0 } },
    { instruction: `Enable scene fog effect`, tool: 'setFog', args: { enabled: true, density: 0.0002 } },
    { instruction: `Enable sun shadows`, tool: 'setShadows', args: { enabled: true } },
    { instruction: `Enable globe atmosphere rendering`, tool: 'setAtmosphere', args: { enabled: true } },
    { instruction: `Enable ${renderTerm} effect`, tool: 'setBloom', args: { enabled: true, brightness: 1.0 } },
    // Terrain/Globe terminology
    { instruction: `Set terrain vertical exaggeration to ${randomChoice(EXAGGERATIONS)}`, tool: 'setTerrainExaggeration', args: { exaggeration: 2 } },
    { instruction: `Sample terrain height at ${loc.name}`, tool: 'sampleTerrainHeight', args: { longitude: loc.longitude, latitude: loc.latitude } },
    { instruction: `Show the globe`, tool: 'setGlobe', args: { show: true } },
    { instruction: `Enable globe depth testing`, tool: 'enableDepthTest', args: { enabled: true } },
    // Imagery layer terminology
    { instruction: `Set imagery layer alpha to ${randomChoice(ALPHAS)}`, tool: 'setImageryAlpha', args: { layerIndex: 0, alpha: 0.5 } },
    { instruction: `Set imagery layer brightness to ${randomChoice(BRIGHTNESSES)}`, tool: 'setImageryBrightness', args: { layerIndex: 0, brightness: 1.2 } },
    { instruction: `Remove imagery layer at index 0`, tool: 'removeImagery', args: { layerIndex: 0 } },
    // Clock/time terminology
    { instruction: `Set clock multiplier to ${randomChoice(SPEEDS)}`, tool: 'setAnimationSpeed', args: { multiplier: 10 } },
    { instruction: `Start clock animation`, tool: 'playAnimation', args: {} },
    { instruction: `Pause clock animation`, tool: 'pauseAnimation', args: {} },
    { instruction: `Set simulation time to 2024-06-15T12:00:00Z`, tool: 'setTime', args: { time: '2024-06-15T12:00:00Z' } },
    // DataSource terminology
    { instruction: `Load CZML data source from URL`, tool: 'loadCZML', args: { url: 'https://example.com/data.czml' } },
    { instruction: `Load GeoJSON data source`, tool: 'loadGeoJSON', args: { url: 'https://example.com/data.geojson' } },
    { instruction: `Load KML data source`, tool: 'loadKML', args: { url: 'https://example.com/data.kml' } },
    // 3D Tiles terminology
    { instruction: `Load 3D Tiles tileset`, tool: 'load3DTiles', args: { url: 'https://example.com/tileset.json' } },
    { instruction: `Apply style to 3D Tiles`, tool: 'style3DTiles', args: { tilesetId: 'tileset-1', style: { color } } },
    // Entity tracking
    { instruction: `Track entity ${entityName}`, tool: 'trackEntity', args: { entityId: entityName } },
    { instruction: `Fly to entity ${entityName}`, tool: 'flyToEntity', args: { entityId: entityName, duration: 3 } },
  ];

  const example = randomChoice(cesiumDocTemplates);
  return {
    instruction: applyVariedPhrasing(example.instruction),
    output: JSON.stringify({ tool: example.tool, arguments: example.args })
  };
}

// Astrodynamics-specific examples
function generateAstrodynamicsExample(): Example {
  const satelliteName = randomChoice(ENTITY_NAMES);
  const direction = randomChoice(ASTRO_DIRECTIONS);
  const frame = randomChoice(REFERENCE_FRAMES);
  const maneuver = randomChoice(MANEUVER_TYPES);
  const orbitalTerm = randomChoice(ORBITAL_TERMS);
  const radius = randomChoice(RADII);
  const color = randomChoice(COLORS);
  const loc = randomChoice(ALL_LOCATIONS);

  const astrodynamicsTemplates = [
    // Ellipsoid with RIC/astrodynamics terminology
    {
      instruction: `Add a covariance ellipsoid with ${radius}km radial, ${radius * 2}km in-track, and ${Math.floor(radius / 2)}km cross-track uncertainty for ${satelliteName}`,
      tool: 'addEllipsoid',
      args: { longitude: loc.longitude, latitude: loc.latitude, radii: { x: radius * 1000, y: radius * 2000, z: radius * 500 }, name: `${satelliteName} Covariance`, color }
    },
    {
      instruction: `Create an uncertainty ellipsoid ${radius}km ${direction} by ${radius * 1.5}km along-track at ${satelliteName}'s position`,
      tool: 'addEllipsoid',
      args: { longitude: loc.longitude, latitude: loc.latitude, radii: { x: radius * 1000, y: radius * 1500, z: radius * 800 }, name: `${satelliteName} Uncertainty`, color }
    },
    {
      instruction: `Show ${satelliteName}'s position uncertainty: ${radius}km R, ${radius * 2}km I, ${Math.floor(radius / 2)}km C`,
      tool: 'addEllipsoid',
      args: { longitude: loc.longitude, latitude: loc.latitude, radii: { x: radius * 1000, y: radius * 2000, z: radius * 500 }, name: `${satelliteName} RIC Uncertainty`, color }
    },
    {
      instruction: `Visualize 3-sigma covariance for ${satelliteName} in the ${frame} frame`,
      tool: 'addEllipsoid',
      args: { longitude: loc.longitude, latitude: loc.latitude, radii: { x: radius * 1000, y: radius * 1500, z: radius * 600 }, name: `${satelliteName} 3-sigma`, color }
    },
    // Spheres for conjunction/proximity
    {
      instruction: `Add a ${radius}km hard-body radius sphere for ${satelliteName}`,
      tool: 'addSphere',
      args: { longitude: loc.longitude, latitude: loc.latitude, radius: radius * 1000, name: `${satelliteName} HBR`, color }
    },
    {
      instruction: `Create a ${radius}km screening volume around ${satelliteName}`,
      tool: 'addSphere',
      args: { longitude: loc.longitude, latitude: loc.latitude, radius: radius * 1000, name: `${satelliteName} Screen`, color }
    },
    {
      instruction: `Show ${radius}km keep-out zone for conjunction with ${satelliteName}`,
      tool: 'addSphere',
      args: { longitude: loc.longitude, latitude: loc.latitude, radius: radius * 1000, name: `${satelliteName} Keep-out`, color: 'red' }
    },
    {
      instruction: `Add proximity operations sphere ${radius}km around ${satelliteName}`,
      tool: 'addSphere',
      args: { longitude: loc.longitude, latitude: loc.latitude, radius: radius * 1000, name: `${satelliteName} Prox Ops`, color }
    },
    // Tracking with orbital terminology
    {
      instruction: `Track ${satelliteName} through ${orbitalTerm}`,
      tool: 'trackEntity',
      args: { entityId: satelliteName }
    },
    {
      instruction: `Follow ${satelliteName} during the ${maneuver}`,
      tool: 'trackEntity',
      args: { entityId: satelliteName }
    },
    {
      instruction: `Monitor ${satelliteName}'s ${direction} motion`,
      tool: 'trackEntity',
      args: { entityId: satelliteName }
    },
    // FlyTo with orbital context
    {
      instruction: `Fly to ${satelliteName}'s current position in ${frame}`,
      tool: 'flyToEntity',
      args: { entityId: satelliteName, duration: 3 }
    },
    {
      instruction: `View ${satelliteName} at ${orbitalTerm}`,
      tool: 'flyToEntity',
      args: { entityId: satelliteName, duration: 3 }
    },
    {
      instruction: `Go to ${satelliteName}'s ${direction} position`,
      tool: 'flyToEntity',
      args: { entityId: satelliteName, duration: 3 }
    },
    // Orbit with astrodynamics terms
    {
      instruction: `Orbit around ${satelliteName} in the ${direction} direction`,
      tool: 'orbitTarget',
      args: { longitude: loc.longitude, latitude: loc.latitude, height: 0, radius: 500000, duration: 60 }
    },
    {
      instruction: `Circle ${satelliteName} viewing from ${direction}`,
      tool: 'orbitTarget',
      args: { longitude: loc.longitude, latitude: loc.latitude, height: 0, radius: 500000, duration: 60 }
    },
    // Polyline for trajectories
    {
      instruction: `Draw ${satelliteName}'s ${direction} velocity vector`,
      tool: 'addArrowPolyline',
      args: { positions: [{ longitude: loc.longitude, latitude: loc.latitude }, { longitude: loc.longitude + 0.5, latitude: loc.latitude }], name: `${satelliteName} ${direction} Vector`, color }
    },
    {
      instruction: `Show the ${maneuver} trajectory`,
      tool: 'addPolyline',
      args: { positions: [{ longitude: loc.longitude, latitude: loc.latitude }, { longitude: loc.longitude + 1, latitude: loc.latitude + 0.5 }], name: maneuver, color }
    },
  ];

  const example = randomChoice(astrodynamicsTemplates);
  return {
    instruction: applyVariedPhrasing(example.instruction),
    output: JSON.stringify({ tool: example.tool, arguments: example.args })
  };
}

// ============================================================================
// MAIN GENERATOR
// ============================================================================

interface Generator {
  fn: () => Example;
  weight: number;
}

function generateTrainingData(count: number): Example[] {
  const examples: Example[] = [];

  // All generators with balanced weights - boosted weights for underrepresented tools
  const generators: Generator[] = [
    // Camera controls
    { fn: generateFlyTo, weight: 10 },
    { fn: generateSetView, weight: 5 },
    { fn: generateLookAt, weight: 4 },
    { fn: generateZoom, weight: 6 },  // boosted
    { fn: generateRotateCamera, weight: 5 },
    { fn: generateGetCamera, weight: 6 },  // boosted
    { fn: generateFlyToEntity, weight: 5 },
    { fn: generateTrackEntity, weight: 4 },
    { fn: generateStopTracking, weight: 4 },  // boosted
    { fn: generateOrbitTarget, weight: 4 },
    { fn: generateStopOrbit, weight: 4 },  // boosted

    // Basic entities
    { fn: generateAddPoint, weight: 5 },
    { fn: generateAddLabel, weight: 5 },
    { fn: generateAddPolyline, weight: 5 },
    { fn: generateAddPolygon, weight: 4 },
    { fn: generateAddCircle, weight: 5 },

    // 3D shapes
    { fn: generateAddSphere, weight: 6 },
    { fn: generateAddBox, weight: 4 },
    { fn: generateAddCylinder, weight: 4 },
    { fn: generateAddEllipsoid, weight: 3 },
    { fn: generateAddCorridor, weight: 3 },
    { fn: generateAddWall, weight: 3 },
    { fn: generateAddRectangle, weight: 3 },

    // Polyline variants
    { fn: generateAddGlowingPolyline, weight: 3 },
    { fn: generateAddDashedPolyline, weight: 3 },
    { fn: generateAddArrowPolyline, weight: 3 },
    { fn: generateAddOutlinedPolyline, weight: 3 },

    // Billboard and Model
    { fn: generateAddBillboard, weight: 3 },
    { fn: generateAddModel, weight: 3 },

    // Entity management - boosted
    { fn: generateRemoveEntity, weight: 4 },
    { fn: generateClearAll, weight: 5 },  // boosted
    { fn: generateSelectEntity, weight: 4 },
    { fn: generateListEntities, weight: 5 },  // boosted
    { fn: generateGetEntityInfo, weight: 4 },
    { fn: generateShowEntity, weight: 3 },
    { fn: generateHideEntity, weight: 3 },

    // Scene and display - boosted underrepresented
    { fn: generateSetSceneMode, weight: 6 },  // boosted
    { fn: generateSetFog, weight: 5 },  // boosted
    { fn: generateSetShadows, weight: 5 },  // boosted
    { fn: generateSetLighting, weight: 5 },  // boosted
    { fn: generateSetAtmosphere, weight: 5 },  // boosted
    { fn: generateSetGlobe, weight: 5 },  // boosted
    { fn: generateEnableDepthTest, weight: 4 },  // boosted
    { fn: generateSetSkybox, weight: 4 },  // boosted
    { fn: generateEnableFXAA, weight: 4 },  // boosted
    { fn: generateSetBloom, weight: 5 },  // boosted

    // Time and animation - boosted
    { fn: generatePlayAnimation, weight: 5 },  // boosted
    { fn: generatePauseAnimation, weight: 5 },  // boosted
    { fn: generateSetTime, weight: 6 },  // boosted
    { fn: generateSetAnimationSpeed, weight: 4 },

    // Data loading - boosted
    { fn: generateLoadGeoJSON, weight: 4 },
    { fn: generateLoadKML, weight: 4 },
    { fn: generateLoadCZML, weight: 4 },
    { fn: generateLoadGPX, weight: 6 },  // boosted
    { fn: generateAddWMS, weight: 5 },  // boosted

    // 3D Tiles - boosted
    { fn: generateLoad3DTiles, weight: 5 },  // boosted
    { fn: generateStyle3DTiles, weight: 4 },  // boosted
    { fn: generateRemove3DTiles, weight: 4 },  // boosted
    { fn: generateHighlight3DTile, weight: 4 },  // boosted
    { fn: generateClip3DTiles, weight: 3 },

    // Terrain
    { fn: generateSetTerrainExaggeration, weight: 3 },
    { fn: generateSampleTerrainHeight, weight: 3 },
    { fn: generateClipTerrain, weight: 2 },

    // Imagery - boosted
    { fn: generateRemoveImagery, weight: 4 },  // boosted
    { fn: generateSetImageryAlpha, weight: 5 },  // boosted
    { fn: generateSetImageryBrightness, weight: 5 },  // boosted
    { fn: generateSplitImagery, weight: 4 },  // boosted

    // Effects and particles - boosted
    { fn: generateAddParticleSystem, weight: 3 },
    { fn: generateAddWeatherEffect, weight: 3 },
    { fn: generateAddVolumetricCloud, weight: 3 },
    { fn: generateAddLensFlare, weight: 4 },  // boosted

    // Materials - boosted
    { fn: generateSetImageMaterial, weight: 3 },
    { fn: generateSetGridMaterial, weight: 4 },  // boosted
    { fn: generateSetStripeMaterial, weight: 3 },
    { fn: generateSetCheckerboardMaterial, weight: 3 },

    // Picking and measurement - boosted
    { fn: generateMeasureDistance, weight: 3 },
    { fn: generateGetScreenPosition, weight: 3 },
    { fn: generateGetCartographic, weight: 5 },  // boosted
    { fn: generatePickEntity, weight: 5 },  // boosted

    // CZML generation - boosted
    { fn: generateGenerateCZML, weight: 4 },  // boosted

    // Compound commands
    { fn: generateCompoundExample, weight: 8 },

    // Conversational follow-ups
    { fn: generateConversationalFollowup, weight: 6 },

    // Coordinate examples
    { fn: generateCoordinateExample, weight: 4 },

    // Cesium documentation examples (API terminology, proper method names)
    { fn: generateCesiumDocExample, weight: 12 },

    // Astrodynamics examples (orbital mechanics, RIC frames, covariance)
    { fn: generateAstrodynamicsExample, weight: 10 },
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
    if (i % 10000 === 0) {
      console.log(`Generated ${i} / ${count} examples...`);
    }
  }

  return examples;
}

// ============================================================================
// OUTPUT
// ============================================================================

function main() {
  const targetCount = 180000; // Generate extra for deduplication - target 150k+ unique
  console.log(`Generating ${targetCount} training examples...`);
  console.log('This may take a moment...\n');

  const examples = generateTrainingData(targetCount);

  // Deduplicate
  const seen = new Set<string>();
  const unique = examples.filter(ex => {
    const key = ex.instruction.toLowerCase().trim();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  console.log(`\nGenerated ${unique.length} unique examples`);

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
    } catch { /* ignore */ }
  }

  console.log('\n=== Tool Distribution ===');
  const sortedTools = Object.entries(toolCounts).sort((a, b) => b[1] - a[1]);
  console.log(`Total unique tools: ${sortedTools.length}`);
  console.log('\nTop 20 tools:');
  for (const [tool, count] of sortedTools.slice(0, 20)) {
    const pct = ((count / unique.length) * 100).toFixed(1);
    console.log(`  ${tool}: ${count} (${pct}%)`);
  }

  console.log('\nBottom 10 tools:');
  for (const [tool, count] of sortedTools.slice(-10)) {
    const pct = ((count / unique.length) * 100).toFixed(1);
    console.log(`  ${tool}: ${count} (${pct}%)`);
  }

  // Warn about tools with very few examples
  const lowCountTools = sortedTools.filter(([, count]) => count < 500);
  if (lowCountTools.length > 0) {
    console.log('\n⚠️  Tools with <500 examples:');
    for (const [tool, count] of lowCountTools) {
      console.log(`  ${tool}: ${count}`);
    }
  }
}

main();
