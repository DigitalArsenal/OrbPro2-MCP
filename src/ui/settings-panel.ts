/**
 * Settings Panel Component
 * Comprehensive settings for all service APIs and configurations
 */

export interface APIKeyConfig {
  // Routing & Mapping
  openRouteService: string;

  // LLM Inference Providers
  openai: string;
  anthropic: string;
  together: string;
  groq: string;
  cerebras: string;
  sambanova: string;
  fireworks: string;

  // Cesium
  cesiumIon: string;

  // Custom Endpoints
  ollamaEndpoint: string;
  nominatimEndpoint: string;
  overpassEndpoint: string;
  osrmEndpoint: string;
}

export interface SettingsPanelConfig {
  onSettingsChange?: (settings: APIKeyConfig) => void;
}

// Default endpoints
const DEFAULT_ENDPOINTS = {
  ollama: 'http://localhost:11434',
  nominatim: 'https://nominatim.openstreetmap.org',
  overpass: 'https://overpass-api.de/api/interpreter',
  osrm: 'http://localhost:5000',
};

export class SettingsPanel {
  private isOpen: boolean = false;
  private settings: APIKeyConfig;
  private onSettingsChange?: (settings: APIKeyConfig) => void;
  private panelElement: HTMLElement | null = null;
  private overlayElement: HTMLElement | null = null;
  private activeTab: string = 'routing';

  constructor(config: SettingsPanelConfig = {}) {
    this.onSettingsChange = config.onSettingsChange;
    this.settings = this.loadSettings();
    this.injectStyles();
    this.createGearButton();
    this.createPanel();
  }

  private loadSettings(): APIKeyConfig {
    try {
      const saved = localStorage.getItem('orbpro-api-settings');
      if (saved) {
        const parsed = JSON.parse(saved);
        return { ...this.getDefaultSettings(), ...parsed };
      }
    } catch {
      // Ignore errors
    }
    return this.getDefaultSettings();
  }

  private getDefaultSettings(): APIKeyConfig {
    return {
      openRouteService: '',
      openai: '',
      anthropic: '',
      together: '',
      groq: '',
      cerebras: '',
      sambanova: '',
      fireworks: '',
      cesiumIon: '',
      ollamaEndpoint: DEFAULT_ENDPOINTS.ollama,
      nominatimEndpoint: DEFAULT_ENDPOINTS.nominatim,
      overpassEndpoint: DEFAULT_ENDPOINTS.overpass,
      osrmEndpoint: DEFAULT_ENDPOINTS.osrm,
    };
  }

  private saveSettings(): void {
    try {
      localStorage.setItem('orbpro-api-settings', JSON.stringify(this.settings));
      this.onSettingsChange?.(this.settings);
    } catch {
      // Ignore errors
    }
  }

  public getSettings(): APIKeyConfig {
    return { ...this.settings };
  }

  public getApiKey(service: keyof APIKeyConfig): string {
    return this.settings[service] || '';
  }

