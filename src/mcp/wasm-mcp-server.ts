/**
 * WASM MCP Server - JavaScript wrapper for the C++/WASM MCP server
 *
 * This replaces the TypeScript MCP server with a WASM implementation
 * that includes the location database compiled into the binary.
 */

import type { CesiumCommand } from '../cesium/types';

// Type for the WASM module exports
interface WasmModule {
  cwrap: (name: string, returnType: string | null, argTypes: string[]) => (...args: unknown[]) => unknown;
  ccall: (name: string, returnType: string | null, argTypes: string[], args: unknown[]) => unknown;
  UTF8ToString: (ptr: number) => string;
  stringToUTF8: (str: string, ptr: number, maxBytes: number) => void;
  _malloc: (size: number) => number;
  _free: (ptr: number) => void;
}

// Tool definition interface (matches what LLM engine expects)
export interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: {
    type: string;
    properties: Record<string, unknown>;
    required?: string[];
  };
}

// WASM function wrappers
type InitFn = () => void;
type HandleMessageFn = (msg: string) => string;
type GetToolDefinitionsFn = () => string;
type ResolveLocationFn = (name: string) => string;
type ListLocationsFn = () => string;
type SetCameraStateFn = (lon: number, lat: number, height: number, targetLon: number, targetLat: number) => void;
type GetCameraTargetFn = () => string;

export class WasmMCPServer {
  private module: WasmModule | null = null;
  private initialized = false;

  // Wrapped WASM functions
  private wasmInit: InitFn | null = null;
  private wasmHandleMessage: HandleMessageFn | null = null;
  private wasmGetToolDefinitions: GetToolDefinitionsFn | null = null;
  private wasmResolveLocation: ResolveLocationFn | null = null;
  private wasmListLocations: ListLocationsFn | null = null;
  private wasmSetCameraState: SetCameraStateFn | null = null;
  private wasmGetCameraTarget: GetCameraTargetFn | null = null;

  // Cached tool definitions
  private toolDefinitions: ToolDefinition[] | null = null;

  // Command executor callback
  private executeCommand: ((command: CesiumCommand) => Promise<unknown>) | null = null;

  // JSON-RPC request ID counter
  private requestId = 1;

  constructor(executeCommand?: (command: CesiumCommand) => Promise<unknown>) {
    this.executeCommand = executeCommand || null;
  }

  /**
   * Load the WASM JS script via script tag and return the factory function
   * This is needed because Emscripten outputs CommonJS/UMD which doesn't work with ES module imports
   */
  private loadWasmScript(scriptUrl: string): Promise<(config?: object) => Promise<WasmModule>> {
    return new Promise((resolve, reject) => {
      // Check if already loaded (from previous initialization)
      const globalFactory = (globalThis as Record<string, unknown>).createMcpServer as ((config?: object) => Promise<WasmModule>) | undefined;
      if (globalFactory) {
        resolve(globalFactory);
        return;
      }

      const script = document.createElement('script');
      script.src = scriptUrl;
      script.async = true;

      script.onload = () => {
        // The script adds createMcpServer to globalThis
        const factory = (globalThis as Record<string, unknown>).createMcpServer as ((config?: object) => Promise<WasmModule>) | undefined;
        if (factory) {
          resolve(factory);
        } else {
          reject(new Error('createMcpServer not found after loading WASM script'));
        }
      };

      script.onerror = () => {
        reject(new Error(`Failed to load WASM script: ${scriptUrl}`));
      };

      document.head.appendChild(script);
    });
  }

