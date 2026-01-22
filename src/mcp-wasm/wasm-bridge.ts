/**
 * WASM Bridge - JavaScript bridge for loading and communicating with WebAssembly modules
 * Provides memory management helpers and message passing utilities
 */

// ============================================================================
// Types
// ============================================================================

/** WASM module exports interface */
export interface WasmExports {
  memory: WebAssembly.Memory;
  // Memory management
  __new: (size: number, id: number) => number;
  __pin: (ptr: number) => number;
  __unpin: (ptr: number) => void;
  __collect: () => void;
  // String handling
  allocateString: (length: number) => number;
  freeString: (ptr: number) => void;
  getStringLength: (ptr: number) => number;
  // MCP message handling
  handleMessage: (msgPtr: number) => number;
  parseJsonRpc: (msgPtr: number) => number;
  serializeJsonRpc: (resultPtr: number) => number;
  getToolDefinitions: () => number;
  executeToolCall: (toolNamePtr: number, argsPtr: number) => number;
  // Optional initialization
  init?: () => void;
}

/** WASM module imports interface */
export interface WasmImports {
  env: {
    abort: (msgPtr: number, filePtr: number, line: number, col: number) => void;
    trace: (msgPtr: number, n: number, a0?: number, a1?: number, a2?: number, a3?: number, a4?: number) => void;
  };
  index: {
    logMessage: (ptr: number) => void;
    sendResponse: (ptr: number) => void;
    executeToolHandler: (toolNamePtr: number, argsPtr: number, callbackId: number) => void;
  };
}

/** Tool call callback type */
export type ToolCallCallback = (toolName: string, args: Record<string, unknown>) => Promise<string>;

/** WASM Bridge configuration */
export interface WasmBridgeConfig {
  wasmUrl?: string;
  wasmBytes?: ArrayBuffer;
  onLog?: (message: string) => void;
  onResponse?: (response: string) => void;
  toolCallHandler?: ToolCallCallback;
}

/** Pending tool call resolution */
interface PendingToolCall {
  resolve: (result: string) => void;
  reject: (error: Error) => void;
}

// ============================================================================
// Memory Management Helpers
// ============================================================================

/**
 * Memory view wrapper for reading/writing to WASM memory
 */
export class WasmMemory {
  private memory: WebAssembly.Memory;

  constructor(memory: WebAssembly.Memory) {
    this.memory = memory;
  }

  /**
   * Get the raw memory buffer
   */
  get buffer(): ArrayBuffer {
    return this.memory.buffer;
  }

  /**
   * Read a UTF-8 string from memory
   */
  readString(ptr: number, length?: number): string {
    const view = new Uint8Array(this.memory.buffer);

    if (length === undefined) {
      // Read null-terminated string
      let end = ptr;
      while (view[end] !== 0) end++;
      length = end - ptr;
    }

    const bytes = view.slice(ptr, ptr + length);
    return new TextDecoder('utf-8').decode(bytes);
  }

  /**
   * Read an AssemblyScript string from memory (length-prefixed)
   */
  readASString(ptr: number): string {
    if (ptr === 0) return '';

    // AssemblyScript strings are length-prefixed (4 bytes before data)
    const view = new DataView(this.memory.buffer);
    const length = view.getUint32(ptr - 4, true);

    // Data is UTF-16 encoded
    const u16View = new Uint16Array(this.memory.buffer, ptr, length);
    return String.fromCharCode(...u16View);
  }

  /**
   * Write a UTF-8 string to memory at given pointer
   */
  writeString(ptr: number, str: string): number {
    const encoded = new TextEncoder().encode(str);
    const view = new Uint8Array(this.memory.buffer);
    view.set(encoded, ptr);
    view[ptr + encoded.length] = 0; // Null terminate
    return encoded.length;
  }

  /**
   * Write an AssemblyScript string to memory (returns pointer to allocated string)
   * Requires exports.__new function
   */
  writeASString(str: string, exports: WasmExports): number {
    const length = str.length;
    // AssemblyScript string class ID is 1
    const ptr = exports.__new(length << 1, 1);

    const u16View = new Uint16Array(this.memory.buffer, ptr, length);
    for (let i = 0; i < length; i++) {
      u16View[i] = str.charCodeAt(i);
    }

    return ptr;
  }

