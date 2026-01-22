# Cesium SLM Deployment Guide

This comprehensive guide covers everything you need to deploy the Cesium SLM (Small Language Model) application, from local development to production hosting on various platforms.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Environment Variables](#environment-variables)
3. [Local Development](#local-development)
4. [Vercel Deployment](#vercel-deployment)
5. [Netlify Deployment](#netlify-deployment)
6. [Docker Deployment](#docker-deployment)
7. [GitHub Pages Deployment](#github-pages-deployment)
8. [Model Caching Strategies](#model-caching-strategies)
9. [Performance Optimization](#performance-optimization)
10. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Node.js Version Requirements

Cesium SLM requires **Node.js 18.0.0 or later**. This is specified in the `engines` field of `package.json`.

To check your current Node.js version:

```bash
node --version
```

We recommend using a Node version manager for easy version switching:

```bash
# Using nvm (Node Version Manager)
nvm install 18
nvm use 18

# Using fnm (Fast Node Manager)
fnm install 18
fnm use 18
```

### Browser Compatibility (WebGPU Requirements)

Cesium SLM uses WebGPU to run AI models directly in the browser. WebGPU is a modern graphics and compute API that provides significant performance benefits over WebGL.

**Supported Browsers:**

| Browser | Minimum Version | Notes |
|---------|----------------|-------|
| Google Chrome | 113+ | Full support |
| Microsoft Edge | 113+ | Full support |
| Chrome Canary | Latest | For testing new features |
| Firefox | Nightly | Behind flag, experimental |
| Safari | 17+ | macOS Sonoma+, limited support |

**Checking WebGPU Support:**

You can test WebGPU support by opening your browser console and running:

```javascript
if (navigator.gpu) {
  console.log('WebGPU is supported!');
  const adapter = await navigator.gpu.requestAdapter();
  console.log('Adapter:', adapter);
} else {
  console.log('WebGPU is NOT supported');
}
```

**Enabling WebGPU (if needed):**

- **Chrome/Edge**: Usually enabled by default. If not, go to `chrome://flags` or `edge://flags` and enable "Unsafe WebGPU"
- **Firefox**: Go to `about:config` and set `dom.webgpu.enabled` to `true`

### Cesium Ion Account Setup

Cesium Ion provides access to global 3D geospatial data including terrain, imagery, and 3D tiles.

1. **Create a Cesium Ion Account:**
   - Visit [https://cesium.com/ion/](https://cesium.com/ion/)
   - Click "Sign Up" and create a free account

2. **Generate an Access Token:**
   - Log in to your Cesium Ion dashboard
   - Navigate to "Access Tokens" in the left sidebar
   - Click "Create Token"
   - Give your token a descriptive name (e.g., "Cesium SLM Production")
   - Select the appropriate scopes (at minimum, select "assets:read")
   - Copy the generated token

3. **Token Security:**
   - Never commit your token to version control
   - Use environment variables for token management
   - Consider creating separate tokens for development and production

---

## Environment Variables

### VITE_CESIUM_TOKEN

This is the primary environment variable for authenticating with Cesium Ion services.

**How to Get Your Token:**

1. Log in to [Cesium Ion](https://cesium.com/ion/)
2. Go to Access Tokens
3. Create a new token with "assets:read" scope
4. Copy the token value

**Setting the Token Locally:**

Create a `.env.local` file in your project root (this file is gitignored):

```bash
# .env.local
VITE_CESIUM_TOKEN=your_cesium_ion_token_here
```

**For Production Deployments:**

Set the environment variable in your hosting platform's dashboard (see platform-specific sections below).

### Other Configuration Options

While `VITE_CESIUM_TOKEN` is the primary configuration, you can extend the Vite configuration for additional options:

```typescript
// vite.config.ts additions
export default defineConfig({
  define: {
    CESIUM_BASE_URL: JSON.stringify('/cesium'),
    // Add custom configuration
    __APP_VERSION__: JSON.stringify(process.env.npm_package_version),
  },
});
```

---

## Local Development

### Installation

Clone the repository and install dependencies:

```bash
# Clone the repository
git clone https://github.com/your-username/cesium-slm.git
cd cesium-slm

# Install dependencies
npm install
```

### Development Server

Start the development server with hot module replacement:

```bash
npm run dev
```

This will:
- Start Vite's development server
- Enable hot module replacement (HMR)
- Set up the required CORS headers for WebGPU
- Serve the application at `http://localhost:5173` (default)

**Important:** The development server configures special headers required for WebGPU:

```typescript
// These headers are automatically set by vite.config.ts
server: {
  headers: {
    'Cross-Origin-Opener-Policy': 'same-origin',
    'Cross-Origin-Embedder-Policy': 'require-corp',
  },
}
```

### Production Build

Create an optimized production build:

```bash
npm run build
```

This will:
- Run TypeScript compilation (`tsc`)
- Bundle and optimize the application with Vite
- Output files to the `dist/` directory

**Build Output Structure:**

```
dist/
  index.html
  assets/
    index-[hash].js
    index-[hash].css
  cesium/
    (Cesium assets)
```

### Preview Production Build

Test the production build locally:

```bash
npm run preview
```

This serves the `dist/` folder with a local static file server, allowing you to verify the production build works correctly before deploying.

### Running Tests

```bash
npm run test
```

### Linting

```bash
npm run lint
```

---

## Vercel Deployment

Vercel is an excellent choice for deploying Cesium SLM due to its seamless integration with Vite and automatic HTTPS.

### Step-by-Step Guide

1. **Install Vercel CLI (optional but recommended):**

   ```bash
   npm install -g vercel
   ```

2. **Connect Your Repository:**
   - Go to [vercel.com](https://vercel.com) and sign in
   - Click "Add New" > "Project"
   - Import your Git repository
   - Vercel will auto-detect the Vite framework

3. **Configure Build Settings:**
   - Framework Preset: `Vite`
   - Build Command: `npm run build`
   - Output Directory: `dist`
   - Install Command: `npm install`

4. **Set Environment Variables:**
   - Go to Project Settings > Environment Variables
   - Add `VITE_CESIUM_TOKEN` with your Cesium Ion token
   - Select which environments to apply it to (Production, Preview, Development)

5. **Deploy:**
   - Click "Deploy"
   - Vercel will build and deploy your application

### vercel.json Configuration

Create a `vercel.json` file in your project root:

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "framework": "vite",
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "Cross-Origin-Opener-Policy",
          "value": "same-origin"
        },
        {
          "key": "Cross-Origin-Embedder-Policy",
          "value": "require-corp"
        }
      ]
    },
    {
      "source": "/assets/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=31536000, immutable"
        }
      ]
    }
  ],
  "rewrites": [
    {
      "source": "/((?!assets|cesium).*)",
      "destination": "/index.html"
    }
  ]
}
```

### Environment Variables Setup

In the Vercel dashboard:

1. Go to your project > Settings > Environment Variables
2. Add the following:

| Variable | Value | Environments |
|----------|-------|--------------|
| `VITE_CESIUM_TOKEN` | Your Cesium Ion token | Production, Preview |

### CLI Deployment

Deploy directly from the command line:

```bash
# Login to Vercel
vercel login

# Deploy to preview
vercel

# Deploy to production
vercel --prod
```

---

## Netlify Deployment

Netlify provides excellent static site hosting with built-in CI/CD.

### Step-by-Step Guide

1. **Connect Your Repository:**
   - Log in to [netlify.com](https://netlify.com)
   - Click "Add new site" > "Import an existing project"
   - Connect your Git provider and select your repository

2. **Configure Build Settings:**
   - Build command: `npm run build`
   - Publish directory: `dist`
   - Node version: 18 (set in environment variables)

3. **Deploy:**
   - Click "Deploy site"
   - Netlify will build and deploy automatically

### netlify.toml Configuration

Create a `netlify.toml` file in your project root:

```toml
[build]
  command = "npm run build"
  publish = "dist"

[build.environment]
  NODE_VERSION = "18"

# Required headers for WebGPU
[[headers]]
  for = "/*"
  [headers.values]
    Cross-Origin-Opener-Policy = "same-origin"
    Cross-Origin-Embedder-Policy = "require-corp"

# Cache static assets
[[headers]]
  for = "/assets/*"
  [headers.values]
    Cache-Control = "public, max-age=31536000, immutable"

# Cache Cesium assets
[[headers]]
  for = "/cesium/*"
  [headers.values]
    Cache-Control = "public, max-age=86400"

# SPA fallback
[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
  conditions = {Role = ["admin", "editor", "visitor"]}

# Handle SPA routing
[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

### Build Settings

In the Netlify dashboard under "Site settings" > "Build & deploy":

| Setting | Value |
|---------|-------|
| Base directory | (leave blank) |
| Build command | `npm run build` |
| Publish directory | `dist` |
| Node version | 18 |

### Environment Variables

In the Netlify dashboard under "Site settings" > "Environment variables":

1. Click "Add a variable"
2. Add `VITE_CESIUM_TOKEN` with your Cesium Ion token
3. Set the scope to "All scopes" or specific deployments

---

## Docker Deployment

Docker allows you to containerize the application for consistent deployments across any environment.

### Dockerfile

Create a `Dockerfile` in your project root:

```dockerfile
# Build stage
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build argument for Cesium token
ARG VITE_CESIUM_TOKEN
ENV VITE_CESIUM_TOKEN=$VITE_CESIUM_TOKEN

# Build the application
RUN npm run build

# Production stage
FROM nginx:alpine

# Copy custom nginx configuration
COPY nginx.conf /etc/nginx/nginx.conf

# Copy built assets from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Expose port 80
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost/ || exit 1

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
```

### docker-compose.yml

Create a `docker-compose.yml` file:

```yaml
version: '3.8'

services:
  cesium-slm:
    build:
      context: .
      args:
        VITE_CESIUM_TOKEN: ${VITE_CESIUM_TOKEN}
    ports:
      - "8080:80"
    environment:
      - NODE_ENV=production
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "wget", "--no-verbose", "--tries=1", "--spider", "http://localhost/"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 10s

  # Optional: Add a reverse proxy for HTTPS
  # nginx-proxy:
  #   image: jwilder/nginx-proxy
  #   ports:
  #     - "443:443"
  #   volumes:
  #     - /var/run/docker.sock:/tmp/docker.sock:ro
  #     - ./certs:/etc/nginx/certs
```

### Nginx Configuration

Create an `nginx.conf` file:

```nginx
worker_processes auto;
error_log /var/log/nginx/error.log warn;
pid /var/run/nginx.pid;

events {
    worker_connections 1024;
    use epoll;
    multi_accept on;
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;

    log_format main '$remote_addr - $remote_user [$time_local] "$request" '
                    '$status $body_bytes_sent "$http_referer" '
                    '"$http_user_agent" "$http_x_forwarded_for"';

    access_log /var/log/nginx/access.log main;

    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;
    keepalive_timeout 65;
    types_hash_max_size 2048;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types text/plain text/css text/xml application/json application/javascript
               application/xml application/xml+rss text/javascript application/wasm;

    server {
        listen 80;
        server_name localhost;
        root /usr/share/nginx/html;
        index index.html;

        # Security headers
        add_header X-Frame-Options "SAMEORIGIN" always;
        add_header X-Content-Type-Options "nosniff" always;
        add_header X-XSS-Protection "1; mode=block" always;

        # Required headers for WebGPU and SharedArrayBuffer
        add_header Cross-Origin-Opener-Policy "same-origin" always;
        add_header Cross-Origin-Embedder-Policy "require-corp" always;

        # Cache static assets
        location /assets/ {
            expires 1y;
            add_header Cache-Control "public, max-age=31536000, immutable";
            add_header Cross-Origin-Opener-Policy "same-origin" always;
            add_header Cross-Origin-Embedder-Policy "require-corp" always;
        }

        # Cache Cesium assets
        location /cesium/ {
            expires 1d;
            add_header Cache-Control "public, max-age=86400";
            add_header Cross-Origin-Opener-Policy "same-origin" always;
            add_header Cross-Origin-Embedder-Policy "require-corp" always;
        }

        # WebAssembly files
        location ~* \.wasm$ {
            add_header Content-Type application/wasm;
            add_header Cross-Origin-Opener-Policy "same-origin" always;
            add_header Cross-Origin-Embedder-Policy "require-corp" always;
        }

        # SPA fallback - serve index.html for all routes
        location / {
            try_files $uri $uri/ /index.html;
        }

        # Health check endpoint
        location /health {
            access_log off;
            return 200 "healthy\n";
            add_header Content-Type text/plain;
        }
    }
}
```

### Build and Run Instructions

**Build the Docker image:**

```bash
# Set your Cesium token as an environment variable
export VITE_CESIUM_TOKEN=your_cesium_ion_token_here

# Build with docker-compose
docker-compose build

# Or build directly with Docker
docker build --build-arg VITE_CESIUM_TOKEN=$VITE_CESIUM_TOKEN -t cesium-slm .
```

**Run the container:**

```bash
# Using docker-compose
docker-compose up -d

# Or using Docker directly
docker run -d -p 8080:80 --name cesium-slm cesium-slm
```

**Access the application:**

Open your browser and navigate to `http://localhost:8080`

**View logs:**

```bash
# Using docker-compose
docker-compose logs -f

# Using Docker directly
docker logs -f cesium-slm
```

**Stop the container:**

```bash
# Using docker-compose
docker-compose down

# Using Docker directly
docker stop cesium-slm && docker rm cesium-slm
```

---

## GitHub Pages Deployment

GitHub Pages is a free option for hosting static sites directly from a GitHub repository.

### Build Configuration

Update your `vite.config.ts` for GitHub Pages:

```typescript
import { defineConfig } from 'vite';
import wasm from 'vite-plugin-wasm';

export default defineConfig({
  plugins: [wasm()],
  // Set base path to your repository name for GitHub Pages
  base: process.env.GITHUB_PAGES ? '/your-repo-name/' : '/',
  build: {
    target: 'esnext',
    outDir: 'dist',
  },
  optimizeDeps: {
    exclude: ['@mlc-ai/web-llm'],
  },
  define: {
    CESIUM_BASE_URL: JSON.stringify(
      process.env.GITHUB_PAGES ? '/your-repo-name/cesium' : '/cesium'
    ),
  },
  server: {
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
    },
  },
});
```

### GitHub Actions Workflow

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches:
      - main
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: "pages"
  cancel-in-progress: true

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Build
        run: npm run build
        env:
          GITHUB_PAGES: true
          VITE_CESIUM_TOKEN: ${{ secrets.VITE_CESIUM_TOKEN }}

      - name: Setup Pages
        uses: actions/configure-pages@v4

      - name: Upload artifact
        uses: actions/upload-pages-artifact@v3
        with:
          path: './dist'

  deploy:
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    runs-on: ubuntu-latest
    needs: build
    steps:
      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4
```

### Setting Up GitHub Pages

1. **Add Repository Secret:**
   - Go to your repository > Settings > Secrets and variables > Actions
   - Click "New repository secret"
   - Name: `VITE_CESIUM_TOKEN`
   - Value: Your Cesium Ion token

2. **Enable GitHub Pages:**
   - Go to Settings > Pages
   - Source: Select "GitHub Actions"

3. **Trigger Deployment:**
   - Push to the `main` branch, or
   - Go to Actions > "Deploy to GitHub Pages" > "Run workflow"

### Important Note on WebGPU Headers

GitHub Pages does not allow custom HTTP headers, which means the required COOP/COEP headers for WebGPU cannot be set. As a workaround, you can use a service worker to inject these headers:

Create `public/coi-serviceworker.js`:

```javascript
// This service worker provides COOP/COEP headers for cross-origin isolation
// Required for WebGPU and SharedArrayBuffer

if (typeof window === 'undefined') {
  self.addEventListener('install', () => self.skipWaiting());
  self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));

  self.addEventListener('fetch', (e) => {
    if (e.request.cache === 'only-if-cached' && e.request.mode !== 'same-origin') {
      return;
    }

    e.respondWith(
      fetch(e.request)
        .then((res) => {
          if (res.status === 0) {
            return res;
          }

          const newHeaders = new Headers(res.headers);
          newHeaders.set('Cross-Origin-Embedder-Policy', 'require-corp');
          newHeaders.set('Cross-Origin-Opener-Policy', 'same-origin');

          return new Response(res.body, {
            status: res.status,
            statusText: res.statusText,
            headers: newHeaders,
          });
        })
        .catch((err) => console.error(err))
    );
  });
} else {
  (() => {
    const reloadedByCOI = window.sessionStorage.getItem('coiReloadedByCOI');
    window.sessionStorage.removeItem('coiReloadedByCOI');

    const coiNotEnabled = !window.crossOriginIsolated;

    if (coiNotEnabled && !reloadedByCOI) {
      window.sessionStorage.setItem('coiReloadedByCOI', 'true');

      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register(window.document.currentScript.src).then(
          (registration) => {
            console.log('COOP/COEP Service Worker registered', registration.scope);
            window.location.reload();
          },
          (err) => {
            console.error('COOP/COEP Service Worker failed to register', err);
          }
        );
      }
    }
  })();
}
```

Add to your `index.html`:

```html
<script src="/coi-serviceworker.js"></script>
```

---

## Model Caching Strategies

The SLM models used by Cesium SLM can be large (hundreds of MB to several GB). Effective caching is crucial for performance.

### Browser Cache Settings

WebLLM automatically caches downloaded models in IndexedDB. Configure cache behavior:

```typescript
// In your application initialization
const engine = await webllm.CreateMLCEngine(modelId, {
  initProgressCallback: (progress) => {
    console.log(`Loading: ${progress.text} (${(progress.progress * 100).toFixed(1)}%)`);
  },
  // Models are cached in IndexedDB automatically
});
```

### Service Worker Considerations

For advanced caching control, implement a service worker:

```javascript
// sw.js - Service Worker for model caching
const CACHE_NAME = 'cesium-slm-v1';
const MODEL_CACHE_NAME = 'cesium-slm-models-v1';

// Assets to precache
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/assets/index.js',
  '/assets/index.css',
];

// Model file patterns to cache
const MODEL_PATTERNS = [
  /\.wasm$/,
  /\.bin$/,
  /mlc-chat-config\.json$/,
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS);
    })
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Check if this is a model file
  const isModelFile = MODEL_PATTERNS.some((pattern) => pattern.test(url.pathname));

  if (isModelFile) {
    // Use cache-first strategy for model files
    event.respondWith(
      caches.open(MODEL_CACHE_NAME).then((cache) => {
        return cache.match(event.request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }

          return fetch(event.request).then((networkResponse) => {
            // Clone the response before caching
            cache.put(event.request, networkResponse.clone());
            return networkResponse;
          });
        });
      })
    );
  } else {
    // Use network-first strategy for other requests
    event.respondWith(
      fetch(event.request).catch(() => {
        return caches.match(event.request);
      })
    );
  }
});
```

### Model Preloading Options

Preload models during idle time:

```typescript
// Preload a model in the background
async function preloadModel(modelId: string): Promise<void> {
  // Check if the model is already cached
  const webllm = await import('@mlc-ai/web-llm');

  // Request idle callback for non-blocking preload
  if ('requestIdleCallback' in window) {
    window.requestIdleCallback(async () => {
      try {
        const engine = await webllm.CreateMLCEngine(modelId, {
          initProgressCallback: (progress) => {
            console.log(`Preloading ${modelId}: ${(progress.progress * 100).toFixed(1)}%`);
          },
        });

        // Unload after caching to free memory
        await engine.unload();
        console.log(`Model ${modelId} preloaded and cached`);
      } catch (error) {
        console.error(`Failed to preload model ${modelId}:`, error);
      }
    }, { timeout: 10000 });
  }
}