  /**
   * Initialize the WASM MCP server
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      // Get the path to the WASM files with cache busting
      const cacheBust = `?v=${Date.now()}`;
      const wasmJsPath = new URL('../../packages/mcp-server-cpp/dist/cesium-mcp-wasm.js', import.meta.url).href + cacheBust;
      const wasmBinaryPath = new URL('../../packages/mcp-server-cpp/dist/cesium-mcp-wasm.wasm', import.meta.url).href + cacheBust;

      // Load the WASM JS file via script tag (required for Emscripten's CommonJS/UMD output)
      // This adds createMcpServer to the global scope
      const createModule = await this.loadWasmScript(wasmJsPath);

      // Create the WASM module instance
      this.module = await createModule({
        // Locate the .wasm file
        locateFile: (path: string) => {
          if (path.endsWith('.wasm')) {
            return wasmBinaryPath;
          }
          return path;
        }
      });

      if (!this.module) {
        throw new Error('Failed to create WASM module');
      }

      // Wrap the exported functions
      this.wasmInit = this.module.cwrap('init', null, []) as InitFn;
      this.wasmHandleMessage = this.module.cwrap('handleMessage', 'string', ['string']) as HandleMessageFn;
      this.wasmGetToolDefinitions = this.module.cwrap('getToolDefinitions', 'string', []) as GetToolDefinitionsFn;
      this.wasmResolveLocation = this.module.cwrap('resolveLocation', 'string', ['string']) as ResolveLocationFn;
      this.wasmListLocations = this.module.cwrap('listLocations', 'string', []) as ListLocationsFn;
      this.wasmSetCameraState = this.module.cwrap('setCameraState', null, ['number', 'number', 'number', 'number', 'number']) as SetCameraStateFn;
      this.wasmGetCameraTarget = this.module.cwrap('getCameraTarget', 'string', []) as GetCameraTargetFn;

      // Initialize the WASM server
      this.wasmInit();

      // Cache tool definitions
      this.loadToolDefinitions();

      this.initialized = true;
      console.log('[WasmMCPServer] Initialized successfully');
      console.log(`[WasmMCPServer] ${this.toolDefinitions?.length || 0} tools available`);
    } catch (error) {
      console.error('[WasmMCPServer] Failed to initialize:', error);
      throw error;
    }
  }

  /**
   * Load and cache tool definitions from WASM
   */
  private loadToolDefinitions(): void {
    if (!this.wasmGetToolDefinitions) {
      throw new Error('WASM module not initialized');
    }

    const jsonStr = this.wasmGetToolDefinitions();
    try {
      this.toolDefinitions = JSON.parse(jsonStr);
    } catch (e) {
      console.error('[WasmMCPServer] Failed to parse tool definitions:', e);
      this.toolDefinitions = [];
    }
  }

  /**
   * Get tool definitions in the format expected by the LLM engine
   */
  getToolDefinitions(): ToolDefinition[] {
    if (!this.toolDefinitions) {
      throw new Error('WASM module not initialized');
    }
    return this.toolDefinitions;
  }

  /**
   * Execute a tool directly by name and arguments
   * This is the main interface used by the LLM engine
   */
  async executeToolDirect(
    name: string,
    args: unknown
  ): Promise<{ success: boolean; message: string; data?: unknown }> {
    if (!this.wasmHandleMessage) {
      return { success: false, message: 'WASM module not initialized' };
    }

    try {
      // Build JSON-RPC request
      const request = {
        jsonrpc: '2.0',
        id: this.requestId++,
        method: 'tools/call',
        params: {
          name: name,
          arguments: args
        }
      };

      // Send to WASM and get response
      const responseStr = this.wasmHandleMessage(JSON.stringify(request));
      const response = JSON.parse(responseStr);

      if (response.error) {
        return {
          success: false,
          message: response.error.message || 'Tool execution failed'
        };
      }

      // Extract result from JSON-RPC response
      const result = response.result;
      if (!result || !result.content || result.content.length === 0) {
        return { success: false, message: 'Empty response from tool' };
      }

      // The tool result is in result.content[0].text
      const toolOutput = result.content[0].text;

      // Try to parse as JSON (command output from WASM)
      let commandData: Record<string, unknown> | null = null;
      try {
        commandData = JSON.parse(toolOutput);
        console.log(`[WasmMCPServer] Tool '${name}' returned:`, commandData);
      } catch {
        // Not JSON, just text output
        console.log(`[WasmMCPServer] Tool '${name}' returned text:`, toolOutput);
      }

      // If the output is a CesiumCommand (has a "type" field), execute it
      if (commandData && typeof commandData === 'object' && 'type' in commandData) {
        // Convert WASM output format to executor format
        const cesiumCommand = this.mapWasmCommandToExecutor(commandData);
        console.log(`[WasmMCPServer] Mapped to CesiumCommand:`, cesiumCommand);

        // Execute the command if we have an executor
        if (this.executeCommand) {
          try {
            const result = await this.executeCommand(cesiumCommand);
            console.log(`[WasmMCPServer] Execution result:`, result);
          } catch (execError) {
            console.error(`[WasmMCPServer] Command execution failed:`, execError);
          }
        } else {
          console.warn(`[WasmMCPServer] No executor configured!`);
        }

        return {
          success: true,
          message: `Executed ${commandData.type}`,
          data: cesiumCommand
        };
      }

      // Plain text output (like location resolution results)
      return {
        success: true,
        message: toolOutput,
        data: commandData
      };

    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.error(`[WasmMCPServer] Tool '${name}' failed:`, error);
      return { success: false, message };
    }
  }

