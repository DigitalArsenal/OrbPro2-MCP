/**
 * Status Display Component
 * Shows loading progress, model status, and WebGPU information
 */

export interface StatusInfo {
  webgpu: {
    supported: boolean;
    adapter?: string;
    error?: string;
  };
  model: {
    loaded: boolean;
    loading: boolean;
    progress: number;
    name?: string;
    error?: string;
  };
  cesium: {
    ready: boolean;
    error?: string;
  };
}

export class StatusDisplay {
  private container: HTMLElement;
  private status: StatusInfo;
  private onModelReset?: () => void;

  constructor(containerId: string, options?: { onModelReset?: () => void }) {
    const container = document.getElementById(containerId);
    if (!container) {
      throw new Error(`Container element '${containerId}' not found`);
    }

    this.container = container;
    this.onModelReset = options?.onModelReset;
    this.status = {
      webgpu: { supported: false },
      model: { loaded: false, loading: false, progress: 0 },
      cesium: { ready: false },
    };

    this.injectStyles();
    this.render();
  }

  updateWebGPU(info: StatusInfo['webgpu']): void {
    this.status.webgpu = info;
    this.render();
  }

  updateModel(info: Partial<StatusInfo['model']>): void {
    this.status.model = { ...this.status.model, ...info };
    this.render();
  }

  updateCesium(info: StatusInfo['cesium']): void {
    this.status.cesium = info;
    this.render();
  }

  private render(): void {
    const { webgpu, model, cesium } = this.status;

    let html = '<div class="status-display">';

    // WebGPU Status
    html += `
      <div class="status-item ${webgpu.supported ? 'status-ok' : 'status-error'}">
        <span class="status-icon">${webgpu.supported ? '✓' : '✗'}</span>
        <span class="status-label">WebGPU</span>
        <span class="status-detail">${webgpu.supported ? 'Supported' : webgpu.error || 'Not supported'}</span>
      </div>
    `;

    // Model Status
    if (model.loading) {
      html += `
        <div class="status-item status-loading">
          <span class="status-icon">⟳</span>
          <span class="status-label">Model</span>
          <span class="status-detail">
            Loading ${model.name || 'model'}...
            <div class="progress-bar">
              <div class="progress-fill" style="width: ${model.progress * 100}%"></div>
            </div>
            <span class="progress-text">${Math.round(model.progress * 100)}%</span>
          </span>
        </div>
      `;
    } else if (model.loaded) {
      html += `
        <div class="status-item status-ok">
          <span class="status-icon">✓</span>
          <span class="status-label">Model</span>
          <span class="status-detail">${model.name || 'Loaded'}</span>
          <button class="status-reset-btn" id="status-model-reset" title="Change model">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/>
            </svg>
          </button>
        </div>
      `;
    } else if (model.error) {
      html += `
        <div class="status-item status-error">
          <span class="status-icon">✗</span>
          <span class="status-label">Model</span>
          <span class="status-detail">${model.error}</span>
        </div>
      `;
    } else {
      html += `
        <div class="status-item status-pending">
          <span class="status-icon">○</span>
          <span class="status-label">Model</span>
          <span class="status-detail">Not loaded</span>
        </div>
      `;
    }

    // CesiumJS Status
    html += `
      <div class="status-item ${cesium.ready ? 'status-ok' : cesium.error ? 'status-error' : 'status-pending'}">
        <span class="status-icon">${cesium.ready ? '✓' : cesium.error ? '✗' : '○'}</span>
        <span class="status-label">CesiumJS</span>
        <span class="status-detail">${cesium.ready ? 'Ready' : cesium.error || 'Initializing...'}</span>
      </div>
    `;

    html += '</div>';

    this.container.innerHTML = html;

    // Attach reset button listener
    const resetBtn = this.container.querySelector('#status-model-reset');
    if (resetBtn && this.onModelReset) {
      resetBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.onModelReset?.();
      });
    }
  }

  hide(): void {
    this.container.style.display = 'none';
  }

  show(): void {
    this.container.style.display = 'block';
  }

  private injectStyles(): void {
    if (document.getElementById('status-display-styles')) {
      return;
    }

    const style = document.createElement('style');
    style.id = 'status-display-styles';
    style.textContent = `
      .status-display {
        display: flex;
        flex-direction: column;
        gap: 12px;
        padding: 16px;
        background: #1a1a2e;
        border-radius: 8px;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      }

      .status-item {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 8px 12px;
        border-radius: 6px;
        background: #2d2d4a;
      }

      .status-icon {
        width: 20px;
        text-align: center;
        font-size: 14px;
      }

      .status-label {
        font-weight: 600;
        min-width: 80px;
        color: #aaa;
      }

      .status-detail {
        flex: 1;
        color: #e0e0e0;
        font-size: 14px;
      }

      .status-ok .status-icon { color: #4ade80; }
      .status-error .status-icon { color: #f87171; }
      .status-loading .status-icon {
        color: #60a5fa;
        animation: spin 1s linear infinite;
      }
      .status-pending .status-icon { color: #9ca3af; }

      @keyframes spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
      }

      .progress-bar {
        width: 100%;
        height: 6px;
        background: #1a1a2e;
        border-radius: 3px;
        overflow: hidden;
        margin-top: 6px;
      }

      .progress-fill {
        height: 100%;
        background: linear-gradient(90deg, #60a5fa, #818cf8);
        border-radius: 3px;
        transition: width 0.3s ease;
      }

      .progress-text {
        font-size: 12px;
        color: #9ca3af;
        margin-top: 4px;
        display: inline-block;
      }

      .status-reset-btn {
        background: none;
        border: 1px solid #4a4a6a;
        border-radius: 4px;
        color: #9ca3af;
        cursor: pointer;
        padding: 4px 6px;
        display: flex;
        align-items: center;
        transition: all 0.2s;
        flex-shrink: 0;
      }

      .status-reset-btn:hover {
        color: #f87171;
        border-color: #f87171;
        background: rgba(248, 113, 113, 0.1);
      }
    `;

    document.head.appendChild(style);
  }
}
