/**
 * AssemblyScript MCP Module
 * Basic MCP message handling compiled to WebAssembly
 *
 * Compile with: npx asc wasm/assembly/index.ts -o wasm/build/mcp.wasm --exportRuntime
 */

// ============================================================================
// External Imports (from JavaScript host)
// ============================================================================

@external("index", "logMessage")
declare function logMessage(message: string): void;

@external("index", "sendResponse")
declare function sendResponse(response: string): void;

@external("index", "executeToolHandler")
declare function executeToolHandler(toolName: string, args: string, callbackId: i32): void;

// ============================================================================
// Constants
// ============================================================================

const JSONRPC_VERSION: string = "2.0";

// JSON-RPC error codes
const PARSE_ERROR: i32 = -32700;
const INVALID_REQUEST: i32 = -32600;
const METHOD_NOT_FOUND: i32 = -32601;
const INVALID_PARAMS: i32 = -32602;
const INTERNAL_ERROR: i32 = -32603;

// Protocol version
const PROTOCOL_VERSION: string = "2024-11-05";
const SERVER_NAME: string = "cesium-mcp-wasm";
const SERVER_VERSION: string = "1.0.0";

// ============================================================================
// JSON String Utilities
// ============================================================================

/**
 * Escape a string for JSON output
 */
function escapeJsonString(str: string): string {
  let result = "";
  for (let i = 0; i < str.length; i++) {
    const char = str.charAt(i);
    const code = str.charCodeAt(i);

    if (char == '"') {
      result += '\\"';
    } else if (char == "\\") {
      result += "\\\\";
    } else if (char == "\n") {
      result += "\\n";
    } else if (char == "\r") {
      result += "\\r";
    } else if (char == "\t") {
      result += "\\t";
    } else if (code < 32) {
      // Control characters
      result += "\\u" + code.toString(16).padStart(4, "0");
    } else {
      result += char;
    }
  }
  return result;
}

/**
 * Find the value of a JSON string property
 * Simple JSON parser for extracting string values
 */
function getJsonStringValue(json: string, key: string): string {
  const searchKey = '"' + key + '"';
  const keyIndex = json.indexOf(searchKey);

  if (keyIndex == -1) {
    return "";
  }

  // Find the colon after the key
  let colonIndex = json.indexOf(":", keyIndex + searchKey.length);
  if (colonIndex == -1) {
    return "";
  }

  // Skip whitespace after colon
  let valueStart = colonIndex + 1;
  while (valueStart < json.length) {
    const char = json.charAt(valueStart);
    if (char != " " && char != "\t" && char != "\n" && char != "\r") {
      break;
    }
    valueStart++;
  }

  if (valueStart >= json.length) {
    return "";
  }

  const firstChar = json.charAt(valueStart);

  // Handle string value
  if (firstChar == '"') {
    let valueEnd = valueStart + 1;
    let escaped = false;

    while (valueEnd < json.length) {
      const char = json.charAt(valueEnd);
      if (escaped) {
        escaped = false;
      } else if (char == "\\") {
        escaped = true;
      } else if (char == '"') {
        break;
      }
      valueEnd++;
    }

    return json.substring(valueStart + 1, valueEnd);
  }

  // Handle null
  if (json.substring(valueStart, valueStart + 4) == "null") {
    return "";
  }

  return "";
}

/**
 * Find the value of a JSON number/boolean property
 */
function getJsonPrimitiveValue(json: string, key: string): string {
  const searchKey = '"' + key + '"';
  const keyIndex = json.indexOf(searchKey);

  if (keyIndex == -1) {
    return "";
  }

  let colonIndex = json.indexOf(":", keyIndex + searchKey.length);
  if (colonIndex == -1) {
    return "";
  }

  let valueStart = colonIndex + 1;
  while (valueStart < json.length) {
    const char = json.charAt(valueStart);
    if (char != " " && char != "\t" && char != "\n" && char != "\r") {
      break;
    }
    valueStart++;
  }

  if (valueStart >= json.length) {
    return "";
  }

  // Find end of value (comma, closing brace, or closing bracket)
  let valueEnd = valueStart;
  while (valueEnd < json.length) {
    const char = json.charAt(valueEnd);
    if (char == "," || char == "}" || char == "]") {
      break;
    }
    valueEnd++;
  }

  return json.substring(valueStart, valueEnd).trim();
}

/**
 * Get a JSON object property value (returns the raw JSON for the object)
 */
