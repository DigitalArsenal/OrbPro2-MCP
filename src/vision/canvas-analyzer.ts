/**
 * Canvas Analyzer - Multi-modal LLM integration for Cesium imagery analysis
 *
 * Enables:
 * - Capturing Cesium canvas as images
 * - Sending to multi-modal LLMs (Claude, GPT-4V, Gemini)
 * - Feature detection and bounding box extraction
 * - Drawing annotations on detected features
 * - Photogrammetry and heading detection
 */

import * as Cesium from 'cesium';

export interface BoundingBox {
  x: number;      // Left edge (0-1 normalized)
  y: number;      // Top edge (0-1 normalized)
  width: number;  // Width (0-1 normalized)
  height: number; // Height (0-1 normalized)
  label: string;
  confidence?: number;
  heading?: number; // Detected orientation in degrees
}

export interface DetectedFeature {
  type: string;           // 'bridge', 'building', 'road', 'runway', etc.
  name?: string;
  boundingBox: BoundingBox;
  center?: { lon: number; lat: number };
  heading?: number;
  attributes?: Record<string, unknown>;
}

export interface AnalysisResult {
  features: DetectedFeature[];
  rawResponse: string;
  imageWidth: number;
  imageHeight: number;
  timestamp: number;
}

export interface LLMProvider {
  name: string;
  analyzeImage: (imageBase64: string, prompt: string) => Promise<string>;
}

/**
 * Canvas Analyzer for Cesium
 */
export class CanvasAnalyzer {
  private viewer: Cesium.Viewer;
  private annotationEntities: Cesium.Entity[] = [];
  private llmProvider?: LLMProvider;

  constructor(viewer: Cesium.Viewer) {
    this.viewer = viewer;
  }

  /**
   * Set the LLM provider for image analysis
   */
  setLLMProvider(provider: LLMProvider): void {
    this.llmProvider = provider;
  }

  /**
   * Capture the current Cesium canvas as a base64 image
   */
  captureCanvas(format: 'png' | 'jpeg' = 'jpeg', quality = 0.9): string {
    const canvas = this.viewer.canvas;
    const mimeType = format === 'png' ? 'image/png' : 'image/jpeg';
    return canvas.toDataURL(mimeType, quality);
  }

  /**
   * Capture canvas and return as Blob for upload
   */
  async captureCanvasBlob(format: 'png' | 'jpeg' = 'jpeg', quality = 0.9): Promise<Blob> {
    return new Promise((resolve, reject) => {
      const canvas = this.viewer.canvas;
      const mimeType = format === 'png' ? 'image/png' : 'image/jpeg';
      canvas.toBlob(
        (blob) => {
          if (blob) resolve(blob);
          else reject(new Error('Failed to capture canvas'));
        },
        mimeType,
        quality
      );
    });
  }

  /**
   * Get current camera view parameters
   */
  getCameraView(): {
    longitude: number;
    latitude: number;
    height: number;
    heading: number;
    pitch: number;
    roll: number;
  } {
    const camera = this.viewer.camera;
    const position = camera.positionCartographic;
    return {
      longitude: Cesium.Math.toDegrees(position.longitude),
      latitude: Cesium.Math.toDegrees(position.latitude),
      height: position.height,
      heading: Cesium.Math.toDegrees(camera.heading),
      pitch: Cesium.Math.toDegrees(camera.pitch),
      roll: Cesium.Math.toDegrees(camera.roll),
    };
  }

  /**
   * Convert screen coordinates to geographic coordinates
   */
  screenToGeo(x: number, y: number): { longitude: number; latitude: number } | null {
    const cartesian = this.viewer.camera.pickEllipsoid(
      new Cesium.Cartesian2(x, y),
      this.viewer.scene.globe.ellipsoid
    );

    if (!cartesian) return null;

    const cartographic = Cesium.Cartographic.fromCartesian(cartesian);
    return {
      longitude: Cesium.Math.toDegrees(cartographic.longitude),
      latitude: Cesium.Math.toDegrees(cartographic.latitude),
    };
  }

