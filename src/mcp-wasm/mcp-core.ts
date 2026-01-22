/**
 * MCP Core - Pure TypeScript implementation of MCP protocol for WASM compatibility
 * No DOM or Node.js dependencies - pure functions only
 */

// ============================================================================
// Types
// ============================================================================

/** JSON-RPC 2.0 error codes */
export const enum JsonRpcErrorCode {
  ParseError = -32700,
  InvalidRequest = -32600,
  MethodNotFound = -32601,
  InvalidParams = -32602,
  InternalError = -32603,
}

/** JSON-RPC 2.0 request structure */
export interface JsonRpcRequest {
  jsonrpc: '2.0';
  id?: string | number;
  method: string;
  params?: unknown;
}

/** JSON-RPC 2.0 response structure */
export interface JsonRpcResponse {
  jsonrpc: '2.0';
  id: string | number | null;
  result?: unknown;
  error?: JsonRpcError;
}

/** JSON-RPC 2.0 error structure */
export interface JsonRpcError {
  code: number;
  message: string;
  data?: unknown;
}

/** MCP tool definition */
export interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: JsonSchema;
}

/** JSON Schema for tool input validation */
export interface JsonSchema {
  type: string;
  properties?: Record<string, JsonSchema>;
  required?: string[];
  items?: JsonSchema;
  enum?: string[];
  minimum?: number;
  maximum?: number;
  description?: string;
}

/** MCP tool call parameters */
export interface ToolCallParams {
  name: string;
  arguments: Record<string, unknown>;
}

/** MCP tool result */
export interface ToolResult {
  content: ToolResultContent[];
  isError?: boolean;
}

/** MCP tool result content */
export interface ToolResultContent {
  type: 'text' | 'image' | 'resource';
  text?: string;
  data?: string;
  mimeType?: string;
}

/** MCP resource definition */
export interface ResourceDefinition {
  uri: string;
  name: string;
  description?: string;
  mimeType?: string;
}

/** MCP server capabilities */
export interface ServerCapabilities {
  tools?: Record<string, unknown>;
  resources?: Record<string, unknown>;
  prompts?: Record<string, unknown>;
}

/** MCP initialize result */
export interface InitializeResult {
  protocolVersion: string;
  serverInfo: {
    name: string;
    version: string;
  };
  capabilities: ServerCapabilities;
}

/** Tool handler function type */
export type ToolHandler = (args: Record<string, unknown>) => Promise<ToolResult> | ToolResult;

/** Resource reader function type */
export type ResourceReader = (uri: string) => Promise<string> | string;

// ============================================================================
// JSON-RPC Message Parsing
// ============================================================================

/**
 * Parse a JSON-RPC message from a string
 * @param data - Raw JSON string
 * @returns Parsed request or error response
 */
export function parseJsonRpcMessage(data: string): JsonRpcRequest | JsonRpcResponse {
  try {
    const parsed = JSON.parse(data);

    if (typeof parsed !== 'object' || parsed === null) {
      throw new Error('Invalid JSON-RPC message: not an object');
    }

    if (parsed.jsonrpc !== '2.0') {
      throw new Error('Invalid JSON-RPC version');
    }

    return parsed as JsonRpcRequest | JsonRpcResponse;
  } catch (error) {
    throw new Error(`JSON-RPC parse error: ${error instanceof Error ? error.message : 'unknown'}`);
  }
}

/**
 * Check if a message is a request (has method property)
 */
export function isRequest(message: JsonRpcRequest | JsonRpcResponse): message is JsonRpcRequest {
  return 'method' in message;
}

/**
 * Check if a message is a response (has result or error property)
 */
export function isResponse(message: JsonRpcRequest | JsonRpcResponse): message is JsonRpcResponse {
  return 'result' in message || 'error' in message;
}

/**
 * Check if a message is a notification (request without id)
 */
export function isNotification(message: JsonRpcRequest): boolean {
  return message.id === undefined;
}

// ============================================================================
// Message Serialization
// ============================================================================

/**
 * Create a JSON-RPC request
 */
