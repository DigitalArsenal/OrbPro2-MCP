#!/usr/bin/env node
/**
 * Fetch GeoNames city data and regenerate location database with population
 *
 * Downloads cities15000.txt (cities with population > 15,000) from GeoNames
 * and merges population data with existing C++ location database.
 */

import { createWriteStream, existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { get } from 'https';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, '..', 'data');
const CPP_SOURCE_PATH = join(__dirname, '..', 'packages', 'mcp-server-cpp', 'src', 'location_database.cpp');

// GeoNames cities with population > 15,000
const GEONAMES_URL = 'https://download.geonames.org/export/dump/cities15000.zip';
const CITIES_FILE = join(DATA_DIR, 'cities15000.txt');

// Ensure data directory exists
if (!existsSync(DATA_DIR)) {
  mkdirSync(DATA_DIR, { recursive: true });
}

/**
 * Download and extract GeoNames data
 */
async function downloadGeoNames() {
  const zipPath = join(DATA_DIR, 'cities15000.zip');

  if (existsSync(CITIES_FILE)) {
    console.log('GeoNames data already exists, skipping download');
    return;
  }

  console.log('Downloading GeoNames cities15000.zip...');

  await new Promise((resolve, reject) => {
    const file = createWriteStream(zipPath);
    get(GEONAMES_URL, (response) => {
      if (response.statusCode === 302 || response.statusCode === 301) {
        get(response.headers.location, (res) => {
          res.pipe(file);
          file.on('finish', () => {
            file.close();
            resolve();
          });
        }).on('error', reject);
      } else {
        response.pipe(file);
        file.on('finish', () => {
          file.close();
          resolve();
        });
      }
    }).on('error', reject);
  });

  console.log('Extracting...');
  execSync(`unzip -o ${zipPath} -d ${DATA_DIR}`);
  console.log('GeoNames data downloaded and extracted');
}

/**
 * Parse GeoNames tab-separated file
 */
function parseGeoNames() {
  console.log('Parsing GeoNames data...');

  const content = readFileSync(CITIES_FILE, 'utf-8');
  const lines = content.split('\n').filter(line => line.trim());

  const cities = new Map(); // name -> {population, lat, lon}

  for (const line of lines) {
    const fields = line.split('\t');
    if (fields.length < 15) continue;

    const [
      geonameid, name, asciiname, alternatenames, latitude, longitude,
      featureClass, featureCode, countryCode, cc2, admin1, admin2,
      admin3, admin4, population
    ] = fields;

    const pop = parseInt(population, 10);
    if (isNaN(pop) || pop < 1000) continue;

    // Store by normalized name, keep highest population if duplicates
    const normalizedName = name.toLowerCase().trim();
    const existing = cities.get(normalizedName);
    if (!existing || existing.population < pop) {
      cities.set(normalizedName, {
        name: name,
        population: pop,
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        countryCode: countryCode,
      });
    }

    // Also store ASCII name variant
    if (asciiname && asciiname !== name) {
      const asciiNorm = asciiname.toLowerCase().trim();
      const existingAscii = cities.get(asciiNorm);
      if (!existingAscii || existingAscii.population < pop) {
        cities.set(asciiNorm, {
          name: asciiname,
          population: pop,
          latitude: parseFloat(latitude),
          longitude: parseFloat(longitude),
          countryCode: countryCode,
        });
      }
    }
  }

  console.log(`Parsed ${cities.size} unique cities with population > 1000`);
  return cities;
}

/**
 * Parse existing C++ location database to extract location entries
 */
function parseCppLocations() {
  console.log('Parsing existing C++ location database...');

  const content = readFileSync(CPP_SOURCE_PATH, 'utf-8');

  // Extract the LOCATIONS array entries
  // Format: {"name", longitude, latitude, heading},
  const locationRegex = /\{"([^"]+)",\s*([-\d.]+),\s*([-\d.]+),\s*([-\d.]+)\}/g;

  const locations = [];
  let match;

  while ((match = locationRegex.exec(content)) !== null) {
    locations.push({
      name: match[1],
      longitude: parseFloat(match[2]),
      latitude: parseFloat(match[3]),
      heading: parseFloat(match[4]),
      population: 0, // Will be filled in
    });
  }

  console.log(`Parsed ${locations.length} existing locations from C++`);
  return locations;
}

