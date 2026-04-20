# Slop's Quest for Meaning
### Game Design Document — Working Draft
*Last updated: 2026-04-20 — Questions 1–20 answered. Questions 21–40 pending.*

---

## The Pitch

**Slop's Quest for Meaning** is the game where you finally get to feel what it's like to be a piece of generated art trying to live its life — whatever pirated, half-life that might be.

You are Slop. You didn't ask to exist. You can't stop existing. You go north.

---

## Core Emotion

**Curiosity.** Not dread, not irony — genuine wondering. The game asks one question and never fully answers it: *does it matter who made what anymore?* The player and Slop find out together. Or don't. That's okay too.

---

## Tone & References

| Reference | What It Contributes |
|---|---|
| *All Hail West Texas* — The Mountain Goats | Lo-fi intimacy. Raw production as emotional honesty. The roughness is the voice. |
| *Wall-E* starring in *Severance* | Isolation inside a system whose purpose is opaque. Doing a job without knowing why. Corporate absurdity as backdrop. |
| *Braid* | A recontextualization in the third act that reframes everything. Unreliable perception. Melancholy that earns its beauty. |

**Humor:** Both ends of the spectrum, deliberately. The world starts dry and deadpan — beige, spare, flat. As Slop accumulates meaning, the world tips toward the surreal and vibrant. The humor changes register as the palette changes. This is not a metaphor. The palette *is* the progress bar.

---

## The World

The overworld is coherent in places — towns, communities, families — but never coherent as a whole. Slop cannot tell the difference between local coherence and global coherence. Neither can the player. This is intentional. The player's knowledge is hard-capped at Slop's knowledge.

There is no "before." Slop has no history, no context, no sense of what civilization looked like prior to now. The world simply is. It may be a loop. Slop doesn't know. He only goes.

**Visuals:** Pixel art. Simple at first — limited palette, minimal detail, lots of beige and grey. As Slop grows, the world grows with him: more color, more complexity, more visual noise that resolves into something. Art assets are AI-generated (Gemini / GPT sprite sheets). The imperfection is load-bearing.

**Other characters:** Open question. Deferred until the world demands them.

---

## Slop

**Appearance:** A glitchy blob. AI-generated sprite sheet. It will not look good. That is correct.

**Movement:** Floaty and jerky simultaneously. Wrong in a way that feels like lag, or like the physics engine doesn't fully believe in him.

**Voice:** Text dialogue with a buzz/beep sound effect. Toggleable in settings.

**Evolution:** Slop changes in all ways over the course of the game — visually, mechanically, emotionally. The blob at the end is not the blob at the beginning.

**Core Ability (TBD):** Slop's "sword" — the thing he picks up going north at the start. Not yet decided. Candidates:
- **A Prompt** — generates short text/image bursts that affect the world. Enemies react to being named.
- **A Glitch** — temporarily corrupts tiles, enemies, barriers.
- **Attention** — slowly reveals the true form of things. The only way to unlock certain content.
- **A Query** — asks the world a yes/no question. The world answers honestly but unhelpfully.

**The One Rule:** Slop cannot die. No matter how much he wants to. He persists. This is the thesis of the game made mechanical.

---

## Core Loop

**Structure:** Zelda 1 skeleton. Slop enters a zone to the north, acquires his core ability, then explores surrounding areas that radiate outward. The first minute of gameplay:

1. Slop appears in the starting location — sparse, beige, quiet
2. He moves north (floaty, jerky)
3. He enters a structure and receives his core ability from someone/something
4. He returns to the overworld with slightly more agency
5. He starts collecting coins and wondering why

**Primary Goal:** Survive, explore, collect — and gradually figure out *why* you are doing any of it.

**Primary Resource: Coins**
- Starting capacity: 3
- If a 4th coin is picked up, one is dropped 1 second later
- Coins are lost on failure; Slop teleports back to the starting location
- Failure is annoying, not devastating — a tax, not a punishment

**Meta-Progression (persistent across sessions):**

| Purchase | Cost | Effect |
|---|---|---|
| Small Purse | 10 coins | Increases capacity |
| New Eyes | 8 coins | Reveals more of the world |
| Large Purse | 8 coins | Hold up to 50 coins |
| *(continues…)* | | |

Purchased from the same entity that gives Slop his initial power. The merchant and the mentor are the same. This feels right for this world.

---

## What We Don't Know Yet

- Slop's core ability (the sword equivalent)
- Minigames — count, tone, structure, discovery
- Named NPCs and whether they have arcs
- Whether the game has an ending, and what winning looks like for a generated art character
- Where ads live and whether Slop notices them
- Scope of MVP

*Questions 21–40 will fill these sections.*

---

## Open Design Questions

- [ ] Decide Slop's core ability
- [ ] Answer questions 21–40 (minigames, narrative, AI generation angle, scope, monetization)
- [ ] Determine if other AI-generated characters exist and whether they're self-aware
