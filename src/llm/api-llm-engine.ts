/**
 * API LLM Engine - Server-based inference via API providers
 * Supports Ollama (local), OpenAI, Anthropic, Together, Groq, and custom endpoints
 */

import { buildSystemPrompt } from './prompts';

export interface APILLMConfig {
  provider: APIProvider;
  model: string;
  apiKey?: string;
  baseUrl?: string;
  temperature?: number;
  maxTokens?: number;
}

export type APIProvider = 'ollama' | 'openai' | 'anthropic' | 'together' | 'groq' | 'openrouter' | 'cerebras' | 'sambanova' | 'fireworks' | 'clarifai' | 'custom';

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

// Provider configurations
export const API_PROVIDERS: Record<APIProvider, {
  name: string;
  baseUrl: string;
  requiresKey: boolean;
  models: string[];
}> = {
  ollama: {
    name: 'Ollama (Local)',
    baseUrl: 'http://localhost:11434',
    requiresKey: false,
    models: [
      'llama3.2:3b',
      'llama3.3:70b',
      'qwen2.5:7b',
      'qwen2.5:14b',
      'qwen2.5:32b',
      'qwen2.5:72b',
      'deepseek-r1:7b',
      'deepseek-r1:14b',
      'deepseek-r1:32b',
      'deepseek-r1:70b',
      'mistral:7b',
      'mixtral:8x7b',
      'phi3:14b',
      'command-r:35b',
    ],
  },
  openai: {
    name: 'OpenAI',
    baseUrl: 'https://api.openai.com/v1',
    requiresKey: true,
    models: [
      'gpt-4o',
      'gpt-4o-mini',
      'gpt-4-turbo',
      'gpt-3.5-turbo',
    ],
  },
  anthropic: {
    name: 'Anthropic',
    baseUrl: 'https://api.anthropic.com',
    requiresKey: true,
    models: [
      'claude-3-5-sonnet-20241022',
      'claude-3-5-haiku-20241022',
      'claude-3-opus-20240229',
    ],
  },
  together: {
    name: 'Together AI',
    baseUrl: 'https://api.together.xyz/v1',
    requiresKey: true,
    models: [
      'meta-llama/Llama-3.3-70B-Instruct-Turbo',
      'meta-llama/Meta-Llama-3.1-405B-Instruct-Turbo',
      'Qwen/Qwen2.5-72B-Instruct-Turbo',
      'deepseek-ai/DeepSeek-R1',
      'deepseek-ai/DeepSeek-V3',
      'mistralai/Mixtral-8x22B-Instruct-v0.1',
      'NousResearch/Hermes-3-Llama-3.1-70B-Turbo',
    ],
  },
  groq: {
    name: 'Groq',
    baseUrl: 'https://api.groq.com/openai/v1',
    requiresKey: true,
    models: [
      'llama-3.3-70b-versatile',
      'llama-3.1-70b-versatile',
      'llama-3.2-90b-vision-preview',
      'mixtral-8x7b-32768',
      'gemma2-9b-it',
    ],
  },
  openrouter: {
    name: 'OpenRouter',
    baseUrl: 'https://openrouter.ai/api/v1',
    requiresKey: true,
    models: [
      'anthropic/claude-3.5-sonnet',
      'openai/gpt-4o',
      'meta-llama/llama-3.3-70b-instruct',
      'google/gemini-2.0-flash-exp:free',
      'deepseek/deepseek-r1',
      'qwen/qwen-2.5-72b-instruct',
    ],
  },
  cerebras: {
    name: 'Cerebras (~2600 tok/s)',
    baseUrl: 'https://api.cerebras.ai/v1',
    requiresKey: true,
    models: [
      'llama-3.3-70b',
      'llama-4-scout-17b-16e-instruct',
      'llama3.1-8b',
      'qwen-2.5-32b',
      'qwen-2.5-coder-32b',
      'deepseek-r1-distill-llama-70b',
    ],
  },
  sambanova: {
    name: 'SambaNova Cloud',
    baseUrl: 'https://api.sambanova.ai/v1',
    requiresKey: true,
    models: [
      'Meta-Llama-3.3-70B-Instruct',
      'Meta-Llama-3.1-405B-Instruct',
      'Meta-Llama-3.1-70B-Instruct',
      'Meta-Llama-3.1-8B-Instruct',
      'Qwen2.5-72B-Instruct',
      'Qwen2.5-Coder-32B-Instruct',
      'DeepSeek-R1',
      'DeepSeek-R1-Distill-Llama-70B',
    ],
  },
  fireworks: {
    name: 'Fireworks AI (~482 tok/s)',
    baseUrl: 'https://api.fireworks.ai/inference/v1',
    requiresKey: true,
    models: [
      'accounts/fireworks/models/llama-v3p3-70b-instruct',
      'accounts/fireworks/models/llama-v3p1-405b-instruct',
      'accounts/fireworks/models/qwen2p5-72b-instruct',
      'accounts/fireworks/models/qwen2p5-coder-32b-instruct',
      'accounts/fireworks/models/deepseek-r1',
      'accounts/fireworks/models/deepseek-v3',
      'accounts/fireworks/models/mixtral-8x22b-instruct',
    ],
  },
  clarifai: {
    name: 'Clarifai (~544 tok/s)',
    baseUrl: 'https://api.clarifai.com/v2/ext/inference',
    requiresKey: true,
    models: [
      'llama-3-3-70b-instruct',
      'llama-3-1-405b-instruct',
      'qwen-2-5-72b-instruct',
      'mixtral-8x22b-instruct',
      'deepseek-r1',
    ],
  },
  custom: {
    name: 'Custom Endpoint',
    baseUrl: '',
    requiresKey: false,
    models: [],
  },
};

