---
id: quantum-harmonic-oscillator
title: Quantum Harmonic Oscillator
summary: The quantum version of a mass on a spring. Its energy comes in perfectly even rungs, and even its lowest state still jiggles with zero-point energy. Nearly every vibrating quantum system — molecules, sound in crystals, light itself — is built from this one model.
level: 4
prerequisites: [schrodinger-equation]
related:
  - id: particle-in-a-box
    weight: 0.75
visual: visuals/quantum-harmonic-oscillator.html
---

## The idea

A mass on a spring, a pendulum in small swings, an atom jiggling in a crystal — classically these all obey the same tidy rule: a restoring force that pulls harder the further you stretch, giving smooth back-and-forth motion at any amplitude you like. Feed that same spring-like energy landscape into the Schrödinger equation and the smoothness disappears. The oscillator can only hold specific, quantized amounts of energy, and — remarkably — those energy rungs are spaced perfectly evenly, like a ladder with identical steps.

## Why it matters

This is arguably the most reused model in all of physics. Almost any system sitting near a stable equilibrium looks, up close, like a harmonic oscillator, so this one solution describes a staggering range: vibrating molecules (and thus infrared spectra), heat carried by atomic vibrations in solids, and even the quantized modes of the electromagnetic field — where each rung of the ladder *is* one more photon. Its evenly spaced levels are why a vibrating molecule absorbs light at a clean set of frequencies. Master this model and you hold a master key to the quantum behavior of matter and fields.

## The math (light)

The energy ladder with equal rungs:

**Eₙ = (n + ½) · h · f**

- **Eₙ** — energy of the nth level
- **n** — a whole number 0, 1, 2, … counting the rungs
- **f** — the oscillator's natural frequency (how fast it would swing)
- **h** — Planck's constant
- The **½** is the punchline: even at n = 0, the energy is ½·h·f, not zero. That's **zero-point energy** — the oscillator can never fully stop, a direct consequence of the uncertainty principle.

## See it

Imagine two atoms joined by a spring-like bond, forever trembling. Even chilled to absolute zero it never freezes solid still — it holds its zero-point jiggle. Shine infrared light on it and it absorbs only at photon energies matching the ladder spacing h·f, jumping up one even rung at a time. That crisp fingerprint of evenly spaced lines is how chemists identify molecules by their vibrations.