// Usage: preload when user is likely to need the model
preloadModel('Qwen2.5-1.5B-Instruct-q4f16_1-MLC');
```

### Offline Support Considerations

For offline support, consider:

1. **Cache Cesium Assets:**
   - Cesium tiles can be cached for offline use
   - Use Cesium's offline asset packing tools for terrain and imagery

2. **IndexedDB Storage Limits:**
   - Browsers have storage limits (typically 50% of available disk space)
   - Implement storage quota management

3. **Progressive Enhancement:**
   ```typescript
   // Check if model is cached before showing offline features
   async function isModelCached(modelId: string): Promise<boolean> {
     try {
       const db = await openDatabase('webllm-cache');
       const modelInfo = await db.get('models', modelId);
       return !!modelInfo;
     } catch {
       return false;
     }
   }
   ```

---

## Performance Optimization

### Code Splitting Recommendations

Vite automatically code-splits your application. Enhance it with:

```typescript
// vite.config.ts
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Separate Cesium into its own chunk
          cesium: ['cesium'],
          // UI components in their own chunk
          ui: [
            './src/ui/chat-interface.ts',
            './src/ui/model-selector.ts',
            './src/ui/status-display.ts',
          ],
          // MCP/LLM logic separate
          llm: [
            './src/llm/web-llm-engine.ts',
            './src/llm/command-parser.ts',
          ],
        },
      },
    },
    // Increase chunk size warning limit for large dependencies
    chunkSizeWarningLimit: 1000,
  },
});
```

### Lazy Loading Models

Implement lazy loading for the LLM engine:

```typescript
// Lazy load the LLM engine only when needed
let llmEnginePromise: Promise<typeof import('@mlc-ai/web-llm')> | null = null;

