/**
 * MCP WASM Module - WebAssembly-ready MCP implementation
 * Barrel exports for the mcp-wasm module
 */

// Core MCP protocol implementation (pure TypeScript, no DOM/Node dependencies)
export {
  // Types
  type JsonRpcRequest,
  type JsonRpcResponse,
  type JsonRpcError,
  type ToolDefinition,
  type JsonSchema,
  type ToolCallParams,
  type ToolResult,
  type ToolResultContent,
  type ResourceDefinition,
  type ServerCapabilities,
  type InitializeResult,
  type ToolHandler,
  type ResourceReader,
  type MCPConfig,

  // Constants
  JsonRpcErrorCode,

  // Message parsing and serialization
  parseJsonRpcMessage,
  isRequest,
  isResponse,
  isNotification,
  createRequest,
  createNotification,
  createSuccessResponse,
  createErrorResponse,
  serializeMessage,

  // Registries
  ToolRegistry,
  ResourceRegistry,

  // Protocol handler
  MCPProtocolHandler,

  // Cesium tool/resource definitions
  createCesiumToolDefinitions,
  createCesiumResourceDefinitions,
} from './mcp-core';

// WASM bridge for loading and communicating with WebAssembly modules
export {
  // Types
  type WasmExports,
  type WasmImports,
  type ToolCallCallback,
  type WasmBridgeConfig,

  // Classes
  WasmMemory,
  WasmBridge,
  AsyncToolHandler,
  MessageQueue,

  // Factory functions
  createWasmBridge,
  createAsyncToolHandler,
  createMessageQueue,
} from './wasm-bridge';
