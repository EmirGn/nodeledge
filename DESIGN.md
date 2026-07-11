# DESIGN.md — nodeledge

> Status: Identity + rules locked. `## Direction` section pending the divergence test
> (three graph-screen treatments). Once a direction is picked, this file is law.

## Identity

nodeledge is for self-driven learners who refuse to be spoon-fed a "course." It promises
to show you the shape of what you don't know — knowledge as an instrument you operate,
not content you consume. Surviving adjectives: **precise, luminous, rebellious**.

Enemy brand: **Coursera / Udemy** — we are the opposite of the MOOC. No enrollment
funnels, no progress-bar gamification, no stock-photo learners smiling at laptops.
Cousin brand: **Linear** — quiet software craft, engineered precision, dark and calm.
Secondary kin: 3Blue1Brown's luminous-math-on-dark-void feeling for the graph itself.

## NEVER (hard prohibitions)

- NEVER use hand-drawn, chalk, sketch, or skeuomorphic "school" textures. The
  chalkboard direction is dead; nothing from it carries over.
- NEVER use purple/indigo accents or multi-color gradients (the AI-default palette).
- NEVER use MOOC vocabulary: "master", "unlock", "learning journey", "enroll",
  "course", "start learning today". Say what the thing does.
- NEVER use feature cards, marketing hero sections, testimonials, or badge/streak
  gamification. The graph is the interface; there is no brochure in front of it.
- NEVER use emoji in UI, mascots, or stock imagery of any kind.
- NEVER use more than 2 font families or soft-friendly rounded blobs (pill buttons,
  radius > 4px, squircles).
- NEVER center-align body text or use drop shadows heavier than a 1px-blur ambient.

## Typography

- UI / body: **IBM Plex Sans** — 400 and 600 only. Body 15px/1.6 in topic pages.
- Technical voice: **IBM Plex Mono** — node labels, search input, metadata, counts,
  keyboard hints, edge annotations. 400 and 500. Slight positive tracking (+0.02em)
  at small sizes, uppercase only for tiny section labels (11px).
- Max 2 families, max 4 weights total. Display sizes come from Plex Sans 600 with
  tight tracking (-0.02em), never from a third font.

## Color

Temperature: **neutral monochrome** (founder decision 2026-07: no hue anywhere).
Black, white, and gray only — hierarchy is carried by **brightness**, never by color.
The selected node is simply the brightest thing on screen.

Two themes, same ramp inverted. Dark ("Deep field") is the primary/default; light
("Print" — plotter-schematic on paper) is a full peer, not an afterthought.

| Token   | Dark      | Light     | Role |
|---------|-----------|-----------|------|
| Canvas  | `#0B0B0C` | `#F4F4F2` | page background, the void the graph floats in |
| Surface | `#141416` | `#FFFFFF` | panels, popovers — borders define them, not shadows |
| Ink     | `#F2F2F3` | `#0B0B0C` | primary text, node labels |
| Muted   | `#9A9A9F` | `#6E6E73` | secondary text, resting edges, inactive nodes |
| Bright  | `#FFFFFF` | `#000000` | the accent role: selected node, focus, primary actions |

Prerequisite edges render as `Muted`; related edges same value at lower opacity —
opacity variation, not new colors. Canvas texture: a visible dot grid (`Ink` at 9–14%
dark / ~14% light, ~26–32px spacing) is part of the identity, not optional decoration.
Node glow (radial `Bright` at low opacity) exists in dark only; light stays flat ink.

## Space & Layout

- Spacing scale: 4 / 8 / 16 / 32 / 64.
- Density: **compact, instrument-panel chrome** (HUD elements, panels, metadata) around
  an **airy graph** — the void itself stays generous; UI never crowds the center.
- Hard left alignment inside panels. Chrome pinned to viewport edges; the center of the
  screen belongs to the graph.
- Corner radius: **2px**, used everywhere. Borders (`1px`, `Ink` at 8–12% opacity)
  define surfaces, not shadows.

## Imagery & Texture

- No imagery. The interactive visuals inside knownodes ARE the imagery; the shell
  stays typographic and geometric.
- Iconography: geometric line icons, 1.5px stroke, square caps, drawn on a 16px grid.
  No filled icons, no icon fonts.
- Permitted texture: node glow (accent at low opacity, radial) and a faint dot-grid on
  the canvas (`Ink` at ≤4%) if depth is needed. Nothing else.

## Motion

- 150ms ease-out for all UI transitions (hover popups, panel slides). Nothing bouncy.
- The graph is the one exception: node drag and force-layout settle may use gentle
  physics (critically damped — overshoot reads as toy). Node glow may breathe on
  hover only, never idle-animate.

## Voice (microcopy)

- Sentence case everywhere, including buttons. No exclamation marks.
- Declarative and a little defiant: state positions ("Chat is a bad interface for
  learning"), don't sell benefits. Verbs over nouns in actions ("open", "trace
  prerequisites", not "Exploration Mode").
- The system talks like an instrument, not a coach: "3 prerequisites unmet", never
  "You're almost there!"

## Direction

**Observatory** (divergence test winner, 2026-07): the graph is a star map operated
from an instrument panel. Mono HUD chrome pinned to the viewport edges (wordmark +
topic top-left, ⌘K command-bar search top-center, counts and status in the corners),
a readout panel for the selected node, crosshair marks on selection. The center of the
screen is void + graph, always. Monochrome: see Color — no hue, brightness is
hierarchy, dot-grid texture on the canvas.

Final pick (2026-07): **A1 "Deep field" is the dark theme, A3 "Print" is the light
theme** — same layout, inverted ramp. A2 "Instrument" is dead (no ruler ticks, no
tabular-machine density).

**Selection treatment: NO crosshair/target ticks** (founder veto). A selected node is
marked by brightness alone: enlarged `Bright` core + one fine ring (1px, `Bright` at
~60–85%) + in dark, a larger radial glow. Nothing that looks like a scope reticle.
