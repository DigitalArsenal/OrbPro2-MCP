/**
 * CZML Generator - Creates CZML documents from structured commands
 */

import type {
  CZMLDocumentArray,
  CZMLDocument,
  CZMLPacket,
  CZMLColor,
  CZMLMaterial,
  CartographicPosition,
  TLEData,
} from './types';

let entityCounter = 0;

function generateId(prefix: string = 'entity'): string {
  return `${prefix}_${++entityCounter}_${Date.now()}`;
}

export function createCZMLDocument(
  name: string = 'Generated CZML',
  options?: {
    startTime?: string;
    stopTime?: string;
    currentTime?: string;
    multiplier?: number;
  }
): CZMLDocument {
  const doc: CZMLDocument = {
    id: 'document',
    name,
    version: '1.0',
  };

  if (options?.startTime || options?.stopTime) {
    doc.clock = {
      interval: `${options.startTime || ''}/${options.stopTime || ''}`,
      currentTime: options.currentTime,
      multiplier: options.multiplier || 1,
      range: 'LOOP_STOP',
      step: 'SYSTEM_CLOCK_MULTIPLIER',
    };
  }

  return doc;
}

export function positionToCartographicDegrees(pos: CartographicPosition): number[] {
  return [pos.longitude, pos.latitude, pos.height || 0];
}

export function createColor(
  r: number,
  g: number,
  b: number,
  a: number = 255
): CZMLColor {
  return { rgba: [r, g, b, a] };
}

export function createColorFromName(colorName: string): CZMLColor {
  const colors: Record<string, number[]> = {
    red: [255, 0, 0, 255],
    green: [0, 255, 0, 255],
    blue: [0, 0, 255, 255],
    yellow: [255, 255, 0, 255],
    orange: [255, 165, 0, 255],
    purple: [128, 0, 128, 255],
    pink: [255, 192, 203, 255],
    cyan: [0, 255, 255, 255],
    white: [255, 255, 255, 255],
    black: [0, 0, 0, 255],
    gray: [128, 128, 128, 255],
    grey: [128, 128, 128, 255],
  };

  const rgba = colors[colorName.toLowerCase()] || colors['red'];
  return { rgba: rgba as [number, number, number, number] };
}

export function createSolidColorMaterial(color: CZMLColor): CZMLMaterial {
  return { solidColor: { color } };
}

export function createPoint(
  position: CartographicPosition,
  options?: {
    id?: string;
    name?: string;
    color?: string;
    pixelSize?: number;
    outlineColor?: string;
    outlineWidth?: number;
  }
): CZMLPacket {
  return {
    id: options?.id || generateId('point'),
    name: options?.name || 'Point',
    position: {
      cartographicDegrees: positionToCartographicDegrees(position),
    },
    point: {
      color: createColorFromName(options?.color || 'red'),
      pixelSize: options?.pixelSize || 10,
      outlineColor: options?.outlineColor
        ? createColorFromName(options.outlineColor)
        : createColorFromName('white'),
      outlineWidth: options?.outlineWidth || 2,
      show: true,
      heightReference: 'CLAMP_TO_GROUND',
    },
  };
}

export function createLabel(
  position: CartographicPosition,
  text: string,
  options?: {
    id?: string;
    font?: string;
    fillColor?: string;
    scale?: number;
    pixelOffset?: [number, number];
  }
): CZMLPacket {
  return {
    id: options?.id || generateId('label'),
    name: text,
    position: {
      cartographicDegrees: positionToCartographicDegrees(position),
    },
    label: {
      text,
      font: options?.font || '14pt sans-serif',
      fillColor: createColorFromName(options?.fillColor || 'white'),
      scale: options?.scale || 1,
      show: true,
      horizontalOrigin: 'CENTER',
      verticalOrigin: 'BOTTOM',
      pixelOffset: options?.pixelOffset
        ? { cartesian2: options.pixelOffset }
        : { cartesian2: [0, -20] },
    },
  };
}

export function createBillboard(
  position: CartographicPosition,
  imageUrl: string,
  options?: {
    id?: string;
    name?: string;
    scale?: number;
  }
): CZMLPacket {
  return {
    id: options?.id || generateId('billboard'),
    name: options?.name || 'Billboard',
    position: {
      cartographicDegrees: positionToCartographicDegrees(position),
    },
    billboard: {
      image: { uri: imageUrl },
      scale: options?.scale || 1,
      show: true,
      horizontalOrigin: 'CENTER',
      verticalOrigin: 'BOTTOM',
      heightReference: 'CLAMP_TO_GROUND',
    },
  };
}

