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

## Repo layout

- `FORMAT.md` — nodeledge package format spec v1.0 (the import/export contract; read before
  touching package files)
- `topics/quantum-mechanics/` — the seed topic package: 15 nodes, 28 edges (17 prerequisite +
  11 related), one interactive visual per node
- `web/` — Next.js app (TypeScript, Tailwind, App Router, `src/` dir): the "player" that renders
  packages. Kept strictly separate from packages so topics stay portable.
- `nodeledge.pdf`, `secondthoughts.png` — the founder's hand-drawn idea sketches (source of
  truth for intent; re-read when direction is unclear)

## Design direction (in flux — no DESIGN.md yet)

Decided so far: **anti-corporate** (enemy brand: Coursera/Udemy — nothing MOOC-like, no stock
gloss), **dark and calm**, and the founder ranked a warm hand-drawn "chalkboard" treatment above
slick product styling. Current prototype: full-screen slate-green board, chalk-ivory hand-drawn
nodes (wobbly outlined shapes containing the concept name), chalk-yellow accent, dashed chalk
edges. Typography and final direction not yet locked — when they are, write DESIGN.md and treat
it as law. The founder cares a lot about design; never default to generic startup UI (purple
gradients, feature cards, hero sections).

## Working conventions

- Content accuracy is non-negotiable: this teaches real physics. Never trade correctness for a
  prettier visual (no "observation = conscious observer", no brightness ejecting electrons
  below threshold).
- Node bodies stay short (~300–450 words), intuition-first: The idea / Why it matters /
  The math (light) / See it.
- Visuals are self-contained single HTML files, vanilla JS, no external requests, sandboxed
  iframe-safe, `prefers-color-scheme` aware (full rules in FORMAT.md).
- `manifest.json` and content frontmatter must never drift apart.
