#!/usr/bin/env node
/**
 * Merge Location Databases
 *
 * Combines the hand-curated location_database.cpp with generated OSM data,
 * preserving colloquial names and aliases while adding new locations.
 */

import { readFileSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Paths
const CURATED_PATH = join(__dirname, '../packages/mcp-server-cpp/src/location_database.cpp');
const GENERATED_JSON = join(__dirname, '../data/locations.json');
const OUTPUT_PATH = join(__dirname, '../packages/mcp-server-cpp/src/location_database.cpp');

/**
 * Parse locations from the existing C++ file
 */
function parseCuratedLocations(cppContent) {
  const locations = [];
  const regex = /\{"([^"]+)",\s*([-\d.]+),\s*([-\d.]+)\}/g;
  let match;

  while ((match = regex.exec(cppContent)) !== null) {
    locations.push({
      name: match[1],
      longitude: parseFloat(match[2]),
      latitude: parseFloat(match[3]),
    });
  }

  return locations;
}

/**
 * Check if two locations are the same place (within ~1km)
 */
function isSameLocation(loc1, loc2) {
  const threshold = 0.01; // ~1km
  return Math.abs(loc1.longitude - loc2.longitude) < threshold &&
         Math.abs(loc1.latitude - loc2.latitude) < threshold;
}

/**
 * Check if a name is similar to another (ignoring case, common words)
 */
function isSimilarName(name1, name2) {
  const normalize = (s) => s.toLowerCase()
    .replace(/^the\s+/, '')
    .replace(/\s+(international|airport|base|station|center|centre)$/g, '')
    .trim();

  return normalize(name1) === normalize(name2);
}

/**
 * Generate the merged C++ source
 */