export function createPolyline(
  positions: CartographicPosition[],
  options?: {
    id?: string;
    name?: string;
    color?: string;
    width?: number;
    clampToGround?: boolean;
  }
): CZMLPacket {
  const coords: number[] = [];
  for (const pos of positions) {
    coords.push(pos.longitude, pos.latitude, pos.height || 0);
  }

  return {
    id: options?.id || generateId('polyline'),
    name: options?.name || 'Polyline',
    polyline: {
      positions: { cartographicDegrees: coords },
      width: options?.width || 3,
      material: createSolidColorMaterial(
        createColorFromName(options?.color || 'blue')
      ),
      clampToGround: options?.clampToGround ?? true,
      show: true,
    },
  };
}

export function createPolygon(
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
): CZMLPacket {
  const coords: number[] = [];
  for (const pos of positions) {
    coords.push(pos.longitude, pos.latitude, pos.height || 0);
  }

  return {
    id: options?.id || generateId('polygon'),
    name: options?.name || 'Polygon',
    polygon: {
      positions: { cartographicDegrees: coords },
      height: options?.height || 0,
      extrudedHeight: options?.extrudedHeight,
      material: createSolidColorMaterial(
        createColorFromName(options?.color || 'blue')
      ),
      outline: options?.outline ?? true,
      outlineColor: createColorFromName(options?.outlineColor || 'white'),
      show: true,
    },
  };
}

export function createEllipse(
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
): CZMLPacket {
  return {
    id: options?.id || generateId('ellipse'),
    name: options?.name || 'Ellipse',
    position: {
      cartographicDegrees: positionToCartographicDegrees(position),
    },
    ellipse: {
      semiMajorAxis,
      semiMinorAxis,
      height: options?.height || 0,
      extrudedHeight: options?.extrudedHeight,
      rotation: options?.rotation || 0,
      material: createSolidColorMaterial(
        createColorFromName(options?.color || 'blue')
      ),
      outline: true,
      outlineColor: createColorFromName('white'),
      show: true,
    },
  };
}

export function createCircle(
  position: CartographicPosition,
  radius: number,
  options?: {
    id?: string;
    name?: string;
    color?: string;
    height?: number;
    extrudedHeight?: number;
  }
): CZMLPacket {
  return createEllipse(position, radius, radius, options);
}

export function createBox(
  position: CartographicPosition,
  dimensions: { x: number; y: number; z: number },
  options?: {
    id?: string;
    name?: string;
    color?: string;
  }
): CZMLPacket {
  return {
    id: options?.id || generateId('box'),
    name: options?.name || 'Box',
    position: {
      cartographicDegrees: positionToCartographicDegrees(position),
    },
    box: {
      dimensions: { cartesian: [dimensions.x, dimensions.y, dimensions.z] },
      material: createSolidColorMaterial(
        createColorFromName(options?.color || 'blue')
      ),
      outline: true,
      outlineColor: createColorFromName('white'),
      show: true,
    },
  };
}

export function createModel(
  position: CartographicPosition,
  gltfUrl: string,
  options?: {
    id?: string;
    name?: string;
    scale?: number;
    minimumPixelSize?: number;
  }
): CZMLPacket {
  return {
    id: options?.id || generateId('model'),
    name: options?.name || 'Model',
    position: {
      cartographicDegrees: positionToCartographicDegrees(position),
    },
    model: {
      gltf: gltfUrl,
      scale: options?.scale || 1,
      minimumPixelSize: options?.minimumPixelSize || 64,
      show: true,
    },
  };
}

export function createPath(
  positions: CartographicPosition[],
  times: string[],
  options?: {
    id?: string;
    name?: string;
    color?: string;
    width?: number;
    leadTime?: number;
    trailTime?: number;
    showPath?: boolean;
  }
): CZMLPacket {
  if (positions.length !== times.length) {
    throw new Error('Positions and times arrays must have the same length');
  }

  const cartographicDegrees: (string | number)[] = [];
  for (let i = 0; i < positions.length; i++) {
    const pos = positions[i]!;
    const time = times[i]!;
    cartographicDegrees.push(time, pos.longitude, pos.latitude, pos.height || 0);
  }

  const packet: CZMLPacket = {
    id: options?.id || generateId('path'),
    name: options?.name || 'Path',
    availability: `${times[0]}/${times[times.length - 1]}`,
    position: {
      epoch: times[0],
      cartographicDegrees,
      interpolationAlgorithm: 'LAGRANGE',
      interpolationDegree: 1,
    },
  };

  if (options?.showPath !== false) {
    packet.path = {
      show: true,
      width: options?.width || 3,
      material: createSolidColorMaterial(
        createColorFromName(options?.color || 'yellow')
      ),
      leadTime: options?.leadTime || 0,
      trailTime: options?.trailTime || 1000000000,
    };
  }

  return packet;
}

