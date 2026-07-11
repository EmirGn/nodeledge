---
id: quantum-computing
title: Introduction to Quantum Computing
summary: Quantum computers store information in qubits that can be in superpositions and entangled with each other. By orchestrating interference among many possibilities at once, they can solve certain problems dramatically faster than any ordinary computer.
level: 5
prerequisites: [superposition-and-measurement, entanglement]
related:
  - id: spin
    weight: 0.6
visual: visuals/quantum-computing.html
---

## The idea

A classical bit is a definite 0 or 1. A **qubit** — often a single spin, or an atom, or a superconducting loop — can be 0, 1, or any superposition of both at once. String together *n* qubits and their joint state spans 2ⁿ possibilities *simultaneously*. That sounds like magic free parallelism, but there's a catch: when you measure, you get just one answer at random. The art of quantum computing is arranging the computation so that the wrong answers *interfere and cancel* while the right answer's amplitude builds up — so that the single value you read out is very likely the one you want.

## Why it matters

For most everyday tasks a quantum computer offers no advantage. But for a special class of problems the speedup is enormous. Shor's algorithm can factor huge numbers efficiently, threatening the encryption that secures the internet and driving today's shift to "post-quantum" cryptography. Grover's algorithm speeds up unstructured search. And crucially, quantum computers can simulate quantum systems themselves — molecules, materials, chemical reactions — that overwhelm classical machines, promising advances in drug design and materials science. The chief obstacle is decoherence: qubits lose their delicate superpositions the moment the environment "measures" them, so real machines fight a constant battle to stay isolated and error-corrected.

## The math (light)

A single qubit is a superposition of two basis states:

**|q⟩ = α|0⟩ + β|1⟩**

- **|0⟩, |1⟩** — the two definite classical values
- **α, β** — amplitudes; **|α|²** and **|β|²** are the probabilities of reading 0 or 1, and sum to 1
- Because α and β can be negative or complex, amplitudes can **cancel** — this interference is the engine of quantum speedups that mere probabilities could never provide.

## See it

Picture a maze with countless paths. A classical computer walks them one by one. A quantum computer sends a wave down all paths at once and tunes the walls so that waves from dead-end paths meet crest-to-trough and vanish, while waves along the exit route reinforce — so when you finally look, the amplitude piles up at the way out. Superposition explores; entanglement links the qubits; interference selects the answer.
