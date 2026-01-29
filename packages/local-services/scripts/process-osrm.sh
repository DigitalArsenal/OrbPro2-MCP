#!/bin/zsh
# Process OSM data for OSRM routing
# Usage: ./process-osrm.sh [profile]
#
# Profiles:
#   car   - Car/driving routing (default)
#   foot  - Walking routing
#   bike  - Cycling routing
#   all   - All profiles (takes longer, more disk space)
#
# Prerequisites:
#   - Docker installed
#   - OSM data downloaded (run ./download-osm.sh first)

set -e

SCRIPT_DIR="${0:A:h}"
BASE_DIR="$SCRIPT_DIR/.."
OSM_FILE="$BASE_DIR/data/osm/region-latest.osm.pbf"

PROFILE="${1:-car}"

# Map profile to OSRM profile name
get_osrm_profile() {
    case "$1" in
        car|driving) echo "car" ;;
        foot|walking) echo "foot" ;;
        bike|bicycle|cycling) echo "bicycle" ;;
        *) echo "$1" ;;
    esac
}

# Check OSM file exists
if [[ ! -f "$OSM_FILE" ]]; then
    echo "ERROR: OSM file not found: $OSM_FILE"
    echo "Run ./download-osm.sh first to download OSM data."
    exit 1
fi

process_profile() {
    local PROFILE_NAME="$1"
    local OSRM_PROFILE=$(get_osrm_profile "$PROFILE_NAME")

    # Set output directory based on profile
    if [[ "$PROFILE_NAME" == "car" ]]; then
        OUTPUT_DIR="$BASE_DIR/data/osrm"
    else
        OUTPUT_DIR="$BASE_DIR/data/osrm-$PROFILE_NAME"
    fi

    echo "=============================================="
    echo " Processing OSRM data: $PROFILE_NAME"
    echo "=============================================="
    echo "Profile: $OSRM_PROFILE"
    echo "Input: $OSM_FILE"
    echo "Output: $OUTPUT_DIR"
    echo ""

    # Create output directory
    mkdir -p "$OUTPUT_DIR"

    # Copy OSM file to output directory
    cp "$OSM_FILE" "$OUTPUT_DIR/region-latest.osm.pbf"

    echo "Step 1/3: Extract (this may take a while)..."
    docker run --rm -t \
        -v "$OUTPUT_DIR:/data" \
        osrm/osrm-backend:latest \
        osrm-extract -p /opt/$OSRM_PROFILE.lua /data/region-latest.osm.pbf

    echo ""
    echo "Step 2/3: Partition..."
    docker run --rm -t \
        -v "$OUTPUT_DIR:/data" \
        osrm/osrm-backend:latest \
        osrm-partition /data/region-latest.osrm

    echo ""
    echo "Step 3/3: Customize..."
    docker run --rm -t \
        -v "$OUTPUT_DIR:/data" \
        osrm/osrm-backend:latest \
        osrm-customize /data/region-latest.osrm

    echo ""
    echo "Processing complete for $PROFILE_NAME!"
    echo "Output: $OUTPUT_DIR"
}

if [[ "$PROFILE" == "all" ]]; then
    echo "Processing all profiles: car, foot, bike"
    echo ""
    for p in car foot bike; do
        process_profile "$p"
        echo ""
    done
    echo "All profiles processed!"
else
    process_profile "$PROFILE"
fi

echo ""
echo "=============================================="
echo " Next steps:"
echo "=============================================="
echo "Start OSRM server:"
echo "  cd $BASE_DIR"
echo "  docker-compose up -d osrm-car"
echo ""
echo "Or start all services:"
echo "  docker-compose up -d"
echo ""
echo "Test routing:"
echo "  curl 'http://localhost:5000/route/v1/driving/-73.985,40.758;-73.968,40.785'"
