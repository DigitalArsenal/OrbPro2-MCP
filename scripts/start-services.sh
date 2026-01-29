#!/bin/zsh
# Start local geospatial services for OrbPro2 development
# Called automatically by npm run dev

set -e

SCRIPT_DIR="${0:A:h}"
SERVICES_DIR="$SCRIPT_DIR/../packages/local-services"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if Docker is available
if ! command -v docker &> /dev/null; then
    echo "${YELLOW}⚠ Docker not installed - local routing disabled${NC}"
    echo "  Install Docker for offline routing: https://docs.docker.com/get-docker/"
    echo "  Falling back to OpenRouteService API (requires apiKey)"
    exit 0
fi

# Check if Docker daemon is running
if ! docker info &> /dev/null 2>&1; then
    echo "${YELLOW}⚠ Docker not running - local routing disabled${NC}"
    echo "  Start Docker Desktop for offline routing"
    echo "  Falling back to OpenRouteService API (requires apiKey)"
    exit 0
fi

# Check if OSRM data exists
if [[ ! -f "$SERVICES_DIR/data/osrm/region-latest.osrm" ]]; then
    echo "${YELLOW}⚠ OSRM data not found - local routing disabled${NC}"
    echo "  Run this once to enable local routing:"
    echo "    cd packages/local-services && ./scripts/setup.sh monaco"
    echo "  Falling back to OpenRouteService API (requires apiKey)"
    exit 0
fi

# Check if OSRM is already running
if docker ps --format '{{.Names}}' | grep -q "orbpro-osrm-car"; then
    echo "${GREEN}✓ OSRM routing service already running${NC}"
    exit 0
fi

# Start OSRM
echo "${GREEN}Starting OSRM routing service...${NC}"
cd "$SERVICES_DIR"
docker compose up -d osrm-car

# Wait briefly for service to be ready
sleep 2

# Verify it's running
if docker ps --format '{{.Names}}' | grep -q "orbpro-osrm-car"; then
    echo "${GREEN}✓ OSRM routing service started on port 5050${NC}"
else
    echo "${YELLOW}⚠ OSRM may still be starting...${NC}"
fi