export function buildCZMLDocument(
  entities: CZMLPacket[],
  documentOptions?: {
    name?: string;
    startTime?: string;
    stopTime?: string;
    currentTime?: string;
    multiplier?: number;
  }
): CZMLDocumentArray {
  const doc = createCZMLDocument(documentOptions?.name, documentOptions);
  return [doc, ...entities] as CZMLDocumentArray;
}

// ============================================================================
// Advanced Animation Functions
// ============================================================================

/**
 * Simplified orbital elements extracted from TLE
 */
interface OrbitalElements {
  inclination: number;      // degrees
  raan: number;             // Right Ascension of Ascending Node (degrees)
  eccentricity: number;
  argumentOfPerigee: number; // degrees
  meanAnomaly: number;      // degrees
  meanMotion: number;       // revolutions per day
  epoch: Date;
}

/**
 * Parse TLE data to extract orbital elements
 */
function parseTLE(tle: TLEData): OrbitalElements {
  const line1 = tle.line1;
  const line2 = tle.line2;

  // Parse epoch from line 1
  const epochYear = parseInt(line1.substring(18, 20));
  const epochDay = parseFloat(line1.substring(20, 32));
  const fullYear = epochYear < 57 ? 2000 + epochYear : 1900 + epochYear;
  const epochDate = new Date(Date.UTC(fullYear, 0, 1));
  epochDate.setTime(epochDate.getTime() + (epochDay - 1) * 86400000);

  // Parse orbital elements from line 2
  const inclination = parseFloat(line2.substring(8, 16));
  const raan = parseFloat(line2.substring(17, 25));
  const eccentricity = parseFloat('0.' + line2.substring(26, 33));
  const argumentOfPerigee = parseFloat(line2.substring(34, 42));
  const meanAnomaly = parseFloat(line2.substring(43, 51));
  const meanMotion = parseFloat(line2.substring(52, 63));

  return {
    inclination,
    raan,
    eccentricity,
    argumentOfPerigee,
    meanAnomaly,
    meanMotion,
    epoch: epochDate,
  };
}

/**
 * Calculate satellite position at a given time using simplified orbital mechanics
 */
function calculateSatellitePosition(
  elements: OrbitalElements,
  time: Date
): CartographicPosition {
  const EARTH_RADIUS_KM = 6371;
  const MU = 398600.4418; // Earth's gravitational parameter (km^3/s^2)

  // Time since epoch in seconds
  const deltaT = (time.getTime() - elements.epoch.getTime()) / 1000;

  // Calculate semi-major axis from mean motion
  const n = (elements.meanMotion * 2 * Math.PI) / 86400; // rad/s
  const a = Math.pow(MU / (n * n), 1 / 3); // km

  // Mean anomaly at time t
  const M = ((elements.meanAnomaly * Math.PI) / 180 + n * deltaT) % (2 * Math.PI);

  // Solve Kepler's equation for eccentric anomaly (simplified - using mean anomaly approximation)
  let E = M;
  for (let i = 0; i < 10; i++) {
    E = M + elements.eccentricity * Math.sin(E);
  }

  // True anomaly
  const nu = 2 * Math.atan2(
    Math.sqrt(1 + elements.eccentricity) * Math.sin(E / 2),
    Math.sqrt(1 - elements.eccentricity) * Math.cos(E / 2)
  );

  // Distance from Earth's center
  const r = a * (1 - elements.eccentricity * Math.cos(E));

  // Position in orbital plane
  const xOrbital = r * Math.cos(nu);
  const yOrbital = r * Math.sin(nu);

  // Convert orbital elements to radians
  const i = (elements.inclination * Math.PI) / 180;
  const omega = (elements.argumentOfPerigee * Math.PI) / 180;
  const Omega = (elements.raan * Math.PI) / 180;

  // Rotation matrices to convert from orbital plane to ECI
  const xECI =
    xOrbital * (Math.cos(omega) * Math.cos(Omega) - Math.sin(omega) * Math.sin(Omega) * Math.cos(i)) -
    yOrbital * (Math.sin(omega) * Math.cos(Omega) + Math.cos(omega) * Math.sin(Omega) * Math.cos(i));
  const yECI =
    xOrbital * (Math.cos(omega) * Math.sin(Omega) + Math.sin(omega) * Math.cos(Omega) * Math.cos(i)) +
    yOrbital * (Math.cos(omega) * Math.cos(Omega) * Math.cos(i) - Math.sin(omega) * Math.sin(Omega));
  const zECI = xOrbital * Math.sin(omega) * Math.sin(i) + yOrbital * Math.cos(omega) * Math.sin(i);

  // Convert ECI to geodetic (simplified - ignoring Earth's rotation for now)
  const earthRotation = ((time.getTime() / 86400000) * 2 * Math.PI) % (2 * Math.PI);
  const xECEF = xECI * Math.cos(earthRotation) + yECI * Math.sin(earthRotation);
  const yECEF = -xECI * Math.sin(earthRotation) + yECI * Math.cos(earthRotation);
  const zECEF = zECI;

  // Convert ECEF to geodetic
  const longitude = (Math.atan2(yECEF, xECEF) * 180) / Math.PI;
  const latitude = (Math.atan2(zECEF, Math.sqrt(xECEF * xECEF + yECEF * yECEF)) * 180) / Math.PI;
  const height = (r - EARTH_RADIUS_KM) * 1000; // Convert to meters

  return { longitude, latitude, height };
}