  /**
   * Read a typed array from memory
   */
  readTypedArray<T extends ArrayBufferView>(
    ptr: number,
    length: number,
    ArrayType: new (buffer: ArrayBuffer, offset: number, length: number) => T
  ): T {
    return new ArrayType(this.memory.buffer, ptr, length);
  }

  /**
   * Read an Int32 from memory
   */
  readInt32(ptr: number): number {
    const view = new DataView(this.memory.buffer);
    return view.getInt32(ptr, true);
  }

  /**
   * Write an Int32 to memory
   */
  writeInt32(ptr: number, value: number): void {
    const view = new DataView(this.memory.buffer);
    view.setInt32(ptr, value, true);
  }

  /**
   * Read a Float64 from memory
   */
  readFloat64(ptr: number): number {
    const view = new DataView(this.memory.buffer);
    return view.getFloat64(ptr, true);
  }

  /**
   * Write a Float64 to memory
   */
  writeFloat64(ptr: number, value: number): void {
    const view = new DataView(this.memory.buffer);
    view.setFloat64(ptr, value, true);
  }
}

// ============================================================================
// WASM Bridge Class
// ============================================================================

/**
 * Bridge for loading and communicating with WASM modules
 */
export class WasmBridge {
  private instance: WebAssembly.Instance | null = null;
  private exports: WasmExports | null = null;
  private memory: WasmMemory | null = null;
  private config: WasmBridgeConfig;
  private pendingToolCalls: Map<number, PendingToolCall> = new Map();
  private initialized: boolean = false;


  constructor(config: WasmBridgeConfig = {}) {
    this.config = config;
  }

  /**
   * Load WASM module from URL or bytes
   */
  async load(source?: string | ArrayBuffer): Promise<void> {
    const wasmSource = source || this.config.wasmUrl || this.config.wasmBytes;

    if (!wasmSource) {
      throw new Error('No WASM source provided');
    }

    const imports = this.createImports();

    let module: WebAssembly.Module;
    let instance: WebAssembly.Instance;

    if (typeof wasmSource === 'string') {
      // Load from URL
      if (typeof WebAssembly.instantiateStreaming === 'function') {
        const response = await fetch(wasmSource);
        const result = await WebAssembly.instantiateStreaming(response, imports);
        module = result.module;
        instance = result.instance;
      } else {
        const response = await fetch(wasmSource);
        const bytes = await response.arrayBuffer();
        module = await WebAssembly.compile(bytes);
        instance = await WebAssembly.instantiate(module, imports);
      }
    } else {
      // Load from bytes
      module = await WebAssembly.compile(wasmSource);
      instance = await WebAssembly.instantiate(module, imports);
    }

    this.instance = instance;
    this.exports = instance.exports as unknown as WasmExports;
    this.memory = new WasmMemory(this.exports.memory);

    // Call init if available
    if (this.exports.init) {
      this.exports.init();
    }

    this.initialized = true;
  }

  /**
   * Check if WASM module is loaded
   */
  isLoaded(): boolean {
    return this.initialized && this.instance !== null;
  }

  /**
   * Get the WASM memory wrapper
   */
  getMemory(): WasmMemory | null {
    return this.memory;
  }

  /**
   * Get the raw WASM exports
   */
  getExports(): WasmExports | null {
    return this.exports;
  }

  /**
   * Create WASM imports object
   */
  private createImports(): WebAssembly.Imports {
    return {
      env: {
        abort: (msgPtr: number, filePtr: number, line: number, col: number) => {
          const msg = this.memory?.readASString(msgPtr) || 'Unknown error';
          const file = this.memory?.readASString(filePtr) || 'Unknown file';
          console.error(`WASM abort: ${msg} at ${file}:${line}:${col}`);
        },
        trace: (msgPtr: number, n: number, ...args: number[]) => {
          const msg = this.memory?.readASString(msgPtr) || '';
          console.log(`WASM trace: ${msg}`, ...args.slice(0, n));
        },
      },
      index: {
        logMessage: (ptr: number) => {
          if (this.memory) {
            const message = this.memory.readASString(ptr);
            if (this.config.onLog) {
              this.config.onLog(message);
            } else {
              console.log(`[WASM] ${message}`);
            }
          }
        },
        sendResponse: (ptr: number) => {
          if (this.memory) {
            const response = this.memory.readASString(ptr);
            if (this.config.onResponse) {
              this.config.onResponse(response);
            }
          }
        },
        executeToolHandler: (toolNamePtr: number, argsPtr: number, callbackId: number) => {
          if (this.memory && this.config.toolCallHandler) {
            const toolName = this.memory.readASString(toolNamePtr);
            const argsJson = this.memory.readASString(argsPtr);

            try {
              const args = JSON.parse(argsJson);
              this.config.toolCallHandler(toolName, args)
                .then((result) => {
                  this.resolveToolCall(callbackId, result);
                })
                .catch((error) => {
                  this.rejectToolCall(callbackId, error);
                });
            } catch (error) {
              this.rejectToolCall(callbackId, error as Error);
            }
          }
        },
      },
    };
  }

