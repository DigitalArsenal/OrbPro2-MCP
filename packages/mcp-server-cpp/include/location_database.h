#pragma once
/**
 * Location Database for Cesium MCP Server
 *
 * Provides deterministic location resolution from place names to coordinates.
 * Includes cities, landmarks, airports, and colloquial names.
 */

#include <cstddef>
#include <cstring>

namespace cesium {
namespace mcp {

struct Location {
  const char* name;
  double longitude;
  double latitude;
  double heading;     // Orientation in degrees (0=North, 90=East), -1 = not set
  int population;     // Population count, 0 = unknown
};

/**
 * Resolve a location name to coordinates
 * @param name Location name (case-insensitive)
 * @param longitude Output: longitude in degrees
 * @param latitude Output: latitude in degrees
 * @param heading Output: heading in degrees (0=North, 90=East), -1 if not set
 * @return true if location found, false otherwise
 */
bool resolve_location(const char* name, double& longitude, double& latitude, double& heading);

/**
 * Get all known locations
 * @return Pointer to array of Location structs
 */
const Location* get_all_locations();

/**
 * Get count of known locations
 * @return Number of locations in database
 */
size_t get_location_count();

/**
 * Search for locations matching a prefix
 * @param prefix Prefix to search for
 * @param results Output array of matching locations
 * @param max_results Maximum number of results to return
 * @return Number of matching locations found
 */
size_t search_locations(const char* prefix, const Location** results, size_t max_results);

/**
 * Normalize a location name for lookup (lowercase, trim whitespace)
 * @param input Input string
 * @param output Output buffer (must be at least as large as input)
 * @param output_size Size of output buffer
 */
void normalize_location_name(const char* input, char* output, size_t output_size);

/**
 * Fuzzy search for a location name using Levenshtein distance
 * Efficiently finds close matches when exact matching fails
 * @param name Location name to search for (case-insensitive)
 * @param longitude Output: longitude in degrees (if found)
 * @param latitude Output: latitude in degrees (if found)
 * @param heading Output: heading in degrees (if found)
 * @param max_distance Maximum edit distance to consider a match (default: 3)
 * @return true if a close match found, false otherwise
 */
bool fuzzy_resolve_location(const char* name, double& longitude, double& latitude,
                            double& heading, int max_distance = 3);

/**
 * Fuzzy search returning multiple candidates with scores
 * @param name Location name to search for
 * @param results Output array of matching locations
 * @param scores Output array of match scores (lower = better match)
 * @param max_results Maximum number of results to return
 * @param max_distance Maximum edit distance to consider
 * @return Number of matches found
 */
size_t fuzzy_search_locations(const char* name, const Location** results,
                              int* scores, size_t max_results, int max_distance = 3);

/**
 * Calculate Levenshtein edit distance between two strings
 * Uses early termination when distance exceeds threshold for efficiency
 * @param s1 First string
 * @param s2 Second string
 * @param max_distance Maximum distance before early termination (-1 = no limit)
 * @return Edit distance, or max_distance+1 if exceeded threshold
 */
int levenshtein_distance(const char* s1, const char* s2, int max_distance = -1);

/**
 * Check if string contains another string (substring match)
 * @param haystack String to search in
 * @param needle String to search for
 * @return true if needle is found in haystack
 */
bool contains_substring(const char* haystack, const char* needle);

/**
 * Get top cities sorted by population
 * @param results Output array of location pointers
 * @param max_results Maximum number of results to return
 * @param min_population Minimum population threshold (default: 0)
 * @return Number of cities found
 */
size_t get_top_cities_by_population(const Location** results, size_t max_results,
                                     int min_population = 0);

/**
 * Get total number of cities with known population
 * @return Count of cities with population > 0
 */
size_t get_cities_with_population_count();

}  // namespace mcp
}  // namespace cesium