async function getLLMEngine() {
  if (!llmEnginePromise) {
    llmEnginePromise = import('@mlc-ai/web-llm');
  }
  return llmEnginePromise;
}

// Use it when the user first interacts with the chat
async function initializeLLM(modelId: string) {
  const webllm = await getLLMEngine();
  const engine = await webllm.CreateMLCEngine(modelId, {
    // ... options
  });
  return engine;
}
```

### Asset Optimization

1. **Compress Static Assets:**
   ```typescript
   // vite.config.ts
   import viteCompression from 'vite-plugin-compression';

   export default defineConfig({
     plugins: [
       wasm(),
       viteCompression({
         algorithm: 'gzip',
         ext: '.gz',
       }),
       viteCompression({
         algorithm: 'brotliCompress',
         ext: '.br',
       }),
     ],
   });
   ```

2. **Optimize Images:**
   - Use WebP format for images
   - Implement responsive images with srcset

3. **Minimize Main Bundle:**
   - Use tree shaking (enabled by default in Vite)
   - Avoid importing entire libraries when only parts are needed

4. **Preload Critical Assets:**
   ```html
   <!-- In index.html -->
   <link rel="preload" href="/assets/index.js" as="script" crossorigin>
   <link rel="preconnect" href="https://cesium.com">
   <link rel="preconnect" href="https://huggingface.co">
   ```

---

## Troubleshooting

### Common WebGPU Issues

#### "WebGPU is not supported"

**Symptoms:** The application shows a WebGPU warning overlay.

**Solutions:**

1. **Update your browser:**
   - Chrome/Edge: Update to version 113 or later
   - Check `chrome://version` or `edge://version`

