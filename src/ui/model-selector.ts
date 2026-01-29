/**
 * Model Selector Component
 * Cascading dropdowns for selecting language models
 */

import { RECOMMENDED_MODELS } from '../llm/web-llm-engine';
import { API_PROVIDERS, APIProvider, checkOllamaAvailable, getOllamaModels } from '../llm/api-llm-engine';

export interface ModelSelectorConfig {
  containerId: string;
  onSelect: (selection: ModelSelection) => void;
  onReset?: () => void;
  defaultModel?: string;
}

export interface ModelSelection {
  type: 'webllm' | 'api';
  modelId: string;
  provider?: APIProvider;
  apiKey?: string;
  baseUrl?: string;
}

type ModelSource = 'api' | 'browser' | null;
type BrowserCategory = 'recommended' | 'small' | 'medium' | 'large';

export class ModelSelector {
  private container: HTMLElement;
  private onSelect: (selection: ModelSelection) => void;
  private onReset?: () => void;

  // Selection state - cascading
  private selectedSource: ModelSource = 'browser';
  private selectedProvider: APIProvider | null = null;
  private selectedBrowserCategory: BrowserCategory | null = null;
  private selectedModel: string | null = null;

  // Settings
  private apiKey: string = '';
  private customUrl: string = '';

  // Runtime state
  private ollamaAvailable: boolean = false;
  private ollamaModels: string[] = [];

  // Accordion state
  private isExpanded: boolean = true;

  constructor(config: ModelSelectorConfig) {
    const container = document.getElementById(config.containerId);
    if (!container) {
      throw new Error(`Container element '${config.containerId}' not found`);
    }

    this.container = container;
    this.onSelect = config.onSelect;
    this.onReset = config.onReset;

    this.loadSavedSettings();
    this.injectStyles();
    this.checkOllama().then(() => this.render());
  }

  private loadSavedSettings(): void {
    try {
      const saved = localStorage.getItem('cesium-slm-model-settings');
      if (saved) {
        const settings = JSON.parse(saved);
        this.apiKey = settings.apiKey || '';
        this.customUrl = settings.customUrl || '';
        this.selectedSource = settings.source || null;
        this.selectedProvider = settings.provider || null;
        this.selectedBrowserCategory = settings.browserCategory || null;
        this.selectedModel = settings.model || null;
      }
    } catch {
      // Ignore errors
    }
  }

  private saveSettings(): void {
    try {
      localStorage.setItem('cesium-slm-model-settings', JSON.stringify({
        source: this.selectedSource,
        provider: this.selectedProvider,
        browserCategory: this.selectedBrowserCategory,
        model: this.selectedModel,
        apiKey: this.apiKey,
        customUrl: this.customUrl,
      }));
    } catch {
      // Ignore errors
    }
  }

  /**
   * Auto-load the last used model if one was saved
   * Call this after initialization to restore previous session
   */
  async autoLoadLastModel(): Promise<boolean> {
    if (this.selectedModel && this.selectedSource) {
      // Collapse the accordion since we're auto-loading
      this.isExpanded = false;
      this.loadSelectedModel();
      return true;
    }
    return false;
  }

  private async checkOllama(): Promise<void> {
    this.ollamaAvailable = await checkOllamaAvailable();
    if (this.ollamaAvailable) {
      this.ollamaModels = await getOllamaModels();
    }
  }

