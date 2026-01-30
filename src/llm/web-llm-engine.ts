/**
 * WebLLM Engine - Browser-based LLM inference using WebGPU
 * Integrates with web-llm for running small language models in the browser
 */

import type { MLCEngine, WebWorkerMLCEngine, ChatCompletionMessageParam } from '@mlc-ai/web-llm';
import { buildSystemPrompt, buildCompactSystemPrompt } from './prompts';

export interface LLMConfig {
  modelId: string;
  temperature?: number;
  topP?: number;
  maxTokens?: number;
  /** Frequency penalty to prevent repetition (default: 0.5) */
  frequencyPenalty?: number;
  /** Presence penalty to encourage new topics (default: 0.5) */
  presencePenalty?: number;
  /** Context window size - increase for longer prompts (default: 16384) */
  contextWindowSize?: number;
  /** Use compact system prompt for models with small context windows */
  useCompactPrompt?: boolean;
  /** Override system prompt entirely (for custom fine-tuned models that were trained with a specific prompt) */
  customSystemPrompt?: string;
  onProgress?: (progress: InitProgressReport) => void;
}

export interface InitProgressReport {
  progress: number;
  timeElapsed: number;
  text: string;
}

export interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: object;
}

export interface LLMResponse {
  content: string;
  toolCalls?: ToolCall[];
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export interface ToolCall {
  name: string;
  arguments: Record<string, unknown>;
}

// Recommended models for CesiumJS control tasks
export const RECOMMENDED_MODELS = {
  // Best models for function calling (recommended)
  recommended: [
    'OrbPro2-MCP-0.5B-q4f32_1-MLC', // Custom trained 0.5B (~600MB)
    'OrbPro2-MCP-1.5B-q4f32_1-MLC', // Custom trained 1.5B (~1GB)
    'Llama-3.2-3B-Instruct-q4f16_1-MLC',  // Best function calling at 3B size (~2GB)
    'Hermes-3-Llama-3.2-3B-q4f16_1-MLC',  // Fine-tuned for tool use (~2GB)
  ],
  // Smaller, faster models (less accurate for function calling)
  small: [
    'Qwen2.5-1.5B-Instruct-q4f16_1-MLC',
    'SmolLM2-1.7B-Instruct-q4f16_1-MLC',
    'SmolLM2-360M-Instruct-q4f16_1-MLC',
  ],
  // Medium models with better reasoning
  medium: [
    'Phi-3.5-mini-instruct-q4f16_1-MLC',
    'Qwen2.5-3B-Instruct-q4f16_1-MLC',
    'gemma-2-2b-it-q4f16_1-MLC',
  ],
  // Larger models for complex tasks
  large: [
    'Qwen2.5-7B-Instruct-q4f16_1-MLC',
    'Mistral-7B-Instruct-v0.3-q4f16_1-MLC',
    'Llama-3.1-8B-Instruct-q4f16_1-MLC',
  ],
} as const;

// Custom model configurations for self-hosted models
export interface CustomModelConfig {
  modelId: string;
  modelLibUrl: string;  // URL to the .wasm file
  modelWeightsUrl: string;  // HuggingFace repo URL for weights
  vramRequired: number;  // MB
  contextWindowSize: number;
  tokenizerFiles?: string[];
}

// Registry for custom models (populate after compiling with scripts/compile.sh)
export const CUSTOM_MODEL_REGISTRY: Record<string, CustomModelConfig> = {
  // OrbPro2 MCP 1.5B - Fine-tuned on 88K+ CesiumJS command examples
  'OrbPro2-MCP-1.5B-q4f32_1-MLC': {
    modelId: 'OrbPro2-MCP-1.5B-q4f32_1-MLC',
    modelLibUrl: '/models/OrbPro2-MCP-1.5B-q4f32_1-MLC/resolve/main/OrbPro2-MCP-1.5B-q4f32_1-MLC.wasm',
    modelWeightsUrl: '/models/OrbPro2-MCP-1.5B-q4f32_1-MLC/',
    vramRequired: 1024,
    contextWindowSize: 4096,
  },
  // OrbPro2 MCP 0.5B - Fine-tuned on 88K+ CesiumJS command examples
  'OrbPro2-MCP-0.5B-q4f32_1-MLC': {
    modelId: 'OrbPro2-MCP-0.5B-q4f32_1-MLC',
    modelLibUrl: '/models/OrbPro2-MCP-0.5B-q4f32_1-MLC/resolve/main/OrbPro2-MCP-0.5B-q4f32_1-MLC.wasm',
    modelWeightsUrl: '/models/OrbPro2-MCP-0.5B-q4f32_1-MLC/',
    vramRequired: 600,
    contextWindowSize: 4096,
  },
};

// Check if custom model is available and should be used
export function isCustomModelAvailable(): boolean {
  return Object.keys(CUSTOM_MODEL_REGISTRY).length > 0;
}

// Get the primary custom model ID (the trained OrbPro2 MCP)
export function getCustomModelId(): string | null {
  const customModels = Object.keys(CUSTOM_MODEL_REGISTRY);
  return customModels.length > 0 ? customModels[0]! : null;
}

export class WebLLMEngine {
  private engine: MLCEngine | WebWorkerMLCEngine | null = null;
  private config: LLMConfig;
  private isInitialized: boolean = false;
  private tools: ToolDefinition[] = [];
  private systemPrompt: string = '';

