#!/bin/bash
# MBT VPS Setup Script
# Run this on the VPS after cloning the repo

set -e

echo "=== MBT VPS Setup ==="
echo ""

# Check we're in the right place
if [ ! -f "deploy/Caddyfile" ]; then
    echo "Error: Run this from the mbt repo root"
    exit 1
fi

# Create directory structure
echo "Creating /opt/mbt structure..."
sudo mkdir -p /opt/mbt/uat
sudo mkdir -p /opt/mbt/prod
sudo chown -R $USER:$USER /opt/mbt

# Copy shared Caddyfile and Caddy compose
cp deploy/Caddyfile /opt/mbt/
cp deploy/docker-compose.caddy.yml /opt/mbt/

# Setup UAT
echo "Setting up UAT..."
cp -r src static package.json package-lock.json Dockerfile \
    tsconfig.json svelte.config.js vite.config.ts \
    tailwind.config.cjs postcss.config.cjs \
    /opt/mbt/uat/
cp deploy/docker-compose.uat.yml /opt/mbt/uat/docker-compose.yml

if [ ! -f /opt/mbt/uat/.env ]; then
    cp deploy/.env.uat.example /opt/mbt/uat/.env
    echo "Created /opt/mbt/uat/.env from example - review and update!"
fi

# Setup Prod
echo "Setting up Production..."
cp -r src static package.json package-lock.json Dockerfile \
    tsconfig.json svelte.config.js vite.config.ts \
    tailwind.config.cjs postcss.config.cjs \
    /opt/mbt/prod/
cp deploy/docker-compose.prod.yml /opt/mbt/prod/docker-compose.yml

if [ ! -f /opt/mbt/prod/.env ]; then
    cp deploy/.env.prod.example /opt/mbt/prod/.env
    echo "Created /opt/mbt/prod/.env from example - UPDATE WITH LIVE KEYS!"
fi

echo ""
echo "=== Setup Complete ==="
echo ""
echo "Directory structure:"
echo "/opt/mbt/"
echo "├── Caddyfile"
echo "├── docker-compose.caddy.yml"
echo "├── uat/"
echo "│   ├── docker-compose.yml"
echo "│   ├── .env"
echo "│   └── (app files)"
echo "└── prod/"
echo "    ├── docker-compose.yml"
echo "    ├── .env"
echo "    └── (app files)"
echo ""
echo "Next steps:"
echo "1. Review/update /opt/mbt/uat/.env"
echo "2. Review/update /opt/mbt/prod/.env (USE LIVE STRIPE KEYS!)"
echo "3. Run: ./deploy/start-all.sh"