export class APILLMEngine {
  private config: APILLMConfig;
  private tools: ToolDefinition[] = [];
  private systemPrompt: string = '';

  constructor(config: APILLMConfig) {
    this.config = {
      temperature: 0.7,
      maxTokens: 512,
      ...config,
    };
  }

  async initialize(): Promise<void> {
    // Validate connection for Ollama
    if (this.config.provider === 'ollama') {
      try {
        const response = await fetch(`${this.getBaseUrl()}/api/tags`);
        if (!response.ok) {
          throw new Error('Ollama not running');
        }
      } catch (error) {
        throw new Error(`Cannot connect to Ollama at ${this.getBaseUrl()}. Is Ollama running?`);
      }
    }
  }

  private getBaseUrl(): string {
    return this.config.baseUrl || API_PROVIDERS[this.config.provider].baseUrl;
  }

  setTools(tools: ToolDefinition[]): void {
    this.tools = tools;
    this.systemPrompt = buildSystemPrompt(tools);
  }

  async generate(userMessage: string): Promise<LLMResponse> {
    const provider = this.config.provider;

    if (provider === 'anthropic') {
      return this.generateAnthropic(userMessage);
    } else if (provider === 'ollama') {
      return this.generateOllama(userMessage);
    } else {
      // OpenAI-compatible API (OpenAI, Together, Groq, OpenRouter, custom)
      return this.generateOpenAICompatible(userMessage);
    }
  }

  private async generateOllama(userMessage: string): Promise<LLMResponse> {
    const response = await fetch(`${this.getBaseUrl()}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: this.config.model,
        messages: [
          { role: 'system', content: this.systemPrompt },
          { role: 'user', content: userMessage },
        ],
        stream: false,
        options: {
          temperature: this.config.temperature,
          num_predict: this.config.maxTokens,
        },
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Ollama error: ${error}`);
    }

    const data = await response.json();
    const content = data.message?.content || '';
    const toolCalls = this.parseToolCalls(content);

    return {
      content,
      toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
      usage: data.prompt_eval_count ? {
        promptTokens: data.prompt_eval_count,
        completionTokens: data.eval_count || 0,
        totalTokens: (data.prompt_eval_count || 0) + (data.eval_count || 0),
      } : undefined,
    };
  }

  private async generateOpenAICompatible(userMessage: string): Promise<LLMResponse> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (this.config.apiKey) {
      headers['Authorization'] = `Bearer ${this.config.apiKey}`;
    }

    // OpenRouter requires additional headers
    if (this.config.provider === 'openrouter') {
      headers['HTTP-Referer'] = window.location.origin;
      headers['X-Title'] = 'OrbPro2 MCP';
    }

    const response = await fetch(`${this.getBaseUrl()}/chat/completions`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: this.config.model,
        messages: [
          { role: 'system', content: this.systemPrompt },
          { role: 'user', content: userMessage },
        ],
        temperature: this.config.temperature,
        max_tokens: this.config.maxTokens,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`API error (${response.status}): ${error}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';
    const toolCalls = this.parseToolCalls(content);

    return {
      content,
      toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
      usage: data.usage ? {
        promptTokens: data.usage.prompt_tokens,
        completionTokens: data.usage.completion_tokens,
        totalTokens: data.usage.total_tokens,
      } : undefined,
    };
  }

  private async generateAnthropic(userMessage: string): Promise<LLMResponse> {
    const response = await fetch(`${this.getBaseUrl()}/v1/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.config.apiKey || '',
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model: this.config.model,
        max_tokens: this.config.maxTokens,
        system: this.systemPrompt,
        messages: [
          { role: 'user', content: userMessage },
        ],
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Anthropic error (${response.status}): ${error}`);
    }

    const data = await response.json();
    const content = data.content?.[0]?.text || '';
    const toolCalls = this.parseToolCalls(content);

    return {
      content,
      toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
      usage: data.usage ? {
        promptTokens: data.usage.input_tokens,
        completionTokens: data.usage.output_tokens,
        totalTokens: data.usage.input_tokens + data.usage.output_tokens,
      } : undefined,
    };
  }

  private parseToolCalls(content: string): ToolCall[] {
    const toolCalls: ToolCall[] = [];

    // Try to parse as JSON first
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
      // Not pure JSON
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

    return toolCalls;
  }

  async reset(): Promise<void> {
    // No persistent state for API calls
  }

  async unload(): Promise<void> {
    // Nothing to unload
  }

  isReady(): boolean {
    return true;
  }

  getModelId(): string {
    return `${this.config.provider}/${this.config.model}`;
  }

  getProvider(): APIProvider {
    return this.config.provider;
  }
}

// Check if Ollama is available
export async function checkOllamaAvailable(): Promise<boolean> {
  try {
    const response = await fetch('http://localhost:11434/api/tags', {
      method: 'GET',
      signal: AbortSignal.timeout(2000),
    });
    return response.ok;
  } catch {
    return false;
  }
}

// Get available Ollama models
export async function getOllamaModels(): Promise<string[]> {
  try {
    const response = await fetch('http://localhost:11434/api/tags');
    if (!response.ok) return [];
    const data = await response.json();
    return data.models?.map((m: { name: string }) => m.name) || [];
  } catch {
    return [];
  }
}
