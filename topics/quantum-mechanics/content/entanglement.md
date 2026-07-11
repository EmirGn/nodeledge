---
id: entanglement
title: Quantum Entanglement
summary: Two particles can share a single joint quantum state, so their properties stay perfectly correlated no matter how far apart they travel. Measuring one instantly determines the other — yet no usable information travels faster than light. Einstein called it "spooky action at a distance."
level: 5
prerequisites: [superposition-and-measurement, spin]
related: []
visual: visuals/entanglement.html
---

## The idea

Prepare two particles together in the right way and they can become **entangled**: they no longer have separate individual states, only one shared state describing the pair. Say two electrons are entangled so their spins must be opposite. Neither one is "up" or "down" on its own beforehand — both are in superposition. But the instant you measure one and find "up," the other is guaranteed "down," even if it's now light-years away. The correlation is perfect and immediate, and it holds for *any* measurement axis you both later choose.

## Why it matters

Entanglement is the feature that most sharply separates quantum reality from classical intuition. Einstein hoped the correlations were just hidden pre-agreed answers the particles carried along, like two gloves mailed to different cities. John Bell showed how to test this: entangled particles violate a numerical limit ("Bell's inequality") that any pre-agreed-answer theory must obey. Experiments confirm the violation — reality really is non-local in this correlational sense; there are no hidden local instructions. Crucially, you still can't send a message faster than light, because each individual result looks like random noise until you compare notes over a normal channel. Entanglement is the fuel of quantum computing, quantum cryptography, and teleportation protocols.

## The math (light)

The signature entangled state of two spins:

**|ψ⟩ = ( |up⟩|down⟩ − |down⟩|up⟩ ) / √2**

- Each term pairs one particle's outcome with the other's
- The two particles are **opposite** in every term, so measuring one fixes the other
- Neither particle alone has a defined spin — you cannot factor this into "particle 1's state" times "particle 2's state." That inseparability *is* entanglement.

## See it

Imagine a pair of magic coins minted together. Flip them in separate galaxies and each lands heads or tails at random — but they *always* land opposite each other. Ordinary coins could fake this with a pre-agreed rule. Bell's genius was designing a game with several possible flip-angles where the quantum coins win more often than any pre-agreed rule allows. Nature plays the quantum game, and wins.
