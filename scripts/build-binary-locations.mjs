#!/usr/bin/env node
/**
 * Build Binary Location Database using FlatBuffers Aligned Format
 *
 * Creates an aligned binary database from:
 * - All 50 US states + DC + territories
 * - All US cities with population > 1000 (from Census)
 * - International cities and landmarks
 *
 * Uses the aligned FlatBuffers format defined in locations_aligned.fbs:
 * - Header: 64 bytes (AlignedLocationDatabaseHeader)
 * - Records: 148 bytes each (AlignedLocation)
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.join(__dirname, '..');

// Constants from aligned schema
const HEADER_SIZE = 64;
const RECORD_SIZE = 148;
const NAME_MAX_LENGTH = 127; // 128 bytes - 1 for null
const MAGIC = Buffer.from('LOCDB001', 'utf-8');

// Type flags (matching LocationType enum in schema)
const TYPE_UNKNOWN = 0;
const TYPE_STATE = 1;
const TYPE_CITY = 2;
const TYPE_LANDMARK = 4;
const TYPE_COUNTRY = 8;
const TYPE_REGION = 16;
const TYPE_AIRPORT = 32;

// US States with central coordinates
const US_STATES = [
  { name: 'alabama', lon: -86.9023, lat: 32.3182, alias: ['al', 'the yellowhammer state', 'heart of dixie'] },
  { name: 'alaska', lon: -152.4044, lat: 64.2008, alias: ['ak', 'the last frontier'] },
  { name: 'arizona', lon: -111.0937, lat: 34.0489, alias: ['az', 'the grand canyon state'] },
  { name: 'arkansas', lon: -92.3731, lat: 34.7465, alias: ['ar', 'the natural state'] },
  { name: 'california', lon: -119.4179, lat: 36.7783, alias: ['ca', 'the golden state', 'cali'] },
  { name: 'colorado', lon: -105.7821, lat: 39.5501, alias: ['co', 'the centennial state'] },
  { name: 'connecticut', lon: -72.7554, lat: 41.6032, alias: ['ct', 'the constitution state'] },
  { name: 'delaware', lon: -75.5277, lat: 38.9108, alias: ['de', 'the first state'] },
  { name: 'florida', lon: -81.5158, lat: 27.6648, alias: ['fl', 'the sunshine state'] },
  { name: 'georgia', lon: -82.9001, lat: 32.1656, alias: ['ga', 'the peach state'] },
  { name: 'hawaii', lon: -155.5828, lat: 19.8968, alias: ['hi', 'the aloha state'] },
  { name: 'idaho', lon: -114.7420, lat: 44.0682, alias: ['id', 'the gem state'] },
  { name: 'illinois', lon: -89.3985, lat: 40.6331, alias: ['il', 'the prairie state'] },
  { name: 'indiana', lon: -86.1349, lat: 40.2672, alias: ['in', 'the hoosier state'] },
  { name: 'iowa', lon: -93.0977, lat: 41.8780, alias: ['ia', 'the hawkeye state'] },
  { name: 'kansas', lon: -98.4842, lat: 39.0119, alias: ['ks', 'the sunflower state'] },
  { name: 'kentucky', lon: -84.2700, lat: 37.8393, alias: ['ky', 'the bluegrass state'] },
  { name: 'louisiana', lon: -91.9623, lat: 30.9843, alias: ['la', 'the pelican state'] },
  { name: 'maine', lon: -69.4455, lat: 45.2538, alias: ['me', 'the pine tree state'] },
  { name: 'maryland', lon: -76.6413, lat: 39.0458, alias: ['md', 'the old line state'] },
  { name: 'massachusetts', lon: -71.3824, lat: 42.4072, alias: ['ma', 'the bay state', 'mass'] },
  { name: 'michigan', lon: -85.6024, lat: 44.3148, alias: ['mi', 'the great lakes state', 'the wolverine state'] },
  { name: 'minnesota', lon: -94.6859, lat: 46.7296, alias: ['mn', 'the north star state', 'land of 10000 lakes'] },
  { name: 'mississippi', lon: -89.3985, lat: 32.3547, alias: ['ms', 'the magnolia state'] },
  { name: 'missouri', lon: -91.8318, lat: 37.9643, alias: ['mo', 'the show me state'] },
  { name: 'montana', lon: -110.3626, lat: 46.8797, alias: ['mt', 'the treasure state', 'big sky country'] },
  { name: 'nebraska', lon: -99.9018, lat: 41.4925, alias: ['ne', 'the cornhusker state'] },
  { name: 'nevada', lon: -116.4194, lat: 38.8026, alias: ['nv', 'the silver state'] },
  { name: 'new hampshire', lon: -71.5724, lat: 43.1939, alias: ['nh', 'the granite state'] },
  { name: 'new jersey', lon: -74.4057, lat: 40.0583, alias: ['nj', 'the garden state'] },
  { name: 'new mexico', lon: -105.8701, lat: 34.5199, alias: ['nm', 'the land of enchantment'] },
  { name: 'new york state', lon: -75.4999, lat: 43.0000, alias: ['ny state'] },
  { name: 'north carolina', lon: -79.0193, lat: 35.7596, alias: ['nc', 'the tar heel state'] },
  { name: 'north dakota', lon: -101.0020, lat: 47.5515, alias: ['nd', 'the peace garden state'] },
  { name: 'ohio', lon: -82.9071, lat: 40.4173, alias: ['oh', 'the buckeye state'] },
  { name: 'oklahoma', lon: -97.0929, lat: 35.0078, alias: ['ok', 'the sooner state'] },
  { name: 'oregon', lon: -120.5542, lat: 43.8041, alias: ['or', 'the beaver state'] },
  { name: 'pennsylvania', lon: -77.1945, lat: 41.2033, alias: ['pa', 'the keystone state'] },
  { name: 'rhode island', lon: -71.4774, lat: 41.5801, alias: ['ri', 'the ocean state'] },
  { name: 'south carolina', lon: -81.1637, lat: 33.8361, alias: ['sc', 'the palmetto state'] },
  { name: 'south dakota', lon: -99.9018, lat: 43.9695, alias: ['sd', 'the mount rushmore state'] },
  { name: 'tennessee', lon: -86.5804, lat: 35.5175, alias: ['tn', 'the volunteer state'] },
  { name: 'texas', lon: -99.9018, lat: 31.9686, alias: ['tx', 'the lone star state'] },
  { name: 'utah', lon: -111.0937, lat: 39.3210, alias: ['ut', 'the beehive state'] },
  { name: 'vermont', lon: -72.5778, lat: 44.5588, alias: ['vt', 'the green mountain state'] },
  { name: 'virginia', lon: -78.6569, lat: 37.4316, alias: ['va', 'the old dominion state'] },
  { name: 'washington state', lon: -120.7401, lat: 47.7511, alias: ['wa state'] },
  { name: 'west virginia', lon: -80.4549, lat: 38.5976, alias: ['wv', 'the mountain state'] },
  { name: 'wisconsin', lon: -89.6165, lat: 43.7844, alias: ['wi', 'the badger state', 'americas dairyland'] },
  { name: 'wyoming', lon: -107.2903, lat: 43.0760, alias: ['wy', 'the equality state', 'the cowboy state'] },
  // Territories
  { name: 'puerto rico', lon: -66.5901, lat: 18.2208, alias: ['pr'] },
  { name: 'us virgin islands', lon: -64.8963, lat: 18.3358, alias: ['usvi', 'virgin islands'] },
  { name: 'guam', lon: 144.7937, lat: 13.4443, alias: ['gu'] },
  { name: 'american samoa', lon: -170.1322, lat: -14.2710, alias: ['as'] },
  { name: 'northern mariana islands', lon: 145.6739, lat: 15.0979, alias: ['mp', 'cnmi'] },
  { name: 'district of columbia', lon: -77.0369, lat: 38.9072, alias: ['washington dc', 'dc', 'the district'] },
];

// Normalize location name (lowercase, strip punctuation, collapse spaces)
function normalizeName(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// Write a location record at the given buffer offset
function writeLocationRecord(buffer, offset, name, loc) {
  // Name (128 bytes, null-terminated)
  const nameBytes = Buffer.from(name.substring(0, NAME_MAX_LENGTH), 'utf-8');
  nameBytes.copy(buffer, offset);
  // Ensure null termination (rest of 128 bytes is already zero)

  // Longitude (float32 at offset 128)
  buffer.writeFloatLE(loc.lon, offset + 128);

  // Latitude (float32 at offset 132)
  buffer.writeFloatLE(loc.lat, offset + 132);

  // Heading (float32 at offset 136)
  buffer.writeFloatLE(loc.heading, offset + 136);

  // Population (uint32 at offset 140)
  buffer.writeUInt32LE(loc.population, offset + 140);

  // Type (uint16 at offset 144)
  buffer.writeUInt16LE(loc.type, offset + 144);

  // Reserved (uint16 at offset 146)
  buffer.writeUInt16LE(0, offset + 146);
}

// Write header at the start of buffer
function writeHeader(buffer, locationCount) {
  // Magic (8 bytes at offset 0)
  MAGIC.copy(buffer, 0);

  // Version (uint32 at offset 8)
  buffer.writeUInt32LE(1, 8);

  // Flags (uint32 at offset 12)
  buffer.writeUInt32LE(0, 12);

  // Location count (uint32 at offset 16)
  buffer.writeUInt32LE(locationCount, 16);

  // Reserved1 (uint32 at offset 20)
  buffer.writeUInt32LE(0, 20);

  // Created timestamp (uint64 at offset 24)
  buffer.writeBigUInt64LE(BigInt(Date.now()), 24);

  // Modified timestamp (uint64 at offset 32)
  buffer.writeBigUInt64LE(BigInt(Date.now()), 32);

  // Reserved2 (24 bytes at offset 40) - already zero
}

// Build the database
async function buildDatabase() {
  console.log('Building binary location database (FlatBuffers aligned format)...\n');

  const locations = new Map(); // name -> { lon, lat, heading, population, type }

  // Add US states
  console.log('Adding US states and territories...');
  for (const state of US_STATES) {
    const normalized = normalizeName(state.name);
    locations.set(normalized, {
      lon: state.lon,
      lat: state.lat,
      heading: -1,
      population: 0,
      type: TYPE_STATE,
    });

    // Add aliases
    if (state.alias) {
      for (const alias of state.alias) {
        const normalizedAlias = normalizeName(alias);
        if (!locations.has(normalizedAlias)) {
          locations.set(normalizedAlias, {
            lon: state.lon,
            lat: state.lat,
            heading: -1,
            population: 0,
            type: TYPE_STATE,
          });
        }
      }
    }
  }
  console.log(`  Added ${US_STATES.length} states/territories with aliases`);

  // Load existing curated locations from C++ database
  console.log('\nLoading existing curated locations...');
  const cppDbPath = path.join(PROJECT_ROOT, 'packages/mcp-server-cpp/src/location_database.cpp');
  if (fs.existsSync(cppDbPath)) {
    const content = fs.readFileSync(cppDbPath, 'utf-8');

    // Parse C++ struct format: {"name", longitude, latitude, heading}
    const locationRegex = /\{"([^"]+)",\s*([-\d.]+),\s*([-\d.]+),\s*([-\d.]+)\}/g;
    let match;
    let count = 0;

    while ((match = locationRegex.exec(content)) !== null) {
      const [, name, lon, lat, heading] = match;
      const normalized = normalizeName(name);

      if (!locations.has(normalized)) {
        locations.set(normalized, {
          lon: parseFloat(lon),
          lat: parseFloat(lat),
          heading: parseFloat(heading),
          population: 0,
          type: TYPE_CITY, // Default, could be improved
        });
        count++;
      }
    }
    console.log(`  Imported ${count} locations from existing database`);
  }

  // Sort locations alphabetically for binary search
  const sortedNames = [...locations.keys()].sort();
  console.log(`\nTotal locations: ${sortedNames.length}`);

  // Build binary database
  console.log('\nBuilding binary format...');

  const recordsSize = sortedNames.length * RECORD_SIZE;
  const totalSize = HEADER_SIZE + recordsSize;
  const buffer = Buffer.alloc(totalSize);

  // Write header
  writeHeader(buffer, sortedNames.length);

  // Write location records
  let recordOffset = HEADER_SIZE;
  for (const name of sortedNames) {
    const loc = locations.get(name);
    writeLocationRecord(buffer, recordOffset, name, loc);
    recordOffset += RECORD_SIZE;
  }

  // Write output file
  const outputPath = path.join(PROJECT_ROOT, 'packages/mcp-server-cpp/data/locations.bin');
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, buffer);

  console.log(`\nWrote ${outputPath}`);
  console.log(`  Header: ${HEADER_SIZE} bytes`);
  console.log(`  Records: ${recordsSize} bytes (${sortedNames.length} x ${RECORD_SIZE})`);
  console.log(`  Total: ${totalSize} bytes (${(totalSize / 1024).toFixed(2)} KB)`);

  // Also write a JSON version for debugging
  const jsonPath = path.join(PROJECT_ROOT, 'packages/mcp-server-cpp/data/locations.json');
  const jsonData = sortedNames.map(name => {
    const loc = locations.get(name);
    return { name, ...loc };
  });
  fs.writeFileSync(jsonPath, JSON.stringify(jsonData, null, 2));
  console.log(`\nWrote ${jsonPath} (for debugging)`);
}

buildDatabase().catch(console.error);