  private render(): void {
    const chevronIcon = this.isExpanded
      ? `<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M8 4l5 5H3l5-5z"/></svg>`
      : `<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M8 11L3 6h10l-5 5z"/></svg>`;

    const statusText = this.selectedModel
      ? this.getModelDisplayName(this.selectedModel)
      : (this.selectedProvider ? API_PROVIDERS[this.selectedProvider].name : 'Not configured');

    const resetButton = this.selectedModel ? `
      <button class="model-reset-btn" id="model-reset-btn" title="Change model">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
          <path d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/>
        </svg>
      </button>
    ` : '';

    const html = `
      <div class="model-selector">
        <div class="model-selector-header" id="accordion-toggle">
          <div class="model-selector-header-left">
            <span class="accordion-chevron">${chevronIcon}</span>
            <h3 class="model-selector-title">Configure Model</h3>
          </div>
          <div class="model-selector-header-right">
            <span class="model-selector-status">${statusText}</span>
            ${resetButton}
          </div>
        </div>

        <div class="model-selector-content ${this.isExpanded ? 'expanded' : 'collapsed'}">
          <div class="dropdown-stack">
            ${this.renderSourceDropdown()}
            ${this.selectedSource ? this.renderSecondDropdown() : ''}
            ${this.shouldShowApiKeyInput() ? this.renderApiKeyInput() : ''}
            ${this.shouldShowModelDropdown() ? this.renderModelDropdown() : ''}
          </div>
        </div>
      </div>
    `;

    this.container.innerHTML = html;
    this.setupEventListeners();
  }

  private renderSourceDropdown(): string {
    return `
      <div class="dropdown-group">
        <label class="dropdown-label">1. Model Source</label>
        <select class="dropdown" id="source-select">
          <option value="" ${!this.selectedSource ? 'selected' : ''}>Select source...</option>
          <option value="api" ${this.selectedSource === 'api' ? 'selected' : ''}>🌐 API / Server (Recommended)</option>
          <option value="browser" ${this.selectedSource === 'browser' ? 'selected' : ''}>💻 Browser (WebGPU)</option>
        </select>
        <p class="dropdown-hint">
          ${this.selectedSource === 'api' ? 'Run models on a server for best performance' :
            this.selectedSource === 'browser' ? 'Run models locally in your browser' :
            'Choose where to run the language model'}
        </p>
      </div>
    `;
  }

  private renderSecondDropdown(): string {
    if (this.selectedSource === 'api') {
      return this.renderProviderDropdown();
    } else {
      return this.renderBrowserCategoryDropdown();
    }
  }

  private renderProviderDropdown(): string {
    const providers = Object.entries(API_PROVIDERS).filter(([key]) => key !== 'custom');

    return `
      <div class="dropdown-group">
        <label class="dropdown-label">2. Provider</label>
        <select class="dropdown" id="provider-select">
          <option value="" ${!this.selectedProvider ? 'selected' : ''}>Select provider...</option>
          ${providers.map(([key, provider]) => {
            const ollamaStatus = key === 'ollama' ? (this.ollamaAvailable ? ' ✓ Running' : ' (Offline)') : '';
            const keyStatus = !provider.requiresKey ? ' (No API Key)' : '';
            return `<option value="${key}" ${this.selectedProvider === key ? 'selected' : ''}>${provider.name}${ollamaStatus}${keyStatus}</option>`;
          }).join('')}
        </select>
        ${this.selectedProvider ? this.renderProviderStatus() : '<p class="dropdown-hint">Choose an API provider</p>'}
      </div>
    `;
  }

  private renderProviderStatus(): string {
    if (this.selectedProvider === 'ollama') {
      if (this.ollamaAvailable) {
        return `<p class="dropdown-hint success">✓ Ollama running • ${this.ollamaModels.length} models available</p>`;
      } else {
        return `<p class="dropdown-hint warning">Ollama not running. Start with: <code>ollama serve</code></p>`;
      }
    }
    return '<p class="dropdown-hint">Enter your API key below</p>';
  }

