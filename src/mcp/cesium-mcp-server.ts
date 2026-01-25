/**
 * CesiumJS MCP Server
 * Provides tools and resources for controlling CesiumJS through the Model Context Protocol
 */

import { z } from 'zod';
import type { BrowserTransport, MCPMessage } from './browser-transport';
import type { CesiumCommand, CartographicPosition, CZMLPacket } from '../cesium/types';
import * as czmlGenerator from '../cesium/czml-generator';

// Schema definitions for tool inputs
const positionSchema = z.object({
  longitude: z.number().min(-180).max(180),
  latitude: z.number().min(-90).max(90),
  height: z.number().optional(),
});

const colorSchema = z.enum([
  'red', 'green', 'blue', 'yellow', 'orange', 'purple',
  'pink', 'cyan', 'white', 'black', 'gray', 'grey'
]);

// Tool definitions
const tools = {
  flyTo: {
    name: 'flyTo',
    description: 'Fly the camera to a specific geographic location',
    inputSchema: z.object({
      longitude: z.number().min(-180).max(180).describe('Longitude in degrees'),
      latitude: z.number().min(-90).max(90).describe('Latitude in degrees'),
      height: z.number().positive().optional().describe('Camera height in meters'),
      duration: z.number().positive().optional().describe('Flight duration in seconds'),
    }),
  },
  lookAt: {
    name: 'lookAt',
    description: 'Orient the camera to look at a specific location',
    inputSchema: z.object({
      longitude: z.number().min(-180).max(180).describe('Target longitude'),
      latitude: z.number().min(-90).max(90).describe('Target latitude'),
      range: z.number().positive().optional().describe('Distance from target in meters'),
    }),
  },
  zoom: {
    name: 'zoom',
    description: 'Zoom the camera in or out',
    inputSchema: z.object({
      amount: z.number().describe('Zoom amount (positive = in, negative = out)'),
    }),
  },
  addPoint: {
    name: 'addPoint',
    description: 'Add a point marker at a location',
    inputSchema: z.object({
      longitude: z.number().min(-180).max(180),
      latitude: z.number().min(-90).max(90),
      name: z.string().optional().describe('Label for the point'),
      color: colorSchema.optional(),
      size: z.number().positive().optional().describe('Point size in pixels'),
    }),
  },
  addLabel: {
    name: 'addLabel',
    description: 'Add a text label at a location',
    inputSchema: z.object({
      longitude: z.number().min(-180).max(180),
      latitude: z.number().min(-90).max(90),
      text: z.string().describe('Label text'),
      color: colorSchema.optional(),
    }),
  },
  addPolyline: {
    name: 'addPolyline',
    description: 'Draw a line connecting multiple points',
    inputSchema: z.object({
      positions: z.array(positionSchema).min(2).describe('Array of positions'),
      name: z.string().optional(),
      color: colorSchema.optional(),
      width: z.number().positive().optional(),
    }),
  },
  addPolygon: {
    name: 'addPolygon',
    description: 'Draw a filled polygon',
    inputSchema: z.object({
      positions: z.array(positionSchema).min(3).describe('Array of vertex positions'),
      name: z.string().optional(),
      color: colorSchema.optional(),
      extrudedHeight: z.number().optional().describe('Height to extrude the polygon'),
    }),
  },
  addCircle: {
    name: 'addCircle',
    description: 'Draw a circle at a location',
    inputSchema: z.object({
      longitude: z.number().min(-180).max(180),
      latitude: z.number().min(-90).max(90),
      radius: z.number().positive().describe('Circle radius in meters'),
      name: z.string().optional(),
      color: colorSchema.optional(),
    }),
  },
  addSphere: {
    name: 'addSphere',
    description: 'Add a 3D sphere at a location',
    inputSchema: z.object({
      longitude: z.number().min(-180).max(180),
      latitude: z.number().min(-90).max(90),
      height: z.number().optional().describe('Height above ground in meters'),
      radius: z.number().positive().describe('Sphere radius in meters'),
      name: z.string().optional(),
      color: colorSchema.optional(),
    }),
  },
  addEllipsoid: {
    name: 'addEllipsoid',
    description: 'Add a 3D ellipsoid at a location with different radii in X, Y, Z directions',
    inputSchema: z.object({
      longitude: z.number().min(-180).max(180),
      latitude: z.number().min(-90).max(90),
      height: z.number().optional().describe('Height above ground in meters'),
      radiiX: z.number().positive().describe('Radius in X direction (meters)'),
      radiiY: z.number().positive().describe('Radius in Y direction (meters)'),
      radiiZ: z.number().positive().describe('Radius in Z direction (meters)'),
      name: z.string().optional(),
      color: colorSchema.optional(),
    }),
  },
  addCylinder: {
    name: 'addCylinder',
    description: 'Add a 3D cylinder at a location. Set topRadius to 0 for a cone.',
    inputSchema: z.object({
      longitude: z.number().min(-180).max(180),
      latitude: z.number().min(-90).max(90),
      length: z.number().positive().describe('Height of the cylinder in meters'),
      topRadius: z.number().min(0).describe('Top radius in meters (0 for cone)'),
      bottomRadius: z.number().positive().describe('Bottom radius in meters'),
      name: z.string().optional(),
      color: colorSchema.optional(),
    }),
  },
  addCorridor: {
    name: 'addCorridor',
    description: 'Draw a corridor (road/path) with width along multiple positions',
    inputSchema: z.object({
      positions: z.array(positionSchema).min(2).describe('Array of positions along the corridor'),
      width: z.number().positive().describe('Width of the corridor in meters'),
      height: z.number().optional().describe('Height above ground in meters'),
      extrudedHeight: z.number().optional().describe('Extruded height to create 3D volume'),
      name: z.string().optional(),
      color: colorSchema.optional(),
    }),
  },
  addRectangle: {
    name: 'addRectangle',
    description: 'Draw a rectangle defined by geographic bounds',
    inputSchema: z.object({
      west: z.number().min(-180).max(180).describe('Western longitude in degrees'),
      south: z.number().min(-90).max(90).describe('Southern latitude in degrees'),
      east: z.number().min(-180).max(180).describe('Eastern longitude in degrees'),
      north: z.number().min(-90).max(90).describe('Northern latitude in degrees'),
      height: z.number().optional().describe('Height above ground in meters'),
      extrudedHeight: z.number().optional().describe('Extruded height to create 3D volume'),
      name: z.string().optional(),
      color: colorSchema.optional(),
    }),
  },
  addWall: {
    name: 'addWall',
    description: 'Draw a vertical wall along multiple positions',
    inputSchema: z.object({
      positions: z.array(positionSchema).min(2).describe('Array of positions along the wall'),
      minimumHeights: z.array(z.number()).optional().describe('Bottom heights at each position'),
      maximumHeights: z.array(z.number()).optional().describe('Top heights at each position'),
      name: z.string().optional(),
      color: colorSchema.optional(),
    }),
  },
  addBox: {
    name: 'addBox',
    description: 'Add a 3D box at a location',
    inputSchema: z.object({
      longitude: z.number().min(-180).max(180),
      latitude: z.number().min(-90).max(90),
      dimensionX: z.number().positive().describe('Width in meters (X dimension)'),
      dimensionY: z.number().positive().describe('Depth in meters (Y dimension)'),
      dimensionZ: z.number().positive().describe('Height in meters (Z dimension)'),
      name: z.string().optional(),
      color: colorSchema.optional(),
    }),
  },
  addModel: {
    name: 'addModel',
    description: 'Add a 3D model (glTF/glb) at a location',
    inputSchema: z.object({
      longitude: z.number().min(-180).max(180),
      latitude: z.number().min(-90).max(90),
      url: z.string().describe('URL to the glTF/glb model file'),
      scale: z.number().positive().optional().describe('Scale factor for the model'),
      name: z.string().optional(),
    }),
  },
  flyToEntity: {
    name: 'flyToEntity',
    description: 'Fly the camera to view a specific entity by its name or ID',
    inputSchema: z.object({
      entityId: z.string().describe('Name or ID of the entity to fly to'),
      duration: z.number().positive().optional().describe('Flight duration in seconds'),
      heading: z.number().optional().describe('Camera heading in degrees'),
      pitch: z.number().optional().describe('Camera pitch in degrees (negative looks down)'),
      range: z.number().positive().optional().describe('Distance from entity in meters'),
    }),
  },
  showEntity: {
    name: 'showEntity',
    description: 'Make an entity visible by its ID',
    inputSchema: z.object({
      entityId: z.string().describe('ID of the entity to show'),
    }),
  },
  hideEntity: {
    name: 'hideEntity',
    description: 'Hide an entity by its ID',
    inputSchema: z.object({
      entityId: z.string().describe('ID of the entity to hide'),
    }),
  },
  removeEntity: {
    name: 'removeEntity',
    description: 'Remove an entity by its ID',
    inputSchema: z.object({
      id: z.string().describe('Entity ID to remove'),
    }),
  },
  updateEntity: {
    name: 'updateEntity',
    description: 'Update properties of an existing entity',
    inputSchema: z.object({
      id: z.string().describe('ID of the entity to update'),
      name: z.string().optional().describe('New name for the entity'),
      description: z.string().optional().describe('New description for the entity'),
    }),
  },
  cloneEntity: {
    name: 'cloneEntity',
    description: 'Clone an existing entity with a new name',
    inputSchema: z.object({
      entityId: z.string().describe('ID of the entity to clone'),
      newName: z.string().describe('Name for the cloned entity'),
    }),
  },
  clearAll: {
    name: 'clearAll',
    description: 'Remove all entities from the scene',
    inputSchema: z.object({}),
  },
  setSceneMode: {
    name: 'setSceneMode',
    description: 'Change the scene viewing mode',
    inputSchema: z.object({
      mode: z.enum(['2D', '3D', 'COLUMBUS_VIEW']),
    }),
  },
  setTime: {
    name: 'setTime',
    description: 'Set the simulation time',
    inputSchema: z.object({
      time: z.string().describe('ISO 8601 date-time string'),
      multiplier: z.number().optional().describe('Time multiplier for animation'),
    }),
  },
  playAnimation: {
    name: 'playAnimation',
    description: 'Start time animation',
    inputSchema: z.object({}),
  },
  pauseAnimation: {
    name: 'pauseAnimation',
    description: 'Pause time animation',
    inputSchema: z.object({}),
  },
  generateCZML: {
    name: 'generateCZML',
    description: 'Generate CZML document from entities',
    inputSchema: z.object({
      entities: z.array(z.object({
        type: z.enum(['point', 'label', 'polyline', 'polygon', 'circle']),
        position: positionSchema.optional(),
        positions: z.array(positionSchema).optional(),
        name: z.string().optional(),
        text: z.string().optional(),
        color: colorSchema.optional(),
        radius: z.number().optional(),
      })),
      documentName: z.string().optional(),
    }),
  },
  trackVehicle: {
    name: 'trackVehicle',
    description: 'Track a moving vehicle or aircraft with animated position updates',
    inputSchema: z.object({
      positions: z.array(positionSchema).min(2).describe('Array of positions along the track'),
      timestamps: z.array(z.string()).min(2).describe('ISO 8601 timestamps for each position'),
      name: z.string().optional().describe('Name for the vehicle'),
      color: colorSchema.optional().describe('Trail color'),
      width: z.number().positive().optional().describe('Trail width in pixels'),
      showPath: z.boolean().optional().describe('Show the trail path'),
      trailTime: z.number().positive().optional().describe('Trail duration in seconds'),
      leadTime: z.number().optional().describe('Lead time in seconds'),
      modelUrl: z.string().optional().describe('URL to a 3D model (glTF/glb)'),
      modelScale: z.number().positive().optional().describe('Scale factor for the model'),
      orientAlongPath: z.boolean().optional().describe('Orient model along movement direction'),
    }),
  },
  addAnimatedPath: {
    name: 'addAnimatedPath',
    description: 'Add an animated path that draws itself progressively over time',
    inputSchema: z.object({
      positions: z.array(positionSchema).min(2).describe('Array of positions for the path'),
      startTime: z.string().describe('ISO 8601 start time for the animation'),
      duration: z.number().positive().describe('Duration in seconds to draw the entire path'),
      name: z.string().optional().describe('Name for the path'),
      color: colorSchema.optional().describe('Path color'),
      width: z.number().positive().optional().describe('Path width in pixels'),
      clampToGround: z.boolean().optional().describe('Clamp the path to terrain'),
      showPoint: z.boolean().optional().describe('Show a tracing point'),
      pointColor: colorSchema.optional().describe('Tracing point color'),
      pointSize: z.number().positive().optional().describe('Tracing point size in pixels'),
    }),
  },
  load3DTiles: {
    name: 'load3DTiles',
    description: 'Load a Cesium 3D Tileset from a URL or Cesium Ion asset ID',
    inputSchema: z.object({
      id: z.string().describe('Unique identifier for this tileset (used for removal and styling)'),
      url: z.string().describe('URL to the tileset.json file'),
      assetId: z.number().optional().describe('Cesium Ion asset ID (alternative to URL)'),
      maximumScreenSpaceError: z.number().positive().optional().describe('Maximum screen space error for level of detail (default: 16)'),
      maximumMemoryUsage: z.number().positive().optional().describe('Maximum GPU memory usage in MB (default: 512)'),
      show: z.boolean().optional().describe('Whether to show the tileset initially (default: true)'),
    }),
  },
  remove3DTiles: {
    name: 'remove3DTiles',
    description: 'Remove a loaded 3D Tileset by its ID',
    inputSchema: z.object({
      id: z.string().describe('ID of the tileset to remove'),
    }),
  },
  style3DTiles: {
    name: 'style3DTiles',
    description: 'Apply a style to a 3D Tileset (color, visibility, point size)',
    inputSchema: z.object({
      id: z.string().describe('ID of the tileset to style'),
      color: z.union([
        z.string(),
        z.object({
          conditions: z.array(z.tuple([z.string(), z.string()])).describe('Array of [condition, color] pairs'),
        }),
      ]).optional().describe('Color expression (e.g., "color(\'red\')" or conditional object)'),
      show: z.union([z.string(), z.boolean()]).optional().describe('Show expression (e.g., "${height} > 100" or true/false)'),
      pointSize: z.union([z.string(), z.number()]).optional().describe('Point size expression or number'),
    }),
  },
  setTerrainExaggeration: {
    name: 'setTerrainExaggeration',
    description: 'Adjust the vertical exaggeration of terrain',
    inputSchema: z.object({
      factor: z.number().positive().describe('Vertical exaggeration factor (1.0 = normal, 2.0 = double height)'),
      relativeHeight: z.number().optional().describe('Height in meters at which exaggeration starts to apply (default: 0)'),
    }),
  },
  orbitTarget: {
    name: 'orbitTarget',
    description: 'Orbit the camera around a geographic target point. The camera will smoothly rotate around the target over the specified duration.',
    inputSchema: z.object({
      longitude: z.number().min(-180).max(180).describe('Target longitude in degrees'),
      latitude: z.number().min(-90).max(90).describe('Target latitude in degrees'),
      height: z.number().optional().describe('Target height in meters (default: 0)'),
      duration: z.number().positive().describe('Duration of the orbit animation in seconds'),
      headingDelta: z.number().optional().describe('How much to rotate in radians (default: 2*PI for full 360-degree orbit)'),
      pitchDelta: z.number().optional().describe('Change in pitch during orbit in radians (default: 0)'),
    }),
  },
  trackEntity: {
    name: 'trackEntity',
    description: 'Have the camera follow/track a specific entity as it moves. The camera will continuously update to keep the entity in view.',
    inputSchema: z.object({
      entityId: z.string().describe('ID of the entity to track'),
      heading: z.number().optional().describe('Camera heading offset in radians (default: 0)'),
      pitch: z.number().optional().describe('Camera pitch offset in radians (default: -PI/4, looking down at 45 degrees)'),
      range: z.number().positive().optional().describe('Distance from the entity in meters (default: 10000)'),
    }),
  },
  cinematicFlight: {
    name: 'cinematicFlight',
    description: 'Create a smooth cinematic flight through multiple waypoints. The camera will fly to each waypoint in sequence.',
    inputSchema: z.object({
      waypoints: z.array(z.object({
        longitude: z.number().min(-180).max(180).describe('Waypoint longitude'),
        latitude: z.number().min(-90).max(90).describe('Waypoint latitude'),
        height: z.number().optional().describe('Waypoint height in meters'),
        duration: z.number().positive().optional().describe('Duration to reach this waypoint in seconds (default: 5)'),
        heading: z.number().optional().describe('Camera heading at this waypoint in radians'),
        pitch: z.number().optional().describe('Camera pitch at this waypoint in radians'),
        roll: z.number().optional().describe('Camera roll at this waypoint in radians'),
      })).min(2).describe('Array of waypoints to fly through (minimum 2)'),
      loop: z.boolean().optional().describe('Whether to loop back to the first waypoint after completing the flight (default: false)'),
    }),
  },
  stopTracking: {
    name: 'stopTracking',
    description: 'Stop tracking an entity and return camera control to the user',
    inputSchema: z.object({}),
  },
  stopCinematicFlight: {
    name: 'stopCinematicFlight',
    description: 'Stop an active cinematic flight animation',
    inputSchema: z.object({}),
  },
  stopOrbit: {
    name: 'stopOrbit',
    description: 'Stop an active orbit animation',
    inputSchema: z.object({}),
  },
  addBillboard: {
    name: 'addBillboard',
    description: 'Add an image marker (billboard) at a location that always faces the camera',
    inputSchema: z.object({
      longitude: z.number().min(-180).max(180),
      latitude: z.number().min(-90).max(90),
      image: z.string().describe('URL to the image file'),
      name: z.string().optional().describe('Name for the billboard'),
      scale: z.number().positive().optional().describe('Scale factor for the image (default: 1)'),
    }),
  },
  setView: {
    name: 'setView',
    description: 'Instantly set the camera position and orientation without animation',
    inputSchema: z.object({
      longitude: z.number().min(-180).max(180).describe('Longitude in degrees'),
      latitude: z.number().min(-90).max(90).describe('Latitude in degrees'),
      height: z.number().positive().describe('Camera height in meters'),
      heading: z.number().optional().describe('Camera heading in degrees (0 = north, 90 = east)'),
      pitch: z.number().optional().describe('Camera pitch in degrees (0 = horizontal, -90 = looking down)'),
      roll: z.number().optional().describe('Camera roll in degrees'),
    }),
  },
  getCamera: {
    name: 'getCamera',
    description: 'Get the current camera position and orientation',
    inputSchema: z.object({}),
  },
  selectEntity: {
    name: 'selectEntity',
    description: 'Select an entity to highlight it and show its info box',
    inputSchema: z.object({
      entityId: z.string().describe('ID or name of the entity to select'),
    }),
  },
  listEntities: {
    name: 'listEntities',
    description: 'Get a list of all entities currently in the scene',
    inputSchema: z.object({}),
  },
  loadGeoJSON: {
    name: 'loadGeoJSON',
    description: 'Load GeoJSON data from a URL',
    inputSchema: z.object({
      url: z.string().describe('URL to the GeoJSON file'),
      name: z.string().optional().describe('Name for the data source'),
      clampToGround: z.boolean().optional().describe('Clamp features to terrain (default: true)'),
      stroke: colorSchema.optional().describe('Line/outline color'),
      fill: colorSchema.optional().describe('Fill color for polygons'),
      strokeWidth: z.number().positive().optional().describe('Line width in pixels'),
    }),
  },
  loadKML: {
    name: 'loadKML',
    description: 'Load KML or KMZ data from a URL',
    inputSchema: z.object({
      url: z.string().describe('URL to the KML or KMZ file'),
      name: z.string().optional().describe('Name for the data source'),
      clampToGround: z.boolean().optional().describe('Clamp features to terrain'),
    }),
  },
  setFog: {
    name: 'setFog',
    description: 'Enable or configure atmospheric fog effect',
    inputSchema: z.object({
      enabled: z.boolean().describe('Enable or disable fog'),
      density: z.number().min(0).max(1).optional().describe('Fog density (0 to 1, default: 0.0001)'),
    }),
  },
  setShadows: {
    name: 'setShadows',
    description: 'Enable or disable shadows in the scene',
    inputSchema: z.object({
      enabled: z.boolean().describe('Enable or disable shadows'),
      softShadows: z.boolean().optional().describe('Use soft shadows (default: true)'),
    }),
  },
  rotateCamera: {
    name: 'rotateCamera',
    description: 'Rotate the camera heading, pitch, or roll relative to its current orientation',
    inputSchema: z.object({
      heading: z.number().optional().describe('Change in heading in degrees (positive = clockwise)'),
      pitch: z.number().optional().describe('Change in pitch in degrees (positive = look up)'),
      roll: z.number().optional().describe('Change in roll in degrees'),
    }),
  },
  loadCZML: {
    name: 'loadCZML',
    description: 'Load CZML data from a URL',
    inputSchema: z.object({
      url: z.string().describe('URL to the CZML file'),
      name: z.string().optional().describe('Name for the data source'),
    }),
  },
  getEntityInfo: {
    name: 'getEntityInfo',
    description: 'Get detailed information about a specific entity',
    inputSchema: z.object({
      entityId: z.string().describe('ID or name of the entity'),
    }),
  },
  setAnimationSpeed: {
    name: 'setAnimationSpeed',
    description: 'Set the time multiplier for animation playback',
    inputSchema: z.object({
      multiplier: z.number().describe('Time multiplier (1 = real-time, 10 = 10x speed, -1 = reverse)'),
    }),
  },
  removeImagery: {
    name: 'removeImagery',
    description: 'Remove an imagery layer by its index',
    inputSchema: z.object({
      index: z.number().int().min(0).describe('Index of the imagery layer to remove'),
    }),
  },
  setImageryAlpha: {
    name: 'setImageryAlpha',
    description: 'Set the transparency of an imagery layer',
    inputSchema: z.object({
      index: z.number().int().min(0).describe('Index of the imagery layer'),
      alpha: z.number().min(0).max(1).describe('Transparency value (0 = invisible, 1 = opaque)'),
    }),
  },
  setLighting: {
    name: 'setLighting',
    description: 'Configure scene lighting (sun position and globe lighting)',
    inputSchema: z.object({
      enableLighting: z.boolean().optional().describe('Enable globe lighting based on sun position'),
      sunPosition: z.object({
        longitude: z.number().min(-180).max(180),
        latitude: z.number().min(-90).max(90),
      }).optional().describe('Sun position (defaults to current simulation time)'),
    }),
  },
  setAtmosphere: {
    name: 'setAtmosphere',
    description: 'Configure the sky atmosphere appearance',
    inputSchema: z.object({
      show: z.boolean().optional().describe('Show or hide the sky atmosphere'),
      brightnessShift: z.number().min(-1).max(1).optional().describe('Brightness shift (-1 to 1)'),
      hueShift: z.number().min(-1).max(1).optional().describe('Hue shift (-1 to 1)'),
      saturationShift: z.number().min(-1).max(1).optional().describe('Saturation shift (-1 to 1)'),
    }),
  },
  setGlobe: {
    name: 'setGlobe',
    description: 'Configure globe visibility and appearance',
    inputSchema: z.object({
      show: z.boolean().optional().describe('Show or hide the globe'),
      showGroundAtmosphere: z.boolean().optional().describe('Show atmosphere at ground level'),
      enableLighting: z.boolean().optional().describe('Enable lighting on the globe'),
      baseColor: colorSchema.optional().describe('Globe base color when no imagery'),
    }),
  },
  loadGPX: {
    name: 'loadGPX',
    description: 'Load GPX track data from a URL',
    inputSchema: z.object({
      url: z.string().describe('URL to the GPX file'),
      name: z.string().optional().describe('Name for the data source'),
      clampToGround: z.boolean().optional().describe('Clamp track to terrain'),
    }),
  },
  setImageryBrightness: {
    name: 'setImageryBrightness',
    description: 'Set brightness, contrast, and saturation of an imagery layer',
    inputSchema: z.object({
      index: z.number().int().min(0).describe('Index of the imagery layer'),
      brightness: z.number().min(0).max(3).optional().describe('Brightness (1 = normal)'),
      contrast: z.number().min(0).max(3).optional().describe('Contrast (1 = normal)'),
      saturation: z.number().min(0).max(3).optional().describe('Saturation (1 = normal)'),
      gamma: z.number().min(0).max(3).optional().describe('Gamma (1 = normal)'),
    }),
  },
  addWMS: {
    name: 'addWMS',
    description: 'Add a WMS (Web Map Service) imagery layer',
    inputSchema: z.object({
      url: z.string().describe('WMS service URL'),
      layers: z.string().describe('Comma-separated list of WMS layers'),
      name: z.string().optional().describe('Name for the layer'),
    }),
  },
  measureDistance: {
    name: 'measureDistance',
    description: 'Calculate the distance between two points',
    inputSchema: z.object({
      start: positionSchema.describe('Starting point'),
      end: positionSchema.describe('Ending point'),
    }),
  },
  sampleTerrainHeight: {
    name: 'sampleTerrainHeight',
    description: 'Get the terrain elevation at a specific location',
    inputSchema: z.object({
      longitude: z.number().min(-180).max(180),
      latitude: z.number().min(-90).max(90),
    }),
  },
  enableDepthTest: {
    name: 'enableDepthTest',
    description: 'Enable or disable depth testing against terrain',
    inputSchema: z.object({
      enabled: z.boolean().describe('Enable depth testing'),
    }),
  },
  addGlowingPolyline: {
    name: 'addGlowingPolyline',
    description: 'Draw a glowing line connecting multiple points',
    inputSchema: z.object({
      positions: z.array(positionSchema).min(2).describe('Array of positions'),
      name: z.string().optional(),
      color: colorSchema.optional(),
      width: z.number().positive().optional(),
      glowPower: z.number().min(0).max(1).optional().describe('Glow intensity (0 to 1, default: 0.25)'),
    }),
  },
  addDashedPolyline: {
    name: 'addDashedPolyline',
    description: 'Draw a dashed line connecting multiple points',
    inputSchema: z.object({
      positions: z.array(positionSchema).min(2).describe('Array of positions'),
      name: z.string().optional(),
      color: colorSchema.optional(),
      width: z.number().positive().optional(),
      dashLength: z.number().positive().optional().describe('Length of dashes in pixels (default: 16)'),
    }),
  },
  addArrowPolyline: {
    name: 'addArrowPolyline',
    description: 'Draw a line with an arrow at the end',
    inputSchema: z.object({
      positions: z.array(positionSchema).min(2).describe('Array of positions'),
      name: z.string().optional(),
      color: colorSchema.optional(),
      width: z.number().positive().optional(),
    }),
  },
  addOutlinedPolyline: {
    name: 'addOutlinedPolyline',
    description: 'Draw a line with an outline',
    inputSchema: z.object({
      positions: z.array(positionSchema).min(2).describe('Array of positions'),
      name: z.string().optional(),
      color: colorSchema.optional(),
      outlineColor: colorSchema.optional(),
      width: z.number().positive().optional(),
      outlineWidth: z.number().positive().optional().describe('Width of outline in pixels'),
    }),
  },
  enableFXAA: {
    name: 'enableFXAA',
    description: 'Enable or disable Fast Approximate Anti-Aliasing (FXAA)',
    inputSchema: z.object({
      enabled: z.boolean().describe('Enable FXAA anti-aliasing'),
    }),
  },
  setBloom: {
    name: 'setBloom',
    description: 'Configure bloom post-processing effect for bright objects',
    inputSchema: z.object({
      enabled: z.boolean().describe('Enable bloom effect'),
      brightness: z.number().min(0).max(2).optional().describe('Bloom brightness (default: 0.3)'),
      contrast: z.number().min(0).max(2).optional().describe('Bloom contrast (default: 128)'),
      glowOnly: z.boolean().optional().describe('Show only the glow without base image'),
    }),
  },
  getScreenPosition: {
    name: 'getScreenPosition',
    description: 'Convert geographic coordinates to screen pixel coordinates',
    inputSchema: z.object({
      longitude: z.number().min(-180).max(180),
      latitude: z.number().min(-90).max(90),
      height: z.number().optional().describe('Height in meters'),
    }),
  },
  getCartographic: {
    name: 'getCartographic',
    description: 'Convert screen coordinates to geographic lat/lon/height',
    inputSchema: z.object({
      x: z.number().describe('Screen X coordinate in pixels'),
      y: z.number().describe('Screen Y coordinate in pixels'),
    }),
  },
  splitImagery: {
    name: 'splitImagery',
    description: 'Enable split-screen comparison between two imagery layers',
    inputSchema: z.object({
      enabled: z.boolean().describe('Enable split screen mode'),
      position: z.number().min(0).max(1).optional().describe('Split position (0-1, default: 0.5)'),
    }),
  },
  pickEntity: {
    name: 'pickEntity',
    description: 'Get the entity at a given screen position',
    inputSchema: z.object({
      x: z.number().describe('Screen X coordinate in pixels'),
      y: z.number().describe('Screen Y coordinate in pixels'),
    }),
  },
  setSkybox: {
    name: 'setSkybox',
    description: 'Set the skybox background images',
    inputSchema: z.object({
      show: z.boolean().describe('Show or hide the skybox'),
    }),
  },
  highlight3DTile: {
    name: 'highlight3DTile',
    description: 'Highlight features in a 3D tileset by changing their color',
    inputSchema: z.object({
      id: z.string().describe('ID of the tileset'),
      featureId: z.number().optional().describe('Specific feature ID to highlight'),
      color: colorSchema.optional().describe('Highlight color'),
    }),
  },
  clip3DTiles: {
    name: 'clip3DTiles',
    description: 'Add clipping planes to a 3D tileset to cut through buildings or terrain',
    inputSchema: z.object({
      id: z.string().describe('ID of the tileset to clip'),
      enabled: z.boolean().describe('Enable or disable clipping'),
      planeNormal: z.object({
        x: z.number(),
        y: z.number(),
        z: z.number(),
      }).optional().describe('Clipping plane normal direction (default: horizontal cut)'),
      distance: z.number().optional().describe('Distance from origin along normal (default: 0)'),
    }),
  },
  clipTerrain: {
    name: 'clipTerrain',
    description: 'Add clipping planes to terrain to create cutaway views',
    inputSchema: z.object({
      enabled: z.boolean().describe('Enable or disable terrain clipping'),
      positions: z.array(positionSchema).min(3).optional().describe('Polygon vertices defining the clipping area'),
      height: z.number().optional().describe('Height of the clipping plane'),
    }),
  },
  addParticleSystem: {
    name: 'addParticleSystem',
    description: 'Add a particle system for fire, smoke, or explosion effects',
    inputSchema: z.object({
      id: z.string().describe('Unique ID for the particle system'),
      longitude: z.number().min(-180).max(180),
      latitude: z.number().min(-90).max(90),
      height: z.number().optional().describe('Height above ground in meters'),
      particleType: z.enum(['fire', 'smoke', 'explosion', 'custom']).describe('Type of particle effect'),
      emissionRate: z.number().positive().optional().describe('Particles per second (default: 50)'),
      lifetime: z.number().positive().optional().describe('Particle lifetime in seconds (default: 5)'),
      startColor: colorSchema.optional().describe('Starting color of particles'),
      endColor: colorSchema.optional().describe('Ending color of particles'),
      startScale: z.number().positive().optional().describe('Initial particle scale'),
      endScale: z.number().positive().optional().describe('Final particle scale'),
    }),
  },
  addWeatherEffect: {
    name: 'addWeatherEffect',
    description: 'Add weather effects like rain, snow, or fog',
    inputSchema: z.object({
      effectType: z.enum(['rain', 'snow', 'fog']).describe('Type of weather effect'),
      intensity: z.number().min(0).max(1).optional().describe('Effect intensity (0-1, default: 0.5)'),
    }),
  },
  addVolumetricCloud: {
    name: 'addVolumetricCloud',
    description: 'Add a 3D volumetric cloud at a location',
    inputSchema: z.object({
      id: z.string().describe('Unique ID for the cloud'),
      longitude: z.number().min(-180).max(180),
      latitude: z.number().min(-90).max(90),
      height: z.number().optional().describe('Cloud height in meters (default: 2000)'),
      scale: z.number().positive().optional().describe('Cloud scale (default: 1)'),
    }),
  },
  addLensFlare: {
    name: 'addLensFlare',
    description: 'Enable or disable lens flare effect from the sun',
    inputSchema: z.object({
      enabled: z.boolean().describe('Enable lens flare effect'),
      intensity: z.number().min(0).max(2).optional().describe('Flare intensity (default: 1)'),
    }),
  },
  setImageMaterial: {
    name: 'setImageMaterial',
    description: 'Apply an image/texture material to an entity (polygon, rectangle, ellipse, etc.)',
    inputSchema: z.object({
      entityId: z.string().describe('ID of the entity to apply material to'),
      imageUrl: z.string().describe('URL of the image texture'),
      repeatX: z.number().positive().optional().describe('Horizontal repeat count (default: 1)'),
      repeatY: z.number().positive().optional().describe('Vertical repeat count (default: 1)'),
    }),
  },
  setGridMaterial: {
    name: 'setGridMaterial',
    description: 'Apply a grid pattern material to an entity',
    inputSchema: z.object({
      entityId: z.string().describe('ID of the entity to apply material to'),
      color: colorSchema.optional().describe('Grid line color (default: white)'),
      cellAlpha: z.number().min(0).max(1).optional().describe('Cell transparency (default: 0.1)'),
      lineCountX: z.number().positive().optional().describe('Number of horizontal lines (default: 8)'),
      lineCountY: z.number().positive().optional().describe('Number of vertical lines (default: 8)'),
      lineThicknessX: z.number().positive().optional().describe('Horizontal line thickness (default: 1)'),
      lineThicknessY: z.number().positive().optional().describe('Vertical line thickness (default: 1)'),
    }),
  },
  setStripeMaterial: {
    name: 'setStripeMaterial',
    description: 'Apply a stripe pattern material to an entity',
    inputSchema: z.object({
      entityId: z.string().describe('ID of the entity to apply material to'),
      evenColor: colorSchema.optional().describe('Even stripe color (default: white)'),
      oddColor: colorSchema.optional().describe('Odd stripe color (default: black)'),
      offset: z.number().optional().describe('Stripe offset (default: 0)'),
      repeat: z.number().positive().optional().describe('Number of stripes (default: 4)'),
      orientation: z.enum(['HORIZONTAL', 'VERTICAL']).optional().describe('Stripe orientation (default: HORIZONTAL)'),
    }),
  },
  setCheckerboardMaterial: {
    name: 'setCheckerboardMaterial',
    description: 'Apply a checkerboard pattern material to an entity',
    inputSchema: z.object({
      entityId: z.string().describe('ID of the entity to apply material to'),
      evenColor: colorSchema.optional().describe('Even square color (default: white)'),
      oddColor: colorSchema.optional().describe('Odd square color (default: black)'),
      repeatX: z.number().positive().optional().describe('Horizontal repeat count (default: 4)'),
      repeatY: z.number().positive().optional().describe('Vertical repeat count (default: 4)'),
    }),
  },
  addPath: {
    name: 'addPath',
    description: 'Add a time-dynamic path visualization showing an entity moving along positions over time',
    inputSchema: z.object({
      positions: z.array(positionSchema).min(2).describe('Array of positions along the path'),
      timestamps: z.array(z.string()).min(2).describe('ISO 8601 timestamps for each position'),
      name: z.string().optional().describe('Name for the path'),
      color: colorSchema.optional().describe('Path color'),
      width: z.number().positive().optional().describe('Path width in pixels'),
      leadTime: z.number().optional().describe('Lead time in seconds (how far ahead to show the path)'),
      trailTime: z.number().optional().describe('Trail time in seconds (how far behind to show the path)'),
    }),
  },
  addWMTS: {
    name: 'addWMTS',
    description: 'Add a WMTS (Web Map Tile Service) imagery layer',
    inputSchema: z.object({
      url: z.string().describe('WMTS service URL'),
      layer: z.string().describe('WMTS layer identifier'),
      name: z.string().optional().describe('Name for the layer'),
      style: z.string().optional().describe('WMTS style name (default: "default")'),
      format: z.string().optional().describe('Tile format (default: "image/jpeg")'),
      tileMatrixSetID: z.string().optional().describe('Tile matrix set identifier'),
    }),
  },
};