function getJsonObjectValue(json: string, key: string): string {
  const searchKey = '"' + key + '"';
  const keyIndex = json.indexOf(searchKey);

  if (keyIndex == -1) {
    return "";
  }

  let colonIndex = json.indexOf(":", keyIndex + searchKey.length);
  if (colonIndex == -1) {
    return "";
  }

  let valueStart = colonIndex + 1;
  while (valueStart < json.length) {
    const char = json.charAt(valueStart);
    if (char != " " && char != "\t" && char != "\n" && char != "\r") {
      break;
    }
    valueStart++;
  }

  if (valueStart >= json.length) {
    return "";
  }

  const firstChar = json.charAt(valueStart);

  if (firstChar == "{") {
    // Find matching closing brace
    let depth = 1;
    let valueEnd = valueStart + 1;
    let inString = false;
    let escaped = false;

    while (valueEnd < json.length && depth > 0) {
      const char = json.charAt(valueEnd);

      if (inString) {
        if (escaped) {
          escaped = false;
        } else if (char == "\\") {
          escaped = true;
        } else if (char == '"') {
          inString = false;
        }
      } else {
        if (char == '"') {
          inString = true;
        } else if (char == "{") {
          depth++;
        } else if (char == "}") {
          depth--;
        }
      }
      valueEnd++;
    }

    return json.substring(valueStart, valueEnd);
  }

  return "";
}

// ============================================================================
// Tool Definitions
// ============================================================================

/**
 * Get Cesium tool definitions as JSON
 */
function getCesiumToolDefinitionsJson(): string {
  return `[
    {"name":"flyTo","description":"Fly the camera to a specific geographic location","inputSchema":{"type":"object","properties":{"longitude":{"type":"number","minimum":-180,"maximum":180,"description":"Longitude in degrees"},"latitude":{"type":"number","minimum":-90,"maximum":90,"description":"Latitude in degrees"},"height":{"type":"number","description":"Camera height in meters"},"duration":{"type":"number","description":"Flight duration in seconds"}},"required":["longitude","latitude"]}},
    {"name":"lookAt","description":"Orient the camera to look at a specific location","inputSchema":{"type":"object","properties":{"longitude":{"type":"number","minimum":-180,"maximum":180,"description":"Target longitude"},"latitude":{"type":"number","minimum":-90,"maximum":90,"description":"Target latitude"},"range":{"type":"number","description":"Distance from target in meters"}},"required":["longitude","latitude"]}},
    {"name":"zoom","description":"Zoom the camera in or out","inputSchema":{"type":"object","properties":{"amount":{"type":"number","description":"Zoom amount (positive = in, negative = out)"}},"required":["amount"]}},
    {"name":"addPoint","description":"Add a point marker at a location","inputSchema":{"type":"object","properties":{"longitude":{"type":"number","minimum":-180,"maximum":180},"latitude":{"type":"number","minimum":-90,"maximum":90},"name":{"type":"string","description":"Label for the point"},"color":{"type":"string"},"size":{"type":"number","description":"Point size in pixels"}},"required":["longitude","latitude"]}},
    {"name":"addLabel","description":"Add a text label at a location","inputSchema":{"type":"object","properties":{"longitude":{"type":"number","minimum":-180,"maximum":180},"latitude":{"type":"number","minimum":-90,"maximum":90},"text":{"type":"string","description":"Label text"},"color":{"type":"string"}},"required":["longitude","latitude","text"]}},
    {"name":"addPolyline","description":"Draw a line connecting multiple points","inputSchema":{"type":"object","properties":{"positions":{"type":"array","items":{"type":"object"}},"name":{"type":"string"},"color":{"type":"string"},"width":{"type":"number"}},"required":["positions"]}},
    {"name":"addPolygon","description":"Draw a filled polygon","inputSchema":{"type":"object","properties":{"positions":{"type":"array","items":{"type":"object"}},"name":{"type":"string"},"color":{"type":"string"},"extrudedHeight":{"type":"number"}},"required":["positions"]}},
    {"name":"addCircle","description":"Draw a circle at a location","inputSchema":{"type":"object","properties":{"longitude":{"type":"number","minimum":-180,"maximum":180},"latitude":{"type":"number","minimum":-90,"maximum":90},"radius":{"type":"number","description":"Circle radius in meters"},"name":{"type":"string"},"color":{"type":"string"}},"required":["longitude","latitude","radius"]}},
    {"name":"removeEntity","description":"Remove an entity by its ID","inputSchema":{"type":"object","properties":{"id":{"type":"string","description":"Entity ID to remove"}},"required":["id"]}},
    {"name":"clearAll","description":"Remove all entities from the scene","inputSchema":{"type":"object","properties":{}}},
    {"name":"setSceneMode","description":"Change the scene viewing mode","inputSchema":{"type":"object","properties":{"mode":{"type":"string","enum":["2D","3D","COLUMBUS_VIEW"]}},"required":["mode"]}},
    {"name":"setTime","description":"Set the simulation time","inputSchema":{"type":"object","properties":{"time":{"type":"string","description":"ISO 8601 date-time string"},"multiplier":{"type":"number","description":"Time multiplier for animation"}},"required":["time"]}},
    {"name":"playAnimation","description":"Start time animation","inputSchema":{"type":"object","properties":{}}},
    {"name":"pauseAnimation","description":"Pause time animation","inputSchema":{"type":"object","properties":{}}}
  ]`;
}