  /**
   * Resolve a location name to coordinates directly (bypasses JSON-RPC)
   */
  resolveLocation(name: string): { found: boolean; longitude?: number; latitude?: number; heading?: number; error?: string } {
    if (!this.wasmResolveLocation) {
      return { found: false, error: 'WASM module not initialized' };
    }

    try {
      const resultStr = this.wasmResolveLocation(name);
      return JSON.parse(resultStr);
    } catch (e) {
      return { found: false, error: 'Failed to resolve location' };
    }
  }

  /**
   * List all known locations
   */
  listLocations(): Array<{ name: string; longitude: number; latitude: number; heading?: number }> {
    if (!this.wasmListLocations) {
      return [];
    }

    try {
      const resultStr = this.wasmListLocations();
      return JSON.parse(resultStr);
    } catch (e) {
      console.error('[WasmMCPServer] Failed to list locations:', e);
      return [];
    }
  }

  /**
   * Check if the server is initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Set the command executor callback
   */
  setCommandExecutor(executor: (command: CesiumCommand) => Promise<unknown>): void {
    this.executeCommand = executor;
  }

  /**
   * Update the current camera state (called periodically from Cesium viewer)
   * This enables "addSphereHere" and similar tools that place objects at the camera target
   */
  updateCameraState(
    longitude: number,
    latitude: number,
    height: number,
    targetLongitude: number,
    targetLatitude: number
  ): void {
    if (this.wasmSetCameraState) {
      this.wasmSetCameraState(longitude, latitude, height, targetLongitude, targetLatitude);
    }
  }

  /**
   * Get the current camera target position
   */
  getCameraTarget(): { valid: boolean; longitude?: number; latitude?: number; height?: number; targetLongitude?: number; targetLatitude?: number } {
    if (!this.wasmGetCameraTarget) {
      return { valid: false };
    }
    try {
      return JSON.parse(this.wasmGetCameraTarget());
    } catch {
      return { valid: false };
    }
  }