export function createRequest(
  id: string | number,
  method: string,
  params?: unknown
): JsonRpcRequest {
  const request: JsonRpcRequest = {
    jsonrpc: '2.0',
    id,
    method,
  };

  if (params !== undefined) {
    request.params = params;
  }

  return request;
}

/**
 * Create a JSON-RPC notification (request without id)
 */
export function createNotification(method: string, params?: unknown): JsonRpcRequest {
  const notification: JsonRpcRequest = {
    jsonrpc: '2.0',
    method,
  };

  if (params !== undefined) {
    notification.params = params;
  }

  return notification;
}

/**
 * Create a JSON-RPC success response
 */
export function createSuccessResponse(
  id: string | number | null,
  result: unknown
): JsonRpcResponse {
  return {
    jsonrpc: '2.0',
    id,
    result,
  };
}

/**
 * Create a JSON-RPC error response
 */
export function createErrorResponse(
  id: string | number | null,
  code: number,
  message: string,
  data?: unknown
): JsonRpcResponse {
  const response: JsonRpcResponse = {
    jsonrpc: '2.0',
    id,
    error: { code, message },
  };

  if (data !== undefined) {
    response.error!.data = data;
  }

  return response;
}

/**
 * Serialize a JSON-RPC message to string
 */
export function serializeMessage(message: JsonRpcRequest | JsonRpcResponse): string {
  return JSON.stringify(message);
}

// ============================================================================
// Tool Registry
// ============================================================================

/**
 * Tool registry for managing MCP tools
 */
export class ToolRegistry {
  private tools: Map<string, ToolDefinition> = new Map();
  private handlers: Map<string, ToolHandler> = new Map();

  /**
   * Register a tool with its handler
   */
  register(definition: ToolDefinition, handler: ToolHandler): void {
    this.tools.set(definition.name, definition);
    this.handlers.set(definition.name, handler);
  }

  /**
   * Unregister a tool
   */
  unregister(name: string): boolean {
    const hadTool = this.tools.delete(name);
    this.handlers.delete(name);
    return hadTool;
  }

  /**
   * Get a tool definition by name
   */
  getTool(name: string): ToolDefinition | undefined {
    return this.tools.get(name);
  }

  /**
   * Get a tool handler by name
   */
  getHandler(name: string): ToolHandler | undefined {
    return this.handlers.get(name);
  }

  /**
   * Check if a tool exists
   */
  hasTool(name: string): boolean {
    return this.tools.has(name);
  }

  /**
   * Get all registered tools
   */
  getAllTools(): ToolDefinition[] {
    return Array.from(this.tools.values());
  }

  /**
   * Execute a tool by name with given arguments
   */
  async execute(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    const handler = this.handlers.get(name);

    if (!handler) {
      return {
        content: [{ type: 'text', text: `Tool not found: ${name}` }],
        isError: true,
      };
    }

    try {
      return await handler(args);
    } catch (error) {
      return {
        content: [{
          type: 'text',
          text: `Tool execution error: ${error instanceof Error ? error.message : 'unknown'}`,
        }],
        isError: true,
      };
    }
  }

  /**
   * Clear all registered tools
   */
  clear(): void {
    this.tools.clear();
    this.handlers.clear();
  }
}

// ============================================================================
// Resource Registry
// ============================================================================

/**
 * Resource registry for managing MCP resources
 */
export class ResourceRegistry {
  private resources: Map<string, ResourceDefinition> = new Map();
  private readers: Map<string, ResourceReader> = new Map();

  /**
   * Register a resource with its reader
   */
  register(definition: ResourceDefinition, reader: ResourceReader): void {
    this.resources.set(definition.uri, definition);
    this.readers.set(definition.uri, reader);
  }

  /**
   * Unregister a resource
   */
  unregister(uri: string): boolean {
    const hadResource = this.resources.delete(uri);
    this.readers.delete(uri);
    return hadResource;
  }

  /**
   * Get a resource definition by URI
   */
  getResource(uri: string): ResourceDefinition | undefined {
    return this.resources.get(uri);
  }

  /**
   * Get all registered resources
   */
  getAllResources(): ResourceDefinition[] {
    return Array.from(this.resources.values());
  }