// ============================================================================
// JSON-RPC Response Builders
// ============================================================================

/**
 * Create a JSON-RPC success response
 */
function createSuccessResponse(id: string, result: string): string {
  return `{"jsonrpc":"${JSONRPC_VERSION}","id":${id},"result":${result}}`;
}

/**
 * Create a JSON-RPC error response
 */
function createErrorResponse(id: string, code: i32, message: string): string {
  const escapedMessage = escapeJsonString(message);
  return `{"jsonrpc":"${JSONRPC_VERSION}","id":${id},"error":{"code":${code.toString()},"message":"${escapedMessage}"}}`;
}

/**
 * Create initialize response
 */
function createInitializeResponse(): string {
  return `{"protocolVersion":"${PROTOCOL_VERSION}","serverInfo":{"name":"${SERVER_NAME}","version":"${SERVER_VERSION}"},"capabilities":{"tools":{},"resources":{}}}`;
}

/**
 * Create tools/list response
 */
function createToolsListResponse(): string {
  const tools = getCesiumToolDefinitionsJson();
  return `{"tools":${tools}}`;
}

/**
 * Create resources/list response
 */
function createResourcesListResponse(): string {
  return `{"resources":[{"uri":"cesium://scene/state","name":"Current Scene State","description":"Current state of the CesiumJS scene","mimeType":"application/json"},{"uri":"cesium://entities","name":"Entity List","description":"List of all entities in the scene","mimeType":"application/json"},{"uri":"cesium://camera","name":"Camera State","description":"Current camera position and orientation","mimeType":"application/json"}]}`;
}

/**
 * Create a tool result response
 */
function createToolResult(text: string, isError: bool = false): string {
  const escapedText = escapeJsonString(text);
  if (isError) {
    return `{"content":[{"type":"text","text":"${escapedText}"}],"isError":true}`;
  }
  return `{"content":[{"type":"text","text":"${escapedText}"}]}`;
}

// ============================================================================
// Message Handling
// ============================================================================

/** Callback ID counter for async tool calls */
let nextCallbackId: i32 = 1;

/**
 * Main entry point for handling MCP messages
 * @param message JSON-RPC message string
 * @returns JSON-RPC response string, or empty string for notifications
 */
export function handleMessage(message: string): string {
  // Validate basic JSON-RPC structure
  if (message.indexOf('"jsonrpc"') == -1) {
    return createErrorResponse("null", INVALID_REQUEST, "Missing jsonrpc field");
  }

  const jsonrpcVersion = getJsonStringValue(message, "jsonrpc");
  if (jsonrpcVersion != JSONRPC_VERSION) {
    return createErrorResponse("null", INVALID_REQUEST, "Invalid JSON-RPC version");
  }

  // Extract ID (could be string, number, or null)
  let id = getJsonPrimitiveValue(message, "id");
  if (id == "") {
    // Check for string ID
    id = '"' + getJsonStringValue(message, "id") + '"';
    if (id == '""') {
      // No ID - this is a notification
      id = "null";
    }
  }

  // Extract method
  const method = getJsonStringValue(message, "method");

  if (method == "") {
    // This might be a response, not a request
    return "";
  }

  // Log the method call
  logMessage("Handling method: " + method);

  // Route to appropriate handler
  if (method == "initialize") {
    return createSuccessResponse(id, createInitializeResponse());
  }

  if (method == "initialized") {
    // Notification - no response needed
    return "";
  }

  if (method == "tools/list") {
    return createSuccessResponse(id, createToolsListResponse());
  }

  if (method == "tools/call") {
    return handleToolCall(id, message);
  }

  if (method == "resources/list") {
    return createSuccessResponse(id, createResourcesListResponse());
  }

  if (method == "resources/read") {
    return handleResourceRead(id, message);
  }

  if (method == "ping") {
    return createSuccessResponse(id, "{}");
  }

  // Unknown method
  return createErrorResponse(id, METHOD_NOT_FOUND, "Method not found: " + method);
}