  /**
   * Resolve a pending tool call
   */
  private resolveToolCall(callbackId: number, result: string): void {
    const pending = this.pendingToolCalls.get(callbackId);
    if (pending) {
      this.pendingToolCalls.delete(callbackId);
      pending.resolve(result);
    }
  }

  /**
   * Reject a pending tool call
   */
  private rejectToolCall(callbackId: number, error: Error): void {
    const pending = this.pendingToolCalls.get(callbackId);
    if (pending) {
      this.pendingToolCalls.delete(callbackId);
      pending.reject(error);
    }
  }

  /**
   * Send a message to WASM for processing
   */
  async handleMessage(message: string): Promise<string | null> {
    if (!this.exports || !this.memory) {
      throw new Error('WASM module not loaded');
    }

    // Write message string to WASM memory
    const msgPtr = this.memory.writeASString(message, this.exports);
    this.exports.__pin(msgPtr);

    try {
      // Call WASM message handler
      const resultPtr = this.exports.handleMessage(msgPtr);

      if (resultPtr === 0) {
        return null;
      }

      // Read result string
      const result = this.memory.readASString(resultPtr);

      // Clean up result if needed
      this.exports.__unpin(resultPtr);

      return result;
    } finally {
      // Clean up input
      this.exports.__unpin(msgPtr);
    }
  }

  /**
   * Parse a JSON-RPC message using WASM
   */
  parseJsonRpc(message: string): unknown {
    if (!this.exports || !this.memory) {
      throw new Error('WASM module not loaded');
    }

    const msgPtr = this.memory.writeASString(message, this.exports);
    this.exports.__pin(msgPtr);

    try {
      const resultPtr = this.exports.parseJsonRpc(msgPtr);

      if (resultPtr === 0) {
        throw new Error('Failed to parse JSON-RPC message');
      }

      const resultJson = this.memory.readASString(resultPtr);
      this.exports.__unpin(resultPtr);

      return JSON.parse(resultJson);
    } finally {
      this.exports.__unpin(msgPtr);
    }
  }

  /**
   * Serialize a JSON-RPC result using WASM
   */
  serializeJsonRpc(result: unknown): string {
    if (!this.exports || !this.memory) {
      throw new Error('WASM module not loaded');
    }

    const resultJson = JSON.stringify(result);
    const resultPtr = this.memory.writeASString(resultJson, this.exports);
    this.exports.__pin(resultPtr);

    try {
      const serializedPtr = this.exports.serializeJsonRpc(resultPtr);

      if (serializedPtr === 0) {
        throw new Error('Failed to serialize JSON-RPC result');
      }

      const serialized = this.memory.readASString(serializedPtr);
      this.exports.__unpin(serializedPtr);

      return serialized;
    } finally {
      this.exports.__unpin(resultPtr);
    }
  }

  /**
   * Get tool definitions from WASM
   */
  getToolDefinitions(): unknown[] {
    if (!this.exports || !this.memory) {
      throw new Error('WASM module not loaded');
    }

    const resultPtr = this.exports.getToolDefinitions();

    if (resultPtr === 0) {
      return [];
    }

    const resultJson = this.memory.readASString(resultPtr);
    this.exports.__unpin(resultPtr);

    return JSON.parse(resultJson);
  }

  /**
   * Execute a tool call through WASM
   */
  async executeToolCall(toolName: string, args: Record<string, unknown>): Promise<string> {
    if (!this.exports || !this.memory) {
      throw new Error('WASM module not loaded');
    }

    const toolNamePtr = this.memory.writeASString(toolName, this.exports);
    const argsPtr = this.memory.writeASString(JSON.stringify(args), this.exports);

    this.exports.__pin(toolNamePtr);
    this.exports.__pin(argsPtr);

    try {
      const resultPtr = this.exports.executeToolCall(toolNamePtr, argsPtr);

      if (resultPtr === 0) {
        throw new Error(`Tool execution failed: ${toolName}`);
      }

      const result = this.memory.readASString(resultPtr);
      this.exports.__unpin(resultPtr);

      return result;
    } finally {
      this.exports.__unpin(toolNamePtr);
      this.exports.__unpin(argsPtr);
    }
  }

