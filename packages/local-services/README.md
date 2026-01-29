# OrbPro2 Local Geospatial Services

Local Docker services for offline/fast geospatial operations in OrbPro2.

## Services

| Service | Port | Purpose | API Docs |
|---------|------|---------|----------|
| **OSRM** | 5000 | Routing (driving) | [OSRM API](https://project-osrm.org/docs/v5.27.1/api/) |
| OSRM Foot | 5001 | Routing (walking) | Same as above |
| OSRM Bike | 5002 | Routing (cycling) | Same as above |
| **Nominatim** | 8080 | Geocoding | [Nominatim API](https://nominatim.org/release-docs/latest/api/Overview/) |
| **Overpass** | 12345 | POI/OSM queries | [Overpass API](https://wiki.openstreetmap.org/wiki/Overpass_API) |
| TileServer | 8081 | Raster tiles | [TileServer GL](https://tileserver.readthedocs.io/) |
| Martin | 3000 | Vector tiles | [Martin](https://martin.maplibre.org/) |

## Quick Start

```bash
# One-command setup (downloads data + starts OSRM)
./scripts/setup.sh manhattan-small

# Or step by step:
./scripts/download-osm.sh manhattan-small
./scripts/process-osrm.sh car
./scripts/start.sh routing
```

## Available Regions

### Small (< 100MB) - Fast for testing
- `manhattan-small` - NYC Manhattan area
- `rome-small` - Rome, Italy
- `london-small` - London, UK
- `paris-small` - Paris, France
- `berlin-small` - Berlin, Germany
- `tokyo-small` - Tokyo, Japan

### Full Regions
- `new-york` - New York State (~300MB)
- `california` - California (~1GB)
- `italy`, `uk`, `france`, `germany` - Country-level
- `europe` - All of Europe (~25GB)

## Using with OrbPro2

### Routing (walkTo, driveTo, bikeTo)

When OSRM is running locally, OrbPro2 will automatically use it instead of requiring an API key:

```
User: "Walk from Times Square to Grand Central"
→ MCP detects local OSRM at localhost:5000
→ Returns walking route with waypoints
→ Visualizes animated walking path
```

The Vite dev server proxies `/api/osrm` to `localhost:5000`.

### Geocoding (coming soon)

```
User: "Where is the Louvre Museum?"
→ MCP queries Nominatim at localhost:8080
→ Returns coordinates: 48.8606, 2.3376
```

### POI Search (findAndShow)

```
User: "Find all hospitals near Central Park"
→ MCP queries Overpass at localhost:12345
→ Returns list of hospitals with coordinates
→ Adds markers to the globe
```

## Service Management

```bash
# Start services
./scripts/start.sh routing     # Just OSRM
./scripts/start.sh geocoding   # Nominatim
./scripts/start.sh poi         # Overpass
./scripts/start.sh all         # Everything

# Check status
./scripts/start.sh status

# Stop all
./scripts/start.sh stop

# Or use docker-compose directly
docker-compose up -d osrm-car
docker-compose --profile geocoding up -d
docker-compose down
```

## Resource Requirements

| Service | RAM | Disk | Startup Time |
|---------|-----|------|--------------|
| OSRM (small region) | 500MB | 200MB | Seconds |
| OSRM (large region) | 2-4GB | 2-10GB | Seconds |
| Nominatim | 2-4GB | 2-20GB | 5-30 min (first run) |
| Overpass | 1-2GB | 1-5GB | 5-15 min (first run) |

## Processing Multiple Profiles

For walking and biking routes in addition to driving:

```bash
# Process all profiles (takes 3x longer)
./scripts/process-osrm.sh all

# Then start with full profile
docker-compose --profile full up -d
```

Ports:
- Car/driving: `localhost:5000`
- Walking: `localhost:5001`
- Cycling: `localhost:5002`

## Updating Data

OSM data is updated weekly on Geofabrik. To update:

```bash
# Remove old data
rm -rf data/osm data/osrm*

# Download fresh data
./scripts/download-osm.sh manhattan-small

# Reprocess
./scripts/process-osrm.sh car

# Restart
docker-compose restart osrm-car
```

## Troubleshooting

### OSRM won't start
```bash
# Check logs
docker-compose logs osrm-car

# Common issue: data not processed
./scripts/process-osrm.sh car
```

### Nominatim import fails
```bash
# Needs more memory - increase Docker memory limit
# Or use smaller region
```

### Overpass queries slow
```bash
# First query after startup loads index - be patient
# Subsequent queries are fast
```

## API Examples

### OSRM Route
```bash
# Driving route from Times Square to Grand Central
curl "http://localhost:5000/route/v1/driving/-73.9855,40.758;-73.9772,40.7527"
```

### Nominatim Geocode
```bash
# Search for a place
curl "http://localhost:8080/search?q=Colosseum,Rome&format=json"

# Reverse geocode
curl "http://localhost:8080/reverse?lat=41.8902&lon=12.4922&format=json"
```

### Overpass Query
```bash
# Find restaurants near a point
curl -X POST "http://localhost:12345/api/interpreter" \
  -d '[out:json];node(around:1000,40.758,-73.9855)[amenity=restaurant];out;'
```