  constructor(config: LLMConfig) {
    this.config = {
      temperature: 0.1,
      topP: 0.9,
      maxTokens: 256,
      frequencyPenalty: 0.0,
      presencePenalty: 0.0,
      contextWindowSize: 16384,
      ...config,
    };
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    console.log('[WebLLM] Starting initialization for model:', this.config.modelId);

    // Dynamic import to support tree-shaking and lazy loading
    const webllm = await import('@mlc-ai/web-llm');
    console.log('[WebLLM] web-llm imported');

    // Check if this is a custom model from our registry
    const customConfig = CUSTOM_MODEL_REGISTRY[this.config.modelId];
    console.log('[WebLLM] Custom config:', customConfig);

    // Models are automatically cached in browser's Cache API by web-llm
    // Once downloaded, they persist across page reloads
    if (customConfig) {
      // Convert relative paths to full URLs (web-llm requires absolute URLs)
      const origin = typeof window !== 'undefined' ? window.location.origin : '';
      const modelLibUrl = customConfig.modelLibUrl.startsWith('http')
        ? customConfig.modelLibUrl
        : `${origin}${customConfig.modelLibUrl}`;
      let modelWeightsUrl = customConfig.modelWeightsUrl.startsWith('http')
        ? customConfig.modelWeightsUrl
        : `${origin}${customConfig.modelWeightsUrl}`;

      // Clear web-llm's cache for this model to force fresh fetch
      // This is needed when model files have moved or been updated
      try {
        // Clear Cache API
        const cacheNames = await window.caches.keys();
        for (const name of cacheNames) {
          if (name.includes('webllm')) {
            console.log('[WebLLM] Clearing Cache API:', name);
            await window.caches.delete(name);
          }
        }
        // Clear IndexedDB
        const dbs = await window.indexedDB.databases();
        for (const db of dbs) {
          if (db.name && db.name.includes('webllm')) {
            console.log('[WebLLM] Clearing IndexedDB:', db.name);
            window.indexedDB.deleteDatabase(db.name);
          }
        }
      } catch (e) {
        console.log('[WebLLM] Could not clear caches:', e);
      }

      console.log('[WebLLM] Model lib URL:', modelLibUrl);
      console.log('[WebLLM] Model weights URL:', modelWeightsUrl);

      // Load custom model with explicit URLs
      console.log('[WebLLM] Creating MLC Engine...');
      this.engine = await webllm.CreateMLCEngine(
        this.config.modelId,
        {
          initProgressCallback: (report) => {
            if (this.config.onProgress) {
              this.config.onProgress({
                progress: report.progress,
                timeElapsed: report.timeElapsed,
                text: report.text,
              });
            }
          },
          appConfig: {
            model_list: [{
              model: modelWeightsUrl,
              model_id: customConfig.modelId,
              model_lib: modelLibUrl,
              vram_required_MB: customConfig.vramRequired,
              low_resource_required: true,
            }],
          },
        },
        {
          context_window_size: customConfig.contextWindowSize,
        }
      );
    } else {
      // Load standard WebLLM model
      console.log('[WebLLM] Creating MLC Engine...');
      this.engine = await webllm.CreateMLCEngine(
        this.config.modelId,
        {
          initProgressCallback: (report) => {
            if (this.config.onProgress) {
              this.config.onProgress({
                progress: report.progress,
                timeElapsed: report.timeElapsed,
                text: report.text,
              });
            }
          },
        },
        {
          // Override default context window to support longer prompts
          context_window_size: this.config.contextWindowSize,
        }
      );
    }

    this.isInitialized = true;
  }

