---
id: particle-in-a-box
title: Particle in a Box
summary: The simplest solvable quantum system: a particle trapped between two walls. It can only occupy specific standing-wave states with quantized energies, and it can never sit perfectly still. A clean sandbox for seeing where energy levels come from.
level: 4
prerequisites: [schrodinger-equation]
related:
  - id: quantum-harmonic-oscillator
    weight: 0.75
  - id: quantum-tunneling
    weight: 0.6
visual: visuals/particle-in-a-box.html
---

## The idea

Take a particle and confine it to a stretch of space with impenetrable walls on both sides — a one-dimensional "box." Because the wavefunction must drop to zero at each wall (the particle can't be found outside), only certain waves fit inside: exactly those with a whole number of half-wavelengths spanning the box. It's the guitar-string picture made literal. Each allowed standing wave corresponds to one allowed energy, and the energies form a discrete ladder, not a continuous ramp.

This is the "hydrogen atom of homework problems" — simple enough to solve by hand, yet it demonstrates the central quantum surprise: confinement forces quantization.

## Why it matters

Every bound quantum system — electrons in atoms, quantum dots, electrons in a wire — is a dressed-up version of this box. It shows *why* trapped particles have discrete energy levels and *why* those levels spread further apart as the box shrinks: squeeze the space and the allowed wavelengths must shorten, driving energies up. It also reveals **zero-point energy** — the lowest allowed state still has energy, so a confined quantum particle can never be truly at rest. That's the uncertainty principle made concrete: pin a particle in a small box and it must jitter.

## The math (light)

The allowed energies climb as the square of a whole number:

**Eₙ = n² · h² / (8 · m · L²)**

- **Eₙ** — energy of the nth level
- **n** — a positive integer (1, 2, 3, …) labeling the rung; note n can't be 0, so the lowest energy isn't zero
- **h** — Planck's constant
- **m** — the particle's mass
- **L** — the width of the box

Smaller **L** (tighter box) or smaller **m** (lighter particle) pushes the energies higher.

## See it

Picture jump ropes fixed at both ends. You can make one clean arch (n=1), or a shape with a still point in the middle (n=2), or two still points (n=3) — but never a shape that wiggles at the fixed ends. Each pattern hums at its own energy. A particle in a box lives on exactly these patterns; the quantum dots that give some TV screens their vivid colors are tiny boxes tuned this way, their size setting the light they emit.
