#!/bin/bash
# Start all MBT services on VPS

set -e

echo "=== Starting MBT Services ==="

# Create the shared network first
docker network create mbt-network 2>/dev/null || true

# Start UAT
echo "Starting UAT..."
cd /opt/mbt/uat
docker compose up -d --build

# Start Production
echo "Starting Production..."
cd /opt/mbt/prod
docker compose up -d --build

# Start Caddy (after apps are up)
echo "Starting Caddy..."
cd /opt/mbt
docker compose -f docker-compose.caddy.yml up -d

echo ""
echo "=== All services started ==="
echo ""
echo "UAT: https://uat.mybalancetracker.co.uk"
echo "Prod: https://mybalancetracker.co.uk"
echo ""
echo "Check status: docker ps"
echo "Logs: docker logs mbt-uat / mbt-prod / mbt-caddy"