  setTools(tools: ToolDefinition[]): void {
    this.tools = tools;
    this.updateSystemPrompt();
  }

  setSystemPrompt(prompt: string): void {
    this.systemPrompt = prompt;
    this.updateSystemPrompt();
  }

  private updateSystemPrompt(): void {
    // Custom fine-tuned models use the exact system prompt they were trained with
    // (they already have tool knowledge baked in from training data)
    if (this.config.customSystemPrompt) {
      this.systemPrompt = this.config.customSystemPrompt;
      return;
    }

    // Build system prompt with tool definitions if available
    if (this.tools.length === 0) {
      return;
    }

    // Use compact prompt for small context windows, full prompt otherwise
    if (this.config.useCompactPrompt) {
      this.systemPrompt = buildCompactSystemPrompt(this.tools);
    } else {
      this.systemPrompt = buildSystemPrompt(this.tools);
    }
  }

  async generate(userMessage: string, _conversationHistory?: Array<{ role: string; content: string }>): Promise<LLMResponse> {
    if (!this.engine) {
      throw new Error('Engine not initialized. Call initialize() first.');
    }

    // Build messages array with system prompt for tool calling
    const messages: ChatCompletionMessageParam[] = [];

    // Add system prompt with tool definitions
    if (this.systemPrompt) {
      messages.push({ role: 'system', content: this.systemPrompt });
    }

    // Add user message
    messages.push({ role: 'user', content: userMessage });

    console.log('[WebLLM] System prompt (' + this.systemPrompt.length + ' chars):', this.systemPrompt.substring(0, 100));

    const response = await this.engine.chat.completions.create({
      messages,
      temperature: this.config.temperature,
      top_p: this.config.topP,
      max_tokens: this.config.maxTokens,
      // Note: frequency_penalty and presence_penalty may not be supported by all models
    });

    const content = response.choices[0]?.message?.content || '';
    const toolCalls = this.parseToolCalls(content);

    return {
      content,
      toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
      usage: response.usage ? {
        promptTokens: response.usage.prompt_tokens,
        completionTokens: response.usage.completion_tokens,
        totalTokens: response.usage.total_tokens,
      } : undefined,
    };
  }

  async generateStream(
    userMessage: string,
    onToken: (token: string) => void,
    conversationHistory?: ChatCompletionMessageParam[]
  ): Promise<LLMResponse> {
    if (!this.engine) {
      throw new Error('Engine not initialized. Call initialize() first.');
    }

    const messages: ChatCompletionMessageParam[] = [];

    if (this.systemPrompt) {
      messages.push({ role: 'system', content: this.systemPrompt });
    }

    if (conversationHistory) {
      messages.push(...conversationHistory);
    }

    messages.push({ role: 'user', content: userMessage });

    let fullContent = '';

    const stream = await this.engine.chat.completions.create({
      messages,
      temperature: this.config.temperature,
      top_p: this.config.topP,
      max_tokens: this.config.maxTokens,
      stream: true as const,
      stream_options: { include_usage: true },
    });

    let usage: LLMResponse['usage'] | undefined;

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content;
      if (delta) {
        fullContent += delta;
        onToken(delta);
      }
      if (chunk.usage) {
        usage = {
          promptTokens: chunk.usage.prompt_tokens,
          completionTokens: chunk.usage.completion_tokens,
          totalTokens: chunk.usage.total_tokens,
        };
      }
    }