  /**
   * Map WASM command output format to executor CesiumCommand format
   * WASM uses simple types like 'flyTo', 'addBox'
   * Executor expects namespaced types like 'camera.flyTo', 'entity.add'
   */
  private mapWasmCommandToExecutor(wasmOutput: Record<string, unknown>): CesiumCommand {
    const type = wasmOutput.type as string;

    // Camera commands
    if (type === 'flyTo') {
      return {
        type: 'camera.flyTo',
        destination: {
          longitude: wasmOutput.longitude as number,
          latitude: wasmOutput.latitude as number,
          height: (wasmOutput.height as number) || 10000,
        },
        duration: wasmOutput.duration as number,
      } as CesiumCommand;
    }

    if (type === 'lookAt') {
      return {
        type: 'camera.lookAt',
        target: {
          longitude: wasmOutput.longitude as number,
          latitude: wasmOutput.latitude as number,
        },
        offset: {
          heading: 0,
          pitch: -0.785, // -45 degrees
          range: (wasmOutput.range as number) || 10000,
        },
      } as CesiumCommand;
    }

    if (type === 'zoom') {
      return {
        type: 'camera.zoom',
        amount: wasmOutput.amount as number,
      } as CesiumCommand;
    }

    if (type === 'setView') {
      return {
        type: 'camera.setView',
        destination: {
          longitude: wasmOutput.longitude as number,
          latitude: wasmOutput.latitude as number,
          height: wasmOutput.height as number,
        },
        orientation: {
          heading: wasmOutput.heading as number,
          pitch: wasmOutput.pitch as number,
          roll: wasmOutput.roll as number,
        },
      } as CesiumCommand;
    }

    if (type === 'getCamera') {
      return { type: 'camera.get' } as CesiumCommand;
    }

    // Entity add commands - convert to CZML entity format
    if (type === 'addPoint') {
      return {
        type: 'entity.add',
        entity: {
          id: wasmOutput.id as string || `point-${Date.now()}`,
          name: wasmOutput.name as string,
          position: {
            cartographicDegrees: [
              wasmOutput.longitude as number,
              wasmOutput.latitude as number,
              0
            ]
          },
          point: {
            pixelSize: 10,
            color: { rgba: this.colorToRgba(wasmOutput.color as string || 'red') },
          }
        }
      } as CesiumCommand;
    }

    if (type === 'addLabel') {
      return {
        type: 'entity.add',
        entity: {
          id: wasmOutput.id as string || `label-${Date.now()}`,
          name: wasmOutput.name as string,
          position: {
            cartographicDegrees: [
              wasmOutput.longitude as number,
              wasmOutput.latitude as number,
              0
            ]
          },
          label: {
            text: wasmOutput.text as string,
            fillColor: { rgba: [255, 255, 255, 255] },
            font: '14pt sans-serif',
          }
        }
      } as CesiumCommand;
    }

    if (type === 'addSphere') {
      const radius = wasmOutput.radius as number || 1000;
      return {
        type: 'entity.add',
        entity: {
          id: wasmOutput.id as string || `sphere-${Date.now()}`,
          name: wasmOutput.name as string,
          position: {
            cartographicDegrees: [
              wasmOutput.longitude as number,
              wasmOutput.latitude as number,
              wasmOutput.height as number || 0
            ]
          },
          ellipsoid: {
            radii: { cartesian: [radius, radius, radius] },
            material: { solidColor: { color: { rgba: this.colorToRgba(wasmOutput.color as string || 'red') } } },
          }
        }
      } as CesiumCommand;
    }

    if (type === 'addBox') {
      return {
        type: 'entity.add',
        entity: {
          id: wasmOutput.id as string || `box-${Date.now()}`,
          name: wasmOutput.name as string,
          position: {
            cartographicDegrees: [
              wasmOutput.longitude as number,
              wasmOutput.latitude as number,
              wasmOutput.height as number || 0
            ]
          },
          orientation: wasmOutput.heading !== undefined ? {
            heading: wasmOutput.heading as number,
          } : undefined,
          box: {
            dimensions: {
              cartesian: [
                wasmOutput.dimensionX as number || 100,
                wasmOutput.dimensionY as number || 100,
                wasmOutput.dimensionZ as number || 50
              ]
            },
            material: { solidColor: { color: { rgba: this.colorToRgba(wasmOutput.color as string || 'blue') } } },
          }
        }
      } as CesiumCommand;
    }

    if (type === 'addCylinder') {
      return {
        type: 'entity.add',
        entity: {
          id: wasmOutput.id as string || `cylinder-${Date.now()}`,
          name: wasmOutput.name as string,
          position: {
            cartographicDegrees: [
              wasmOutput.longitude as number,
              wasmOutput.latitude as number,
              wasmOutput.height as number || 0
            ]
          },
          cylinder: {
            length: wasmOutput.cylinderHeight as number || 100,
            topRadius: wasmOutput.topRadius as number || 50,
            bottomRadius: wasmOutput.bottomRadius as number || 50,
            material: { solidColor: { color: { rgba: this.colorToRgba(wasmOutput.color as string || 'gray') } } },
          }
        }
      } as CesiumCommand;
    }

    if (type === 'addPolyline') {
      const positions = wasmOutput.positions as Array<{ longitude: number; latitude: number; height?: number }>;
      const degreesArray: number[] = [];
      for (const pos of positions || []) {
        degreesArray.push(pos.longitude, pos.latitude, pos.height || 0);
      }
      return {
        type: 'entity.add',
        entity: {
          id: wasmOutput.id as string || `polyline-${Date.now()}`,
          name: wasmOutput.name as string,
          polyline: {
            positions: { cartographicDegrees: degreesArray },
            width: wasmOutput.width as number || 2,
            material: { solidColor: { color: { rgba: this.colorToRgba(wasmOutput.color as string || 'white') } } },
            clampToGround: wasmOutput.clampToGround as boolean,
          }
        }
      } as CesiumCommand;
    }

    if (type === 'addPolygon') {
      const positions = wasmOutput.positions as Array<{ longitude: number; latitude: number }>;
      const degreesArray: number[] = [];
      for (const pos of positions || []) {
        degreesArray.push(pos.longitude, pos.latitude, 0);
      }
      return {
        type: 'entity.add',
        entity: {
          id: wasmOutput.id as string || `polygon-${Date.now()}`,
          name: wasmOutput.name as string,
          polygon: {
            positions: { cartographicDegrees: degreesArray },
            height: wasmOutput.height as number || 0,
            extrudedHeight: wasmOutput.extrudedHeight as number,
            material: { solidColor: { color: { rgba: this.colorToRgba(wasmOutput.color as string || 'blue') } } },
          }
        }
      } as CesiumCommand;
    }

    if (type === 'addCircle') {
      return {
        type: 'entity.add',
        entity: {
          id: wasmOutput.id as string || `circle-${Date.now()}`,
          name: wasmOutput.name as string,
          position: {
            cartographicDegrees: [
              wasmOutput.longitude as number,
              wasmOutput.latitude as number,
              wasmOutput.height as number || 0
            ]
          },
          ellipse: {
            semiMajorAxis: wasmOutput.radius as number || 1000,
            semiMinorAxis: wasmOutput.radius as number || 1000,
            height: wasmOutput.height as number || 0,
            extrudedHeight: wasmOutput.extrudedHeight as number,
            material: { solidColor: { color: { rgba: this.colorToRgba(wasmOutput.color as string || 'blue') } } },
          }
        }
      } as CesiumCommand;
    }

    if (type === 'addRectangle') {
      return {
        type: 'entity.add',
        entity: {
          id: wasmOutput.id as string || `rectangle-${Date.now()}`,
          name: wasmOutput.name as string,
          rectangle: {
            coordinates: {
              wsenDegrees: [
                wasmOutput.west as number,
                wasmOutput.south as number,
                wasmOutput.east as number,
                wasmOutput.north as number
              ]
            },
            height: wasmOutput.height as number || 0,
            extrudedHeight: wasmOutput.extrudedHeight as number,
            material: { solidColor: { color: { rgba: this.colorToRgba(wasmOutput.color as string || 'blue') } } },
          }
        }
      } as CesiumCommand;
    }

    if (type === 'addModel') {
      return {
        type: 'entity.add',
        entity: {
          id: wasmOutput.id as string || `model-${Date.now()}`,
          name: wasmOutput.name as string,
          position: {
            cartographicDegrees: [
              wasmOutput.longitude as number,
              wasmOutput.latitude as number,
              wasmOutput.height as number || 0
            ]
          },
          orientation: wasmOutput.heading !== undefined ? {
            heading: wasmOutput.heading as number,
          } : undefined,
          model: {
            gltf: wasmOutput.url as string,
            scale: wasmOutput.scale as number || 1,
          }
        }
      } as CesiumCommand;
    }

    // Entity manipulation commands
    if (type === 'removeEntity') {
      return {
        type: 'entity.remove',
        id: wasmOutput.id as string,
      } as CesiumCommand;
    }

    if (type === 'showEntity') {
      const show = wasmOutput.show as boolean;
      return {
        type: show ? 'entity.show' : 'entity.hide',
        entityId: wasmOutput.id as string,
      } as CesiumCommand;
    }

    if (type === 'flyToEntity') {
      return {
        type: 'entity.flyTo',
        entityId: wasmOutput.id as string,
        duration: wasmOutput.duration as number,
      } as CesiumCommand;
    }

    if (type === 'rotateEntity' || type === 'resizeEntity' || type === 'moveEntity' || type === 'setEntityStyle') {
      return {
        type: 'entity.update',
        id: wasmOutput.id as string,
        properties: wasmOutput,
      } as CesiumCommand;
    }

    // Scene commands
    if (type === 'setSceneMode') {
      const mode = (wasmOutput.mode as string)?.toUpperCase();
      return {
        type: 'scene.mode',
        mode: mode === '2D' ? '2D' : mode === 'COLUMBUS' ? 'COLUMBUS_VIEW' : '3D',
      } as CesiumCommand;
    }

    if (type === 'clearAll') {
      return { type: 'entity.remove', id: '*' } as CesiumCommand;
    }

    // Imagery commands
    if (type === 'setImagery') {
      const provider = (wasmOutput.provider as string)?.toLowerCase();
      return {
        type: 'imagery.add',
        provider: provider === 'sentinel' ? 'arcgis' : provider as 'bing' | 'osm' | 'arcgis',
        url: wasmOutput.url as string,
      } as CesiumCommand;
    }

    // Terrain commands
    if (type === 'setTerrain') {
      const provider = (wasmOutput.provider as string)?.toLowerCase();
      return {
        type: 'terrain.set',
        provider: provider === 'cesium' ? 'cesium' : provider === 'ellipsoid' ? 'ellipsoid' : 'custom',
        assetId: wasmOutput.ionAssetId as number,
      } as CesiumCommand;
    }

    // Time commands
    if (type === 'setTime') {
      return {
        type: 'time.set',
        currentTime: wasmOutput.iso8601 as string,
      } as CesiumCommand;
    }

    if (type === 'setClockRange') {
      return {
        type: 'time.set',
        startTime: wasmOutput.startTime as string,
        stopTime: wasmOutput.endTime as string,
        multiplier: wasmOutput.multiplier as number,
      } as CesiumCommand;
    }

    if (type === 'playAnimation') {
      return { type: 'time.play' } as CesiumCommand;
    }

    if (type === 'pauseAnimation') {
      return { type: 'time.pause' } as CesiumCommand;
    }

    // 3D Tiles
    if (type === 'loadTileset') {
      return {
        type: 'tiles3d.add',
        id: wasmOutput.id as string || `tileset-${Date.now()}`,
        url: wasmOutput.url as string || '',
        assetId: wasmOutput.ionAssetId as number,
        show: wasmOutput.show as boolean,
      } as CesiumCommand;
    }

    if (type === 'toggleLayerVisibility') {
      return {
        type: 'layer.toggle',
        layerId: wasmOutput.id as string,
        visible: wasmOutput.visible as boolean,
      } as CesiumCommand;
    }

    // Default: pass through as-is (may fail if executor doesn't support it)
    console.warn(`[WasmMCPServer] Unknown command type: ${type}, passing through`);
    return wasmOutput as unknown as CesiumCommand;
  }

  /**
   * Convert color name to RGBA array
   */
  private colorToRgba(color: string): [number, number, number, number] {
    const colors: Record<string, [number, number, number, number]> = {
      'red': [255, 0, 0, 255],
      'green': [0, 255, 0, 255],
      'blue': [0, 0, 255, 255],
      'yellow': [255, 255, 0, 255],
      'cyan': [0, 255, 255, 255],
      'magenta': [255, 0, 255, 255],
      'white': [255, 255, 255, 255],
      'black': [0, 0, 0, 255],
      'orange': [255, 165, 0, 255],
      'purple': [128, 0, 128, 255],
      'pink': [255, 192, 203, 255],
      'brown': [139, 69, 19, 255],
      'gray': [128, 128, 128, 255],
      'grey': [128, 128, 128, 255],
    };
    return colors[color.toLowerCase()] || [255, 255, 255, 255];
  }
}