type ToolName = keyof typeof tools;
type ToolInput<T extends ToolName> = z.infer<typeof tools[T]['inputSchema']>;

// Command handler type
type CommandHandler = (command: CesiumCommand) => Promise<{ success: boolean; message: string; data?: unknown }>;

export class CesiumMCPServer {
  private transport: BrowserTransport;
  private commandHandler: CommandHandler;
  private requestId: number = 0;
  private pendingRequests: Map<string | number, {
    resolve: (value: unknown) => void;
    reject: (reason: unknown) => void;
  }> = new Map();

  constructor(transport: BrowserTransport, commandHandler: CommandHandler) {
    this.transport = transport;
    this.commandHandler = commandHandler;
    this.setupMessageHandler();
  }

  private setupMessageHandler(): void {
    this.transport.onMessage(async (message: MCPMessage) => {
      if (message.method) {
        // This is a request
        await this.handleRequest(message);
      } else if (message.id !== undefined) {
        // This is a response
        this.handleResponse(message);
      }
    });
  }

  private async handleRequest(message: MCPMessage): Promise<void> {
    const { id, method, params } = message;

    try {
      let result: unknown;

      switch (method) {
        case 'initialize':
          result = this.handleInitialize();
          break;
        case 'tools/list':
          result = this.handleToolsList();
          break;
        case 'tools/call':
          result = await this.handleToolCall(params as { name: string; arguments: unknown });
          break;
        case 'resources/list':
          result = this.handleResourcesList();
          break;
        case 'resources/read':
          result = this.handleResourceRead(params as { uri: string });
          break;
        default:
          throw new Error(`Unknown method: ${method}`);
      }

      this.sendResponse(id, result);
    } catch (error) {
      this.sendError(id, -32603, error instanceof Error ? error.message : 'Internal error');
    }
  }