/**
 * Handle tools/call request
 */
function handleToolCall(id: string, message: string): string {
  // Extract params object
  const params = getJsonObjectValue(message, "params");
  if (params == "") {
    return createErrorResponse(id, INVALID_PARAMS, "Missing params");
  }

  // Extract tool name
  const toolName = getJsonStringValue(params, "name");
  if (toolName == "") {
    return createErrorResponse(id, INVALID_PARAMS, "Missing tool name");
  }

  // Extract arguments
  const args = getJsonObjectValue(params, "arguments");

  // Delegate to external handler
  const callbackId = nextCallbackId++;
  executeToolHandler(toolName, args, callbackId);

  // Return placeholder - actual result will come async
  // In a real implementation, this would be handled differently
  return createSuccessResponse(id, createToolResult("Tool call delegated: " + toolName));
}

/**
 * Handle resources/read request
 */
function handleResourceRead(id: string, message: string): string {
  const params = getJsonObjectValue(message, "params");
  if (params == "") {
    return createErrorResponse(id, INVALID_PARAMS, "Missing params");
  }

  const uri = getJsonStringValue(params, "uri");
  if (uri == "") {
    return createErrorResponse(id, INVALID_PARAMS, "Missing uri");
  }

  // Return mock data based on URI
  if (uri == "cesium://scene/state") {
    return createSuccessResponse(id, `{"contents":[{"uri":"${uri}","mimeType":"application/json","text":"{\\"mode\\":\\"3D\\",\\"entities\\":[]}"}]}`);
  }

  if (uri == "cesium://entities") {
    return createSuccessResponse(id, `{"contents":[{"uri":"${uri}","mimeType":"application/json","text":"{\\"entities\\":[]}"}]}`);
  }

  if (uri == "cesium://camera") {
    return createSuccessResponse(id, `{"contents":[{"uri":"${uri}","mimeType":"application/json","text":"{\\"position\\":{\\"longitude\\":0,\\"latitude\\":0,\\"height\\":10000000}}"}]}`);
  }

  return createErrorResponse(id, INVALID_PARAMS, "Unknown resource: " + uri);
}

// ============================================================================
// Exported Functions for JS Interop
// ============================================================================

/**
 * Parse a JSON-RPC message and return structured data
 */
export function parseJsonRpc(message: string): string {
  const jsonrpc = getJsonStringValue(message, "jsonrpc");
  const id = getJsonPrimitiveValue(message, "id");
  const method = getJsonStringValue(message, "method");
  const params = getJsonObjectValue(message, "params");

  return `{"jsonrpc":"${jsonrpc}","id":${id == "" ? "null" : id},"method":"${method}","params":${params == "" ? "null" : params}}`;
}

/**
 * Serialize a result object to JSON-RPC response
 */
export function serializeJsonRpc(resultJson: string): string {
  // This function expects the result to already be JSON
  // It just wraps it in the JSON-RPC response format
  return `{"jsonrpc":"${JSONRPC_VERSION}","result":${resultJson}}`;
}

/**
 * Get tool definitions as JSON
 */
export function getToolDefinitions(): string {
  return getCesiumToolDefinitionsJson();
}

/**
 * Execute a tool call (synchronous wrapper)
 * For async tools, use executeToolHandler via imports
 */
export function executeToolCall(toolName: string, argsJson: string): string {
  // Basic validation
  if (toolName == "") {
    return createToolResult("Tool name is required", true);
  }

  // Log execution
  logMessage("Executing tool: " + toolName);

  // Return a placeholder result
  // In production, this would dispatch to actual tool implementations
  return createToolResult(`Tool '${toolName}' executed with args: ${argsJson}`);
}

/**
 * Initialize the WASM module
 */
export function init(): void {
  logMessage("MCP WASM module initialized");
}

// ============================================================================
// Memory Management (AssemblyScript Runtime)
// ============================================================================

// These are automatically exported by AssemblyScript with --exportRuntime flag:
// __new, __pin, __unpin, __collect

/**
 * Allocate a string buffer (for external use)
 */
export function allocateString(length: i32): string {
  // Create empty string of given length
  let result = "";
  for (let i: i32 = 0; i < length; i++) {
    result += " ";
  }
  return result;
}

/**
 * Free a string (no-op in AssemblyScript, GC handles it)
 */
export function freeString(_ptr: string): void {
  // No-op - garbage collector handles cleanup
}

/**
 * Get string length
 */
export function getStringLength(str: string): i32 {
  return str.length;
}
