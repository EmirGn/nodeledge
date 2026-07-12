---
name: verify
description: How to build, run, and drive nodeledge's web app to verify changes end-to-end.
---

# Verifying nodeledge changes

Paths below use the local monorepo layout (app in `web/`). On the deployed
app-root layout (GitHub main, where the app is the repo root), drop the
`web/` prefix.

## Prerequisites

- Postgres: `docker compose up -d` in `web/` (port 5433). Check: `docker compose -f web/docker-compose.yml ps`.
- Dev server usually already running on port 3000 (`npm run dev` in `web/` if not). Check: `curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/login`.
- `web/.env.local` has model keys; `MODEL_PROVIDER` picks the backend (Gemini for dev — don't burn Claude credits on verification runs).

## Auth handle (no UI login needed)

Create a throwaway account and capture the session cookie:

```bash
curl -s -c cookies.txt -X POST http://localhost:3000/api/auth/sign-up/email \
  -H "Content-Type: application/json" \
  -d '{"name":"verify bot","email":"verify-<something>@test.local","password":"some-password-1234"}'
```

Gotcha: the session cookie line in `cookies.txt` is prefixed `#HttpOnly_` — strip that prefix before parsing, don't filter it out as a comment.

## API surface

`POST /api/topics` streams NDJSON (`status`, `meta`, `node`, `edge`, `done`/`error`). Timestamp arrivals to see stream pacing:

```bash
curl -sN -b cookies.txt -X POST http://localhost:3000/api/topics \
  -H "Content-Type: application/json" -d '{"prompt":"..."}' \
  | perl -MTime::HiRes=time -ne 'BEGIN{$t0=time} printf "t+%6.2fs  %s\n", time-$t0, substr($_,0,110); $|=1'
```

Model TTFT is ~30s on the dev backend — expect a long gap between `status` and `meta`.

## UI surface (headless)

The Chrome extension may not be connected; Playwright works. The machine has browsers cached at `~/Library/Caches/ms-playwright` — install the **matching package version** in the scratchpad instead of downloading new browsers (chromium-1208 ↔ `playwright@1.58`; on mismatch, check `node_modules/playwright-core/browsers.json` revision against the cache dir names).

- Inject the curl session cookie via `context.addCookies` (`domain: "localhost"`, `httpOnly: true`).
- Don't use `waitUntil: "networkidle"` — Next dev's HMR socket keeps the network busy forever. Use `domcontentloaded` + `waitForSelector`.
- Use `colorScheme: "dark"` to match the app's primary theme.
- Atlas prompt input: `.atlas-input input`, submit with Enter. HUD corners are `.hud-tl/.hud-tr/.hud-bl/.hud-br`; graph nodes are `.knownode`. On `done` the client navigates to `/t/<id>`.

## Worth driving

- New-graph flow: atlas → submit → charting states → persisted graph page.
- Shared demo `/t/quantum-mechanics` renders the non-charting GraphBoard.
- Error paths: `/api/topics` unauthenticated redirects to `/login` (proxy), prompt <3 chars returns `{"error":...}` JSON with 400.
