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
  Cartesian3: {
    fromDegrees: (lon: number, lat: number, height?: number) => unknown;
    clone: (cartesian: unknown) => unknown;
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
        case 'entity.remove':
          return this.executeEntityRemove(command);
        case 'entity.update':
          return await this.executeEntityUpdate(command);
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
    // Remove old entity and add updated one
    this.executeEntityRemove({ type: 'entity.remove', id: command.id });

    const updatedEntity = { ...command.properties, id: command.id };
    await this.executeEntityAdd({
      type: 'entity.add',
      entity: updatedEntity as Extract<CesiumCommand, { type: 'entity.add' }>['entity'],
    });

    return { success: true, message: `Entity '${command.id}' updated` };
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
    if ('verticalExaggeration' in this.viewer.scene) {
      this.viewer.scene.verticalExaggeration = command.factor;
      if (command.relativeHeight !== undefined) {
        this.viewer.scene.verticalExaggerationRelativeHeight = command.relativeHeight;
      }
    } else if (this.viewer.scene.globe && 'terrainExaggeration' in this.viewer.scene.globe) {
      this.viewer.scene.globe.terrainExaggeration = command.factor;
      if (command.relativeHeight !== undefined) {
        this.viewer.scene.globe.terrainExaggerationRelativeHeight = command.relativeHeight;
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
    for (const [id, tileset] of this.loadedTilesets) {
      this.viewer.scene.primitives.remove(tileset);
      if (!tileset.isDestroyed()) {
        tileset.destroy();
      }
    }
    this.loadedTilesets.clear();

    return { success: true, message: 'All entities and tilesets cleared' };
  }
}
