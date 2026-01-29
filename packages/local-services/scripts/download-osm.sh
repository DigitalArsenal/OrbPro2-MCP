#!/bin/zsh
# Download OSM data for a region
# Usage: ./download-osm.sh <region>
#
# Regions use Geofabrik extracts (reliable, updated daily)
# https://download.geofabrik.de/

set -e

SCRIPT_DIR="${0:A:h}"
DATA_DIR="$SCRIPT_DIR/../data/osm"

REGION="${1:-rome}"

# Get URL for region (all from Geofabrik for reliability)
get_url() {
    case "$1" in
        # Italy
        rome|lazio)
            echo "https://download.geofabrik.de/europe/italy/lazio-latest.osm.pbf"
            ;;
        italy)
            echo "https://download.geofabrik.de/europe/italy-latest.osm.pbf"
            ;;

        # UK
        london)
            echo "https://download.geofabrik.de/europe/great-britain/england/greater-london-latest.osm.pbf"
            ;;
        uk|britain)
            echo "https://download.geofabrik.de/europe/great-britain-latest.osm.pbf"
            ;;

        # France
        paris|ile-de-france)
            echo "https://download.geofabrik.de/europe/france/ile-de-france-latest.osm.pbf"
            ;;
        france)
            echo "https://download.geofabrik.de/europe/france-latest.osm.pbf"
            ;;

        # Germany
        berlin)
            echo "https://download.geofabrik.de/europe/germany/berlin-latest.osm.pbf"
            ;;
        germany)
            echo "https://download.geofabrik.de/europe/germany-latest.osm.pbf"
            ;;

        # USA
        nyc|new-york-city)
            echo "https://download.geofabrik.de/north-america/us/new-york-latest.osm.pbf"
            ;;
        new-york)
            echo "https://download.geofabrik.de/north-america/us/new-york-latest.osm.pbf"
            ;;
        california)
            echo "https://download.geofabrik.de/north-america/us/california-latest.osm.pbf"
            ;;
        us-west)
            echo "https://download.geofabrik.de/north-america/us-west-latest.osm.pbf"
            ;;

        # Asia
        tokyo|kanto)
            echo "https://download.geofabrik.de/asia/japan/kanto-latest.osm.pbf"
            ;;
        japan)
            echo "https://download.geofabrik.de/asia/japan-latest.osm.pbf"
            ;;

        # Oceania
        australia|sydney)
            echo "https://download.geofabrik.de/australia-oceania/australia-latest.osm.pbf"
            ;;

        # Europe-wide
        europe)
            echo "https://download.geofabrik.de/europe-latest.osm.pbf"
            ;;

        # Monaco - tiny test region (~1MB)
        monaco|test)
            echo "https://download.geofabrik.de/europe/monaco-latest.osm.pbf"
            ;;

        *)
            echo ""
            ;;
    esac
}

URL=$(get_url "$REGION")

if [[ -z "$URL" ]]; then
    echo "Unknown region: $REGION"
    echo ""
    echo "Available regions:"
    echo "  Tiny (< 5MB) - For testing:"
    echo "    - monaco (or 'test')"
    echo ""
    echo "  Small-Medium (50-300MB):"
    echo "    - rome (Lazio region)"
    echo "    - london (Greater London)"
    echo "    - paris (Ile-de-France)"
    echo "    - berlin"
    echo "    - new-york (NY State)"
    echo ""
    echo "  Large (500MB+):"
    echo "    - italy, uk, france, germany"
    echo "    - california, us-west"
    echo "    - japan, australia"
    echo ""
    echo "  Very Large (10GB+):"
    echo "    - europe"
    exit 1
fi

echo "=============================================="
echo " OrbPro2 - OSM Data Download"
echo "=============================================="
echo "Region: $REGION"
echo "URL: $URL"
echo "Target: $DATA_DIR"
echo ""

# Create data directory
mkdir -p "$DATA_DIR"

# Download the file
FILENAME="region-latest.osm.pbf"
TARGET="$DATA_DIR/$FILENAME"

if [[ -f "$TARGET" ]]; then
    # Check if it's a valid PBF (not HTML error page)
    if file "$TARGET" | grep -q "data"; then
        SIZE=$(du -h "$TARGET" | cut -f1)
        echo "File already exists: $TARGET ($SIZE)"
        echo "Delete it first to re-download."
        exit 0
    else
        echo "Existing file is invalid, re-downloading..."
        rm "$TARGET"
    fi
fi

echo "Downloading... (this may take a while for large regions)"
curl -L --progress-bar -o "$TARGET" "$URL"

# Verify download
if [[ -f "$TARGET" ]]; then
    # Check it's not an HTML error page
    if file "$TARGET" | grep -q "data"; then
        SIZE=$(du -h "$TARGET" | cut -f1)
        echo ""
        echo "Download complete!"
        echo "File: $TARGET"
        echo "Size: $SIZE"
        echo ""
        echo "Next step: Run ./process-osrm.sh to prepare routing data"
    else
        echo "ERROR: Downloaded file is not valid OSM data"
        echo "The server may have returned an error page"
        rm "$TARGET"
        exit 1
    fi
else
    echo "ERROR: Download failed"
    exit 1
fi