function generateMergedCpp(curatedLocs, generatedLocs) {
  // Build a set of existing names and coordinates
  const existingNames = new Set(curatedLocs.map(l => l.name.toLowerCase()));
  const existingCoords = curatedLocs.map(l => ({ lon: l.longitude, lat: l.latitude }));

  // Filter generated locations to only include new ones
  const newLocations = [];
  for (const loc of generatedLocs) {
    const nameLower = loc.name.toLowerCase();

    // Skip if name already exists
    if (existingNames.has(nameLower)) continue;

    // Skip if very close to an existing location
    const isDuplicate = existingCoords.some(coord =>
      Math.abs(coord.lon - loc.longitude) < 0.005 &&
      Math.abs(coord.lat - loc.latitude) < 0.005
    );
    if (isDuplicate) continue;

    // Skip names that are too long or have problematic characters
    if (loc.name.length > 80) continue;
    if (loc.name.includes('"') || loc.name.includes('\\')) continue;
    if (loc.name.includes('\n') || loc.name.includes('\r') || loc.name.includes('\t')) continue;
    // Skip names with non-ASCII control characters
    if (/[\x00-\x1f\x7f]/.test(loc.name)) continue;

    newLocations.push(loc);
    existingNames.add(nameLower);
  }

  console.log(`Curated locations: ${curatedLocs.length}`);
  console.log(`Generated locations: ${generatedLocs.length}`);
  console.log(`New unique locations to add: ${newLocations.length}`);

  // Group new locations by category
  const byCategory = {};
  for (const loc of newLocations) {
    const cat = loc.category || 'other';
    if (!byCategory[cat]) byCategory[cat] = [];
    byCategory[cat].push(loc);
  }

  // Generate C++ source
  const lines = [];
  lines.push('/**');
  lines.push(' * Location Database Implementation');
  lines.push(' *');
  lines.push(' * Contains comprehensive database of world locations with multiple aliases.');
  lines.push(` * Generated: ${new Date().toISOString()}`);
  lines.push(` * Total locations: ${curatedLocs.length + newLocations.length}`);
  lines.push(' */');
  lines.push('');
  lines.push('#include "location_database.h"');
  lines.push('#include <cctype>');
  lines.push('#include <cstring>');
  lines.push('');
  lines.push('namespace cesium {');
  lines.push('namespace mcp {');
  lines.push('');
  lines.push('// Location database - comprehensive list of world locations');
  lines.push('// Format: {name, longitude, latitude, heading}');
  lines.push('// heading: -1 = not set, 0-360 = orientation in degrees (0=North, 90=East)');
  lines.push('static const Location LOCATIONS[] = {');

  // First, add all curated locations (preserving original structure)
  lines.push('    // =========================================================================');
  lines.push('    // CURATED LOCATIONS (with aliases and colloquial names)');
  lines.push('    // =========================================================================');
  lines.push('');

  for (const loc of curatedLocs) {
    const escapedName = loc.name.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
    lines.push(`    {"${escapedName}", ${loc.longitude}, ${loc.latitude}, -1},`);
  }

  // Then add generated locations by category
  for (const [category, locs] of Object.entries(byCategory).sort()) {
    lines.push('');
    lines.push(`    // =========================================================================`);
    lines.push(`    // ${category.toUpperCase()} (from OpenStreetMap)`);
    lines.push(`    // =========================================================================`);

    // Sort by name
    locs.sort((a, b) => a.name.localeCompare(b.name));

    for (const loc of locs) {
      const escapedName = loc.name.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
      const heading = loc.heading !== undefined ? loc.heading : -1;
      lines.push(`    {"${escapedName}", ${loc.longitude.toFixed(4)}, ${loc.latitude.toFixed(4)}, ${heading}},`);

      // Add IATA code as alias for airports
      if (loc.iata && loc.iata.length === 3) {
        const iata = loc.iata.toLowerCase();
        if (!existingNames.has(iata)) {
          lines.push(`    {"${iata}", ${loc.longitude.toFixed(4)}, ${loc.latitude.toFixed(4)}, ${heading}},`);
          existingNames.add(iata);
        }
      }
    }
  }

  lines.push('');
  lines.push('    // End marker');
  lines.push('    {nullptr, 0, 0, -1}');
  lines.push('};');
  lines.push('');
  lines.push('// Number of locations (excluding end marker)');
  lines.push('static constexpr size_t LOCATION_COUNT = sizeof(LOCATIONS) / sizeof(LOCATIONS[0]) - 1;');
  lines.push('');

  // Add the implementation functions
  lines.push(`void normalize_location_name(const char* input, char* output, size_t output_size) {
    if (output_size == 0) return;

    size_t i = 0;
    size_t j = 0;

    // Skip leading whitespace
    while (input[i] != '\\0' && (input[i] == ' ' || input[i] == '\\t')) {
        i++;
    }

    // Convert to lowercase and copy
    while (input[i] != '\\0' && j < output_size - 1) {
        char c = input[i];
        if (c >= 'A' && c <= 'Z') {
            output[j] = c + ('a' - 'A');
        } else {
            output[j] = c;
        }
        i++;
        j++;
    }

    // Remove trailing whitespace
    while (j > 0 && (output[j - 1] == ' ' || output[j - 1] == '\\t')) {
        j--;
    }

    output[j] = '\\0';
}

bool resolve_location(const char* name, double& longitude, double& latitude, double& heading) {
    char normalized[256];
    normalize_location_name(name, normalized, sizeof(normalized));

    for (size_t i = 0; i < LOCATION_COUNT; i++) {
        if (LOCATIONS[i].name != nullptr &&
            std::strcmp(normalized, LOCATIONS[i].name) == 0) {
            longitude = LOCATIONS[i].longitude;
            latitude = LOCATIONS[i].latitude;
            heading = LOCATIONS[i].heading;
            return true;
        }
    }

    return false;
}

const Location* get_all_locations() {
    return LOCATIONS;
}

size_t get_location_count() {
    return LOCATION_COUNT;
}

size_t search_locations(const char* prefix, const Location** results, size_t max_results) {
    char normalized[256];
    normalize_location_name(prefix, normalized, sizeof(normalized));
    size_t prefix_len = std::strlen(normalized);

    size_t count = 0;
    for (size_t i = 0; i < LOCATION_COUNT && count < max_results; i++) {
        if (LOCATIONS[i].name != nullptr &&
            std::strncmp(normalized, LOCATIONS[i].name, prefix_len) == 0) {
            results[count++] = &LOCATIONS[i];
        }
    }

    return count;
}
`);

  lines.push('}  // namespace mcp');
  lines.push('}  // namespace cesium');

  return lines.join('\n');
}

async function main() {
  console.log('Merging location databases...\n');

  // Read existing curated database
  const curatedCpp = readFileSync(CURATED_PATH, 'utf-8');
  const curatedLocs = parseCuratedLocations(curatedCpp);

  // Read generated JSON
  let generatedLocs = [];
  try {
    generatedLocs = JSON.parse(readFileSync(GENERATED_JSON, 'utf-8'));
  } catch (e) {
    console.error('No generated locations found. Run `npm run build:locations` first.');
    process.exit(1);
  }

  // Generate merged file
  const mergedCpp = generateMergedCpp(curatedLocs, generatedLocs);

  // Write output
  writeFileSync(OUTPUT_PATH, mergedCpp);
  console.log(`\nWrote merged database to: ${OUTPUT_PATH}`);
  console.log('\nNext steps:');
  console.log('  cd packages/mcp-server-cpp && npm run build');
}

main().catch(console.error);
