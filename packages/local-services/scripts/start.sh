#!/bin/zsh
# Quick start for OrbPro2 local services
# Usage: ./start.sh [service]
#
# Services:
#   routing    - OSRM routing only (default)
#   geocoding  - Nominatim geocoding
#   poi        - Overpass POI search
#   all        - All services
#   status     - Show service status

set -e

SCRIPT_DIR="${0:A:h}"
cd "$SCRIPT_DIR/.."

SERVICE="${1:-routing}"

case "$SERVICE" in
    routing)
        echo "Starting OSRM routing service..."
        docker compose up -d osrm-car
        echo ""
        echo "OSRM available at: http://localhost:5000"
        ;;
    geocoding)
        echo "Starting Nominatim geocoding service..."
        docker compose --profile geocoding up -d
        echo ""
        echo "Nominatim available at: http://localhost:8080"
        echo "Note: First start takes time to import data."
        ;;
    poi)
        echo "Starting Overpass POI service..."
        docker compose --profile poi up -d
        echo ""
        echo "Overpass available at: http://localhost:12345"
        echo "Note: First start takes time to import data."
        ;;
    all)
        echo "Starting all services..."
        docker compose --profile full --profile geocoding --profile poi up -d
        echo ""
        echo "Services:"
        echo "  - OSRM Car:     http://localhost:5000"
        echo "  - OSRM Foot:    http://localhost:5001"
        echo "  - OSRM Bike:    http://localhost:5002"
        echo "  - Nominatim:    http://localhost:8080"
        echo "  - Overpass:     http://localhost:12345"
        ;;
    status)
        echo "Service status:"
        docker compose ps
        ;;
    stop)
        echo "Stopping all services..."
        docker compose down
        ;;
    *)
        echo "Unknown service: $SERVICE"
        echo "Usage: $0 [routing|geocoding|poi|all|status|stop]"
        exit 1
        ;;
esac
