/**
 * OrbPro2 MCP - Entry Point
 * Browser-based Small Language Model for CesiumJS Control
 */

// DEBUG: Intercept ALL fetch requests to diagnose web-llm loading issues
const originalFetch = window.fetch.bind(window);
window.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
  const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
  const isOllama = url.includes('localhost:11434');
  if (!isOllama) console.log(`[FETCH] >>> ${url}`);
  try {
    const response = await originalFetch(input, init);
    const contentType = response.headers.get('content-type') || 'unknown';
    console.log(`[FETCH] <<< ${response.status} ${response.statusText} [${contentType}] ${url}`);
    // Clone to check if it's HTML when expecting JSON
    if (url.endsWith('.json') && contentType.includes('html')) {
      console.error(`[FETCH] ERROR: Got HTML for JSON request: ${url}`);
    }
    return response;
  } catch (error) {
    // Don't log expected failures (e.g. Ollama not running)
    if (!isOllama) {
      console.error(`[FETCH] FAILED: ${url}`, error);
    }
    throw error;
  }
};

import { CesiumSLMApp } from './app';

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', async () => {
  const app = new CesiumSLMApp();

  try {
    await app.initialize({
      cesiumContainer: 'cesium-container',
      chatContainer: 'chat-container',
      statusContainer: 'status-container',
      modelSelectorContainer: 'model-selector-container',
      // You can set your Cesium Ion token here or via environment variable
      cesiumToken: import.meta.env.VITE_CESIUM_TOKEN || undefined,
    });

    console.log('OrbPro2 MCP initialized successfully');

    // Expose app to window for debugging
    (window as unknown as { cesiumSLM: CesiumSLMApp }).cesiumSLM = app;

  } catch (error) {
    console.error('Failed to initialize OrbPro2 MCP:', error);
    // Log full stack trace for debugging
    if (error instanceof Error && error.stack) {
      console.error('Stack trace:', error.stack);
    }

    const errorContainer = document.getElementById('error-container');
    if (errorContainer) {
      errorContainer.style.display = 'block';
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error && error.stack ? error.stack : '';

      errorContainer.innerHTML = `
        <div class="error-message">
          <h2>Initialization Error</h2>
          <p>${errorMessage}</p>
          <p>Please ensure:</p>
          <ul>
            <li>You're using a WebGPU-compatible browser (Chrome 113+ or Edge 113+)</li>
            <li>WebGPU is enabled in your browser settings</li>
            <li>Your GPU supports WebGPU</li>
            <li>Check the browser console (F12) for more details</li>
          </ul>
          ${errorStack ? `<details style="margin-top: 16px; color: #9ca3af; font-size: 12px;"><summary>Technical details</summary><pre style="white-space: pre-wrap; margin-top: 8px;">${errorStack}</pre></details>` : ''}
        </div>
      `;
    }
  }
});

// Handle cleanup on page unload
window.addEventListener('beforeunload', () => {
  const app = (window as unknown as { cesiumSLM?: CesiumSLMApp }).cesiumSLM;
  if (app) {
    app.destroy();
  }
});