/**
 * Merge GeoNames population data into existing locations
 */
function mergePopulationData(locations, geonames) {
  console.log('Merging population data...');

  let matched = 0;

  for (const loc of locations) {
    const normalized = loc.name.toLowerCase().trim();
    const geoCity = geonames.get(normalized);

    if (geoCity) {
      loc.population = geoCity.population;
      matched++;
    }
  }

  console.log(`Matched ${matched} locations with population data`);
  return locations;
}

/**
 * Generate C++ source file with population data
 */
function generateCppSource(locations) {
  const lines = [];

  lines.push('/**');
  lines.push(' * Location Database Implementation');
  lines.push(' *');
  lines.push(' * Contains comprehensive database of world locations with multiple aliases.');
  lines.push(` * Generated: ${new Date().toISOString()}`);
  lines.push(` * Total locations: ${locations.length}`);
  lines.push(' */');
  lines.push('');
  lines.push('#include "location_database.h"');
  lines.push('#include <cctype>');
  lines.push('#include <cstring>');
  lines.push('#include <algorithm>');
  lines.push('#include <vector>');
  lines.push('');
  lines.push('namespace cesium {');
  lines.push('namespace mcp {');
  lines.push('');
  lines.push('// Location database - comprehensive list of world locations');
  lines.push('// Format: {name, longitude, latitude, heading, population}');
  lines.push('// heading: -1 = not set, 0-360 = orientation in degrees (0=North, 90=East)');
  lines.push('// population: 0 = unknown');
  lines.push('static const Location LOCATIONS[] = {');

  // Group curated locations at the top (those with population data)
  const withPop = locations.filter(l => l.population > 0);
  const withoutPop = locations.filter(l => l.population === 0);

  lines.push('    // =========================================================================');
  lines.push(`    // CITIES WITH POPULATION DATA (${withPop.length} locations)`);
  lines.push('    // =========================================================================');

  // Sort by population descending
  withPop.sort((a, b) => b.population - a.population);

  for (const loc of withPop) {
    const escapedName = loc.name.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
    lines.push(`    {"${escapedName}", ${loc.longitude}, ${loc.latitude}, ${loc.heading}, ${loc.population}},`);
  }

  lines.push('');
  lines.push('    // =========================================================================');
  lines.push(`    // OTHER LOCATIONS (${withoutPop.length} locations - no population data)`);
  lines.push('    // =========================================================================');

  for (const loc of withoutPop) {
    const escapedName = loc.name.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
    lines.push(`    {"${escapedName}", ${loc.longitude}, ${loc.latitude}, ${loc.heading}, 0},`);
  }

  lines.push('};');
  lines.push('');
  lines.push('static constexpr size_t LOCATION_COUNT = sizeof(LOCATIONS) / sizeof(LOCATIONS[0]);');
  lines.push('');

  // Add implementation functions
  lines.push(`
void normalize_location_name(const char* input, char* output, size_t output_size) {
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

int levenshtein_distance(const char* s1, const char* s2, int max_distance) {
    size_t len1 = std::strlen(s1);
    size_t len2 = std::strlen(s2);

    // Quick length check for early termination
    int len_diff = static_cast<int>(len1) - static_cast<int>(len2);
    if (len_diff < 0) len_diff = -len_diff;
    if (max_distance >= 0 && len_diff > max_distance) {
        return max_distance + 1;
    }

    // Use two rows instead of full matrix for space efficiency
    std::vector<int> prev_row(len2 + 1);
    std::vector<int> curr_row(len2 + 1);

    // Initialize first row
    for (size_t j = 0; j <= len2; j++) {
        prev_row[j] = static_cast<int>(j);
    }

    for (size_t i = 1; i <= len1; i++) {
        curr_row[0] = static_cast<int>(i);

        int row_min = curr_row[0];

        for (size_t j = 1; j <= len2; j++) {
            int cost = (s1[i-1] == s2[j-1]) ? 0 : 1;
            curr_row[j] = std::min({
                prev_row[j] + 1,      // deletion
                curr_row[j-1] + 1,    // insertion
                prev_row[j-1] + cost  // substitution
            });

            if (curr_row[j] < row_min) {
                row_min = curr_row[j];
            }
        }

        // Early termination if minimum in row exceeds threshold
        if (max_distance >= 0 && row_min > max_distance) {
            return max_distance + 1;
        }

        std::swap(prev_row, curr_row);
    }

    return prev_row[len2];
}

bool contains_substring(const char* haystack, const char* needle) {
    return std::strstr(haystack, needle) != nullptr;
}

bool fuzzy_resolve_location(const char* name, double& longitude, double& latitude,
                            double& heading, int max_distance) {
    char normalized[256];
    normalize_location_name(name, normalized, sizeof(normalized));

    const Location* best_match = nullptr;
    int best_distance = max_distance + 1;

    for (size_t i = 0; i < LOCATION_COUNT; i++) {
        if (LOCATIONS[i].name == nullptr) continue;

        int dist = levenshtein_distance(normalized, LOCATIONS[i].name, best_distance - 1);
        if (dist < best_distance) {
            best_distance = dist;
            best_match = &LOCATIONS[i];

            if (dist == 0) break; // Exact match
        }
    }

    if (best_match != nullptr && best_distance <= max_distance) {
        longitude = best_match->longitude;
        latitude = best_match->latitude;
        heading = best_match->heading;
        return true;
    }

    return false;
}

size_t fuzzy_search_locations(const char* name, const Location** results,
                              int* scores, size_t max_results, int max_distance) {
    char normalized[256];
    normalize_location_name(name, normalized, sizeof(normalized));

    // Collect all matches within distance
    struct Match {
        const Location* loc;
        int distance;
    };
    std::vector<Match> matches;

    for (size_t i = 0; i < LOCATION_COUNT; i++) {
        if (LOCATIONS[i].name == nullptr) continue;

        int dist = levenshtein_distance(normalized, LOCATIONS[i].name, max_distance);
        if (dist <= max_distance) {
            matches.push_back({&LOCATIONS[i], dist});
        }
    }

    // Sort by distance
    std::sort(matches.begin(), matches.end(),
              [](const Match& a, const Match& b) { return a.distance < b.distance; });

    // Return top results
    size_t count = std::min(matches.size(), max_results);
    for (size_t i = 0; i < count; i++) {
        results[i] = matches[i].loc;
        scores[i] = matches[i].distance;
    }

    return count;
}

size_t get_top_cities_by_population(const Location** results, size_t max_results,
                                     int min_population) {
    // LOCATIONS is already sorted by population at the top
    size_t count = 0;
    for (size_t i = 0; i < LOCATION_COUNT && count < max_results; i++) {
        if (LOCATIONS[i].population >= min_population && LOCATIONS[i].population > 0) {
            results[count++] = &LOCATIONS[i];
        }
    }
    return count;
}

size_t get_cities_with_population_count() {
    size_t count = 0;
    for (size_t i = 0; i < LOCATION_COUNT; i++) {
        if (LOCATIONS[i].population > 0) {
            count++;
        }
    }
    return count;
}
`);

  lines.push('}  // namespace mcp');
  lines.push('}  // namespace cesium');

  return lines.join('\n');
}

/**
 * Main
 */
async function main() {
  try {
    await downloadGeoNames();
    const geonames = parseGeoNames();
    const locations = parseCppLocations();
    const merged = mergePopulationData(locations, geonames);

    // Generate new C++ source
    const cppSource = generateCppSource(merged);
    writeFileSync(CPP_SOURCE_PATH, cppSource);
    console.log(`\nWrote updated C++ source to: ${CPP_SOURCE_PATH}`);

    // Print stats
    const withPop = merged.filter(l => l.population > 0);
    console.log(`\nStats:`);
    console.log(`  Total locations: ${merged.length}`);
    console.log(`  With population: ${withPop.length}`);
    console.log(`  Top 10 by population:`);
    withPop.sort((a, b) => b.population - a.population);
    for (let i = 0; i < Math.min(10, withPop.length); i++) {
      console.log(`    ${i + 1}. ${withPop[i].name}: ${withPop[i].population.toLocaleString()}`);
    }

    console.log('\nDone! Run `npm run build:wasm` to rebuild with updated locations.');
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

main();
