#!/usr/bin/env node
/**
 * Compile FlatBuffer schemas using flatc-wasm
 *
 * This generates:
 * - C++ headers for the WASM MCP server (aligned structs for zero-copy)
 * - TypeScript code for the frontend (DataView wrappers)
 */

import { FlatcRunner, generateAlignedCode } from 'flatc-wasm';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.join(__dirname, '..');
const SCHEMAS_DIR = path.join(PROJECT_ROOT, 'packages/mcp-server-cpp/schemas');
const CPP_OUTPUT = path.join(PROJECT_ROOT, 'packages/mcp-server-cpp/include/generated');
const TS_OUTPUT = path.join(PROJECT_ROOT, 'src/mcp/generated');

async function main() {
  console.log('Compiling FlatBuffer schemas...\n');

  // Create output directories
  fs.mkdirSync(CPP_OUTPUT, { recursive: true });
  fs.mkdirSync(TS_OUTPUT, { recursive: true });

  // Schema files to compile
  const schemas = [
    { name: 'locations_aligned', file: 'locations_aligned.fbs', useAligned: true, defaultStringLength: 0 },
  ];

  for (const schema of schemas) {
    const schemaPath = path.join(SCHEMAS_DIR, schema.file);

    if (!fs.existsSync(schemaPath)) {
      console.log(`  Skipping ${schema.file} (not found)`);
      continue;
    }

    console.log(`\nProcessing ${schema.file}...`);
    const source = fs.readFileSync(schemaPath, 'utf-8');

    if (schema.useAligned) {
      // Use aligned codegen for zero-copy WASM interop
      console.log(`  Using aligned codegen (defaultStringLength=${schema.defaultStringLength})`);

      const result = generateAlignedCode(source, {
        defaultStringLength: schema.defaultStringLength,
      });

      // Write C++ header
      const cppFile = path.join(CPP_OUTPUT, `${schema.name}.h`);
      fs.writeFileSync(cppFile, result.cpp);
      console.log(`  C++ aligned: ${cppFile}`);

      // Write TypeScript
      const tsFile = path.join(TS_OUTPUT, `${schema.name}.ts`);
      fs.writeFileSync(tsFile, result.ts);
      console.log(`  TypeScript aligned: ${tsFile}`);

      // Write plain JavaScript
      const jsFile = path.join(TS_OUTPUT, `${schema.name}.js`);
      fs.writeFileSync(jsFile, result.js);
      console.log(`  JavaScript aligned: ${jsFile}`);

      // Print layout info
      console.log('\n  Computed layouts:');
      for (const [name, layout] of Object.entries(result.layouts)) {
        console.log(`    ${name}: ${layout.size} bytes, align ${layout.align}`);
      }
    } else {
      // Use standard FlatBuffers codegen via FlatcRunner
      const runner = await FlatcRunner.init();
      console.log(`  FlatBuffers version: ${runner.version()}`);

      const schemaInput = {
        entry: schema.file,
        files: { [schema.file]: source },
      };

      // Generate C++ code
      try {
        const cppCode = runner.generateCode(schemaInput, 'cpp', { genObjectApi: true });
        for (const [filename, content] of Object.entries(cppCode)) {
          const cppFile = path.join(CPP_OUTPUT, filename);
          fs.writeFileSync(cppFile, content);
          console.log(`  C++: ${cppFile}`);
        }
      } catch (e) {
        console.error(`  C++ generation failed: ${e.message}`);
      }

      // Generate TypeScript code
      try {
        const tsCode = runner.generateCode(schemaInput, 'ts');
        for (const [filename, content] of Object.entries(tsCode)) {
          const tsFile = path.join(TS_OUTPUT, filename);
          fs.writeFileSync(tsFile, content);
          console.log(`  TypeScript: ${tsFile}`);
        }
      } catch (e) {
        console.error(`  TypeScript generation failed: ${e.message}`);
      }
    }
  }

  console.log('\nFlatBuffer compilation complete');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