  /**
   * Read a resource by URI
   */
  async read(uri: string): Promise<{ contents: Array<{ uri: string; mimeType?: string; text: string }> }> {
    const reader = this.readers.get(uri);
    const resource = this.resources.get(uri);

    if (!reader || !resource) {
      throw new Error(`Resource not found: ${uri}`);
    }

    const text = await reader(uri);

    return {
      contents: [{
        uri,
        mimeType: resource.mimeType,
        text,
      }],
    };
  }

  /**
   * Clear all registered resources
   */
  clear(): void {
    this.resources.clear();
    this.readers.clear();
  }
}

// ============================================================================
// MCP Protocol Handler
// ============================================================================

/**
 * MCP Protocol configuration
 */
export interface MCPConfig {
  serverName: string;
  serverVersion: string;
  protocolVersion?: string;
}

/**
 * MCP Protocol Handler - pure function based message handling
 */
export class MCPProtocolHandler {
  private config: MCPConfig;
  private toolRegistry: ToolRegistry;
  private resourceRegistry: ResourceRegistry;
  private initialized: boolean = false;

  constructor(config: MCPConfig) {
    this.config = {
      ...config,
      protocolVersion: config.protocolVersion || '2024-11-05',
    };
    this.toolRegistry = new ToolRegistry();
    this.resourceRegistry = new ResourceRegistry();
  }

  /**
   * Get the tool registry
   */
  getToolRegistry(): ToolRegistry {
    return this.toolRegistry;
  }

  /**
   * Get the resource registry
   */
  getResourceRegistry(): ResourceRegistry {
    return this.resourceRegistry;
  }

  /**
   * Handle an incoming JSON-RPC message
   */
  async handleMessage(data: string): Promise<string | null> {
    let message: JsonRpcRequest | JsonRpcResponse;

    try {
      message = parseJsonRpcMessage(data);
    } catch (error) {
      const errorResponse = createErrorResponse(
        null,
        JsonRpcErrorCode.ParseError,
        error instanceof Error ? error.message : 'Parse error'
      );
      return serializeMessage(errorResponse);
    }

    if (!isRequest(message)) {
      // This is a response, not a request - no action needed
      return null;
    }

    const response = await this.handleRequest(message);

    // Don't send response for notifications
    if (isNotification(message)) {
      return null;
    }

    return serializeMessage(response);
  }

  /**
   * Handle a JSON-RPC request
   */
  private async handleRequest(request: JsonRpcRequest): Promise<JsonRpcResponse> {
    const id = request.id ?? null;

    try {
      const result = await this.dispatchMethod(request.method, request.params);
      return createSuccessResponse(id, result);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Internal error';
      const code = this.getErrorCode(error);
      return createErrorResponse(id, code, message);
    }
  }

  /**
   * Dispatch a method call to the appropriate handler
   */
  private async dispatchMethod(method: string, params: unknown): Promise<unknown> {
    switch (method) {
      case 'initialize':
        return this.handleInitialize();

      case 'initialized':
        this.initialized = true;
        return {};

      case 'tools/list':
        return this.handleToolsList();

      case 'tools/call':
        return this.handleToolCall(params as ToolCallParams);

      case 'resources/list':
        return this.handleResourcesList();

      case 'resources/read':
        return this.handleResourceRead(params as { uri: string });

      case 'ping':
        return {};

      default:
        throw Object.assign(new Error(`Method not found: ${method}`), {
          code: JsonRpcErrorCode.MethodNotFound,
        });
    }
  }

  /**
   * Handle initialize request
   */
  private handleInitialize(): InitializeResult {
    return {
      protocolVersion: this.config.protocolVersion!,
      serverInfo: {
        name: this.config.serverName,
        version: this.config.serverVersion,
      },
      capabilities: {
        tools: {},
        resources: {},
      },
    };
  }

  /**
   * Handle tools/list request
   */
  private handleToolsList(): { tools: ToolDefinition[] } {
    return { tools: this.toolRegistry.getAllTools() };
  }

