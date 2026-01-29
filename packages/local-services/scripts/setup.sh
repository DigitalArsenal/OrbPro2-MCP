#!/bin/zsh
# Full setup script for OrbPro2 local geospatial services
# Usage: ./setup.sh [region]
#
# This script will:
#   1. Download OSM data for the region
#   2. Process OSRM routing data
#   3. Start the services
#
# Default region: rome-small (fastest for testing)

set -e

SCRIPT_DIR="${0:A:h}"
REGION="${1:-monaco}"

echo "=============================================="
echo " OrbPro2 Local Services Setup"
echo "=============================================="
echo "Region: $REGION"
echo ""

# Check Docker is available
if ! command -v docker &> /dev/null; then
    echo "ERROR: Docker is not installed or not in PATH"
    echo "Please install Docker: https://docs.docker.com/get-docker/"
    exit 1
fi

# Check Docker is running
if ! docker info &> /dev/null; then
    echo "ERROR: Docker daemon is not running"
    echo "Please start Docker Desktop or the Docker service"
    exit 1
fi

echo "Docker is available and running."
echo ""

# Step 1: Download OSM data
echo "Step 1: Download OSM data"
echo "-------------------------"
"$SCRIPT_DIR/download-osm.sh" "$REGION"
echo ""

# Step 2: Process OSRM data
echo "Step 2: Process OSRM routing data"
echo "----------------------------------"
"$SCRIPT_DIR/process-osrm.sh" car
echo ""

# Step 3: Start services
echo "Step 3: Start services"
echo "----------------------"
cd "$SCRIPT_DIR/.."
docker compose up -d osrm-car
echo ""

# Wait for service to be ready
echo "Waiting for OSRM to start..."
sleep 3

# Test the service
echo ""
echo "Testing OSRM service..."
if curl -s "http://localhost:5000/route/v1/driving/12.4534,41.9029;12.4922,41.8902" | grep -q "routes"; then
    echo "OSRM is working!"
else
    echo "WARNING: OSRM may not be ready yet. Wait a moment and try again."
fi

echo ""
echo "=============================================="
echo " Setup Complete!"
echo "=============================================="
echo ""
echo "Services running:"
echo "  - OSRM (routing): http://localhost:5000"
echo ""
echo "To start additional services:"
echo "  docker compose --profile geocoding up -d  # Nominatim"
echo "  docker compose --profile poi up -d        # Overpass API"
echo "  docker compose --profile full up -d       # All routing profiles"
echo ""
echo "To stop services:"
echo "  docker compose down"
echo ""
echo "Now run 'npm run dev' and routing will work locally!"
