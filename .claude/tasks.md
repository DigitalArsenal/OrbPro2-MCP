# OrbPro2 MCP - Feature Roadmap

## Vision
Enable AI-powered geospatial workflows where the MCP server itself can make smart queries on behalf of the user. The LLM issues high-level intents, and the MCP handles the complexity of external API calls, data fusion, and visualization.

---

## Architecture: Smart MCP with Network Access

### Emscripten Fetch API
The C++/WASM MCP server can make HTTP requests directly from the browser using the [Emscripten Fetch API](https://emscripten.org/docs/api_reference/fetch.html):
- Compile with `-sFETCH` flag
- Supports async XHR requests (GET, POST, PUT)
- Subject to CORS rules (use CORS-enabled APIs or proxy)

### Benefits of MCP-Side Networking
- **Single tool call** for complex queries (e.g., "find hospitals within 10km" = geocode + POI search + distance calc)
- **Reduced LLM token usage** - no need to orchestrate multiple API calls
- **Caching** - MCP can cache frequently requested data
- **Offline fallback** - gracefully degrade when APIs unavailable

---

## External APIs to Integrate

### 1. OpenRouteService (Routing)
**URL**: https://openrouteservice.org/
**GitHub**: https://github.com/GIScience/openrouteservice

- Free tier: 2,000 requests/day
- Directions (walking, cycling, driving, wheelchair)
- Isochrones (areas reachable within X minutes)
- Distance matrices
- Uses OpenStreetMap data

### 2. Overpass API (POI Search)
**URL**: https://wiki.openstreetmap.org/wiki/Overpass_API
**Endpoint**: https://overpass-api.de/api/interpreter

- Free, no API key required
- Query any OpenStreetMap feature type
- Bounding box and radius queries
- Examples: `amenity=restaurant`, `amenity=hospital`, `leisure=park`

### 3. Nominatim (Geocoding)
**URL**: https://nominatim.org/
**Demo**: https://nominatim.openstreetmap.org/

- Free (rate limited: 1 req/sec on public instance)
- Forward geocoding (address → coordinates)
- Reverse geocoding (coordinates → address)
- Can self-host for higher throughput

---

## Feature Backlog

### Phase 1: Smart Routing & Navigation

#### `getRoute` / `getRouteAndVisualize`
```
"Create a walking path from north Central Park to south Central Park"
```
- Input: start location, end location, mode (walk/bike/drive)
- MCP calls OpenRouteService Directions API
- Returns waypoints as polyline coordinates
- Optionally adds animated path with model

#### `getWalkingRoute` / `getDrivingRoute` / `getCyclingRoute`
Convenience wrappers for common transport modes.

#### `addAnimatedRoute`
```
"Show a person walking from Times Square to Grand Central"
```
- Combines routing + animated model on path
- Uses `trackVehicle` internally with route waypoints

#### `getIsochrone`
```
"Show me everywhere I can walk to in 15 minutes from here"
```
- Input: center point, time (minutes), mode
- Returns polygon of reachable area
- Visualizes as filled polygon on globe

---

### Phase 2: POI Search & Discovery

#### `searchPOI` / `findNearby`
```
"Find the best pizza places near Times Square"
"Show me hospitals within 10km of the earthquake epicenter"
```
- Input: category, location/bbox, radius
- MCP calls Overpass API
- Returns list with names, coordinates, metadata
- Categories: restaurant, hospital, park, airport, hotel, museum, etc.

#### `addPOIMarkers`
```
"Add markers for all major airports in California"
```
- Searches and visualizes in one call
- Adds labeled points/billboards for each result

#### `findNearest`
```
"What's the nearest hospital?"
```
- Uses current camera position as reference
- Returns single closest result

#### `findWithinRadius`
```
"Find all parks within 5km and draw radius circles around each"
```
- Searches + adds circle visualization for each

---

### Phase 3: Spatial Analysis

#### `findParcelsWithCriteria`
```
"Find parcels within 800m of light rail with slope less than 15%"
```
- Complex query combining:
  - Distance from transit (isochrone or buffer)
  - Terrain slope analysis (sampleTerrainHeight)
  - Parcel data (requires external parcel dataset)

#### `calculateEvacuationRoutes`
```
"Identify hospitals within 10km of earthquake epicenter with evacuation routes"
```
- POI search for hospitals
- Routing from each hospital to safe zone
- Visualize all routes

#### `bufferAnalysis`
```
"Create a 1km buffer around this road"
```
- Input: polyline/polygon, buffer distance
- Output: buffered polygon

---

### Phase 4: Enhanced Geocoding

#### `geocode`
```
"Where is the Louvre Museum?"
```
- Falls back to Nominatim when location not in database
- Caches results in location database

#### `reverseGeocode`
```
"What address is at these coordinates?"
```
- Get address/place name from lat/lon

#### `searchAddress`
```
"Find 123 Main Street, San Francisco"
```
- Structured address search

---

### Phase 5: Flight & Animation

#### `createFlightPath`
```
"Create a flight path animation from Paris to London with a 30-second duration"
```
- Great circle route between cities
- Animated aircraft model along path
- Camera follows or watches

#### `animateAlongRoute`
```
"Show a delivery truck driving the route"
```
- Takes existing route
- Adds animated model following it

#### `showTrafficFlow`
```
"Visualize traffic flow on this highway"
```
- Animated polylines showing direction
- Color coding for speed/congestion

---

## Implementation Plan

### Step 1: Enable Emscripten Fetch ✅ DONE
- [x] Add `-sFETCH` and `-sASYNCIFY` to CMakeLists.txt
- [x] Create `http_client.h/cpp` wrapper for fetch API
- [x] Handle sync requests via ASYNCIFY

### Step 2: OpenRouteService Integration ✅ DONE
- [x] Implement `ors_get_directions()` in C++
- [x] Implement `ors_get_isochrone()` in C++
- [x] Add `getRoute` tool to MCP
- [x] Add `getIsochrone` tool to MCP
- [x] Add API key configuration UI (Settings gear icon in header)

### Step 2b: OSRM Local Routing ✅ DONE

- [x] Add Vite proxy for local OSRM server (`/api/osrm` → `localhost:5000`)
- [x] Implement `osrm_get_directions()` in C++
- [x] Update `getRoute`, `walkTo`, `driveTo` to auto-detect backend
- [x] Falls back to OSRM when no API key provided

### Step 3: Overpass API Integration ✅ DONE
- [x] Implement `overpass_query()` function
- [x] Implement `overpass_search_poi()` for common POI types
- [x] Add `searchPOI` tool to MCP
- [x] Add TypeScript execution handler for POI visualization

### Step 4: Enhanced Geocoding (Partial)
- [x] Nominatim functions implemented in C++ (`nominatim_geocode`, `nominatim_reverse`)
- [ ] Add `geocode` and `reverseGeocode` tools to MCP
- [ ] Cache results in location database

### Step 5: Compound Tools ✅ DONE
- [x] `walkTo` - route + animated walking model
- [x] `driveTo` - route + animated car model
- [x] `flyPathTo` - great circle + animated plane
- [x] `findAndShow` - POI search + markers + fly to area

### Step 6: Settings UI ✅ DONE

- [x] Settings panel with gear icon in header
- [x] Tabbed interface: Routing, AI Providers, Mapping, Cesium
- [x] API key inputs for: OpenRouteService, OpenAI, Anthropic, Together, Groq, Cerebras, SambaNova, Fireworks
- [x] Custom endpoint inputs: Ollama, OSRM, Nominatim, Overpass
- [x] Cesium Ion token configuration
- [x] Model reset button to change/unload current model
- [x] LocalStorage persistence for all settings

---

## Creative Compound Tools - Full Wishlist

### Navigation & Routing
| Tool | Description | APIs Used |
|------|-------------|-----------|
| `walkTo` ✅ | Animated person walking between locations | ORS Directions |
| `driveTo` ✅ | Animated vehicle driving between locations | ORS Directions |
| `flyPathTo` ✅ | Great circle flight with aircraft model | Internal |
| `bikeTo` | Cycling route with bike animation | ORS Directions |
| `transitTo` | Public transit route (bus/train stops) | ORS + GTFS |
| `shipTo` | Maritime route between ports | Sea routing API |
| `deliveryRoute` | Multi-stop delivery route with timestamps | ORS Optimization |
| `evacuationRoute` | Emergency evacuation from point to safety | ORS + POI |

### POI Discovery & Visualization
| Tool | Description | APIs Used |
|------|-------------|-----------|
| `findAndShow` ✅ | Search POI and display markers | Overpass |
| `findNearest` | Find single closest POI of type | Overpass |
| `findWithinTime` | POI reachable within X minutes | ORS Isochrone + Overpass |
| `compareNearby` | Side-by-side POI comparison (hospitals, schools) | Overpass |
| `showAllInBounds` | All POI of type in current view | Overpass |
| `heatmapPOI` | Density heatmap of POI type | Overpass |
| `clusterPOI` | Clustered markers for large POI sets | Overpass |

### Analysis & Planning
| Tool | Description | APIs Used |
|------|-------------|-----------|
| `bufferZone` | Create buffer polygon around feature | Internal |
| `reachabilityMap` | Multi-time isochrone visualization | ORS Isochrone |
| `coverageAnalysis` | Service coverage (hospitals within 10min) | ORS + Overpass |
| `siteSelection` | Find parcels matching criteria | ORS + Overpass + terrain |
| `viewshedAnalysis` | What's visible from a point | Terrain sampling |
| `slopeAnalysis` | Terrain slope classification | Terrain sampling |
| `floodRisk` | Areas below elevation threshold | Terrain + polygon |
| `shadowAnalysis` | Building shadows at time of day | Sun position + 3D tiles |

### Simulation & Animation
| Tool | Description | APIs Used |
|------|-------------|-----------|
| `simulateTraffic` | Multiple vehicles on road network | ORS + animation |
| `simulateEvacuation` | Mass movement from danger zone | ORS + crowd sim |
| `timelapseGrowth` | Urban growth over time | Historical imagery |
| `flightTracker` | Real-time flight positions | Aviation API |
| `shipTracker` | Real-time vessel positions | AIS data |
| `stormTracker` | Hurricane/storm path visualization | Weather API |
| `fireSpread` | Wildfire spread simulation | Terrain + wind |
| `tsunamiWave` | Wave propagation visualization | Bathymetry |

### Storytelling & Tours
| Tool | Description | APIs Used |
|------|-------------|-----------|
| `narrativeTour` | Guided tour with waypoints and text | Internal |
| `compareThen` | Historical vs current imagery split | Imagery layers |
| `timeTravel` | Animate through historical imagery | Time-series imagery |
| `annotateArea` | Add contextual annotations to region | Internal |
| `measureJourney` | Distance/time for multi-stop trip | ORS Matrix |
| `photoTour` | Geotagged photos along route | Photo APIs |

### Emergency & Safety
| Tool | Description | APIs Used |
|------|-------------|-----------|
| `nearestHospital` | Find and route to closest hospital | ORS + Overpass |
| `nearestShelter` | Emergency shelter locations | Overpass |
| `hazardZone` | Visualize danger areas (flood, fire) | GeoJSON |
| `emergencyServices` | Show police, fire, ambulance coverage | Overpass |
| `safeRouteAway` | Route away from danger zone | ORS + geometry |
| `meetingPoint` | Central meeting point for group | ORS Matrix |

### Urban Planning
| Tool | Description | APIs Used |
|------|-------------|-----------|
| `transitAccess` | Areas within X min of transit | ORS + GTFS |
| `walkability` | Walkability score visualization | ORS + amenity density |
| `parkingFinder` | Available parking near destination | Overpass + real-time |
| `zoneCompliance` | Check building against zoning | Parcel data |
| `densityMap` | Population/building density | Census + OSM |
| `greenSpace` | Parks and open space analysis | Overpass |

### Environmental
| Tool | Description | APIs Used |
|------|-------------|-----------|
| `airQuality` | Air quality index overlay | Environmental API |
| `noiseMap` | Traffic noise visualization | Traffic + modeling |
| `solarPotential` | Rooftop solar analysis | 3D tiles + sun |
| `floodPlain` | Flood zone visualization | FEMA/terrain |
| `watershedAnalysis` | Water flow paths | Terrain |
| `wildlifeCorridor` | Animal movement paths | Conservation data |

### Real Estate & Business
| Tool | Description | APIs Used |
|------|-------------|-----------|
| `commuteAnalysis` | Commute time from property | ORS Matrix |
| `neighborhoodScore` | Amenity access scoring | Overpass + isochrone |
| `competitorMap` | Business competitor locations | Overpass |
| `tradeArea` | Customer catchment area | ORS Isochrone |
| `demographicOverlay` | Population demographics | Census API |
| `footTraffic` | Pedestrian traffic estimation | OSM + modeling |

---

## Implementation Priority

### Phase 1 - Core (DONE)
- [x] `walkTo`, `driveTo`, `flyPathTo`, `findAndShow`

### Phase 2 - High Value
- [ ] `findNearest` - Very common use case
- [ ] `reachabilityMap` - Multi-ring isochrones
- [ ] `nearestHospital` - Emergency use case
- [ ] `narrativeTour` - Storytelling

### Phase 3 - Analysis
- [ ] `coverageAnalysis` - Planning workflows
- [ ] `siteSelection` - Real estate/planning
- [ ] `transitAccess` - Urban planning

### Phase 4 - Advanced
- [ ] `simulateTraffic` - Requires animation system
- [ ] `flightTracker` - Requires real-time data
- [ ] `timeTravel` - Requires historical imagery

---

## Cesium Community Feature Requests

From [Cesium Community Forum](https://community.cesium.com/):

| Request | Status | Tool(s) Needed |
|---------|--------|----------------|
| "Fly to the Eiffel Tower and zoom to 500m" | ✅ Done | `flyToLocation` |
| "Find parcels within 800m of light rail with slope < 15%" | 🔲 Todo | `getIsochrone` + terrain analysis + parcel data |
| "Identify hospitals within 10km of earthquake with evacuation routes" | 🔲 Todo | `searchPOI` + `getRoute` |
| "Add markers for all major airports in California" | 🔲 Todo | `searchPOI` + `addPOIMarkers` |
| "Create flight path from Paris to London, 30-second duration" | 🔲 Todo | `createFlightPath` |
| "Find nearest parks and draw 5km radius around each" | 🔲 Todo | `searchPOI` + `addCircle` |
| "Show a person walking from A to B" | 🔲 Todo | `getRoute` + `trackVehicle` |
| "Find the best pizza place" | 🔲 Todo | `searchPOI` |

---

## API Keys & Configuration

```typescript
// Suggested config structure
interface MCPConfig {
  openRouteService: {
    apiKey: string;
    endpoint?: string; // default: https://api.openrouteservice.org
  };
  overpass: {
    endpoint?: string; // default: https://overpass-api.de/api/interpreter
  };
  nominatim: {
    endpoint?: string; // default: https://nominatim.openstreetmap.org
    userAgent: string; // required for public instance
  };
  corsProxy?: string; // optional proxy for CORS-restricted APIs
}
```

---

## Notes

### WASI vs Emscripten
- WASI 0.3 (expected Feb 2026) will have native `wasi:http` support
- For now, Emscripten Fetch API is the right choice for browser WASM
- [WASI HTTP spec](https://github.com/WebAssembly/wasi-http)
- [State of WebAssembly 2025-2026](https://platform.uno/blog/the-state-of-webassembly-2025-2026/)

### Rate Limiting
- OpenRouteService: 2,000/day free tier
- Nominatim public: 1 req/sec (self-host for more)
- Overpass: Fair use, no hard limit

### Caching Strategy
- Cache geocoding results in IndexedDB
- Cache route results for repeated queries
- Use Emscripten's IndexedDB persistence with Fetch API
