/**
 * WebLLM Engine - Browser-based LLM inference using WebGPU
 * Integrates with web-llm for running small language models in the browser
 */

import type { MLCEngine, ChatCompletionMessageParam } from '@mlc-ai/web-llm';
import { buildSystemPrompt, buildCompactSystemPrompt } from './prompts';

export interface LLMConfig {
  modelId: string;
  temperature?: number;
  topP?: number;
  maxTokens?: number;
  /** Context window size - increase for longer prompts (default: 16384) */
  contextWindowSize?: number;
  /** Use compact system prompt for models with small context windows */
  useCompactPrompt?: boolean;
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
  // Our fine-tuned Cesium model - trained on 11K+ Cesium command examples
  // Uses Qwen2.5-0.5B as base (same architecture, optimized for Cesium tool calls)
  trained: [
    'Qwen2.5-0.5B-Instruct-q4f16_1-MLC', // Base model - LoRA adapter available locally
  ],
  // Smaller, faster models - optimized for function calling
  small: [
    'Qwen2.5-1.5B-Instruct-q4f16_1-MLC',
    'SmolLM2-360M-Instruct-q4f16_1-MLC',
    'SmolLM2-1.7B-Instruct-q4f16_1-MLC',
  ],
  // Medium models with better reasoning
  medium: [
    'Qwen2.5-3B-Instruct-q4f16_1-MLC',
    'Phi-3.5-mini-instruct-q4f16_1-MLC',
    'gemma-2-2b-it-q4f16_1-MLC',
  ],
  // Larger models for complex tasks
  large: [
    'Llama-3.2-3B-Instruct-q4f16_1-MLC',
    'Qwen2.5-7B-Instruct-q4f16_1-MLC',
    'Mistral-7B-Instruct-v0.3-q4f16_1-MLC',
  ],
  // Custom/self-compiled models (add your own after compilation)
  custom: [] as string[],
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

// Registry for custom models (populate after compiling with scripts/compile-cesium-slm.sh)
export const CUSTOM_MODEL_REGISTRY: Record<string, CustomModelConfig> = {
  // OrbPro Cesium SLM - Fine-tuned on 11K+ Cesium commands
  // Uncomment and update with your HuggingFace username after uploading:
  //
  // 'OrbPro-Cesium-SLM-0.5B-q4f16_1-MLC': {
  //   modelId: 'OrbPro-Cesium-SLM-0.5B-q4f16_1-MLC',
  //   modelLibUrl: 'https://huggingface.co/YOUR_USERNAME/OrbPro-Cesium-SLM-0.5B-q4f16_1-MLC/resolve/main/OrbPro-Cesium-SLM-0.5B-q4f16_1-MLC.wasm',
  //   modelWeightsUrl: 'https://huggingface.co/YOUR_USERNAME/OrbPro-Cesium-SLM-0.5B-q4f16_1-MLC',
  //   vramRequired: 512,
  //   contextWindowSize: 4096,
  // },
};

// Check if custom model is available and should be used
export function isCustomModelAvailable(): boolean {
  return Object.keys(CUSTOM_MODEL_REGISTRY).length > 0;
}

// Get the primary custom model ID (the trained Cesium SLM)
export function getCustomModelId(): string | null {
  const customModels = Object.keys(CUSTOM_MODEL_REGISTRY);
  return customModels.length > 0 ? customModels[0]! : null;
}

export class WebLLMEngine {
  private engine: MLCEngine | null = null;
  private config: LLMConfig;
  private isInitialized: boolean = false;
  private tools: ToolDefinition[] = [];
  private systemPrompt: string = '';

  constructor(config: LLMConfig) {
    this.config = {
      temperature: 0.7,
      topP: 0.9,
      maxTokens: 512,
      contextWindowSize: 16384,
      ...config,
    };
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    // Dynamic import to support tree-shaking and lazy loading
    const webllm = await import('@mlc-ai/web-llm');

    // Check if this is a custom model from our registry
    const customConfig = CUSTOM_MODEL_REGISTRY[this.config.modelId];

    // Models are automatically cached in browser's Cache API by web-llm
    // Once downloaded, they persist across page reloads
    if (customConfig) {
      // Load custom model with explicit URLs
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
              model: customConfig.modelWeightsUrl,
              model_id: customConfig.modelId,
              model_lib: customConfig.modelLibUrl,
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

  async generate(userMessage: string, conversationHistory?: ChatCompletionMessageParam[]): Promise<LLMResponse> {
    if (!this.engine) {
      throw new Error('Engine not initialized. Call initialize() first.');
    }

    const messages: ChatCompletionMessageParam[] = [];

    // Add system prompt
    if (this.systemPrompt) {
      messages.push({ role: 'system', content: this.systemPrompt });
    }

    // Add conversation history
    if (conversationHistory) {
      messages.push(...conversationHistory);
    }

    // Add user message
    messages.push({ role: 'user', content: userMessage });

    const response = await this.engine.chat.completions.create({
      messages,
      temperature: this.config.temperature,
      top_p: this.config.topP,
      max_tokens: this.config.maxTokens,
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

  private parseToolCalls(content: string): ToolCall[] {
    const toolCalls: ToolCall[] = [];

    // Try to parse as JSON first (for clean tool responses)
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
      // Not pure JSON, try to extract JSON from the response
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

    // Parse FunctionGemma format: <start_function_call>call:function_name{params}<end_function_call>
    const functionGemmaRegex = /<start_function_call>call:(\w+)\{([^}]*)\}<end_function_call>/g;
    let fgMatch;
    while ((fgMatch = functionGemmaRegex.exec(content)) !== null) {
      const functionName = fgMatch[1];
      const paramsStr = fgMatch[2];

      if (!functionName || paramsStr === undefined) continue;

      // Parse key:value pairs from FunctionGemma format
      const args: Record<string, unknown> = {};
      const paramPairs = paramsStr.split(',').map(p => p.trim()).filter(p => p);
      for (const pair of paramPairs) {
        const colonIdx = pair.indexOf(':');
        if (colonIdx > 0) {
          const key = pair.substring(0, colonIdx).trim();
          let value: unknown = pair.substring(colonIdx + 1).trim();
          // Try to parse as number or boolean
          if (value === 'true') value = true;
          else if (value === 'false') value = false;
          else if (!isNaN(Number(value))) value = Number(value);
          args[key] = value;
        }
      }

      toolCalls.push({
        name: functionName,
        arguments: args,
      });
    }

    return toolCalls;
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