2. **Enable WebGPU flags:**
   - Navigate to `chrome://flags` or `edge://flags`
   - Search for "WebGPU"
   - Enable "Unsafe WebGPU" if available
   - Restart the browser

3. **Check GPU compatibility:**
   - WebGPU requires a compatible GPU
   - Integrated graphics may have limited support
   - Check `chrome://gpu` for WebGPU status

4. **Hardware acceleration:**
   - Ensure hardware acceleration is enabled
   - Settings > System > "Use hardware acceleration when available"

#### "Failed to get WebGPU adapter"

**Symptoms:** WebGPU is detected but fails to initialize.

**Solutions:**

1. **Update GPU drivers:**
   - NVIDIA: Download from nvidia.com/drivers
   - AMD: Download from amd.com/support
   - Intel: Download from intel.com/support

2. **Check for GPU blocklists:**
   - Some GPUs are blocklisted in browsers
   - Try `chrome://flags/#enable-unsafe-webgpu`

3. **Disable browser extensions:**
   - Some extensions interfere with WebGPU
   - Test in incognito mode

#### Model Loading Fails

**Symptoms:** Model download starts but fails to complete.

**Solutions:**

1. **Check network connection:**
   - Models are downloaded from HuggingFace
   - Ensure huggingface.co is accessible

