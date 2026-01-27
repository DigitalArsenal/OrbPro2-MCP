/**
 * Utility functions for working with aligned location database
 */

import {
  AlignedLocationView,
  AlignedLocationArrayView,
  AlignedLocationDatabaseHeaderView,
  ALIGNEDLOCATION_SIZE,
  ALIGNEDLOCATIONDATABASEHEADER_SIZE,
  LocationType,
} from './locations_aligned';

export { LocationType };

const MAGIC = new Uint8Array([0x4C, 0x4F, 0x43, 0x44, 0x42, 0x30, 0x30, 0x31]); // "LOCDB001"
const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

/**
 * Get the name string from a location view
 */
export function getLocationName(view: AlignedLocationView): string {
  const nameBytes = view.name;
  // Find null terminator
  let len = 0;
  while (len < nameBytes.length && nameBytes[len] !== 0) len++;
  return textDecoder.decode(nameBytes.subarray(0, len));
}

/**
 * Set the name string on a location view
 */
export function setLocationName(view: AlignedLocationView, name: string): void {
  const nameBytes = view.name;
  const encoded = textEncoder.encode(name);
  const copyLen = Math.min(encoded.length, 127); // Max 127 chars + null
  nameBytes.set(encoded.subarray(0, copyLen));
  // Null terminate
  for (let i = copyLen; i < 128; i++) nameBytes[i] = 0;
}

/**
 * Validate a location database header
 */
export function validateHeader(header: AlignedLocationDatabaseHeaderView): boolean {
  const magic = header.magic;
  for (let i = 0; i < 8; i++) {
    if (magic[i] !== MAGIC[i]) return false;
  }
  return true;
}

/**
 * Initialize a location database header with magic number
 */
export function initHeader(header: AlignedLocationDatabaseHeaderView, locationCount: number): void {
  header.magic.set(MAGIC);
  header.version = 1;
  header.flags = 0;
  header.location_count = locationCount;
  header.created_timestamp = BigInt(Date.now());
  header.modified_timestamp = BigInt(Date.now());
}

/**
 * Load a location database from a binary buffer
 */
export function loadLocationDatabase(buffer: ArrayBuffer): {
  header: AlignedLocationDatabaseHeaderView;
  locations: AlignedLocationArrayView;
} {
  const header = new AlignedLocationDatabaseHeaderView(buffer, 0);

  if (!validateHeader(header)) {
    throw new Error('Invalid location database: bad magic number');
  }

  const locationCount = header.location_count;
  const locationsOffset = ALIGNEDLOCATIONDATABASEHEADER_SIZE;
  const locations = new AlignedLocationArrayView(buffer, locationsOffset, locationCount);

  return { header, locations };
}

/**
 * Create a new location database buffer
 */
export function createLocationDatabase(locationCount: number): {
  buffer: ArrayBuffer;
  header: AlignedLocationDatabaseHeaderView;
  locations: AlignedLocationArrayView;
} {
  const totalSize = ALIGNEDLOCATIONDATABASEHEADER_SIZE + (locationCount * ALIGNEDLOCATION_SIZE);
  const buffer = new ArrayBuffer(totalSize);

  const header = new AlignedLocationDatabaseHeaderView(buffer, 0);
  initHeader(header, locationCount);

  const locations = new AlignedLocationArrayView(buffer, ALIGNEDLOCATIONDATABASEHEADER_SIZE, locationCount);

  return { buffer, header, locations };
}

/**
 * Search for a location by name (case-insensitive)
 */
export function findLocation(
  locations: AlignedLocationArrayView,
  searchName: string
): AlignedLocationView | null {
  const normalized = normalizeLocationName(searchName);

  for (const loc of locations) {
    const name = normalizeLocationName(getLocationName(loc));
    if (name === normalized) {
      return loc;
    }
  }

  return null;
}

/**
 * Normalize a location name for comparison
 */
export function normalizeLocationName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^\w\s]/g, '') // Remove punctuation
    .replace(/\s+/g, ' ')    // Normalize whitespace
    .trim();
}

/**
 * Get all locations matching a type
 */
export function findLocationsByType(
  locations: AlignedLocationArrayView,
  type: number
): AlignedLocationView[] {
  const results: AlignedLocationView[] = [];
  for (const loc of locations) {
    if ((loc.type & type) !== 0) {
      results.push(loc);
    }
  }
  return results;
}

// Re-export types for convenience
export {
  AlignedLocationView,
  AlignedLocationArrayView,
  AlignedLocationDatabaseHeaderView,
  ALIGNEDLOCATION_SIZE,
  ALIGNEDLOCATIONDATABASEHEADER_SIZE,
};