    const toolCalls = this.parseToolCalls(fullContent);

    return {
      content: fullContent,
      toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
      usage,
    };
  }

  /**
   * CSV column schemas for each MCP tool.
   * Format: toolName → ordered list of parameter names.
   * Parser maps positional CSV fields to named arguments.
   */
  private static readonly CSV_SCHEMAS: Record<string, string[]> = {
    // Navigation
    flyToLocation: ['location', 'height', 'duration'],
    flyTo: ['longitude', 'latitude', 'height', 'duration'],
    lookAt: ['longitude', 'latitude', 'range'],
    zoom: ['amount'],
    setView: ['longitude', 'latitude', 'height'],
    getCamera: [],

    // Entity creation (named location)
    addPointAtLocation: ['location', 'color'],
    addSphereAtLocation: ['location', 'radius', 'color', 'height'],
    addBoxAtLocation: ['location', 'dimensionX', 'dimensionY', 'dimensionZ', 'color', 'heading'],
    addLabelAtLocation: ['location', 'text'],
    addSensorConeAtLocation: ['location', 'radius', 'horizontalAngle', 'verticalAngle', 'heading', 'pitch', 'color', 'opacity'],

    // Entity creation (coordinates)
    addPoint: ['longitude', 'latitude', 'name', 'color'],
    addSphere: ['longitude', 'latitude', 'radius', 'color', 'height'],
    addBox: ['longitude', 'latitude', 'dimensionX', 'dimensionY', 'dimensionZ', 'color'],
    addLabel: ['longitude', 'latitude', 'text'],
    addCircle: ['longitude', 'latitude', 'radius', 'color'],
    addCylinder: ['longitude', 'latitude', 'length', 'topRadius', 'bottomRadius', 'color'],
    addSensorCone: ['longitude', 'latitude', 'radius', 'horizontalAngle', 'verticalAngle', 'heading', 'pitch', 'color', 'opacity'],

    // Entity "here"
    addSphereHere: ['radius', 'color'],
    addBoxHere: ['dimensionX', 'dimensionY', 'dimensionZ', 'color'],
    addPointHere: ['color'],
    addLabelHere: ['text'],
    addCircleHere: ['radius', 'color'],
    addSensorConeHere: ['radius', 'horizontalAngle', 'verticalAngle', 'heading', 'color', 'opacity'],

    // Routing & animation
    walkTo: ['startLocation', 'endLocation', 'duration'],
    driveTo: ['startLocation', 'endLocation', 'duration'],
    flyPathTo: ['startLocation', 'endLocation', 'altitude', 'duration'],
    getRoute: ['startLocation', 'endLocation', 'mode'],
    getIsochrone: ['location', 'minutes', 'mode'],

    // POI
    searchPOI: ['category', 'location', 'radius'],
    findAndShow: ['category', 'location', 'radius', 'markerColor'],

    // Entity management
    removeEntity: ['id'],
    clearAll: [],
    showEntity: ['id'],
    hideEntity: ['id'],
    flyToEntity: ['id', 'duration'],
    rotateEntity: ['id', 'heading'],
    resizeEntity: ['id', 'scale'],
    setEntityStyle: ['id', 'color', 'opacity'],
    moveEntity: ['id', 'longitude', 'latitude'],

    // Scene
    setSceneMode: ['mode'],
    setTime: ['iso8601'],
    playAnimation: [],
    pauseAnimation: [],
    setImagery: ['provider'],
    setTerrain: ['provider'],

    // Data
    showTopCitiesByPopulation: ['count', 'color', 'shape'],
    resolveLocation: ['location'],
    addPolyline: ['color', 'width'],
  };

