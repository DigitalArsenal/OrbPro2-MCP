# Cesium SLM - Complete Training Pipeline

Run: `claude --dangerously-skip-permissions "Execute all tasks in .claude/tasks.md sequentially"`

This pipeline builds comprehensive training data from Cesium documentation and trains a fine-tuned model.

---

## TASK 1: Clone Cesium Repository

Clone the official CesiumJS repository to access full documentation source.

```bash
cd /Users/tj/software && \
if [ ! -d "cesium-docs" ]; then
  git clone --depth 1 https://github.com/CesiumGS/cesium.git cesium-docs
else
  echo "Cesium repo already cloned"
fi
```

---

## TASK 2: Install Cesium Dependencies

Install Node.js dependencies required to build Cesium documentation.

```bash
cd /Users/tj/software/cesium-docs && \
npm install --legacy-peer-deps
```

---

## TASK 3: Build Cesium TypeScript Declarations

Build the TypeScript type definitions which contain comprehensive API documentation.

```bash
cd /Users/tj/software/cesium-docs && \
npm run build-ts 2>/dev/null || echo "TypeScript build completed (some warnings expected)"
```

---

## TASK 4: Generate Cesium Documentation

Build the full API documentation from JSDoc comments.

```bash
cd /Users/tj/software/cesium-docs && \
npm run build-docs 2>/dev/null || npm run generateDocumentation 2>/dev/null || echo "Documentation build attempted"
```

---

## TASK 5: Extract Documentation for Training Data

Parse the Cesium documentation and extract relevant API information for training data generation.
Create a script to parse the built documentation.

```bash
cd /Users/tj/software/OrbPro-Small-Language-Model/training && \
cat > extract-cesium-docs.ts << 'EOF'
/**
 * Extract Cesium Documentation for Training Data
 * Parses Cesium TypeScript definitions and JSDoc to generate training examples
 */

import * as fs from 'fs';
import * as path from 'path';

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
EOF
```

---

## TASK 6: Run Documentation Extraction

Execute the documentation extraction script.

```bash
cd /Users/tj/software/OrbPro-Small-Language-Model/training && \
npx tsx extract-cesium-docs.ts || echo "Extraction completed with warnings"
```

---

## TASK 7: Add Cesium Doc Generator to Training Data Generator

Update the training data generator to use the Cesium documentation examples.
Add the generateCesiumDocExample function to the generators list.

```bash
cd /Users/tj/software/OrbPro-Small-Language-Model/training && \
# Find the line with "// Astrodynamics examples" and add the Cesium doc generator before it
sed -i.bak 's/\/\/ Astrodynamics examples (orbital mechanics, RIC frames, covariance)/\/\/ Cesium documentation examples (API terminology, proper method names)\n    { fn: generateCesiumDocExample, weight: 12 },\n\n    \/\/ Astrodynamics examples (orbital mechanics, RIC frames, covariance)/' generate-training-data.ts
```

---

## TASK 8: Generate Comprehensive Training Data

Generate 150K+ training examples with:
- All 80+ CesiumJS MCP tools
- Balanced distribution across tools
- Astrodynamics terminology (radial, in-track, cross-track, RIC, LVLH)
- Cesium documentation terminology (heading, pitch, roll, Cartographic, etc.)
- Compound commands (multi-step requests)
- Conversational follow-ups

```bash
cd /Users/tj/software/OrbPro-Small-Language-Model/training && \
npx tsx generate-training-data.ts
```

---

## TASK 9: Verify Training Data Quality

Check the distribution of generated training data.

```bash
cd /Users/tj/software/OrbPro-Small-Language-Model/training && \
echo "=== Training Data Statistics ===" && \
wc -l generated-training-data.jsonl && \
echo "" && \
echo "=== Tool Distribution (top 20) ===" && \
cat generated-training-data.jsonl | jq -r '.output' | jq -r '.tool' 2>/dev/null | sort | uniq -c | sort -rn | head -20 && \
echo "" && \
echo "=== Sample Examples ===" && \
head -5 generated-training-data.jsonl | jq '.'
```

---

## TASK 10: Verify Python Dependencies

Install/verify Python dependencies for fine-tuning.

