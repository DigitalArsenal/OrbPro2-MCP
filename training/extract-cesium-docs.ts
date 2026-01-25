/**
 * Extract Cesium Documentation for Training Data
 * Parses Cesium TypeScript definitions and JSDoc to generate training examples
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface APIExample {
  className: string;
  methodName: string;
  description: string;
  parameters: { name: string; type: string; description: string }[];
  returnType: string;
  example?: string;
}

const CESIUM_SOURCE = '/Users/tj/software/cesium-docs';
const OUTPUT_FILE = path.join(__dirname, 'cesium-api-examples.json');

// Key classes to extract for training data
const TARGET_CLASSES = [
  'Camera', 'Scene', 'Viewer', 'Entity', 'EntityCollection',
  'Globe', 'Terrain', 'ImageryLayer', 'ImageryLayerCollection',
  'Cesium3DTileset', 'Cesium3DTileStyle',
  'Cartesian3', 'Cartographic', 'Matrix4', 'Quaternion',
  'Clock', 'JulianDate', 'TimeInterval',
  'Billboard', 'BillboardCollection', 'Label', 'LabelCollection',
  'Polyline', 'PolylineCollection', 'Polygon',
  'Ellipsoid', 'Rectangle', 'BoundingSphere',
  'CzmlDataSource', 'GeoJsonDataSource', 'KmlDataSource',
  'ScreenSpaceCameraController', 'CameraEventAggregator',
  'PostProcessStage', 'PostProcessStageLibrary',
  'ParticleSystem', 'Fog', 'ShadowMap', 'SkyBox', 'SkyAtmosphere'
];

// Extract from TypeScript declaration files
function extractFromDTS(): APIExample[] {
  const examples: APIExample[] = [];
  const dtsPath = path.join(CESIUM_SOURCE, 'Build', 'Cesium', 'Cesium.d.ts');

  if (!fs.existsSync(dtsPath)) {
    console.log('DTS file not found, trying source files...');
    return extractFromSource();
  }

  const content = fs.readFileSync(dtsPath, 'utf-8');

  for (const className of TARGET_CLASSES) {
    const classRegex = new RegExp(`class ${className}[^{]*\\{([^}]+(?:\\{[^}]*\\}[^}]*)*)\\}`, 'g');
    let match;
    while ((match = classRegex.exec(content)) !== null) {
      const classBody = match[1];

      // Extract methods
      const methodRegex = /(\w+)\s*\(([^)]*)\)\s*:\s*([^;]+)/g;
      let methodMatch;
      while ((methodMatch = methodRegex.exec(classBody)) !== null) {
        examples.push({
          className,
          methodName: methodMatch[1],
          description: `${className}.${methodMatch[1]} method`,
          parameters: parseParams(methodMatch[2]),
          returnType: methodMatch[3].trim()
        });
      }
    }
  }

  return examples;
}

// Extract from source files
function extractFromSource(): APIExample[] {
  const examples: APIExample[] = [];
  const sourcePath = path.join(CESIUM_SOURCE, 'packages', 'engine', 'Source');

  if (!fs.existsSync(sourcePath)) {
    console.log('Source path not found:', sourcePath);
    return examples;
  }

  function processDir(dir: string) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
      const fullPath = path.join(dir, file);
      const stat = fs.statSync(fullPath);
      if (stat.isDirectory()) {
        processDir(fullPath);
      } else if (file.endsWith('.js') || file.endsWith('.ts')) {
        try {
          const content = fs.readFileSync(fullPath, 'utf-8');

          // Extract JSDoc comments with examples
          const jsdocRegex = /\/\*\*[\s\S]*?\*\//g;
          let match;
          while ((match = jsdocRegex.exec(content)) !== null) {
            const jsdoc = match[0];
            if (jsdoc.includes('@example')) {
              const exampleMatch = jsdoc.match(/@example[\s\S]*?(?=@|\*\/)/);
              if (exampleMatch) {
                const funcMatch = content.slice(match.index + match[0].length, match.index + match[0].length + 500)
                  .match(/(?:function\s+)?(\w+)\s*[=(]/);
                if (funcMatch) {
                  examples.push({
                    className: path.basename(file, path.extname(file)),
                    methodName: funcMatch[1],
                    description: extractDescription(jsdoc),
                    parameters: [],
                    returnType: 'unknown',
                    example: exampleMatch[0].replace(/@example\s*/, '').trim()
                  });
                }
              }
            }
          }
        } catch (e) {
          // Skip files that can't be read
        }
      }
    }
  }

  processDir(sourcePath);
  return examples;
}

function parseParams(paramStr: string): { name: string; type: string; description: string }[] {
  if (!paramStr.trim()) return [];
  return paramStr.split(',').map(p => {
    const parts = p.trim().split(':');
    return {
      name: parts[0]?.replace('?', '').trim() || '',
      type: parts[1]?.trim() || 'any',
      description: ''
    };
  }).filter(p => p.name);
}

function extractDescription(jsdoc: string): string {
  const descMatch = jsdoc.match(/\/\*\*\s*\n?\s*\*?\s*([^@*][^\n]*)/);
  return descMatch ? descMatch[1].trim() : '';
}

// Main
const allExamples = [...extractFromDTS(), ...extractFromSource()];
console.log(`Extracted ${allExamples.length} API examples`);

fs.writeFileSync(OUTPUT_FILE, JSON.stringify(allExamples, null, 2));
console.log(`Saved to ${OUTPUT_FILE}`);