  private renderBrowserCategoryDropdown(): string {
    return `
      <div class="dropdown-group">
        <label class="dropdown-label">2. Model Size</label>
        <select class="dropdown" id="category-select">
          <option value="" ${!this.selectedBrowserCategory ? 'selected' : ''}>Select size...</option>
          <option value="recommended" ${this.selectedBrowserCategory === 'recommended' ? 'selected' : ''}>⭐ Recommended (Best for tools)</option>
          <option value="small" ${this.selectedBrowserCategory === 'small' ? 'selected' : ''}>Small (~500MB-2GB, fast)</option>
          <option value="medium" ${this.selectedBrowserCategory === 'medium' ? 'selected' : ''}>Medium (~2-4GB, balanced)</option>
          <option value="large" ${this.selectedBrowserCategory === 'large' ? 'selected' : ''}>Large (~4-8GB, powerful)</option>
        </select>
        <p class="dropdown-hint">
          ${this.selectedBrowserCategory === 'recommended' ? 'Models fine-tuned for function calling' :
            this.selectedBrowserCategory === 'small' ? 'Fast downloads, lower VRAM' :
            this.selectedBrowserCategory === 'medium' ? 'Good balance of speed and capability' :
            this.selectedBrowserCategory === 'large' ? 'Best quality, requires more VRAM' :
            'Choose based on your GPU memory'}
        </p>
      </div>
    `;
  }

  private shouldShowModelDropdown(): boolean {
    if (this.selectedSource === 'api') {
      return this.selectedProvider !== null;
    } else if (this.selectedSource === 'browser') {
      return this.selectedBrowserCategory !== null;
    }
    return false;
  }

  private renderModelDropdown(): string {
    const models = this.getAvailableModels();
    const stepNum = this.shouldShowApiKeyInput() ? '4' : '3';

    return `
      <div class="dropdown-group">
        <label class="dropdown-label">${this.selectedSource === 'api' ? (this.shouldShowApiKeyInput() ? '4' : '3') : '3'}. Select Model</label>
        <select class="dropdown" id="model-select">
          <option value="" ${!this.selectedModel ? 'selected' : ''}>Select model...</option>
          ${models.map(model => {
            const displayName = this.getModelDisplayName(model);
            const description = this.getModelDescription(model);
            return `<option value="${model}" ${this.selectedModel === model ? 'selected' : ''}>${displayName}</option>`;
          }).join('')}
        </select>
        ${this.selectedModel ? `<p class="dropdown-hint">${this.getModelDescription(this.selectedModel)}</p>` : '<p class="dropdown-hint">Choose a model to load</p>'}
      </div>
    `;
  }

  private getAvailableModels(): string[] {
    if (this.selectedSource === 'api' && this.selectedProvider) {
      if (this.selectedProvider === 'ollama' && this.ollamaModels.length > 0) {
        return this.ollamaModels;
      }
      return API_PROVIDERS[this.selectedProvider].models;
    } else if (this.selectedSource === 'browser' && this.selectedBrowserCategory) {
      return RECOMMENDED_MODELS[this.selectedBrowserCategory] || [];
    }
    return [];
  }

  private shouldShowApiKeyInput(): boolean {
    if (this.selectedSource !== 'api' || !this.selectedProvider) return false;
    const provider = API_PROVIDERS[this.selectedProvider];
    return provider.requiresKey;
  }

  private renderApiKeyInput(): string {
    const provider = API_PROVIDERS[this.selectedProvider!];
    return `
      <div class="dropdown-group">
        <label class="dropdown-label">3. API Key</label>
        <input type="password" class="dropdown api-key-input" id="api-key-input"
          placeholder="Enter your ${provider.name} API key"
          value="${this.apiKey}">
        <p class="dropdown-hint">Your key is stored locally and only sent to ${provider.name}</p>
      </div>
    `;
  }