  private injectStyles(): void {
    if (document.getElementById('settings-panel-styles')) return;

    const style = document.createElement('style');
    style.id = 'settings-panel-styles';
    style.textContent = `
      .settings-gear-btn {
        background: transparent;
        border: none;
        cursor: pointer;
        padding: 8px;
        border-radius: 8px;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: background 0.2s, transform 0.2s;
      }

      .settings-gear-btn:hover {
        background: rgba(129, 140, 248, 0.2);
      }

      .settings-gear-btn:hover svg {
        transform: rotate(30deg);
      }

      .settings-gear-btn svg {
        width: 24px;
        height: 24px;
        fill: #9ca3af;
        transition: fill 0.2s, transform 0.3s;
      }

      .settings-gear-btn:hover svg {
        fill: #818cf8;
      }

      .settings-overlay {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.6);
        backdrop-filter: blur(4px);
        z-index: 1000;
        opacity: 0;
        visibility: hidden;
        transition: opacity 0.2s, visibility 0.2s;
      }

      .settings-overlay.open {
        opacity: 1;
        visibility: visible;
      }

      .settings-panel {
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%) scale(0.95);
        background: linear-gradient(135deg, #1a1a2e 0%, #16162a 100%);
        border: 1px solid #2d2d4a;
        border-radius: 16px;
        min-width: 600px;
        max-width: 90vw;
        max-height: 85vh;
        overflow: hidden;
        z-index: 1001;
        opacity: 0;
        visibility: hidden;
        transition: opacity 0.2s, visibility 0.2s, transform 0.2s;
        box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
        display: flex;
        flex-direction: column;
      }

      .settings-panel.open {
        opacity: 1;
        visibility: visible;
        transform: translate(-50%, -50%) scale(1);
      }

      .settings-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 20px 24px;
        border-bottom: 1px solid #2d2d4a;
        flex-shrink: 0;
      }

      .settings-header h2 {
        font-size: 1.25em;
        font-weight: 600;
        background: linear-gradient(135deg, #818cf8, #c084fc);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .settings-header h2 svg {
        width: 20px;
        height: 20px;
        fill: #818cf8;
      }

      .settings-close-btn {
        background: transparent;
        border: none;
        cursor: pointer;
        padding: 8px;
        border-radius: 8px;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: background 0.2s;
      }

      .settings-close-btn:hover {
        background: rgba(248, 113, 113, 0.2);
      }

      .settings-close-btn svg {
        width: 20px;
        height: 20px;
        fill: #9ca3af;
        transition: fill 0.2s;
      }

      .settings-close-btn:hover svg {
        fill: #f87171;
      }

      .settings-body {
        display: flex;
        flex: 1;
        min-height: 0;
        overflow: hidden;
      }

      .settings-tabs {
        width: 180px;
        background: rgba(0, 0, 0, 0.2);
        border-right: 1px solid #2d2d4a;
        padding: 12px 0;
        flex-shrink: 0;
      }

      .settings-tab {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 12px 20px;
        cursor: pointer;
        color: #9ca3af;
        font-size: 0.9em;
        transition: background 0.2s, color 0.2s;
        border-left: 3px solid transparent;
      }

      .settings-tab:hover {
        background: rgba(129, 140, 248, 0.1);
        color: #e0e0e0;
      }

      .settings-tab.active {
        background: rgba(129, 140, 248, 0.15);
        color: #818cf8;
        border-left-color: #818cf8;
      }

      .settings-tab svg {
        width: 18px;
        height: 18px;
        fill: currentColor;
        flex-shrink: 0;
      }

      .settings-content {
        flex: 1;
        padding: 24px;
        overflow-y: auto;
      }

      .settings-section {
        margin-bottom: 24px;
      }

      .settings-section:last-child {
        margin-bottom: 0;
      }

      .settings-section-title {
        font-size: 0.85em;
        font-weight: 600;
        color: #818cf8;
        margin-bottom: 16px;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }

      .api-key-item {
        background: rgba(45, 45, 74, 0.3);
        border-radius: 12px;
        padding: 16px;
        margin-bottom: 12px;
      }

      .api-key-item:last-child {
        margin-bottom: 0;
      }

      .api-key-label {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 8px;
      }

      .api-key-name {
        font-weight: 500;
        color: #e0e0e0;
        font-size: 0.95em;
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .api-key-name .status-dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: #6b7280;
      }

      .api-key-name .status-dot.configured {
        background: #22c55e;
      }

      .api-key-link {
        font-size: 0.8em;
        color: #818cf8;
        text-decoration: none;
        display: flex;
        align-items: center;
        gap: 4px;
        transition: color 0.2s;
      }

      .api-key-link:hover {
        color: #a5b4fc;
        text-decoration: underline;
      }

      .api-key-link svg {
        width: 12px;
        height: 12px;
        fill: currentColor;
      }

      .api-key-input {
        width: 100%;
        background: #0a0a1a;
        border: 1px solid #2d2d4a;
        border-radius: 8px;
        padding: 10px 12px;
        color: white;
        font-size: 0.9em;
        font-family: 'Monaco', 'Menlo', monospace;
        transition: border-color 0.2s, box-shadow 0.2s;
      }

      .api-key-input:focus {
        outline: none;
        border-color: #818cf8;
        box-shadow: 0 0 0 3px rgba(129, 140, 248, 0.2);
      }

      .api-key-input::placeholder {
        color: #6b7280;
      }

      .api-key-description {
        font-size: 0.8em;
        color: #9ca3af;
        margin-top: 8px;
        line-height: 1.4;
      }

      .api-key-description code {
        background: rgba(129, 140, 248, 0.2);
        padding: 2px 6px;
        border-radius: 4px;
        font-family: 'Monaco', 'Menlo', monospace;
        font-size: 0.9em;
        color: #a5b4fc;
      }

      .settings-footer {
        padding: 16px 24px;
        border-top: 1px solid #2d2d4a;
        display: flex;
        justify-content: space-between;
        align-items: center;
        flex-shrink: 0;
      }

      .settings-footer-hint {
        font-size: 0.8em;
        color: #6b7280;
      }

      .settings-footer-buttons {
        display: flex;
        gap: 12px;
      }

      .settings-btn {
        padding: 10px 20px;
        border-radius: 8px;
        font-size: 0.9em;
        font-weight: 500;
        cursor: pointer;
        transition: background 0.2s, transform 0.1s;
      }

      .settings-btn:active {
        transform: scale(0.98);
      }

      .settings-btn-secondary {
        background: transparent;
        border: 1px solid #2d2d4a;
        color: #9ca3af;
      }

      .settings-btn-secondary:hover {
        background: rgba(45, 45, 74, 0.5);
        color: #e0e0e0;
      }

      .settings-btn-primary {
        background: linear-gradient(135deg, #818cf8, #6366f1);
        border: none;
        color: white;
      }

      .settings-btn-primary:hover {
        background: linear-gradient(135deg, #a5b4fc, #818cf8);
      }

      .endpoint-note {
        background: rgba(129, 140, 248, 0.1);
        border: 1px solid rgba(129, 140, 248, 0.3);
        border-radius: 8px;
        padding: 12px;
        margin-top: 16px;
        font-size: 0.85em;
        color: #a5b4fc;
      }

      .endpoint-note code {
        background: rgba(0, 0, 0, 0.3);
        padding: 2px 6px;
        border-radius: 4px;
        font-family: 'Monaco', 'Menlo', monospace;
      }

      @media (max-width: 768px) {
        .settings-panel {
          min-width: unset;
          width: 95vw;
          max-height: 90vh;
        }

        .settings-body {
          flex-direction: column;
        }

        .settings-tabs {
          width: 100%;
          display: flex;
          overflow-x: auto;
          padding: 8px;
          border-right: none;
          border-bottom: 1px solid #2d2d4a;
        }

        .settings-tab {
          flex-shrink: 0;
          padding: 8px 16px;
          border-left: none;
          border-bottom: 2px solid transparent;
          border-radius: 8px;
        }

        .settings-tab.active {
          border-left: none;
          border-bottom-color: #818cf8;
        }
      }
    `;
    document.head.appendChild(style);
  }

