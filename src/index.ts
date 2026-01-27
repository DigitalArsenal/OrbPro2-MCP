/**
 * Cesium SLM - Public API Exports
 * Browser-based Small Language Model for CesiumJS Control
 */

// Main application
export { CesiumSLMApp, RECOMMENDED_MODELS } from './app';

// LLM components
export { WebLLMEngine, checkWebGPUSupport } from './llm/web-llm-engine';
export type { LLMConfig, LLMResponse, ToolCall, ToolDefinition, InitProgressReport } from './llm/web-llm-engine';

export { CommandParser } from './llm/command-parser';
export type { ParseResult } from './llm/command-parser';

// Cesium components
export { CesiumCommandExecutor } from './cesium/command-executor';
export * from './cesium/czml-generator';
export type {
  CesiumCommand,
  CartographicPosition,
  CZMLDocumentArray,
  CZMLPacket,
  CZMLDocument,
} from './cesium/types';

// MCP components
export { WasmMCPServer } from './mcp/wasm-mcp-server';
export type { ToolDefinition as WasmToolDefinition } from './mcp/wasm-mcp-server';
// Legacy TypeScript MCP server (deprecated)
export { CesiumMCPServer } from './mcp/cesium-mcp-server';
export { BrowserTransport, BidirectionalBrowserTransport } from './mcp/browser-transport';
export type { MCPMessage, MessageHandler } from './mcp/browser-transport';

// UI components
export { ChatInterface } from './ui/chat-interface';
export type { ChatMessage, ChatInterfaceConfig } from './ui/chat-interface';

export { StatusDisplay } from './ui/status-display';
export type { StatusInfo } from './ui/status-display';

export { ModelSelector } from './ui/model-selector';
export type { ModelSelectorConfig } from './ui/model-selector';
