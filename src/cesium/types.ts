/**
 * CesiumJS Command Types and CZML Schema Definitions
 * These types define the structure for natural language -> CesiumJS command translation
 */

// Geographic position types
export interface CartographicPosition {
  longitude: number;  // degrees
  latitude: number;   // degrees
  height?: number;    // meters
}

export interface Cartesian3Position {
  x: number;
  y: number;
  z: number;
}

export type Position = CartographicPosition | Cartesian3Position;

// Camera control commands
export interface CameraFlyToCommand {
  type: 'camera.flyTo';
  destination: CartographicPosition;
  orientation?: {
    heading?: number;  // radians
    pitch?: number;    // radians
    roll?: number;     // radians
  };
  duration?: number;   // seconds
}

export interface CameraLookAtCommand {
  type: 'camera.lookAt';
  target: CartographicPosition;
  offset?: {
    heading: number;
    pitch: number;
    range: number;
  };
}

export interface CameraZoomCommand {
  type: 'camera.zoom';
  amount: number;  // positive = zoom in, negative = zoom out
}

export interface CameraRotateCommand {
  type: 'camera.rotate';
  heading?: number;
  pitch?: number;
  roll?: number;
}

export interface CameraOrbitCommand {
  type: 'camera.orbit';
  target: CartographicPosition;
  duration: number;            // seconds
  headingDelta?: number;       // How much to rotate in radians (default: 2*PI for full orbit)
  pitchDelta?: number;         // Change in pitch during orbit (radians)
}

export interface CameraTrackCommand {
  type: 'camera.track';
  entityId: string;
  offset?: {
    heading: number;
    pitch: number;
    range: number;
  };
}

export interface CameraCinematicFlightCommand {
  type: 'camera.cinematicFlight';
  waypoints: Array<{
    position: CartographicPosition;
    duration?: number;         // Duration to reach this waypoint (seconds)
    orientation?: {
      heading?: number;
      pitch?: number;
      roll?: number;
    };
  }>;
  loop?: boolean;              // Whether to loop back to the first waypoint
}

// Entity commands
export interface AddEntityCommand {
  type: 'entity.add';
  entity: CZMLEntity;
}

export interface RemoveEntityCommand {
  type: 'entity.remove';
  id: string;
}

export interface UpdateEntityCommand {
  type: 'entity.update';
  id: string;
  properties: Partial<CZMLEntity>;
}

// Layer commands
export interface AddImageryCommand {
  type: 'imagery.add';
  provider: 'bing' | 'osm' | 'arcgis' | 'tms' | 'wms';
  url?: string;
  options?: Record<string, unknown>;
}

export interface ToggleLayerCommand {
  type: 'layer.toggle';
  layerId: string;
  visible: boolean;
}

// Time commands
export interface SetTimeCommand {
  type: 'time.set';
  currentTime?: string;  // ISO 8601
  startTime?: string;
  stopTime?: string;
  multiplier?: number;
}

export interface PlayTimeCommand {
  type: 'time.play';
}

export interface PauseTimeCommand {
  type: 'time.pause';
}

// Scene commands
export interface SetSceneMode {
  type: 'scene.mode';
  mode: '2D' | '3D' | 'COLUMBUS_VIEW';
}

export interface SetTerrainCommand {
  type: 'terrain.set';
  provider: 'cesium' | 'ellipsoid' | 'custom';
  url?: string;
  /** Optional asset ID for Cesium Ion terrain */
  assetId?: number;
}

// 3D Tiles commands
export interface Add3DTilesCommand {
  type: 'tiles3d.add';
  /** Unique identifier for this tileset */
  id: string;
  /** URL to the tileset.json or Cesium Ion asset ID */
  url: string;
  /** Optional Cesium Ion asset ID (alternative to URL) */
  assetId?: number;
  /** Maximum screen space error for level of detail */
  maximumScreenSpaceError?: number;
  /** Maximum memory usage in MB */
  maximumMemoryUsage?: number;
  /** Show the tileset */
  show?: boolean;
}

export interface Remove3DTilesCommand {
  type: 'tiles3d.remove';
  /** ID of the tileset to remove */
  id: string;
}

export interface Style3DTilesCommand {
  type: 'tiles3d.style';
  /** ID of the tileset to style */
  id: string;
  /** 3D Tiles style object or style expression */
  style: Cesium3DTileStyle;
}

/** 3D Tiles styling definition */
export interface Cesium3DTileStyle {
  /** Color expression (e.g., "color('red')" or conditional expressions) */
  color?: string | object;
  /** Show expression (e.g., "${height} > 100") */
  show?: string | boolean;
  /** Point size expression */
  pointSize?: string | number;
  /** Meta properties for custom styling */
  meta?: Record<string, string>;
}

export interface SetTerrainExaggerationCommand {
  type: 'terrain.exaggeration';
  /** Vertical exaggeration factor (1.0 = normal, 2.0 = double height) */
  factor: number;
  /** Height at which exaggeration starts to apply (default: 0) */
  relativeHeight?: number;
}