  /**
   * Handle tools/call request
   */
  private async handleToolCall(params: ToolCallParams): Promise<ToolResult> {
    if (!params || !params.name) {
      throw Object.assign(new Error('Invalid params: name is required'), {
        code: JsonRpcErrorCode.InvalidParams,
      });
    }

    if (!this.toolRegistry.hasTool(params.name)) {
      throw Object.assign(new Error(`Tool not found: ${params.name}`), {
        code: JsonRpcErrorCode.InvalidParams,
      });
    }

    return this.toolRegistry.execute(params.name, params.arguments || {});
  }

  /**
   * Handle resources/list request
   */
  private handleResourcesList(): { resources: ResourceDefinition[] } {
    return { resources: this.resourceRegistry.getAllResources() };
  }

  /**
   * Handle resources/read request
   */
  private async handleResourceRead(params: { uri: string }): Promise<unknown> {
    if (!params || !params.uri) {
      throw Object.assign(new Error('Invalid params: uri is required'), {
        code: JsonRpcErrorCode.InvalidParams,
      });
    }

    return this.resourceRegistry.read(params.uri);
  }

  /**
   * Get appropriate error code from error
   */
  private getErrorCode(error: unknown): number {
    if (error && typeof error === 'object' && 'code' in error) {
      return (error as { code: number }).code;
    }
    return JsonRpcErrorCode.InternalError;
  }

