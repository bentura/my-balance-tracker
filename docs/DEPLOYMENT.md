# MBT Deployment Guide

This document covers the deployment architecture, environments, self-hosting, and CI/CD setup for MyBalanceTracker.

## Table of Contents

1. [Environment Overview](#environment-overview)
2. [VPS Setup (UAT + Prod)](#vps-setup)
3. [Self-Hosting (Standalone Mode)](#self-hosting)
4. [CI/CD with GitHub Actions](#cicd)
5. [Environment Variables Reference](#environment-variables)

---

## Environment Overview

| Environment | URL | Purpose | Stripe | Database |
|-------------|-----|---------|--------|----------|
| **Dev** | localhost:5173 | Local development, hot reload | Sandbox | Local SQLite or none |
| **UAT** | uat.mybalancetracker.co.uk | Testing before prod | Sandbox | Separate PostgreSQL |
| **Prod** | mybalancetracker.co.uk | Live users | Live keys | Separate PostgreSQL |

### Key Principles

- **UAT and Prod are isolated** — separate databases, separate Docker stacks, separate secrets
- **UAT uses Stripe sandbox** — safe to test payments without real charges
- **Prod uses Stripe live keys** — real money, real customers
- **Push to main → auto-deploy to UAT** (with CI/CD)
- **Create GitHub Release → deploy to Prod** (with CI/CD)

---

## VPS Setup

### Prerequisites

- Ubuntu VPS (tested on Hetzner, 4 vCPU / 8GB RAM)
- Docker and Docker Compose installed
- Domain pointed to VPS IP (A records for `mybalancetracker.co.uk` and `uat.mybalancetracker.co.uk`)

### Directory Structure

```
/opt/
├── mbt-uat/           # UAT environment
│   ├── repo/          # Git clone
│   ├── docker-compose.yml
│   ├── .env
│   └── (app files)
├── mbt-prod/          # Production environment
│   ├── repo/          # Git clone
│   ├── docker-compose.yml
│   ├── .env
│   └── (app files)
└── mbt-caddy/         # Shared reverse proxy
    ├── docker-compose.yml
    └── Caddyfile
```

### Initial Setup

1. **Add DNS Records**

   ```
   A  mybalancetracker.co.uk      → your-vps-ip
   A  www.mybalancetracker.co.uk  → your-vps-ip
   A  uat.mybalancetracker.co.uk  → your-vps-ip
   ```

2. **Run Setup Script**

   ```bash
   # SSH into your VPS
   ssh root@your-vps-ip

   # Clone repo and run setup
   git clone https://github.com/bentura/my-balance-tracker.git /tmp/mbt-setup
   bash /tmp/mbt-setup/deploy/setup-vps.sh
   ```

3. **Configure Environment Files**

   ```bash
   # UAT - uses Stripe sandbox keys
   nano /opt/mbt-uat/.env
   ```

   ```env
   DB_PASSWORD=mbt_uat_db_2026
   JWT_SECRET=mbt_jwt_uat_secret_2026
   ADMIN_SECRET=mbt_admin_uat_2026
   STRIPE_SECRET_KEY=sk_test_xxx
   STRIPE_WEBHOOK_SECRET=whsec_xxx
   PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_xxx
   ```

   ```bash
   # Prod - uses Stripe LIVE keys
   nano /opt/mbt-prod/.env
   ```

   ```env
   DB_PASSWORD=STRONG_RANDOM_PASSWORD
   JWT_SECRET=STRONG_RANDOM_SECRET
   ADMIN_SECRET=STRONG_ADMIN_SECRET
   STRIPE_SECRET_KEY=sk_live_xxx
   STRIPE_WEBHOOK_SECRET=whsec_xxx
   PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_xxx
   ```

4. **Start Environments**

   ```bash
   # Start UAT
   cd /opt/mbt-uat && docker compose up -d --build

   # Start Prod
   cd /opt/mbt-prod && docker compose up -d --build

   # Start Caddy (routes traffic to both)
   cd /opt/mbt-caddy && docker compose up -d
   ```

5. **Configure Stripe Webhooks**

   In Stripe Dashboard, create webhooks pointing to:
   - UAT: `https://uat.mybalancetracker.co.uk/api/stripe/webhook`
   - Prod: `https://mybalancetracker.co.uk/api/stripe/webhook`

### Manual Deployment

```bash
# Deploy to UAT
bash /opt/mbt-uat/repo/deploy/deploy-uat.sh

# Deploy to Prod (has confirmation prompt)
bash /opt/mbt-prod/repo/deploy/deploy-prod.sh
```

---

## Self-Hosting

MBT supports a standalone mode for self-hosters who want to run their own instance.

### SaaS vs Standalone Mode

| Feature | SaaS Mode | Standalone Mode |
|---------|-----------|-----------------|
| All app features | ✅ | ✅ |
| Admin panel | ✅ | ✅ |
| User registration | ✅ | ✅ |
| Stripe subscriptions | ✅ | ❌ Disabled |
| Voucher/promo codes | ✅ | ❌ Disabled |
| "Upgrade to Pro" prompts | ✅ | ❌ Hidden |
| Cloud sync | Pro users | N/A (local only) |

### How It Works

The mode is controlled by the `MBT_MODE` environment variable:

```env
MBT_MODE=saas        # Default - hosted version with subscriptions
MBT_MODE=standalone  # Self-hosted - all features, no subscriptions
```

### Security: Why Self-Hosters Can't Abuse Vouchers

1. **Server-side checks**: Voucher endpoints return 404 in standalone mode
2. **Separate databases**: Vouchers only exist in YOUR database
3. **No cross-talk**: Self-hosted instances don't connect to your servers

Even if someone modifies their frontend to show voucher UI, the API calls will fail.

### Self-Hosting Quick Start

```bash
# Clone
git clone https://github.com/bentura/my-balance-tracker.git
cd my-balance-tracker

# Use standalone compose file
cp deploy/docker-compose.standalone.yml docker-compose.yml

# Create .env
cat > .env << EOF
DB_PASSWORD=your-secure-password
JWT_SECRET=your-random-secret
ADMIN_SECRET=your-admin-password
PUBLIC_APP_URL=http://localhost:3000
EOF

# Start
docker compose up -d --build
```

Access at `http://localhost:3000`

### Self-Hosting with Custom Domain

For production self-hosting with SSL, add a Caddyfile:

```caddyfile
your-domain.com {
    reverse_proxy app:3000
}
```

And update docker-compose to include Caddy.

---

## CI/CD

Recommended setup using GitHub Actions for automated deployments.

### Workflow Overview

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Push to main  │ ──► │  Build & Test   │ ──► │  Deploy to UAT  │
└─────────────────┘     └─────────────────┘     └─────────────────┘

┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│ Create Release  │ ──► │  Build & Test   │ ──► │ Deploy to Prod  │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

### GitHub Actions Workflow

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy

on:
  push:
    branches: [main]
  release:
    types: [published]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Build
        run: npm run build

      - name: Run tests
        run: npm test
        continue-on-error: true  # Remove once tests exist

  deploy-uat:
    needs: build
    if: github.event_name == 'push' && github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - name: Deploy to UAT
        uses: appleboy/ssh-action@v1
        with:
          host: ${{ secrets.VPS_HOST }}
          username: ${{ secrets.VPS_USER }}
          key: ${{ secrets.VPS_SSH_KEY }}
          script: |
            cd /opt/mbt-uat/repo && git pull
            cd /opt/mbt-uat && cp -r repo/* .
            cp repo/deploy/docker-compose.uat.yml docker-compose.yml
            docker compose up -d --build
            echo "UAT deployed at $(date)"

  deploy-prod:
    needs: build
    if: github.event_name == 'release'
    runs-on: ubuntu-latest
    environment: production  # Requires approval if configured
    steps:
      - name: Deploy to Production
        uses: appleboy/ssh-action@v1
        with:
          host: ${{ secrets.VPS_HOST }}
          username: ${{ secrets.VPS_USER }}
          key: ${{ secrets.VPS_SSH_KEY }}
          script: |
            cd /opt/mbt-prod/repo && git pull origin main --tags
            cd /opt/mbt-prod && cp -r repo/* .
            cp repo/deploy/docker-compose.prod.yml docker-compose.yml
            docker compose up -d --build
            echo "Production deployed at $(date)"
```

### Setting Up GitHub Secrets

In your repo: Settings → Secrets and variables → Actions

Add these secrets:
- `VPS_HOST`: Your VPS IP (e.g., `65.21.60.71`)
- `VPS_USER`: SSH user (e.g., `root`)
- `VPS_SSH_KEY`: Private SSH key for the VPS

### Generate SSH Key for CI/CD

```bash
# On your local machine
ssh-keygen -t ed25519 -C "github-actions-mbt" -f ~/.ssh/mbt-deploy

# Copy public key to VPS
ssh-copy-id -i ~/.ssh/mbt-deploy.pub root@your-vps-ip

# Add private key contents to GitHub secret VPS_SSH_KEY
cat ~/.ssh/mbt-deploy
```

### Deployment Flow

1. **Development**: Work locally, push to feature branches
2. **UAT Testing**: Merge to `main` → auto-deploys to UAT
3. **Production**: Create a GitHub Release → deploys to Prod

### Creating a Release

```bash
# Tag the release
git tag v1.0.0
git push origin v1.0.0

# Then create Release in GitHub UI, or:
gh release create v1.0.0 --title "v1.0.0" --notes "Release notes here"
```

---

## Environment Variables

### Required (All Modes)

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | Random string for JWT signing (min 32 chars) |
| `ADMIN_SECRET` | Password for `/admin` panel access |
| `PUBLIC_APP_URL` | Your app's public URL |

### SaaS Mode Only

| Variable | Description |
|----------|-------------|
| `STRIPE_SECRET_KEY` | Stripe API secret key |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret |
| `PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe publishable key |

### Optional

| Variable | Default | Description |
|----------|---------|-------------|
| `MBT_MODE` | `saas` | `saas` or `standalone` |
| `PORT` | `3000` | App port (inside container) |

---

## Troubleshooting

### Caddy not routing correctly

Check Docker network names match:
```bash
docker network ls | grep mbt
```

Update Caddyfile container names to match (e.g., `mbt-uat-app-1`).

### Database connection issues

Ensure the app waits for the database:
```yaml
depends_on:
  db:
    condition: service_healthy
```

### Stripe webhooks failing

1. Check webhook URL is correct
2. Verify `STRIPE_WEBHOOK_SECRET` matches the webhook in Stripe Dashboard
3. Check logs: `docker logs mbt-prod-app-1`

### View logs

```bash
# UAT logs
docker logs -f mbt-uat-app-1

# Prod logs
docker logs -f mbt-prod-app-1

# Caddy logs
docker logs -f mbt-caddy-caddy-1
```

---

## Quick Reference

```bash
# Start UAT
cd /opt/mbt-uat && docker compose up -d --build

# Start Prod
cd /opt/mbt-prod && docker compose up -d --build

# Restart Caddy
cd /opt/mbt-caddy && docker compose restart

# View UAT logs
docker logs -f mbt-uat-app-1

# Pull latest and deploy UAT
cd /opt/mbt-uat/repo && git pull && cd .. && cp -r repo/* . && docker compose up -d --build

# Access admin
# UAT: https://uat.mybalancetracker.co.uk/admin
# Prod: https://mybalancetracker.co.uk/admin
```
