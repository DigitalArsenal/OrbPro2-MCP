#pragma once
/**
 * HTTP Client for Emscripten
 *
 * Provides HTTP request capabilities using the Emscripten Fetch API.
 * Enables the MCP server to call external APIs (routing, POI search, etc.)
 */

#include <cstddef>
#include <cstdint>
#include <functional>

namespace cesium {
namespace mcp {

// Maximum response size for HTTP requests (1MB)
constexpr size_t MAX_HTTP_RESPONSE_SIZE = 1048576;

// HTTP request timeout in milliseconds
constexpr uint32_t DEFAULT_TIMEOUT_MS = 30000;

// HTTP methods
enum class HttpMethod {
    GET,
    POST,
    PUT,
    DELETE_
};

// HTTP response status
struct HttpResponse {
    int status_code;           // HTTP status code (200, 404, etc.)
    const char* data;          // Response body (null-terminated)
    size_t data_length;        // Response body length
    bool success;              // True if request completed without network error
    const char* error_message; // Error message if success is false
};

// Callback type for async requests
using HttpCallback = std::function<void(const HttpResponse&)>;

/**
 * Initialize the HTTP client
 * Must be called before making any requests
 */
void http_init();

/**
 * Make a synchronous HTTP GET request
 * Note: This blocks the calling thread until the request completes
 *
 * @param url Full URL to request
 * @param response Output buffer for response body
 * @param response_size Size of output buffer
 * @param status_code Output for HTTP status code
 * @return Number of bytes written to response, 0 on error
 */
size_t http_get(const char* url, char* response, size_t response_size, int* status_code);

/**
 * Make a synchronous HTTP POST request
 *
 * @param url Full URL to request
 * @param body Request body (JSON, form data, etc.)
 * @param content_type Content-Type header value
 * @param response Output buffer for response body
 * @param response_size Size of output buffer
 * @param status_code Output for HTTP status code
 * @return Number of bytes written to response, 0 on error
 */
size_t http_post(const char* url, const char* body, const char* content_type,
                 char* response, size_t response_size, int* status_code);

/**
 * Make an async HTTP GET request
 *
 * @param url Full URL to request
 * @param callback Function to call when request completes
 */
void http_get_async(const char* url, HttpCallback callback);

/**
 * Make an async HTTP POST request
 *
 * @param url Full URL to request
 * @param body Request body
 * @param content_type Content-Type header value
 * @param callback Function to call when request completes
 */
void http_post_async(const char* url, const char* body, const char* content_type,
                     HttpCallback callback);

/**
 * URL encode a string
 *
 * @param input String to encode
 * @param output Output buffer
 * @param output_size Size of output buffer
 * @return Number of characters written
 */
size_t url_encode(const char* input, char* output, size_t output_size);

/**
 * Build a URL with query parameters
 *
 * @param base_url Base URL
 * @param params Array of key-value pairs (null-terminated)
 * @param output Output buffer
 * @param output_size Size of output buffer
 * @return Number of characters written
 */
size_t build_url_with_params(const char* base_url, const char* const* params,
                             char* output, size_t output_size);

// ============================================================================
// API-Specific Functions
// ============================================================================

/**
 * OpenRouteService: Get walking/driving/cycling directions
 *
 * @param api_key ORS API key
 * @param start_lon Starting longitude
 * @param start_lat Starting latitude
 * @param end_lon Ending longitude
 * @param end_lat Ending latitude
 * @param profile Transport mode: "foot-walking", "cycling-regular", "driving-car"
 * @param response Output buffer for route GeoJSON
 * @param response_size Size of output buffer
 * @return Number of bytes written, 0 on error
 */
size_t ors_get_directions(const char* api_key,
                          double start_lon, double start_lat,
                          double end_lon, double end_lat,
                          const char* profile,
                          char* response, size_t response_size);

/**
 * OpenRouteService: Get isochrone (reachable area)
 *
 * @param api_key ORS API key
 * @param lon Center longitude
 * @param lat Center latitude
 * @param range_seconds Time range in seconds
 * @param profile Transport mode
 * @param response Output buffer for isochrone GeoJSON
 * @param response_size Size of output buffer
 * @return Number of bytes written, 0 on error
 */
size_t ors_get_isochrone(const char* api_key,
                         double lon, double lat,
                         int range_seconds,
                         const char* profile,
                         char* response, size_t response_size);

/**
 * Overpass API: Search for POIs by category
 *
 * @param category OSM amenity type (restaurant, hospital, park, etc.)
 * @param center_lon Search center longitude
 * @param center_lat Search center latitude
 * @param radius_meters Search radius in meters
 * @param response Output buffer for results JSON
 * @param response_size Size of output buffer
 * @return Number of bytes written, 0 on error
 */
size_t overpass_search_poi(const char* category,
                           double center_lon, double center_lat,
                           double radius_meters,
                           char* response, size_t response_size);

/**
 * Overpass API: Search for POIs with custom query
 *
 * @param query Custom Overpass QL query
 * @param response Output buffer for results JSON
 * @param response_size Size of output buffer
 * @return Number of bytes written, 0 on error
 */
size_t overpass_query(const char* query, char* response, size_t response_size);

/**
 * Nominatim: Forward geocoding (address to coordinates)
 *
 * @param query Address or place name
 * @param response Output buffer for results JSON
 * @param response_size Size of output buffer
 * @return Number of bytes written, 0 on error
 */
size_t nominatim_geocode(const char* query, char* response, size_t response_size);

/**
 * Nominatim: Reverse geocoding (coordinates to address)
 *
 * @param lon Longitude
 * @param lat Latitude
 * @param response Output buffer for results JSON
 * @param response_size Size of output buffer
 * @return Number of bytes written, 0 on error
 */
size_t nominatim_reverse(double lon, double lat, char* response, size_t response_size);

// ============================================================================
// OSRM (Open Source Routing Machine) - Self-hosted routing
// ============================================================================

/**
 * OSRM: Get directions (requires local OSRM server on port 5000)
 *
 * @param start_lon Starting longitude
 * @param start_lat Starting latitude
 * @param end_lon Ending longitude
 * @param end_lat Ending latitude
 * @param profile Transport mode: "driving", "walking", "cycling"
 * @param response Output buffer for route GeoJSON
 * @param response_size Size of output buffer
 * @return Number of bytes written, 0 on error
 */
size_t osrm_get_directions(double start_lon, double start_lat,
                           double end_lon, double end_lat,
                           const char* profile,
                           char* response, size_t response_size);

/**
 * Check if OSRM server is available
 *
 * @return true if OSRM is responding, false otherwise
 */
bool osrm_is_available();

}  // namespace mcp
}  // namespace cesium