/**
 * Create a satellite orbit path from TLE (Two-Line Element) data
 * Uses simplified orbital mechanics for position calculation
 */
export function createSatelliteOrbit(
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
): CZMLPacket[] {
  const elements = parseTLE(tle);

  // Calculate orbital period in milliseconds
  const orbitalPeriod = (86400000 / elements.meanMotion);

  // Default time range: one orbital period from epoch
  const startTime = options?.startTime
    ? new Date(options.startTime)
    : elements.epoch;
  const stopTime = options?.stopTime
    ? new Date(options.stopTime)
    : new Date(startTime.getTime() + orbitalPeriod);

  // Number of sample points
  const sampleCount = options?.sampleCount || 120;
  const timeStep = (stopTime.getTime() - startTime.getTime()) / sampleCount;

  // Generate position samples
  const positions: CartographicPosition[] = [];
  const times: string[] = [];

  for (let i = 0; i <= sampleCount; i++) {
    const time = new Date(startTime.getTime() + i * timeStep);
    const pos = calculateSatellitePosition(elements, time);
    positions.push(pos);
    times.push(time.toISOString());
  }

  const id = options?.id || generateId('satellite');
  const availability = `${startTime.toISOString()}/${stopTime.toISOString()}`;

  // Build time-tagged position array
  const cartographicDegrees: (string | number)[] = [];
  for (let i = 0; i < positions.length; i++) {
    const pos = positions[i]!;
    const time = times[i]!;
    cartographicDegrees.push(time, pos.longitude, pos.latitude, pos.height || 0);
  }

  const packets: CZMLPacket[] = [];

  // Main satellite entity with path
  const satellitePacket: CZMLPacket = {
    id,
    name: options?.name || 'Satellite',
    availability,
    position: {
      epoch: times[0],
      cartographicDegrees,
      interpolationAlgorithm: 'LAGRANGE',
      interpolationDegree: 5,
      referenceFrame: 'FIXED',
    },
  };

  // Add path visualization
  if (options?.showPath !== false) {
    satellitePacket.path = {
      show: true,
      width: options?.width || 2,
      material: createSolidColorMaterial(
        createColorFromName(options?.color || 'cyan')
      ),
      leadTime: options?.leadTime ?? orbitalPeriod / 2000,
      trailTime: options?.trailTime ?? orbitalPeriod / 2000,
      resolution: 120,
    };
  }

  // Add point marker
  if (options?.showPoint !== false) {
    satellitePacket.point = {
      show: true,
      pixelSize: options?.pointSize || 8,
      color: createColorFromName(options?.pointColor || 'yellow'),
      outlineColor: createColorFromName('white'),
      outlineWidth: 1,
    };
  }

  packets.push(satellitePacket);

  return packets;
}

/**
 * Create an animated vehicle/aircraft track with time-stamped positions
 */
