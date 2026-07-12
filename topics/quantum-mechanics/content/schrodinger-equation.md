---
id: schrodinger-equation
title: The Schrödinger Equation
summary: This is quantum mechanics' equivalent of Newton's laws — the master equation that tells you how a wavefunction evolves and changes shape over time. Solve it for a given situation and you get the allowed energies and behaviors of the system.
level: 3
prerequisites: [the-wavefunction]
related:
  - id: de-broglie-waves
    weight: 0.7
visual: visuals/schrodinger-equation.html
---

## The idea

Newton gave classical physics a recipe: tell me the forces, and F = ma tells you how a thing moves. Quantum mechanics needed the same kind of engine for wavefunctions, and in 1926 Erwin Schrödinger delivered it. His equation takes a wavefunction and tells you how it changes moment to moment — how it flows, spreads, and oscillates as time passes. Feed in the forces acting on a particle (captured as its potential energy landscape), and the equation dictates every future shape of ψ.

The most powerful move is asking for the *stationary* states — wavefunctions whose probability clouds don't change over time. These are the standing waves of the quantum world, and solving for them hands you the system's allowed energy levels directly.

## Why it matters

Almost everything concrete in quantum mechanics comes from solving this one equation for different situations. A particle trapped in a box, an electron bound to a proton, atoms bonding into molecules — each is a different potential energy landscape plugged into Schrödinger's equation, and out come the discrete energy levels and orbital shapes we observe. It explains the entire periodic table, the colors atoms emit, and why energy comes in quantized rungs rather than a smooth ramp. It is the workhorse of chemistry and much of modern physics.

## The math (light)

The time-independent (stationary-state) form, stripped to its essence:

**Ĥ ψ = E ψ**

- **ψ** (psi) — the wavefunction we're solving for
- **E** — the energy of that state, a single number
- **Ĥ** ("H-hat," the Hamiltonian) — an operation that adds up the particle's kinetic and potential energy
- The equation says: applying the energy operation to ψ gives back the same ψ times its energy. Only special wavefunctions satisfy this, and each comes with its own allowed **E**.

## See it

Think of a guitar string clamped at both ends. It can't vibrate at just any frequency — only the fundamental note and its overtones fit, because the ends must stay pinned. The Schrödinger equation plays the same game in three dimensions: only certain wavefunctions "fit" a given situation, and those select a discrete ladder of allowed energies. The rest are simply not solutions, and so are not allowed.
