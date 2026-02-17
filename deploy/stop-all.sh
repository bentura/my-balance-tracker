#!/bin/bash
# Stop all MBT services on VPS

echo "=== Stopping MBT Services ==="

# Stop Caddy first
echo "Stopping Caddy..."
cd /opt/mbt
docker compose -f docker-compose.caddy.yml down 2>/dev/null || true

# Stop Production
echo "Stopping Production..."
cd /opt/mbt/prod
docker compose down 2>/dev/null || true

# Stop UAT
echo "Stopping UAT..."
cd /opt/mbt/uat
docker compose down 2>/dev/null || true

echo ""
echo "=== All services stopped ==="
