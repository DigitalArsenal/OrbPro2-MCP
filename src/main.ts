/**
 * Cesium SLM - Entry Point
 * Browser-based Small Language Model for CesiumJS Control
 */

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

    console.log('Cesium SLM initialized successfully');

    // Expose app to window for debugging
    (window as unknown as { cesiumSLM: CesiumSLMApp }).cesiumSLM = app;

  } catch (error) {
    console.error('Failed to initialize Cesium SLM:', error);

    const errorContainer = document.getElementById('error-container');
    if (errorContainer) {
      errorContainer.style.display = 'block';
      errorContainer.innerHTML = `
        <div class="error-message">
          <h2>Initialization Error</h2>
          <p>${error instanceof Error ? error.message : 'Unknown error'}</p>
          <p>Please ensure:</p>
          <ul>
            <li>You're using a WebGPU-compatible browser (Chrome 113+ or Edge 113+)</li>
            <li>WebGPU is enabled in your browser settings</li>
            <li>Your GPU supports WebGPU</li>
          </ul>
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
