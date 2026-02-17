#!/bin/bash
# Deploy latest code to UAT

set -e

echo "=== Deploying to UAT ==="

REPO_DIR=$(dirname "$(dirname "$(realpath "$0")")")

# Copy updated files
cp -r "$REPO_DIR"/src "$REPO_DIR"/static "$REPO_DIR"/package.json "$REPO_DIR"/package-lock.json \
    "$REPO_DIR"/Dockerfile "$REPO_DIR"/tsconfig.json "$REPO_DIR"/svelte.config.js \
    "$REPO_DIR"/vite.config.ts "$REPO_DIR"/tailwind.config.cjs "$REPO_DIR"/postcss.config.cjs \
    /opt/mbt/uat/

# Rebuild and restart
cd /opt/mbt/uat
docker compose up -d --build

echo ""
echo "=== UAT deployed ==="
echo "https://uat.mybalancetracker.co.uk"
