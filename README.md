# MyBalanceTracker (MBT)

Autism-friendly personal finance tracker. Simple, low-cognitive-load design.

## Quick Start (Local Development)

```bash
# Install dependencies
npm install

# Run dev server (uses local storage, no DB needed)
npm run dev
```

## Docker (Local with Database)

```bash
# Start local stack (app + postgres)
docker compose -f deploy/docker-compose.local.yml up -d

# Access at http://localhost:8086
```

## VPS Deployment

### First Time Setup

1. Clone repo on VPS:
   ```bash
   git clone git@github.com:bentura/my-balance-tracker.git mbt
   cd mbt
   ```

2. Run setup:
   ```bash
   ./deploy/setup-vps.sh
   ```

3. Edit environment files:
   ```bash
   nano /opt/mbt/uat/.env      # UAT config (test Stripe keys)
   nano /opt/mbt/prod/.env     # Prod config (LIVE Stripe keys!)
   ```

4. Start everything:
   ```bash
   ./deploy/start-all.sh
   ```

### Updating

```bash
cd ~/mbt
git pull
./deploy/deploy-uat.sh   # Deploy to UAT first
./deploy/deploy-prod.sh  # Then production (requires confirmation)
```

### Nuclear Option

If things are messed up:
```bash
./deploy/nuke-vps.sh     # Removes EVERYTHING (including data!)
./deploy/setup-vps.sh    # Start fresh
```

## VPS Structure

```
/opt/mbt/
├── Caddyfile                 # Shared reverse proxy config
├── docker-compose.caddy.yml  # Caddy container
├── uat/
│   ├── docker-compose.yml    # UAT app + database
│   ├── .env                  # UAT environment
│   └── (app files)
└── prod/
    ├── docker-compose.yml    # Prod app + database
    ├── .env                  # Prod environment
    └── (app files)
```

## URLs

- **UAT:** https://uat.mybalancetracker.co.uk
- **Production:** https://mybalancetracker.co.uk / https://mybalancetracker.com

## Stack

- Frontend: SvelteKit, TypeScript, Tailwind CSS
- Backend: SvelteKit (Node adapter)
- Database: PostgreSQL 16
- Reverse Proxy: Caddy (auto SSL)
- Container: Docker
