/**
 * Cesium MCP Server Implementation
 */

#include "mcp_server.h"
#include "json_rpc.h"
#include "location_database.h"
#include "cesium_commands.h"

#include <cstring>
#include <cstdio>
#include <cmath>

namespace cesium {
namespace mcp {

// Static response buffer
static char response_buffer[MAX_RESPONSE_SIZE];
static char tools_buffer[MAX_TOOLS_SIZE];

// Entity ID counter for generating unique IDs
static int entity_counter = 1;

// Current camera state (updated from JS side)
static double camera_longitude = 0.0;
static double camera_latitude = 0.0;
static double camera_height = 10000000.0;
static double camera_target_longitude = 0.0;  // Where camera is looking at ground
static double camera_target_latitude = 0.0;
static bool camera_state_valid = false;

// Tool definitions JSON (using custom delimiter to avoid issues with parentheses)
static const char* TOOL_DEFINITIONS = R"JSON([
  {"name":"flyTo","description":"Fly the camera to a specific geographic location","inputSchema":{"type":"object","properties":{"longitude":{"type":"number","minimum":-180,"maximum":180},"latitude":{"type":"number","minimum":-90,"maximum":90},"height":{"type":"number"},"duration":{"type":"number"}},"required":["longitude","latitude"]}},
  {"name":"lookAt","description":"Orient the camera to look at a specific location","inputSchema":{"type":"object","properties":{"longitude":{"type":"number"},"latitude":{"type":"number"},"range":{"type":"number"}},"required":["longitude","latitude"]}},
  {"name":"zoom","description":"Zoom the camera in or out","inputSchema":{"type":"object","properties":{"amount":{"type":"number"}},"required":["amount"]}},
  {"name":"addPoint","description":"Add a point marker. Use 'location' for named places or longitude/latitude for coordinates.","inputSchema":{"type":"object","properties":{"location":{"type":"string","description":"Named location (e.g. 'statue of liberty')"},"longitude":{"type":"number"},"latitude":{"type":"number"},"name":{"type":"string"},"color":{"type":"string"}}}},
  {"name":"addLabel","description":"Add a text label","inputSchema":{"type":"object","properties":{"longitude":{"type":"number"},"latitude":{"type":"number"},"text":{"type":"string"}},"required":["longitude","latitude","text"]}},
  {"name":"addSphere","description":"Add a 3D sphere/orb. Use 'location' for named places. Radius should be 10-500 meters for most uses.","inputSchema":{"type":"object","properties":{"location":{"type":"string","description":"Named location (e.g. 'statue of liberty')"},"longitude":{"type":"number"},"latitude":{"type":"number"},"height":{"type":"number","description":"Height above ground in meters (0-1000)","maximum":1000},"radius":{"type":"number","description":"Radius in meters (10-500 typical)","minimum":1,"maximum":1000},"color":{"type":"string"},"name":{"type":"string"}}}},
  {"name":"addBox","description":"Add a 3D box","inputSchema":{"type":"object","properties":{"longitude":{"type":"number"},"latitude":{"type":"number"},"dimensions":{"type":"object"},"color":{"type":"string"}},"required":["longitude","latitude","dimensions"]}},
  {"name":"addCylinder","description":"Add a 3D cylinder","inputSchema":{"type":"object","properties":{"longitude":{"type":"number"},"latitude":{"type":"number"},"topRadius":{"type":"number"},"bottomRadius":{"type":"number"},"cylinderHeight":{"type":"number"}},"required":["longitude","latitude","cylinderHeight"]}},
  {"name":"removeEntity","description":"Remove an entity by ID","inputSchema":{"type":"object","properties":{"id":{"type":"string"}},"required":["id"]}},
  {"name":"clearAll","description":"Remove all entities","inputSchema":{"type":"object","properties":{}}},
  {"name":"resolveLocation","description":"Resolve a location name to coordinates","inputSchema":{"type":"object","properties":{"location":{"type":"string"}},"required":["location"]}},
  {"name":"listLocations","description":"List known locations","inputSchema":{"type":"object","properties":{"prefix":{"type":"string"}}}},
  {"name":"getTopCitiesByPopulation","description":"Get data about most populous cities. Returns data only, no visualization.","inputSchema":{"type":"object","properties":{"count":{"type":"number","description":"Number of cities to return (default: 10, max: 100)"},"minPopulation":{"type":"number","description":"Minimum population threshold (default: 0)"}}}},
  {"name":"showTopCitiesByPopulation","description":"VISUALIZE the most populous cities on the map. Creates circles OR 3D bar rectangles sized/heighted by population. Use this when user wants to SEE/SHOW biggest cities.","inputSchema":{"type":"object","properties":{"count":{"type":"number","description":"Number of cities to show (default: 10, max: 100)"},"color":{"type":"string","description":"Color (default: cyan)"},"shape":{"type":"string","description":"Shape: 'circle' (flat circles) or 'rectangle' (3D bars with extruded height). Default: circle"},"baseSize":{"type":"number","description":"Base size in meters for rectangles (default: 50000 = 50km)"},"minRadius":{"type":"number","description":"Min radius in meters for circles (default: 10000)"},"maxRadius":{"type":"number","description":"Max radius in meters for circles (default: 200000)"},"minHeight":{"type":"number","description":"Min extruded height in meters for rectangles (default: 10000)"},"maxHeight":{"type":"number","description":"Max extruded height in meters for rectangles (default: 500000)"}}}},
  {"name":"flyToLocation","description":"Fly camera to a named location. Height 1000-50000m typical.","inputSchema":{"type":"object","properties":{"location":{"type":"string"},"height":{"type":"number","description":"Camera height in meters (1000-50000 typical)","minimum":100,"maximum":100000},"duration":{"type":"number","description":"Flight duration in seconds (1-5)"}},"required":["location"]}},
  {"name":"addSphereAtLocation","description":"Add sphere at named location. Radius 10-500m typical.","inputSchema":{"type":"object","properties":{"location":{"type":"string"},"radius":{"type":"number","description":"Radius in meters (10-500 typical)","minimum":1,"maximum":1000},"height":{"type":"number","description":"Height above ground (0-1000m)","maximum":1000},"color":{"type":"string"}},"required":["location"]}},
  {"name":"addBoxAtLocation","description":"Add box at named location. Auto-uses database heading if available; override with heading param (0=North, 90=East).","inputSchema":{"type":"object","properties":{"location":{"type":"string"},"dimensionX":{"type":"number"},"dimensionY":{"type":"number"},"dimensionZ":{"type":"number"},"color":{"type":"string"},"heading":{"type":"number"}},"required":["location"]}},
  {"name":"addPointAtLocation","description":"Add point at named location","inputSchema":{"type":"object","properties":{"location":{"type":"string"},"color":{"type":"string"}},"required":["location"]}},
  {"name":"addLabelAtLocation","description":"Add label at named location","inputSchema":{"type":"object","properties":{"location":{"type":"string"},"text":{"type":"string"}},"required":["location","text"]}},
  {"name":"rotateEntity","description":"Rotate an entity by heading (degrees). 0=North, 90=East, 180=South, 270=West.","inputSchema":{"type":"object","properties":{"id":{"type":"string"},"heading":{"type":"number"}},"required":["id","heading"]}},
  {"name":"resizeEntity","description":"Resize an entity by scale factor (1.0=current, 2.0=double, 0.5=half) or by specific dimensions","inputSchema":{"type":"object","properties":{"id":{"type":"string"},"scale":{"type":"number"},"dimensionX":{"type":"number"},"dimensionY":{"type":"number"},"dimensionZ":{"type":"number"}},"required":["id"]}},
  {"name":"moveEntity","description":"Move an entity to new coordinates or by offset","inputSchema":{"type":"object","properties":{"id":{"type":"string"},"longitude":{"type":"number"},"latitude":{"type":"number"},"height":{"type":"number"},"offsetX":{"type":"number"},"offsetY":{"type":"number"},"offsetZ":{"type":"number"}},"required":["id"]}},
  {"name":"loadTileset","description":"Load a 3D Tileset from Cesium Ion or URL","inputSchema":{"type":"object","properties":{"ionAssetId":{"type":"number"},"url":{"type":"string"},"name":{"type":"string"},"show":{"type":"boolean"}},"required":[]}},
  {"name":"setImagery","description":"Set the imagery layer. Use 'bing', 'osm', 'arcgis', 'sentinel', or a custom URL.","inputSchema":{"type":"object","properties":{"provider":{"type":"string"},"url":{"type":"string"},"ionAssetId":{"type":"number"}},"required":["provider"]}},
  {"name":"setTerrain","description":"Set terrain provider. Use 'cesium' for Cesium World Terrain, 'ellipsoid' for flat, or custom URL.","inputSchema":{"type":"object","properties":{"provider":{"type":"string"},"ionAssetId":{"type":"number"},"exaggeration":{"type":"number"}},"required":["provider"]}},
  {"name":"toggleLayerVisibility","description":"Toggle visibility of a layer or tileset by ID","inputSchema":{"type":"object","properties":{"id":{"type":"string"},"visible":{"type":"boolean"}},"required":["id","visible"]}},
  {"name":"setEntityStyle","description":"Change an entity's style (color, opacity, outline)","inputSchema":{"type":"object","properties":{"id":{"type":"string"},"color":{"type":"string"},"opacity":{"type":"number"},"outlineColor":{"type":"string"},"outlineWidth":{"type":"number"}},"required":["id"]}},
  {"name":"setTime","description":"Set the scene's current time for 4D visualization","inputSchema":{"type":"object","properties":{"iso8601":{"type":"string"},"julianDate":{"type":"number"}},"required":[]}},
  {"name":"setClockRange","description":"Set the clock range and speed for time animation","inputSchema":{"type":"object","properties":{"startTime":{"type":"string"},"endTime":{"type":"string"},"multiplier":{"type":"number"},"shouldAnimate":{"type":"boolean"}},"required":[]}},
  {"name":"addPolyline","description":"Add a polyline (line/path) between points","inputSchema":{"type":"object","properties":{"positions":{"type":"array","items":{"type":"object","properties":{"longitude":{"type":"number"},"latitude":{"type":"number"},"height":{"type":"number"}}}},"color":{"type":"string"},"width":{"type":"number"},"clampToGround":{"type":"boolean"},"name":{"type":"string"}},"required":["positions"]}},
  {"name":"addPolygon","description":"Add a polygon (filled area)","inputSchema":{"type":"object","properties":{"positions":{"type":"array","items":{"type":"object","properties":{"longitude":{"type":"number"},"latitude":{"type":"number"}}}},"color":{"type":"string"},"outlineColor":{"type":"string"},"height":{"type":"number"},"extrudedHeight":{"type":"number"},"name":{"type":"string"}},"required":["positions"]}},
  {"name":"addModel","description":"Add a 3D model (glTF/glb) at a location","inputSchema":{"type":"object","properties":{"longitude":{"type":"number"},"latitude":{"type":"number"},"height":{"type":"number"},"url":{"type":"string"},"ionAssetId":{"type":"number"},"scale":{"type":"number"},"heading":{"type":"number"},"name":{"type":"string"}},"required":["longitude","latitude"]}},
  {"name":"flyToEntity","description":"Fly the camera to focus on an entity by ID","inputSchema":{"type":"object","properties":{"id":{"type":"string"},"duration":{"type":"number"},"offset":{"type":"object"}},"required":["id"]}},
  {"name":"showEntity","description":"Make an entity visible","inputSchema":{"type":"object","properties":{"id":{"type":"string"}},"required":["id"]}},
  {"name":"hideEntity","description":"Hide an entity (make invisible)","inputSchema":{"type":"object","properties":{"id":{"type":"string"}},"required":["id"]}},
  {"name":"setSceneMode","description":"Set scene mode: '3D', '2D', or 'columbus' (2.5D)","inputSchema":{"type":"object","properties":{"mode":{"type":"string","enum":["3D","2D","columbus"]}},"required":["mode"]}},
  {"name":"setView","description":"Set camera view instantly (no animation)","inputSchema":{"type":"object","properties":{"longitude":{"type":"number"},"latitude":{"type":"number"},"height":{"type":"number"},"heading":{"type":"number"},"pitch":{"type":"number"},"roll":{"type":"number"}},"required":["longitude","latitude"]}},
  {"name":"getCamera","description":"Get current camera position and orientation","inputSchema":{"type":"object","properties":{}}},
  {"name":"addCircle","description":"Add a circle on the ground or at height","inputSchema":{"type":"object","properties":{"longitude":{"type":"number"},"latitude":{"type":"number"},"radius":{"type":"number"},"color":{"type":"string"},"height":{"type":"number"},"extrudedHeight":{"type":"number"},"name":{"type":"string"}},"required":["longitude","latitude","radius"]}},
  {"name":"addRectangle","description":"Add a rectangle (bounding box on ground)","inputSchema":{"type":"object","properties":{"west":{"type":"number"},"south":{"type":"number"},"east":{"type":"number"},"north":{"type":"number"},"color":{"type":"string"},"height":{"type":"number"},"extrudedHeight":{"type":"number"},"name":{"type":"string"}},"required":["west","south","east","north"]}},
  {"name":"addModelAtLocation","description":"Add a 3D model at a named location","inputSchema":{"type":"object","properties":{"location":{"type":"string"},"url":{"type":"string"},"ionAssetId":{"type":"number"},"scale":{"type":"number"},"heading":{"type":"number"},"name":{"type":"string"}},"required":["location"]}},
  {"name":"playAnimation","description":"Start the clock animation","inputSchema":{"type":"object","properties":{}}},
  {"name":"pauseAnimation","description":"Pause the clock animation","inputSchema":{"type":"object","properties":{}}},
  {"name":"addSphereHere","description":"Add a sphere at current camera view center (where camera is looking). Use when user says 'add sphere' without specifying a location.","inputSchema":{"type":"object","properties":{"radius":{"type":"number","description":"Radius in meters (10-500 typical)","minimum":1,"maximum":1000},"height":{"type":"number","description":"Height above ground (0-1000m)","maximum":1000},"color":{"type":"string"},"name":{"type":"string"}}}},
  {"name":"addBoxHere","description":"Add a box at current camera view center. Use when user says 'add box' without specifying a location.","inputSchema":{"type":"object","properties":{"dimensionX":{"type":"number"},"dimensionY":{"type":"number"},"dimensionZ":{"type":"number"},"color":{"type":"string"},"heading":{"type":"number"},"name":{"type":"string"}}}},
  {"name":"addPointHere","description":"Add a point marker at current camera view center.","inputSchema":{"type":"object","properties":{"color":{"type":"string"},"name":{"type":"string"}}}},
  {"name":"addLabelHere","description":"Add a label at current camera view center.","inputSchema":{"type":"object","properties":{"text":{"type":"string"}},"required":["text"]}},
  {"name":"addCylinderHere","description":"Add a cylinder at current camera view center.","inputSchema":{"type":"object","properties":{"topRadius":{"type":"number"},"bottomRadius":{"type":"number"},"cylinderHeight":{"type":"number"},"color":{"type":"string"},"name":{"type":"string"}}}},
  {"name":"addCircleHere","description":"Add a circle on the ground at current camera view center.","inputSchema":{"type":"object","properties":{"radius":{"type":"number"},"color":{"type":"string"},"height":{"type":"number"},"extrudedHeight":{"type":"number"},"name":{"type":"string"}},"required":["radius"]}},
  {"name":"addModelHere","description":"Add a 3D model (glTF/glb) at current camera view center.","inputSchema":{"type":"object","properties":{"url":{"type":"string"},"ionAssetId":{"type":"number"},"scale":{"type":"number"},"heading":{"type":"number"},"name":{"type":"string"}}}},
  {"name":"addPolygonHere","description":"Add a polygon centered at current camera view.","inputSchema":{"type":"object","properties":{"radius":{"type":"number","description":"Radius in meters to generate polygon vertices around center"},"sides":{"type":"number","description":"Number of sides (3=triangle, 4=square, 6=hexagon, etc)"},"color":{"type":"string"},"height":{"type":"number"},"extrudedHeight":{"type":"number"},"name":{"type":"string"}}}},
  {"name":"addEntityHere","description":"Generic tool to add any entity at current camera view center. Specify entityType: sphere, box, cylinder, point, label, circle, model.","inputSchema":{"type":"object","properties":{"entityType":{"type":"string","enum":["sphere","box","cylinder","point","label","circle","model"]},"radius":{"type":"number"},"color":{"type":"string"},"height":{"type":"number"},"name":{"type":"string"},"text":{"type":"string"}},"required":["entityType"]}},
  {"name":"addSensorConeHere","description":"Add a sensor cone/fan/radar/camera FOV at current camera view center. Use when user says 'add sensor', 'add radar', 'add FOV', etc. without specifying a location.","inputSchema":{"type":"object","properties":{"radius":{"type":"number","description":"Length/range of sensor in meters (default: 50000)"},"horizontalAngle":{"type":"number","description":"Horizontal FOV in degrees, 1-360 (default: 45)"},"verticalAngle":{"type":"number","description":"Vertical FOV in degrees, 1-180 (default: 30)"},"heading":{"type":"number","description":"Direction in degrees, 0=North, 90=East (default: 0)"},"pitch":{"type":"number","description":"Pitch angle, -90=down, 0=horizontal (default: 0)"},"height":{"type":"number","description":"Height above ground in meters (default: 0)"},"innerRadius":{"type":"number","description":"Inner radius for hollow cone (default: 0)"},"color":{"type":"string","description":"Color name (default: lime)"},"opacity":{"type":"number","description":"Opacity 0-1 (default: 0.5)"},"name":{"type":"string"}}}}
])JSON";