export function createVehicleTrack(
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
): CZMLPacket {
  if (positions.length !== timestamps.length) {
    throw new Error('Positions and timestamps arrays must have the same length');
  }

  if (positions.length < 2) {
    throw new Error('At least 2 positions are required for a vehicle track');
  }

  const id = options?.id || generateId('vehicle');
  const availability = `${timestamps[0]}/${timestamps[timestamps.length - 1]}`;

  // Build time-tagged position array
  const cartographicDegrees: (string | number)[] = [];
  for (let i = 0; i < positions.length; i++) {
    const pos = positions[i]!;
    const time = timestamps[i]!;
    cartographicDegrees.push(time, pos.longitude, pos.latitude, pos.height || 0);
  }

  const packet: CZMLPacket = {
    id,
    name: options?.name || 'Vehicle',
    availability,
    position: {
      epoch: timestamps[0],
      cartographicDegrees,
      interpolationAlgorithm: 'LAGRANGE',
      interpolationDegree: 1,
    },
  };

  // Add orientation along path for models
  if (options?.orientAlongPath !== false && options?.modelUrl) {
    packet.orientation = {
      velocityReference: `#${id}#position`,
    };
  }

  // Add path visualization (trail)
  if (options?.showPath !== false) {
    packet.path = {
      show: true,
      width: options?.width || 3,
      material: createSolidColorMaterial(
        createColorFromName(options?.color || 'yellow')
      ),
      leadTime: options?.leadTime || 0,
      trailTime: options?.trailTime || 3600, // 1 hour trail by default
    };
  }

  // Add point marker if no model specified
  if (options?.showPoint !== false && !options?.modelUrl) {
    packet.point = {
      show: true,
      pixelSize: options?.pointSize || 10,
      color: createColorFromName(options?.pointColor || options?.color || 'orange'),
      outlineColor: createColorFromName('white'),
      outlineWidth: 2,
    };
  }

  // Add 3D model if specified
  if (options?.modelUrl) {
    packet.model = {
      gltf: options.modelUrl,
      scale: options?.modelScale || 1,
      minimumPixelSize: 64,
      show: true,
    };
  }

  return packet;
}

/**
 * Create a point that appears/disappears at specific times
 */
export function createTimeDynamicPoint(
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
): CZMLPacket {
  return {
    id: options?.id || generateId('dynamic_point'),
    name: options?.name || 'Dynamic Point',
    availability,
    position: {
      cartographicDegrees: positionToCartographicDegrees(position),
    },
    point: {
      show: true,
      color: createColorFromName(options?.color || 'red'),
      pixelSize: options?.pixelSize || 12,
      outlineColor: options?.outlineColor
        ? createColorFromName(options.outlineColor)
        : createColorFromName('white'),
      outlineWidth: options?.outlineWidth || 2,
    },
  };
}

/**
 * Create an animated pulsating circle effect using time-dynamic radius
 */