2. **Clear IndexedDB:**
   ```javascript
   // In browser console
   indexedDB.deleteDatabase('webllm/model');
   indexedDB.deleteDatabase('webllm/wasm');
   ```

3. **Try a smaller model:**
   - Start with `Qwen2.5-0.5B-Instruct-q4f16_1-MLC`
   - Larger models require more memory

### CORS Configuration

If you encounter CORS errors, ensure your server sends the correct headers:

**Required Headers:**

```
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Embedder-Policy: require-corp
```

**For development with external resources:**

```typescript
// vite.config.ts
export default defineConfig({
  server: {
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'credentialless', // Use 'credentialless' if 'require-corp' causes issues
    },
    proxy: {
      // Proxy external resources if needed
      '/api': {
        target: 'https://external-api.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
});
```

**Cesium Ion CORS:**

Cesium Ion resources include proper CORS headers. If you're using custom tile servers, ensure they include:

```
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: GET, OPTIONS
Access-Control-Allow-Headers: Content-Type
```

### Memory Management

WebGPU and LLM inference can consume significant memory. Implement proper cleanup:

```typescript
// Clean up resources when switching models
async function switchModel(newModelId: string) {
  // Unload current model
  if (currentEngine) {
    await currentEngine.unload();
    currentEngine = null;
  }

  // Force garbage collection (if available)
  if (window.gc) {
    window.gc();
  }

  // Small delay to allow memory cleanup
  await new Promise((resolve) => setTimeout(resolve, 100));

  // Load new model
  currentEngine = await createEngine(newModelId);
}

// Monitor memory usage
function monitorMemory() {
  if ('memory' in performance) {
    const memory = (performance as any).memory;
    console.log(`Used JS Heap: ${(memory.usedJSHeapSize / 1024 / 1024).toFixed(2)} MB`);
    console.log(`Total JS Heap: ${(memory.totalJSHeapSize / 1024 / 1024).toFixed(2)} MB`);
  }
}

// Clean up on page unload
window.addEventListener('beforeunload', async () => {
  if (app) {
    await app.destroy();
  }
});
```