// Resource definitions
static const char* RESOURCES_JSON = R"JSON({"resources":[
  {"uri":"cesium://scene/state","name":"Scene State","mimeType":"application/json"},
  {"uri":"cesium://entities","name":"Entity List","mimeType":"application/json"},
  {"uri":"cesium://camera","name":"Camera State","mimeType":"application/json"},
  {"uri":"cesium://locations","name":"Known Locations","mimeType":"application/json"}
]})JSON";

void init() {
    // Nothing to initialize currently
}

size_t get_tool_definitions(char* output, size_t output_size) {
    size_t len = strlen(TOOL_DEFINITIONS);
    if (len >= output_size) {
        len = output_size - 1;
    }
    memcpy(output, TOOL_DEFINITIONS, len);
    output[len] = '\0';
    return len;
}

size_t handle_initialize(const char* id, const char* params, char* response, size_t response_size) {
    (void)params;  // Unused

    const char* result = R"JSON({
        "protocolVersion":"2024-11-05",
        "serverInfo":{"name":"cesium-mcp-wasm-cpp","version":"1.0.0"},
        "capabilities":{"tools":{},"resources":{}}
    })JSON";

    return create_success_response(id, result, response, response_size);
}

size_t handle_tools_list(const char* id, char* response, size_t response_size) {
    char result[MAX_TOOLS_SIZE];
    snprintf(result, sizeof(result), "{\"tools\":%s}", TOOL_DEFINITIONS);
    return create_success_response(id, result, response, response_size);
}

