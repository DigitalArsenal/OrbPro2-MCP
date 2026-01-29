/**
 * HTTP Client Implementation for Emscripten
 *
 * Uses the Emscripten Fetch API to make HTTP requests from WebAssembly.
 * Supports both synchronous and asynchronous requests.
 */

#include "http_client.h"
#include <cstring>
#include <cstdio>
#include <cstdlib>

#ifdef __EMSCRIPTEN__
#include <emscripten/fetch.h>
#include <emscripten/emscripten.h>
#endif

namespace cesium {
namespace mcp {

// Static response buffer for sync requests
static char s_response_buffer[MAX_HTTP_RESPONSE_SIZE];
static int s_status_code = 0;
static size_t s_response_length = 0;
static bool s_request_complete = false;
static bool s_request_success = false;

void http_init() {
    // Nothing to initialize for Emscripten Fetch
}

#ifdef __EMSCRIPTEN__

// Callback for successful fetch
static void fetch_success(emscripten_fetch_t* fetch) {
    s_status_code = fetch->status;
    s_response_length = fetch->numBytes;
    s_request_success = true;

    if (s_response_length >= MAX_HTTP_RESPONSE_SIZE) {
        s_response_length = MAX_HTTP_RESPONSE_SIZE - 1;
    }

    memcpy(s_response_buffer, fetch->data, s_response_length);
    s_response_buffer[s_response_length] = '\0';

    s_request_complete = true;
    emscripten_fetch_close(fetch);
}

// Callback for failed fetch
static void fetch_error(emscripten_fetch_t* fetch) {
    s_status_code = fetch->status;
    s_response_length = 0;
    s_request_success = false;
    s_response_buffer[0] = '\0';
    s_request_complete = true;
    emscripten_fetch_close(fetch);
}

size_t http_get(const char* url, char* response, size_t response_size, int* status_code) {
    if (!url || !response || response_size == 0) {
        return 0;
    }

    // Reset state
    s_request_complete = false;
    s_request_success = false;
    s_response_length = 0;
    s_status_code = 0;

    emscripten_fetch_attr_t attr;
    emscripten_fetch_attr_init(&attr);
    strcpy(attr.requestMethod, "GET");
    attr.attributes = EMSCRIPTEN_FETCH_LOAD_TO_MEMORY | EMSCRIPTEN_FETCH_SYNCHRONOUS;
    attr.onsuccess = fetch_success;
    attr.onerror = fetch_error;

    emscripten_fetch_t* fetch = emscripten_fetch(&attr, url);

    // With SYNCHRONOUS flag and ASYNCIFY, this blocks until complete
    if (fetch) {
        s_status_code = fetch->status;
        if (fetch->numBytes > 0) {
            s_response_length = fetch->numBytes;
            if (s_response_length >= response_size) {
                s_response_length = response_size - 1;
            }
            memcpy(response, fetch->data, s_response_length);
            response[s_response_length] = '\0';
            s_request_success = (fetch->status >= 200 && fetch->status < 300);
        } else {
            response[0] = '\0';
            s_response_length = 0;
        }
        emscripten_fetch_close(fetch);
    }

    if (status_code) {
        *status_code = s_status_code;
    }

    return s_request_success ? s_response_length : 0;
}

size_t http_post(const char* url, const char* body, const char* content_type,
                 char* response, size_t response_size, int* status_code) {
    if (!url || !response || response_size == 0) {
        return 0;
    }

    // Reset state
    s_request_complete = false;
    s_request_success = false;
    s_response_length = 0;
    s_status_code = 0;

    emscripten_fetch_attr_t attr;
    emscripten_fetch_attr_init(&attr);
    strcpy(attr.requestMethod, "POST");
    attr.attributes = EMSCRIPTEN_FETCH_LOAD_TO_MEMORY | EMSCRIPTEN_FETCH_SYNCHRONOUS;
    attr.onsuccess = fetch_success;
    attr.onerror = fetch_error;

    // Set request body
    if (body) {
        attr.requestData = body;
        attr.requestDataSize = strlen(body);
    }

    // Set headers
    const char* headers[] = {
        "Content-Type", content_type ? content_type : "application/json",
        nullptr
    };
    attr.requestHeaders = headers;

    emscripten_fetch_t* fetch = emscripten_fetch(&attr, url);

    if (fetch) {
        s_status_code = fetch->status;
        if (fetch->numBytes > 0) {
            s_response_length = fetch->numBytes;
            if (s_response_length >= response_size) {
                s_response_length = response_size - 1;
            }
            memcpy(response, fetch->data, s_response_length);
            response[s_response_length] = '\0';
            s_request_success = (fetch->status >= 200 && fetch->status < 300);
        } else {
            response[0] = '\0';
            s_response_length = 0;
        }
        emscripten_fetch_close(fetch);
    }

    if (status_code) {
        *status_code = s_status_code;
    }

    return s_request_success ? s_response_length : 0;
}

#else

// Native stubs for testing
size_t http_get(const char* url, char* response, size_t response_size, int* status_code) {
    (void)url;
    if (response && response_size > 0) {
        response[0] = '\0';
    }
    if (status_code) {
        *status_code = 0;
    }
    return 0;
}

size_t http_post(const char* url, const char* body, const char* content_type,
                 char* response, size_t response_size, int* status_code) {
    (void)url;
    (void)body;
    (void)content_type;
    if (response && response_size > 0) {
        response[0] = '\0';
    }
    if (status_code) {
        *status_code = 0;
    }
    return 0;
}

#endif

// URL encoding
size_t url_encode(const char* input, char* output, size_t output_size) {
    if (!input || !output || output_size == 0) {
        return 0;
    }

    static const char* hex = "0123456789ABCDEF";
    size_t pos = 0;

    for (const char* p = input; *p && pos < output_size - 3; ++p) {
        char c = *p;
        if ((c >= 'A' && c <= 'Z') ||
            (c >= 'a' && c <= 'z') ||
            (c >= '0' && c <= '9') ||
            c == '-' || c == '_' || c == '.' || c == '~') {
            output[pos++] = c;
        } else if (c == ' ') {
            output[pos++] = '+';
        } else {
            output[pos++] = '%';
            output[pos++] = hex[(unsigned char)c >> 4];
            output[pos++] = hex[(unsigned char)c & 0x0F];
        }
    }

    output[pos] = '\0';
    return pos;
}

size_t build_url_with_params(const char* base_url, const char* const* params,
                             char* output, size_t output_size) {
    if (!base_url || !output || output_size == 0) {
        return 0;
    }

    size_t pos = 0;
    size_t base_len = strlen(base_url);

    if (base_len >= output_size) {
        return 0;
    }

    memcpy(output, base_url, base_len);
    pos = base_len;

    if (params && params[0]) {
        output[pos++] = '?';

        bool first = true;
        for (int i = 0; params[i] && params[i + 1]; i += 2) {
            if (!first && pos < output_size - 1) {
                output[pos++] = '&';
            }
            first = false;

            // Add key
            size_t key_len = strlen(params[i]);
            if (pos + key_len >= output_size - 1) break;
            memcpy(output + pos, params[i], key_len);
            pos += key_len;

            output[pos++] = '=';

            // Add encoded value
            char encoded[1024];
            url_encode(params[i + 1], encoded, sizeof(encoded));
            size_t val_len = strlen(encoded);
            if (pos + val_len >= output_size - 1) break;
            memcpy(output + pos, encoded, val_len);
            pos += val_len;
        }
    }

    output[pos] = '\0';
    return pos;
}

// ============================================================================
// OpenRouteService API (uses Vite proxy to avoid CORS)
// ============================================================================

size_t ors_get_directions(const char* api_key,
                          double start_lon, double start_lat,
                          double end_lon, double end_lat,
                          const char* profile,
                          char* response, size_t response_size) {
    if (!api_key || !profile || !response || response_size == 0) {
        return 0;
    }

    // Build URL using Vite proxy path to avoid CORS
    // Proxy: /api/ors -> https://api.openrouteservice.org
    char url[2048];
    snprintf(url, sizeof(url),
             "/api/ors/v2/directions/%s?api_key=%s&start=%f,%f&end=%f,%f",
             profile, api_key, start_lon, start_lat, end_lon, end_lat);

    int status;
    return http_get(url, response, response_size, &status);
}

size_t ors_get_isochrone(const char* api_key,
                         double lon, double lat,
                         int range_seconds,
                         const char* profile,
                         char* response, size_t response_size) {
    if (!api_key || !profile || !response || response_size == 0) {
        return 0;
    }

    // Build POST body for isochrones
    // API: POST https://api.openrouteservice.org/v2/isochrones/{profile}
    char body[512];
    snprintf(body, sizeof(body),
             "{\"locations\":[[%f,%f]],\"range\":[%d]}",
             lon, lat, range_seconds);

    // Use Vite proxy path
    char url[512];
    snprintf(url, sizeof(url),
             "/api/ors/v2/isochrones/%s?api_key=%s",
             profile, api_key);

    int status;
    return http_post(url, body, "application/json", response, response_size, &status);
}

// ============================================================================
// Overpass API (OpenStreetMap POI Search)
// ============================================================================

size_t overpass_search_poi(const char* category,
                           double center_lon, double center_lat,
                           double radius_meters,
                           char* response, size_t response_size) {
    if (!category || !response || response_size == 0) {
        return 0;
    }

    // Build Overpass QL query
    // Search for nodes, ways, and relations with the given amenity around a point
    char query[1024];
    snprintf(query, sizeof(query),
             "[out:json][timeout:25];"
             "("
             "  node[\"amenity\"=\"%s\"](around:%f,%f,%f);"
             "  way[\"amenity\"=\"%s\"](around:%f,%f,%f);"
             "  relation[\"amenity\"=\"%s\"](around:%f,%f,%f);"
             ");"
             "out center;",
             category, radius_meters, center_lat, center_lon,
             category, radius_meters, center_lat, center_lon,
             category, radius_meters, center_lat, center_lon);

    return overpass_query(query, response, response_size);
}

size_t overpass_query(const char* query, char* response, size_t response_size) {
    if (!query || !response || response_size == 0) {
        return 0;
    }

    // URL encode the query
    char encoded_query[4096];
    url_encode(query, encoded_query, sizeof(encoded_query));

    // Build URL using Vite proxy path
    char url[8192];
    snprintf(url, sizeof(url),
             "/api/overpass/api/interpreter?data=%s",
             encoded_query);

    int status;
    return http_get(url, response, response_size, &status);
}

// ============================================================================
// Nominatim API (Geocoding)
// ============================================================================

size_t nominatim_geocode(const char* query, char* response, size_t response_size) {
    if (!query || !response || response_size == 0) {
        return 0;
    }

    char encoded_query[512];
    url_encode(query, encoded_query, sizeof(encoded_query));

    // Build URL using Vite proxy path (handles CORS and User-Agent)
    char url[1024];
    snprintf(url, sizeof(url),
             "/api/nominatim/search?q=%s&format=json&limit=5",
             encoded_query);

    int status;
    return http_get(url, response, response_size, &status);
}

size_t nominatim_reverse(double lon, double lat, char* response, size_t response_size) {
    if (!response || response_size == 0) {
        return 0;
    }

    // Use Vite proxy path
    char url[512];
    snprintf(url, sizeof(url),
             "/api/nominatim/reverse?lat=%f&lon=%f&format=json",
             lat, lon);

    int status;
    return http_get(url, response, response_size, &status);
}

// ============================================================================
// OSRM (Open Source Routing Machine) - Self-hosted routing
// ============================================================================

// Cached OSRM availability status
static bool s_osrm_checked = false;
static bool s_osrm_available = false;

bool osrm_is_available() {
    if (s_osrm_checked) {
        return s_osrm_available;
    }

    // Try a simple request to check if OSRM is running
    char response[256];
    int status;
    size_t len = http_get("/api/osrm/health", response, sizeof(response), &status);

    s_osrm_checked = true;
    s_osrm_available = (len > 0 || status == 200);

    return s_osrm_available;
}

size_t osrm_get_directions(double start_lon, double start_lat,
                           double end_lon, double end_lat,
                           const char* profile,
                           char* response, size_t response_size) {
    if (!profile || !response || response_size == 0) {
        return 0;
    }

    // Map profile names to OSRM profiles
    // ORS uses: foot-walking, driving-car, cycling-regular
    // OSRM uses: foot, car, bike (or whatever was compiled)
    const char* osrm_profile = "driving";
    if (strstr(profile, "walk") || strstr(profile, "foot")) {
        osrm_profile = "foot";
    } else if (strstr(profile, "cycl") || strstr(profile, "bike")) {
        osrm_profile = "bike";
    } else if (strstr(profile, "driv") || strstr(profile, "car")) {
        osrm_profile = "driving";
    }

    // OSRM route API: /route/v1/{profile}/{lon},{lat};{lon},{lat}
    // Returns JSON with routes array containing geometry in polyline format
    char url[1024];
    snprintf(url, sizeof(url),
             "/api/osrm/route/v1/%s/%f,%f;%f,%f?overview=full&geometries=geojson&steps=true",
             osrm_profile, start_lon, start_lat, end_lon, end_lat);

    int status;
    size_t len = http_get(url, response, response_size, &status);

    if (len == 0 || status != 200) {
        return 0;
    }

    return len;
}

}  // namespace mcp
}  // namespace cesium
