/**
 * Model Selector Component
 * Allows users to choose which LLM model to load
 */

import { RECOMMENDED_MODELS } from '../llm/web-llm-engine';

export interface ModelSelectorConfig {
  containerId: string;
  onSelect: (modelId: string) => void;
  defaultModel?: string;
}

export class ModelSelector {
  private container: HTMLElement;
  private onSelect: (modelId: string) => void;
  private selectedModel: string;

  constructor(config: ModelSelectorConfig) {
    const container = document.getElementById(config.containerId);
    if (!container) {
      throw new Error(`Container element '${config.containerId}' not found`);
    }

    this.container = container;
    this.onSelect = config.onSelect;
    this.selectedModel = config.defaultModel || RECOMMENDED_MODELS.small[0]!;

    this.injectStyles();
    this.render();
  }

  private render(): void {
    const html = `
      <div class="model-selector">
        <h3 class="model-selector-title">Select Language Model</h3>
        <p class="model-selector-desc">Choose a model based on your device capabilities. Smaller models are faster but less capable.</p>

        <div class="model-categories">
          <div class="model-category">
            <h4>Small (Fast, ~500MB-2GB)</h4>
            <div class="model-list">
              ${RECOMMENDED_MODELS.small.map(model => this.renderModelOption(model, 'small')).join('')}
            </div>
          </div>

          <div class="model-category">
            <h4>Medium (Balanced, ~2-4GB)</h4>
            <div class="model-list">
              ${RECOMMENDED_MODELS.medium.map(model => this.renderModelOption(model, 'medium')).join('')}
            </div>
          </div>

          <div class="model-category">
            <h4>Large (Powerful, ~4-8GB)</h4>
            <div class="model-list">
              ${RECOMMENDED_MODELS.large.map(model => this.renderModelOption(model, 'large')).join('')}
            </div>
          </div>
        </div>

        <div class="model-selector-actions">
          <button class="model-load-btn" id="model-load-btn">Load Selected Model</button>
        </div>

        <div class="model-selector-note">
          <strong>Note:</strong> Models are downloaded and cached in your browser. First load may take a while depending on your connection speed.
        </div>
      </div>
    `;

    this.container.innerHTML = html;
    this.setupEventListeners();
  }

  private renderModelOption(modelId: string, tier: string): string {
    const isSelected = modelId === this.selectedModel;
    const displayName = this.getDisplayName(modelId);
    const description = this.getModelDescription(modelId, tier);

    return `
      <label class="model-option ${isSelected ? 'selected' : ''}">
        <input type="radio" name="model" value="${modelId}" ${isSelected ? 'checked' : ''}>
        <div class="model-option-content">
          <span class="model-name">${displayName}</span>
          <span class="model-desc">${description}</span>
        </div>
      </label>
    `;
  }

  private getDisplayName(modelId: string): string {
    // Extract readable name from model ID
    return modelId
      .replace(/-q\d+f\d+_\d+-MLC$/, '')
      .replace(/-/g, ' ')
      .replace(/\b\w/g, l => l.toUpperCase());
  }

  private getModelDescription(modelId: string, tier: string): string {
    const descriptions: Record<string, string> = {
      'Qwen2.5-0.5B-Instruct-q4f16_1-MLC': 'Tiny but efficient, great for basic commands',
      'Qwen2.5-1.5B-Instruct-q4f16_1-MLC': 'Good balance of speed and capability',
      'SmolLM2-360M-Instruct-q4f16_1-MLC': 'Extremely fast, minimal resource usage',
      'SmolLM2-1.7B-Instruct-q4f16_1-MLC': 'Fast with better reasoning',
      'Qwen2.5-3B-Instruct-q4f16_1-MLC': 'Strong reasoning, moderate speed',
      'Phi-3.5-mini-instruct-q4f16_1-MLC': 'Microsoft model, good instruction following',
      'gemma-2-2b-it-q4f16_1-MLC': 'Google model, balanced performance',
      'Llama-3.2-3B-Instruct-q4f16_1-MLC': 'Meta model, excellent general capability',
      'Qwen2.5-7B-Instruct-q4f16_1-MLC': 'High capability, requires more VRAM',
      'Mistral-7B-Instruct-v0.3-q4f16_1-MLC': 'Powerful, excellent for complex tasks',
    };

    return descriptions[modelId] || `${tier.charAt(0).toUpperCase() + tier.slice(1)} tier model`;
  }