size_t handle_tools_call(const char* id, const char* params, char* response, size_t response_size) {
    char tool_name[64];
    char args_json[4096];

    if (!json_get_string(params, "name", tool_name, sizeof(tool_name))) {
        return create_error_response(id, ErrorCode::InvalidParams, "Missing tool name",
                                     response, response_size);
    }

    json_get_object(params, "arguments", args_json, sizeof(args_json));

    char result_text[32768];

    // Handle basic coordinate-based tools
    if (strcmp(tool_name, "flyTo") == 0) {
        double lon = 0, lat = 0, height = 10000, duration = 2.0;
        json_get_number(args_json, "longitude", lon);
        json_get_number(args_json, "latitude", lat);
        json_get_number(args_json, "height", height);
        json_get_number(args_json, "duration", duration);
        snprintf(result_text, sizeof(result_text),
                 "type,longitude,latitude,height,duration\nflyTo,%.6f,%.6f,%.1f,%.1f",
                 lon, lat, height, duration);
    }
    else if (strcmp(tool_name, "addPoint") == 0) {
        double lon = 0, lat = 0;
        char name[128] = "";
        char color[32] = "white";
        char location[256] = "";

        // Check for location name first (preferred)
        if (json_get_string(args_json, "location", location, sizeof(location))) {
            double db_heading;
            if (resolve_location(location, lon, lat, db_heading)) {
                if (name[0] == '\0') strncpy(name, location, sizeof(name) - 1);
            }
        } else {
            json_get_number(args_json, "longitude", lon);
            json_get_number(args_json, "latitude", lat);
        }
        json_get_string(args_json, "name", name, sizeof(name));
        json_get_string(args_json, "color", color, sizeof(color));
        int entity_id = entity_counter++;
        snprintf(result_text, sizeof(result_text),
                 "type,id,longitude,latitude,color,name\naddPoint,entity-%d,%.6f,%.6f,%s,%s",
                 entity_id, lon, lat, color, name[0] ? name : "point");
    }
    else if (strcmp(tool_name, "addLabel") == 0) {
        double lon = 0, lat = 0;
        char text[256] = "";
        json_get_number(args_json, "longitude", lon);
        json_get_number(args_json, "latitude", lat);
        json_get_string(args_json, "text", text, sizeof(text));
        int entity_id = entity_counter++;
        snprintf(result_text, sizeof(result_text),
                 "type,id,longitude,latitude,text\naddLabel,entity-%d,%.6f,%.6f,%s",
                 entity_id, lon, lat, text);
    }
    else if (strcmp(tool_name, "addSphere") == 0) {
        double lon = 0, lat = 0, height = 0, radius = 1000;
        char color[32] = "red";
        char name[128] = "";
        char location[256] = "";

        // Check for location name first (preferred)
        if (json_get_string(args_json, "location", location, sizeof(location))) {
            double db_heading;
            if (resolve_location(location, lon, lat, db_heading)) {
                if (name[0] == '\0') strncpy(name, location, sizeof(name) - 1);
            }
        } else {
            json_get_number(args_json, "longitude", lon);
            json_get_number(args_json, "latitude", lat);
        }
        json_get_number(args_json, "height", height);
        json_get_number(args_json, "radius", radius);
        json_get_string(args_json, "color", color, sizeof(color));
        json_get_string(args_json, "name", name, sizeof(name));
        // Clamp to reasonable values
        if (radius > 1000) radius = 1000;
        if (radius < 1) radius = 50;
        if (height > 1000) height = 0;
        if (height < 0) height = 0;
        int entity_id = entity_counter++;
        snprintf(result_text, sizeof(result_text),
                 "type,id,longitude,latitude,height,radius,color,name\naddSphere,entity-%d,%.6f,%.6f,%.1f,%.1f,%s,%s",
                 entity_id, lon, lat, height, radius, color, name[0] ? name : "sphere");
    }
    else if (strcmp(tool_name, "addBox") == 0) {
        double lon = 0, lat = 0, height = 0;
        double dim_x = 100, dim_y = 100, dim_z = 50;
        char color[32] = "blue";
        char name[128] = "";
        json_get_number(args_json, "longitude", lon);
        json_get_number(args_json, "latitude", lat);
        json_get_number(args_json, "height", height);
        json_get_string(args_json, "color", color, sizeof(color));
        json_get_string(args_json, "name", name, sizeof(name));
        // Support nested dimensions object
        char dimensions[256];
        if (json_get_object(args_json, "dimensions", dimensions, sizeof(dimensions))) {
            json_get_number(dimensions, "x", dim_x);
            json_get_number(dimensions, "y", dim_y);
            json_get_number(dimensions, "z", dim_z);
        }
        int entity_id = entity_counter++;
        snprintf(result_text, sizeof(result_text),
                 "type,id,longitude,latitude,height,dimensionX,dimensionY,dimensionZ,color,name\naddBox,entity-%d,%.6f,%.6f,%.1f,%.1f,%.1f,%.1f,%s,%s",
                 entity_id, lon, lat, height, dim_x, dim_y, dim_z, color, name[0] ? name : "box");
    }
    else if (strcmp(tool_name, "addCylinder") == 0) {
        double lon = 0, lat = 0, height = 0;
        double top_radius = 100, bottom_radius = 100, cylinder_height = 100;
        char color[32] = "green";
        char name[128] = "";
        json_get_number(args_json, "longitude", lon);
        json_get_number(args_json, "latitude", lat);
        json_get_number(args_json, "height", height);
        json_get_number(args_json, "topRadius", top_radius);
        json_get_number(args_json, "bottomRadius", bottom_radius);
        json_get_number(args_json, "cylinderHeight", cylinder_height);
        json_get_string(args_json, "color", color, sizeof(color));
        json_get_string(args_json, "name", name, sizeof(name));
        int entity_id = entity_counter++;
        snprintf(result_text, sizeof(result_text),
                 "type,id,longitude,latitude,height,topRadius,bottomRadius,cylinderHeight,color,name\naddCylinder,entity-%d,%.6f,%.6f,%.1f,%.1f,%.1f,%.1f,%s,%s",
                 entity_id, lon, lat, height, top_radius, bottom_radius, cylinder_height, color, name[0] ? name : "cylinder");
    }
    else if (strcmp(tool_name, "lookAt") == 0) {
        double lon = 0, lat = 0, range = 10000;
        json_get_number(args_json, "longitude", lon);
        json_get_number(args_json, "latitude", lat);
        json_get_number(args_json, "range", range);
        snprintf(result_text, sizeof(result_text),
                 "type,longitude,latitude,range\nlookAt,%.6f,%.6f,%.1f",
                 lon, lat, range);
    }
    else if (strcmp(tool_name, "zoom") == 0) {
        double amount = 1.0;
        json_get_number(args_json, "amount", amount);
        snprintf(result_text, sizeof(result_text),
                 "type,amount\nzoom,%.2f", amount);
    }
    else if (strcmp(tool_name, "removeEntity") == 0) {
        char entity_id[64] = "";
        json_get_string(args_json, "id", entity_id, sizeof(entity_id));
        snprintf(result_text, sizeof(result_text),
                 "type,id\nremoveEntity,%s", entity_id);
    }
    else if (strcmp(tool_name, "clearAll") == 0) {
        snprintf(result_text, sizeof(result_text), "type\nclearAll");
    }
    // Handle location-aware tools
    else if (strcmp(tool_name, "resolveLocation") == 0) {
        char location[256];
        if (json_get_string(args_json, "location", location, sizeof(location))) {
            double longitude, latitude, heading;
            if (resolve_location(location, longitude, latitude, heading)) {
                if (heading >= 0) {
                    snprintf(result_text, sizeof(result_text),
                             "Location '%s' resolved to: longitude=%.6f, latitude=%.6f, heading=%.1f",
                             location, longitude, latitude, heading);
                } else {
                    snprintf(result_text, sizeof(result_text),
                             "Location '%s' resolved to: longitude=%.6f, latitude=%.6f",
                             location, longitude, latitude);
                }
            } else {
                snprintf(result_text, sizeof(result_text),
                         "Location '%s' not found in database", location);
            }
        } else {
            strcpy(result_text, "Missing 'location' parameter");
        }
    }
    else if (strcmp(tool_name, "flyToLocation") == 0) {
        char location[256];
        // Accept both "location" and "locationName" for robustness (LLMs sometimes vary)
        if (json_get_string(args_json, "location", location, sizeof(location)) ||
            json_get_string(args_json, "locationName", location, sizeof(location))) {
            double longitude, latitude, heading;
            if (resolve_location(location, longitude, latitude, heading)) {
                double height = 10000;
                double duration = 2.0;
                json_get_number(args_json, "height", height);
                json_get_number(args_json, "duration", duration);

                // Clamp height to reasonable viewing distance (max 100km)
                if (height > 100000) height = 10000;
                if (height < 100) height = 1000;
                if (duration < 0.5) duration = 2.0;
                if (duration > 10) duration = 3.0;

                snprintf(result_text, sizeof(result_text),
                         "type,longitude,latitude,height,duration\nflyTo,%.6f,%.6f,%.1f,%.1f",
                         longitude, latitude, height, duration);
            } else {
                snprintf(result_text, sizeof(result_text),
                         "Location '%s' not found", location);
            }
        } else {
            strcpy(result_text, "Missing 'location' parameter");
        }
    }
    else if (strcmp(tool_name, "addSphereAtLocation") == 0) {
        char location[256];
        // Accept both "location" and "locationName" for robustness
        if (json_get_string(args_json, "location", location, sizeof(location)) ||
            json_get_string(args_json, "locationName", location, sizeof(location))) {
            double longitude, latitude, db_heading;
            if (resolve_location(location, longitude, latitude, db_heading)) {
                double radius = 1000, height = 0;
                char color[32] = "red";
                char name[128] = "";

                json_get_number(args_json, "radius", radius);
                json_get_number(args_json, "height", height);
                json_get_string(args_json, "color", color, sizeof(color));
                json_get_string(args_json, "name", name, sizeof(name));

                // Clamp to reasonable values
                if (radius > 1000) radius = 100;
                if (radius < 1) radius = 50;
                if (height > 1000) height = 0;
                if (height < 0) height = 0;

                int entity_id = entity_counter++;
                snprintf(result_text, sizeof(result_text),
                         "type,id,longitude,latitude,height,radius,color,name\naddSphere,entity-%d,%.6f,%.6f,%.1f,%.1f,%s,%s",
                         entity_id, longitude, latitude, height, radius, color,
                         name[0] ? name : location);
            } else {
                snprintf(result_text, sizeof(result_text),
                         "Location '%s' not found", location);
            }
        } else {
            strcpy(result_text, "Missing 'location' parameter");
        }
    }
    else if (strcmp(tool_name, "addBoxAtLocation") == 0) {
        char location[256];
        // Accept both "location" and "locationName" for robustness
        if (json_get_string(args_json, "location", location, sizeof(location)) ||
            json_get_string(args_json, "locationName", location, sizeof(location))) {
            double longitude, latitude, db_heading;
            if (resolve_location(location, longitude, latitude, db_heading)) {
                double height = 0;
                double dim_x = 100, dim_y = 100, dim_z = 50;
                double heading = db_heading;  // Use database heading as default
                char color[32] = "blue";
                char name[128] = "";

                // Try flat dimension parameters first (preferred)
                json_get_number(args_json, "dimensionX", dim_x);
                json_get_number(args_json, "dimensionY", dim_y);
                json_get_number(args_json, "dimensionZ", dim_z);
                json_get_number(args_json, "heading", heading);  // Override if user specified
                json_get_number(args_json, "height", height);
                json_get_string(args_json, "color", color, sizeof(color));
                json_get_string(args_json, "name", name, sizeof(name));

                // Also support nested dimensions object for backwards compat
                char dimensions[256];
                if (json_get_object(args_json, "dimensions", dimensions, sizeof(dimensions))) {
                    json_get_number(dimensions, "x", dim_x);
                    json_get_number(dimensions, "y", dim_y);
                    json_get_number(dimensions, "z", dim_z);
                }

                // Enforce minimum dimensions
                if (dim_x < 10) dim_x = 10;
                if (dim_y < 10) dim_y = 10;
                if (dim_z < 10) dim_z = 10;

                // Set box center height to half of dimensionZ so it sits on ground
                height = dim_z / 2.0;

                // Generate entity ID
                int entity_id = entity_counter++;
                if (heading >= 0) {
                    snprintf(result_text, sizeof(result_text),
                             "type,id,longitude,latitude,height,dimensionX,dimensionY,dimensionZ,heading,color,name\n"
                             "addBox,entity-%d,%.6f,%.6f,%.1f,%.1f,%.1f,%.1f,%.1f,%s,%s",
                             entity_id, longitude, latitude, height, dim_x, dim_y, dim_z, heading, color,
                             name[0] ? name : location);
                } else {
                    snprintf(result_text, sizeof(result_text),
                             "type,id,longitude,latitude,height,dimensionX,dimensionY,dimensionZ,color,name\n"
                             "addBox,entity-%d,%.6f,%.6f,%.1f,%.1f,%.1f,%.1f,%s,%s",
                             entity_id, longitude, latitude, height, dim_x, dim_y, dim_z, color,
                             name[0] ? name : location);
                }
            } else {
                snprintf(result_text, sizeof(result_text),
                         "Location '%s' not found", location);
            }
        } else {
            strcpy(result_text, "Missing 'location' parameter");
        }
    }
    else if (strcmp(tool_name, "rotateEntity") == 0) {
        char entity_id[64];
        if (json_get_string(args_json, "id", entity_id, sizeof(entity_id))) {
            double heading = 0;
            json_get_number(args_json, "heading", heading);
            snprintf(result_text, sizeof(result_text),
                     "type,id,heading\nrotateEntity,%s,%.1f",
                     entity_id, heading);
        } else {
            strcpy(result_text, "Missing 'id' parameter");
        }
    }
    else if (strcmp(tool_name, "resizeEntity") == 0) {
        char entity_id[64];
        if (json_get_string(args_json, "id", entity_id, sizeof(entity_id))) {
            double scale = -1;
            double dim_x = -1, dim_y = -1, dim_z = -1;
            json_get_number(args_json, "scale", scale);
            json_get_number(args_json, "dimensionX", dim_x);
            json_get_number(args_json, "dimensionY", dim_y);
            json_get_number(args_json, "dimensionZ", dim_z);

            if (scale > 0) {
                snprintf(result_text, sizeof(result_text),
                         "type,id,scale\nresizeEntity,%s,%.2f",
                         entity_id, scale);
            } else if (dim_x > 0 || dim_y > 0 || dim_z > 0) {
                snprintf(result_text, sizeof(result_text),
                         "type,id,dimensionX,dimensionY,dimensionZ\nresizeEntity,%s,%.1f,%.1f,%.1f",
                         entity_id, dim_x, dim_y, dim_z);
            } else {
                strcpy(result_text, "Missing 'scale' or dimension parameters");
            }
        } else {
            strcpy(result_text, "Missing 'id' parameter");
        }
    }
    else if (strcmp(tool_name, "moveEntity") == 0) {
        char entity_id[64];
        if (json_get_string(args_json, "id", entity_id, sizeof(entity_id))) {
            double lon = -999, lat = -999, height = -999;
            double offset_x = 0, offset_y = 0, offset_z = 0;
            json_get_number(args_json, "longitude", lon);
            json_get_number(args_json, "latitude", lat);
            json_get_number(args_json, "height", height);
            json_get_number(args_json, "offsetX", offset_x);
            json_get_number(args_json, "offsetY", offset_y);
            json_get_number(args_json, "offsetZ", offset_z);

            if (lon > -999 && lat > -999) {
                // Absolute position
                if (height > -999) {
                    snprintf(result_text, sizeof(result_text),
                             "type,id,longitude,latitude,height\nmoveEntity,%s,%.6f,%.6f,%.1f",
                             entity_id, lon, lat, height);
                } else {
                    snprintf(result_text, sizeof(result_text),
                             "type,id,longitude,latitude\nmoveEntity,%s,%.6f,%.6f",
                             entity_id, lon, lat);
                }
            } else if (offset_x != 0 || offset_y != 0 || offset_z != 0) {
                // Relative offset in meters
                snprintf(result_text, sizeof(result_text),
                         "type,id,offsetX,offsetY,offsetZ\nmoveEntity,%s,%.1f,%.1f,%.1f",
                         entity_id, offset_x, offset_y, offset_z);
            } else {
                strcpy(result_text, "Missing position (longitude/latitude) or offset parameters");
            }
        } else {
            strcpy(result_text, "Missing 'id' parameter");
        }
    }
    else if (strcmp(tool_name, "loadTileset") == 0) {
        double ion_asset_id = -1;
        char url[512] = "";
        char name[128] = "";
        bool show = true;

        json_get_number(args_json, "ionAssetId", ion_asset_id);
        json_get_string(args_json, "url", url, sizeof(url));
        json_get_string(args_json, "name", name, sizeof(name));
        // Note: show defaults to true

        int tileset_id = entity_counter++;
        if (ion_asset_id > 0) {
            snprintf(result_text, sizeof(result_text),
                     "type,id,ionAssetId,name,show\nloadTileset,tileset-%d,%.0f,%s,true",
                     tileset_id, ion_asset_id, name[0] ? name : "tileset");
        } else if (url[0] != '\0') {
            snprintf(result_text, sizeof(result_text),
                     "type,id,url,name,show\nloadTileset,tileset-%d,%s,%s,true",
                     tileset_id, url, name[0] ? name : "tileset");
        } else {
            strcpy(result_text, "Missing 'ionAssetId' or 'url' parameter");
        }
    }
    else if (strcmp(tool_name, "setImagery") == 0) {
        char provider[64] = "";
        char url[512] = "";
        double ion_asset_id = -1;

        json_get_string(args_json, "provider", provider, sizeof(provider));
        json_get_string(args_json, "url", url, sizeof(url));
        json_get_number(args_json, "ionAssetId", ion_asset_id);

        if (provider[0] != '\0') {
            if (url[0] != '\0') {
                snprintf(result_text, sizeof(result_text),
                         "type,provider,url\nsetImagery,%s,%s",
                         provider, url);
            } else if (ion_asset_id > 0) {
                snprintf(result_text, sizeof(result_text),
                         "type,provider,ionAssetId\nsetImagery,%s,%.0f",
                         provider, ion_asset_id);
            } else {
                snprintf(result_text, sizeof(result_text),
                         "type,provider\nsetImagery,%s",
                         provider);
            }
        } else {
            strcpy(result_text, "Missing 'provider' parameter");
        }
    }
    else if (strcmp(tool_name, "setTerrain") == 0) {
        char provider[64] = "";
        double ion_asset_id = -1;
        double exaggeration = 1.0;

        json_get_string(args_json, "provider", provider, sizeof(provider));
        json_get_number(args_json, "ionAssetId", ion_asset_id);
        json_get_number(args_json, "exaggeration", exaggeration);

        if (provider[0] != '\0') {
            if (ion_asset_id > 0) {
                snprintf(result_text, sizeof(result_text),
                         "type,provider,ionAssetId,exaggeration\nsetTerrain,%s,%.0f,%.2f",
                         provider, ion_asset_id, exaggeration);
            } else {
                snprintf(result_text, sizeof(result_text),
                         "type,provider,exaggeration\nsetTerrain,%s,%.2f",
                         provider, exaggeration);
            }
        } else {
            strcpy(result_text, "Missing 'provider' parameter");
        }
    }
    else if (strcmp(tool_name, "toggleLayerVisibility") == 0) {
        char layer_id[64] = "";
        bool visible = true;
        double visible_num = 1;

        json_get_string(args_json, "id", layer_id, sizeof(layer_id));
        json_get_number(args_json, "visible", visible_num);
        visible = visible_num > 0;

        if (layer_id[0] != '\0') {
            snprintf(result_text, sizeof(result_text),
                     "type,id,visible\ntoggleLayerVisibility,%s,%s",
                     layer_id, visible ? "true" : "false");
        } else {
            strcpy(result_text, "Missing 'id' parameter");
        }
    }
    else if (strcmp(tool_name, "setEntityStyle") == 0) {
        char entity_id[64] = "";
        char color[32] = "";
        char outline_color[32] = "";
        double opacity = -1;
        double outline_width = -1;

        json_get_string(args_json, "id", entity_id, sizeof(entity_id));
        json_get_string(args_json, "color", color, sizeof(color));
        json_get_string(args_json, "outlineColor", outline_color, sizeof(outline_color));
        json_get_number(args_json, "opacity", opacity);
        json_get_number(args_json, "outlineWidth", outline_width);

        if (entity_id[0] != '\0') {
            // Build CSV header and data dynamically based on which fields are set
            char csv_header[256];
            char csv_data[256];
            size_t h_off = 0, d_off = 0;
            h_off += snprintf(csv_header + h_off, sizeof(csv_header) - h_off, "type,id");
            d_off += snprintf(csv_data + d_off, sizeof(csv_data) - d_off, "setEntityStyle,%s", entity_id);
            if (color[0] != '\0') {
                h_off += snprintf(csv_header + h_off, sizeof(csv_header) - h_off, ",color");
                d_off += snprintf(csv_data + d_off, sizeof(csv_data) - d_off, ",%s", color);
            }
            if (opacity >= 0) {
                h_off += snprintf(csv_header + h_off, sizeof(csv_header) - h_off, ",opacity");
                d_off += snprintf(csv_data + d_off, sizeof(csv_data) - d_off, ",%.2f", opacity);
            }
            if (outline_color[0] != '\0') {
                h_off += snprintf(csv_header + h_off, sizeof(csv_header) - h_off, ",outlineColor");
                d_off += snprintf(csv_data + d_off, sizeof(csv_data) - d_off, ",%s", outline_color);
            }
            if (outline_width >= 0) {
                h_off += snprintf(csv_header + h_off, sizeof(csv_header) - h_off, ",outlineWidth");
                d_off += snprintf(csv_data + d_off, sizeof(csv_data) - d_off, ",%.1f", outline_width);
            }
            snprintf(result_text, sizeof(result_text), "%s\n%s", csv_header, csv_data);
        } else {
            strcpy(result_text, "Missing 'id' parameter");
        }
    }
    else if (strcmp(tool_name, "setTime") == 0) {
        char iso8601[64] = "";
        double julian_date = -1;

        json_get_string(args_json, "iso8601", iso8601, sizeof(iso8601));
        json_get_number(args_json, "julianDate", julian_date);

        if (iso8601[0] != '\0') {
            snprintf(result_text, sizeof(result_text),
                     "type,iso8601\nsetTime,%s", iso8601);
        } else if (julian_date > 0) {
            snprintf(result_text, sizeof(result_text),
                     "type,julianDate\nsetTime,%.6f", julian_date);
        } else {
            strcpy(result_text, "Missing 'iso8601' or 'julianDate' parameter");
        }
    }
    else if (strcmp(tool_name, "setClockRange") == 0) {
        char start_time[64] = "";
        char end_time[64] = "";
        double multiplier = 1.0;
        double should_animate = 1;

        json_get_string(args_json, "startTime", start_time, sizeof(start_time));
        json_get_string(args_json, "endTime", end_time, sizeof(end_time));
        json_get_number(args_json, "multiplier", multiplier);
        json_get_number(args_json, "shouldAnimate", should_animate);

        // Build CSV header and data dynamically
        char csv_header[256];
        char csv_data[256];
        size_t h_off = 0, d_off = 0;
        h_off += snprintf(csv_header + h_off, sizeof(csv_header) - h_off, "type");
        d_off += snprintf(csv_data + d_off, sizeof(csv_data) - d_off, "setClockRange");
        if (start_time[0] != '\0') {
            h_off += snprintf(csv_header + h_off, sizeof(csv_header) - h_off, ",startTime");
            d_off += snprintf(csv_data + d_off, sizeof(csv_data) - d_off, ",%s", start_time);
        }
        if (end_time[0] != '\0') {
            h_off += snprintf(csv_header + h_off, sizeof(csv_header) - h_off, ",endTime");
            d_off += snprintf(csv_data + d_off, sizeof(csv_data) - d_off, ",%s", end_time);
        }
        h_off += snprintf(csv_header + h_off, sizeof(csv_header) - h_off, ",multiplier,shouldAnimate");
        d_off += snprintf(csv_data + d_off, sizeof(csv_data) - d_off, ",%.2f,%s",
                          multiplier, should_animate > 0 ? "true" : "false");
        snprintf(result_text, sizeof(result_text), "%s\n%s", csv_header, csv_data);
    }
    else if (strcmp(tool_name, "listLocations") == 0) {
        char prefix[64] = "";
        json_get_string(args_json, "prefix", prefix, sizeof(prefix));

        const Location* locations = get_all_locations();
        size_t count = get_location_count();

        // Build CSV of locations
        size_t offset = 0;
        offset += snprintf(result_text + offset, sizeof(result_text) - offset,
                           "name,longitude,latitude");

        for (size_t i = 0; i < count && offset < sizeof(result_text) - 100; i++) {
            if (locations[i].name == nullptr) continue;

            // Filter by prefix if provided
            if (prefix[0] != '\0') {
                char normalized[256];
                normalize_location_name(prefix, normalized, sizeof(normalized));
                if (strncmp(locations[i].name, normalized, strlen(normalized)) != 0) {
                    continue;
                }
            }

            offset += snprintf(result_text + offset, sizeof(result_text) - offset,
                               "\n%s,%.6f,%.6f",
                               locations[i].name, locations[i].longitude, locations[i].latitude);
        }
    }
    else if (strcmp(tool_name, "getTopCitiesByPopulation") == 0) {
        double count_d = 10;
        double min_pop = 0;
        json_get_number(args_json, "count", count_d);
        json_get_number(args_json, "minPopulation", min_pop);

        size_t count = static_cast<size_t>(count_d);
        if (count > 100) count = 100;
        if (count < 1) count = 10;

        const Location* results[100];
        size_t num_results = get_top_cities_by_population(results, count, static_cast<int>(min_pop));

        // Build CSV output
        size_t offset = 0;
        offset += snprintf(result_text + offset, sizeof(result_text) - offset,
                           "name,population,longitude,latitude");

        for (size_t i = 0; i < num_results && offset < sizeof(result_text) - 200; i++) {
            offset += snprintf(result_text + offset, sizeof(result_text) - offset,
                               "\n%s,%d,%.6f,%.6f",
                               results[i]->name, results[i]->population,
                               results[i]->longitude, results[i]->latitude);
        }
    }
    else if (strcmp(tool_name, "showTopCitiesByPopulation") == 0) {
        double count_d = 10;
        double min_radius = 10000;
        double max_radius = 200000;
        double base_size = 50000;
        double min_height = 10000;
        double max_height = 500000;
        char color[32] = "cyan";
        char shape[32] = "circle";

        json_get_number(args_json, "count", count_d);
        json_get_number(args_json, "minRadius", min_radius);
        json_get_number(args_json, "maxRadius", max_radius);
        json_get_number(args_json, "baseSize", base_size);
        json_get_number(args_json, "minHeight", min_height);
        json_get_number(args_json, "maxHeight", max_height);
        if (!json_get_string(args_json, "color", color, sizeof(color)) || color[0] == '\0') {
            strcpy(color, "cyan");
        }
        if (!json_get_string(args_json, "shape", shape, sizeof(shape)) || shape[0] == '\0') {
            strcpy(shape, "circle");
        }

        size_t count = static_cast<size_t>(count_d);
        if (count > 100) count = 100;
        if (count < 1) count = 10;

        const Location* results[100];
        size_t num_results = get_top_cities_by_population(results, count, 0);

        bool is_rectangle = (strcmp(shape, "rectangle") == 0 || strcmp(shape, "bar") == 0);

        // Section 1: command metadata
        size_t offset = 0;
        offset += snprintf(result_text + offset, sizeof(result_text) - offset,
                           "type,color,shape\nshowTopCities,%s,%s", color, shape);

        if (num_results > 0) {
            int max_pop = results[0]->population;
            int min_pop_val = results[num_results - 1]->population;
            if (min_pop_val == max_pop) min_pop_val = max_pop / 2;

            if (is_rectangle) {
                // Section 2: batch data rows for rectangles
                offset += snprintf(result_text + offset, sizeof(result_text) - offset,
                                   "\n\nname,population,longitude,latitude,baseSize,extrudedHeight");

                for (size_t i = 0; i < num_results && offset < sizeof(result_text) - 200; i++) {
                    double pop_ratio = static_cast<double>(results[i]->population - min_pop_val) /
                                       static_cast<double>(max_pop - min_pop_val);
                    double ext_height = min_height + pop_ratio * (max_height - min_height);

                    offset += snprintf(result_text + offset, sizeof(result_text) - offset,
                                       "\n%s,%d,%.4f,%.4f,%.0f,%.0f",
                                       results[i]->name, results[i]->population,
                                       results[i]->longitude, results[i]->latitude,
                                       base_size, ext_height);
                }
            } else {
                // Section 2: batch data rows for circles
                offset += snprintf(result_text + offset, sizeof(result_text) - offset,
                                   "\n\nname,population,longitude,latitude,radius");

                for (size_t i = 0; i < num_results && offset < sizeof(result_text) - 100; i++) {
                    double pop_ratio = static_cast<double>(results[i]->population - min_pop_val) /
                                       static_cast<double>(max_pop - min_pop_val);
                    double radius = min_radius + pop_ratio * (max_radius - min_radius);

                    offset += snprintf(result_text + offset, sizeof(result_text) - offset,
                                       "\n%s,%d,%.4f,%.4f,%.0f",
                                       results[i]->name, results[i]->population,
                                       results[i]->longitude, results[i]->latitude, radius);
                }
            }
        }
    }
    else if (strcmp(tool_name, "addPolyline") == 0) {
        char positions_json[4096] = "";
        char color[32] = "white";
        double width = 2.0;
        double clamp = 0;
        char name[128] = "";

        json_get_object(args_json, "positions", positions_json, sizeof(positions_json));
        json_get_string(args_json, "color", color, sizeof(color));
        json_get_number(args_json, "width", width);
        json_get_number(args_json, "clampToGround", clamp);
        json_get_string(args_json, "name", name, sizeof(name));

        int entity_id = entity_counter++;
        // Section 1: command metadata
        size_t offset = 0;
        offset += snprintf(result_text + offset, sizeof(result_text) - offset,
                           "type,id,color,width,clampToGround,name\n"
                           "addPolyline,entity-%d,%s,%.1f,%s,%s",
                           entity_id, color, width, clamp > 0 ? "true" : "false",
                           name[0] ? name : "polyline");

        // Section 2: position rows (parse JSON positions array)
        offset += snprintf(result_text + offset, sizeof(result_text) - offset,
                           "\n\nlongitude,latitude,height");
        // Iterate through JSON positions array
        const char* p = positions_json;
        while (*p && *p != '[') p++;
        if (*p) p++;
        while (*p) {
            while (*p && *p != '{' && *p != ']') p++;
            if (*p == ']' || !*p) break;
            char pos_obj[256];
            int depth = 0;
            int pi = 0;
            for (; *p && pi < (int)sizeof(pos_obj)-1; p++) {
                pos_obj[pi++] = *p;
                if (*p == '{') depth++;
                if (*p == '}') { depth--; if (depth == 0) { p++; break; } }
            }
            pos_obj[pi] = '\0';
            double plon = 0, plat = 0, ph = 0;
            json_get_number(pos_obj, "longitude", plon);
            json_get_number(pos_obj, "latitude", plat);
            json_get_number(pos_obj, "height", ph);
            offset += snprintf(result_text + offset, sizeof(result_text) - offset,
                               "\n%.6f,%.6f,%.1f", plon, plat, ph);
        }
    }
    else if (strcmp(tool_name, "addPolygon") == 0) {
        char positions_json[4096] = "";
        char color[32] = "blue";
        char outline_color[32] = "white";
        double height = 0;
        double extruded_height = -1;
        char name[128] = "";

        json_get_object(args_json, "positions", positions_json, sizeof(positions_json));
        json_get_string(args_json, "color", color, sizeof(color));
        json_get_string(args_json, "outlineColor", outline_color, sizeof(outline_color));
        json_get_number(args_json, "height", height);
        json_get_number(args_json, "extrudedHeight", extruded_height);
        json_get_string(args_json, "name", name, sizeof(name));

        int entity_id = entity_counter++;
        // Section 1: command metadata
        size_t offset = 0;
        if (extruded_height >= 0) {
            offset += snprintf(result_text + offset, sizeof(result_text) - offset,
                               "type,id,color,outlineColor,height,extrudedHeight,name\n"
                               "addPolygon,entity-%d,%s,%s,%.1f,%.1f,%s",
                               entity_id, color, outline_color, height, extruded_height,
                               name[0] ? name : "polygon");
        } else {
            offset += snprintf(result_text + offset, sizeof(result_text) - offset,
                               "type,id,color,outlineColor,height,name\n"
                               "addPolygon,entity-%d,%s,%s,%.1f,%s",
                               entity_id, color, outline_color, height,
                               name[0] ? name : "polygon");
        }

        // Section 2: position rows
        offset += snprintf(result_text + offset, sizeof(result_text) - offset,
                           "\n\nlongitude,latitude");
        const char* p = positions_json;
        while (*p && *p != '[') p++;
        if (*p) p++;
        while (*p) {
            while (*p && *p != '{' && *p != ']') p++;
            if (*p == ']' || !*p) break;
            char pos_obj[256];
            int depth = 0;
            int pi = 0;
            for (; *p && pi < (int)sizeof(pos_obj)-1; p++) {
                pos_obj[pi++] = *p;
                if (*p == '{') depth++;
                if (*p == '}') { depth--; if (depth == 0) { p++; break; } }
            }
            pos_obj[pi] = '\0';
            double plon = 0, plat = 0;
            json_get_number(pos_obj, "longitude", plon);
            json_get_number(pos_obj, "latitude", plat);
            offset += snprintf(result_text + offset, sizeof(result_text) - offset,
                               "\n%.6f,%.6f", plon, plat);
        }
    }
    else if (strcmp(tool_name, "addModel") == 0) {
        double lon = 0, lat = 0, height = 0;
        double scale = 1.0, heading = 0;
        double ion_asset_id = -1;
        char url[512] = "";
        char name[128] = "";

        json_get_number(args_json, "longitude", lon);
        json_get_number(args_json, "latitude", lat);
        json_get_number(args_json, "height", height);
        json_get_string(args_json, "url", url, sizeof(url));
        json_get_number(args_json, "ionAssetId", ion_asset_id);
        json_get_number(args_json, "scale", scale);
        json_get_number(args_json, "heading", heading);
        json_get_string(args_json, "name", name, sizeof(name));

        int entity_id = entity_counter++;
        if (ion_asset_id > 0) {
            snprintf(result_text, sizeof(result_text),
                     "type,id,longitude,latitude,height,ionAssetId,scale,heading,name\n"
                     "addModel,entity-%d,%.6f,%.6f,%.1f,%.0f,%.2f,%.1f,%s",
                     entity_id, lon, lat, height, ion_asset_id, scale, heading, name[0] ? name : "model");
        } else {
            snprintf(result_text, sizeof(result_text),
                     "type,id,longitude,latitude,height,url,scale,heading,name\n"
                     "addModel,entity-%d,%.6f,%.6f,%.1f,%s,%.2f,%.1f,%s",
                     entity_id, lon, lat, height, url, scale, heading, name[0] ? name : "model");
        }
    }
    else if (strcmp(tool_name, "addModelAtLocation") == 0) {
        char location[256];
        if (json_get_string(args_json, "location", location, sizeof(location))) {
            double longitude, latitude, db_heading;
            if (resolve_location(location, longitude, latitude, db_heading)) {
                double scale = 1.0, heading = db_heading;
                double ion_asset_id = -1;
                char url[512] = "";
                char name[128] = "";

                json_get_string(args_json, "url", url, sizeof(url));
                json_get_number(args_json, "ionAssetId", ion_asset_id);
                json_get_number(args_json, "scale", scale);
                json_get_number(args_json, "heading", heading);
                json_get_string(args_json, "name", name, sizeof(name));

                int entity_id = entity_counter++;
                if (ion_asset_id > 0) {
                    snprintf(result_text, sizeof(result_text),
                             "type,id,longitude,latitude,height,ionAssetId,scale,heading,name\n"
                             "addModel,entity-%d,%.6f,%.6f,0,%.0f,%.2f,%.1f,%s",
                             entity_id, longitude, latitude, ion_asset_id, scale, heading, name[0] ? name : location);
                } else {
                    snprintf(result_text, sizeof(result_text),
                             "type,id,longitude,latitude,height,url,scale,heading,name\n"
                             "addModel,entity-%d,%.6f,%.6f,0,%s,%.2f,%.1f,%s",
                             entity_id, longitude, latitude, url, scale, heading, name[0] ? name : location);
                }
            } else {
                snprintf(result_text, sizeof(result_text), "Location '%s' not found", location);
            }
        } else {
            strcpy(result_text, "Missing 'location' parameter");
        }
    }
    else if (strcmp(tool_name, "flyToEntity") == 0) {
        char entity_id[64];
        if (json_get_string(args_json, "id", entity_id, sizeof(entity_id))) {
            double duration = 2.0;
            json_get_number(args_json, "duration", duration);
            snprintf(result_text, sizeof(result_text),
                     "type,id,duration\nflyToEntity,%s,%.1f",
                     entity_id, duration);
        } else {
            strcpy(result_text, "Missing 'id' parameter");
        }
    }
    else if (strcmp(tool_name, "showEntity") == 0) {
        char entity_id[64];
        if (json_get_string(args_json, "id", entity_id, sizeof(entity_id))) {
            snprintf(result_text, sizeof(result_text),
                     "type,id,show\nshowEntity,%s,true", entity_id);
        } else {
            strcpy(result_text, "Missing 'id' parameter");
        }
    }
    else if (strcmp(tool_name, "hideEntity") == 0) {
        char entity_id[64];
        if (json_get_string(args_json, "id", entity_id, sizeof(entity_id))) {
            snprintf(result_text, sizeof(result_text),
                     "type,id,show\nshowEntity,%s,false", entity_id);
        } else {
            strcpy(result_text, "Missing 'id' parameter");
        }
    }
    else if (strcmp(tool_name, "setSceneMode") == 0) {
        char mode[16] = "3D";
        json_get_string(args_json, "mode", mode, sizeof(mode));
        snprintf(result_text, sizeof(result_text),
                 "type,mode\nsetSceneMode,%s", mode);
    }
    else if (strcmp(tool_name, "setView") == 0) {
        double lon = 0, lat = 0, height = 10000;
        double heading = 0, pitch = -90, roll = 0;

        json_get_number(args_json, "longitude", lon);
        json_get_number(args_json, "latitude", lat);
        json_get_number(args_json, "height", height);
        json_get_number(args_json, "heading", heading);
        json_get_number(args_json, "pitch", pitch);
        json_get_number(args_json, "roll", roll);

        snprintf(result_text, sizeof(result_text),
                 "type,longitude,latitude,height,heading,pitch,roll\n"
                 "setView,%.6f,%.6f,%.1f,%.1f,%.1f,%.1f",
                 lon, lat, height, heading, pitch, roll);
    }
    else if (strcmp(tool_name, "getCamera") == 0) {
        snprintf(result_text, sizeof(result_text), "type\ngetCamera");
    }
    else if (strcmp(tool_name, "addCircle") == 0) {
        double lon = 0, lat = 0, radius = 1000;
        double height = 0, extruded_height = -1;
        char color[32] = "blue";
        char name[128] = "";

        json_get_number(args_json, "longitude", lon);
        json_get_number(args_json, "latitude", lat);
        json_get_number(args_json, "radius", radius);
        json_get_number(args_json, "height", height);
        json_get_number(args_json, "extrudedHeight", extruded_height);
        json_get_string(args_json, "color", color, sizeof(color));
        json_get_string(args_json, "name", name, sizeof(name));

        int entity_id = entity_counter++;
        if (extruded_height >= 0) {
            snprintf(result_text, sizeof(result_text),
                     "type,id,longitude,latitude,radius,height,color,extrudedHeight,name\n"
                     "addCircle,entity-%d,%.6f,%.6f,%.1f,%.1f,%s,%.1f,%s",
                     entity_id, lon, lat, radius, height, color, extruded_height,
                     name[0] ? name : "circle");
        } else {
            snprintf(result_text, sizeof(result_text),
                     "type,id,longitude,latitude,radius,height,color,name\n"
                     "addCircle,entity-%d,%.6f,%.6f,%.1f,%.1f,%s,%s",
                     entity_id, lon, lat, radius, height, color,
                     name[0] ? name : "circle");
        }
    }
    else if (strcmp(tool_name, "addRectangle") == 0) {
        double west = 0, south = 0, east = 0, north = 0;
        double height = 0, extruded_height = -1;
        char color[32] = "blue";
        char name[128] = "";

        json_get_number(args_json, "west", west);
        json_get_number(args_json, "south", south);
        json_get_number(args_json, "east", east);
        json_get_number(args_json, "north", north);
        json_get_number(args_json, "height", height);
        json_get_number(args_json, "extrudedHeight", extruded_height);
        json_get_string(args_json, "color", color, sizeof(color));
        json_get_string(args_json, "name", name, sizeof(name));

        int entity_id = entity_counter++;
        if (extruded_height >= 0) {
            snprintf(result_text, sizeof(result_text),
                     "type,id,west,south,east,north,height,color,extrudedHeight,name\n"
                     "addRectangle,entity-%d,%.6f,%.6f,%.6f,%.6f,%.1f,%s,%.1f,%s",
                     entity_id, west, south, east, north, height, color, extruded_height,
                     name[0] ? name : "rectangle");
        } else {
            snprintf(result_text, sizeof(result_text),
                     "type,id,west,south,east,north,height,color,name\n"
                     "addRectangle,entity-%d,%.6f,%.6f,%.6f,%.6f,%.1f,%s,%s",
                     entity_id, west, south, east, north, height, color,
                     name[0] ? name : "rectangle");
        }
    }
    else if (strcmp(tool_name, "playAnimation") == 0) {
        snprintf(result_text, sizeof(result_text), "type\nplayAnimation");
    }
    else if (strcmp(tool_name, "pauseAnimation") == 0) {
        snprintf(result_text, sizeof(result_text), "type\npauseAnimation");
    }
    // "Here" tools - use camera target position
    else if (strcmp(tool_name, "addSphereHere") == 0) {
        if (!camera_state_valid) {
            strcpy(result_text, "Camera position not available. Please wait for camera to initialize.");
        } else {
            double radius = 100, height = 0;
            char color[32] = "red";
            char name[128] = "";

            json_get_number(args_json, "radius", radius);
            json_get_number(args_json, "height", height);
            json_get_string(args_json, "color", color, sizeof(color));
            json_get_string(args_json, "name", name, sizeof(name));

            // Clamp to reasonable values
            if (radius > 1000) radius = 100;
            if (radius < 1) radius = 50;
            if (height > 1000) height = 0;
            if (height < 0) height = 0;

            int entity_id = entity_counter++;
            snprintf(result_text, sizeof(result_text),
                     "type,id,longitude,latitude,height,radius,color,name\n"
                     "addSphere,entity-%d,%.6f,%.6f,%.1f,%.1f,%s,%s",
                     entity_id, camera_target_longitude, camera_target_latitude,
                     height, radius, color, name[0] ? name : "sphere");
        }
    }
    else if (strcmp(tool_name, "addBoxHere") == 0) {
        if (!camera_state_valid) {
            strcpy(result_text, "Camera position not available. Please wait for camera to initialize.");
        } else {
            double dim_x = 100, dim_y = 100, dim_z = 50;
            double heading = 0;
            char color[32] = "blue";
            char name[128] = "";

            json_get_number(args_json, "dimensionX", dim_x);
            json_get_number(args_json, "dimensionY", dim_y);
            json_get_number(args_json, "dimensionZ", dim_z);
            json_get_number(args_json, "heading", heading);
            json_get_string(args_json, "color", color, sizeof(color));
            json_get_string(args_json, "name", name, sizeof(name));

            // Enforce minimum dimensions
            if (dim_x < 10) dim_x = 10;
            if (dim_y < 10) dim_y = 10;
            if (dim_z < 10) dim_z = 10;

            double height = dim_z / 2.0;  // Center on ground

            int entity_id = entity_counter++;
            snprintf(result_text, sizeof(result_text),
                     "type,id,longitude,latitude,height,dimensionX,dimensionY,dimensionZ,heading,color,name\n"
                     "addBox,entity-%d,%.6f,%.6f,%.1f,%.1f,%.1f,%.1f,%.1f,%s,%s",
                     entity_id, camera_target_longitude, camera_target_latitude,
                     height, dim_x, dim_y, dim_z, heading, color, name[0] ? name : "box");
        }
    }
    else if (strcmp(tool_name, "addPointHere") == 0) {
        if (!camera_state_valid) {
            strcpy(result_text, "Camera position not available. Please wait for camera to initialize.");
        } else {
            char color[32] = "white";
            char name[128] = "";

            json_get_string(args_json, "color", color, sizeof(color));
            json_get_string(args_json, "name", name, sizeof(name));

            int entity_id = entity_counter++;
            snprintf(result_text, sizeof(result_text),
                     "type,id,longitude,latitude,color,name\n"
                     "addPoint,entity-%d,%.6f,%.6f,%s,%s",
                     entity_id, camera_target_longitude, camera_target_latitude,
                     color, name[0] ? name : "point");
        }
    }
    else if (strcmp(tool_name, "addLabelHere") == 0) {
        if (!camera_state_valid) {
            strcpy(result_text, "Camera position not available. Please wait for camera to initialize.");
        } else {
            char text[256] = "";
            json_get_string(args_json, "text", text, sizeof(text));

            int entity_id = entity_counter++;
            snprintf(result_text, sizeof(result_text),
                     "type,id,longitude,latitude,text\n"
                     "addLabel,entity-%d,%.6f,%.6f,%s",
                     entity_id, camera_target_longitude, camera_target_latitude, text);
        }
    }
    else if (strcmp(tool_name, "addCylinderHere") == 0) {
        if (!camera_state_valid) {
            strcpy(result_text, "Camera position not available. Please wait for camera to initialize.");
        } else {
            double top_radius = 50, bottom_radius = 50, cylinder_height = 100;
            char color[32] = "green";
            char name[128] = "";

            json_get_number(args_json, "topRadius", top_radius);
            json_get_number(args_json, "bottomRadius", bottom_radius);
            json_get_number(args_json, "cylinderHeight", cylinder_height);
            json_get_string(args_json, "color", color, sizeof(color));
            json_get_string(args_json, "name", name, sizeof(name));

            int entity_id = entity_counter++;
            snprintf(result_text, sizeof(result_text),
                     "type,id,longitude,latitude,height,topRadius,bottomRadius,cylinderHeight,color,name\n"
                     "addCylinder,entity-%d,%.6f,%.6f,0,%.1f,%.1f,%.1f,%s,%s",
                     entity_id, camera_target_longitude, camera_target_latitude,
                     top_radius, bottom_radius, cylinder_height, color, name[0] ? name : "cylinder");
        }
    }
    else if (strcmp(tool_name, "addCircleHere") == 0) {
        if (!camera_state_valid) {
            strcpy(result_text, "Camera position not available. Please wait for camera to initialize.");
        } else {
            double radius = 100, height = 0, extruded_height = -1;
            char color[32] = "blue";
            char name[128] = "";

            json_get_number(args_json, "radius", radius);
            json_get_number(args_json, "height", height);
            json_get_number(args_json, "extrudedHeight", extruded_height);
            json_get_string(args_json, "color", color, sizeof(color));
            json_get_string(args_json, "name", name, sizeof(name));

            int entity_id = entity_counter++;
            if (extruded_height >= 0) {
                snprintf(result_text, sizeof(result_text),
                         "type,id,longitude,latitude,radius,height,color,extrudedHeight,name\n"
                         "addCircle,entity-%d,%.6f,%.6f,%.1f,%.1f,%s,%.1f,%s",
                         entity_id, camera_target_longitude, camera_target_latitude,
                         radius, height, color, extruded_height, name[0] ? name : "circle");
            } else {
                snprintf(result_text, sizeof(result_text),
                         "type,id,longitude,latitude,radius,height,color,name\n"
                         "addCircle,entity-%d,%.6f,%.6f,%.1f,%.1f,%s,%s",
                         entity_id, camera_target_longitude, camera_target_latitude,
                         radius, height, color, name[0] ? name : "circle");
            }
        }
    }
    else if (strcmp(tool_name, "addModelHere") == 0) {
        if (!camera_state_valid) {
            strcpy(result_text, "Camera position not available. Please wait for camera to initialize.");
        } else {
            double scale = 1.0, heading = 0;
            double ion_asset_id = -1;
            char url[512] = "";
            char name[128] = "";

            json_get_string(args_json, "url", url, sizeof(url));
            json_get_number(args_json, "ionAssetId", ion_asset_id);
            json_get_number(args_json, "scale", scale);
            json_get_number(args_json, "heading", heading);
            json_get_string(args_json, "name", name, sizeof(name));

            int entity_id = entity_counter++;
            if (ion_asset_id > 0) {
                snprintf(result_text, sizeof(result_text),
                         "type,id,longitude,latitude,height,ionAssetId,scale,heading,name\n"
                         "addModel,entity-%d,%.6f,%.6f,0,%.0f,%.2f,%.1f,%s",
                         entity_id, camera_target_longitude, camera_target_latitude,
                         ion_asset_id, scale, heading, name[0] ? name : "model");
            } else {
                snprintf(result_text, sizeof(result_text),
                         "type,id,longitude,latitude,height,url,scale,heading,name\n"
                         "addModel,entity-%d,%.6f,%.6f,0,%s,%.2f,%.1f,%s",
                         entity_id, camera_target_longitude, camera_target_latitude,
                         url, scale, heading, name[0] ? name : "model");
            }
        }
    }
    else if (strcmp(tool_name, "addPolygonHere") == 0) {
        if (!camera_state_valid) {
            strcpy(result_text, "Camera position not available. Please wait for camera to initialize.");
        } else {
            double radius = 100, height = 0, extruded_height = -1;
            double sides = 6;  // Default hexagon
            char color[32] = "blue";
            char name[128] = "";

            json_get_number(args_json, "radius", radius);
            json_get_number(args_json, "sides", sides);
            json_get_number(args_json, "height", height);
            json_get_number(args_json, "extrudedHeight", extruded_height);
            json_get_string(args_json, "color", color, sizeof(color));
            json_get_string(args_json, "name", name, sizeof(name));

            if (sides < 3) sides = 3;
            if (sides > 32) sides = 32;

            // Generate polygon vertices around center point
            // Approximate: 1 degree latitude ~ 111km, longitude varies by cos(lat)
            double lat_deg_per_meter = 1.0 / 111000.0;
            double lon_deg_per_meter = lat_deg_per_meter / (cos(camera_target_latitude * 3.14159265358979 / 180.0) + 0.001);

            int entity_id = entity_counter++;
            // Section 1: command metadata
            size_t offset = 0;
            if (extruded_height >= 0) {
                offset += snprintf(result_text + offset, sizeof(result_text) - offset,
                                   "type,id,color,height,extrudedHeight,name\n"
                                   "addPolygon,entity-%d,%s,%.1f,%.1f,%s",
                                   entity_id, color, height, extruded_height,
                                   name[0] ? name : "polygon");
            } else {
                offset += snprintf(result_text + offset, sizeof(result_text) - offset,
                                   "type,id,color,height,name\n"
                                   "addPolygon,entity-%d,%s,%.1f,%s",
                                   entity_id, color, height,
                                   name[0] ? name : "polygon");
            }

            // Section 2: position rows
            offset += snprintf(result_text + offset, sizeof(result_text) - offset,
                               "\n\nlongitude,latitude");
            for (int i = 0; i < (int)sides; i++) {
                double angle = 2.0 * 3.14159265358979 * i / sides;
                double dx = radius * cos(angle) * lon_deg_per_meter;
                double dy = radius * sin(angle) * lat_deg_per_meter;
                offset += snprintf(result_text + offset, sizeof(result_text) - offset,
                                   "\n%.6f,%.6f",
                                   camera_target_longitude + dx, camera_target_latitude + dy);
            }
        }
    }
    else if (strcmp(tool_name, "addEntityHere") == 0) {
        // Generic entity add - routes to appropriate type
        if (!camera_state_valid) {
            strcpy(result_text, "Camera position not available. Please wait for camera to initialize.");
        } else {
            char entity_type[32] = "sphere";
            double radius = 50, height = 0;
            char color[32] = "red";
            char name[128] = "";
            char text[256] = "";

            json_get_string(args_json, "entityType", entity_type, sizeof(entity_type));
            json_get_number(args_json, "radius", radius);
            json_get_number(args_json, "height", height);
            json_get_string(args_json, "color", color, sizeof(color));
            json_get_string(args_json, "name", name, sizeof(name));
            json_get_string(args_json, "text", text, sizeof(text));

            int entity_id = entity_counter++;

            if (strcmp(entity_type, "sphere") == 0) {
                if (radius > 1000) radius = 100;
                if (radius < 1) radius = 50;
                snprintf(result_text, sizeof(result_text),
                         "type,id,longitude,latitude,height,radius,color,name\n"
                         "addSphere,entity-%d,%.6f,%.6f,%.1f,%.1f,%s,%s",
                         entity_id, camera_target_longitude, camera_target_latitude,
                         height, radius, color, name[0] ? name : "sphere");
            }
            else if (strcmp(entity_type, "box") == 0) {
                double dim = radius > 0 ? radius : 50;
                snprintf(result_text, sizeof(result_text),
                         "type,id,longitude,latitude,height,dimensionX,dimensionY,dimensionZ,color,name\n"
                         "addBox,entity-%d,%.6f,%.6f,%.1f,%.1f,%.1f,%.1f,%s,%s",
                         entity_id, camera_target_longitude, camera_target_latitude,
                         dim / 2.0, dim, dim, dim, color, name[0] ? name : "box");
            }
            else if (strcmp(entity_type, "cylinder") == 0) {
                double r = radius > 0 ? radius : 50;
                snprintf(result_text, sizeof(result_text),
                         "type,id,longitude,latitude,height,topRadius,bottomRadius,cylinderHeight,color,name\n"
                         "addCylinder,entity-%d,%.6f,%.6f,0,%.1f,%.1f,%.1f,%s,%s",
                         entity_id, camera_target_longitude, camera_target_latitude,
                         r, r, r * 2, color, name[0] ? name : "cylinder");
            }
            else if (strcmp(entity_type, "point") == 0) {
                snprintf(result_text, sizeof(result_text),
                         "type,id,longitude,latitude,color,name\n"
                         "addPoint,entity-%d,%.6f,%.6f,%s,%s",
                         entity_id, camera_target_longitude, camera_target_latitude,
                         color, name[0] ? name : "point");
            }
            else if (strcmp(entity_type, "label") == 0) {
                snprintf(result_text, sizeof(result_text),
                         "type,id,longitude,latitude,text\n"
                         "addLabel,entity-%d,%.6f,%.6f,%s",
                         entity_id, camera_target_longitude, camera_target_latitude,
                         text[0] ? text : "Label");
            }
            else if (strcmp(entity_type, "circle") == 0) {
                snprintf(result_text, sizeof(result_text),
                         "type,id,longitude,latitude,radius,height,color,name\n"
                         "addCircle,entity-%d,%.6f,%.6f,%.1f,%.1f,%s,%s",
                         entity_id, camera_target_longitude, camera_target_latitude,
                         radius > 0 ? radius : 100, height, color, name[0] ? name : "circle");
            }
            else if (strcmp(entity_type, "model") == 0) {
                snprintf(result_text, sizeof(result_text),
                         "type,id,longitude,latitude,height,url,scale,heading,name\n"
                         "addModel,entity-%d,%.6f,%.6f,%.1f,,1.0,0,%s",
                         entity_id, camera_target_longitude, camera_target_latitude,
                         height, name[0] ? name : "model");
            }
            else {
                snprintf(result_text, sizeof(result_text),
                         "Unknown entity type: %s. Use: sphere, box, cylinder, point, label, circle, model",
                         entity_type);
            }
        }
    }
    else if (strcmp(tool_name, "addSensorConeHere") == 0) {
        // Add sensor cone/fan at camera target
        if (!camera_state_valid) {
            strcpy(result_text, "Camera position not available. Please wait for camera to initialize.");
        } else {
            double radius = 5000;         // Default 5km range (visible at city scale)
            double horizontal_angle = 45; // Default 45 degree horizontal FOV
            double vertical_angle = 30;   // Default 30 degree vertical FOV
            double heading = 0;           // Default pointing north
            double pitch = 0;             // Default horizontal
            double height = 100;          // Default 100m above ground (so it doesn't clip)
            double inner_radius = 0;      // Default solid cone
            double opacity = 0.5;         // Default semi-transparent
            char color[32] = "lime";
            char name[128] = "";

            json_get_number(args_json, "radius", radius);
            json_get_number(args_json, "horizontalAngle", horizontal_angle);
            json_get_number(args_json, "verticalAngle", vertical_angle);
            json_get_number(args_json, "heading", heading);
            json_get_number(args_json, "pitch", pitch);
            json_get_number(args_json, "height", height);
            json_get_number(args_json, "innerRadius", inner_radius);
            json_get_number(args_json, "opacity", opacity);
            json_get_string(args_json, "color", color, sizeof(color));
            json_get_string(args_json, "name", name, sizeof(name));

            // Clamp values
            if (horizontal_angle < 1) horizontal_angle = 1;
            if (horizontal_angle > 360) horizontal_angle = 360;
            if (vertical_angle < 1) vertical_angle = 1;
            if (vertical_angle > 180) vertical_angle = 180;
            if (opacity < 0) opacity = 0;
            if (opacity > 1) opacity = 1;
            if (radius < 100) radius = 100;
            if (inner_radius < 0) inner_radius = 0;
            if (inner_radius >= radius) inner_radius = 0;

            int entity_id = entity_counter++;
            snprintf(result_text, sizeof(result_text),
                     "type,id,longitude,latitude,height,radius,horizontalAngle,verticalAngle,heading,pitch,innerRadius,color,opacity,name\n"
                     "addSensorCone,entity-%d,%.6f,%.6f,%.1f,%.1f,%.1f,%.1f,%.1f,%.1f,%.1f,%s,%.2f,%s",
                     entity_id, camera_target_longitude, camera_target_latitude,
                     height, radius, horizontal_angle, vertical_angle,
                     heading, pitch, inner_radius, color, opacity,
                     name[0] ? name : "sensor");
        }
    }
    else {
        // Pass through to external handler (will be implemented by JS glue code)
        snprintf(result_text, sizeof(result_text),
                 "Tool '%s' executed with args: %s", tool_name, args_json);
    }

    char result[65536];
    format_tool_result(result_text, false, result, sizeof(result));
    return create_success_response(id, result, response, response_size);
}

