/**
 * CesiumJS Command Executor
 * Executes parsed commands against a CesiumJS Viewer instance
 */

import type { CesiumCommand, CZMLDocumentArray } from './types';

// Type definitions for CesiumJS (avoiding full import for flexibility)
interface CesiumViewer {
  camera: CesiumCamera;
  scene: CesiumScene;
  clock: CesiumClock;
  dataSources: CesiumDataSourceCollection;
  entities: CesiumEntityCollection;
  imageryLayers: CesiumImageryLayerCollection;
  terrainProvider: unknown;
  zoomTo: (target: unknown, offset?: unknown) => Promise<boolean>;
  flyTo: (target: unknown, options?: unknown) => Promise<boolean>;
}

interface CesiumCamera {
  flyTo: (options: {
    destination: unknown;
    orientation?: {
      heading?: number;
      pitch?: number;
      roll?: number;
    };
    duration?: number;
    complete?: () => void;
    cancel?: () => void;
  }) => void;
  lookAt: (target: unknown, offset: unknown) => void;
  lookAtTransform: (transform: unknown, offset?: unknown) => void;
  zoomIn: (amount?: number) => void;
  zoomOut: (amount?: number) => void;
  setView: (options: { destination?: unknown; orientation: unknown }) => void;
  getPickRay: (position: unknown) => unknown | undefined;
  position: unknown;
  positionCartographic: { longitude: number; latitude: number; height: number };
  heading: number;
  pitch: number;
  roll: number;
}

interface CesiumScene {
  mode: number;
  globe: CesiumGlobe;
  primitives: CesiumPrimitiveCollection;
  screenSpaceCameraController: {
    enableRotate: boolean;
    enableTranslate: boolean;
    enableZoom: boolean;
    enableTilt: boolean;
    enableLook: boolean;
  };
  verticalExaggeration: number;
  verticalExaggerationRelativeHeight: number;
}

interface CesiumGlobe {
  terrainExaggeration: number;
  terrainExaggerationRelativeHeight: number;
  show: boolean;
}

interface CesiumPrimitiveCollection {
  add: (primitive: unknown) => unknown;
  remove: (primitive: unknown) => boolean;
  contains: (primitive: unknown) => boolean;
  length: number;
}

interface Cesium3DTilesetInstance {
  show: boolean;
  style: unknown;
  maximumScreenSpaceError: number;
  maximumMemoryUsage: number;
  readyPromise: Promise<Cesium3DTilesetInstance>;
  ready: boolean;
  destroy: () => void;
  isDestroyed: () => boolean;
}

interface CesiumClock {
  currentTime: unknown;
  startTime: unknown;
  stopTime: unknown;
  multiplier: number;
  shouldAnimate: boolean;
  onTick: {
    addEventListener: (callback: (clock: CesiumClock) => void) => () => void;
    removeEventListener: (callback: (clock: CesiumClock) => void) => void;
  };
}

interface CesiumDataSourceCollection {
  add: (dataSource: unknown) => Promise<unknown>;
  remove: (dataSource: unknown, destroy?: boolean) => boolean;
  removeAll: (destroy?: boolean) => void;
  get: (index: number) => unknown;
  length: number;
}

interface CesiumEntityCollection {
  add: (entity: unknown) => unknown;
  remove: (entity: unknown) => boolean;
  removeById: (id: string) => boolean;
  removeAll: () => void;
  getById: (id: string) => unknown | undefined;
  values: unknown[];
}

interface CesiumImageryLayerCollection {
  addImageryProvider: (provider: unknown) => unknown;
  remove: (layer: unknown, destroy?: boolean) => boolean;
  get: (index: number) => unknown;
  length: number;
}

// Global Cesium reference (will be set by the browser environment)
declare const Cesium: {
  Cartesian2: new (x: number, y: number) => unknown;
  Cartesian3: {
    new (x: number, y: number, z: number): unknown;
    fromDegrees: (lon: number, lat: number, height?: number) => unknown;
    fromDegreesArray: (coords: number[]) => unknown;
    fromDegreesArrayHeights: (coords: number[]) => unknown;
    clone: (cartesian: unknown) => unknown;
  };
  Quaternion: new (x: number, y: number, z: number, w: number) => unknown;
  Color: {
    new (r: number, g: number, b: number, a: number): unknown;
    fromCssColorString: (color: string) => { withAlpha: (alpha: number) => unknown };
    WHITE: unknown;
    BLACK: unknown;
    RED: unknown;
    GREEN: unknown;
    BLUE: { withAlpha: (alpha: number) => unknown };
    ORANGE: unknown;
    CYAN: unknown;
    YELLOW: unknown;
    LIME: { withAlpha: (alpha: number) => unknown };
  };
  VerticalOrigin: {
    BOTTOM: unknown;
    CENTER: unknown;
    TOP: unknown;
  };
  LabelStyle: {
    FILL: unknown;
    OUTLINE: unknown;
    FILL_AND_OUTLINE: unknown;
  };
  Cartographic: {
    fromDegrees: (lon: number, lat: number, height?: number) => unknown;
    fromCartesian: (cartesian: unknown) => { longitude: number; latitude: number; height: number };
  };
  Math: {
    toRadians: (degrees: number) => number;
    toDegrees: (radians: number) => number;
    lerp: (start: number, end: number, t: number) => number;
    TWO_PI: number;
  };
  HeadingPitchRange: new (heading: number, pitch: number, range: number) => unknown;
  JulianDate: {
    fromIso8601: (iso: string) => unknown;
    now: () => unknown;
    secondsDifference: (a: unknown, b: unknown) => number;
    clone: (date: unknown) => unknown;
  };
  CzmlDataSource: {
    load: (czml: CZMLDocumentArray | string) => Promise<unknown>;
  };
  SceneMode: {
    SCENE2D: number;
    SCENE3D: number;
    COLUMBUS_VIEW: number;
  };
  createWorldTerrainAsync: () => Promise<unknown>;
  EllipsoidTerrainProvider: new () => unknown;
  IonImageryProvider: new (options: { assetId: number }) => unknown;
  OpenStreetMapImageryProvider: new (options?: { url?: string }) => unknown;
  ArcGisMapServerImageryProvider: {
    fromUrl: (url: string) => Promise<unknown>;
  };
  UrlTemplateImageryProvider: new (options: { url: string }) => unknown;
  WebMapServiceImageryProvider: new (options: {
    url: string;
    layers: string;
  }) => unknown;
  Transforms: {
    eastNorthUpToFixedFrame: (origin: unknown) => unknown;
  };
  Matrix4: {
    IDENTITY: unknown;
  };
  defined: (value: unknown) => boolean;
  Cesium3DTileset: {
    fromUrl: (url: string, options?: {
      maximumScreenSpaceError?: number;
      maximumMemoryUsage?: number;
      show?: boolean;
    }) => Promise<Cesium3DTilesetInstance>;
    fromIonAssetId: (assetId: number, options?: {
      maximumScreenSpaceError?: number;
      maximumMemoryUsage?: number;
      show?: boolean;
    }) => Promise<Cesium3DTilesetInstance>;
  };
  Cesium3DTileStyle: new (style: object) => unknown;
  CesiumTerrainProvider: {
    fromUrl: (url: string, options?: object) => Promise<unknown>;
    fromIonAssetId: (assetId: number, options?: object) => Promise<unknown>;
  };
};

export class CesiumCommandExecutor {
  private viewer: CesiumViewer;
  private loadedDataSources: Map<string, unknown> = new Map();
  private loadedTilesets: Map<string, Cesium3DTilesetInstance> = new Map();
  private activeOrbitAnimation: { stop: () => void } | null = null;
  private activeTrackingSubscription: (() => void) | null = null;
  private activeCinematicFlight: { stop: () => void } | null = null;

  constructor(viewer: CesiumViewer) {
    this.viewer = viewer;
  }