  private parseToolCalls(content: string): ToolCall[] {
    const toolCalls: ToolCall[] = [];

    // Try to parse as JSON first (for API models that output JSON)
    try {
      const parsed = JSON.parse(content.trim());
      if (parsed.tool && parsed.arguments) {
        toolCalls.push({
          name: parsed.tool,
          arguments: parsed.arguments,
        });
        return toolCalls;
      }
    } catch {
      // Not pure JSON, try other formats
    }

    // Look for JSON objects in the response
    const jsonRegex = /\{[\s\S]*?"tool"[\s\S]*?"arguments"[\s\S]*?\}/g;
    const matches = content.match(jsonRegex);

    if (matches) {
      for (const match of matches) {
        try {
          const parsed = JSON.parse(match);
          if (parsed.tool && parsed.arguments) {
            toolCalls.push({
              name: parsed.tool,
              arguments: parsed.arguments,
            });
          }
        } catch {
          // Skip invalid JSON
        }
      }
    }

    // If JSON parsing found results, return them
    if (toolCalls.length > 0) return toolCalls;

    // Try CSV format: toolName,param1,param2,...
    // This is the preferred format for small browser models (fewer tokens)
    const csvResult = this.parseCSVToolCall(content.trim());
    if (csvResult) {
      toolCalls.push(csvResult);
      return toolCalls;
    }

    // Try to find CSV in multiline output (model might add explanation text)
    const lines = content.trim().split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      // Skip empty lines and lines that look like natural language
      if (!trimmed || trimmed.includes('  ') || trimmed.startsWith('I ') || trimmed.startsWith('The ')) continue;
      const result = this.parseCSVToolCall(trimmed);
      if (result) {
        toolCalls.push(result);
        break; // Take first valid CSV line
      }
    }

    return toolCalls;
  }

  /**
   * Parse a single CSV tool call line: toolName,param1,param2,...
   */
  private parseCSVToolCall(line: string): ToolCall | null {
    // Must contain a comma or be a no-arg tool
    const parts = line.split(',').map(s => s.trim());
    if (parts.length === 0) return null;

    const toolName = parts[0]!;
    const schema = WebLLMEngine.CSV_SCHEMAS[toolName];
    if (!schema) return null; // Unknown tool name

    const args: Record<string, unknown> = {};
    for (let i = 0; i < schema.length && i + 1 < parts.length; i++) {
      const value = parts[i + 1];
      if (value === undefined || value === '') continue; // Skip empty optional params

      const key = schema[i]!;
      // Auto-type: numbers, booleans, or strings
      if (value === 'true') args[key] = true;
      else if (value === 'false') args[key] = false;
      else if (!isNaN(Number(value)) && value !== '') args[key] = Number(value);
      else args[key] = value;
    }

    return { name: toolName, arguments: args };
  }

  async reset(): Promise<void> {
    if (this.engine) {
      await this.engine.resetChat();
    }
  }

  async unload(): Promise<void> {
    if (this.engine) {
      await this.engine.unload();
      this.engine = null;
      this.isInitialized = false;
    }
  }

  isReady(): boolean {
    return this.isInitialized && this.engine !== null;
  }

  getModelId(): string {
    return this.config.modelId;
  }
}

// Check if WebGPU is available
export async function checkWebGPUSupport(): Promise<{
  supported: boolean;
  adapter: GPUAdapter | null;
  error?: string;
}> {
  if (!navigator.gpu) {
    return {
      supported: false,
      adapter: null,
      error: 'WebGPU is not supported in this browser. Please use Chrome 113+ or Edge 113+.',
    };
  }

  try {
    const adapter = await navigator.gpu.requestAdapter();
    if (!adapter) {
      return {
        supported: false,
        adapter: null,
        error: 'Failed to get WebGPU adapter. Your GPU may not be supported.',
      };
    }

    return { supported: true, adapter };
  } catch (error) {
    return {
      supported: false,
      adapter: null,
      error: error instanceof Error ? error.message : 'Unknown WebGPU error',
    };
  }
}