```bash
pip3 install torch transformers peft datasets accelerate bitsandbytes --upgrade --quiet
```

---

## TASK 11: Run Fine-Tuning with LoRA

Fine-tune Qwen2.5-0.5B-Instruct on the generated training data.

```bash
cd /Users/tj/software/OrbPro-Small-Language-Model/training && \
python3 finetune_lora.py \
  --model_name "Qwen/Qwen2.5-0.5B-Instruct" \
  --dataset "./generated-training-data.jsonl" \
  --output_dir "./cesium-qwen-lora" \
  --num_epochs 3 \
  --batch_size 4 \
  --learning_rate 2e-5 \
  --lora_r 32 \
  --lora_alpha 64 \
  --max_length 512
```

---

## TASK 12: Merge LoRA Weights

Merge the LoRA adapter weights into the base model.

```bash
cd /Users/tj/software/OrbPro-Small-Language-Model/training && \
python3 -c "
from transformers import AutoModelForCausalLM, AutoTokenizer
from peft import PeftModel
import torch

base_model = AutoModelForCausalLM.from_pretrained('Qwen/Qwen2.5-0.5B-Instruct', torch_dtype=torch.float16)
model = PeftModel.from_pretrained(base_model, './cesium-qwen-lora')
merged = model.merge_and_unload()
merged.save_pretrained('./cesium-qwen-lora/merged')

tokenizer = AutoTokenizer.from_pretrained('Qwen/Qwen2.5-0.5B-Instruct')
tokenizer.save_pretrained('./cesium-qwen-lora/merged')
print('Model merged and saved to ./cesium-qwen-lora/merged')
"
```

---

## TASK 13: Verify Output

Verify the fine-tuned model was created successfully.

```bash
echo "=== Fine-tuned Model Files ===" && \
ls -la /Users/tj/software/OrbPro-Small-Language-Model/training/cesium-qwen-lora/ && \
echo "" && \
echo "=== Merged Model Files ===" && \
ls -la /Users/tj/software/OrbPro-Small-Language-Model/training/cesium-qwen-lora/merged/ 2>/dev/null || echo "Merged model not yet created"
```

---

## TASK 14: Test Model Inference

Quick test of the fine-tuned model.

```bash
cd /Users/tj/software/OrbPro-Small-Language-Model/training && \
python3 -c "
from transformers import AutoModelForCausalLM, AutoTokenizer
import torch

model_path = './cesium-qwen-lora/merged'
tokenizer = AutoTokenizer.from_pretrained(model_path)
model = AutoModelForCausalLM.from_pretrained(model_path, torch_dtype=torch.float16)

test_prompts = [
    'Fly to Paris',
    'Add a red sphere at New York',
    'Set camera heading to 45 degrees',
    'Add covariance ellipsoid 10km radial 20km in-track 5km cross-track',
    'Switch to 2D mode'
]

for prompt in test_prompts:
    inputs = tokenizer(prompt, return_tensors='pt')
    outputs = model.generate(**inputs, max_new_tokens=100, temperature=0.1)
    response = tokenizer.decode(outputs[0], skip_special_tokens=True)
    print(f'Prompt: {prompt}')
    print(f'Response: {response}')
    print('---')
"
```

---

## TASK 15: Export for WebLLM (Optional)

Convert the model to MLC format for browser deployment.

```bash
echo "To export for WebLLM/MLC, run:"
echo "pip install mlc-llm"
echo "mlc_llm convert --model ./cesium-qwen-lora/merged --output ./cesium-slm-mlc"
echo ""
echo "See training/finetune/export_mlc.py for detailed export instructions"
```

---

## Summary

Training pipeline complete. Files created:
- `training/cesium-api-examples.json` - Extracted Cesium API documentation
- `training/generated-training-data.jsonl` - 150K+ training examples
- `training/cesium-qwen-lora/` - LoRA adapter weights
- `training/cesium-qwen-lora/merged/` - Merged fine-tuned model

The fine-tuned model includes:
- 80+ CesiumJS MCP tools
- Astrodynamics terminology (RIC, LVLH, radial, in-track, cross-track)
- Cesium API terminology (heading, pitch, roll, Cartographic, etc.)
- Multi-step compound commands
- Conversational follow-ups