  private handleResponse(message: MCPMessage): void {
    const pending = this.pendingRequests.get(message.id!);
    if (pending) {
      this.pendingRequests.delete(message.id!);
      if (message.error) {
        pending.reject(new Error(message.error.message));
      } else {
        pending.resolve(message.result);
      }
    }
  }

  private handleInitialize(): object {
    return {
      protocolVersion: '2024-11-05',
      serverInfo: {
        name: 'cesium-mcp-server',
        version: '1.0.0',
      },
      capabilities: {
        tools: {},
        resources: {},
      },
    };
  }

  private handleToolsList(): object {
    const toolList = Object.values(tools).map(tool => ({
      name: tool.name,
      description: tool.description,
      inputSchema: this.zodToJsonSchema(tool.inputSchema),
    }));

    return { tools: toolList };
  }

  private async handleToolCall(params: { name: string; arguments: unknown }): Promise<object> {
    const { name, arguments: args } = params;
    const tool = tools[name as ToolName];

    if (!tool) {
      throw new Error(`Unknown tool: ${name}`);
    }

    // Validate input
    const validatedInput = tool.inputSchema.parse(args);

    // Execute tool
    const result = await this.executeTool(name as ToolName, validatedInput);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  }

  private async executeTool(name: ToolName, input: unknown): Promise<{ success: boolean; message: string; data?: unknown }> {
    switch (name) {
      case 'flyTo': {
        const args = input as ToolInput<'flyTo'>;
        const command: CesiumCommand = {
          type: 'camera.flyTo',
          destination: {
            longitude: args.longitude,
            latitude: args.latitude,
            height: args.height || 1000000,
          },
          duration: args.duration,
        };
        return this.commandHandler(command);
      }

      case 'lookAt': {
        const args = input as ToolInput<'lookAt'>;
        const command: CesiumCommand = {
          type: 'camera.lookAt',
          target: {
            longitude: args.longitude,
            latitude: args.latitude,
          },
          offset: args.range ? {
            heading: 0,
            pitch: -Math.PI / 4,
            range: args.range,
          } : undefined,
        };
        return this.commandHandler(command);
      }

      case 'zoom': {
        const args = input as ToolInput<'zoom'>;
        const command: CesiumCommand = {
          type: 'camera.zoom',
          amount: args.amount,
        };
        return this.commandHandler(command);
      }

      case 'addPoint': {
        const args = input as ToolInput<'addPoint'>;
        const entity = czmlGenerator.createPoint(
          { longitude: args.longitude, latitude: args.latitude },
          { name: args.name, color: args.color, pixelSize: args.size }
        );
        const command: CesiumCommand = {
          type: 'entity.add',
          entity,
        };
        return this.commandHandler(command);
      }

      case 'addLabel': {
        const args = input as ToolInput<'addLabel'>;
        const entity = czmlGenerator.createLabel(
          { longitude: args.longitude, latitude: args.latitude },
          args.text,
          { fillColor: args.color }
        );
        const command: CesiumCommand = {
          type: 'entity.add',
          entity,
        };
        return this.commandHandler(command);
      }

      case 'addPolyline': {
        const args = input as ToolInput<'addPolyline'>;
        const entity = czmlGenerator.createPolyline(
          args.positions as CartographicPosition[],
          { name: args.name, color: args.color, width: args.width }
        );
        const command: CesiumCommand = {
          type: 'entity.add',
          entity,
        };
        return this.commandHandler(command);
      }

      case 'addPolygon': {
        const args = input as ToolInput<'addPolygon'>;
        const entity = czmlGenerator.createPolygon(
          args.positions as CartographicPosition[],
          { name: args.name, color: args.color, extrudedHeight: args.extrudedHeight }
        );
        const command: CesiumCommand = {
          type: 'entity.add',
          entity,
        };
        return this.commandHandler(command);
      }

      case 'addCircle': {
        const args = input as ToolInput<'addCircle'>;
        const entity = czmlGenerator.createCircle(
          { longitude: args.longitude, latitude: args.latitude },
          args.radius,
          { name: args.name, color: args.color }
        );
        const command: CesiumCommand = {
          type: 'entity.add',
          entity,
        };
        return this.commandHandler(command);
      }

      case 'addSphere': {
        const args = input as ToolInput<'addSphere'>;
        const entity = czmlGenerator.createSphere(
          { longitude: args.longitude, latitude: args.latitude, height: args.height },
          args.radius,
          { name: args.name, color: args.color }
        );
        const command: CesiumCommand = {
          type: 'entity.add',
          entity,
        };
        return this.commandHandler(command);
      }

      case 'addEllipsoid': {
        const args = input as ToolInput<'addEllipsoid'>;
        const entity = czmlGenerator.createEllipsoid(
          { longitude: args.longitude, latitude: args.latitude, height: args.height },
          { x: args.radiiX, y: args.radiiY, z: args.radiiZ },
          { name: args.name, color: args.color }
        );
        const command: CesiumCommand = {
          type: 'entity.add',
          entity,
        };
        return this.commandHandler(command);
      }

      case 'addCylinder': {
        const args = input as ToolInput<'addCylinder'>;
        const entity = czmlGenerator.createCylinder(
          { longitude: args.longitude, latitude: args.latitude },
          {
            length: args.length,
            topRadius: args.topRadius,
            bottomRadius: args.bottomRadius,
            name: args.name,
            color: args.color,
          }
        );
        const command: CesiumCommand = {
          type: 'entity.add',
          entity,
        };
        return this.commandHandler(command);
      }

      case 'addCorridor': {
        const args = input as ToolInput<'addCorridor'>;
        const entity = czmlGenerator.createCorridor(
          args.positions as CartographicPosition[],
          args.width,
          {
            name: args.name,
            color: args.color,
            height: args.height,
            extrudedHeight: args.extrudedHeight,
          }
        );
        const command: CesiumCommand = {
          type: 'entity.add',
          entity,
        };
        return this.commandHandler(command);
      }

      case 'addRectangle': {
        const args = input as ToolInput<'addRectangle'>;
        const entity = czmlGenerator.createRectangle(
          { west: args.west, south: args.south, east: args.east, north: args.north },
          {
            name: args.name,
            color: args.color,
            height: args.height,
            extrudedHeight: args.extrudedHeight,
          }
        );
        const command: CesiumCommand = {
          type: 'entity.add',
          entity,
        };
        return this.commandHandler(command);
      }

      case 'addWall': {
        const args = input as ToolInput<'addWall'>;
        const entity = czmlGenerator.createWall(
          args.positions as CartographicPosition[],
          {
            name: args.name,
            color: args.color,
            minimumHeights: args.minimumHeights,
            maximumHeights: args.maximumHeights,
          }
        );
        const command: CesiumCommand = {
          type: 'entity.add',
          entity,
        };
        return this.commandHandler(command);
      }

      case 'addBox': {
        const args = input as ToolInput<'addBox'>;
        const entity = czmlGenerator.createBox(
          { longitude: args.longitude, latitude: args.latitude },
          { x: args.dimensionX, y: args.dimensionY, z: args.dimensionZ },
          { name: args.name, color: args.color }
        );
        const command: CesiumCommand = {
          type: 'entity.add',
          entity,
        };
        return this.commandHandler(command);
      }

      case 'addModel': {
        const args = input as ToolInput<'addModel'>;
        const entity = czmlGenerator.createModel(
          { longitude: args.longitude, latitude: args.latitude },
          args.url,
          { name: args.name, scale: args.scale }
        );
        const command: CesiumCommand = {
          type: 'entity.add',
          entity,
        };
        return this.commandHandler(command);
      }

      case 'flyToEntity': {
        const args = input as ToolInput<'flyToEntity'>;
        const command: CesiumCommand = {
          type: 'entity.flyTo',
          entityId: args.entityId,
          duration: args.duration,
          offset: (args.heading !== undefined || args.pitch !== undefined || args.range !== undefined) ? {
            heading: args.heading !== undefined ? args.heading * Math.PI / 180 : undefined,
            pitch: args.pitch !== undefined ? args.pitch * Math.PI / 180 : undefined,
            range: args.range,
          } : undefined,
        };
        return this.commandHandler(command);
      }

      case 'showEntity': {
        const args = input as ToolInput<'showEntity'>;
        const command: CesiumCommand = {
          type: 'entity.show',
          entityId: args.entityId,
        };
        return this.commandHandler(command);
      }

      case 'hideEntity': {
        const args = input as ToolInput<'hideEntity'>;
        const command: CesiumCommand = {
          type: 'entity.hide',
          entityId: args.entityId,
        };
        return this.commandHandler(command);
      }

      case 'removeEntity': {
        const args = input as ToolInput<'removeEntity'>;
        const command: CesiumCommand = {
          type: 'entity.remove',
          id: args.id,
        };
        return this.commandHandler(command);
      }

      case 'updateEntity': {
        const args = input as ToolInput<'updateEntity'>;
        const command: CesiumCommand = {
          type: 'entity.update',
          id: args.id,
          properties: {
            name: args.name,
            description: args.description,
          },
        };
        return this.commandHandler(command);
      }

      case 'cloneEntity': {
        const args = input as ToolInput<'cloneEntity'>;
        const command: CesiumCommand = {
          type: 'entity.clone',
          entityId: args.entityId,
          newName: args.newName,
        };
        return this.commandHandler(command);
      }

      case 'clearAll': {
        // Special handling - not a standard command
        return { success: true, message: 'All entities cleared', data: { action: 'clearAll' } };
      }

      case 'setSceneMode': {
        const args = input as ToolInput<'setSceneMode'>;
        const command: CesiumCommand = {
          type: 'scene.mode',
          mode: args.mode,
        };
        return this.commandHandler(command);
      }

      case 'setTime': {
        const args = input as ToolInput<'setTime'>;
        const command: CesiumCommand = {
          type: 'time.set',
          currentTime: args.time,
          multiplier: args.multiplier,
        };
        return this.commandHandler(command);
      }

      case 'playAnimation': {
        const command: CesiumCommand = { type: 'time.play' };
        return this.commandHandler(command);
      }

      case 'pauseAnimation': {
        const command: CesiumCommand = { type: 'time.pause' };
        return this.commandHandler(command);
      }

      case 'generateCZML': {
        const args = input as ToolInput<'generateCZML'>;
        const entities: CZMLPacket[] = args.entities.map(entity => {
          switch (entity.type) {
            case 'point':
              return czmlGenerator.createPoint(entity.position!, { name: entity.name, color: entity.color });
            case 'label':
              return czmlGenerator.createLabel(entity.position!, entity.text || '', { fillColor: entity.color });
            case 'polyline':
              return czmlGenerator.createPolyline(entity.positions as CartographicPosition[], { name: entity.name, color: entity.color });
            case 'polygon':
              return czmlGenerator.createPolygon(entity.positions as CartographicPosition[], { name: entity.name, color: entity.color });
            case 'circle':
              return czmlGenerator.createCircle(entity.position!, entity.radius || 1000, { name: entity.name, color: entity.color });
            default:
              throw new Error(`Unknown entity type`);
          }
        });

        const czml = czmlGenerator.buildCZMLDocument(entities, { name: args.documentName });
        return { success: true, message: 'CZML generated', data: { czml } };
      }

      case 'trackVehicle': {
        const args = input as ToolInput<'trackVehicle'>;

        if (args.positions.length !== args.timestamps.length) {
          throw new Error('Positions and timestamps arrays must have the same length');
        }

        const vehicleTrack = czmlGenerator.createVehicleTrack(
          args.positions as CartographicPosition[],
          args.timestamps,
          {
            name: args.name,
            color: args.color,
            width: args.width,
            showPath: args.showPath,
            trailTime: args.trailTime,
            leadTime: args.leadTime,
            modelUrl: args.modelUrl,
            modelScale: args.modelScale,
            orientAlongPath: args.orientAlongPath,
          }
        );

        const czml = czmlGenerator.buildCZMLDocument([vehicleTrack], {
          name: args.name || 'Vehicle Track',
          startTime: args.timestamps[0],
          stopTime: args.timestamps[args.timestamps.length - 1],
        });

        const command: CesiumCommand = {
          type: 'entity.add',
          entity: vehicleTrack,
        };

        const result = await this.commandHandler(command);
        return {
          ...result,
          data: { ...(result.data as object || {}), czml, entityId: vehicleTrack.id },
        };
      }

      case 'addAnimatedPath': {
        const args = input as ToolInput<'addAnimatedPath'>;

        const animatedPathPackets = czmlGenerator.createAnimatedPolyline(
          args.positions as CartographicPosition[],
          args.startTime,
          args.duration,
          {
            name: args.name,
            color: args.color,
            width: args.width,
            clampToGround: args.clampToGround,
            showPoint: args.showPoint,
            pointColor: args.pointColor,
            pointSize: args.pointSize,
          }
        );

        const stopTime = new Date(new Date(args.startTime).getTime() + args.duration * 1000);
        const czml = czmlGenerator.buildCZMLDocument(animatedPathPackets, {
          name: args.name || 'Animated Path',
          startTime: args.startTime,
          stopTime: stopTime.toISOString(),
        });

        // Add all packets as entities
        const entityIds: string[] = [];
        for (const packet of animatedPathPackets) {
          const command: CesiumCommand = {
            type: 'entity.add',
            entity: packet,
          };
          await this.commandHandler(command);
          entityIds.push(packet.id);
        }

        return {
          success: true,
          message: `Animated path created with ${animatedPathPackets.length} segments`,
          data: { czml, entityIds },
        };
      }

      case 'load3DTiles': {
        const args = input as ToolInput<'load3DTiles'>;
        const command: CesiumCommand = {
          type: 'tiles3d.add',
          id: args.id,
          url: args.url,
          assetId: args.assetId,
          maximumScreenSpaceError: args.maximumScreenSpaceError,
          maximumMemoryUsage: args.maximumMemoryUsage,
          show: args.show,
        };
        return this.commandHandler(command);
      }

      case 'remove3DTiles': {
        const args = input as ToolInput<'remove3DTiles'>;
        const command: CesiumCommand = {
          type: 'tiles3d.remove',
          id: args.id,
        };
        return this.commandHandler(command);
      }

      case 'style3DTiles': {
        const args = input as ToolInput<'style3DTiles'>;
        const command: CesiumCommand = {
          type: 'tiles3d.style',
          id: args.id,
          style: {
            color: args.color,
            show: args.show,
            pointSize: args.pointSize,
          },
        };
        return this.commandHandler(command);
      }

      case 'setTerrainExaggeration': {
        const args = input as ToolInput<'setTerrainExaggeration'>;
        const command: CesiumCommand = {
          type: 'terrain.exaggeration',
          factor: args.factor,
          relativeHeight: args.relativeHeight,
        };
        return this.commandHandler(command);
      }

      case 'orbitTarget': {
        const args = input as ToolInput<'orbitTarget'>;
        const command: CesiumCommand = {
          type: 'camera.orbit',
          target: {
            longitude: args.longitude,
            latitude: args.latitude,
            height: args.height,
          },
          duration: args.duration,
          headingDelta: args.headingDelta,
          pitchDelta: args.pitchDelta,
        };
        return this.commandHandler(command);
      }

      case 'trackEntity': {
        const args = input as ToolInput<'trackEntity'>;
        const command: CesiumCommand = {
          type: 'camera.track',
          entityId: args.entityId,
          offset: (args.heading !== undefined || args.pitch !== undefined || args.range !== undefined) ? {
            heading: args.heading ?? 0,
            pitch: args.pitch ?? -Math.PI / 4,
            range: args.range ?? 10000,
          } : undefined,
        };
        return this.commandHandler(command);
      }

      case 'cinematicFlight': {
        const args = input as ToolInput<'cinematicFlight'>;
        const command: CesiumCommand = {
          type: 'camera.cinematicFlight',
          waypoints: args.waypoints.map(wp => ({
            position: {
              longitude: wp.longitude,
              latitude: wp.latitude,
              height: wp.height,
            },
            duration: wp.duration,
            orientation: (wp.heading !== undefined || wp.pitch !== undefined || wp.roll !== undefined) ? {
              heading: wp.heading,
              pitch: wp.pitch,
              roll: wp.roll,
            } : undefined,
          })),
          loop: args.loop,
        };
        return this.commandHandler(command);
      }

      case 'stopTracking': {
        // This requires direct access to the executor - return a special action
        return { success: true, message: 'Stop tracking requested', data: { action: 'stopTracking' } };
      }

      case 'stopCinematicFlight': {
        // This requires direct access to the executor - return a special action
        return { success: true, message: 'Stop cinematic flight requested', data: { action: 'stopCinematicFlight' } };
      }

      case 'stopOrbit': {
        // This requires direct access to the executor - return a special action
        return { success: true, message: 'Stop orbit requested', data: { action: 'stopOrbit' } };
      }

      case 'addBillboard': {
        const args = input as ToolInput<'addBillboard'>;
        const entity = czmlGenerator.createBillboard(
          { longitude: args.longitude, latitude: args.latitude },
          args.image,
          { name: args.name, scale: args.scale }
        );
        const command: CesiumCommand = {
          type: 'entity.add',
          entity,
        };
        return this.commandHandler(command);
      }

      case 'setView': {
        const args = input as ToolInput<'setView'>;
        const command: CesiumCommand = {
          type: 'camera.setView',
          destination: {
            longitude: args.longitude,
            latitude: args.latitude,
            height: args.height,
          },
          orientation: (args.heading !== undefined || args.pitch !== undefined || args.roll !== undefined) ? {
            heading: args.heading !== undefined ? args.heading * Math.PI / 180 : undefined,
            pitch: args.pitch !== undefined ? args.pitch * Math.PI / 180 : undefined,
            roll: args.roll !== undefined ? args.roll * Math.PI / 180 : undefined,
          } : undefined,
        };
        return this.commandHandler(command);
      }

      case 'getCamera': {
        const command: CesiumCommand = { type: 'camera.get' };
        return this.commandHandler(command);
      }

      case 'selectEntity': {
        const args = input as ToolInput<'selectEntity'>;
        const command: CesiumCommand = {
          type: 'entity.select',
          entityId: args.entityId,
        };
        return this.commandHandler(command);
      }

      case 'listEntities': {
        const command: CesiumCommand = { type: 'entity.list' };
        return this.commandHandler(command);
      }

      case 'loadGeoJSON': {
        const args = input as ToolInput<'loadGeoJSON'>;
        const command: CesiumCommand = {
          type: 'data.loadGeoJSON',
          url: args.url,
          name: args.name,
          clampToGround: args.clampToGround,
          stroke: args.stroke,
          fill: args.fill,
          strokeWidth: args.strokeWidth,
        };
        return this.commandHandler(command);
      }

      case 'loadKML': {
        const args = input as ToolInput<'loadKML'>;
        const command: CesiumCommand = {
          type: 'data.loadKML',
          url: args.url,
          name: args.name,
          clampToGround: args.clampToGround,
        };
        return this.commandHandler(command);
      }

      case 'setFog': {
        const args = input as ToolInput<'setFog'>;
        const command: CesiumCommand = {
          type: 'scene.fog',
          enabled: args.enabled,
          density: args.density,
        };
        return this.commandHandler(command);
      }

      case 'setShadows': {
        const args = input as ToolInput<'setShadows'>;
        const command: CesiumCommand = {
          type: 'scene.shadows',
          enabled: args.enabled,
          softShadows: args.softShadows,
        };
        return this.commandHandler(command);
      }

      case 'rotateCamera': {
        const args = input as ToolInput<'rotateCamera'>;
        const command: CesiumCommand = {
          type: 'camera.rotate',
          heading: args.heading !== undefined ? args.heading * Math.PI / 180 : undefined,
          pitch: args.pitch !== undefined ? args.pitch * Math.PI / 180 : undefined,
          roll: args.roll !== undefined ? args.roll * Math.PI / 180 : undefined,
        };
        return this.commandHandler(command);
      }

      case 'loadCZML': {
        const args = input as ToolInput<'loadCZML'>;
        const command: CesiumCommand = {
          type: 'data.loadCZML',
          url: args.url,
          name: args.name,
        };
        return this.commandHandler(command);
      }

      case 'getEntityInfo': {
        const args = input as ToolInput<'getEntityInfo'>;
        const command: CesiumCommand = {
          type: 'entity.getInfo',
          entityId: args.entityId,
        };
        return this.commandHandler(command);
      }

      case 'setAnimationSpeed': {
        const args = input as ToolInput<'setAnimationSpeed'>;
        const command: CesiumCommand = {
          type: 'time.speed',
          multiplier: args.multiplier,
        };
        return this.commandHandler(command);
      }

      case 'removeImagery': {
        const args = input as ToolInput<'removeImagery'>;
        const command: CesiumCommand = {
          type: 'imagery.remove',
          index: args.index,
        };
        return this.commandHandler(command);
      }

      case 'setImageryAlpha': {
        const args = input as ToolInput<'setImageryAlpha'>;
        const command: CesiumCommand = {
          type: 'imagery.alpha',
          index: args.index,
          alpha: args.alpha,
        };
        return this.commandHandler(command);
      }

      case 'setLighting': {
        const args = input as ToolInput<'setLighting'>;
        const command: CesiumCommand = {
          type: 'scene.lighting',
          enableLighting: args.enableLighting,
          sunPosition: args.sunPosition,
        };
        return this.commandHandler(command);
      }

      case 'setAtmosphere': {
        const args = input as ToolInput<'setAtmosphere'>;
        const command: CesiumCommand = {
          type: 'scene.atmosphere',
          show: args.show,
          brightnessShift: args.brightnessShift,
          hueShift: args.hueShift,
          saturationShift: args.saturationShift,
        };
        return this.commandHandler(command);
      }

      case 'setGlobe': {
        const args = input as ToolInput<'setGlobe'>;
        const command: CesiumCommand = {
          type: 'scene.globe',
          show: args.show,
          showGroundAtmosphere: args.showGroundAtmosphere,
          enableLighting: args.enableLighting,
          baseColor: args.baseColor,
        };
        return this.commandHandler(command);
      }

      case 'loadGPX': {
        const args = input as ToolInput<'loadGPX'>;
        const command: CesiumCommand = {
          type: 'data.loadGPX',
          url: args.url,
          name: args.name,
          clampToGround: args.clampToGround,
        };
        return this.commandHandler(command);
      }

      case 'setImageryBrightness': {
        const args = input as ToolInput<'setImageryBrightness'>;
        const command: CesiumCommand = {
          type: 'imagery.brightness',
          index: args.index,
          brightness: args.brightness,
          contrast: args.contrast,
          saturation: args.saturation,
          gamma: args.gamma,
        };
        return this.commandHandler(command);
      }

      case 'addWMS': {
        const args = input as ToolInput<'addWMS'>;
        const command: CesiumCommand = {
          type: 'imagery.addWMS',
          url: args.url,
          layers: args.layers,
          name: args.name,
        };
        return this.commandHandler(command);
      }

      case 'measureDistance': {
        const args = input as ToolInput<'measureDistance'>;
        const command: CesiumCommand = {
          type: 'measure.distance',
          start: args.start as CartographicPosition,
          end: args.end as CartographicPosition,
        };
        return this.commandHandler(command);
      }

      case 'sampleTerrainHeight': {
        const args = input as ToolInput<'sampleTerrainHeight'>;
        const command: CesiumCommand = {
          type: 'terrain.sample',
          longitude: args.longitude,
          latitude: args.latitude,
        };
        return this.commandHandler(command);
      }

      case 'enableDepthTest': {
        const args = input as ToolInput<'enableDepthTest'>;
        const command: CesiumCommand = {
          type: 'scene.depthTest',
          enabled: args.enabled,
        };
        return this.commandHandler(command);
      }

      case 'addGlowingPolyline': {
        const args = input as ToolInput<'addGlowingPolyline'>;
        const entity = czmlGenerator.createGlowingPolyline(
          args.positions as CartographicPosition[],
          { name: args.name, color: args.color, width: args.width, glowPower: args.glowPower }
        );
        const command: CesiumCommand = {
          type: 'entity.add',
          entity,
        };
        return this.commandHandler(command);
      }

      case 'addDashedPolyline': {
        const args = input as ToolInput<'addDashedPolyline'>;
        const entity = czmlGenerator.createDashedPolyline(
          args.positions as CartographicPosition[],
          { name: args.name, color: args.color, width: args.width, dashLength: args.dashLength }
        );
        const command: CesiumCommand = {
          type: 'entity.add',
          entity,
        };
        return this.commandHandler(command);
      }

      case 'addArrowPolyline': {
        const args = input as ToolInput<'addArrowPolyline'>;
        const entity = czmlGenerator.createArrowPolyline(
          args.positions as CartographicPosition[],
          { name: args.name, color: args.color, width: args.width }
        );
        const command: CesiumCommand = {
          type: 'entity.add',
          entity,
        };
        return this.commandHandler(command);
      }

      case 'addOutlinedPolyline': {
        const args = input as ToolInput<'addOutlinedPolyline'>;
        const entity = czmlGenerator.createOutlinedPolyline(
          args.positions as CartographicPosition[],
          { name: args.name, color: args.color, outlineColor: args.outlineColor, width: args.width, outlineWidth: args.outlineWidth }
        );
        const command: CesiumCommand = {
          type: 'entity.add',
          entity,
        };
        return this.commandHandler(command);
      }

      case 'enableFXAA': {
        const args = input as ToolInput<'enableFXAA'>;
        const command: CesiumCommand = {
          type: 'scene.fxaa',
          enabled: args.enabled,
        };
        return this.commandHandler(command);
      }

      case 'setBloom': {
        const args = input as ToolInput<'setBloom'>;
        const command: CesiumCommand = {
          type: 'scene.bloom',
          enabled: args.enabled,
          brightness: args.brightness,
          contrast: args.contrast,
          glowOnly: args.glowOnly,
        };
        return this.commandHandler(command);
      }

      case 'getScreenPosition': {
        const args = input as ToolInput<'getScreenPosition'>;
        const command: CesiumCommand = {
          type: 'pick.screenPosition',
          longitude: args.longitude,
          latitude: args.latitude,
          height: args.height,
        };
        return this.commandHandler(command);
      }

      case 'getCartographic': {
        const args = input as ToolInput<'getCartographic'>;
        const command: CesiumCommand = {
          type: 'pick.cartographic',
          x: args.x,
          y: args.y,
        };
        return this.commandHandler(command);
      }

      case 'splitImagery': {
        const args = input as ToolInput<'splitImagery'>;
        const command: CesiumCommand = {
          type: 'imagery.split',
          enabled: args.enabled,
          position: args.position,
        };
        return this.commandHandler(command);
      }

      case 'pickEntity': {
        const args = input as ToolInput<'pickEntity'>;
        const command: CesiumCommand = {
          type: 'pick.entity',
          x: args.x,
          y: args.y,
        };
        return this.commandHandler(command);
      }

      case 'setSkybox': {
        const args = input as ToolInput<'setSkybox'>;
        const command: CesiumCommand = {
          type: 'scene.skybox',
          show: args.show,
        };
        return this.commandHandler(command);
      }

      case 'highlight3DTile': {
        const args = input as ToolInput<'highlight3DTile'>;
        const command: CesiumCommand = {
          type: 'tiles3d.highlight',
          id: args.id,
          featureId: args.featureId,
          color: args.color,
        };
        return this.commandHandler(command);
      }

      case 'clip3DTiles': {
        const args = input as ToolInput<'clip3DTiles'>;
        const command: CesiumCommand = {
          type: 'tiles3d.clip',
          id: args.id,
          enabled: args.enabled,
          planeNormal: args.planeNormal,
          distance: args.distance,
        };
        return this.commandHandler(command);
      }

      case 'clipTerrain': {
        const args = input as ToolInput<'clipTerrain'>;
        const command: CesiumCommand = {
          type: 'terrain.clip',
          enabled: args.enabled,
          positions: args.positions?.map(p => ({ longitude: p.longitude, latitude: p.latitude })),
          height: args.height,
        };
        return this.commandHandler(command);
      }

      case 'addParticleSystem': {
        const args = input as ToolInput<'addParticleSystem'>;
        const command: CesiumCommand = {
          type: 'particles.add',
          id: args.id,
          longitude: args.longitude,
          latitude: args.latitude,
          height: args.height,
          particleType: args.particleType,
          emissionRate: args.emissionRate,
          lifetime: args.lifetime,
          startColor: args.startColor,
          endColor: args.endColor,
          startScale: args.startScale,
          endScale: args.endScale,
        };
        return this.commandHandler(command);
      }

      case 'addWeatherEffect': {
        const args = input as ToolInput<'addWeatherEffect'>;
        const command: CesiumCommand = {
          type: 'weather.add',
          effectType: args.effectType,
          intensity: args.intensity,
        };
        return this.commandHandler(command);
      }

      case 'addVolumetricCloud': {
        const args = input as ToolInput<'addVolumetricCloud'>;
        const command: CesiumCommand = {
          type: 'clouds.add',
          id: args.id,
          longitude: args.longitude,
          latitude: args.latitude,
          height: args.height,
          scale: args.scale,
        };
        return this.commandHandler(command);
      }

      case 'addLensFlare': {
        const args = input as ToolInput<'addLensFlare'>;
        const command: CesiumCommand = {
          type: 'effects.lensFlare',
          enabled: args.enabled,
          intensity: args.intensity,
        };
        return this.commandHandler(command);
      }

      case 'setImageMaterial': {
        const args = input as ToolInput<'setImageMaterial'>;
        const command: CesiumCommand = {
          type: 'material.image',
          entityId: args.entityId,
          imageUrl: args.imageUrl,
          repeatX: args.repeatX,
          repeatY: args.repeatY,
        };
        return this.commandHandler(command);
      }

      case 'setGridMaterial': {
        const args = input as ToolInput<'setGridMaterial'>;
        const command: CesiumCommand = {
          type: 'material.grid',
          entityId: args.entityId,
          color: args.color,
          cellAlpha: args.cellAlpha,
          lineCountX: args.lineCountX,
          lineCountY: args.lineCountY,
          lineThicknessX: args.lineThicknessX,
          lineThicknessY: args.lineThicknessY,
        };
        return this.commandHandler(command);
      }

      case 'setStripeMaterial': {
        const args = input as ToolInput<'setStripeMaterial'>;
        const command: CesiumCommand = {
          type: 'material.stripe',
          entityId: args.entityId,
          evenColor: args.evenColor,
          oddColor: args.oddColor,
          offset: args.offset,
          repeat: args.repeat,
          orientation: args.orientation,
        };
        return this.commandHandler(command);
      }

      case 'setCheckerboardMaterial': {
        const args = input as ToolInput<'setCheckerboardMaterial'>;
        const command: CesiumCommand = {
          type: 'material.checkerboard',
          entityId: args.entityId,
          evenColor: args.evenColor,
          oddColor: args.oddColor,
          repeatX: args.repeatX,
          repeatY: args.repeatY,
        };
        return this.commandHandler(command);
      }

      case 'addPath': {
        const args = input as ToolInput<'addPath'>;

        if (args.positions.length !== args.timestamps.length) {
          throw new Error('Positions and timestamps arrays must have the same length');
        }

        const pathEntity = czmlGenerator.createPath(
          args.positions as CartographicPosition[],
          args.timestamps,
          {
            name: args.name,
            color: args.color,
            width: args.width,
            leadTime: args.leadTime,
            trailTime: args.trailTime,
            showPath: true,
          }
        );

        const czml = czmlGenerator.buildCZMLDocument([pathEntity], {
          name: args.name || 'Path',
          startTime: args.timestamps[0],
          stopTime: args.timestamps[args.timestamps.length - 1],
        });

        const command: CesiumCommand = {
          type: 'entity.add',
          entity: pathEntity,
        };

        const result = await this.commandHandler(command);
        return {
          ...result,
          data: { ...(result.data as object || {}), czml, entityId: pathEntity.id },
        };
      }

      case 'addWMTS': {
        const args = input as ToolInput<'addWMTS'>;
        const command: CesiumCommand = {
          type: 'imagery.addWMTS',
          url: args.url,
          layer: args.layer,
          name: args.name,
          style: args.style,
          format: args.format,
          tileMatrixSetID: args.tileMatrixSetID,
        };
        return this.commandHandler(command);
      }

      default:
        throw new Error(`Tool not implemented: ${name}`);
    }
  }

