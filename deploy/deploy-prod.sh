#!/bin/bash
# Deploy to Production
set -e

echo "=== Deploying to PRODUCTION ==="
echo "Are you sure? (yes/no)"
read confirm
if [ "$confirm" != "yes" ]; then
    echo "Aborted."
    exit 1
fi

cd /opt/mbt-prod/repo
git pull

cd /opt/mbt-prod
cp -r repo/* .
cp repo/deploy/docker-compose.prod.yml docker-compose.yml

docker compose up -d --build

echo "=== Production deployed ==="
echo "https://mybalancetracker.co.uk"