  private getModelDisplayName(model: string): string {
    // Clean up model names for display
    return model
      .replace(/-q\d+f\d+_\d+-MLC$/, '')
      .replace(/^(meta-llama|mistralai|NousResearch|deepseek-ai|Qwen|anthropic|openai|google)\//, '')
      .replace(/-Instruct|-Turbo|-it/g, '')
      .replace(/-/g, ' ');
  }

  private getModelDescription(model: string): string {
    const descriptions: Record<string, string> = {
      // Ollama
      'llama3.2:3b': 'Fast, good for most tasks (~2GB)',
      'llama3.3:70b': 'Most capable Llama (~40GB)',
      'qwen2.5:7b': 'Strong multilingual (~4GB)',
      'qwen2.5:72b': 'Excellent reasoning (~40GB)',
      'deepseek-r1:7b': 'Reasoning-focused (~4GB)',
      'deepseek-r1:70b': 'Best reasoning (~40GB)',
      'mistral:7b': 'Fast and capable (~4GB)',
      'mixtral:8x7b': 'MoE model (~26GB)',
      // Together
      'meta-llama/Llama-3.3-70B-Instruct-Turbo': 'Latest Llama',
      'deepseek-ai/DeepSeek-V3': 'State-of-the-art',
      'deepseek-ai/DeepSeek-R1': 'Best reasoning',
      // OpenAI
      'gpt-4o': 'Most capable GPT',
      'gpt-4o-mini': 'Fast and affordable',
      // Anthropic
      'claude-3-5-sonnet-20241022': 'Best for complex tasks',
      'claude-3-5-haiku-20241022': 'Fast and efficient',
      // Groq
      'llama-3.3-70b-versatile': 'Ultra-fast inference',
      'mixtral-8x7b-32768': 'Fast MoE',
      // Cerebras (~2600 tok/s)
      'llama-3.3-70b': 'Fastest inference (~2600 tok/s)',
      'llama-4-scout-17b-16e-instruct': 'New Llama 4 Scout',
      'qwen-2.5-32b': 'Strong reasoning (~2600 tok/s)',
      'qwen-2.5-coder-32b': 'Best for code (~2600 tok/s)',
      'deepseek-r1-distill-llama-70b': 'Reasoning distilled',
      // SambaNova
      'Meta-Llama-3.3-70B-Instruct': 'Latest Llama 3.3',
      'Meta-Llama-3.1-405B-Instruct': 'Largest Llama (~1000 tok/s)',
      'Qwen2.5-72B-Instruct': 'Strong reasoning',
      'DeepSeek-R1': 'Best reasoning model',
      // Fireworks
      'accounts/fireworks/models/llama-v3p3-70b-instruct': 'Llama 3.3 70B (~482 tok/s)',
      'accounts/fireworks/models/llama-v3p1-405b-instruct': 'Llama 405B',
      'accounts/fireworks/models/deepseek-r1': 'DeepSeek R1',
      'accounts/fireworks/models/deepseek-v3': 'DeepSeek V3',
      // Clarifai
      'llama-3-3-70b-instruct': 'Llama 3.3 (~544 tok/s)',
      'llama-3-1-405b-instruct': 'Llama 405B',
      'qwen-2-5-72b-instruct': 'Qwen 72B',
      // WebLLM - Custom trained
      'OrbPro-Cesium-SLM-0.5B-q4f32_1-MLC': '⭐ Custom trained for Cesium (~600MB)',
      'OrbPro-Cesium-SLM-1.5B-q4f16_1-MLC': '⭐ Custom trained for Cesium (~851MB)',
      // WebLLM
      'Llama-3.2-3B-Instruct-q4f16_1-MLC': 'Best for tool use (~2GB)',
      'Hermes-3-Llama-3.2-3B-q4f16_1-MLC': 'Function calling (~2GB)',
      'Qwen2.5-1.5B-Instruct-q4f16_1-MLC': 'Good balance',
      'SmolLM2-1.7B-Instruct-q4f16_1-MLC': 'Fast with reasoning',
      'SmolLM2-360M-Instruct-q4f16_1-MLC': 'Extremely fast',
      'Phi-3.5-mini-instruct-q4f16_1-MLC': 'Good instruction following',
      'Qwen2.5-3B-Instruct-q4f16_1-MLC': 'Strong reasoning',
      'gemma-2-2b-it-q4f16_1-MLC': 'Google model',
      'Qwen2.5-7B-Instruct-q4f16_1-MLC': 'High capability (~4GB)',
      'Mistral-7B-Instruct-v0.3-q4f16_1-MLC': 'Powerful (~4GB)',
      'Llama-3.1-8B-Instruct-q4f16_1-MLC': 'Most capable (~5GB)',
    };
    return descriptions[model] || 'High-quality model';
  }

  private setupEventListeners(): void {
    // Accordion toggle
    const accordionToggle = this.container.querySelector('#accordion-toggle');
    if (accordionToggle) {
      accordionToggle.addEventListener('click', (e) => {
        // Don't toggle if clicking the reset button
        if ((e.target as HTMLElement).closest('#model-reset-btn')) {
          return;
        }
        this.isExpanded = !this.isExpanded;
        this.render();
      });
    }

    // Reset button
    const resetBtn = this.container.querySelector('#model-reset-btn');
    if (resetBtn) {
      resetBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.reset();
      });
    }