  private handleResourcesList(): object {
    return {
      resources: [
        {
          uri: 'cesium://scene/state',
          name: 'Current Scene State',
          description: 'Current state of the CesiumJS scene',
          mimeType: 'application/json',
        },
        {
          uri: 'cesium://entities',
          name: 'Entity List',
          description: 'List of all entities in the scene',
          mimeType: 'application/json',
        },
        {
          uri: 'cesium://camera',
          name: 'Camera State',
          description: 'Current camera position and orientation',
          mimeType: 'application/json',
        },
      ],
    };
  }

  private handleResourceRead(params: { uri: string }): object {
    // Resource reading would need access to the actual Cesium viewer state
    // This is a placeholder that returns mock data
    const { uri } = params;

    switch (uri) {
      case 'cesium://scene/state':
        return {
          contents: [{
            uri,
            mimeType: 'application/json',
            text: JSON.stringify({ mode: '3D', entities: [] }),
          }],
        };
      case 'cesium://entities':
        return {
          contents: [{
            uri,
            mimeType: 'application/json',
            text: JSON.stringify({ entities: [] }),
          }],
        };
      case 'cesium://camera':
        return {
          contents: [{
            uri,
            mimeType: 'application/json',
            text: JSON.stringify({ position: { longitude: 0, latitude: 0, height: 10000000 } }),
          }],
        };
      default:
        throw new Error(`Unknown resource: ${uri}`);
    }
  }

