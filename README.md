# Shikhar

An Indian rarity-trivia climbing game. Climb Kanchenjunga (8,586 m) by giving rare answers to trivia prompts.

## Tech stack

- Next.js 15 (App Router) + TypeScript (`strict: true`)
- Tailwind CSS
- Postgres + Prisma (Neon free tier)
- Redis (Upstash free tier; in-memory adapter in dev/tests)
- Zod for validation
- Vitest for unit tests
- Deploy on Vercel

## Getting started

```bash
npm install
cp .env.example .env.local
npm run db:generate
npm run db:push
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start dev server |
| `npm run build` | Production build |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm run typecheck` | TypeScript strict check |
| `npm test` | Run Vitest |
| `npm run db:generate` | Generate Prisma client |
| `npm run db:push` | Push Prisma schema to DB |
| `npm run content:validate` | Validate content JSON files |
| `npm run content:seed` | Seed content into Postgres |
| `npm run simulate` | Run climb simulation |
| `npm run check:env` | Check production env vars |

## Environment

Copy `.env.example` to `.env.local` and adjust. Never commit `.env.local`.

## Phases

See `GO_LIVE.md` for the go-live checklist (real accounts/keys only at the end).