    // Source dropdown
    const sourceSelect = this.container.querySelector('#source-select') as HTMLSelectElement;
    if (sourceSelect) {
      sourceSelect.addEventListener('change', (e) => {
        const target = e.target as HTMLSelectElement;
        this.selectedSource = target.value as ModelSource || null;
        // Reset downstream selections
        this.selectedProvider = null;
        this.selectedBrowserCategory = null;
        this.selectedModel = null;
        this.render();
      });
    }

    // Provider dropdown (API)
    const providerSelect = this.container.querySelector('#provider-select') as HTMLSelectElement;
    if (providerSelect) {
      providerSelect.addEventListener('change', (e) => {
        const target = e.target as HTMLSelectElement;
        this.selectedProvider = target.value as APIProvider || null;
        this.selectedModel = null;
        this.saveSettings();
        this.render();
      });
    }

    // Category dropdown (Browser)
    const categorySelect = this.container.querySelector('#category-select') as HTMLSelectElement;
    if (categorySelect) {
      categorySelect.addEventListener('change', (e) => {
        const target = e.target as HTMLSelectElement;
        this.selectedBrowserCategory = target.value as BrowserCategory || null;
        this.selectedModel = null;
        this.render();
      });
    }

    // Model dropdown - auto-load on selection
    const modelSelect = this.container.querySelector('#model-select') as HTMLSelectElement;
    if (modelSelect) {
      modelSelect.addEventListener('change', (e) => {
        const target = e.target as HTMLSelectElement;
        this.selectedModel = target.value || null;
        if (this.selectedModel) {
          // Auto-load the model
          this.loadSelectedModel();
        }
        this.render();
      });
    }