size_t handle_resources_list(const char* id, char* response, size_t response_size) {
    return create_success_response(id, RESOURCES_JSON, response, response_size);
}

size_t handle_resources_read(const char* id, const char* params, char* response, size_t response_size) {
    char uri[256];
    if (!json_get_string(params, "uri", uri, sizeof(uri))) {
        return create_error_response(id, ErrorCode::InvalidParams, "Missing uri",
                                     response, response_size);
    }

    char content[8192];

    if (strcmp(uri, "cesium://scene/state") == 0) {
        strcpy(content, R"JSON({"contents":[{"uri":"cesium://scene/state","mimeType":"application/json","text":"{\"mode\":\"3D\"}"}]})JSON");
    }
    else if (strcmp(uri, "cesium://entities") == 0) {
        strcpy(content, R"JSON({"contents":[{"uri":"cesium://entities","mimeType":"application/json","text":"[]"}]})JSON");
    }
    else if (strcmp(uri, "cesium://camera") == 0) {
        strcpy(content, R"JSON({"contents":[{"uri":"cesium://camera","mimeType":"application/json","text":"{\"longitude\":0,\"latitude\":0,\"height\":10000000}"}]})JSON");
    }
    else if (strcmp(uri, "cesium://locations") == 0) {
        // Build locations list
        const Location* locations = get_all_locations();
        size_t count = get_location_count();

        char locations_json[32768];
        size_t offset = 0;
        offset += snprintf(locations_json + offset, sizeof(locations_json) - offset, "[");

        bool first = true;
        for (size_t i = 0; i < count && offset < sizeof(locations_json) - 100; i++) {
            if (locations[i].name == nullptr) continue;
            if (!first) {
                offset += snprintf(locations_json + offset, sizeof(locations_json) - offset, ",");
            }
            first = false;
            offset += snprintf(locations_json + offset, sizeof(locations_json) - offset,
                               "\"%s\"", locations[i].name);
        }
        offset += snprintf(locations_json + offset, sizeof(locations_json) - offset, "]");

        snprintf(content, sizeof(content),
                 "{\"contents\":[{\"uri\":\"cesium://locations\",\"mimeType\":\"application/json\",\"text\":%s}]}",
                 locations_json);
    }
    else {
        return create_error_response(id, ErrorCode::InvalidParams, "Unknown resource",
                                     response, response_size);
    }

    return create_success_response(id, content, response, response_size);
}

size_t handle_message(const char* message, char* response, size_t response_size) {
    // Validate JSON-RPC structure
    if (strstr(message, "\"jsonrpc\"") == nullptr) {
        return create_error_response("null", ErrorCode::InvalidRequest,
                                     "Missing jsonrpc field", response, response_size);
    }

    char jsonrpc[8];
    if (!json_get_string(message, "jsonrpc", jsonrpc, sizeof(jsonrpc)) ||
        strcmp(jsonrpc, "2.0") != 0) {
        return create_error_response("null", ErrorCode::InvalidRequest,
                                     "Invalid JSON-RPC version", response, response_size);
    }

    // Extract ID
    char id_str[64] = "null";
    int64_t id_int;
    if (json_get_int(message, "id", id_int)) {
        snprintf(id_str, sizeof(id_str), "%lld", (long long)id_int);
    } else {
        char id_string[64];
        if (json_get_string(message, "id", id_string, sizeof(id_string))) {
            snprintf(id_str, sizeof(id_str), "\"%s\"", id_string);
        }
    }

    // Extract method
    char method[64];
    if (!json_get_string(message, "method", method, sizeof(method))) {
        // Might be a response, not a request
        return 0;
    }

    // Extract params
    char params[8192];
    json_get_object(message, "params", params, sizeof(params));

    // Route to handlers
    if (strcmp(method, "initialize") == 0) {
        return handle_initialize(id_str, params, response, response_size);
    }
    if (strcmp(method, "initialized") == 0) {
        // Notification - no response
        return 0;
    }
    if (strcmp(method, "tools/list") == 0) {
        return handle_tools_list(id_str, response, response_size);
    }
    if (strcmp(method, "tools/call") == 0) {
        return handle_tools_call(id_str, params, response, response_size);
    }
    if (strcmp(method, "resources/list") == 0) {
        return handle_resources_list(id_str, response, response_size);
    }
    if (strcmp(method, "resources/read") == 0) {
        return handle_resources_read(id_str, params, response, response_size);
    }
    if (strcmp(method, "ping") == 0) {
        return create_success_response(id_str, "{}", response, response_size);
    }

    // Unknown method
    char error_msg[128];
    snprintf(error_msg, sizeof(error_msg), "Method not found: %s", method);
    return create_error_response(id_str, ErrorCode::MethodNotFound, error_msg,
                                 response, response_size);
}

}  // namespace mcp
}  // namespace cesium

// ============================================================================
// C exports for WASM
// ============================================================================

extern "C" {

void init() {
    cesium::mcp::init();
}

const char* handleMessage(const char* message) {
    cesium::mcp::handle_message(message, cesium::mcp::response_buffer,
                                cesium::mcp::MAX_RESPONSE_SIZE);
    return cesium::mcp::response_buffer;
}

const char* getToolDefinitions() {
    cesium::mcp::get_tool_definitions(cesium::mcp::tools_buffer,
                                      cesium::mcp::MAX_TOOLS_SIZE);
    return cesium::mcp::tools_buffer;
}

const char* resolveLocation(const char* name) {
    double longitude, latitude, heading;
    if (cesium::mcp::resolve_location(name, longitude, latitude, heading)) {
        if (heading >= 0) {
            snprintf(cesium::mcp::response_buffer, cesium::mcp::MAX_RESPONSE_SIZE,
                     "{\"found\":true,\"longitude\":%.6f,\"latitude\":%.6f,\"heading\":%.1f}",
                     longitude, latitude, heading);
        } else {
            snprintf(cesium::mcp::response_buffer, cesium::mcp::MAX_RESPONSE_SIZE,
                     "{\"found\":true,\"longitude\":%.6f,\"latitude\":%.6f}",
                     longitude, latitude);
        }
    } else {
        snprintf(cesium::mcp::response_buffer, cesium::mcp::MAX_RESPONSE_SIZE,
                 "{\"found\":false,\"error\":\"Location not found: %s\"}", name);
    }
    return cesium::mcp::response_buffer;
}

void setCameraState(double lon, double lat, double height, double targetLon, double targetLat) {
    cesium::mcp::camera_longitude = lon;
    cesium::mcp::camera_latitude = lat;
    cesium::mcp::camera_height = height;
    cesium::mcp::camera_target_longitude = targetLon;
    cesium::mcp::camera_target_latitude = targetLat;
    cesium::mcp::camera_state_valid = true;
}

const char* getCameraTarget() {
    if (cesium::mcp::camera_state_valid) {
        snprintf(cesium::mcp::response_buffer, cesium::mcp::MAX_RESPONSE_SIZE,
                 "{\"valid\":true,\"longitude\":%.6f,\"latitude\":%.6f,\"height\":%.1f,"
                 "\"targetLongitude\":%.6f,\"targetLatitude\":%.6f}",
                 cesium::mcp::camera_longitude, cesium::mcp::camera_latitude,
                 cesium::mcp::camera_height,
                 cesium::mcp::camera_target_longitude, cesium::mcp::camera_target_latitude);
    } else {
        snprintf(cesium::mcp::response_buffer, cesium::mcp::MAX_RESPONSE_SIZE,
                 "{\"valid\":false}");
    }
    return cesium::mcp::response_buffer;
}

const char* listLocations() {
    const cesium::mcp::Location* locations = cesium::mcp::get_all_locations();
    size_t count = cesium::mcp::get_location_count();

    size_t offset = 0;
    offset += snprintf(cesium::mcp::response_buffer + offset,
                       cesium::mcp::MAX_RESPONSE_SIZE - offset, "[");

    bool first = true;
    for (size_t i = 0; i < count && offset < cesium::mcp::MAX_RESPONSE_SIZE - 100; i++) {
        if (locations[i].name == nullptr) continue;
        if (!first) {
            offset += snprintf(cesium::mcp::response_buffer + offset,
                               cesium::mcp::MAX_RESPONSE_SIZE - offset, ",");
        }
        first = false;
        if (locations[i].heading >= 0) {
            offset += snprintf(cesium::mcp::response_buffer + offset,
                               cesium::mcp::MAX_RESPONSE_SIZE - offset,
                               "{\"name\":\"%s\",\"longitude\":%.6f,\"latitude\":%.6f,\"heading\":%.1f}",
                               locations[i].name, locations[i].longitude, locations[i].latitude, locations[i].heading);
        } else {
            offset += snprintf(cesium::mcp::response_buffer + offset,
                               cesium::mcp::MAX_RESPONSE_SIZE - offset,
                               "{\"name\":\"%s\",\"longitude\":%.6f,\"latitude\":%.6f}",
                               locations[i].name, locations[i].longitude, locations[i].latitude);
        }
    }

    snprintf(cesium::mcp::response_buffer + offset,
             cesium::mcp::MAX_RESPONSE_SIZE - offset, "]");

    return cesium::mcp::response_buffer;
}

}