  /**
   * Check if server is initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }
}

// ============================================================================
// Cesium Tool Definitions (matching cesium-mcp-server.ts)
// ============================================================================

/**
 * Create standard Cesium tool definitions
 */
export function createCesiumToolDefinitions(): ToolDefinition[] {
  return [
    {
      name: 'flyTo',
      description: 'Fly the camera to a specific geographic location',
      inputSchema: {
        type: 'object',
        properties: {
          longitude: { type: 'number', minimum: -180, maximum: 180, description: 'Longitude in degrees' },
          latitude: { type: 'number', minimum: -90, maximum: 90, description: 'Latitude in degrees' },
          height: { type: 'number', description: 'Camera height in meters' },
          duration: { type: 'number', description: 'Flight duration in seconds' },
        },
        required: ['longitude', 'latitude'],
      },
    },
    {
      name: 'lookAt',
      description: 'Orient the camera to look at a specific location',
      inputSchema: {
        type: 'object',
        properties: {
          longitude: { type: 'number', minimum: -180, maximum: 180, description: 'Target longitude' },
          latitude: { type: 'number', minimum: -90, maximum: 90, description: 'Target latitude' },
          range: { type: 'number', description: 'Distance from target in meters' },
        },
        required: ['longitude', 'latitude'],
      },
    },
    {
      name: 'zoom',
      description: 'Zoom the camera in or out',
      inputSchema: {
        type: 'object',
        properties: {
          amount: { type: 'number', description: 'Zoom amount (positive = in, negative = out)' },
        },
        required: ['amount'],
      },
    },
    {
      name: 'addPoint',
      description: 'Add a point marker at a location',
      inputSchema: {
        type: 'object',
        properties: {
          longitude: { type: 'number', minimum: -180, maximum: 180 },
          latitude: { type: 'number', minimum: -90, maximum: 90 },
          name: { type: 'string', description: 'Label for the point' },
          color: { type: 'string', enum: ['red', 'green', 'blue', 'yellow', 'orange', 'purple', 'pink', 'cyan', 'white', 'black', 'gray', 'grey'] },
          size: { type: 'number', description: 'Point size in pixels' },
        },
        required: ['longitude', 'latitude'],
      },
    },
    {
      name: 'addLabel',
      description: 'Add a text label at a location',
      inputSchema: {
        type: 'object',
        properties: {
          longitude: { type: 'number', minimum: -180, maximum: 180 },
          latitude: { type: 'number', minimum: -90, maximum: 90 },
          text: { type: 'string', description: 'Label text' },
          color: { type: 'string', enum: ['red', 'green', 'blue', 'yellow', 'orange', 'purple', 'pink', 'cyan', 'white', 'black', 'gray', 'grey'] },
        },
        required: ['longitude', 'latitude', 'text'],
      },
    },
    {
      name: 'addPolyline',
      description: 'Draw a line connecting multiple points',
      inputSchema: {
        type: 'object',
        properties: {
          positions: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                longitude: { type: 'number', minimum: -180, maximum: 180 },
                latitude: { type: 'number', minimum: -90, maximum: 90 },
                height: { type: 'number' },
              },
              required: ['longitude', 'latitude'],
            },
            description: 'Array of positions',
          },
          name: { type: 'string' },
          color: { type: 'string', enum: ['red', 'green', 'blue', 'yellow', 'orange', 'purple', 'pink', 'cyan', 'white', 'black', 'gray', 'grey'] },
          width: { type: 'number' },
        },
        required: ['positions'],
      },
    },
    {
      name: 'addPolygon',
      description: 'Draw a filled polygon',
      inputSchema: {
        type: 'object',
        properties: {
          positions: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                longitude: { type: 'number', minimum: -180, maximum: 180 },
                latitude: { type: 'number', minimum: -90, maximum: 90 },
                height: { type: 'number' },
              },
              required: ['longitude', 'latitude'],
            },
            description: 'Array of vertex positions',
          },
          name: { type: 'string' },
          color: { type: 'string', enum: ['red', 'green', 'blue', 'yellow', 'orange', 'purple', 'pink', 'cyan', 'white', 'black', 'gray', 'grey'] },
          extrudedHeight: { type: 'number', description: 'Height to extrude the polygon' },
        },
        required: ['positions'],
      },
    },
    {
      name: 'addCircle',
      description: 'Draw a circle at a location',
      inputSchema: {
        type: 'object',
        properties: {
          longitude: { type: 'number', minimum: -180, maximum: 180 },
          latitude: { type: 'number', minimum: -90, maximum: 90 },
          radius: { type: 'number', description: 'Circle radius in meters' },
          name: { type: 'string' },
          color: { type: 'string', enum: ['red', 'green', 'blue', 'yellow', 'orange', 'purple', 'pink', 'cyan', 'white', 'black', 'gray', 'grey'] },
        },
        required: ['longitude', 'latitude', 'radius'],
      },
    },
    {
      name: 'removeEntity',
      description: 'Remove an entity by its ID',
      inputSchema: {
        type: 'object',
        properties: {
          id: { type: 'string', description: 'Entity ID to remove' },
        },
        required: ['id'],
      },
    },
    {
      name: 'clearAll',
      description: 'Remove all entities from the scene',
      inputSchema: {
        type: 'object',
        properties: {},
      },
    },
    {
      name: 'setSceneMode',
      description: 'Change the scene viewing mode',
      inputSchema: {
        type: 'object',
        properties: {
          mode: { type: 'string', enum: ['2D', '3D', 'COLUMBUS_VIEW'] },
        },
        required: ['mode'],
      },
    },
    {
      name: 'setTime',
      description: 'Set the simulation time',
      inputSchema: {
        type: 'object',
        properties: {
          time: { type: 'string', description: 'ISO 8601 date-time string' },
          multiplier: { type: 'number', description: 'Time multiplier for animation' },
        },
        required: ['time'],
      },
    },
    {
      name: 'playAnimation',
      description: 'Start time animation',
      inputSchema: {
        type: 'object',
        properties: {},
      },
    },
    {
      name: 'pauseAnimation',
      description: 'Pause time animation',
      inputSchema: {
        type: 'object',
        properties: {},
      },
    },
    {
      name: 'generateCZML',
      description: 'Generate CZML document from entities',
      inputSchema: {
        type: 'object',
        properties: {
          entities: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                type: { type: 'string', enum: ['point', 'label', 'polyline', 'polygon', 'circle'] },
                position: {
                  type: 'object',
                  properties: {
                    longitude: { type: 'number' },
                    latitude: { type: 'number' },
                    height: { type: 'number' },
                  },
                },
                positions: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      longitude: { type: 'number' },
                      latitude: { type: 'number' },
                      height: { type: 'number' },
                    },
                  },
                },
                name: { type: 'string' },
                text: { type: 'string' },
                color: { type: 'string' },
                radius: { type: 'number' },
              },
              required: ['type'],
            },
          },
          documentName: { type: 'string' },
        },
        required: ['entities'],
      },
    },
  ];
}

/**
 * Create standard Cesium resource definitions
 */
export function createCesiumResourceDefinitions(): ResourceDefinition[] {
  return [
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
  ];
}