  private setupEventListeners(): void {
    const radios = this.container.querySelectorAll('input[name="model"]');
    radios.forEach(radio => {
      radio.addEventListener('change', (e) => {
        const target = e.target as HTMLInputElement;
        this.selectedModel = target.value;
        this.updateSelection();
      });
    });

    const loadBtn = this.container.querySelector('#model-load-btn');
    if (loadBtn) {
      loadBtn.addEventListener('click', () => {
        this.onSelect(this.selectedModel);
      });
    }
  }

  private updateSelection(): void {
    const options = this.container.querySelectorAll('.model-option');
    options.forEach(option => {
      const radio = option.querySelector('input') as HTMLInputElement;
      option.classList.toggle('selected', radio.checked);
    });
  }

  getSelectedModel(): string {
    return this.selectedModel;
  }

  hide(): void {
    this.container.style.display = 'none';
  }

  show(): void {
    this.container.style.display = 'block';
  }

  private injectStyles(): void {
    if (document.getElementById('model-selector-styles')) {
      return;
    }

    const style = document.createElement('style');
    style.id = 'model-selector-styles';
    style.textContent = `
      .model-selector {
        padding: 24px;
        background: #1a1a2e;
        border-radius: 12px;
        color: #e0e0e0;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        max-width: 800px;
        margin: 0 auto;
      }

      .model-selector-title {
        margin: 0 0 8px 0;
        font-size: 1.5em;
        color: white;
      }

      .model-selector-desc {
        margin: 0 0 20px 0;
        color: #9ca3af;
        font-size: 0.95em;
      }

      .model-categories {
        display: flex;
        flex-direction: column;
        gap: 20px;
      }

      .model-category h4 {
        margin: 0 0 10px 0;
        color: #818cf8;
        font-size: 0.9em;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }

      .model-list {
        display: grid;
        gap: 8px;
      }

      .model-option {
        display: flex;
        align-items: flex-start;
        gap: 12px;
        padding: 12px 16px;
        background: #2d2d4a;
        border: 2px solid transparent;
        border-radius: 8px;
        cursor: pointer;
        transition: all 0.2s;
      }

      .model-option:hover {
        background: #3d3d5a;
      }

      .model-option.selected {
        border-color: #818cf8;
        background: #2d2d5a;
      }

      .model-option input {
        margin-top: 3px;
        accent-color: #818cf8;
      }

      .model-option-content {
        display: flex;
        flex-direction: column;
        gap: 2px;
      }

      .model-name {
        font-weight: 600;
        color: white;
      }

      .model-desc {
        font-size: 0.85em;
        color: #9ca3af;
      }

      .model-selector-actions {
        margin-top: 24px;
        text-align: center;
      }

      .model-load-btn {
        padding: 14px 32px;
        background: linear-gradient(135deg, #818cf8, #6366f1);
        color: white;
        border: none;
        border-radius: 8px;
        font-size: 1em;
        font-weight: 600;
        cursor: pointer;
        transition: transform 0.2s, box-shadow 0.2s;
      }

      .model-load-btn:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 20px rgba(129, 140, 248, 0.4);
      }

      .model-selector-note {
        margin-top: 20px;
        padding: 12px 16px;
        background: #2d2d4a;
        border-radius: 6px;
        font-size: 0.85em;
        color: #9ca3af;
      }

      .model-selector-note strong {
        color: #fbbf24;
      }
    `;

    document.head.appendChild(style);
  }
}
