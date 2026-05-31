# API Tests App

Local-first API testing platform. Define tests, shared steps, environment-scoped variables, and track run history.

## Quick start

```bash
npm install
npm run db:push
npm run db:seed
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Features

- **Tests** — CRUD with unlimited steps (HTTP, assert, delay, shared ref)
- **Shared Steps** — Reusable step groups
- **Environments** — Per-env base URL and color
- **Global Variables** — Matrix of values per environment (`{{variableName}}`)
- **Test Runner** — Server-side execution with timeout and result storage
- **Dashboard** — Pass rate, run trends, recent failures

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server |
| `npm run build` | Production build |
| `npm run db:push` | Sync Prisma schema to SQLite |
| `npm run db:seed` | Seed sample data |
| `npm run db:studio` | Open Prisma Studio |

## Stack

Next.js 15 · TypeScript · Prisma · SQLite · Tailwind CSS 4

See [docs/PLAN.md](docs/PLAN.md) and [AGENTS.md](AGENTS.md) for architecture and agent roles.
