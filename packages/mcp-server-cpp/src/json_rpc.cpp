/**
 * JSON-RPC Message Handling Implementation
 */

#include "json_rpc.h"
#include <cstring>
#include <cstdio>
#include <cstdlib>

namespace cesium {
namespace mcp {

// Skip whitespace in JSON
static const char* skip_whitespace(const char* json) {
    while (*json && (*json == ' ' || *json == '\t' || *json == '\n' || *json == '\r')) {
        json++;
    }
    return json;
}

// Find a key in JSON and return pointer to value start
static const char* find_json_key(const char* json, const char* key) {
    char search_key[256];
    snprintf(search_key, sizeof(search_key), "\"%s\"", key);
    size_t key_len = strlen(search_key);

    const char* pos = json;
    while ((pos = strstr(pos, search_key)) != nullptr) {
        // Make sure it's actually a key (preceded by { or , or whitespace)
        if (pos > json) {
            const char* before = pos - 1;
            while (before > json && (*before == ' ' || *before == '\t' || *before == '\n' || *before == '\r')) {
                before--;
            }
            if (*before != '{' && *before != ',') {
                pos++;
                continue;
            }
        }

        // Find the colon after the key
        const char* colon = pos + key_len;
        colon = skip_whitespace(colon);
        if (*colon == ':') {
            return skip_whitespace(colon + 1);
        }
        pos++;
    }
    return nullptr;
}

bool json_get_string(const char* json, const char* key, char* value, size_t value_size) {
    if (value_size == 0) return false;
    value[0] = '\0';

    const char* val_start = find_json_key(json, key);
    if (!val_start || *val_start != '"') {
        return false;
    }

    val_start++;  // Skip opening quote
    size_t i = 0;
    bool escaped = false;

    while (*val_start && i < value_size - 1) {
        if (escaped) {
            switch (*val_start) {
                case 'n': value[i++] = '\n'; break;
                case 'r': value[i++] = '\r'; break;
                case 't': value[i++] = '\t'; break;
                case '\\': value[i++] = '\\'; break;
                case '"': value[i++] = '"'; break;
                default: value[i++] = *val_start; break;
            }
            escaped = false;
        } else if (*val_start == '\\') {
            escaped = true;
        } else if (*val_start == '"') {
            break;
        } else {
            value[i++] = *val_start;
        }
        val_start++;
    }

    value[i] = '\0';
    return true;
}

bool json_get_number(const char* json, const char* key, double& value) {
    const char* val_start = find_json_key(json, key);
    if (!val_start) return false;

    // Handle null
    if (strncmp(val_start, "null", 4) == 0) {
        return false;
    }

    char* end;
    value = strtod(val_start, &end);
    return end != val_start;
}

bool json_get_int(const char* json, const char* key, int64_t& value) {
    const char* val_start = find_json_key(json, key);
    if (!val_start) return false;

    // Handle null
    if (strncmp(val_start, "null", 4) == 0) {
        return false;
    }

    // Handle string ID (quoted number)
    if (*val_start == '"') {
        val_start++;
    }

    char* end;
    value = strtoll(val_start, &end, 10);
    return end != val_start;
}

bool json_get_object(const char* json, const char* key, char* value, size_t value_size) {
    if (value_size == 0) return false;
    value[0] = '\0';

    const char* val_start = find_json_key(json, key);
    if (!val_start) return false;

    // Handle null
    if (strncmp(val_start, "null", 4) == 0) {
        strcpy(value, "null");
        return true;
    }

    if (*val_start != '{') {
        return false;
    }

    // Find matching closing brace
    int depth = 1;
    const char* pos = val_start + 1;
    bool in_string = false;
    bool escaped = false;

    while (*pos && depth > 0) {
        if (in_string) {
            if (escaped) {
                escaped = false;
            } else if (*pos == '\\') {
                escaped = true;
            } else if (*pos == '"') {
                in_string = false;
            }
        } else {
            if (*pos == '"') {
                in_string = true;
            } else if (*pos == '{') {
                depth++;
            } else if (*pos == '}') {
                depth--;
            }
        }
        pos++;
    }

    size_t obj_len = pos - val_start;
    if (obj_len >= value_size) {
        obj_len = value_size - 1;
    }

    memcpy(value, val_start, obj_len);
    value[obj_len] = '\0';
    return true;
}

size_t json_escape_string(const char* input, char* output, size_t output_size) {
    if (output_size == 0) return 0;

    size_t i = 0;
    size_t j = 0;

    while (input[i] && j < output_size - 1) {
        char c = input[i++];
        switch (c) {
            case '"':
                if (j + 2 > output_size - 1) goto done;
                output[j++] = '\\';
                output[j++] = '"';
                break;
            case '\\':
                if (j + 2 > output_size - 1) goto done;
                output[j++] = '\\';
                output[j++] = '\\';
                break;
            case '\n':
                if (j + 2 > output_size - 1) goto done;
                output[j++] = '\\';
                output[j++] = 'n';
                break;
            case '\r':
                if (j + 2 > output_size - 1) goto done;
                output[j++] = '\\';
                output[j++] = 'r';
                break;
            case '\t':
                if (j + 2 > output_size - 1) goto done;
                output[j++] = '\\';
                output[j++] = 't';
                break;
            default:
                if (c < 32) {
                    // Control character - encode as \uXXXX
                    if (j + 6 > output_size - 1) goto done;
                    j += snprintf(output + j, output_size - j, "\\u%04x", (unsigned char)c);
                } else {
                    output[j++] = c;
                }
                break;
        }
    }

done:
    output[j] = '\0';
    return j;
}

size_t create_success_response(const char* id, const char* result, char* output, size_t output_size) {
    return snprintf(output, output_size,
                    "{\"jsonrpc\":\"%s\",\"id\":%s,\"result\":%s}",
                    JSONRPC_VERSION, id, result);
}

size_t create_error_response(const char* id, ErrorCode code, const char* message,
                             char* output, size_t output_size) {
    char escaped_msg[1024];
    json_escape_string(message, escaped_msg, sizeof(escaped_msg));

    return snprintf(output, output_size,
                    "{\"jsonrpc\":\"%s\",\"id\":%s,\"error\":{\"code\":%d,\"message\":\"%s\"}}",
                    JSONRPC_VERSION, id, static_cast<int>(code), escaped_msg);
}

size_t format_tool_result(const char* text, bool is_error, char* output, size_t output_size) {
    char escaped_text[32768];
    json_escape_string(text, escaped_text, sizeof(escaped_text));

    if (is_error) {
        return snprintf(output, output_size,
                        "{\"content\":[{\"type\":\"text\",\"text\":\"%s\"}],\"isError\":true}",
                        escaped_text);
    }
    return snprintf(output, output_size,
                    "{\"content\":[{\"type\":\"text\",\"text\":\"%s\"}]}",
                    escaped_text);
}

}  // namespace mcp
}  // namespace cesium