  /**
   * Run garbage collection in WASM
   */
  collectGarbage(): void {
    if (this.exports) {
      this.exports.__collect();
    }
  }

  /**
   * Destroy the bridge and clean up resources
   */
  destroy(): void {
    this.pendingToolCalls.clear();
    this.instance = null;
    this.exports = null;
    this.memory = null;
    this.initialized = false;
  }
}

// ============================================================================
// Async Tool Handler
// ============================================================================

/**
 * Async handler for coordinating tool calls between JS and WASM
 */
export class AsyncToolHandler {
  private handlers: Map<string, ToolCallCallback> = new Map();
  private bridge: WasmBridge | null = null;

  constructor(bridge?: WasmBridge) {
    this.bridge = bridge || null;
  }

  /**
   * Set the WASM bridge
   */
  setBridge(bridge: WasmBridge): void {
    this.bridge = bridge;
  }

  /**
   * Register a tool handler
   */
  register(toolName: string, handler: ToolCallCallback): void {
    this.handlers.set(toolName, handler);
  }

  /**
   * Unregister a tool handler
   */
  unregister(toolName: string): void {
    this.handlers.delete(toolName);
  }

  /**
   * Execute a tool call
   */
  async execute(toolName: string, args: Record<string, unknown>): Promise<string> {
    // First check if we have a JS handler
    const handler = this.handlers.get(toolName);

    if (handler) {
      return handler(toolName, args);
    }

    // Fall back to WASM execution if available
    if (this.bridge && this.bridge.isLoaded()) {
      return this.bridge.executeToolCall(toolName, args);
    }

    throw new Error(`No handler registered for tool: ${toolName}`);
  }

  /**
   * Check if a handler is registered
   */
  hasHandler(toolName: string): boolean {
    return this.handlers.has(toolName);
  }

  /**
   * Get all registered handler names
   */
  getHandlerNames(): string[] {
    return Array.from(this.handlers.keys());
  }

  /**
   * Clear all handlers
   */
  clear(): void {
    this.handlers.clear();
  }
}

// ============================================================================
// Message Queue for WASM Communication
// ============================================================================

/**
 * Message queue for coordinating async communication with WASM
 */
export class MessageQueue {
  private queue: Array<{
    message: string;
    resolve: (result: string | null) => void;
    reject: (error: Error) => void;
  }> = [];
  private processing: boolean = false;
  private bridge: WasmBridge;

  constructor(bridge: WasmBridge) {
    this.bridge = bridge;
  }

  /**
   * Queue a message for processing
   */
  enqueue(message: string): Promise<string | null> {
    return new Promise((resolve, reject) => {
      this.queue.push({ message, resolve, reject });
      this.processQueue();
    });
  }

  /**
   * Process queued messages
   */
  private async processQueue(): Promise<void> {
    if (this.processing || this.queue.length === 0) {
      return;
    }

    this.processing = true;

    while (this.queue.length > 0) {
      const item = this.queue.shift()!;

      try {
        const result = await this.bridge.handleMessage(item.message);
        item.resolve(result);
      } catch (error) {
        item.reject(error instanceof Error ? error : new Error(String(error)));
      }
    }

    this.processing = false;
  }

  /**
   * Get queue length
   */
  get length(): number {
    return this.queue.length;
  }

  /**
   * Check if processing
   */
  get isProcessing(): boolean {
    return this.processing;
  }

  /**
   * Clear the queue
   */
  clear(): void {
    for (const item of this.queue) {
      item.reject(new Error('Queue cleared'));
    }
    this.queue = [];
  }
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Create a configured WASM bridge with default settings
 */
export async function createWasmBridge(config: WasmBridgeConfig): Promise<WasmBridge> {
  const bridge = new WasmBridge(config);
  await bridge.load();
  return bridge;
}

/**
 * Create an async tool handler with WASM bridge
 */
export function createAsyncToolHandler(bridge: WasmBridge): AsyncToolHandler {
  return new AsyncToolHandler(bridge);
}

/**
 * Create a message queue for WASM communication
 */
export function createMessageQueue(bridge: WasmBridge): MessageQueue {
  return new MessageQueue(bridge);
}
