# Nodeledge Package Format — v1.0

A **nodeledge package** is a self-contained, portable directory describing one topic as a graph of
knowledge nodes ("knownodes"). Importing a package gives an app everything it needs to render the
topic: the graph structure, the knowledge content, and the visualizations. Exporting is just
copying/zipping the directory. No database, no build step, human-readable, git-friendly.

```
<topic-slug>/
├── manifest.json        # topic metadata + full graph (nodes + edges) — single source of truth
├── content/
│   └── <node-id>.md     # one knowledge file per node (YAML frontmatter + markdown body)
└── visuals/
    └── <node-id>.html   # one self-contained interactive visualization per node (optional per node)
```

## Linking rule

Knowledge and visuals are **separate files linked by shared node id** and declared explicitly:
`content/photoelectric-effect.md` sets `visual: visuals/photoelectric-effect.html` in its
frontmatter. A node may omit `visual` (no visualization yet). Paths are always package-relative.

## manifest.json

```jsonc
{
  "format": "nodeledge-package",
  "formatVersion": "1.0",
  "topic": {
    "slug": "quantum-mechanics",      // = directory name
    "title": "Quantum Mechanics",
    "description": "…",
    "language": "en",
    "version": "0.1.0"                // content version, bump on edits
  },
  "nodes": [
    { "id": "photoelectric-effect", "title": "…", "summary": "…", "level": 1 }
  ],
  "edges": [
    { "source": "blackbody-radiation", "target": "photoelectric-effect",
      "type": "prerequisite", "weight": 1.0 }
  ]
}
```

- `nodes[].summary` — 2–3 plain-language sentences; this is the hover-popup text.
- `nodes[].level` — 1–5 depth in the learning progression (1 = entry point).
- `edges[].type` — `"prerequisite"` (directed: learn source before target) or
  `"related"` (undirected cross-connection).
- `edges[].weight` — relevance 0–1. Prerequisites default to 1.0.

## content/<node-id>.md

```yaml
---
id: photoelectric-effect          # must equal filename and a manifest node id
title: Photoelectric Effect
summary: <same text as manifest>
level: 1
prerequisites: [blackbody-radiation]
related:
  - id: double-slit-experiment
    weight: 0.6
visual: visuals/photoelectric-effect.html   # optional
---
<markdown body — short, intuition-first. Suggested sections:
## The idea / ## Why it matters / ## The math (light) / ## See it>
```

Frontmatter edges and manifest edges MUST stay consistent (frontmatter is the human-editable
view; the manifest is the machine index — regenerate one from the other, never let them drift).

## visuals/<node-id>.html

An interactive teaching visualization. Hard requirements (players embed these in a **sandboxed
iframe**, so a visual must work with zero privileges):

- **Fully self-contained**: inline CSS/JS/SVG only. No external requests of any kind
  (no CDNs, fonts, images, fetch). No cookies/localStorage.
- Vanilla JS — no framework runtimes.
- Responsive: fills its container (`100%` width/height), usable from ~320px up.
- Respects `prefers-color-scheme` for light/dark.
- Interactive where it teaches: at least one control (slider, toggle, drag) whose manipulation
  demonstrates the concept — the visual should let the learner *cause* the phenomenon, not
  just watch it.

## Validity rules

1. Every `nodes[].id` has a matching `content/<id>.md`; every content file has a manifest node.
2. Every edge endpoint and every frontmatter reference is an existing node id.
3. `related` edges are symmetric in meaning; store each once in the manifest.
4. No node may be both prerequisite and related to the same node.
5. No orphan nodes — the graph is connected.
6. Every `visual:` path exists inside `visuals/`.
