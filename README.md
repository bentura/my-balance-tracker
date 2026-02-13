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

## Tech Stack

- **SvelteKit** — Fast, modern web framework
- **TypeScript** — Type-safe code
- **Tailwind CSS** — Utility-first styling
- **Dexie.js** — IndexedDB wrapper for local storage
- **Docker + Nginx** — Production deployment

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
# Build static site
npm run build

# Preview production build
npm run preview
```

### Docker Deployment

```bash
# Build and run with Docker Compose
docker compose up -d --build
```

The app will be served via Nginx on port 8086.

## Project Structure

```
src/
├── lib/
│   ├── components/    # Reusable UI components
│   ├── stores/        # Svelte stores (app state)
│   ├── storage/       # IndexedDB adapter (Dexie)
│   └── types.ts       # TypeScript type definitions
├── routes/
│   ├── account/[id]/  # Individual account view
│   ├── categories/    # Category management
│   ├── dashboard/     # Main dashboard
│   ├── onboarding/    # First-run setup flow
│   ├── recurring/     # Income & outgoings management
│   ├── settings/      # App settings, import/export
│   └── transactions/  # Transaction history
└── app.html           # HTML template
```

## Data & Privacy

All data is stored locally in your browser using IndexedDB. You can:

- **Export** your data as JSON from Settings
- **Import** data from a previous export
- **Clear** all data from Settings

No data is ever sent to external servers.

## License

MIT

---

*Built with care by Holly & Ben at Bentura Labs*
