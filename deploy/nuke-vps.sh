#!/bin/bash
# NUCLEAR OPTION: Remove all MBT containers, images, and data from VPS
# Run this to start fresh

echo "=== NUCLEAR OPTION ==="
echo "This will:"
echo "  - Stop and remove all mbt containers"
echo "  - Remove mbt images"
echo "  - Remove /opt/mbt directory"
echo "  - Remove mbt docker volumes"
echo ""
echo "YOUR DATABASE DATA WILL BE LOST!"
echo ""
read -p "Type 'NUKE' to confirm: " confirm
if [ "$confirm" != "NUKE" ]; then
    echo "Aborted."
    exit 1
fi

echo ""
echo "Stopping containers..."
docker stop mbt-caddy mbt-uat mbt-prod mbt-uat-db mbt-prod-db 2>/dev/null || true

echo "Removing containers..."
docker rm mbt-caddy mbt-uat mbt-prod mbt-uat-db mbt-prod-db 2>/dev/null || true

echo "Removing old containers (legacy names)..."
docker ps -a --format '{{.Names}}' | grep -E '^mbt' | xargs -r docker rm -f 2>/dev/null || true

echo "Removing images..."
docker images --format '{{.Repository}}:{{.Tag}}' | grep mbt | xargs -r docker rmi -f 2>/dev/null || true

echo "Removing volumes..."
docker volume ls --format '{{.Name}}' | grep -E 'mbt|postgres_data' | xargs -r docker volume rm 2>/dev/null || true

echo "Removing network..."
docker network rm mbt-network 2>/dev/null || true

echo "Removing /opt/mbt..."
sudo rm -rf /opt/mbt

echo "Removing /opt/mbt-uat and /opt/mbt-prod (old structure)..."
sudo rm -rf /opt/mbt-uat /opt/mbt-prod 2>/dev/null || true

echo ""
echo "=== Nuked ==="
echo "Run setup-vps.sh to start fresh"