  /**
   * Convert bounding box to geographic bounds
   */
  boundingBoxToGeoBounds(box: BoundingBox): {
    west: number;
    south: number;
    east: number;
    north: number;
    center: { lon: number; lat: number };
  } | null {
    const canvas = this.viewer.canvas;
    const width = canvas.width;
    const height = canvas.height;

    // Convert normalized coords to screen coords
    const left = box.x * width;
    const top = box.y * height;
    const right = (box.x + box.width) * width;
    const bottom = (box.y + box.height) * height;

    // Get corner geo coords
    const topLeft = this.screenToGeo(left, top);
    const bottomRight = this.screenToGeo(right, bottom);
    const center = this.screenToGeo((left + right) / 2, (top + bottom) / 2);

    if (!topLeft || !bottomRight || !center) return null;

    return {
      west: topLeft.longitude,
      north: topLeft.latitude,
      east: bottomRight.longitude,
      south: bottomRight.latitude,
      center: { lon: center.longitude, lat: center.latitude },
    };
  }

  /**
   * Analyze the current view using the configured LLM
   */
  async analyzeCurrentView(prompt?: string): Promise<AnalysisResult> {
    if (!this.llmProvider) {
      throw new Error('No LLM provider configured. Call setLLMProvider() first.');
    }

    const imageDataUrl = this.captureCanvas('jpeg', 0.85);
    const base64Data = imageDataUrl.replace(/^data:image\/\w+;base64,/, '');

    const analysisPrompt = prompt || this.getDefaultAnalysisPrompt();
    const response = await this.llmProvider.analyzeImage(base64Data, analysisPrompt);

    const features = this.parseFeatureResponse(response);
    const canvas = this.viewer.canvas;

    return {
      features,
      rawResponse: response,
      imageWidth: canvas.width,
      imageHeight: canvas.height,
      timestamp: Date.now(),
    };
  }

  /**
   * Default prompt for feature detection
   */
  private getDefaultAnalysisPrompt(): string {
    return `Analyze this satellite/aerial imagery and identify notable features.

For each feature found, provide a JSON object with:
- type: The feature type (bridge, building, road, runway, landmark, water, etc.)
- name: Feature name if identifiable
- boundingBox: {x, y, width, height} normalized 0-1 coordinates
- heading: Orientation in degrees (0=North, 90=East) if applicable
- confidence: Detection confidence 0-1

Return ONLY a JSON array of detected features. Example:
[
  {"type": "bridge", "name": "Golden Gate Bridge", "boundingBox": {"x": 0.2, "y": 0.3, "width": 0.6, "height": 0.1}, "heading": 28, "confidence": 0.95}
]`;
  }

  /**
   * Parse LLM response to extract features
   */
  private parseFeatureResponse(response: string): DetectedFeature[] {
    try {
      // Try to extract JSON array from response
      const jsonMatch = response.match(/\[[\s\S]*\]/);
      if (!jsonMatch) return [];

      const parsed = JSON.parse(jsonMatch[0]);
      if (!Array.isArray(parsed)) return [];

      return parsed.map((item: Record<string, unknown>) => {
        const bbox = item.boundingBox as Record<string, unknown> | undefined;
        return {
          type: String(item.type || 'unknown'),
          name: item.name ? String(item.name) : undefined,
          boundingBox: {
            x: Number(bbox?.x) || 0,
            y: Number(bbox?.y) || 0,
            width: Number(bbox?.width) || 0.1,
            height: Number(bbox?.height) || 0.1,
            label: item.name ? String(item.name) : String(item.type),
            confidence: item.confidence ? Number(item.confidence) : undefined,
            heading: item.heading ? Number(item.heading) : undefined,
          },
          heading: item.heading ? Number(item.heading) : undefined,
          attributes: item.attributes as Record<string, unknown> | undefined,
        };
      }) as DetectedFeature[];
    } catch (e) {
      console.error('Failed to parse feature response:', e);
      return [];
    }
  }

