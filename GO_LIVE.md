# Go Live Checklist — Shikhar

Real accounts and keys are added only in Phase 8. Until then everything runs
on mock or local services; no env var requires a real account to develop.

## Local development (no accounts needed)

1. `cp .env.example .env.local` — dev defaults work out of the box
   (`KV_ADAPTER=memory`, judge and entity lookups use mock adapters).
2. `npm install`
3. `npm run db:generate`
4. `npm run db:push` (needs Postgres: `docker compose up -d`, or point
   `DATABASE_URL` at a local Postgres)
5. `npm run content:validate` and `npm run content:seed`
6. `npm run dev` — open http://localhost:3000

## Before the first production deploy (Phase 8 manual steps)

- [ ] Neon: create Postgres database, set `DATABASE_URL`
- [ ] Upstash: create Redis, set `KV_ADAPTER=upstash`,
    `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`
- [ ] LLM judge: set `JUDGE_PROVIDER`, the LLM API key, the model name, and
    `judgeDailyCallCap` (check current pricing before picking a cap)
- [ ] Wikidata lookups: set a descriptive `User-Agent`
- [ ] Vercel: connect the repo, add the env vars above, add custom domain
- [ ] AdSense: set `NEXT_PUBLIC_ADSENSE_PUBLISHER_ID`, upload `ads.txt`
- [ ] Consent banner: EEA/UK/Swiss visitor consent flow
- [ ] `npm run check:env` passes with `NODE_ENV=production`
- [ ] Content spot-check: `content/REVIEW.md`, every prompt `verified: true`
- [ ] Run `npm run typecheck`, `npm run lint`, `npm test`, and
    `npm run content:validate` on the deploy branch

## Env var reference

See `.env.example` for the full list with development placeholders.
Never commit `.env.local`.
