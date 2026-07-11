---
id: photoelectric-effect
title: Photoelectric Effect
summary: Shine light on a metal and it can knock electrons loose — but only if the light's color (frequency) is high enough, no matter how bright it is. Einstein explained this by saying light itself arrives in energy packets called photons, cementing the quantum idea.
level: 1
prerequisites: [blackbody-radiation]
related:
  - id: double-slit-experiment
    weight: 0.6
visual: visuals/photoelectric-effect.html
---

## The idea

Point light at a metal surface and, under the right conditions, electrons fly off. Common sense (and classical wave physics) says: brighter light carries more energy, so brighter light should always eject electrons, and dimmer light should just take longer. That is *not* what happens. Below a certain color threshold, even blindingly bright light ejects nothing. Above it, even a feeble glow ejects electrons instantly. Color, not brightness, is the gatekeeper.

## Why it matters

This is the moment Planck's "energy comes in lumps" stopped being a bookkeeping trick and became a statement about light itself. In 1905 Einstein proposed that light *is* a stream of energy packets — photons — each carrying energy set by its frequency. One photon hits one electron. If that single photon doesn't carry enough energy to pay the electron's "escape fee," no amount of extra photons (more brightness) helps, because they don't pool their energy. Cross the threshold frequency and each photon has enough to liberate an electron on contact. This won Einstein the Nobel Prize and made the photon real.

## The math (light)

The energy budget is a simple accounting:

**E_kinetic = h · f − φ**

- **E_kinetic** — energy the ejected electron flies off with
- **h · f** — energy delivered by one photon (Planck's constant times frequency)
- **φ** (work function) — the minimum energy needed to pull an electron out of that particular metal

If **h · f** is less than **φ**, the electron stays put. Brightness only sets *how many* electrons come out, never *whether* they can.

## See it

Imagine a coin-operated turnstile that only accepts one exact coin. A photon is a coin; its frequency is the coin's value. A pile of low-value coins (dim or bright red light) never opens the gate. A single high-value coin (one blue photon) opens it immediately. In the lab, a metal plate connected to a detector clicks the instant ultraviolet light lands, yet stays silent under intense red light — the turnstile refusing an ocean of wrong coins.