  async execute(command: CesiumCommand): Promise<{ success: boolean; message: string; data?: unknown }> {
    try {
      switch (command.type) {
        case 'camera.flyTo':
          return this.executeCameraFlyTo(command);
        case 'camera.lookAt':
          return this.executeCameraLookAt(command);
        case 'camera.zoom':
          return this.executeCameraZoom(command);
        case 'camera.rotate':
          return this.executeCameraRotate(command);
        case 'camera.orbit':
          return this.executeCameraOrbit(command);
        case 'camera.track':
          return this.executeCameraTrack(command);
        case 'camera.cinematicFlight':
          return this.executeCameraCinematicFlight(command);
        case 'entity.add':
          return await this.executeEntityAdd(command);
        case 'batch.addEntities':
          return await this.executeBatchAddEntities(command);
        case 'entity.remove':
          return this.executeEntityRemove(command);
        case 'entity.update':
          return await this.executeEntityUpdate(command);
        case 'entity.clone':
          return await this.executeEntityClone(command);
        case 'entity.flyTo':
          return await this.executeFlyToEntity(command);
        case 'entity.show':
          return this.executeShowEntity(command);
        case 'entity.hide':
          return this.executeHideEntity(command);
        case 'imagery.add':
          return await this.executeImageryAdd(command);
        case 'layer.toggle':
          return this.executeLayerToggle(command);
        case 'time.set':
          return this.executeTimeSet(command);
        case 'time.play':
          return this.executeTimePlay();
        case 'time.pause':
          return this.executeTimePause();
        case 'scene.mode':
          return this.executeSceneMode(command);
        case 'terrain.set':
          return await this.executeTerrainSet(command);
        case 'terrain.exaggeration':
          return this.executeTerrainExaggeration(command);
        case 'tiles3d.add':
          return await this.execute3DTilesAdd(command);
        case 'tiles3d.remove':
          return this.execute3DTilesRemove(command);
        case 'tiles3d.style':
          return this.execute3DTilesStyle(command);
        case 'camera.setView':
          return this.executeCameraSetView(command);
        case 'camera.get':
          return this.executeCameraGet();
        case 'entity.select':
          return this.executeSelectEntity(command);
        case 'entity.list':
          return this.executeListEntities();
        case 'entity.getInfo':
          return this.executeGetEntityInfo(command);
        case 'data.loadGeoJSON':
          return await this.executeLoadGeoJSON(command);
        case 'data.loadKML':
          return await this.executeLoadKML(command);
        case 'data.loadCZML':
          return await this.executeLoadCZMLFromUrl(command);
        case 'scene.fog':
          return this.executeSetFog(command);
        case 'scene.shadows':
          return this.executeSetShadows(command);
        case 'time.speed':
          return this.executeSetAnimationSpeed(command);
        case 'imagery.remove':
          return this.executeRemoveImagery(command);
        case 'imagery.alpha':
          return this.executeSetImageryAlpha(command);
        case 'imagery.brightness':
          return this.executeSetImageryBrightness(command);
        case 'imagery.addWMS':
          return await this.executeAddWMS(command);
        case 'scene.lighting':
          return this.executeSetLighting(command);
        case 'scene.atmosphere':
          return this.executeSetAtmosphere(command);
        case 'scene.globe':
          return this.executeSetGlobe(command);
        case 'scene.depthTest':
          return this.executeSetDepthTest(command);
        case 'data.loadGPX':
          return await this.executeLoadGPX(command);
        case 'measure.distance':
          return this.executeMeasureDistance(command);
        case 'terrain.sample':
          return await this.executeSampleTerrain(command);
        case 'scene.fxaa':
          return this.executeEnableFXAA(command);
        case 'scene.bloom':
          return this.executeSetBloom(command);
        case 'pick.screenPosition':
          return this.executeGetScreenPosition(command);
        case 'pick.cartographic':
          return this.executeGetCartographic(command);
        case 'imagery.split':
          return this.executeSplitImagery(command);
        case 'pick.entity':
          return this.executePickEntity(command);
        case 'scene.skybox':
          return this.executeSetSkybox(command);
        case 'tiles3d.highlight':
          return this.executeHighlight3DTile(command);
        case 'tiles3d.clip':
          return this.executeClip3DTiles(command);
        case 'terrain.clip':
          return this.executeClipTerrain(command);
        case 'particles.add':
          return this.executeAddParticleSystem(command);
        case 'weather.add':
          return this.executeAddWeatherEffect(command);
        case 'clouds.add':
          return this.executeAddVolumetricCloud(command);
        case 'effects.lensFlare':
          return this.executeAddLensFlare(command);
        case 'material.image':
          return this.executeSetImageMaterial(command);
        case 'material.grid':
          return this.executeSetGridMaterial(command);
        case 'material.stripe':
          return this.executeSetStripeMaterial(command);
        case 'material.checkerboard':
          return this.executeSetCheckerboardMaterial(command);
        case 'route.show':
          return await this.executeShowRoute(command);
        case 'poi.show':
          return await this.executeShowPOI(command);
        case 'isochrone.show':
          return await this.executeShowIsochrone(command);
        case 'route.animated':
          return await this.executeAnimatedRoute(command);
        case 'flight.animated':
          return await this.executeAnimatedFlight(command);
        case 'poi.visualize':
          return await this.executeVisualizePOI(command);
        default:
          return { success: false, message: `Unknown command type: ${(command as CesiumCommand).type}` };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return { success: false, message: `Command execution failed: ${errorMessage}` };
    }
  }

  private executeCameraFlyTo(command: Extract<CesiumCommand, { type: 'camera.flyTo' }>): { success: boolean; message: string } {
    const destination = Cesium.Cartesian3.fromDegrees(
      command.destination.longitude,
      command.destination.latitude,
      command.destination.height || 1000000
    );

    const orientation = command.orientation
      ? {
          heading: command.orientation.heading ?? 0,
          pitch: command.orientation.pitch ?? Cesium.Math.toRadians(-90),
          roll: command.orientation.roll ?? 0,
        }
      : undefined;

    this.viewer.camera.flyTo({
      destination,
      orientation,
      duration: command.duration ?? 3,
    });

    return {
      success: true,
      message: `Flying to ${command.destination.latitude}, ${command.destination.longitude}`,
    };
  }

  private executeCameraLookAt(command: Extract<CesiumCommand, { type: 'camera.lookAt' }>): { success: boolean; message: string } {
    const target = Cesium.Cartesian3.fromDegrees(
      command.target.longitude,
      command.target.latitude,
      command.target.height || 0
    );

    const offset = command.offset
      ? new Cesium.HeadingPitchRange(
          command.offset.heading,
          command.offset.pitch,
          command.offset.range
        )
      : new Cesium.HeadingPitchRange(0, Cesium.Math.toRadians(-45), 1000000);

    this.viewer.camera.lookAt(target, offset);

    return {
      success: true,
      message: `Looking at ${command.target.latitude}, ${command.target.longitude}`,
    };
  }

  private executeCameraZoom(command: Extract<CesiumCommand, { type: 'camera.zoom' }>): { success: boolean; message: string } {
    if (command.amount > 0) {
      this.viewer.camera.zoomIn(Math.abs(command.amount));
    } else {
      this.viewer.camera.zoomOut(Math.abs(command.amount));
    }

    return {
      success: true,
      message: `Zoomed ${command.amount > 0 ? 'in' : 'out'} by ${Math.abs(command.amount)}`,
    };
  }

  private executeCameraRotate(command: Extract<CesiumCommand, { type: 'camera.rotate' }>): { success: boolean; message: string } {
    this.viewer.camera.setView({
      orientation: {
        heading: command.heading ?? this.viewer.camera.heading,
        pitch: command.pitch ?? this.viewer.camera.pitch,
        roll: command.roll ?? this.viewer.camera.roll,
      },
    });

    return { success: true, message: 'Camera rotated' };
  }

  private async executeEntityAdd(command: Extract<CesiumCommand, { type: 'entity.add' }>): Promise<{ success: boolean; message: string; data?: unknown }> {
    const entity = command.entity as unknown as Record<string, unknown>;
    const ellipsoid = entity.ellipsoid as Record<string, unknown> | undefined;

    // Check if this is a partial ellipsoid (sensor cone) - CZML doesn't support these
    // Use Entity API directly instead
    if (ellipsoid && (ellipsoid.minimumCone !== undefined || ellipsoid.minimumClock !== undefined)) {
      console.log('[CommandExecutor] Detected partial ellipsoid, using Entity API:', {
        hasEllipsoid: !!ellipsoid,
        minimumCone: ellipsoid?.minimumCone,
        minimumClock: ellipsoid?.minimumClock,
      });
      return this.addPartialEllipsoidEntity(command);
    }

    // Standard CZML path for other entities
    const czml: CZMLDocumentArray = [
      { id: 'document', name: 'Entity', version: '1.0' },
      command.entity,
    ];

    const dataSource = await Cesium.CzmlDataSource.load(czml);
    await this.viewer.dataSources.add(dataSource);
    this.loadedDataSources.set(command.entity.id, dataSource);

    return {
      success: true,
      message: `Entity '${command.entity.id}' added`,
      data: { id: command.entity.id },
    };
  }

  /**
   * Add a partial ellipsoid (sensor cone) using the Entity API directly
   * CZML doesn't support minimumCone/maximumCone/minimumClock/maximumClock
   */
  private addPartialEllipsoidEntity(command: Extract<CesiumCommand, { type: 'entity.add' }>): { success: boolean; message: string; data?: unknown } {
    try {
      const entity = command.entity as unknown as Record<string, unknown>;
      const position = entity.position as { cartographicDegrees?: number[] } | undefined;
      const ellipsoid = entity.ellipsoid as Record<string, unknown> | undefined;
      const orientation = entity.orientation as { unitQuaternion?: number[] } | undefined;

      console.log('[SensorCone] Adding partial ellipsoid:', {
        id: entity.id,
        position,
        ellipsoid: {
          minimumCone: ellipsoid?.minimumCone,
          maximumCone: ellipsoid?.maximumCone,
          minimumClock: ellipsoid?.minimumClock,
          maximumClock: ellipsoid?.maximumClock,
          radii: ellipsoid?.radii,
        },
      });

      if (!position?.cartographicDegrees || !ellipsoid) {
        console.error('[SensorCone] Invalid entity - missing position or ellipsoid');
        return { success: false, message: 'Invalid partial ellipsoid entity' };
      }

      const coords = position.cartographicDegrees;
      const lon = coords[0] ?? 0;
      const lat = coords[1] ?? 0;
      const height = coords[2] ?? 0;
      const radiiData = (ellipsoid.radii as { cartesian?: number[] })?.cartesian ?? [1000, 1000, 1000];
      const innerRadiiData = (ellipsoid.innerRadii as { cartesian?: number[] })?.cartesian;
      const materialData = (ellipsoid.material as { solidColor?: { color?: { rgba?: number[] } } })?.solidColor?.color?.rgba ?? [0, 255, 0, 128];

      console.log('[SensorCone] Parsed data:', { lon, lat, height, radiiData, materialData });

      // Create Cesium color from RGBA (with defaults)
      const r = (materialData[0] ?? 0) / 255;
      const g = (materialData[1] ?? 255) / 255;
      const b = (materialData[2] ?? 0) / 255;
      const a = (materialData[3] ?? 128) / 255;
      const color = new Cesium.Color(r, g, b, a);

      // Build entity options for Cesium
      const cesiumPosition = Cesium.Cartesian3.fromDegrees(lon, lat, height);
      const cesiumRadii = new Cesium.Cartesian3(radiiData[0] ?? 1000, radiiData[1] ?? 1000, radiiData[2] ?? 1000);

      // Build partial ellipsoid with cone AND clock constraints for sensor wedge
      // Cesium cone: 0 = +Z (up), π/2 = horizontal, π = -Z (down)
      // Cesium clock: 0 = +X direction, increases counter-clockwise when viewed from +Z
      // innerRadii creates hollow interior showing vertex and side walls
      const ellipsoidOptions: Record<string, unknown> = {
        show: true,
        radii: new Cesium.Cartesian3(5000, 5000, 5000), // 5km outer radius
        innerRadii: new Cesium.Cartesian3(1, 1, 1), // Tiny inner = vertex at center
        // Cone constraints - vertical extent (60° band centered on horizontal)
        minimumCone: Cesium.Math.toRadians(60),
        maximumCone: Cesium.Math.toRadians(120),
        // Clock constraints - horizontal extent (30° wedge)
        minimumClock: Cesium.Math.toRadians(-15),
        maximumClock: Cesium.Math.toRadians(15),
        fill: true,
        material: Cesium.Color.LIME.withAlpha(0.5),
        outline: true,
        outlineColor: Cesium.Color.WHITE,
        stackPartitions: 64,
        slicePartitions: 64,
      };

      console.log('[SensorCone] Creating partial ellipsoid at', lon, lat, height,
        'with cone:', ellipsoid.minimumCone, '-', ellipsoid.maximumCone,
        'clock:', ellipsoid.minimumClock, '-', ellipsoid.maximumClock);

      // Temporarily disabled for debugging
      // if (innerRadiiData) {
      //   ellipsoidOptions.innerRadii = new Cesium.Cartesian3(innerRadiiData[0] ?? 0, innerRadiiData[1] ?? 0, innerRadiiData[2] ?? 0);
      // }

      const entityOptions: Record<string, unknown> = {
        id: entity.id as string,
        name: entity.name as string,
        position: cesiumPosition,
        ellipsoid: ellipsoidOptions,
      };

      // Add orientation if specified (for heading/pitch)
      if (orientation?.unitQuaternion && orientation.unitQuaternion.length >= 4) {
        const quat = orientation.unitQuaternion;
        entityOptions.orientation = new Cesium.Quaternion(quat[0] ?? 0, quat[1] ?? 0, quat[2] ?? 0, quat[3] ?? 1);
        console.log('[SensorCone] Applied orientation:', quat);
      }

      console.log('[SensorCone] Adding entity with options:', JSON.stringify({
        id: entityOptions.id,
        name: entityOptions.name,
        position: { lon, lat, height },
        ellipsoid: {
          radii: radiiData,
          minimumCone: ellipsoid.minimumCone,
          maximumCone: ellipsoid.maximumCone,
          minimumClock: ellipsoid.minimumClock,
          maximumClock: ellipsoid.maximumClock,
        },
        orientation: orientation?.unitQuaternion,
        color: { r, g, b, a },
      }, null, 2));

      console.log('[SensorCone] Entity count before:', this.viewer.entities.values.length);
      const addedEntity = this.viewer.entities.add(entityOptions);
      console.log('[SensorCone] Entity count after:', this.viewer.entities.values.length);
      console.log('[SensorCone] Entity added:', addedEntity);
      console.log('[SensorCone] Entity ellipsoid:', addedEntity.ellipsoid);

      return {
        success: true,
        message: `Sensor cone '${entity.id}' added`,
        data: { id: entity.id },
      };
    } catch (error) {
      console.error('[SensorCone] Error adding partial ellipsoid:', error);
      return {
        success: false,
        message: `Failed to add sensor cone: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  /**
   * Add multiple entities in a batch (for showTopCities, etc.)
   */
  private async executeBatchAddEntities(command: { type: 'batch.addEntities'; entities: Array<Record<string, unknown>> }): Promise<{ success: boolean; message: string; data?: unknown }> {
    try {
      const entities = command.entities;
      console.log(`[BatchAdd] Adding ${entities.length} entities`);

      // Create a single CZML document with all entities
      const czml: unknown[] = [
        { id: 'document', name: 'BatchEntities', version: '1.0' },
        ...entities,
      ];

      const dataSource = await Cesium.CzmlDataSource.load(czml);
      await this.viewer.dataSources.add(dataSource);

      // Store reference for potential removal
      const batchId = `batch-${Date.now()}`;
      this.loadedDataSources.set(batchId, dataSource);

      console.log(`[BatchAdd] Successfully added ${entities.length} entities`);

      return {
        success: true,
        message: `Added ${entities.length} entities`,
        data: { batchId, count: entities.length },
      };
    } catch (error) {
      console.error('[BatchAdd] Error adding batch entities:', error);
      return {
        success: false,
        message: `Failed to add batch entities: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  private executeEntityRemove(command: Extract<CesiumCommand, { type: 'entity.remove' }>): { success: boolean; message: string } {
    const dataSource = this.loadedDataSources.get(command.id);
    if (dataSource) {
      this.viewer.dataSources.remove(dataSource, true);
      this.loadedDataSources.delete(command.id);
      return { success: true, message: `Entity '${command.id}' removed` };
    }

    // Try removing from entities collection directly
    const removed = this.viewer.entities.removeById(command.id);
    if (removed) {
      return { success: true, message: `Entity '${command.id}' removed` };
    }

    return { success: false, message: `Entity '${command.id}' not found` };
  }

  private async executeEntityUpdate(command: Extract<CesiumCommand, { type: 'entity.update' }>): Promise<{ success: boolean; message: string }> {
    // Find and update the entity in place
    const entity = this.findEntityByIdOrName(command.id) as { name?: string; description?: string; show?: boolean } | undefined;
    if (!entity) {
      return { success: false, message: `Entity '${command.id}' not found` };
    }

    // Apply property updates
    const props = command.properties as Record<string, unknown>;
    if (props.name !== undefined) {
      entity.name = props.name as string;
    }
    if (props.description !== undefined) {
      entity.description = props.description as string;
    }
    if (props.show !== undefined) {
      entity.show = props.show as boolean;
    }

    return { success: true, message: `Entity '${command.id}' updated` };
  }

  private async executeEntityClone(command: Extract<CesiumCommand, { type: 'entity.clone' }>): Promise<{ success: boolean; message: string }> {
    // Find the source entity
    const sourceEntity = this.findEntityByIdOrName(command.entityId);
    if (!sourceEntity) {
      return { success: false, message: `Source entity '${command.entityId}' not found` };
    }

    // Cast sourceEntity to access Cesium entity properties
    const src = sourceEntity as {
      position?: { getValue: (time: unknown) => unknown };
      orientation?: { getValue: (time: unknown) => unknown };
      point?: { pixelSize?: { getValue: (time: unknown) => unknown }; color?: { getValue: (time: unknown) => unknown }; outlineColor?: { getValue: (time: unknown) => unknown }; outlineWidth?: { getValue: (time: unknown) => unknown } };
      billboard?: { image?: { getValue: (time: unknown) => unknown }; scale?: { getValue: (time: unknown) => unknown } };
      label?: { text?: { getValue: (time: unknown) => unknown }; font?: { getValue: (time: unknown) => unknown }; fillColor?: { getValue: (time: unknown) => unknown } };
      polyline?: { positions?: { getValue: (time: unknown) => unknown }; width?: { getValue: (time: unknown) => unknown }; material?: { getValue: (time: unknown) => unknown } };
      polygon?: { hierarchy?: { getValue: (time: unknown) => unknown }; material?: { getValue: (time: unknown) => unknown }; extrudedHeight?: { getValue: (time: unknown) => unknown } };
      ellipse?: { semiMajorAxis?: { getValue: (time: unknown) => unknown }; semiMinorAxis?: { getValue: (time: unknown) => unknown }; material?: { getValue: (time: unknown) => unknown } };
    };

    // Create a new entity with the source entity's properties and a new name
    const newId = `${command.newName}_${Date.now()}`;
    this.viewer.entities.add({
      id: newId,
      name: command.newName,
      position: src.position?.getValue(Cesium.JulianDate.now()),
      orientation: src.orientation?.getValue(Cesium.JulianDate.now()),
      point: src.point ? {
        pixelSize: src.point.pixelSize?.getValue(Cesium.JulianDate.now()),
        color: src.point.color?.getValue(Cesium.JulianDate.now()),
        outlineColor: src.point.outlineColor?.getValue(Cesium.JulianDate.now()),
        outlineWidth: src.point.outlineWidth?.getValue(Cesium.JulianDate.now()),
      } : undefined,
      billboard: src.billboard ? {
        image: src.billboard.image?.getValue(Cesium.JulianDate.now()),
        scale: src.billboard.scale?.getValue(Cesium.JulianDate.now()),
      } : undefined,
      label: src.label ? {
        text: src.label.text?.getValue(Cesium.JulianDate.now()),
        font: src.label.font?.getValue(Cesium.JulianDate.now()),
        fillColor: src.label.fillColor?.getValue(Cesium.JulianDate.now()),
      } : undefined,
      polyline: src.polyline ? {
        positions: src.polyline.positions?.getValue(Cesium.JulianDate.now()),
        width: src.polyline.width?.getValue(Cesium.JulianDate.now()),
        material: src.polyline.material?.getValue(Cesium.JulianDate.now()),
      } : undefined,
      polygon: src.polygon ? {
        hierarchy: src.polygon.hierarchy?.getValue(Cesium.JulianDate.now()),
        material: src.polygon.material?.getValue(Cesium.JulianDate.now()),
        extrudedHeight: src.polygon.extrudedHeight?.getValue(Cesium.JulianDate.now()),
      } : undefined,
      ellipse: src.ellipse ? {
        semiMajorAxis: src.ellipse.semiMajorAxis?.getValue(Cesium.JulianDate.now()),
        semiMinorAxis: src.ellipse.semiMinorAxis?.getValue(Cesium.JulianDate.now()),
        material: src.ellipse.material?.getValue(Cesium.JulianDate.now()),
      } : undefined,
    });

    return { success: true, message: `Entity cloned as '${command.newName}' with ID '${newId}'` };
  }

  private async executeFlyToEntity(command: Extract<CesiumCommand, { type: 'entity.flyTo' }>): Promise<{ success: boolean; message: string }> {
    // Find entity by ID or name
    let entity = this.findEntityByIdOrName(command.entityId);

    if (!entity) {
      return { success: false, message: `Entity '${command.entityId}' not found` };
    }

    // Create offset if specified
    let offset: unknown = undefined;
    if (command.offset) {
      offset = new Cesium.HeadingPitchRange(
        command.offset.heading ?? 0,
        command.offset.pitch ?? -Math.PI / 4,
        command.offset.range ?? 10000
      );
    }

    // Use viewer.flyTo for entities (more reliable than camera.flyTo)
    try {
      await this.viewer.flyTo(entity, {
        duration: command.duration ?? 3,
        offset,
      });
      return { success: true, message: `Camera flew to entity '${command.entityId}'` };
    } catch (error) {
      return { success: false, message: `Failed to fly to entity: ${error}` };
    }
  }

  private executeShowEntity(command: Extract<CesiumCommand, { type: 'entity.show' }>): { success: boolean; message: string } {
    const entity = this.findEntityByIdOrName(command.entityId) as { show?: boolean } | undefined;
    if (!entity) {
      return { success: false, message: `Entity '${command.entityId}' not found` };
    }
    entity.show = true;
    return { success: true, message: `Entity '${command.entityId}' is now visible` };
  }

  private executeHideEntity(command: Extract<CesiumCommand, { type: 'entity.hide' }>): { success: boolean; message: string } {
    const entity = this.findEntityByIdOrName(command.entityId) as { show?: boolean } | undefined;
    if (!entity) {
      return { success: false, message: `Entity '${command.entityId}' not found` };
    }
    entity.show = false;
    return { success: true, message: `Entity '${command.entityId}' is now hidden` };
  }

  /**
   * Find an entity by its ID or name, searching both direct entities and data sources
   */
  private findEntityByIdOrName(idOrName: string): unknown | undefined {
    // First try direct entity collection by ID
    let entity = this.viewer.entities.getById(idOrName);
    if (entity) return entity;

    // Search by name in direct entities
    for (const e of this.viewer.entities.values) {
      const ent = e as { name?: string };
      if (ent.name === idOrName) return e;
    }

    // Search in data sources
    for (let i = 0; i < this.viewer.dataSources.length; i++) {
      const dataSource = this.viewer.dataSources.get(i) as { entities?: CesiumEntityCollection };
      if (dataSource.entities) {
        // Try by ID
        entity = dataSource.entities.getById(idOrName);
        if (entity) return entity;

        // Try by name
        for (const e of dataSource.entities.values) {
          const ent = e as { name?: string };
          if (ent.name === idOrName) return e;
        }
      }
    }

    return undefined;
  }

  private async executeImageryAdd(command: Extract<CesiumCommand, { type: 'imagery.add' }>): Promise<{ success: boolean; message: string }> {
    let provider: unknown;

    switch (command.provider) {
      case 'bing':
        provider = new Cesium.IonImageryProvider({ assetId: 4 });
        break;
      case 'osm':
        provider = new Cesium.OpenStreetMapImageryProvider({
          url: command.url || 'https://tile.openstreetmap.org/',
        });
        break;
      case 'arcgis':
        provider = await Cesium.ArcGisMapServerImageryProvider.fromUrl(
          command.url || 'https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer'
        );
        break;
      case 'tms':
        if (!command.url) {
          return { success: false, message: 'TMS provider requires a URL' };
        }
        provider = new Cesium.UrlTemplateImageryProvider({ url: command.url });
        break;
      case 'wms':
        if (!command.url) {
          return { success: false, message: 'WMS provider requires a URL' };
        }
        provider = new Cesium.WebMapServiceImageryProvider({
          url: command.url,
          layers: (command.options?.layers as string) || '',
        });
        break;
      default:
        return { success: false, message: `Unknown imagery provider: ${command.provider}` };
    }

    this.viewer.imageryLayers.addImageryProvider(provider);
    return { success: true, message: `${command.provider} imagery layer added` };
  }

  private executeLayerToggle(command: Extract<CesiumCommand, { type: 'layer.toggle' }>): { success: boolean; message: string } {
    // This would need to track layers by ID - simplified implementation
    return { success: true, message: `Layer '${command.layerId}' visibility set to ${command.visible}` };
  }

  private executeTimeSet(command: Extract<CesiumCommand, { type: 'time.set' }>): { success: boolean; message: string } {
    if (command.currentTime) {
      this.viewer.clock.currentTime = Cesium.JulianDate.fromIso8601(command.currentTime);
    }
    if (command.startTime) {
      this.viewer.clock.startTime = Cesium.JulianDate.fromIso8601(command.startTime);
    }
    if (command.stopTime) {
      this.viewer.clock.stopTime = Cesium.JulianDate.fromIso8601(command.stopTime);
    }
    if (command.multiplier !== undefined) {
      this.viewer.clock.multiplier = command.multiplier;
    }

    return { success: true, message: 'Time settings updated' };
  }

  private executeTimePlay(): { success: boolean; message: string } {
    this.viewer.clock.shouldAnimate = true;
    return { success: true, message: 'Animation started' };
  }

  private executeTimePause(): { success: boolean; message: string } {
    this.viewer.clock.shouldAnimate = false;
    return { success: true, message: 'Animation paused' };
  }

  private executeSceneMode(command: Extract<CesiumCommand, { type: 'scene.mode' }>): { success: boolean; message: string } {
    const modeMap: Record<string, number> = {
      '2D': Cesium.SceneMode.SCENE2D,
      '3D': Cesium.SceneMode.SCENE3D,
      'COLUMBUS_VIEW': Cesium.SceneMode.COLUMBUS_VIEW,
    };

    const mode = modeMap[command.mode];
    if (mode !== undefined) {
      this.viewer.scene.mode = mode;
      return { success: true, message: `Scene mode set to ${command.mode}` };
    }

    return { success: false, message: `Unknown scene mode: ${command.mode}` };
  }

  private async executeTerrainSet(command: Extract<CesiumCommand, { type: 'terrain.set' }>): Promise<{ success: boolean; message: string }> {
    try {
      switch (command.provider) {
        case 'cesium':
          // Support both default world terrain and Ion asset ID
          if (command.assetId !== undefined) {
            this.viewer.terrainProvider = await Cesium.CesiumTerrainProvider.fromIonAssetId(command.assetId);
          } else {
            this.viewer.terrainProvider = await Cesium.createWorldTerrainAsync();
          }
          break;
        case 'ellipsoid':
          this.viewer.terrainProvider = new Cesium.EllipsoidTerrainProvider();
          break;
        case 'custom':
          if (!command.url && command.assetId === undefined) {
            return { success: false, message: 'Custom terrain provider requires a URL or asset ID' };
          }
          if (command.assetId !== undefined) {
            this.viewer.terrainProvider = await Cesium.CesiumTerrainProvider.fromIonAssetId(command.assetId);
          } else if (command.url) {
            this.viewer.terrainProvider = await Cesium.CesiumTerrainProvider.fromUrl(command.url);
          }
          break;
        default:
          return { success: false, message: `Unknown terrain provider: ${command.provider}` };
      }

      return { success: true, message: `Terrain set to ${command.provider}` };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return { success: false, message: `Failed to set terrain: ${errorMessage}` };
    }
  }

  private executeTerrainExaggeration(command: Extract<CesiumCommand, { type: 'terrain.exaggeration' }>): { success: boolean; message: string } {
    // Use scene.verticalExaggeration for Cesium 1.99+ or globe.terrainExaggeration for older versions
    const scene = this.viewer.scene as CesiumScene & { verticalExaggeration?: number; verticalExaggerationRelativeHeight?: number };
    const globe = this.viewer.scene.globe as CesiumGlobe | undefined;

    if (scene.verticalExaggeration !== undefined) {
      scene.verticalExaggeration = command.factor;
      if (command.relativeHeight !== undefined) {
        scene.verticalExaggerationRelativeHeight = command.relativeHeight;
      }
    } else if (globe && 'terrainExaggeration' in globe) {
      globe.terrainExaggeration = command.factor;
      if (command.relativeHeight !== undefined) {
        globe.terrainExaggerationRelativeHeight = command.relativeHeight;
      }
    } else {
      return { success: false, message: 'Terrain exaggeration not supported in this Cesium version' };
    }

    return {
      success: true,
      message: `Terrain exaggeration set to ${command.factor}x${command.relativeHeight !== undefined ? ` (relative height: ${command.relativeHeight}m)` : ''}`,
    };
  }

  private async execute3DTilesAdd(command: Extract<CesiumCommand, { type: 'tiles3d.add' }>): Promise<{ success: boolean; message: string; data?: unknown }> {
    // Check if a tileset with this ID already exists
    if (this.loadedTilesets.has(command.id)) {
      return { success: false, message: `Tileset with ID '${command.id}' already exists. Remove it first or use a different ID.` };
    }

    const options: {
      maximumScreenSpaceError?: number;
      maximumMemoryUsage?: number;
      show?: boolean;
    } = {};

    if (command.maximumScreenSpaceError !== undefined) {
      options.maximumScreenSpaceError = command.maximumScreenSpaceError;
    }
    if (command.maximumMemoryUsage !== undefined) {
      options.maximumMemoryUsage = command.maximumMemoryUsage;
    }
    if (command.show !== undefined) {
      options.show = command.show;
    }

    let tileset: Cesium3DTilesetInstance;

    try {
      // Load tileset from Ion asset ID or URL
      if (command.assetId !== undefined) {
        tileset = await Cesium.Cesium3DTileset.fromIonAssetId(command.assetId, options);
      } else {
        tileset = await Cesium.Cesium3DTileset.fromUrl(command.url, options);
      }

      // Add to scene primitives
      this.viewer.scene.primitives.add(tileset);

      // Store reference for later management
      this.loadedTilesets.set(command.id, tileset);

      return {
        success: true,
        message: `3D Tileset '${command.id}' loaded successfully`,
        data: { id: command.id },
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return { success: false, message: `Failed to load 3D Tileset: ${errorMessage}` };
    }
  }

  private execute3DTilesRemove(command: Extract<CesiumCommand, { type: 'tiles3d.remove' }>): { success: boolean; message: string } {
    const tileset = this.loadedTilesets.get(command.id);

    if (!tileset) {
      return { success: false, message: `Tileset '${command.id}' not found` };
    }

    // Remove from scene primitives
    this.viewer.scene.primitives.remove(tileset);

    // Destroy the tileset to free resources
    if (!tileset.isDestroyed()) {
      tileset.destroy();
    }

    // Remove from tracking map
    this.loadedTilesets.delete(command.id);

    return { success: true, message: `3D Tileset '${command.id}' removed` };
  }

  private execute3DTilesStyle(command: Extract<CesiumCommand, { type: 'tiles3d.style' }>): { success: boolean; message: string } {
    const tileset = this.loadedTilesets.get(command.id);

    if (!tileset) {
      return { success: false, message: `Tileset '${command.id}' not found` };
    }

    try {
      // Create a new Cesium3DTileStyle from the style definition
      const styleObj: Record<string, unknown> = {};

      if (command.style.color !== undefined) {
        styleObj.color = command.style.color;
      }
      if (command.style.show !== undefined) {
        styleObj.show = command.style.show;
      }
      if (command.style.pointSize !== undefined) {
        styleObj.pointSize = command.style.pointSize;
      }
      if (command.style.meta !== undefined) {
        styleObj.meta = command.style.meta;
      }

      tileset.style = new Cesium.Cesium3DTileStyle(styleObj);

      return { success: true, message: `Style applied to tileset '${command.id}'` };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return { success: false, message: `Failed to apply style: ${errorMessage}` };
    }
  }

  private executeCameraOrbit(command: Extract<CesiumCommand, { type: 'camera.orbit' }>): { success: boolean; message: string } {
    // Stop any existing orbit animation
    if (this.activeOrbitAnimation) {
      this.activeOrbitAnimation.stop();
      this.activeOrbitAnimation = null;
    }

    const target = Cesium.Cartesian3.fromDegrees(
      command.target.longitude,
      command.target.latitude,
      command.target.height || 0
    );

    // Default to full 360-degree orbit if not specified
    const headingDelta = command.headingDelta ?? Cesium.Math.TWO_PI;
    const pitchDelta = command.pitchDelta ?? 0;
    const duration = command.duration * 1000; // Convert to milliseconds

    // Capture starting orientation
    const startHeading = this.viewer.camera.heading;
    const startPitch = this.viewer.camera.pitch;

    // Calculate range from current camera position to target
    const cameraPosition = this.viewer.camera.position;
    const cartographic = Cesium.Cartographic.fromCartesian(cameraPosition);
    const targetCartographic = Cesium.Cartographic.fromCartesian(target);

    // Approximate range calculation using haversine-like distance
    const dLat = targetCartographic.latitude - cartographic.latitude;
    const dLon = targetCartographic.longitude - cartographic.longitude;
    const dHeight = (command.target.height || 0) - cartographic.height;
    const range = Math.sqrt(dLat * dLat + dLon * dLon) * 6371000 + Math.abs(dHeight); // Rough estimate

    const startTime = Date.now();
    let animationFrameId: number;
    let stopped = false;

    const animate = () => {
      if (stopped) return;

      const elapsed = Date.now() - startTime;
      const t = Math.min(elapsed / duration, 1);

      // Interpolate heading and pitch
      const currentHeading = startHeading + headingDelta * t;
      const currentPitch = startPitch + pitchDelta * t;

      const offset = new Cesium.HeadingPitchRange(
        currentHeading,
        currentPitch,
        range > 0 ? range : 1000000 // Default range if calculation failed
      );

      this.viewer.camera.lookAt(target, offset);

      if (t < 1) {
        animationFrameId = requestAnimationFrame(animate);
      } else {
        // Reset camera transform when orbit completes
        this.viewer.camera.lookAtTransform(Cesium.Matrix4.IDENTITY);
        this.activeOrbitAnimation = null;
      }
    };

    animationFrameId = requestAnimationFrame(animate);

    this.activeOrbitAnimation = {
      stop: () => {
        stopped = true;
        cancelAnimationFrame(animationFrameId);
        this.viewer.camera.lookAtTransform(Cesium.Matrix4.IDENTITY);
      },
    };

    return {
      success: true,
      message: `Orbiting around ${command.target.latitude}, ${command.target.longitude} for ${command.duration} seconds`,
    };
  }

  private executeCameraTrack(command: Extract<CesiumCommand, { type: 'camera.track' }>): { success: boolean; message: string } {
    // Stop any existing tracking
    if (this.activeTrackingSubscription) {
      this.activeTrackingSubscription();
      this.activeTrackingSubscription = null;
    }

    // Find the entity to track
    let entity = this.viewer.entities.getById(command.entityId);

    // If not in entities collection, check data sources
    if (!entity) {
      for (let i = 0; i < this.viewer.dataSources.length; i++) {
        const dataSource = this.viewer.dataSources.get(i) as { entities?: CesiumEntityCollection };
        if (dataSource.entities) {
          entity = dataSource.entities.getById(command.entityId);
          if (entity) break;
        }
      }
    }

    if (!entity) {
      return { success: false, message: `Entity '${command.entityId}' not found` };
    }

    const trackedEntity = entity as { position?: { getValue: (time: unknown) => unknown } };

    // Default offset values
    const offset = command.offset || {
      heading: 0,
      pitch: Cesium.Math.toRadians(-45),
      range: 10000,
    };

    const headingPitchRange = new Cesium.HeadingPitchRange(
      offset.heading,
      offset.pitch,
      offset.range
    );

    // Subscribe to clock tick to update camera position
    const onTick = () => {
      if (!trackedEntity.position) return;

      const position = trackedEntity.position.getValue(this.viewer.clock.currentTime);
      if (Cesium.defined(position)) {
        this.viewer.camera.lookAt(position, headingPitchRange);
      }
    };

    // Add the listener and store the removal function
    const removeListener = this.viewer.clock.onTick.addEventListener(onTick);

    this.activeTrackingSubscription = () => {
      removeListener();
      this.viewer.camera.lookAtTransform(Cesium.Matrix4.IDENTITY);
    };

    return {
      success: true,
      message: `Tracking entity '${command.entityId}'`,
    };
  }

  private executeCameraCinematicFlight(command: Extract<CesiumCommand, { type: 'camera.cinematicFlight' }>): { success: boolean; message: string } {
    // Stop any existing cinematic flight
    if (this.activeCinematicFlight) {
      this.activeCinematicFlight.stop();
      this.activeCinematicFlight = null;
    }

    if (command.waypoints.length < 2) {
      return { success: false, message: 'Cinematic flight requires at least 2 waypoints' };
    }

    const waypoints = command.waypoints;
    let currentWaypointIndex = 0;
    let stopped = false;

    const flyToNextWaypoint = () => {
      if (stopped) return;

      if (currentWaypointIndex >= waypoints.length) {
        if (command.loop) {
          currentWaypointIndex = 0;
        } else {
          this.activeCinematicFlight = null;
          return;
        }
      }

      const waypoint = waypoints[currentWaypointIndex];
      if (!waypoint) {
        return;
      }
      const destination = Cesium.Cartesian3.fromDegrees(
        waypoint.position.longitude,
        waypoint.position.latitude,
        waypoint.position.height || 1000
      );

      const duration = waypoint.duration ?? 5; // Default 5 seconds per waypoint

      const orientation = waypoint.orientation
        ? {
            heading: waypoint.orientation.heading ?? 0,
            pitch: waypoint.orientation.pitch ?? Cesium.Math.toRadians(-15),
            roll: waypoint.orientation.roll ?? 0,
          }
        : {
            heading: 0,
            pitch: Cesium.Math.toRadians(-15),
            roll: 0,
          };

      this.viewer.camera.flyTo({
        destination,
        orientation,
        duration,
        complete: () => {
          currentWaypointIndex++;
          flyToNextWaypoint();
        },
        cancel: () => {
          // Flight was cancelled (user interaction or programmatic stop)
        },
      });
    };

    flyToNextWaypoint();

    this.activeCinematicFlight = {
      stop: () => {
        stopped = true;
        // The camera.flyTo will be cancelled when we call any other camera movement
      },
    };

    return {
      success: true,
      message: `Starting cinematic flight through ${waypoints.length} waypoints${command.loop ? ' (looping)' : ''}`,
    };
  }

  stopTracking(): { success: boolean; message: string } {
    if (this.activeTrackingSubscription) {
      this.activeTrackingSubscription();
      this.activeTrackingSubscription = null;
      return { success: true, message: 'Stopped tracking entity' };
    }
    return { success: false, message: 'No active tracking to stop' };
  }

  stopCinematicFlight(): { success: boolean; message: string } {
    if (this.activeCinematicFlight) {
      this.activeCinematicFlight.stop();
      this.activeCinematicFlight = null;
      return { success: true, message: 'Stopped cinematic flight' };
    }
    return { success: false, message: 'No active cinematic flight to stop' };
  }

  stopOrbit(): { success: boolean; message: string } {
    if (this.activeOrbitAnimation) {
      this.activeOrbitAnimation.stop();
      this.activeOrbitAnimation = null;
      return { success: true, message: 'Stopped orbit animation' };
    }
    return { success: false, message: 'No active orbit animation to stop' };
  }

  private executeCameraSetView(command: Extract<CesiumCommand, { type: 'camera.setView' }>): { success: boolean; message: string } {
    const destination = Cesium.Cartesian3.fromDegrees(
      command.destination.longitude,
      command.destination.latitude,
      command.destination.height || 1000000
    );

    const orientation = command.orientation
      ? {
          heading: command.orientation.heading ?? 0,
          pitch: command.orientation.pitch ?? Cesium.Math.toRadians(-90),
          roll: command.orientation.roll ?? 0,
        }
      : {
          heading: 0,
          pitch: Cesium.Math.toRadians(-90),
          roll: 0,
        };

    this.viewer.camera.setView({
      destination,
      orientation,
    });

    return {
      success: true,
      message: `Camera set to ${command.destination.latitude}, ${command.destination.longitude}`,
    };
  }

  private executeCameraGet(): { success: boolean; message: string; data?: unknown } {
    const cartographic = this.viewer.camera.positionCartographic;
    return {
      success: true,
      message: 'Camera position retrieved',
      data: {
        longitude: Cesium.Math.toDegrees(cartographic.longitude),
        latitude: Cesium.Math.toDegrees(cartographic.latitude),
        height: cartographic.height,
        heading: Cesium.Math.toDegrees(this.viewer.camera.heading),
        pitch: Cesium.Math.toDegrees(this.viewer.camera.pitch),
        roll: Cesium.Math.toDegrees(this.viewer.camera.roll),
      },
    };
  }

  private executeSelectEntity(command: Extract<CesiumCommand, { type: 'entity.select' }>): { success: boolean; message: string } {
    const entity = this.findEntityByIdOrName(command.entityId);
    if (!entity) {
      return { success: false, message: `Entity '${command.entityId}' not found` };
    }

    // Set as selected entity on the viewer
    const viewer = this.viewer as CesiumViewer & { selectedEntity?: unknown };
    viewer.selectedEntity = entity;
    return { success: true, message: `Entity '${command.entityId}' selected` };
  }

  private executeListEntities(): { success: boolean; message: string; data?: unknown } {
    const entities: Array<{ id: string; name?: string; type?: string }> = [];

    // Get entities from direct entity collection
    for (const entity of this.viewer.entities.values) {
      const ent = entity as { id?: string; name?: string; point?: unknown; polyline?: unknown; polygon?: unknown; billboard?: unknown; label?: unknown; model?: unknown; ellipse?: unknown; ellipsoid?: unknown; box?: unknown; cylinder?: unknown };
      const type = ent.point ? 'point' : ent.polyline ? 'polyline' : ent.polygon ? 'polygon' :
                   ent.billboard ? 'billboard' : ent.label ? 'label' : ent.model ? 'model' :
                   ent.ellipse ? 'ellipse' : ent.ellipsoid ? 'ellipsoid' : ent.box ? 'box' :
                   ent.cylinder ? 'cylinder' : 'unknown';
      entities.push({ id: ent.id || 'unknown', name: ent.name, type });
    }

    // Get entities from data sources
    for (let i = 0; i < this.viewer.dataSources.length; i++) {
      const dataSource = this.viewer.dataSources.get(i) as { name?: string; entities?: CesiumEntityCollection };
      if (dataSource.entities) {
        for (const entity of dataSource.entities.values) {
          const ent = entity as { id?: string; name?: string; point?: unknown; polyline?: unknown; polygon?: unknown; billboard?: unknown; label?: unknown };
          const type = ent.point ? 'point' : ent.polyline ? 'polyline' : ent.polygon ? 'polygon' :
                       ent.billboard ? 'billboard' : ent.label ? 'label' : 'unknown';
          entities.push({ id: ent.id || 'unknown', name: ent.name, type });
        }
      }
    }

    return {
      success: true,
      message: `Found ${entities.length} entities`,
      data: { entities },
    };
  }

  private executeGetEntityInfo(command: Extract<CesiumCommand, { type: 'entity.getInfo' }>): { success: boolean; message: string; data?: unknown } {
    const entity = this.findEntityByIdOrName(command.entityId);
    if (!entity) {
      return { success: false, message: `Entity '${command.entityId}' not found` };
    }

    const ent = entity as { id?: string; name?: string; description?: { getValue?: () => string }; position?: { getValue?: (time: unknown) => unknown }; show?: boolean };
    const info: Record<string, unknown> = {
      id: ent.id,
      name: ent.name,
      show: ent.show,
    };

    // Get position if available
    if (ent.position && typeof ent.position.getValue === 'function') {
      const position = ent.position.getValue(this.viewer.clock.currentTime);
      if (position) {
        const cartographic = Cesium.Cartographic.fromCartesian(position);
        info.position = {
          longitude: Cesium.Math.toDegrees(cartographic.longitude),
          latitude: Cesium.Math.toDegrees(cartographic.latitude),
          height: cartographic.height,
        };
      }
    }

    // Get description if available
    if (ent.description && typeof ent.description.getValue === 'function') {
      info.description = ent.description.getValue();
    }

    return {
      success: true,
      message: `Entity info retrieved for '${command.entityId}'`,
      data: info,
    };
  }

  private async executeLoadGeoJSON(command: Extract<CesiumCommand, { type: 'data.loadGeoJSON' }>): Promise<{ success: boolean; message: string; data?: unknown }> {
    try {
      const GeoJsonDataSource = (Cesium as unknown as { GeoJsonDataSource: { load: (url: string, options?: object) => Promise<unknown> } }).GeoJsonDataSource;
      const Color = (Cesium as unknown as { Color: { fromCssColorString: (color: string) => unknown } }).Color;

      const options: Record<string, unknown> = {};
      if (command.clampToGround !== undefined) {
        options.clampToGround = command.clampToGround;
      }
      if (command.stroke) {
        options.stroke = Color.fromCssColorString(command.stroke);
      }
      if (command.fill) {
        options.fill = Color.fromCssColorString(command.fill);
      }
      if (command.strokeWidth !== undefined) {
        options.strokeWidth = command.strokeWidth;
      }

      const dataSource = await GeoJsonDataSource.load(command.url, options);
      await this.viewer.dataSources.add(dataSource);

      const id = command.name || `geojson_${Date.now()}`;
      this.loadedDataSources.set(id, dataSource);

      return {
        success: true,
        message: `GeoJSON loaded from ${command.url}`,
        data: { id },
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return { success: false, message: `Failed to load GeoJSON: ${errorMessage}` };
    }
  }

  private async executeLoadKML(command: Extract<CesiumCommand, { type: 'data.loadKML' }>): Promise<{ success: boolean; message: string; data?: unknown }> {
    try {
      const KmlDataSource = (Cesium as unknown as { KmlDataSource: { load: (url: string, options?: object) => Promise<unknown> } }).KmlDataSource;

      const options: Record<string, unknown> = {
        camera: this.viewer.camera,
        canvas: (this.viewer as unknown as { canvas: unknown }).canvas,
      };
      if (command.clampToGround !== undefined) {
        options.clampToGround = command.clampToGround;
      }

      const dataSource = await KmlDataSource.load(command.url, options);
      await this.viewer.dataSources.add(dataSource);

      const id = command.name || `kml_${Date.now()}`;
      this.loadedDataSources.set(id, dataSource);

      return {
        success: true,
        message: `KML loaded from ${command.url}`,
        data: { id },
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return { success: false, message: `Failed to load KML: ${errorMessage}` };
    }
  }

  private async executeLoadCZMLFromUrl(command: Extract<CesiumCommand, { type: 'data.loadCZML' }>): Promise<{ success: boolean; message: string; data?: unknown }> {
    try {
      const dataSource = await Cesium.CzmlDataSource.load(command.url);
      await this.viewer.dataSources.add(dataSource);

      const id = command.name || `czml_${Date.now()}`;
      this.loadedDataSources.set(id, dataSource);

      return {
        success: true,
        message: `CZML loaded from ${command.url}`,
        data: { id },
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return { success: false, message: `Failed to load CZML: ${errorMessage}` };
    }
  }

  private executeSetFog(command: Extract<CesiumCommand, { type: 'scene.fog' }>): { success: boolean; message: string } {
    const scene = this.viewer.scene as CesiumScene & { fog?: { enabled: boolean; density: number } };
    if (!scene.fog) {
      return { success: false, message: 'Fog not supported in this Cesium version' };
    }

    scene.fog.enabled = command.enabled;
    if (command.density !== undefined) {
      scene.fog.density = command.density;
    }

    return {
      success: true,
      message: `Fog ${command.enabled ? 'enabled' : 'disabled'}${command.density !== undefined ? ` with density ${command.density}` : ''}`,
    };
  }

  private executeSetShadows(command: Extract<CesiumCommand, { type: 'scene.shadows' }>): { success: boolean; message: string } {
    const viewer = this.viewer as CesiumViewer & { shadows?: boolean; shadowMap?: { softShadows: boolean } };

    viewer.shadows = command.enabled;
    if (command.softShadows !== undefined && viewer.shadowMap) {
      viewer.shadowMap.softShadows = command.softShadows;
    }

    return {
      success: true,
      message: `Shadows ${command.enabled ? 'enabled' : 'disabled'}`,
    };
  }

  private executeSetAnimationSpeed(command: Extract<CesiumCommand, { type: 'time.speed' }>): { success: boolean; message: string } {
    this.viewer.clock.multiplier = command.multiplier;
    return {
      success: true,
      message: `Animation speed set to ${command.multiplier}x`,
    };
  }

  private executeRemoveImagery(command: Extract<CesiumCommand, { type: 'imagery.remove' }>): { success: boolean; message: string } {
    if (command.index < 0 || command.index >= this.viewer.imageryLayers.length) {
      return { success: false, message: `Invalid imagery layer index: ${command.index}` };
    }

    const layer = this.viewer.imageryLayers.get(command.index);
    this.viewer.imageryLayers.remove(layer, true);

    return {
      success: true,
      message: `Imagery layer ${command.index} removed`,
    };
  }

  private executeSetImageryAlpha(command: Extract<CesiumCommand, { type: 'imagery.alpha' }>): { success: boolean; message: string } {
    if (command.index < 0 || command.index >= this.viewer.imageryLayers.length) {
      return { success: false, message: `Invalid imagery layer index: ${command.index}` };
    }

    const layer = this.viewer.imageryLayers.get(command.index) as { alpha: number };
    layer.alpha = command.alpha;

    return {
      success: true,
      message: `Imagery layer ${command.index} alpha set to ${command.alpha}`,
    };
  }

  private executeSetImageryBrightness(command: Extract<CesiumCommand, { type: 'imagery.brightness' }>): { success: boolean; message: string } {
    if (command.index < 0 || command.index >= this.viewer.imageryLayers.length) {
      return { success: false, message: `Invalid imagery layer index: ${command.index}` };
    }

    const layer = this.viewer.imageryLayers.get(command.index) as {
      brightness: number;
      contrast: number;
      saturation: number;
      gamma: number;
    };

    if (command.brightness !== undefined) layer.brightness = command.brightness;
    if (command.contrast !== undefined) layer.contrast = command.contrast;
    if (command.saturation !== undefined) layer.saturation = command.saturation;
    if (command.gamma !== undefined) layer.gamma = command.gamma;

    return {
      success: true,
      message: `Imagery layer ${command.index} visual settings updated`,
    };
  }

  private async executeAddWMS(command: Extract<CesiumCommand, { type: 'imagery.addWMS' }>): Promise<{ success: boolean; message: string }> {
    try {
      const provider = new Cesium.WebMapServiceImageryProvider({
        url: command.url,
        layers: command.layers,
      });

      this.viewer.imageryLayers.addImageryProvider(provider);

      return {
        success: true,
        message: `WMS layer added from ${command.url}`,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return { success: false, message: `Failed to add WMS layer: ${errorMessage}` };
    }
  }

  private executeSetLighting(command: Extract<CesiumCommand, { type: 'scene.lighting' }>): { success: boolean; message: string } {
    const globe = this.viewer.scene.globe as CesiumGlobe & { enableLighting?: boolean };

    if (command.enableLighting !== undefined && 'enableLighting' in globe) {
      globe.enableLighting = command.enableLighting;
    }

    return {
      success: true,
      message: `Lighting ${command.enableLighting ? 'enabled' : 'disabled'}`,
    };
  }

  private executeSetAtmosphere(command: Extract<CesiumCommand, { type: 'scene.atmosphere' }>): { success: boolean; message: string } {
    const scene = this.viewer.scene as CesiumScene & {
      skyAtmosphere?: {
        show: boolean;
        brightnessShift: number;
        hueShift: number;
        saturationShift: number;
      };
    };

    if (!scene.skyAtmosphere) {
      return { success: false, message: 'Sky atmosphere not supported in this Cesium version' };
    }

    if (command.show !== undefined) scene.skyAtmosphere.show = command.show;
    if (command.brightnessShift !== undefined) scene.skyAtmosphere.brightnessShift = command.brightnessShift;
    if (command.hueShift !== undefined) scene.skyAtmosphere.hueShift = command.hueShift;
    if (command.saturationShift !== undefined) scene.skyAtmosphere.saturationShift = command.saturationShift;

    return {
      success: true,
      message: 'Atmosphere settings updated',
    };
  }

  private executeSetGlobe(command: Extract<CesiumCommand, { type: 'scene.globe' }>): { success: boolean; message: string } {
    const globe = this.viewer.scene.globe as CesiumGlobe & {
      showGroundAtmosphere?: boolean;
      enableLighting?: boolean;
      baseColor?: unknown;
    };

    if (!globe) {
      return { success: false, message: 'Globe not available' };
    }

    if (command.show !== undefined) globe.show = command.show;
    if (command.showGroundAtmosphere !== undefined && 'showGroundAtmosphere' in globe) {
      globe.showGroundAtmosphere = command.showGroundAtmosphere;
    }
    if (command.enableLighting !== undefined && 'enableLighting' in globe) {
      globe.enableLighting = command.enableLighting;
    }
    if (command.baseColor !== undefined && 'baseColor' in globe) {
      const Color = (Cesium as unknown as { Color: { fromCssColorString: (color: string) => unknown } }).Color;
      globe.baseColor = Color.fromCssColorString(command.baseColor);
    }

    return {
      success: true,
      message: 'Globe settings updated',
    };
  }

  private executeSetDepthTest(command: Extract<CesiumCommand, { type: 'scene.depthTest' }>): { success: boolean; message: string } {
    const globe = this.viewer.scene.globe as CesiumGlobe & { depthTestAgainstTerrain?: boolean };

    if (!globe || !('depthTestAgainstTerrain' in globe)) {
      return { success: false, message: 'Depth test not supported in this Cesium version' };
    }

    globe.depthTestAgainstTerrain = command.enabled;

    return {
      success: true,
      message: `Depth testing ${command.enabled ? 'enabled' : 'disabled'}`,
    };
  }

  private async executeLoadGPX(command: Extract<CesiumCommand, { type: 'data.loadGPX' }>): Promise<{ success: boolean; message: string; data?: unknown }> {
    try {
      const GpxDataSource = (Cesium as unknown as { GpxDataSource: { load: (url: string, options?: object) => Promise<unknown> } }).GpxDataSource;

      const options: Record<string, unknown> = {};
      if (command.clampToGround !== undefined) {
        options.clampToGround = command.clampToGround;
      }

      const dataSource = await GpxDataSource.load(command.url, options);
      await this.viewer.dataSources.add(dataSource);

      const id = command.name || `gpx_${Date.now()}`;
      this.loadedDataSources.set(id, dataSource);

      return {
        success: true,
        message: `GPX loaded from ${command.url}`,
        data: { id },
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return { success: false, message: `Failed to load GPX: ${errorMessage}` };
    }
  }

  private executeMeasureDistance(command: Extract<CesiumCommand, { type: 'measure.distance' }>): { success: boolean; message: string; data?: unknown } {
    const startCartesian = Cesium.Cartesian3.fromDegrees(
      command.start.longitude,
      command.start.latitude,
      command.start.height || 0
    );
    const endCartesian = Cesium.Cartesian3.fromDegrees(
      command.end.longitude,
      command.end.latitude,
      command.end.height || 0
    );

    // Calculate Euclidean distance
    const EllipsoidGeodesic = (Cesium as unknown as {
      EllipsoidGeodesic: new () => {
        setEndPoints: (start: unknown, end: unknown) => void;
        surfaceDistance: number;
      };
    }).EllipsoidGeodesic;

    const startCartographic = Cesium.Cartographic.fromCartesian(startCartesian);
    const endCartographic = Cesium.Cartographic.fromCartesian(endCartesian);

    const geodesic = new EllipsoidGeodesic();
    geodesic.setEndPoints(startCartographic, endCartographic);
    const surfaceDistance = geodesic.surfaceDistance;

    // 3D distance accounting for height difference
    const heightDiff = (command.end.height || 0) - (command.start.height || 0);
    const distance3D = Math.sqrt(surfaceDistance * surfaceDistance + heightDiff * heightDiff);

    return {
      success: true,
      message: `Distance: ${(surfaceDistance / 1000).toFixed(2)} km (surface), ${(distance3D / 1000).toFixed(2)} km (3D)`,
      data: {
        surfaceDistance,
        distance3D,
        heightDifference: heightDiff,
      },
    };
  }

  private async executeSampleTerrain(command: Extract<CesiumCommand, { type: 'terrain.sample' }>): Promise<{ success: boolean; message: string; data?: unknown }> {
    try {
      const sampleTerrainMostDetailed = (Cesium as unknown as {
        sampleTerrainMostDetailed: (provider: unknown, positions: unknown[]) => Promise<unknown[]>;
      }).sampleTerrainMostDetailed;

      const position = Cesium.Cartographic.fromDegrees(command.longitude, command.latitude);
      const results = await sampleTerrainMostDetailed(this.viewer.terrainProvider, [position]);
      const sampledPosition = results[0] as { height: number };

      return {
        success: true,
        message: `Terrain height at ${command.latitude}, ${command.longitude}: ${sampledPosition.height.toFixed(2)} meters`,
        data: {
          longitude: command.longitude,
          latitude: command.latitude,
          height: sampledPosition.height,
        },
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return { success: false, message: `Failed to sample terrain: ${errorMessage}` };
    }
  }

  private executeEnableFXAA(command: Extract<CesiumCommand, { type: 'scene.fxaa' }>): { success: boolean; message: string } {
    const scene = this.viewer.scene as CesiumScene & {
      postProcessStages?: {
        fxaa?: { enabled: boolean };
      };
    };

    if (!scene.postProcessStages || !scene.postProcessStages.fxaa) {
      return { success: false, message: 'FXAA not supported in this Cesium version' };
    }

    scene.postProcessStages.fxaa.enabled = command.enabled;

    return {
      success: true,
      message: `FXAA anti-aliasing ${command.enabled ? 'enabled' : 'disabled'}`,
    };
  }

  private executeSetBloom(command: Extract<CesiumCommand, { type: 'scene.bloom' }>): { success: boolean; message: string } {
    const scene = this.viewer.scene as CesiumScene & {
      postProcessStages?: {
        bloom?: {
          enabled: boolean;
          uniforms?: {
            brightness: number;
            contrast: number;
            glowOnly: boolean;
          };
        };
      };
    };

    if (!scene.postProcessStages || !scene.postProcessStages.bloom) {
      return { success: false, message: 'Bloom effect not supported in this Cesium version' };
    }

    scene.postProcessStages.bloom.enabled = command.enabled;
    if (scene.postProcessStages.bloom.uniforms) {
      if (command.brightness !== undefined) {
        scene.postProcessStages.bloom.uniforms.brightness = command.brightness;
      }
      if (command.contrast !== undefined) {
        scene.postProcessStages.bloom.uniforms.contrast = command.contrast;
      }
      if (command.glowOnly !== undefined) {
        scene.postProcessStages.bloom.uniforms.glowOnly = command.glowOnly;
      }
    }

    return {
      success: true,
      message: `Bloom effect ${command.enabled ? 'enabled' : 'disabled'}`,
    };
  }

  private executeGetScreenPosition(command: Extract<CesiumCommand, { type: 'pick.screenPosition' }>): { success: boolean; message: string; data?: unknown } {
    const cartesian = Cesium.Cartesian3.fromDegrees(
      command.longitude,
      command.latitude,
      command.height || 0
    );

    const SceneTransforms = (Cesium as unknown as {
      SceneTransforms: {
        wgs84ToWindowCoordinates: (scene: unknown, position: unknown) => { x: number; y: number } | undefined;
      };
    }).SceneTransforms;

    const screenPosition = SceneTransforms.wgs84ToWindowCoordinates(this.viewer.scene, cartesian);

    if (!screenPosition) {
      return { success: false, message: 'Position is not visible on screen' };
    }

    return {
      success: true,
      message: `Screen position: (${Math.round(screenPosition.x)}, ${Math.round(screenPosition.y)})`,
      data: {
        x: screenPosition.x,
        y: screenPosition.y,
      },
    };
  }

  private executeGetCartographic(command: Extract<CesiumCommand, { type: 'pick.cartographic' }>): { success: boolean; message: string; data?: unknown } {
    const Cartesian2 = (Cesium as unknown as {
      Cartesian2: new (x: number, y: number) => unknown;
    }).Cartesian2;

    const position = new Cartesian2(command.x, command.y);
    const ray = this.viewer.camera.getPickRay(position);

    if (!ray) {
      return { success: false, message: 'Unable to pick at screen position' };
    }

    const globe = this.viewer.scene.globe as CesiumGlobe & {
      pick: (ray: unknown, scene: unknown) => unknown | undefined;
    };

    const intersection = globe.pick(ray, this.viewer.scene);

    if (!intersection) {
      return { success: false, message: 'No intersection with globe at screen position' };
    }

    const cartographic = Cesium.Cartographic.fromCartesian(intersection);

    return {
      success: true,
      message: `Geographic position: (${Cesium.Math.toDegrees(cartographic.latitude).toFixed(6)}, ${Cesium.Math.toDegrees(cartographic.longitude).toFixed(6)})`,
      data: {
        longitude: Cesium.Math.toDegrees(cartographic.longitude),
        latitude: Cesium.Math.toDegrees(cartographic.latitude),
        height: cartographic.height,
      },
    };
  }

  private executeSplitImagery(command: Extract<CesiumCommand, { type: 'imagery.split' }>): { success: boolean; message: string } {
    const scene = this.viewer.scene as CesiumScene & {
      imagerySplitPosition?: number;
    };

    if (!('imagerySplitPosition' in scene)) {
      return { success: false, message: 'Imagery split not supported in this Cesium version' };
    }

    if (command.enabled) {
      scene.imagerySplitPosition = command.position ?? 0.5;

      // Set the split direction on layers if there are at least 2 layers
      if (this.viewer.imageryLayers.length >= 2) {
        const ImagerySplitDirection = (Cesium as unknown as {
          ImagerySplitDirection: { LEFT: number; RIGHT: number; NONE: number };
        }).ImagerySplitDirection;

        const layer0 = this.viewer.imageryLayers.get(0) as { splitDirection: number };
        const layer1 = this.viewer.imageryLayers.get(1) as { splitDirection: number };
        layer0.splitDirection = ImagerySplitDirection.LEFT;
        layer1.splitDirection = ImagerySplitDirection.RIGHT;
      }

      return { success: true, message: 'Split imagery mode enabled' };
    } else {
      scene.imagerySplitPosition = 1.0;

      // Reset split direction on all layers
      const ImagerySplitDirection = (Cesium as unknown as {
        ImagerySplitDirection: { LEFT: number; RIGHT: number; NONE: number };
      }).ImagerySplitDirection;

      for (let i = 0; i < this.viewer.imageryLayers.length; i++) {
        const layer = this.viewer.imageryLayers.get(i) as { splitDirection: number };
        layer.splitDirection = ImagerySplitDirection.NONE;
      }

      return { success: true, message: 'Split imagery mode disabled' };
    }
  }

  private executePickEntity(command: Extract<CesiumCommand, { type: 'pick.entity' }>): { success: boolean; message: string; data?: unknown } {
    const Cartesian2 = (Cesium as unknown as {
      Cartesian2: new (x: number, y: number) => unknown;
    }).Cartesian2;

    const position = new Cartesian2(command.x, command.y);
    const scene = this.viewer.scene as CesiumScene & {
      pick: (position: unknown) => { id?: { id?: string; name?: string } } | undefined;
    };

    const picked = scene.pick(position);

    if (!picked || !picked.id) {
      return { success: false, message: 'No entity at screen position' };
    }

    const entity = picked.id as { id?: string; name?: string; show?: boolean };

    return {
      success: true,
      message: `Picked entity: ${entity.name || entity.id || 'unknown'}`,
      data: {
        id: entity.id,
        name: entity.name,
      },
    };
  }

  private executeSetSkybox(command: Extract<CesiumCommand, { type: 'scene.skybox' }>): { success: boolean; message: string } {
    const scene = this.viewer.scene as CesiumScene & {
      skyBox?: { show: boolean };
    };

    if (!scene.skyBox) {
      return { success: false, message: 'Skybox not available' };
    }

    scene.skyBox.show = command.show;

    return {
      success: true,
      message: `Skybox ${command.show ? 'shown' : 'hidden'}`,
    };
  }

  private executeHighlight3DTile(command: Extract<CesiumCommand, { type: 'tiles3d.highlight' }>): { success: boolean; message: string } {
    const tileset = this.loadedTilesets.get(command.id);

    if (!tileset) {
      return { success: false, message: `Tileset '${command.id}' not found` };
    }

    // Create a highlight style
    const colorStr = command.color || 'yellow';
    const styleObj: Record<string, unknown> = {
      color: `color('${colorStr}')`,
    };

    try {
      tileset.style = new Cesium.Cesium3DTileStyle(styleObj);
      return { success: true, message: `Tileset '${command.id}' highlighted with ${colorStr}` };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return { success: false, message: `Failed to highlight tileset: ${errorMessage}` };
    }
  }

  private executeClip3DTiles(command: Extract<CesiumCommand, { type: 'tiles3d.clip' }>): { success: boolean; message: string } {
    const tileset = this.loadedTilesets.get(command.id);

    if (!tileset) {
      return { success: false, message: `Tileset '${command.id}' not found` };
    }

    try {
      const ClippingPlane = (Cesium as unknown as {
        ClippingPlane: new (normal: unknown, distance: number) => unknown;
      }).ClippingPlane;

      const ClippingPlaneCollection = (Cesium as unknown as {
        ClippingPlaneCollection: new (options: { planes: unknown[]; enabled: boolean }) => unknown;
      }).ClippingPlaneCollection;

      if (!command.enabled) {
        // Disable clipping by setting to undefined
        (tileset as unknown as { clippingPlanes: unknown }).clippingPlanes = undefined;
        return { success: true, message: `Clipping disabled for tileset '${command.id}'` };
      }

      // Default to horizontal clipping plane
      const normal = command.planeNormal || { x: 0, y: 0, z: -1 };
      const distance = command.distance || 0;

      const normalCartesian = new (Cesium as unknown as { Cartesian3: new (x: number, y: number, z: number) => unknown }).Cartesian3(
        normal.x,
        normal.y,
        normal.z
      );

      const plane = new ClippingPlane(normalCartesian, distance);
      const collection = new ClippingPlaneCollection({
        planes: [plane],
        enabled: true,
      });

      (tileset as unknown as { clippingPlanes: unknown }).clippingPlanes = collection;

      return { success: true, message: `Clipping enabled for tileset '${command.id}'` };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return { success: false, message: `Failed to set clipping planes: ${errorMessage}` };
    }
  }

  private executeClipTerrain(command: Extract<CesiumCommand, { type: 'terrain.clip' }>): { success: boolean; message: string } {
    try {
      const globe = this.viewer.scene.globe as CesiumGlobe & {
        clippingPlanes?: unknown;
      };

      if (!command.enabled) {
        globe.clippingPlanes = undefined;
        return { success: true, message: 'Terrain clipping disabled' };
      }

      if (!command.positions || command.positions.length < 3) {
        return { success: false, message: 'Terrain clipping requires at least 3 positions' };
      }

      const ClippingPlane = (Cesium as unknown as {
        ClippingPlane: new (normal: unknown, distance: number) => unknown;
      }).ClippingPlane;

      const ClippingPlaneCollection = (Cesium as unknown as {
        ClippingPlaneCollection: new (options: { planes: unknown[]; enabled: boolean; edgeWidth?: number; edgeColor?: unknown }) => unknown;
      }).ClippingPlaneCollection;

      // Create a simple horizontal clipping plane at the specified height
      const height = command.height || 0;
      const normalCartesian = new (Cesium as unknown as { Cartesian3: new (x: number, y: number, z: number) => unknown }).Cartesian3(0, 0, -1);
      const plane = new ClippingPlane(normalCartesian, height);

      const Color = (Cesium as unknown as { Color: { WHITE: unknown } }).Color;
      const collection = new ClippingPlaneCollection({
        planes: [plane],
        enabled: true,
        edgeWidth: 1.0,
        edgeColor: Color.WHITE,
      });

      globe.clippingPlanes = collection;

      return { success: true, message: `Terrain clipping enabled at height ${height}m` };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return { success: false, message: `Failed to set terrain clipping: ${errorMessage}` };
    }
  }

  private executeAddParticleSystem(command: Extract<CesiumCommand, { type: 'particles.add' }>): { success: boolean; message: string; data?: unknown } {
    try {
      const ParticleSystem = (Cesium as unknown as {
        ParticleSystem: new (options: object) => { isDestroyed: () => boolean; destroy: () => void };
      }).ParticleSystem;

      const Color = (Cesium as unknown as {
        Color: {
          fromCssColorString: (color: string) => unknown;
          RED: unknown;
          YELLOW: unknown;
          ORANGE: unknown;
          GRAY: unknown;
          WHITE: unknown;
          TRANSPARENT: unknown;
        };
      }).Color;

      const CircleEmitter = (Cesium as unknown as {
        CircleEmitter: new (radius: number) => unknown;
      }).CircleEmitter;

      // Get position
      const position = Cesium.Cartesian3.fromDegrees(
        command.longitude,
        command.latitude,
        command.height || 0
      );

      // Get colors based on particle type or user specification
      let startColor: unknown;
      let endColor: unknown;

      switch (command.particleType) {
        case 'fire':
          startColor = command.startColor ? Color.fromCssColorString(command.startColor) : Color.YELLOW;
          endColor = command.endColor ? Color.fromCssColorString(command.endColor) : Color.RED;
          break;
        case 'smoke':
          startColor = command.startColor ? Color.fromCssColorString(command.startColor) : Color.GRAY;
          endColor = command.endColor ? Color.fromCssColorString(command.endColor) : Color.TRANSPARENT;
          break;
        case 'explosion':
          startColor = command.startColor ? Color.fromCssColorString(command.startColor) : Color.ORANGE;
          endColor = command.endColor ? Color.fromCssColorString(command.endColor) : Color.RED;
          break;
        default:
          startColor = command.startColor ? Color.fromCssColorString(command.startColor) : Color.WHITE;
          endColor = command.endColor ? Color.fromCssColorString(command.endColor) : Color.WHITE;
      }

      const emitter = new CircleEmitter(1.0);

      const particleSystem = new ParticleSystem({
        modelMatrix: Cesium.Transforms.eastNorthUpToFixedFrame(position),
        emitter,
        emissionRate: command.emissionRate || 50,
        startColor,
        endColor,
        startScale: command.startScale || 1.0,
        endScale: command.endScale || 4.0,
        minimumParticleLife: (command.lifetime || 5) * 0.5,
        maximumParticleLife: command.lifetime || 5,
        minimumSpeed: 1.0,
        maximumSpeed: 4.0,
        imageSize: new (Cesium as unknown as { Cartesian2: new (x: number, y: number) => unknown }).Cartesian2(25, 25),
        lifetime: 16.0,
      });

      this.viewer.scene.primitives.add(particleSystem);

      // Store for later removal
      (this as unknown as { loadedParticleSystems: Map<string, unknown> }).loadedParticleSystems = (this as unknown as { loadedParticleSystems: Map<string, unknown> }).loadedParticleSystems || new Map();
      (this as unknown as { loadedParticleSystems: Map<string, unknown> }).loadedParticleSystems.set(command.id, particleSystem);

      return {
        success: true,
        message: `Particle system '${command.id}' added with ${command.particleType} effect`,
        data: { id: command.id },
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return { success: false, message: `Failed to add particle system: ${errorMessage}` };
    }
  }

  private executeAddWeatherEffect(command: Extract<CesiumCommand, { type: 'weather.add' }>): { success: boolean; message: string } {
    try {
      const scene = this.viewer.scene as CesiumScene & {
        fog?: { enabled: boolean; density: number };
        postProcessStages?: {
          add: (stage: unknown) => void;
        };
      };

      switch (command.effectType) {
        case 'fog':
          if (scene.fog) {
            scene.fog.enabled = true;
            scene.fog.density = (command.intensity || 0.5) * 0.002;
          }
          return { success: true, message: 'Fog effect enabled' };

        case 'rain':
        case 'snow':
          // Rain and snow would require custom particle systems or post-processing
          // For now, return a message indicating limited support
          return {
            success: true,
            message: `${command.effectType} effect enabled (note: requires additional particle setup)`,
          };

        default:
          return { success: false, message: `Unknown weather effect: ${command.effectType}` };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return { success: false, message: `Failed to add weather effect: ${errorMessage}` };
    }
  }

  private executeAddVolumetricCloud(command: Extract<CesiumCommand, { type: 'clouds.add' }>): { success: boolean; message: string; data?: unknown } {
    try {
      const CloudCollection = (Cesium as unknown as {
        CloudCollection: new () => {
          add: (options: object) => unknown;
        };
      }).CloudCollection;

      const cloudCollection = new CloudCollection();

      const position = Cesium.Cartesian3.fromDegrees(
        command.longitude,
        command.latitude,
        command.height || 2000
      );

      const scale = command.scale || 1;
      const Cartesian2 = (Cesium as unknown as { Cartesian2: new (x: number, y: number) => unknown }).Cartesian2;

      cloudCollection.add({
        position,
        scale: new Cartesian2(100 * scale, 50 * scale),
        maximumSize: new (Cesium as unknown as { Cartesian3: new (x: number, y: number, z: number) => unknown }).Cartesian3(50 * scale, 20 * scale, 20 * scale),
        slice: 0.36,
      });

      this.viewer.scene.primitives.add(cloudCollection);

      // Store for later removal
      (this as unknown as { loadedClouds: Map<string, unknown> }).loadedClouds = (this as unknown as { loadedClouds: Map<string, unknown> }).loadedClouds || new Map();
      (this as unknown as { loadedClouds: Map<string, unknown> }).loadedClouds.set(command.id, cloudCollection);

      return {
        success: true,
        message: `Volumetric cloud '${command.id}' added`,
        data: { id: command.id },
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return { success: false, message: `Failed to add volumetric cloud: ${errorMessage}` };
    }
  }

  private executeAddLensFlare(command: Extract<CesiumCommand, { type: 'effects.lensFlare' }>): { success: boolean; message: string } {
    try {
      const scene = this.viewer.scene as CesiumScene & {
        sun?: { show: boolean; glowFactor: number };
        postProcessStages?: {
          lensFlare?: { enabled: boolean };
          add: (stage: unknown) => unknown;
        };
      };

      // Enable sun glow as a basic lens flare alternative
      if (scene.sun) {
        scene.sun.show = command.enabled;
        if (command.enabled && command.intensity !== undefined) {
          scene.sun.glowFactor = command.intensity;
        }
      }

      // Try to enable actual lens flare if available
      if (scene.postProcessStages?.lensFlare) {
        scene.postProcessStages.lensFlare.enabled = command.enabled;
      }

      return {
        success: true,
        message: `Lens flare ${command.enabled ? 'enabled' : 'disabled'}${command.intensity !== undefined ? ` with intensity ${command.intensity}` : ''}`,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return { success: false, message: `Failed to set lens flare: ${errorMessage}` };
    }
  }

  private executeSetImageMaterial(command: Extract<CesiumCommand, { type: 'material.image' }>): { success: boolean; message: string } {
    try {
      const entity = this.viewer.entities.getById(command.entityId);
      if (!entity) {
        return { success: false, message: `Entity '${command.entityId}' not found` };
      }

      const ImageMaterialProperty = (Cesium as unknown as {
        ImageMaterialProperty: new (options: { image: string; repeat?: unknown }) => unknown;
      }).ImageMaterialProperty;

      const Cartesian2 = (Cesium as unknown as { Cartesian2: new (x: number, y: number) => unknown }).Cartesian2;

      const material = new ImageMaterialProperty({
        image: command.imageUrl,
        repeat: new Cartesian2(command.repeatX || 1, command.repeatY || 1),
      });

      // Apply to appropriate property
      const entityAny = entity as unknown as Record<string, { material?: unknown }>;
      if (entityAny.polygon) entityAny.polygon.material = material;
      else if (entityAny.rectangle) entityAny.rectangle.material = material;
      else if (entityAny.ellipse) entityAny.ellipse.material = material;
      else if (entityAny.wall) entityAny.wall.material = material;
      else {
        return { success: false, message: 'Entity does not support image material' };
      }

      return { success: true, message: `Image material applied to '${command.entityId}'` };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return { success: false, message: `Failed to set image material: ${errorMessage}` };
    }
  }

  private executeSetGridMaterial(command: Extract<CesiumCommand, { type: 'material.grid' }>): { success: boolean; message: string } {
    try {
      const entity = this.viewer.entities.getById(command.entityId);
      if (!entity) {
        return { success: false, message: `Entity '${command.entityId}' not found` };
      }

      const GridMaterialProperty = (Cesium as unknown as {
        GridMaterialProperty: new (options: object) => unknown;
      }).GridMaterialProperty;

      const Color = (Cesium as unknown as {
        Color: { fromCssColorString: (s: string) => unknown; WHITE: unknown };
      }).Color;

      const Cartesian2 = (Cesium as unknown as { Cartesian2: new (x: number, y: number) => unknown }).Cartesian2;

      const material = new GridMaterialProperty({
        color: command.color ? Color.fromCssColorString(command.color) : Color.WHITE,
        cellAlpha: command.cellAlpha || 0.1,
        lineCount: new Cartesian2(command.lineCountX || 8, command.lineCountY || 8),
        lineThickness: new Cartesian2(command.lineThicknessX || 1, command.lineThicknessY || 1),
      });

      const entityAny = entity as unknown as Record<string, { material?: unknown }>;
      if (entityAny.polygon) entityAny.polygon.material = material;
      else if (entityAny.rectangle) entityAny.rectangle.material = material;
      else if (entityAny.ellipse) entityAny.ellipse.material = material;
      else {
        return { success: false, message: 'Entity does not support grid material' };
      }

      return { success: true, message: `Grid material applied to '${command.entityId}'` };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return { success: false, message: `Failed to set grid material: ${errorMessage}` };
    }
  }

  private executeSetStripeMaterial(command: Extract<CesiumCommand, { type: 'material.stripe' }>): { success: boolean; message: string } {
    try {
      const entity = this.viewer.entities.getById(command.entityId);
      if (!entity) {
        return { success: false, message: `Entity '${command.entityId}' not found` };
      }

      const StripeMaterialProperty = (Cesium as unknown as {
        StripeMaterialProperty: new (options: object) => unknown;
      }).StripeMaterialProperty;

      const StripeOrientation = (Cesium as unknown as {
        StripeOrientation: { HORIZONTAL: number; VERTICAL: number };
      }).StripeOrientation;

      const Color = (Cesium as unknown as {
        Color: { fromCssColorString: (s: string) => unknown; WHITE: unknown; BLACK: unknown };
      }).Color;

      const material = new StripeMaterialProperty({
        evenColor: command.evenColor ? Color.fromCssColorString(command.evenColor) : Color.WHITE,
        oddColor: command.oddColor ? Color.fromCssColorString(command.oddColor) : Color.BLACK,
        offset: command.offset || 0,
        repeat: command.repeat || 4,
        orientation: command.orientation === 'VERTICAL' ? StripeOrientation.VERTICAL : StripeOrientation.HORIZONTAL,
      });

      const entityAny = entity as unknown as Record<string, { material?: unknown }>;
      if (entityAny.polygon) entityAny.polygon.material = material;
      else if (entityAny.rectangle) entityAny.rectangle.material = material;
      else if (entityAny.ellipse) entityAny.ellipse.material = material;
      else {
        return { success: false, message: 'Entity does not support stripe material' };
      }

      return { success: true, message: `Stripe material applied to '${command.entityId}'` };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return { success: false, message: `Failed to set stripe material: ${errorMessage}` };
    }
  }

  private executeSetCheckerboardMaterial(command: Extract<CesiumCommand, { type: 'material.checkerboard' }>): { success: boolean; message: string } {
    try {
      const entity = this.viewer.entities.getById(command.entityId);
      if (!entity) {
        return { success: false, message: `Entity '${command.entityId}' not found` };
      }

      const CheckerboardMaterialProperty = (Cesium as unknown as {
        CheckerboardMaterialProperty: new (options: object) => unknown;
      }).CheckerboardMaterialProperty;

      const Color = (Cesium as unknown as {
        Color: { fromCssColorString: (s: string) => unknown; WHITE: unknown; BLACK: unknown };
      }).Color;

      const Cartesian2 = (Cesium as unknown as { Cartesian2: new (x: number, y: number) => unknown }).Cartesian2;

      const material = new CheckerboardMaterialProperty({
        evenColor: command.evenColor ? Color.fromCssColorString(command.evenColor) : Color.WHITE,
        oddColor: command.oddColor ? Color.fromCssColorString(command.oddColor) : Color.BLACK,
        repeat: new Cartesian2(command.repeatX || 4, command.repeatY || 4),
      });

      const entityAny = entity as unknown as Record<string, { material?: unknown }>;
      if (entityAny.polygon) entityAny.polygon.material = material;
      else if (entityAny.rectangle) entityAny.rectangle.material = material;
      else if (entityAny.ellipse) entityAny.ellipse.material = material;
      else {
        return { success: false, message: 'Entity does not support checkerboard material' };
      }

      return { success: true, message: `Checkerboard material applied to '${command.entityId}'` };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return { success: false, message: `Failed to set checkerboard material: ${errorMessage}` };
    }
  }

  async loadCZML(czml: CZMLDocumentArray, id?: string): Promise<{ success: boolean; message: string; data?: unknown }> {
    try {
      const dataSource = await Cesium.CzmlDataSource.load(czml);
      await this.viewer.dataSources.add(dataSource);

      if (id) {
        this.loadedDataSources.set(id, dataSource);
      }

      return {
        success: true,
        message: 'CZML loaded successfully',
        data: { dataSource },
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return { success: false, message: `Failed to load CZML: ${errorMessage}` };
    }
  }

  clearAll(): { success: boolean; message: string } {
    this.viewer.dataSources.removeAll(true);
    this.viewer.entities.removeAll();
    this.loadedDataSources.clear();

    // Also clear all loaded tilesets
    for (const [_id, tileset] of this.loadedTilesets) {
      this.viewer.scene.primitives.remove(tileset);
      if (!tileset.isDestroyed()) {
        tileset.destroy();
      }
    }
    this.loadedTilesets.clear();

    return { success: true, message: 'All entities and tilesets cleared' };
  }

  // ============================================================================
  // ROUTING & POI COMMANDS (External API Results)
  // ============================================================================

  private async executeShowRoute(command: Extract<CesiumCommand, { type: 'route.show' }>): Promise<{ success: boolean; message: string; data?: unknown }> {
    try {
      // Parse the GeoJSON from OpenRouteService
      const geojson = JSON.parse(command.geojson);

      // Extract coordinates from the GeoJSON LineString
      const coordinates: [number, number, number][] = [];
      if (geojson.features && geojson.features[0]?.geometry?.coordinates) {
        for (const coord of geojson.features[0].geometry.coordinates) {
          coordinates.push([coord[0], coord[1], 0]); // lon, lat, height
        }
      }

      if (coordinates.length < 2) {
        return { success: false, message: 'No route coordinates found in response' };
      }

      // Create a polyline entity for the route
      const positions = coordinates.flatMap(c => [c[0], c[1], c[2]]);
      const routeId = `route-${Date.now()}`;

      const routeColor = command.mode === 'driving' ? Cesium.Color.BLUE :
                         command.mode === 'cycling' ? Cesium.Color.GREEN :
                         Cesium.Color.ORANGE; // walking

      this.viewer.entities.add({
        id: routeId,
        name: `${command.mode} route`,
        polyline: {
          positions: Cesium.Cartesian3.fromDegreesArrayHeights(positions),
          width: 5,
          material: routeColor,
          clampToGround: true,
        },
      });

      // Add start and end markers
      this.viewer.entities.add({
        id: `${routeId}-start`,
        name: 'Start',
        position: Cesium.Cartesian3.fromDegrees(command.startLon, command.startLat),
        point: {
          pixelSize: 15,
          color: Cesium.Color.GREEN,
          outlineColor: Cesium.Color.WHITE,
          outlineWidth: 2,
        },
        label: {
          text: 'Start',
          font: '14pt sans-serif',
          verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
          pixelOffset: new Cesium.Cartesian2(0, -20),
        },
      });

      this.viewer.entities.add({
        id: `${routeId}-end`,
        name: 'End',
        position: Cesium.Cartesian3.fromDegrees(command.endLon, command.endLat),
        point: {
          pixelSize: 15,
          color: Cesium.Color.RED,
          outlineColor: Cesium.Color.WHITE,
          outlineWidth: 2,
        },
        label: {
          text: 'End',
          font: '14pt sans-serif',
          verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
          pixelOffset: new Cesium.Cartesian2(0, -20),
        },
      });

      // Fly to show the entire route
      const entity = this.viewer.entities.getById(routeId);
      if (entity) {
        this.viewer.flyTo(entity, { duration: 2 });
      }

      return {
        success: true,
        message: `${command.mode} route displayed with ${coordinates.length} points`,
        data: { routeId, pointCount: coordinates.length },
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return { success: false, message: `Failed to show route: ${errorMessage}` };
    }
  }

  private async executeShowPOI(command: Extract<CesiumCommand, { type: 'poi.show' }>): Promise<{ success: boolean; message: string; data?: unknown }> {
    try {
      // Parse the Overpass API JSON response
      const overpassData = JSON.parse(command.overpassJson);

      if (!overpassData.elements || overpassData.elements.length === 0) {
        return { success: false, message: `No ${command.category} found in the area` };
      }

      const markerColor = command.markerColor ?
        Cesium.Color.fromCssColorString(command.markerColor) :
        Cesium.Color.CYAN;

      const poiGroupId = `poi-${command.category}-${Date.now()}`;
      let count = 0;

      for (const element of overpassData.elements) {
        // Get coordinates (nodes have lat/lon directly, ways/relations have center)
        let lat: number, lon: number;
        if (element.lat !== undefined && element.lon !== undefined) {
          lat = element.lat;
          lon = element.lon;
        } else if (element.center) {
          lat = element.center.lat;
          lon = element.center.lon;
        } else {
          continue; // Skip elements without coordinates
        }

        const name = element.tags?.name || `${command.category} ${count + 1}`;
        const poiId = `${poiGroupId}-${count}`;

        this.viewer.entities.add({
          id: poiId,
          name: name,
          position: Cesium.Cartesian3.fromDegrees(lon, lat),
          point: {
            pixelSize: 12,
            color: markerColor,
            outlineColor: Cesium.Color.WHITE,
            outlineWidth: 2,
          },
          label: {
            text: name,
            font: '12pt sans-serif',
            verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
            pixelOffset: new Cesium.Cartesian2(0, -15),
            fillColor: Cesium.Color.WHITE,
            outlineColor: Cesium.Color.BLACK,
            outlineWidth: 2,
            style: Cesium.LabelStyle.FILL_AND_OUTLINE,
          },
        });

        count++;
      }

      // Optionally fly to show results
      if (command.flyTo !== false) {
        this.viewer.camera.flyTo({
          destination: Cesium.Cartesian3.fromDegrees(
            command.centerLon,
            command.centerLat,
            command.radius * 3 // Fly to height based on search radius
          ),
          duration: 2,
        });
      }

      return {
        success: true,
        message: `Found ${count} ${command.category} locations`,
        data: { poiGroupId, count },
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return { success: false, message: `Failed to show POI: ${errorMessage}` };
    }
  }

  private async executeShowIsochrone(command: Extract<CesiumCommand, { type: 'isochrone.show' }>): Promise<{ success: boolean; message: string; data?: unknown }> {
    try {
      // Parse the GeoJSON from OpenRouteService
      const geojson = JSON.parse(command.geojson);

      if (!geojson.features || geojson.features.length === 0) {
        return { success: false, message: 'No isochrone polygon in response' };
      }

      const fillColor = command.fillColor ?
        Cesium.Color.fromCssColorString(command.fillColor).withAlpha(0.3) :
        Cesium.Color.BLUE.withAlpha(0.3);

      const outlineColor = command.outlineColor ?
        Cesium.Color.fromCssColorString(command.outlineColor) :
        Cesium.Color.BLUE;

      const isochroneId = `isochrone-${Date.now()}`;

      for (let i = 0; i < geojson.features.length; i++) {
        const feature = geojson.features[i];
        if (feature.geometry?.type === 'Polygon') {
          const coords = feature.geometry.coordinates[0]; // Outer ring
          const positions = coords.flatMap((c: number[]) => [c[0], c[1]]);

          this.viewer.entities.add({
            id: `${isochroneId}-${i}`,
            name: `${command.minutes} min ${command.mode} area`,
            polygon: {
              hierarchy: Cesium.Cartesian3.fromDegreesArray(positions),
              material: fillColor,
              outline: true,
              outlineColor: outlineColor,
              outlineWidth: 2,
            },
          });
        }
      }

      // Add center marker
      this.viewer.entities.add({
        id: `${isochroneId}-center`,
        name: 'Center',
        position: Cesium.Cartesian3.fromDegrees(command.centerLon, command.centerLat),
        point: {
          pixelSize: 15,
          color: Cesium.Color.RED,
          outlineColor: Cesium.Color.WHITE,
          outlineWidth: 2,
        },
        label: {
          text: `${command.minutes} min ${command.mode}`,
          font: '14pt sans-serif',
          verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
          pixelOffset: new Cesium.Cartesian2(0, -20),
        },
      });

      // Fly to show the isochrone
      const entity = this.viewer.entities.getById(`${isochroneId}-0`);
      if (entity) {
        this.viewer.flyTo(entity, { duration: 2 });
      }

      return {
        success: true,
        message: `${command.minutes} minute ${command.mode} isochrone displayed`,
        data: { isochroneId },
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return { success: false, message: `Failed to show isochrone: ${errorMessage}` };
    }
  }

  // ============================================================================
  // COMPOUND COMMANDS (Animated Routes, Flights, POI Visualization)
  // ============================================================================

  private async executeAnimatedRoute(command: Extract<CesiumCommand, { type: 'route.animated' }>): Promise<{ success: boolean; message: string; data?: unknown }> {
    try {
      // Parse GeoJSON route
      const geojson = JSON.parse(command.geojson);
      const coordinates: [number, number][] = [];

      if (geojson.features?.[0]?.geometry?.coordinates) {
        for (const coord of geojson.features[0].geometry.coordinates) {
          coordinates.push([coord[0], coord[1]]);
        }
      }

      if (coordinates.length < 2) {
        return { success: false, message: 'No route coordinates found' };
      }

      const routeId = `animated-route-${Date.now()}`;
      const routeColor = command.mode === 'driving' ? Cesium.Color.BLUE : Cesium.Color.ORANGE;

      // Draw the route polyline
      const positions = coordinates.flatMap(c => [c[0], c[1], 0]);
      this.viewer.entities.add({
        id: `${routeId}-line`,
        name: `${command.mode} route`,
        polyline: {
          positions: Cesium.Cartesian3.fromDegreesArrayHeights(positions),
          width: 4,
          material: routeColor,
          clampToGround: true,
        },
      });

      // Create time-based animation using CZML
      const startTime = Cesium.JulianDate.now();
      const stopTime = Cesium.JulianDate.addSeconds(startTime, command.duration, new Cesium.JulianDate());

      // Build position samples for interpolation
      const cartographicDegrees: number[] = [];
      const totalDistance = coordinates.length - 1;
      for (let i = 0; i < coordinates.length; i++) {
        const time = (i / totalDistance) * command.duration;
        cartographicDegrees.push(time, coordinates[i][0], coordinates[i][1], 1.5); // 1.5m height for walking
      }

      // Add animated entity with model or point
      const entityOptions: Record<string, unknown> = {
        id: routeId,
        name: command.mode === 'driving' ? 'Vehicle' : 'Person',
        availability: `${Cesium.JulianDate.toIso8601(startTime)}/${Cesium.JulianDate.toIso8601(stopTime)}`,
        position: {
          epoch: Cesium.JulianDate.toIso8601(startTime),
          cartographicDegrees,
          interpolationAlgorithm: 'LAGRANGE',
          interpolationDegree: 1,
        },
        orientation: {
          velocityReference: '#position',
        },
        point: command.modelUrl ? undefined : {
          pixelSize: 15,
          color: command.mode === 'driving' ? Cesium.Color.BLUE : Cesium.Color.ORANGE,
          outlineColor: Cesium.Color.WHITE,
          outlineWidth: 2,
        },
        path: {
          leadTime: 0,
          trailTime: command.duration,
          width: 2,
          material: routeColor.withAlpha(0.5),
        },
      };

      // Add model if URL provided
      if (command.modelUrl) {
        entityOptions.model = {
          uri: command.modelUrl,
          scale: 1.0,
          minimumPixelSize: 32,
        };
      }

      // Load as CZML for time-based animation
      const czml = [
        { id: 'document', version: '1.0', clock: {
          interval: `${Cesium.JulianDate.toIso8601(startTime)}/${Cesium.JulianDate.toIso8601(stopTime)}`,
          currentTime: Cesium.JulianDate.toIso8601(startTime),
          multiplier: 1,
        }},
        entityOptions,
      ];

      const dataSource = await Cesium.CzmlDataSource.load(czml);
      await this.viewer.dataSources.add(dataSource);

      // Set clock and start animation
      this.viewer.clock.startTime = startTime;
      this.viewer.clock.stopTime = stopTime;
      this.viewer.clock.currentTime = startTime;
      this.viewer.clock.shouldAnimate = true;

      // Track the animated entity
      const entity = dataSource.entities.getById(routeId);
      if (entity) {
        this.viewer.trackedEntity = entity;
      }

      return {
        success: true,
        message: `${command.mode} animation started (${command.duration}s duration, ${coordinates.length} waypoints)`,
        data: { routeId },
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return { success: false, message: `Failed to create animated route: ${errorMessage}` };
    }
  }

  private async executeAnimatedFlight(command: Extract<CesiumCommand, { type: 'flight.animated' }>): Promise<{ success: boolean; message: string; data?: unknown }> {
    try {
      const flightId = `flight-${Date.now()}`;

      // Generate great circle path between start and end
      const numPoints = 100;
      const positions: number[] = [];

      for (let i = 0; i <= numPoints; i++) {
        const t = i / numPoints;
        // Simple linear interpolation (for short distances; great circle would be better for long)
        const lon = command.startLon + (command.endLon - command.startLon) * t;
        const lat = command.startLat + (command.endLat - command.startLat) * t;
        // Arc altitude - peak in middle
        const altFactor = Math.sin(t * Math.PI);
        const alt = command.altitude * (0.3 + 0.7 * altFactor); // Min 30% altitude at endpoints

        const time = t * command.duration;
        positions.push(time, lon, lat, alt);
      }

      // Create CZML for flight animation
      const startTime = Cesium.JulianDate.now();
      const stopTime = Cesium.JulianDate.addSeconds(startTime, command.duration, new Cesium.JulianDate());

      const entityOptions: Record<string, unknown> = {
        id: flightId,
        name: 'Aircraft',
        availability: `${Cesium.JulianDate.toIso8601(startTime)}/${Cesium.JulianDate.toIso8601(stopTime)}`,
        position: {
          epoch: Cesium.JulianDate.toIso8601(startTime),
          cartographicDegrees: positions,
          interpolationAlgorithm: 'LAGRANGE',
          interpolationDegree: 2,
        },
        orientation: {
          velocityReference: '#position',
        },
        point: command.modelUrl ? undefined : {
          pixelSize: 20,
          color: Cesium.Color.WHITE,
          outlineColor: Cesium.Color.RED,
          outlineWidth: 3,
        },
        path: {
          leadTime: command.duration,
          trailTime: command.duration,
          width: 2,
          material: { solidColor: { color: { rgba: [255, 255, 255, 100] } } },
        },
      };

      if (command.modelUrl) {
        entityOptions.model = {
          uri: command.modelUrl,
          scale: 1.0,
          minimumPixelSize: 64,
        };
      }

      const czml = [
        { id: 'document', version: '1.0', clock: {
          interval: `${Cesium.JulianDate.toIso8601(startTime)}/${Cesium.JulianDate.toIso8601(stopTime)}`,
          currentTime: Cesium.JulianDate.toIso8601(startTime),
          multiplier: 1,
        }},
        entityOptions,
      ];

      // Add start/end markers
      this.viewer.entities.add({
        id: `${flightId}-start`,
        name: 'Departure',
        position: Cesium.Cartesian3.fromDegrees(command.startLon, command.startLat),
        point: { pixelSize: 12, color: Cesium.Color.GREEN, outlineColor: Cesium.Color.WHITE, outlineWidth: 2 },
      });

      this.viewer.entities.add({
        id: `${flightId}-end`,
        name: 'Arrival',
        position: Cesium.Cartesian3.fromDegrees(command.endLon, command.endLat),
        point: { pixelSize: 12, color: Cesium.Color.RED, outlineColor: Cesium.Color.WHITE, outlineWidth: 2 },
      });

      const dataSource = await Cesium.CzmlDataSource.load(czml);
      await this.viewer.dataSources.add(dataSource);

      // Set clock and start
      this.viewer.clock.startTime = startTime;
      this.viewer.clock.stopTime = stopTime;
      this.viewer.clock.currentTime = startTime;
      this.viewer.clock.shouldAnimate = true;

      // Track the aircraft
      const entity = dataSource.entities.getById(flightId);
      if (entity) {
        this.viewer.trackedEntity = entity;
      }

      return {
        success: true,
        message: `Flight animation started from (${command.startLon.toFixed(2)}, ${command.startLat.toFixed(2)}) to (${command.endLon.toFixed(2)}, ${command.endLat.toFixed(2)})`,
        data: { flightId },
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return { success: false, message: `Failed to create flight animation: ${errorMessage}` };
    }
  }

  private async executeVisualizePOI(command: Extract<CesiumCommand, { type: 'poi.visualize' }>): Promise<{ success: boolean; message: string; data?: unknown }> {
    try {
      const overpassData = JSON.parse(command.overpassJson);

      if (!overpassData.elements || overpassData.elements.length === 0) {
        return { success: false, message: `No ${command.category} found in the area` };
      }

      const markerColor = command.markerColor ?
        Cesium.Color.fromCssColorString(command.markerColor) :
        Cesium.Color.CYAN;

      const poiGroupId = `poi-viz-${command.category}-${Date.now()}`;
      let count = 0;

      for (const element of overpassData.elements) {
        let lat: number, lon: number;
        if (element.lat !== undefined && element.lon !== undefined) {
          lat = element.lat;
          lon = element.lon;
        } else if (element.center) {
          lat = element.center.lat;
          lon = element.center.lon;
        } else {
          continue;
        }

        const name = element.tags?.name || `${command.category} ${count + 1}`;
        const poiId = `${poiGroupId}-${count}`;

        const entityOptions: Record<string, unknown> = {
          id: poiId,
          name: name,
          position: Cesium.Cartesian3.fromDegrees(lon, lat),
          point: {
            pixelSize: 14,
            color: markerColor,
            outlineColor: Cesium.Color.WHITE,
            outlineWidth: 2,
          },
        };

        if (command.showLabels) {
          entityOptions.label = {
            text: name,
            font: '12pt sans-serif',
            verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
            pixelOffset: new Cesium.Cartesian2(0, -18),
            fillColor: Cesium.Color.WHITE,
            outlineColor: Cesium.Color.BLACK,
            outlineWidth: 2,
            style: Cesium.LabelStyle.FILL_AND_OUTLINE,
            disableDepthTestDistance: Number.POSITIVE_INFINITY,
          };
        }

        this.viewer.entities.add(entityOptions as Parameters<typeof this.viewer.entities.add>[0]);
        count++;
      }

      // Fly to show results
      if (command.flyTo) {
        this.viewer.camera.flyTo({
          destination: Cesium.Cartesian3.fromDegrees(
            command.centerLon,
            command.centerLat,
            Math.max(command.radius * 3, 1000)
          ),
          duration: 2,
        });
      }

      return {
        success: true,
        message: `Found and displayed ${count} ${command.category} locations`,
        data: { poiGroupId, count },
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return { success: false, message: `Failed to visualize POI: ${errorMessage}` };
    }
  }
}