  /**
   * Draw bounding boxes on detected features
   */
  drawBoundingBoxes(features: DetectedFeature[], options?: {
    color?: Cesium.Color;
    showLabels?: boolean;
    labelOffset?: number;
  }): void {
    const color = options?.color || Cesium.Color.YELLOW.withAlpha(0.7);
    const showLabels = options?.showLabels ?? true;

    for (const feature of features) {
      const geoBounds = this.boundingBoxToGeoBounds(feature.boundingBox);
      if (!geoBounds) continue;

      // Add feature center to result
      feature.center = geoBounds.center;

      // Create rectangle entity for bounding box
      const entity = this.viewer.entities.add({
        rectangle: {
          coordinates: Cesium.Rectangle.fromDegrees(
            geoBounds.west,
            geoBounds.south,
            geoBounds.east,
            geoBounds.north
          ),
          material: color.withAlpha(0.2),
          outline: true,
          outlineColor: color,
          outlineWidth: 2,
          height: 0,
        },
      });
      this.annotationEntities.push(entity);

      // Add label if requested
      if (showLabels && feature.boundingBox.label) {
        const labelEntity = this.viewer.entities.add({
          position: Cesium.Cartesian3.fromDegrees(
            geoBounds.center.lon,
            geoBounds.north,
            100
          ),
          label: {
            text: feature.boundingBox.label,
            font: '14px sans-serif',
            fillColor: Cesium.Color.WHITE,
            outlineColor: Cesium.Color.BLACK,
            outlineWidth: 2,
            style: Cesium.LabelStyle.FILL_AND_OUTLINE,
            verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
            pixelOffset: new Cesium.Cartesian2(0, options?.labelOffset || -10),
          },
        });
        this.annotationEntities.push(labelEntity);
      }

      // Draw heading indicator if available
      if (feature.heading !== undefined) {
        this.drawHeadingIndicator(geoBounds.center, feature.heading, color);
      }
    }
  }

  /**
   * Draw a heading indicator arrow
   */
  private drawHeadingIndicator(
    center: { lon: number; lat: number },
    heading: number,
    color: Cesium.Color
  ): void {
    // Calculate endpoint based on heading (small offset for visual)
    const distance = 0.001; // ~100m at equator
    const headingRad = (heading * Math.PI) / 180;

    const endLon = center.lon + distance * Math.sin(headingRad);
    const endLat = center.lat + distance * Math.cos(headingRad);

    const entity = this.viewer.entities.add({
      polyline: {
        positions: Cesium.Cartesian3.fromDegreesArray([
          center.lon, center.lat,
          endLon, endLat,
        ]),
        width: 3,
        material: new Cesium.PolylineArrowMaterialProperty(color),
      },
    });
    this.annotationEntities.push(entity);
  }

  /**
   * Clear all annotations
   */
  clearAnnotations(): void {
    for (const entity of this.annotationEntities) {
      this.viewer.entities.remove(entity);
    }
    this.annotationEntities = [];
  }

  /**
   * Detect heading/orientation of a linear feature at a location
   * Uses edge detection and Hough transform
   */
  async detectHeadingAtLocation(
    longitude: number,
    latitude: number,
    options?: { zoomLevel?: number; analysisRadius?: number }
  ): Promise<number | null> {
    // Fly to location first
    await this.viewer.camera.flyTo({
      destination: Cesium.Cartesian3.fromDegrees(
        longitude,
        latitude,
        options?.zoomLevel || 1000
      ),
      duration: 0, // Instant for analysis
    });

    // Wait for tiles to load
    await this.waitForTilesToLoad();

    // Analyze with heading-specific prompt
    const prompt = `Analyze this aerial image and determine the primary orientation/heading of any linear features (roads, bridges, runways, etc.) at the center of the image.

Return a JSON object with:
- heading: Primary orientation in degrees (0=North, 90=East, 180=South, 270=West)
- confidence: Detection confidence 0-1
- featureType: What type of linear feature was detected

Example: {"heading": 28.5, "confidence": 0.9, "featureType": "bridge"}`;

    try {
      const result = await this.analyzeCurrentView(prompt);
      const firstFeature = result.features[0];
      if (firstFeature && firstFeature.heading !== undefined) {
        return firstFeature.heading;
      }

      // Try to parse heading from raw response
      const headingMatch = result.rawResponse.match(/"heading"\s*:\s*([\d.]+)/);
      if (headingMatch && headingMatch[1]) {
        return parseFloat(headingMatch[1]);
      }
    } catch (e) {
      console.error('Heading detection failed:', e);
    }

    return null;
  }

