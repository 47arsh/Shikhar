# Phase 0 & 1 Review — Shikhar

Review of the shipped state before the open-vocabulary pivot (Step C). Each
finding is classed as **Blocking** (must fix before Phase 2), **Should fix**,
or **Nice to have**. Blocking items were fixed in small separate commits right
after this document was written.

## Environment used for the review

- Node v24.15.0, npm 12.0.2, Docker 29.9.2 available
- `node_modules` removed and reinstalled from scratch with `npm install`
  (registry reachable). Lockfile diff committed as part of the fix commits.
- `prisma generate` requires the Prisma engines download; the Windows engine
  is present in `node_modules/@prisma/engines`.

## Blocking

### B1. Typecheck fails — `src/lib/env.ts:17,40` redeclares `env`

`let env: Env;` and `export const env = loadEnv();` collide in module scope.
`tsc --noEmit` exits with TS2451. Fix: drop the `let env` line.

### B2. Typecheck fails — `src/lib/matching.ts:20` uses undefined `hasDigits`

`matching.ts` calls `hasDigits()` but `hasDigits` lives in `normalize.ts` and
is never imported. TS2304 on both call sites.

### B3. Typecheck fails — `src/lib/normalize.ts:1` imports nonexistent `url.normalize`

`import { normalize as unicornNormalize } from "url"` — Node's `url` module
has no `normalize` export (TS2305). The import is unused; remove it.

### B4. Typecheck fails — `@prisma/client` not generated, `PrismaClient` type missing

`node_modules/.prisma/client` is absent (postinstall script was blocked), so
`src/lib/prisma.ts` cannot resolve `PrismaClient` (TS2305). Fix: run
`prisma generate` after the schema fix (B6). Locally generated output is
gitignored via `node_modules`; CI runs `npx prisma generate`.

### B5. Typecheck / tests fail — `@vitejs/plugin-react` missing from devDependencies

`vitest.config.ts` imports `@vitejs/plugin-react`, which is not in
`package.json` and not installed. `tsc --noEmit` fails on `vitest.config.ts`
and `npm test` cannot load the vitest config. Fix: add
`@vitejs/plugin-react` to devDependencies and install.

### B6. Prisma schema is invalid — `prisma/schema.prisma:91`

```
@@unique([promptId, normalizedInput], { name: "UnmatchedSubmission_promptId_normalizedInput_key" })
```

Prisma 6 does not accept a named-argument object on `@@unique`, so
`prisma generate` and `prisma db push` fail with P1012. CI's
`prisma db push` step is therefore broken. Fix: drop the `{ name: ... }`
object (Prisma auto-names the constraint). This table is reworked in Phase 2
(see schema-vs-pivot below), so the fix is a one-line cleanup now.

### B7. `GO_LIVE.md` is missing

README points to `GO_LIVE.md` for the real-accounts/keys checklist and the
local-first rule requires it. No such file exists. Fix: add a stub
`GO_LIVE.md` with the checklist structure; real keys are added only in Phase 8.

### B8. `DATABASE_URL` can never trigger the production failure path

`src/lib/env.ts` gives every variable a default, including `DATABASE_URL`, so
the `process.exit(1)` production branch is unreachable. Fix: make
`DATABASE_URL` required-without-default and fall back to the localhost dev
value only outside production.

## Should fix

### S1. Content is short of the 100+ prompt target

22 prompts across exactly 12 categories pass validation (~879 answers, 37–42
per prompt). Target: 100+ prompts across 12+ categories. Categories are met;
prompt count is not. New prompts should be added in Phase 1 continuation work
(or via `npm run seed:wikidata` in Phase 2.5).

### S2. `verified` is never explicit in content JSON

No prompt file sets `verified`; the schema defaults it to `true`. Phase 1 rule
requires every prompt to have `verified` set explicitly, and
`content/REVIEW.md` flags several answers (e.g. Saraswati river) as needing
verification before shipping. Fix: add `"verified": true` to every file, or
`false` where REVIEW.md flags doubt.

### S3. `api/climb/result/[id]/route.ts` hard-codes game constants

Hard-codes `GAME_BASE = 1780`, `SUMMIT = 8586`, `POINTS_TO_SUMMIT = 600`
instead of importing `GAME` from `@/config/game`. Divergence risk if tunables
change.

### S4. Rate-limit constants duplicated