  private createGearButton(): void {
    const header = document.querySelector('.header');
    if (!header) return;

    const gearBtn = document.createElement('button');
    gearBtn.className = 'settings-gear-btn';
    gearBtn.title = 'Settings';
    gearBtn.innerHTML = `
      <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path d="M19.14 12.94c.04-.31.06-.63.06-.94 0-.31-.02-.63-.06-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.04.31-.06.63-.06.94s.02.63.06.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/>
      </svg>
    `;
    gearBtn.addEventListener('click', () => this.toggle());
    header.appendChild(gearBtn);
  }

  private createPanel(): void {
    // Create overlay
    this.overlayElement = document.createElement('div');
    this.overlayElement.className = 'settings-overlay';
    this.overlayElement.addEventListener('click', () => this.close());

    // Create panel
    this.panelElement = document.createElement('div');
    this.panelElement.className = 'settings-panel';
    this.renderPanel();

    document.body.appendChild(this.overlayElement);
    document.body.appendChild(this.panelElement);
  }

  private renderPanel(): void {
    if (!this.panelElement) return;

    this.panelElement.innerHTML = `
      <div class="settings-header">
        <h2>
          <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path d="M19.14 12.94c.04-.31.06-.63.06-.94 0-.31-.02-.63-.06-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.04.31-.06.63-.06.94s.02.63.06.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/>
          </svg>
          Settings
        </h2>
        <button class="settings-close-btn" data-action="close">
          <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
          </svg>
        </button>
      </div>

      <div class="settings-body">
        <div class="settings-tabs">
          ${this.renderTabs()}
        </div>
        <div class="settings-content">
          ${this.renderTabContent()}
        </div>
      </div>

      <div class="settings-footer">
        <span class="settings-footer-hint">Settings are saved to browser storage</span>
        <div class="settings-footer-buttons">
          <button class="settings-btn settings-btn-secondary" data-action="cancel">Cancel</button>
          <button class="settings-btn settings-btn-primary" data-action="save">Save Changes</button>
        </div>
      </div>
    `;

    this.attachEventListeners();
  }

