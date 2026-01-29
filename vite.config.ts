import { defineConfig } from 'vite';
import wasm from 'vite-plugin-wasm';

export default defineConfig({
  plugins: [wasm()],
  resolve: {
    // Follow symlinks in public/models
    preserveSymlinks: false,
  },
  build: {
    target: 'esnext',
    outDir: 'dist',
  },
  optimizeDeps: {
    exclude: ['@mlc-ai/web-llm'],
    // Exclude packages directory (contains emsdk)
    entries: ['src/**/*.ts', 'src/**/*.tsx', '!packages/**'],
  },
  define: {
    CESIUM_BASE_URL: JSON.stringify('/Cesium'),
  },
  server: {
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'credentialless',
      'Cross-Origin-Resource-Policy': 'cross-origin',
    },
    fs: {
      // Allow serving files from symlinked model directory
      allow: ['.', 'mlc-models'],
      strict: false,
    },
    watch: {
      // Ignore packages directory (contains emsdk, build artifacts)
      ignored: ['**/packages/**', '**/node_modules/**'],
    },
    proxy: {
      // OpenRouteService API proxy
      '/api/ors': {
        target: 'https://api.openrouteservice.org',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/ors/, ''),
        secure: true,
      },
      // Overpass API proxy (OpenStreetMap POI search)
      '/api/overpass': {
        target: 'https://overpass-api.de',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/overpass/, ''),
        secure: true,
      },
      // Nominatim geocoding proxy
      '/api/nominatim': {
        target: 'https://nominatim.openstreetmap.org',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/nominatim/, ''),
        secure: true,
        headers: {
          'User-Agent': 'OrbPro2-MCP/1.0 (https://github.com/example/orbpro2-mcp)',
        },
      },
      // OSRM local routing proxy (self-hosted, port 5050 to avoid macOS AirPlay)
      '/api/osrm': {
        target: 'http://localhost:5050',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/osrm/, ''),
      },
    },
  },
});
