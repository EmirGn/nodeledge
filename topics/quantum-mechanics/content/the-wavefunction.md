---
id: the-wavefunction
title: The Wavefunction & the Born Rule
summary: A quantum object is described by a wavefunction — a spread-out mathematical wave that encodes everything knowable about it. The wave itself isn't directly observable; its squared height gives the probability of finding the particle at each location. That link is the Born rule.
level: 3
prerequisites: [de-broglie-waves, double-slit-experiment]
related:
  - id: heisenberg-uncertainty-principle
    weight: 0.7
visual: visuals/the-wavefunction.html
---

## The idea

If matter behaves like a wave, what exactly is waving? The answer is the **wavefunction**, written ψ (psi). It's a mathematical object spread across space that carries all the information there is about a particle — where it might be, how fast it might be moving, everything. Unlike a water wave, ψ isn't made of any substance and can even take on "imaginary" number values. It's a wave of *possibility*, not of stuff.

The catch: you never observe ψ directly. What you can predict is *probability*. Max Born's insight was that the wavefunction's magnitude, squared, tells you how likely you are to find the particle at each point. Where ψ is large, the particle is likely; where ψ is zero, it never appears.

## Why it matters

The Born rule is the hinge connecting quantum math to actual experiments. It reframes physics from "predict the outcome" to "predict the odds of each outcome." It explains the double-slit pattern perfectly: the two paths' wavefunctions add, and squaring the sum produces bright bands (high probability) and dark bands (near-zero probability) exactly where interference dictates. It also means quantum mechanics is fundamentally probabilistic — identical particles in identical situations can genuinely do different things.

## The math (light)

The Born rule in one line:

**P(x) = |ψ(x)|²**

- **P(x)** — probability (density) of finding the particle near position x
- **ψ(x)** (psi) — the wavefunction's value at that position
- **| · |²** — the squared magnitude, which turns the abstract, possibly-imaginary wave into a real, positive probability

Because total probability must equal 1, the wavefunction is "normalized" so all the |ψ|² across space sums to 100%.

## See it

Picture a blurry cloud around an atomic nucleus — thick where the electron is likely, thin where it's unlikely. That cloud *is* |ψ|². The electron isn't smeared out like fog; each time you look you find one point-like electron, but *where* you find it is dealt from the probabilities the cloud encodes. Repeat the measurement on many identical atoms and the dots reconstruct the cloud.
