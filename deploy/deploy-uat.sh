#!/bin/bash
# Deploy to UAT
set -e

echo "=== Deploying to UAT ==="

cd /opt/mbt-uat/repo
git pull

cd /opt/mbt-uat
cp -r repo/* .
cp repo/deploy/docker-compose.uat.yml docker-compose.yml

docker compose up -d --build

echo "=== UAT deployed ==="
echo "https://uat.mybalancetracker.co.uk"