**Recommended Memory Limits by Model Size:**

| Model Size | Recommended RAM | Recommended VRAM |
|------------|-----------------|------------------|
| 0.5B | 4GB+ | 2GB+ |
| 1.5B | 8GB+ | 4GB+ |
| 3B | 16GB+ | 6GB+ |
| 7B | 32GB+ | 8GB+ |

### Debugging Tips

1. **Enable verbose logging:**
   ```typescript
   // Add to your initialization
   localStorage.setItem('debug', 'webllm:*');
   ```

2. **Check browser console:**
   - Look for WebGPU errors in the console
   - Check Network tab for failed model downloads

3. **Test in isolation:**
   - Create a minimal test page for WebGPU
   - Verify Cesium works independently

4. **Monitor GPU usage:**
   - Windows: Task Manager > Performance > GPU
   - macOS: Activity Monitor > Window > GPU History
   - Linux: `nvidia-smi` or `radeontop`

---

## Quick Reference

### Commands Cheat Sheet

```bash
# Development
npm install          # Install dependencies
npm run dev          # Start dev server
npm run build        # Production build
npm run preview      # Preview production build
npm run test         # Run tests
npm run lint         # Lint code

# Docker
docker-compose build  # Build container
docker-compose up -d  # Start container
docker-compose down   # Stop container
docker-compose logs   # View logs

# Vercel
vercel               # Deploy preview
vercel --prod        # Deploy production

# Netlify
netlify deploy       # Deploy draft
netlify deploy --prod # Deploy production
```

### Environment Variables Summary

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_CESIUM_TOKEN` | Yes | Cesium Ion access token |

### Ports Reference

| Service | Default Port |
|---------|--------------|
| Vite Dev Server | 5173 |
| Vite Preview | 4173 |
| Docker/Nginx | 8080 (mapped to 80) |

---

## Support

If you encounter issues not covered in this guide:

1. Check the [GitHub Issues](https://github.com/your-org/cesium-slm/issues) for similar problems
2. Review the [WebLLM documentation](https://webllm.mlc.ai/)
3. Check the [CesiumJS documentation](https://cesium.com/docs/)
4. Review [WebGPU compatibility](https://caniuse.com/webgpu)

For bug reports, please include:
- Browser version and OS
- GPU model and driver version
- Console error messages
- Steps to reproduce the issue