  private renderTabs(): string {
    const tabs = [
      { id: 'routing', icon: 'M21 3L3 10.53v.98l6.84 2.65L12.48 21h.98L21 3z', label: 'Routing' },
      { id: 'llm', icon: 'M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z', label: 'AI Providers' },
      { id: 'mapping', icon: 'M20.5 3l-.16.03L15 5.1 9 3 3.36 4.9c-.21.07-.36.25-.36.48V20.5c0 .28.22.5.5.5l.16-.03L9 18.9l6 2.1 5.64-1.9c.21-.07.36-.25.36-.48V3.5c0-.28-.22-.5-.5-.5zM15 19l-6-2.11V5l6 2.11V19z', label: 'Mapping' },
      { id: 'cesium', icon: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z', label: 'Cesium' },
    ];

    return tabs.map(tab => `
      <div class="settings-tab ${this.activeTab === tab.id ? 'active' : ''}" data-tab="${tab.id}">
        <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path d="${tab.icon}"/>
        </svg>
        <span>${tab.label}</span>
      </div>
    `).join('');
  }

  private renderTabContent(): string {
    switch (this.activeTab) {
      case 'routing':
        return this.renderRoutingTab();
      case 'llm':
        return this.renderLLMTab();
      case 'mapping':
        return this.renderMappingTab();
      case 'cesium':
        return this.renderCesiumTab();
      default:
        return '';
    }
  }

  private renderRoutingTab(): string {
    return `
      <div class="settings-section">
        <div class="settings-section-title">Routing Services</div>

        <div class="api-key-item">
          <div class="api-key-label">
            <span class="api-key-name">
              <span class="status-dot ${this.settings.openRouteService ? 'configured' : ''}"></span>
              OpenRouteService
            </span>
            <a href="https://openrouteservice.org/dev/#/signup" target="_blank" rel="noopener" class="api-key-link">
              Get free API key
              <svg viewBox="0 0 24 24"><path d="M19 19H5V5h7V3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2v-7h-2v7zM14 3v2h3.59l-9.83 9.83 1.41 1.41L19 6.41V10h2V3h-7z"/></svg>
            </a>
          </div>
          <input type="password" class="api-key-input" data-key="openRouteService"
            placeholder="Enter your OpenRouteService API key"
            value="${this.settings.openRouteService}" autocomplete="off"/>
          <p class="api-key-description">
            Required for <code>walkTo</code>, <code>driveTo</code>, <code>getRoute</code>, <code>getIsochrone</code>.
            Free tier: 2,000 requests/day.
          </p>
        </div>
      </div>

      <div class="settings-section">
        <div class="settings-section-title">Local Routing (OSRM)</div>

        <div class="api-key-item">
          <div class="api-key-label">
            <span class="api-key-name">
              <span class="status-dot ${this.settings.osrmEndpoint !== DEFAULT_ENDPOINTS.osrm ? 'configured' : ''}"></span>
              OSRM Endpoint
            </span>
            <a href="https://github.com/Project-OSRM/osrm-backend" target="_blank" rel="noopener" class="api-key-link">
              Setup guide
              <svg viewBox="0 0 24 24"><path d="M19 19H5V5h7V3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2v-7h-2v7zM14 3v2h3.59l-9.83 9.83 1.41 1.41L19 6.41V10h2V3h-7z"/></svg>
            </a>
          </div>
          <input type="text" class="api-key-input" data-key="osrmEndpoint"
            placeholder="${DEFAULT_ENDPOINTS.osrm}"
            value="${this.settings.osrmEndpoint}" autocomplete="off"/>
          <p class="api-key-description">
            Self-hosted routing for offline use. No API key needed.
            Default: <code>${DEFAULT_ENDPOINTS.osrm}</code>
          </p>
        </div>

        <div class="endpoint-note">
          <strong>Quick Start:</strong> Run <code>docker run -p 5000:5000 osrm/osrm-backend</code> with your region's OSM data.
          OSRM is used automatically when no ORS API key is configured.
        </div>
      </div>
    `;
  }

  private renderLLMTab(): string {
    const providers = [
      { key: 'openai', name: 'OpenAI', url: 'https://platform.openai.com/api-keys', desc: 'GPT-4, GPT-3.5' },
      { key: 'anthropic', name: 'Anthropic', url: 'https://console.anthropic.com/settings/keys', desc: 'Claude 3.5, Claude 3' },
      { key: 'together', name: 'Together AI', url: 'https://api.together.xyz/settings/api-keys', desc: 'Llama, Mixtral, more' },
      { key: 'groq', name: 'Groq', url: 'https://console.groq.com/keys', desc: 'Ultra-fast inference' },
      { key: 'cerebras', name: 'Cerebras', url: 'https://cloud.cerebras.ai/platform/', desc: 'Llama models' },
      { key: 'sambanova', name: 'SambaNova', url: 'https://cloud.sambanova.ai/', desc: 'Enterprise AI' },
      { key: 'fireworks', name: 'Fireworks', url: 'https://fireworks.ai/api-keys', desc: 'Fast open models' },
    ];

    return `
      <div class="settings-section">
        <div class="settings-section-title">Cloud LLM Providers</div>
        ${providers.map(p => `
          <div class="api-key-item">
            <div class="api-key-label">
              <span class="api-key-name">
                <span class="status-dot ${this.settings[p.key as keyof APIKeyConfig] ? 'configured' : ''}"></span>
                ${p.name}
              </span>
              <a href="${p.url}" target="_blank" rel="noopener" class="api-key-link">
                Get API key
                <svg viewBox="0 0 24 24"><path d="M19 19H5V5h7V3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2v-7h-2v7zM14 3v2h3.59l-9.83 9.83 1.41 1.41L19 6.41V10h2V3h-7z"/></svg>
              </a>
            </div>
            <input type="password" class="api-key-input" data-key="${p.key}"
              placeholder="Enter your ${p.name} API key"
              value="${this.settings[p.key as keyof APIKeyConfig] || ''}" autocomplete="off"/>
            <p class="api-key-description">${p.desc}</p>
          </div>
        `).join('')}
      </div>

      <div class="settings-section">
        <div class="settings-section-title">Local LLM (Ollama)</div>

        <div class="api-key-item">
          <div class="api-key-label">
            <span class="api-key-name">
              <span class="status-dot ${this.settings.ollamaEndpoint !== DEFAULT_ENDPOINTS.ollama ? 'configured' : ''}"></span>
              Ollama Endpoint
            </span>
            <a href="https://ollama.com/download" target="_blank" rel="noopener" class="api-key-link">
              Download Ollama
              <svg viewBox="0 0 24 24"><path d="M19 19H5V5h7V3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2v-7h-2v7zM14 3v2h3.59l-9.83 9.83 1.41 1.41L19 6.41V10h2V3h-7z"/></svg>
            </a>
          </div>
          <input type="text" class="api-key-input" data-key="ollamaEndpoint"
            placeholder="${DEFAULT_ENDPOINTS.ollama}"
            value="${this.settings.ollamaEndpoint}" autocomplete="off"/>
          <p class="api-key-description">
            Run LLMs locally with Ollama. No API key needed.
            Default: <code>${DEFAULT_ENDPOINTS.ollama}</code>
          </p>
        </div>
      </div>
    `;
  }

  private renderMappingTab(): string {
    return `
      <div class="settings-section">
        <div class="settings-section-title">Geocoding (Nominatim)</div>

        <div class="api-key-item">
          <div class="api-key-label">
            <span class="api-key-name">
              <span class="status-dot ${this.settings.nominatimEndpoint !== DEFAULT_ENDPOINTS.nominatim ? 'configured' : ''}"></span>
              Nominatim Endpoint
            </span>
            <a href="https://nominatim.org/release-docs/develop/admin/Installation/" target="_blank" rel="noopener" class="api-key-link">
              Self-host guide
              <svg viewBox="0 0 24 24"><path d="M19 19H5V5h7V3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2v-7h-2v7zM14 3v2h3.59l-9.83 9.83 1.41 1.41L19 6.41V10h2V3h-7z"/></svg>
            </a>
          </div>
          <input type="text" class="api-key-input" data-key="nominatimEndpoint"
            placeholder="${DEFAULT_ENDPOINTS.nominatim}"
            value="${this.settings.nominatimEndpoint}" autocomplete="off"/>
          <p class="api-key-description">
            Address search and reverse geocoding. Public instance is rate-limited (1 req/sec).
            Self-host for higher throughput.
          </p>
        </div>
      </div>

      <div class="settings-section">
        <div class="settings-section-title">POI Search (Overpass)</div>

        <div class="api-key-item">
          <div class="api-key-label">
            <span class="api-key-name">
              <span class="status-dot ${this.settings.overpassEndpoint !== DEFAULT_ENDPOINTS.overpass ? 'configured' : ''}"></span>
              Overpass Endpoint
            </span>
            <a href="https://wiki.openstreetmap.org/wiki/Overpass_API" target="_blank" rel="noopener" class="api-key-link">
              API documentation
              <svg viewBox="0 0 24 24"><path d="M19 19H5V5h7V3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2v-7h-2v7zM14 3v2h3.59l-9.83 9.83 1.41 1.41L19 6.41V10h2V3h-7z"/></svg>
            </a>
          </div>
          <input type="text" class="api-key-input" data-key="overpassEndpoint"
            placeholder="${DEFAULT_ENDPOINTS.overpass}"
            value="${this.settings.overpassEndpoint}" autocomplete="off"/>
          <p class="api-key-description">
            Query OpenStreetMap for POIs (restaurants, hospitals, parks, etc.). No API key required.
            Used by <code>searchPOI</code> and <code>findAndShow</code>.
          </p>
        </div>
      </div>

      <div class="endpoint-note">
        <strong>Note:</strong> All mapping services use OpenStreetMap data and are free to use.
        Self-hosting is recommended for production applications.
      </div>
    `;
  }

  private renderCesiumTab(): string {
    return `
      <div class="settings-section">
        <div class="settings-section-title">Cesium Ion</div>

        <div class="api-key-item">
          <div class="api-key-label">
            <span class="api-key-name">
              <span class="status-dot ${this.settings.cesiumIon ? 'configured' : ''}"></span>
              Cesium Ion Access Token
            </span>
            <a href="https://ion.cesium.com/tokens" target="_blank" rel="noopener" class="api-key-link">
              Get access token
              <svg viewBox="0 0 24 24"><path d="M19 19H5V5h7V3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2v-7h-2v7zM14 3v2h3.59l-9.83 9.83 1.41 1.41L19 6.41V10h2V3h-7z"/></svg>
            </a>
          </div>
          <input type="password" class="api-key-input" data-key="cesiumIon"
            placeholder="Enter your Cesium Ion access token"
            value="${this.settings.cesiumIon}" autocomplete="off"/>
          <p class="api-key-description">
            Required for Cesium Ion assets: 3D Tiles, terrain, imagery.
            Free tier includes Bing Maps imagery and world terrain.
          </p>
        </div>

        <div class="endpoint-note">
          <strong>Features enabled with Cesium Ion:</strong>
          <ul style="margin: 8px 0 0 16px; color: #9ca3af;">
            <li>High-resolution terrain</li>
            <li>Bing Maps aerial imagery</li>
            <li>3D buildings (Google Photorealistic Tiles)</li>
            <li>Custom asset hosting</li>
          </ul>
        </div>
      </div>
    `;
  }

  private attachEventListeners(): void {
    if (!this.panelElement) return;

    // Tab switching
    this.panelElement.querySelectorAll('.settings-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        this.activeTab = tab.getAttribute('data-tab') || 'routing';
        this.renderPanel();
      });
    });

    // Close button
    this.panelElement.querySelector('[data-action="close"]')?.addEventListener('click', () => this.close());

    // Cancel button
    this.panelElement.querySelector('[data-action="cancel"]')?.addEventListener('click', () => {
      this.settings = this.loadSettings(); // Revert changes
      this.close();
    });

    // Save button
    this.panelElement.querySelector('[data-action="save"]')?.addEventListener('click', () => {
      this.collectInputValues();
      this.saveSettings();
      this.close();
    });

    // Update status dots on input change
    this.panelElement.querySelectorAll('.api-key-input').forEach(input => {
      input.addEventListener('input', (e) => {
        const target = e.target as HTMLInputElement;
        const key = target.getAttribute('data-key') as keyof APIKeyConfig;
        if (key) {
          this.settings[key] = target.value;
          const statusDot = target.closest('.api-key-item')?.querySelector('.status-dot');
          if (statusDot) {
            const hasValue = !!target.value.trim();
            const isEndpoint = key.endsWith('Endpoint');
            const isDefault = isEndpoint && target.value === DEFAULT_ENDPOINTS[key.replace('Endpoint', '') as keyof typeof DEFAULT_ENDPOINTS];
            statusDot.classList.toggle('configured', hasValue && !isDefault);
          }
        }
      });
    });

    // Handle Escape key
    const escHandler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && this.isOpen) {
        this.close();
      }
    };
    document.addEventListener('keydown', escHandler);
  }

  private collectInputValues(): void {
    if (!this.panelElement) return;

    this.panelElement.querySelectorAll('.api-key-input').forEach(input => {
      const el = input as HTMLInputElement;
      const key = el.getAttribute('data-key') as keyof APIKeyConfig;
      if (key) {
        this.settings[key] = el.value.trim();
      }
    });
  }

  public toggle(): void {
    if (this.isOpen) {
      this.close();
    } else {
      this.open();
    }
  }

  public open(): void {
    this.isOpen = true;
    this.settings = this.loadSettings(); // Refresh from storage
    this.renderPanel();
    this.overlayElement?.classList.add('open');
    this.panelElement?.classList.add('open');

    // Focus the first input in the active tab
    setTimeout(() => {
      const firstInput = this.panelElement?.querySelector('.settings-content input') as HTMLInputElement;
      firstInput?.focus();
    }, 100);
  }

  public close(): void {
    this.isOpen = false;
    this.overlayElement?.classList.remove('open');
    this.panelElement?.classList.remove('open');
  }
}

// Singleton instance
let settingsInstance: SettingsPanel | null = null;

export function initSettingsPanel(config: SettingsPanelConfig = {}): SettingsPanel {
  if (!settingsInstance) {
    settingsInstance = new SettingsPanel(config);
  }
  return settingsInstance;
}

export function getSettingsPanel(): SettingsPanel | null {
  return settingsInstance;
}

export function getApiKey(service: keyof APIKeyConfig): string {
  return settingsInstance?.getApiKey(service) || '';
}
