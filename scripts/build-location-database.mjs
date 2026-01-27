#!/usr/bin/env node
/**
 * Build Location Database from OpenStreetMap via Overpass API
 *
 * Fetches locations from various categories and generates both:
 * - C++ source file for WASM MCP server
 * - TypeScript/JSON for use in browser
 *
 * Categories:
 * - Major cities (by population)
 * - Landmarks and monuments
 * - Military bases and installations
 * - Airports (international)
 * - Scientific facilities and research centers
 * - UNESCO World Heritage sites
 * - Stadiums and arenas
 * - Notable bridges
 */

const OVERPASS_API = 'https://overpass-api.de/api/interpreter';

// Rate limiting - Overpass API prefers max 1 request per 10 seconds
const DELAY_MS = 12000;

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Execute an Overpass query
 */
async function queryOverpass(query) {
  const response = await fetch(OVERPASS_API, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: `data=${encodeURIComponent(query)}`,
  });

  if (!response.ok) {
    throw new Error(`Overpass API error: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

/**
 * Calculate heading (bearing) between two points in degrees
 * Returns 0-360 where 0=North, 90=East, 180=South, 270=West
 */
function calculateHeading(lon1, lat1, lon2, lat2) {
  const toRad = (deg) => deg * Math.PI / 180;
  const toDeg = (rad) => rad * 180 / Math.PI;

  const dLon = toRad(lon2 - lon1);
  const lat1Rad = toRad(lat1);
  const lat2Rad = toRad(lat2);

  const x = Math.sin(dLon) * Math.cos(lat2Rad);
  const y = Math.cos(lat1Rad) * Math.sin(lat2Rad) -
            Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(dLon);

  let heading = toDeg(Math.atan2(x, y));
  return (heading + 360) % 360; // Normalize to 0-360
}

/**
 * Parse runway reference to get heading (e.g., "09/27" -> 90, "18L/36R" -> 180)
 */
function parseRunwayHeading(ref) {
  if (!ref) return null;
  // Extract first number from ref like "09/27", "18L/36R", "09"
  const match = ref.match(/^(\d{1,2})/);
  if (match) {
    const num = parseInt(match[1], 10);
    // Runway numbers are heading / 10, so multiply by 10
    return num * 10;
  }
  return null;
}

/**
 * Extract name, coordinates, and heading from OSM element
 */
function extractLocation(element) {
  // For runways, use ref as the name
  const isRunway = element._category === 'runways';
  const name = isRunway
    ? (element.tags?.ref ? `Runway ${element.tags.ref}` : null)
    : (element.tags?.name || element.tags?.['name:en']);

  if (!name) return null;

  let lon, lat, heading = null;

  if (element.type === 'node') {
    lon = element.lon;
    lat = element.lat;
  } else if (element.geometry && element.geometry.length >= 2) {
    // Way with full geometry - calculate center and heading
    const geom = element.geometry;
    const midIdx = Math.floor(geom.length / 2);

    // Use middle point as center
    lon = geom[midIdx].lon;
    lat = geom[midIdx].lat;

    // For runways, try to get heading from ref first (more accurate)
    if (isRunway && element.tags?.ref) {
      heading = parseRunwayHeading(element.tags.ref);
    }

    // If no heading from ref, calculate from geometry
    if (heading === null) {
      const first = geom[0];
      const last = geom[geom.length - 1];

      // Check if it's a closed way (first == last) or points are too close
      const dist = Math.sqrt(
        Math.pow(last.lon - first.lon, 2) + Math.pow(last.lat - first.lat, 2)
      );

      if (dist < 0.0001) {
        // Closed way or too short - find the two most distant points
        let maxDist = 0;
        let p1 = first, p2 = last;
        for (let i = 0; i < geom.length; i++) {
          for (let j = i + 1; j < geom.length; j++) {
            const d = Math.sqrt(
              Math.pow(geom[j].lon - geom[i].lon, 2) +
              Math.pow(geom[j].lat - geom[i].lat, 2)
            );
            if (d > maxDist) {
              maxDist = d;
              p1 = geom[i];
              p2 = geom[j];
            }
          }
        }
        heading = calculateHeading(p1.lon, p1.lat, p2.lon, p2.lat);
      } else {
        heading = calculateHeading(first.lon, first.lat, last.lon, last.lat);
      }
    }

    // Round heading to 1 decimal place
    heading = Math.round(heading * 10) / 10;
  } else if (element.center) {
    lon = element.center.lon;
    lat = element.center.lat;
  } else {
    return null;
  }

  const result = {
    name: name.toLowerCase().trim(),
    displayName: name,
    longitude: lon,
    latitude: lat,
    category: element._category,
    country: element.tags?.['addr:country'] || element.tags?.['is_in:country'] || '',
  };

  // Add heading if calculated
  if (heading !== null) {
    result.heading = heading;
  }

  // For runways, add the airport name if available
  if (isRunway && element.tags?.['aeroway:ref']) {
    result.airport = element.tags['aeroway:ref'];
  }

  return result;
}

/**
 * Query categories
 */
const QUERIES = {
  // Major world cities - use wikidata to filter to notable cities only
  majorCities: `
    [out:json][timeout:180];
    node["place"~"city|town"]["capital"="yes"]["name"];
    out center;
  `,

  // Capital cities specifically
  capitals: `
    [out:json][timeout:180];
    node["capital"="yes"]["name"];
    out center;
  `,

  // Famous landmarks - just monuments and castles (simpler query)
  landmarks: `
    [out:json][timeout:180];
    (
      node["historic"="monument"]["name"]["wikipedia"];
      node["historic"="castle"]["name"]["wikipedia"];
      node["building"="palace"]["name"]["wikipedia"];
      node["man_made"="tower"]["name"]["wikipedia"];
    );
    out center;
  `,

  // Military bases (publicly known)
  militaryBases: `
    [out:json][timeout:180];
    (
      node["military"="airfield"]["name"];
      way["military"="airfield"]["name"];
      node["military"="base"]["name"];
      way["military"="base"]["name"];
      node["military"="naval_base"]["name"];
      way["military"="naval_base"]["name"];
      node["aeroway"="aerodrome"]["military"="yes"]["name"];
      way["aeroway"="aerodrome"]["military"="yes"]["name"];
    );
    out center;
  `,

  // Major international airports
  airports: `
    [out:json][timeout:180];
    (
      node["aeroway"="aerodrome"]["iata"]["name"];
      way["aeroway"="aerodrome"]["iata"]["name"];
    );
    out center;
  `,

  // Research facilities - just research institutes (universities are too many)
  researchFacilities: `
    [out:json][timeout:180];
    (
      node["amenity"="research_institute"]["name"];
      way["amenity"="research_institute"]["name"];
      node["building"="laboratory"]["name"];
      way["building"="laboratory"]["name"];
    );
    out center;
  `,

  // Space launch sites specifically
  spaceCenters: `
    [out:json][timeout:180];
    (
      node["aeroway"="spaceport"]["name"];
      way["aeroway"="spaceport"]["name"];
      node["landuse"]["name"~"Space Center|Launch|Cosmodrome|Spaceport",i];
      way["landuse"]["name"~"Space Center|Launch|Cosmodrome|Spaceport",i];
    );
    out center;
  `,

  // UNESCO World Heritage sites
  worldHeritage: `
    [out:json][timeout:180];
    (
      node["heritage"="world_heritage"]["name"];
      way["heritage"="world_heritage"]["name"];
      relation["heritage"="world_heritage"]["name"];
      node["heritage:operator"="whc"]["name"];
      way["heritage:operator"="whc"]["name"];
    );
    out center;
  `,

  // Major stadiums - use wikipedia instead of wikidata (smaller index)
  stadiums: `
    [out:json][timeout:180];
    (
      node["leisure"="stadium"]["name"]["wikipedia"];
      way["leisure"="stadium"]["name"]["wikipedia"];
    );
    out center;
  `,

  // Notable bridges - fetch full geometry for heading calculation
  bridges: `
    [out:json][timeout:180];
    (
      way["man_made"="bridge"]["name"]["wikipedia"];
    );
    out geom;
  `,

  // Runways - fetch geometry for heading (runway numbers indicate heading)
  runways: `
    [out:json][timeout:180];
    (
      way["aeroway"="runway"]["ref"];
    );
    out geom;
  `,

  // Dams - linear structures
  dams: `
    [out:json][timeout:180];
    (
      way["waterway"="dam"]["name"]["wikipedia"];
      way["waterway"="weir"]["name"]["wikipedia"];
    );
    out geom;
  `,

  // Piers and jetties
  piers: `
    [out:json][timeout:180];
    (
      way["man_made"="pier"]["name"]["wikipedia"];
      way["man_made"="breakwater"]["name"]["wikipedia"];
    );
    out geom;
  `,

  // Canals - major waterways
  canals: `
    [out:json][timeout:180];
    (
      way["waterway"="canal"]["name"]["wikipedia"];
    );
    out geom;
  `,

  // Wind farms
  windFarms: `
    [out:json][timeout:180];
    (
      node["power"="generator"]["generator:source"="wind"]["name"];
      way["power"="plant"]["plant:source"="wind"]["name"]["wikipedia"];
    );
    out center;
  `,

  // Solar farms
  solarFarms: `
    [out:json][timeout:180];
    (
      way["power"="plant"]["plant:source"="solar"]["name"]["wikipedia"];
      way["power"="generator"]["generator:source"="solar"]["name"]["wikipedia"];
    );
    out center;
  `,

  // Race tracks - motorsport circuits
  raceTracks: `
    [out:json][timeout:180];
    (
      way["leisure"="track"]["sport"="motor"]["name"]["wikipedia"];
      way["leisure"="stadium"]["sport"="motor"]["name"]["wikipedia"];
    );
    out geom;
  `,

  // Railway stations - major terminals
  railwayStations: `
    [out:json][timeout:180];
    (
      node["railway"="station"]["name"]["wikipedia"];
      way["railway"="station"]["name"]["wikipedia"];
    );
    out center;
  `,

  // Launch pads and space facilities
  launchPads: `
    [out:json][timeout:180];
    (
      node["man_made"="launch_pad"]["name"];
      way["man_made"="launch_pad"]["name"];
      node["aeroway"="launchpad"]["name"];
      way["aeroway"="launchpad"]["name"];
    );
    out center;
  `,

  // Tunnels - major ones
  tunnels: `
    [out:json][timeout:180];
    (
      way["tunnel"="yes"]["name"]["wikipedia"];
    );
    out geom;
  `,

  // Aqueducts - historical water channels
  aqueducts: `
    [out:json][timeout:180];
    (
      way["historic"="aqueduct"]["name"]["wikipedia"];
      way["man_made"="aqueduct"]["name"]["wikipedia"];
    );
    out geom;
  `,

  // Ski jumps
  skiJumps: `
    [out:json][timeout:180];
    (
      way["aerialway"="ski_jump"]["name"];
      node["aerialway"="ski_jump"]["name"];
      way["sport"="ski_jumping"]["name"];
    );
    out geom;
  `,

  // Nuclear facilities (power plants, research reactors)
  nuclearFacilities: `
    [out:json][timeout:180];
    (
      node["power"="generator"]["generator:source"="nuclear"]["name"];
      way["power"="generator"]["generator:source"="nuclear"]["name"];
      node["power"="plant"]["plant:source"="nuclear"]["name"];
      way["power"="plant"]["plant:source"="nuclear"]["name"];
    );
    out center;
  `,

  // Observatories
  observatories: `
    [out:json][timeout:180];
    (
      node["man_made"="observatory"]["name"];
      way["man_made"="observatory"]["name"];
      node["landuse"="observatory"]["name"];
      way["landuse"="observatory"]["name"];
    );
    out center;
  `,

  // Theme parks
  themeParks: `
    [out:json][timeout:180];
    (
      node["tourism"="theme_park"]["name"]["wikidata"];
      way["tourism"="theme_park"]["name"]["wikidata"];
    );
    out center;
  `,

  // Ports and harbors - only with wikipedia for notable ones
  ports: `
    [out:json][timeout:180];
    (
      node["industrial"="port"]["name"]["wikipedia"];
      way["industrial"="port"]["name"]["wikipedia"];
      node["harbour"="yes"]["name"]["wikipedia"];
      way["harbour"="yes"]["name"]["wikipedia"];
    );
    out center;
  `,
};

/**
 * Generate aliases for a location name
 */
function generateAliases(location) {
  const aliases = [location.name];
  const name = location.name;

  // Add common abbreviations
  const abbrevPatterns = [
    [/^the /, ''],
    [/ international airport$/, ' airport'],
    [/ international airport$/, ''],
    [/ airport$/, ''],
    [/ air force base$/, ' afb'],
    [/ naval air station$/, ' nas'],
    [/ army base$/, ''],
    [/ military base$/, ''],
    [/saint /g, 'st '],
    [/st\. /g, 'st '],
    [/mount /g, 'mt '],
    [/mt\. /g, 'mt '],
    [/ university$/, ''],
    [/university of /, ''],
  ];

  for (const [pattern, replacement] of abbrevPatterns) {
    const alias = name.replace(pattern, replacement).trim();
    if (alias && alias !== name && alias.length > 2) {
      aliases.push(alias);
    }
  }

  // Add IATA code for airports if available
  if (location.iata) {
    aliases.push(location.iata.toLowerCase());
  }

  return [...new Set(aliases)];
}

/**
 * Generate C++ source file
 */
function generateCppSource(locations) {
  const lines = [];

  lines.push('/**');
  lines.push(' * Auto-generated Location Database');
  lines.push(` * Generated: ${new Date().toISOString()}`);
  lines.push(` * Total locations: ${locations.length}`);
  lines.push(' */');
  lines.push('');
  lines.push('#include "location_database.h"');
  lines.push('#include <cctype>');
  lines.push('#include <cstring>');
  lines.push('');
  lines.push('namespace cesium {');
  lines.push('namespace mcp {');
  lines.push('');
  lines.push('static const Location LOCATIONS[] = {');

  // Group by category
  const byCategory = {};
  for (const loc of locations) {
    const cat = loc.category || 'other';
    if (!byCategory[cat]) byCategory[cat] = [];
    byCategory[cat].push(loc);
  }

  for (const [category, locs] of Object.entries(byCategory)) {
    lines.push(`    // === ${category.toUpperCase()} ===`);
    for (const loc of locs) {
      const aliases = generateAliases(loc);
      for (const alias of aliases) {
        const escapedName = alias.replace(/"/g, '\\"');
        lines.push(`    {"${escapedName}", ${loc.longitude.toFixed(4)}, ${loc.latitude.toFixed(4)}},`);
      }
    }
    lines.push('');
  }

  lines.push('    // End marker');
  lines.push('    {nullptr, 0, 0}');
  lines.push('};');
  lines.push('');
  lines.push('static constexpr size_t LOCATION_COUNT = sizeof(LOCATIONS) / sizeof(LOCATIONS[0]) - 1;');
  lines.push('');

  // Add the implementation functions
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

bool resolve_location(const char* name, double& longitude, double& latitude) {
    char normalized[256];
    normalize_location_name(name, normalized, sizeof(normalized));

    for (size_t i = 0; i < LOCATION_COUNT; i++) {
        if (LOCATIONS[i].name != nullptr &&
            std::strcmp(normalized, LOCATIONS[i].name) == 0) {
            longitude = LOCATIONS[i].longitude;
            latitude = LOCATIONS[i].latitude;
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

/**
 * Generate TypeScript/JSON export
 */
function generateTypeScript(locations) {
  const lines = [];

  lines.push('/**');
  lines.push(' * Auto-generated Location Database');
  lines.push(` * Generated: ${new Date().toISOString()}`);
  lines.push(` * Total locations: ${locations.length}`);
  lines.push(' */');
  lines.push('');
  lines.push('export interface Location {');
  lines.push('  name: string;');
  lines.push('  displayName: string;');
  lines.push('  longitude: number;');
  lines.push('  latitude: number;');
  lines.push('  category: string;');
  lines.push('  aliases: string[];');
  lines.push('  heading?: number; // Orientation in degrees (0=North, 90=East)');
  lines.push('}');
  lines.push('');
  lines.push('export const LOCATIONS: Location[] = [');

  for (const loc of locations) {
    const aliases = generateAliases(loc);
    const headingStr = loc.heading !== undefined ? `, heading: ${loc.heading}` : '';
    lines.push(`  {`);
    lines.push(`    name: ${JSON.stringify(loc.name)},`);
    lines.push(`    displayName: ${JSON.stringify(loc.displayName)},`);
    lines.push(`    longitude: ${loc.longitude.toFixed(4)},`);
    lines.push(`    latitude: ${loc.latitude.toFixed(4)},`);
    lines.push(`    category: ${JSON.stringify(loc.category)},`);
    lines.push(`    aliases: ${JSON.stringify(aliases)},`);
    if (loc.heading !== undefined) {
      lines.push(`    heading: ${loc.heading},`);
    }
    lines.push(`  },`);
  }

  lines.push('];');
  lines.push('');
  lines.push('// Quick lookup map');
  lines.push('export const LOCATION_MAP = new Map<string, Location>();');
  lines.push('for (const loc of LOCATIONS) {');
  lines.push('  for (const alias of loc.aliases) {');
  lines.push('    LOCATION_MAP.set(alias.toLowerCase(), loc);');
  lines.push('  }');
  lines.push('}');
  lines.push('');
  lines.push('export function resolveLocation(name: string): Location | undefined {');
  lines.push('  return LOCATION_MAP.get(name.toLowerCase().trim());');
  lines.push('}');

  return lines.join('\n');
}

/**
 * Main entry point
 */
async function main() {
  console.log('Building location database from OpenStreetMap...\n');

  const allLocations = [];
  const seenNames = new Set();

  for (const [category, query] of Object.entries(QUERIES)) {
    console.log(`Querying ${category}...`);

    try {
      const result = await queryOverpass(query);
      const elements = result.elements || [];

      let added = 0;
      for (const element of elements) {
        element._category = category;
        const location = extractLocation(element);

        if (location && !seenNames.has(location.name)) {
          seenNames.add(location.name);

          // Add IATA code for airports
          if (category === 'airports' && element.tags?.iata) {
            location.iata = element.tags.iata;
          }

          allLocations.push(location);
          added++;
        }
      }

      console.log(`  Found ${elements.length} elements, added ${added} unique locations`);
    } catch (error) {
      console.error(`  Error querying ${category}: ${error.message}`);
    }

    // Rate limiting
    console.log(`  Waiting ${DELAY_MS / 1000}s before next query...`);
    await sleep(DELAY_MS);
  }

  console.log(`\nTotal unique locations: ${allLocations.length}`);

  // Sort by category then name
  allLocations.sort((a, b) => {
    if (a.category !== b.category) return a.category.localeCompare(b.category);
    return a.name.localeCompare(b.name);
  });

  // Generate outputs
  const fs = await import('fs');
  const path = await import('path');

  const scriptDir = path.dirname(new URL(import.meta.url).pathname);
  const outputDir = path.join(scriptDir, '..', 'data');

  // Create output directory if it doesn't exist
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Write C++ source
  const cppPath = path.join(outputDir, 'location_database_generated.cpp');
  fs.writeFileSync(cppPath, generateCppSource(allLocations));
  console.log(`\nWrote C++ source to: ${cppPath}`);

  // Write TypeScript
  const tsPath = path.join(outputDir, 'location_database_generated.ts');
  fs.writeFileSync(tsPath, generateTypeScript(allLocations));
  console.log(`Wrote TypeScript to: ${tsPath}`);

  // Write raw JSON for reference
  const jsonPath = path.join(outputDir, 'locations.json');
  fs.writeFileSync(jsonPath, JSON.stringify(allLocations, null, 2));
  console.log(`Wrote JSON to: ${jsonPath}`);

  console.log('\nDone!');
  console.log('\nTo use the generated C++ file:');
  console.log('  1. Review and merge with packages/mcp-server-cpp/src/location_database.cpp');
  console.log('  2. Rebuild the WASM: cd packages/mcp-server-cpp && npm run build');
}

main().catch(console.error);
