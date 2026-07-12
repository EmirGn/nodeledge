---
id: quantum-tunneling
title: Quantum Tunneling
summary: A quantum particle can pass through a barrier it doesn't have enough energy to climb over — its wavefunction leaks through the wall and sometimes emerges on the far side. It powers the Sun, modern electronics, and radioactive decay.
level: 4
prerequisites: [schrodinger-equation]
related:
  - id: particle-in-a-box
    weight: 0.6
visual: visuals/quantum-tunneling.html
---

## The idea

Roll a ball at a hill. If it lacks the energy to reach the top, it rolls back — always. A quantum particle facing an energy barrier it can't surmount does something impossible for the ball: sometimes it simply appears on the other side, having "tunneled" straight through. The reason is the wavefunction. When a particle's wave hits a barrier, it doesn't stop dead; it decays smoothly inside the wall. If the barrier is thin enough, the wave still has some height when it exits the far side — and a nonzero wave means a nonzero chance of finding the particle there.

## Why it matters

Tunneling is not a rare curiosity; it runs the universe. The Sun shines because protons in its core tunnel through their mutual electric repulsion to fuse — classically they'd almost never get close enough. Radioactive alpha decay is a particle tunneling out of a nucleus. Your electronics rely on it: flash memory traps and releases electrons by tunneling, and the scanning tunneling microscope images individual atoms by measuring the tunneling current across a tiny gap. It even sets limits on how small we can make transistors before electrons leak through walls we'd rather they didn't.

## The math (light)

The chance of tunneling falls off exponentially with barrier thickness:

**T ≈ e^(−2 · κ · L)**

- **T** — probability of tunneling through
- **L** — thickness of the barrier
- **κ** (kappa) — how fast the wavefunction decays inside the barrier, larger when the particle is more "underpowered" relative to the barrier height
- **e** — the exponential; because it's in an exponent, doubling the barrier thickness doesn't halve the odds, it squares the smallness

This razor sensitivity to thickness is why the tunneling microscope can feel single atoms.

## See it

Picture a wave rolling toward a seawall. Most of it reflects back, but a faint swell continues on the sheltered side — weaker, yet real. A scanning tunneling microscope drags a sharp tip a few atoms above a surface; the tunneling current across that gap swings wildly as the tip passes over each atom, tracing the surface bump by bump. That is tunneling turned into a picture of the atomic world.