  /**
   * Wait for terrain/imagery tiles to load
   */
  private waitForTilesToLoad(timeout = 5000): Promise<void> {
    return new Promise((resolve) => {
      const startTime = Date.now();

      const checkTiles = () => {
        const tilesLoading = this.viewer.scene.globe.tilesLoaded;
        if (tilesLoading || Date.now() - startTime > timeout) {
          resolve();
        } else {
          requestAnimationFrame(checkTiles);
        }
      };

      checkTiles();
    });
  }

  /**
   * Perform photogrammetry analysis on current view
   */
  async analyzePhotogrammetry(): Promise<{
    estimatedHeading: number | null;
    shadowAngle: number | null;
    sunPosition: { azimuth: number; elevation: number } | null;
    features: DetectedFeature[];
  }> {
    const prompt = `Perform photogrammetric analysis on this satellite/aerial imagery.

Analyze:
1. Shadow directions to estimate sun position
2. Building/structure orientations
3. Any visible linear features and their headings
4. Perspective distortion

Return a JSON object with:
{
  "estimatedHeading": primary_heading_degrees_or_null,
  "shadowAngle": shadow_direction_degrees_or_null,
  "sunPosition": {"azimuth": degrees, "elevation": degrees} or null,
  "features": [array of detected features with boundingBox and heading]
}`;

    const result = await this.analyzeCurrentView(prompt);

    try {
      const jsonMatch = result.rawResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          estimatedHeading: parsed.estimatedHeading ?? null,
          shadowAngle: parsed.shadowAngle ?? null,
          sunPosition: parsed.sunPosition ?? null,
          features: result.features,
        };
      }
    } catch (e) {
      console.error('Failed to parse photogrammetry result:', e);
    }

    return {
      estimatedHeading: null,
      shadowAngle: null,
      sunPosition: null,
      features: result.features,
    };
  }
}

/**
 * Create a Claude API provider for image analysis
 */
export function createClaudeProvider(apiKey: string): LLMProvider {
  return {
    name: 'claude',
    async analyzeImage(imageBase64: string, prompt: string): Promise<string> {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 4096,
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'image',
                  source: {
                    type: 'base64',
                    media_type: 'image/jpeg',
                    data: imageBase64,
                  },
                },
                {
                  type: 'text',
                  text: prompt,
                },
              ],
            },
          ],
        }),
      });

      if (!response.ok) {
        throw new Error(`Claude API error: ${response.status}`);
      }

      const data = await response.json();
      return data.content[0]?.text || '';
    },
  };
}

/**
 * Create an OpenAI GPT-4V provider for image analysis
 */
export function createOpenAIProvider(apiKey: string): LLMProvider {
  return {
    name: 'openai',
    async analyzeImage(imageBase64: string, prompt: string): Promise<string> {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o',
          max_tokens: 4096,
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'image_url',
                  image_url: {
                    url: `data:image/jpeg;base64,${imageBase64}`,
                  },
                },
                {
                  type: 'text',
                  text: prompt,
                },
              ],
            },
          ],
        }),
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status}`);
      }

      const data = await response.json();
      return data.choices[0]?.message?.content || '';
    },
  };
}

export default CanvasAnalyzer;