  private sendResponse(id: string | number | undefined, result: unknown): void {
    if (id === undefined) return;

    this.transport.send({
      jsonrpc: '2.0',
      id,
      result,
    });
  }

  private sendError(id: string | number | undefined, code: number, message: string): void {
    if (id === undefined) return;

    this.transport.send({
      jsonrpc: '2.0',
      id,
      error: { code, message },
    });
  }

  async callTool(name: string, args: unknown): Promise<unknown> {
    const id = ++this.requestId;

    return new Promise((resolve, reject) => {
      this.pendingRequests.set(id, { resolve, reject });

      this.transport.send({
        jsonrpc: '2.0',
        id,
        method: 'tools/call',
        params: { name, arguments: args },
      });
    });
  }

  // Helper to convert Zod schema to JSON Schema
  private zodToJsonSchema(schema: z.ZodTypeAny): object {
    // Simplified conversion - in production, use zod-to-json-schema library
    if (schema instanceof z.ZodObject) {
      const shape = schema.shape;
      const properties: Record<string, object> = {};
      const required: string[] = [];

      for (const [key, value] of Object.entries(shape)) {
        const zodValue = value as z.ZodTypeAny;
        properties[key] = this.zodToJsonSchema(zodValue);

        if (!(zodValue instanceof z.ZodOptional)) {
          required.push(key);
        }
      }

      return {
        type: 'object',
        properties,
        required: required.length > 0 ? required : undefined,
      };
    }

    if (schema instanceof z.ZodString) {
      return { type: 'string' };
    }

    if (schema instanceof z.ZodNumber) {
      return { type: 'number' };
    }

    if (schema instanceof z.ZodBoolean) {
      return { type: 'boolean' };
    }

    if (schema instanceof z.ZodArray) {
      return {
        type: 'array',
        items: this.zodToJsonSchema(schema.element),
      };
    }

    if (schema instanceof z.ZodEnum) {
      return {
        type: 'string',
        enum: schema.options,
      };
    }

    if (schema instanceof z.ZodOptional) {
      return this.zodToJsonSchema(schema.unwrap());
    }

    return { type: 'any' };
  }

  getToolDefinitions(): { name: string; description: string; inputSchema: object }[] {
    return Object.values(tools).map(tool => ({
      name: tool.name,
      description: tool.description,
      inputSchema: this.zodToJsonSchema(tool.inputSchema),
    }));
  }
}
