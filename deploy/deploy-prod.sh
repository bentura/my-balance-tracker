#!/bin/bash
# Deploy latest code to Production

set -e

echo "=== Deploying to PRODUCTION ==="
echo ""
read -p "Are you sure? Type 'yes' to continue: " confirm
if [ "$confirm" != "yes" ]; then
    echo "Aborted."
    exit 1
fi

REPO_DIR=$(dirname "$(dirname "$(realpath "$0")")")

# Copy updated files
cp -r "$REPO_DIR"/src "$REPO_DIR"/static "$REPO_DIR"/package.json "$REPO_DIR"/package-lock.json \
    "$REPO_DIR"/Dockerfile "$REPO_DIR"/tsconfig.json "$REPO_DIR"/svelte.config.js \
    "$REPO_DIR"/vite.config.ts "$REPO_DIR"/tailwind.config.cjs "$REPO_DIR"/postcss.config.cjs \
    /opt/mbt/prod/

# Rebuild and restart
cd /opt/mbt/prod
docker compose up -d --build

echo ""
echo "=== Production deployed ==="
echo "https://mybalancetracker.co.uk"