    // API key input
    const apiKeyInput = this.container.querySelector('#api-key-input') as HTMLInputElement;
    if (apiKeyInput) {
      apiKeyInput.addEventListener('input', (e) => {
        const target = e.target as HTMLInputElement;
        this.apiKey = target.value;
        this.saveSettings();
      });
    }
  }

  private loadSelectedModel(): void {
    if (!this.selectedModel) return;

    const selection: ModelSelection = this.selectedSource === 'api'
      ? {
          type: 'api',
          modelId: this.selectedModel,
          provider: this.selectedProvider!,
          apiKey: this.apiKey || undefined,
          baseUrl: this.customUrl || undefined,
        }
      : {
          type: 'webllm',
          modelId: this.selectedModel,
        };

    // Save settings before loading
    this.saveSettings();

    // Collapse the accordion after loading
    this.isExpanded = false;

    this.onSelect(selection);
  }

  getSelectedModel(): string | null {
    return this.selectedModel;
  }

  hide(): void {
    this.container.style.display = 'none';
  }

  show(): void {
    this.container.style.display = 'block';
  }

  collapse(): void {
    this.isExpanded = false;
    this.render();
  }

  expand(): void {
    this.isExpanded = true;
    this.render();
  }

  toggle(): void {
    this.isExpanded = !this.isExpanded;
    this.render();
  }

  /**
   * Reset the model selection and unload the current model
   */
  reset(): void {
    // Clear selection state
    this.selectedSource = null;
    this.selectedProvider = null;
    this.selectedBrowserCategory = null;
    this.selectedModel = null;

    // Clear saved settings
    try {
      localStorage.removeItem('cesium-slm-model-settings');
    } catch {
      // Ignore errors
    }

    // Expand accordion to allow new selection
    this.isExpanded = true;

    // Call reset callback to unload the model
    this.onReset?.();

    // Re-render
    this.render();
  }

  private injectStyles(): void {
    if (document.getElementById('model-selector-styles')) {
      return;
    }

    const style = document.createElement('style');
    style.id = 'model-selector-styles';
    style.textContent = `
      .model-selector {
        display: flex;
        flex-direction: column;
        background: #1a1a2e;
        color: #e0e0e0;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        box-sizing: border-box;
        border-radius: 8px;
      }

      .model-selector-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 12px 16px;
        cursor: pointer;
        user-select: none;
        background: #252542;
        border-radius: 8px;
        transition: background 0.2s;
      }

      .model-selector-header:hover {
        background: #2d2d4a;
      }

      .model-selector-header-left {
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .accordion-chevron {
        display: flex;
        align-items: center;
        color: #818cf8;
        transition: transform 0.2s;
      }

      .model-selector-title {
        margin: 0;
        font-size: 0.95em;
        color: white;
        font-weight: 600;
      }

      .model-selector-header-right {
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .model-selector-status {
        font-size: 0.8em;
        color: #9ca3af;
        max-width: 150px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .model-reset-btn {
        background: rgba(248, 113, 113, 0.15);
        border: none;
        border-radius: 6px;
        padding: 6px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        color: #f87171;
        transition: background 0.2s, color 0.2s;
      }

      .model-reset-btn:hover {
        background: rgba(248, 113, 113, 0.3);
        color: #fca5a5;
      }

      .model-selector-content {
        overflow: hidden;
        transition: max-height 0.3s ease, padding 0.3s ease, opacity 0.2s ease;
      }

      .model-selector-content.expanded {
        max-height: 800px;
        padding: 16px;
        opacity: 1;
      }

      .model-selector-content.collapsed {
        max-height: 0;
        padding: 0 16px;
        opacity: 0;
      }

      .dropdown-stack {
        display: flex;
        flex-direction: column;
        gap: 14px;
      }

      .dropdown-group {
        display: flex;
        flex-direction: column;
        gap: 6px;
      }

      .dropdown-label {
        font-size: 0.75em;
        color: #818cf8;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }

      .dropdown {
        width: 100%;
        padding: 10px 12px;
        background: #2d2d4a;
        border: 1px solid #3d3d5a;
        border-radius: 6px;
        color: white;
        font-size: 0.85em;
        cursor: pointer;
        transition: border-color 0.2s, background 0.2s;
        appearance: none;
        background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' fill='%239ca3af' viewBox='0 0 16 16'%3E%3Cpath d='M8 11L3 6h10l-5 5z'/%3E%3C/svg%3E");
        background-repeat: no-repeat;
        background-position: right 10px center;
        padding-right: 30px;
        box-sizing: border-box;
      }

      .dropdown:hover {
        border-color: #818cf8;
      }

      .dropdown:focus {
        outline: none;
        border-color: #818cf8;
        background-color: #3d3d5a;
      }

      .dropdown option {
        background: #2d2d4a;
        color: white;
        padding: 8px;
      }

      .api-key-input {
        background-image: none;
        padding-right: 12px;
      }

      .api-key-input::placeholder {
        color: #6b7280;
      }

      .dropdown-hint {
        margin: 0;
        font-size: 0.75em;
        color: #9ca3af;
        line-height: 1.3;
      }

      .dropdown-hint.success {
        color: #22c55e;
      }

      .dropdown-hint.warning {
        color: #f59e0b;
      }

      .dropdown-hint code {
        background: #1a1a2e;
        padding: 2px 5px;
        border-radius: 3px;
        font-size: 0.9em;
      }
    `;

    document.head.appendChild(style);
  }
}
