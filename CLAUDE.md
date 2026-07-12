# nodeledge

## What this is

nodeledge is an AI-supported learning platform where knowledge is an interactive graph, not a
wall of text. Every concept is a **knownode**; nodes are connected by meaningful, weighted edges
(prerequisites and relatedness — unlike Obsidian-style graphs, where an edge only means "these
mention each other"). You search in your own words and the graph shows you the shape of the
subject: what exists, how it connects, and what's within reach next.

## Why it exists (the founding problem)

**Chat is a bad interface for learning because of the unknown-unknowns problem.** The founder
built his own quantum mechanics curriculum and asked Claude to explain concepts with
visualizations — but if you don't know a topic well, you cannot guide the AI to teach you: it
doesn't know what you don't know, and you can't ask about concepts you've never heard of. It is
also exhausting to re-tell an AI "what I want to learn" and "how to shape the learning process"
in every session. AI made knowledge free but didn't make learning easier — it's *too* good at
spitting out text. A graph answers the questions you didn't know to ask.

## Core product ideas

- **The graph IS the interface.** The main page is the full-screen graph, nothing else. Nodes
  are draggable. Hover = 1–2 sentence summary popup. Click = the full topic page opens.
- **Visual-first teaching.** Every knownode carries an interactive visualization where the
  learner *causes* the phenomenon (drag the frequency slider, watch electrons stop ejecting) —
  not a decoration next to text.
- **Portable package format** (see `FORMAT.md`): a topic = one directory with `manifest.json`
  (graph), `content/*.md` (knowledge), `visuals/*.html` (self-contained interactive visuals),
  linked by shared node id. Import/export = copy the folder. Contribution = authoring a package.
- **Questions, not commands (onboarding idea).** A new learner says "I want to learn quantum
  mechanics"; the app asks back — reasons, goals, preferences — and shapes a curriculum from
  the graph, instead of the user having to prompt-engineer their own education.
- **Dynamic nodes (future).** Knownodes shouldn't be frozen: if a node already exists you can
  use the pre-generated one or have your AI generate a personalized version ("this knownode is
  generated — want to generate your own?"). What the app learns about the user from the first
  node personalizes the nodes after it.
- **Open-source community (future).** Publish the format and platform openly; people (or their
  AI agents) contribute topic packages. Free community, human-vouched quality over raw AI
  output. Explicitly deferred until the single-topic experience proves itself.

## Current architecture (July 2026 pivot)

nodeledge is a multi-user app, not a single-package player: a signed-in user types what they
want to learn, `claude-opus-4-8` generates the knownode graph (structured output), and it's
stored privately per user. Node bodies are generated lazily on first open. Learner state
(known nodes) drives the graph rendering: known / within-reach frontier / locked, expressed
purely through brightness, plus "trace prerequisites" (topologically ordered path to any
locked node). The quantum-mechanics package remains a shared file-based demo.

- Auth: Better Auth, email+password. Custom `/login`; `web/src/proxy.ts` does the optimistic
  cookie redirect; real enforcement is `requireUser()` in `web/src/lib/session.ts` (call it in
  every page/action/handler).
- DB: Drizzle + Postgres only (PGlite was tried and abandoned — single-writer, breaks under
  Next dev's per-route module graphs). Local dev: `docker compose up -d` in `web/` (port
  5433); prod: `DATABASE_URL`. Migrations live in `web/drizzle/` (generate with
  `npx drizzle-kit generate`; applied automatically on boot by `web/src/lib/db/index.ts`).
  Never use `drizzle-kit push` against the dev DB.
- Generation: prompts + validation in `web/src/lib/generate.ts`, provider switch in
  `web/src/lib/model.ts` — Claude (`claude-opus-4-8`) is the production model, Gemini is the
  dev-time backend (founder's call: don't burn Claude credits while iterating). Picked by
  `MODEL_PROVIDER` env, else whichever of `ANTHROPIC_API_KEY` / `GEMINI_API_KEY` is set
  (Anthropic wins if both). Persisted via `web/src/lib/topics.ts`. `POST /api/topics` streams
  NDJSON (`meta`/`node`/`edge`, then `done` with the persisted id), parsed incrementally from
  the model's JSON output — the Atlas swaps to the graph board on submit and draws knownodes
  as they arrive; the DB write happens once at the end from the full sanitized graph.
- Next.js 16: `middleware` is `proxy.ts`, `cookies()`/`params` are async — read
  `web/AGENTS.md` and the bundled docs before writing Next code from memory.

## Repo layout

- `FORMAT.md` — nodeledge package format spec v1.0 (the import/export contract; read before
  touching package files)
- `topics/quantum-mechanics/` — the seed topic package: 15 nodes, 28 edges (17 prerequisite +
  11 related), one interactive visual per node; served as the shared demo at
  `/t/quantum-mechanics`
- `web/` — Next.js app (TypeScript, Tailwind, App Router, `src/` dir): auth, DB, generation,
  and the graph UI. Packages stay portable and separate from the app.
- `nodeledge.pdf`, `secondthoughts.png` — the founder's hand-drawn idea sketches (source of
  truth for intent; re-read when direction is unclear)

## Design

**DESIGN.md exists and is law.** Monochrome Observatory direction: brightness is hierarchy,
IBM Plex Sans/Mono, 2px radii, border-defined surfaces, instrument voice. Every new surface
reuses the tokens and classes in `web/src/app/globals.css` — no new visual language. The
founder cares a lot about design; never default to generic startup UI (purple gradients,
feature cards, hero sections).

## Working conventions

- Content accuracy is non-negotiable: this teaches real physics. Never trade correctness for a
  prettier visual (no "observation = conscious observer", no brightness ejecting electrons
  below threshold).
- Node bodies stay short (~300–450 words), intuition-first: The idea / Why it matters /
  The math (light) / See it.
- Visuals are self-contained single HTML files, vanilla JS, no external requests, sandboxed
  iframe-safe, `prefers-color-scheme` aware (full rules in FORMAT.md).
- `manifest.json` and content frontmatter must never drift apart.