`rl` window (60s) and max (30) are duplicated verbatim in
`api/climb/start`, `api/climb/answer`, `api/climb/skip`.

### S5. Duplicate/overlapping scripts

`scripts/content/validate.ts` (used by `content:validate`) and
`scripts/validate.mjs` duplicate each other; `scripts/fix-dedupe.mjs` and
`scripts/generate-prompts.ts` both dedupe answers. `generate-prompts.ts` is
the generator that produced the shipped JSON files.

### S6. No committed migrations

`prisma/migrations` is gitignored and empty; CI relies on `prisma db push`.
For Phase 2 schema changes, migrations should be created and the gitignore
entry revisited so schema changes are reviewable.

### S7. `normalize.ts` exports redundant `normalizeName`

`normalizeName` is an alias of `normalizeInput` with no callers distinct from
it. Minor API surface cleanup.

## Nice to have

- Add `npm run content:validate` to the CI workflow (currently typecheck,
  lint, test only).
- Verify `docker compose up` boots Postgres and `prisma db push` applies the
  schema locally (planned as part of the B6 fix verification).
- Unit tests: none exist yet (`src/test/` has only `setup.ts`). Add tests for
  normalize/matching/scoring in Phase 2.

## Content quality

- `npm run content:validate`: **PASS** — 22 prompts, 12 categories, every
  prompt 30+ answers, rarity spread (1–8 / 9–40 / 60+) meets minimums,
  no duplicate canonical names or alias collisions after generation
  dedup.
- `content/REVIEW.md`: **exists**, lists 8 highest-rarity answers per prompt.
- `verified` field: absent everywhere (default `true`) — see S2.
- Categories: brands, cricket, festivals-and-traditions, food, geography,
  history, languages-and-words, music, nature, science-and-space,
  states-and-cities, transport.

## Leak check

- Client code (`src/app/page.tsx`, `layout.tsx`, globals) contains no answer
  lists, rarity values, or content imports. API routes are server-only and
  never return the full answer list or rarity. ✓ No client-side leak.

## Git history

- 9 commits on `main` (clean tree, up to date with origin/main).
- Largest commit: `d8ad078` Phase 1 content — 29 files, +5096/−0, including
  the 622-line `scripts/generate-prompts.ts` and 22 prompt JSONs. Oversized
  for a single commit but one logical phase; not rewritten per instructions.
- `41d45e8` package-lock (+9846 lines) is a lockfile commit, normal.
- No force-push or history rewriting will be done.

## Hard-coded items (config/data candidates)

- `src/app/api/climb/result/[id]/route.ts`: GAME_BASE, SUMMIT, POINTS_TO_SUMMIT (S3)
- `src/app/api/climb/{start,answer,skip}/route.ts`: rate-limit window 60 / max 30 (S4)
- `src/config/game.ts`: all tunables already centralized — no change needed here yet

## Schema vs the pivot (Step C.1)

Current `prisma/schema.prisma`:

| Model | Fields | Pivot change |
|---|---|---|
| Answer | id, promptId, canonicalName, seededRarity?, aliases Json, plays, createdAt | + `source` ("seeded"\|"judged"\|"approved"), + `entityId` String?, + `popularitySignal` Float? |
| JudgedAnswer | — does not exist — | new: promptId, normalizedInput, valid, canonicalName, entityId?, confidence, reason, answerId?, createdAt; @@unique([promptId, normalizedInput]) |
| UnmatchedSubmission | promptId, normalizedInput, count, firstSeen, lastSeen, reviewed, reviewNote | Repurposed as review queue for uncertain judgements (0.5 ≤ confidence < 0.8) and judge failures; clearly invalid inputs go to a negative cache instead |
| Climb / ClimbRound / PlayCount | — | unchanged |

New config constants in `src/config/game.ts` (Step C.1):
`judgeDailyCallCap`, `judgeTimeoutMs` (4000), `negativeCacheTtlDays`,
`judgeValidConfidence` (0.8), `judgeReviewConfidence` (0.5),
`neutralPriorRarity` (60), `maxInputLength` (60).

## Plan

Fix B1–B8 in small conventional-commit commits (each keeps typecheck + tests
green), then verify: fresh install, typecheck, lint, test, content validate,
`docker compose up` Postgres, `prisma db push`, env validation with mock and
production values. Then STOP for go-ahead on Step B.
