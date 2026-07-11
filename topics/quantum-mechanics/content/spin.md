---
id: spin
title: Quantum Spin
summary: Particles carry an intrinsic angular momentum called spin — a magnetic, compass-like property that is fundamentally quantized. It isn't literal spinning; measure it along any axis and you get only two answers, "up" or "down," never anything in between.
level: 4
prerequisites: [the-wavefunction]
related:
  - id: superposition-and-measurement
    weight: 0.6
  - id: quantum-computing
    weight: 0.6
visual: visuals/spin.html
---

## The idea

Every electron behaves like a tiny magnet with an angular momentum baked in from the start — a property called **spin**. The tempting picture is a little ball rotating on its axis, but that's wrong: a point particle has no surface to spin, and the numbers don't work. Spin is a genuinely new, intrinsic quantity with no classical counterpart. Its defining strangeness: pick *any* direction and measure the electron's spin along it, and you get exactly one of two results — "up" or "down." Never 30% up. Never sideways. The answer is always one of two discrete values, whichever axis you choose.

## Why it matters

Spin is the reason matter is stable and structured. Because electrons have half-integer spin, they obey the Pauli exclusion principle: no two can occupy the same quantum state. That single rule stacks electrons into shells, builds the periodic table, and underlies all of chemistry and the solidity of ordinary stuff. Spin also makes magnets magnetic, gives us MRI scanners (which flip nuclear spins), and provides the cleanest possible two-state quantum system — a natural qubit — for quantum computing. It's the simplest place to see superposition and measurement in raw form.

## The math (light)

Spin's magnitude is quantized in half-integer units of Planck's constant, and along any measured axis it takes just two values:

**S_z = ± ½ · ħ**

- **S_z** — the spin measured along your chosen axis (call it z)
- **± ½** — the only two outcomes for an electron: spin-up or spin-down
- **ħ** ("h-bar") — Planck's constant over 2π, the quantum unit of angular momentum

Before measurement the electron can be in any *superposition* of up and down; the act of measuring forces one of the two.

## See it

The Stern-Gerlach experiment sends a beam of atoms through an uneven magnetic field. Classically the beam should smear into a continuous band, since the atomic magnets should point every which way. Instead it splits cleanly into exactly two spots — up and down — with nothing between. Reality had drawn a sharp line where classical physics expected a smear.
