/**
 * Geocoder - Resolves location names to coordinates
 *
 * Uses a multi-tier approach:
 * 1. KNOWN_LOCATIONS database (instant, offline)
 * 2. Nominatim API via proxy (online fallback)
 *
 * Caches results to avoid repeated API calls.
 */

import { KNOWN_LOCATIONS } from './command-parser';
import type { CartographicPosition } from '../cesium/types';

const geocodeCache = new Map<string, CartographicPosition | null>();

/**
 * Resolve a location name to coordinates
 */
export async function geocodeLocation(name: string): Promise<CartographicPosition | null> {
  const normalized = name.toLowerCase().trim();

  // Check cache
  if (geocodeCache.has(normalized)) {
    return geocodeCache.get(normalized) || null;
  }

  // Tier 1: KNOWN_LOCATIONS (exact match)
  if (KNOWN_LOCATIONS[normalized]) {
    return KNOWN_LOCATIONS[normalized];
  }

  // Tier 1b: KNOWN_LOCATIONS (partial match)
  for (const [key, pos] of Object.entries(KNOWN_LOCATIONS)) {
    if (key.includes(normalized) || normalized.includes(key)) {
      geocodeCache.set(normalized, pos);
      return pos;
    }
  }

  // Tier 2: Nominatim API
  try {
    const result = await nominatimGeocode(name);
    geocodeCache.set(normalized, result);
    return result;
  } catch (error) {
    console.warn(`[Geocoder] Nominatim failed for "${name}":`, error);
    geocodeCache.set(normalized, null);
    return null;
  }
}

/**
 * Query Nominatim geocoding API (via proxy)
 */
async function nominatimGeocode(query: string): Promise<CartographicPosition | null> {
  const params = new URLSearchParams({
    q: query,
    format: 'json',
    limit: '1',
  });

  const response = await fetch(`/api/nominatim/search?${params}`);
  if (!response.ok) {
    throw new Error(`Nominatim returned ${response.status}`);
  }

  const results = await response.json();
  if (!results || results.length === 0) {
    return null;
  }

  const result = results[0];
  return {
    longitude: parseFloat(result.lon),
    latitude: parseFloat(result.lat),
  };
}

/**
 * Extract location name from user input for a flyTo-type command
 */
export function extractLocationName(input: string): string | null {
  const lower = input.toLowerCase().trim();

  // Common patterns: "fly to X", "go to X", "show me X", "navigate to X"
  const patterns = [
    /(?:fly|go|navigate|head|travel|move|zoom|jump|teleport)\s+to\s+(?:the\s+)?(.+?)(?:\s+and\s+|$)/i,
    /(?:show|display|view)\s+(?:me\s+)?(?:the\s+)?(.+?)(?:\s+and\s+|$)/i,
    /(?:take\s+me\s+to)\s+(?:the\s+)?(.+?)(?:\s+and\s+|$)/i,
    /(?:where\s+is)\s+(?:the\s+)?(.+?)(?:\?|$)/i,
    /(?:find|locate|search\s+for)\s+(?:the\s+)?(.+?)(?:\s+and\s+|$)/i,
  ];

  for (const pattern of patterns) {
    const match = pattern.exec(input);
    if (match) {
      return match[1].trim();
    }
  }

  return null;
}

/**
 * Override model coordinates with geocoded ones when applicable.
 * Call this after the model produces a flyTo tool call.
 */
export async function correctFlyToCoordinates(
  userInput: string,
  toolArgs: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const locationName = extractLocationName(userInput);
  if (!locationName) {
    return toolArgs;
  }

  const geocoded = await geocodeLocation(locationName);
  if (!geocoded) {
    return toolArgs; // Keep model's coordinates as fallback
  }

  return {
    ...toolArgs,
    longitude: geocoded.longitude,
    latitude: geocoded.latitude,
  };
}

/**
 * Extract location names from a "from A to B" pattern
 */
export function extractRouteLocations(input: string): string[] {
  const patterns = [
    /\bfrom\s+(.+?)\s+to\s+(.+?)(?:\s*$|\s+(?:and|then|,))/i,
    /\bbetween\s+(.+?)\s+and\s+(.+?)(?:\s*$|\s+(?:then|,))/i,
    /\bpath\s+(?:from\s+)?(.+?)\s+to\s+(.+?)(?:\s*$|\s+(?:and|then|,))/i,
    /\broute\s+(?:from\s+)?(.+?)\s+to\s+(.+?)(?:\s*$|\s+(?:and|then|,))/i,
    /\bline\s+(?:from\s+)?(.+?)\s+to\s+(.+?)(?:\s*$|\s+(?:and|then|,))/i,
  ];

  for (const pattern of patterns) {
    const match = pattern.exec(input);
    if (match) {
      return [match[1].trim(), match[2].trim()];
    }
  }

  return [];
}

/**
 * Correct positions array in polyline/route tool args by geocoding location names.
 */
export async function correctPolylineCoordinates(
  userInput: string,
  toolArgs: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const locations = extractRouteLocations(userInput);
  if (locations.length < 2) {
    return toolArgs;
  }

  // Geocode all locations in parallel
  const geocoded = await Promise.all(locations.map(loc => geocodeLocation(loc)));
  const validPositions = geocoded
    .filter((pos): pos is CartographicPosition => pos !== null)
    .map(pos => ({ longitude: pos.longitude, latitude: pos.latitude }));

  if (validPositions.length < 2) {
    return toolArgs; // Not enough resolved, keep model output
  }

  return {
    ...toolArgs,
    positions: validPositions,
  };
}

/**
 * Correct coordinates for a single-point tool (addPoint, addSphere, addLabel, etc.)
 * by extracting the location from "at X" or "at/on/in <location>" patterns.
 */
export async function correctPointCoordinates(
  userInput: string,
  toolArgs: Record<string, unknown>
): Promise<Record<string, unknown>> {
  // Try "at X", "on X", "in X", "to X" patterns
  const patterns = [
    /\bat\s+(?:the\s+)?(.+?)(?:\s*$|\s+(?:and|then|,|with))/i,
    /\bon\s+(?:the\s+)?(.+?)(?:\s*$|\s+(?:and|then|,|with))/i,
    /\bin\s+(?:the\s+)?(.+?)(?:\s*$|\s+(?:and|then|,|with))/i,
    /\bto\s+(?:the\s+)?(.+?)(?:\s+(?:and|then|,|with)|\s*$)/i,
  ];

  for (const pattern of patterns) {
    const match = pattern.exec(userInput);
    if (match) {
      const locName = match[1].trim();
      // Skip if it looks like an object type not a location
      if (/^(sphere|marker|point|label|line|it|that|there)$/i.test(locName)) continue;

      const geocoded = await geocodeLocation(locName);
      if (geocoded) {
        return {
          ...toolArgs,
          longitude: geocoded.longitude,
          latitude: geocoded.latitude,
        };
      }
    }
  }

  return toolArgs;
}

// Tools that use a single lon/lat point
export const SINGLE_POINT_TOOLS = [
  'flyTo', 'setView', 'lookAt', 'addPoint', 'addSphere', 'addLabel',
  'addBox', 'addCylinder', 'addEllipse', 'addCircle', 'addModel',
  'addBillboard', 'addVolumetricCloud',
];

// Tools that use a positions array
export const MULTI_POINT_TOOLS = [
  'addPolyline', 'addDashedPolyline', 'addGlowingPolyline',
  'addArrowPolyline', 'addOutlinedPolyline', 'addCorridor',
  'addPolygon', 'addWall',
];
