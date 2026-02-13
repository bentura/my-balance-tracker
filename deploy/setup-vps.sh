#!/bin/bash
# VPS Setup Script for MBT UAT/Prod environments
# Run this once on a fresh VPS or to reset the structure

set -e

echo "=== MBT VPS Setup ==="

# Create directory structure
echo "Creating directories..."
mkdir -p /opt/mbt-uat
mkdir -p /opt/mbt-prod
mkdir -p /opt/mbt-caddy

# Clone repo to both environments
echo "Cloning repository..."
if [ ! -d "/opt/mbt-uat/repo" ]; then
    git clone https://github.com/bentura/my-balance-tracker.git /opt/mbt-uat/repo
fi
if [ ! -d "/opt/mbt-prod/repo" ]; then
    git clone https://github.com/bentura/my-balance-tracker.git /opt/mbt-prod/repo
fi

# Copy app files
echo "Copying app files..."
cp -r /opt/mbt-uat/repo/* /opt/mbt-uat/
cp -r /opt/mbt-prod/repo/* /opt/mbt-prod/

# Copy docker-compose files
cp /opt/mbt-uat/repo/deploy/docker-compose.uat.yml /opt/mbt-uat/docker-compose.yml
cp /opt/mbt-prod/repo/deploy/docker-compose.prod.yml /opt/mbt-prod/docker-compose.yml
cp /opt/mbt-uat/repo/deploy/docker-compose.caddy.yml /opt/mbt-caddy/docker-compose.yml
cp /opt/mbt-uat/repo/deploy/Caddyfile /opt/mbt-caddy/Caddyfile

# Create .env files if they don't exist
if [ ! -f "/opt/mbt-uat/.env" ]; then
    echo "Creating UAT .env template..."
    cat > /opt/mbt-uat/.env << 'EOF'
# UAT Environment
DB_PASSWORD=mbt_uat_db_2026
JWT_SECRET=mbt_jwt_uat_secret_2026
ADMIN_SECRET=mbt_admin_uat_2026

# Stripe SANDBOX keys - get from https://dashboard.stripe.com/test/apikeys
STRIPE_SECRET_KEY=sk_test_XXXXXXX
STRIPE_WEBHOOK_SECRET=whsec_XXXXXXX
PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_XXXXXXX
EOF
    echo "!!! IMPORTANT: Edit /opt/mbt-uat/.env with your Stripe sandbox keys !!!"
fi

if [ ! -f "/opt/mbt-prod/.env" ]; then
    echo "Creating Prod .env template..."
    cat > /opt/mbt-prod/.env << 'EOF'
# Production Environment - EDIT THESE!
DB_PASSWORD=CHANGE_ME_STRONG_PASSWORD
JWT_SECRET=CHANGE_ME_RANDOM_SECRET
ADMIN_SECRET=CHANGE_ME_ADMIN_SECRET

# Stripe LIVE keys - get from https://dashboard.stripe.com/apikeys
STRIPE_SECRET_KEY=sk_live_XXXXXXX
STRIPE_WEBHOOK_SECRET=whsec_XXXXXXX
PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_XXXXXXX
EOF
    echo "!!! IMPORTANT: Edit /opt/mbt-prod/.env with real production keys !!!"
fi

echo ""
echo "=== Setup complete ==="
echo ""
echo "Next steps:"
echo "1. Add DNS A record for uat.mybalancetracker.co.uk -> $(curl -s ifconfig.me)"
echo "2. Edit /opt/mbt-prod/.env with production Stripe keys"
echo "3. Run: cd /opt/mbt-uat && docker compose up -d --build"
echo "4. Run: cd /opt/mbt-prod && docker compose up -d --build"
echo "5. Run: cd /opt/mbt-caddy && docker compose up -d"
echo ""
