# MyBalanceTracker (MBT)

A simple, calm personal finance tracker designed to reduce cognitive load. Built for people who find traditional budgeting apps overwhelming.

## What It Does

MBT helps you understand where your money goes without the complexity of full-featured finance apps:

- **Track accounts** — Add your bank accounts, savings, credit cards with current balances
- **Regular income & outgoings** — Set up recurring transactions (salary, bills, subscriptions) and MBT handles them automatically
- **See your money flow** — View transactions by date or category, with clear visual indicators for money in vs out
- **Project forward** — See where your balance will be at the end of the month based on your regular transactions
- **Categories** — Optionally categorise spending to see where money goes (but you don't have to)
- **Transfers** — Move money between accounts and track it properly

## Design Philosophy

- **Low cognitive load** — Clean, uncluttered interface with clear typography
- **No sync required** — Your data stays in your browser (IndexedDB), no accounts or cloud sync
- **Accessible** — Designed with accessibility in mind, including for neurodivergent users
- **Privacy first** — Nothing leaves your device unless you explicitly export it

## Deployment Options

### 1. Hosted SaaS (mybalancetracker.co.uk)

The official hosted version with:
- Free tier: Local storage only, data never leaves your device
- Pro tier (£3/month): Cloud sync across devices, encrypted storage

### 2. Self-Hosted (Standalone)

Run your own instance with all features included, no subscriptions needed.

```bash
# Clone the repo
git clone https://github.com/bentura/my-balance-tracker.git
cd my-balance-tracker

# Copy standalone compose file
cp deploy/docker-compose.standalone.yml docker-compose.yml

# Create .env file
cat > .env << EOF
DB_PASSWORD=your-secure-db-password
JWT_SECRET=your-random-jwt-secret
ADMIN_SECRET=your-admin-password
PUBLIC_APP_URL=http://localhost:3000
EOF

# Start
docker compose up -d --build
```

Access at http://localhost:3000 (or configure your reverse proxy).

**Self-hosted features:**
- ✅ All app features included
- ✅ Admin panel for user management
- ✅ Data stored on your server
- ❌ No Stripe/subscriptions (not needed)
- ❌ No voucher codes (SaaS-only feature)

## Tech Stack

- **SvelteKit** — Fast, modern web framework
- **TypeScript** — Type-safe code
- **Tailwind CSS** — Utility-first styling
- **Dexie.js** — IndexedDB wrapper for local storage
- **PostgreSQL** — Server-side data storage
- **Docker** — Production deployment

## Development

### Prerequisites

- Node.js 20+ (LTS recommended)
- npm

### Running Locally

```bash
# Install dependencies
npm install

# Start dev server with hot reload
npm run dev
```

The app will be available at `http://localhost:5173`

### Building for Production

```bash
# Build 
npm run build

# Preview production build
npm run preview
```

### Docker Deployment

```bash
# SaaS mode (with Stripe, subscriptions)
docker compose -f deploy/docker-compose.prod.yml up -d --build

# Standalone mode (self-hosted, all features)
docker compose -f deploy/docker-compose.standalone.yml up -d --build
```

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `MBT_MODE` | No | `saas` (default) or `standalone` |
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `JWT_SECRET` | Yes | Random string for JWT signing |
| `ADMIN_SECRET` | Yes | Password for /admin access |
| `PUBLIC_APP_URL` | Yes | Your app's public URL |
| `STRIPE_SECRET_KEY` | SaaS only | Stripe API secret key |
| `STRIPE_WEBHOOK_SECRET` | SaaS only | Stripe webhook signing secret |
| `PUBLIC_STRIPE_PUBLISHABLE_KEY` | SaaS only | Stripe publishable key |

## Project Structure

```
src/
├── lib/
│   ├── components/    # Reusable UI components
│   ├── server/        # Server-side code (auth, db, stripe)
│   ├── stores/        # Svelte stores (app state)
│   ├── storage/       # Storage adapters (Dexie, API)
│   └── types/         # TypeScript type definitions
├── routes/
│   ├── account/[id]/  # Individual account view
│   ├── admin/         # Admin dashboard
│   ├── api/           # API endpoints
│   ├── categories/    # Category management
│   ├── dashboard/     # Main dashboard
│   ├── login/         # Auth pages
│   ├── onboarding/    # First-run setup flow
│   ├── recurring/     # Income & outgoings management
│   ├── settings/      # App settings, import/export
│   ├── transactions/  # Transaction history
│   └── upgrade/       # Pro upgrade page
└── app.html           # HTML template
```

## Data & Privacy

**Free/Standalone users:** All data stored locally in your browser (IndexedDB). Nothing sent to servers.

**Pro users:** Data encrypted and stored securely for syncing. You can export or delete everything anytime.

## License

MIT

---

*Built with care by Holly & Ben at Bentura Labs*