export function createPulsatingMarker(
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
): CZMLPacket[] {
  const startTime = options?.startTime || new Date().toISOString();
  const stopTime = options?.stopTime || new Date(Date.now() + 3600000).toISOString(); // 1 hour default
  const baseRadius = options?.baseRadius || 100;
  const maxRadius = options?.maxRadius || 500;
  const pulsePeriod = options?.pulsePeriod || 2; // seconds per pulse
  const pulseCount = options?.pulseCount || 30;

  const id = options?.id || generateId('pulsating');
  const availability = `${startTime}/${stopTime}`;

  // Generate time-varying radius samples
  const semiMajorAxisSamples: (string | number)[] = [];
  const startDate = new Date(startTime);

  for (let i = 0; i <= pulseCount; i++) {
    const t = i / pulseCount;
    const time = new Date(startDate.getTime() + t * pulsePeriod * 1000 * pulseCount);
    const phase = (t * pulseCount) % 1;
    const radius = baseRadius + (maxRadius - baseRadius) * Math.sin(phase * Math.PI);
    semiMajorAxisSamples.push(time.toISOString(), radius);
  }

  // Generate time-varying color (optional opacity pulse)
  const colorSamples: (string | number)[] = [];
  const baseColor = createColorFromName(options?.color || 'cyan');
  const rgba = baseColor.rgba || [0, 255, 255, 255];

  for (let i = 0; i <= pulseCount; i++) {
    const t = i / pulseCount;
    const time = new Date(startDate.getTime() + t * pulsePeriod * 1000 * pulseCount);
    const phase = (t * pulseCount) % 1;
    const alpha = 255 - Math.floor(200 * Math.sin(phase * Math.PI)); // Fade as it grows
    colorSamples.push(time.toISOString(), rgba[0]!, rgba[1]!, rgba[2]!, alpha);
  }

  const packet: CZMLPacket = {
    id,
    name: options?.name || 'Pulsating Marker',
    availability,
    position: {
      cartographicDegrees: positionToCartographicDegrees(position),
    },
    ellipse: {
      semiMajorAxis: {
        epoch: startTime,
        number: semiMajorAxisSamples,
      } as unknown as number,
      semiMinorAxis: {
        epoch: startTime,
        number: semiMajorAxisSamples,
      } as unknown as number,
      height: position.height || 0,
      material: {
        solidColor: {
          color: {
            epoch: startTime,
            rgba: colorSamples,
          } as unknown as CZMLColor,
        },
      },
      outline: true,
      outlineColor: createColorFromName('white'),
      show: true,
    },
  };

  // Add a center point marker
  const centerPoint: CZMLPacket = {
    id: `${id}_center`,
    name: `${options?.name || 'Pulsating Marker'} Center`,
    availability,
    position: {
      cartographicDegrees: positionToCartographicDegrees(position),
    },
    point: {
      show: true,
      pixelSize: 8,
      color: createColorFromName(options?.color || 'cyan'),
      outlineColor: createColorFromName('white'),
      outlineWidth: 2,
    },
  };

  return [packet, centerPoint];
}

/**
 * Create an animated polyline that "draws itself" over time
 * The line progressively reveals positions from start to end
 */
export function createAnimatedPolyline(
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
): CZMLPacket[] {
  if (positions.length < 2) {
    throw new Error('At least 2 positions are required for an animated polyline');
  }

  const id = options?.id || generateId('animated_line');
  const startDate = new Date(startTime);
  const stopDate = new Date(startDate.getTime() + duration * 1000);
  const availability = `${startTime}/${stopDate.toISOString()}`;
  const stepDuration = duration / (positions.length - 1);

  const packets: CZMLPacket[] = [];

  // Create individual line segments that appear progressively
  for (let i = 0; i < positions.length - 1; i++) {
    const segmentStart = new Date(startDate.getTime() + i * stepDuration * 1000);
    const segmentAvailability = `${segmentStart.toISOString()}/${stopDate.toISOString()}`;

    const segmentCoords: number[] = [
      positions[i]!.longitude, positions[i]!.latitude, positions[i]!.height || 0,
      positions[i + 1]!.longitude, positions[i + 1]!.latitude, positions[i + 1]!.height || 0,
    ];

    const segment: CZMLPacket = {
      id: `${id}_segment_${i}`,
      name: `${options?.name || 'Animated Line'} Segment ${i + 1}`,
      availability: segmentAvailability,
      polyline: {
        positions: { cartographicDegrees: segmentCoords },
        width: options?.width || 3,
        material: createSolidColorMaterial(
          createColorFromName(options?.color || 'blue')
        ),
        clampToGround: options?.clampToGround ?? true,
        show: true,
      },
    };

    packets.push(segment);
  }

  // Add a moving point that traces the path
  if (options?.showPoint !== false) {
    const timestamps: string[] = [];
    for (let i = 0; i < positions.length; i++) {
      const time = new Date(startDate.getTime() + i * stepDuration * 1000);
      timestamps.push(time.toISOString());
    }

    const cartographicDegrees: (string | number)[] = [];
    for (let i = 0; i < positions.length; i++) {
      const pos = positions[i]!;
      cartographicDegrees.push(
        timestamps[i]!,
        pos.longitude,
        pos.latitude,
        pos.height || 0
      );
    }

    const tracingPoint: CZMLPacket = {
      id: `${id}_tracer`,
      name: `${options?.name || 'Animated Line'} Tracer`,
      availability,
      position: {
        epoch: startTime,
        cartographicDegrees,
        interpolationAlgorithm: 'LINEAR',
        interpolationDegree: 1,
      },
      point: {
        show: true,
        pixelSize: options?.pointSize || 12,
        color: createColorFromName(options?.pointColor || options?.color || 'blue'),
        outlineColor: createColorFromName('white'),
        outlineWidth: 2,
      },
    };

    packets.push(tracingPoint);
  }

  return packets;
}