// Aggregate command type
export type CesiumCommand =
  | CameraFlyToCommand
  | CameraLookAtCommand
  | CameraZoomCommand
  | CameraRotateCommand
  | CameraOrbitCommand
  | CameraTrackCommand
  | CameraCinematicFlightCommand
  | AddEntityCommand
  | RemoveEntityCommand
  | UpdateEntityCommand
  | AddImageryCommand
  | ToggleLayerCommand
  | SetTimeCommand
  | PlayTimeCommand
  | PauseTimeCommand
  | SetSceneMode
  | SetTerrainCommand
  | Add3DTilesCommand
  | Remove3DTilesCommand
  | Style3DTilesCommand
  | SetTerrainExaggerationCommand;

// CZML Types
export interface CZMLPacket {
  id: string;
  name?: string;
  description?: string;
  availability?: string;  // ISO 8601 interval
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

export interface CZMLDocument extends CZMLPacket {
  id: 'document';
  version: '1.0';
  clock?: CZMLClock;
}

export interface CZMLClock {
  interval?: string;
  currentTime?: string;
  multiplier?: number;
  range?: 'UNBOUNDED' | 'CLAMPED' | 'LOOP_STOP';
  step?: 'SYSTEM_CLOCK' | 'SYSTEM_CLOCK_MULTIPLIER' | 'TICK_DEPENDENT';
}

export interface CZMLPosition {
  cartographicDegrees?: number[] | (string | number)[];  // [lon, lat, height] or [time, lon, lat, height, ...]
  cartesian?: number[] | (string | number)[];
  epoch?: string;
  interpolationAlgorithm?: 'LINEAR' | 'LAGRANGE' | 'HERMITE';
  interpolationDegree?: number;
  referenceFrame?: 'FIXED' | 'INERTIAL';
}

export interface CZMLOrientation {
  unitQuaternion?: number[];
  velocityReference?: string;
}

export interface CZMLBillboard {
  image: string | { uri: string };
  scale?: number;
  show?: boolean;
  color?: CZMLColor;
  horizontalOrigin?: 'LEFT' | 'CENTER' | 'RIGHT';
  verticalOrigin?: 'TOP' | 'CENTER' | 'BOTTOM' | 'BASELINE';
  heightReference?: 'NONE' | 'CLAMP_TO_GROUND' | 'RELATIVE_TO_GROUND';
}

export interface CZMLLabel {
  text: string;
  font?: string;
  style?: 'FILL' | 'OUTLINE' | 'FILL_AND_OUTLINE';
  scale?: number;
  show?: boolean;
  fillColor?: CZMLColor;
  outlineColor?: CZMLColor;
  outlineWidth?: number;
  horizontalOrigin?: 'LEFT' | 'CENTER' | 'RIGHT';
  verticalOrigin?: 'TOP' | 'CENTER' | 'BOTTOM' | 'BASELINE';
  pixelOffset?: { cartesian2: number[] };
}

export interface CZMLPoint {
  color?: CZMLColor;
  pixelSize?: number;
  outlineColor?: CZMLColor;
  outlineWidth?: number;
  show?: boolean;
  heightReference?: 'NONE' | 'CLAMP_TO_GROUND' | 'RELATIVE_TO_GROUND';
}

export interface CZMLPolyline {
  positions: CZMLPosition;
  width?: number;
  material?: CZMLMaterial;
  clampToGround?: boolean;
  show?: boolean;
}

export interface CZMLPolygon {
  positions: CZMLPosition;
  height?: number;
  extrudedHeight?: number;
  material?: CZMLMaterial;
  outline?: boolean;
  outlineColor?: CZMLColor;
  show?: boolean;
}

export interface CZMLEllipse {
  semiMajorAxis: number;
  semiMinorAxis: number;
  height?: number;
  extrudedHeight?: number;
  rotation?: number;
  material?: CZMLMaterial;
  outline?: boolean;
  outlineColor?: CZMLColor;
  show?: boolean;
}

export interface CZMLBox {
  dimensions: { cartesian: number[] };  // [x, y, z]
  material?: CZMLMaterial;
  outline?: boolean;
  outlineColor?: CZMLColor;
  show?: boolean;
}

export interface CZMLModel {
  gltf: string;
  scale?: number;
  minimumPixelSize?: number;
  maximumScale?: number;
  show?: boolean;
}

export interface CZMLPath {
  show?: boolean;
  width?: number;
  material?: CZMLMaterial;
  resolution?: number;
  leadTime?: number;
  trailTime?: number;
}

export interface CZMLColor {
  rgba?: number[];       // [r, g, b, a] 0-255
  rgbaf?: number[];      // [r, g, b, a] 0-1
}

export interface CZMLMaterial {
  solidColor?: { color: CZMLColor };
  polylineOutline?: {
    color: CZMLColor;
    outlineColor: CZMLColor;
    outlineWidth: number;
  };
  polylineGlow?: {
    color: CZMLColor;
    glowPower: number;
  };
  polylineArrow?: { color: CZMLColor };
  polylineDash?: {
    color: CZMLColor;
    dashLength?: number;
    dashPattern?: number;
  };
  image?: {
    image: string | { uri: string };
    repeat?: { cartesian2: number[] };
  };
}

export type CZMLEntity = CZMLPacket;
export type CZMLDocumentArray = [CZMLDocument, ...CZMLPacket[]];

/**
 * TLE (Two-Line Element) data for satellite orbit calculation
 */
export interface TLEData {
  line1: string;
  line2: string;
}
