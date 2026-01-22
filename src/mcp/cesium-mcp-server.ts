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
  removeEntity: {
    name: 'removeEntity',
    description: 'Remove an entity by its ID',
    inputSchema: z.object({
      id: z.string().describe('Entity ID to remove'),
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

      case 'removeEntity': {
        const args = input as ToolInput<'removeEntity'>;
        const command: CesiumCommand = {
          type: 'entity.remove',
          id: args.id,
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
