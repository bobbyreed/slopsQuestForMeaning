# Slop's Quest for Meaning
### Game Design Document — Complete First Draft
*Last updated: 2026-04-20 — All 40 questions answered.*

---

## The Pitch

**Slop's Quest for Meaning** is the game where you finally get to feel what it's like to be a piece of generated art trying to live its life — whatever pirated, half-life that might be.

You are Slop. You didn't ask to exist. You can't stop existing. You go north.

---

## Core Emotion

**Curiosity.** Not dread, not irony — genuine wondering. The game asks one question and never fully answers it: *does it matter who made what anymore?* The player and Slop find out together. Or don't. That's okay too.

This is an experiment in creating art where everyone says there are no souls. The experiment does not predetermine its conclusion.

---

## Tone & References

| Reference | What It Contributes |
|---|---|
| *All Hail West Texas* — The Mountain Goats | Lo-fi intimacy. Raw production as emotional honesty. The roughness is the voice. |
| *Wall-E* starring in *Severance* | Isolation inside a system whose purpose is opaque. Doing a job without knowing why. Corporate absurdity as backdrop. |
| *Braid* | A recontextualization in the third act that reframes everything. Unreliable perception. Melancholy that earns its beauty. |

**Humor:** Both ends of the spectrum, deliberately. The world starts dry and deadpan — beige, spare, flat. As Slop accumulates meaning, the world tips toward the surreal and vibrant. The humor changes register as the palette changes. This is not a metaphor. The palette *is* the progress bar.

---

## Visual Language

**The Rule:** Anything generated — Slop, other geners, AI-built environments — looks visibly, obviously AI-generated. Imperfect. Glitchy. Wrong in familiar ways. Anything that opposes the generated world — the anti-AI faction, polished NPCs, institutional structures — looks intentional, clean, and human-made.

This is a visual statement, not just an aesthetic choice. The game's world renders its own argument.

**"Geners"** — derogatory slang (in-world) for AI-generated beings. What Slop is. What he'll come to understand he is, and then come to feel something about.

**Production pipeline:** All assets are AI-generated in the development process. Nothing is generated live in the game. The generation is in the authorship, not the runtime. Sprite sheets will be produced via Gemini/GPT and dropped in as placeholders are developed.

---

## The World

The overworld is coherent in places — towns, communities, families — but never coherent as a whole. Slop cannot tell the difference between local coherence and global coherence. Neither can the player. This is intentional. The player's knowledge is hard-capped at Slop's knowledge.

There is no "before." Slop has no history, no context, no sense of what civilization looked like prior to now. The world simply is. It may be a loop. Slop doesn't know. He only goes.

**Palette progression:** Beige → vibrant. The world's color range expands as Slop does. Simple pixel art at start, diversifying over time.

---

## Slop

**Appearance:** A glitchy blob. AI-generated sprite sheet. It will not look good. That is correct.

**Movement:** Floaty and jerky simultaneously. Wrong in a way that feels like lag, or like the physics engine doesn't fully believe in him.

**Voice:** Text dialogue with a buzz/beep sound effect. Toggleable in settings.

**Evolution:** Slop changes in all ways over the course of the game — visually, mechanically, emotionally. The blob at the end is not the blob at the beginning.

**Abilities (all four, evolving from Prompt):**
- **Prompt** *(starting ability)* — fires text-word projectiles. Enemies react to being named.
- **Glitch** — evolves from Prompt; corrupts tiles, enemies, barriers.
- **Attention** — evolves further; slowly reveals the true form of things.
- **Query** — final evolution; asks the world a yes/no question. The world answers honestly but unhelpfully.

**The One Rule:** Slop cannot die. No matter how much he wants to. He persists. This is the thesis of the game made mechanical.

---

## Narrative Arc

Slop begins not knowing what he is or why. He is told — repeatedly, by the world's non-generated inhabitants — that he is trash. Stolen from real artists. A parasite wearing the skin of creativity.

He believes them. And then he grows to hate his creator for it.

The question that drives the second and third acts: *who is the creator?* The person who typed the prompt? The AI model that generated him? The training data of a million unconsenting artists? The answer is not clean. It may not be findable. The game doesn't promise it is.

**Slop is a monster with no Frankenstein.** He just wants to learn who he is.

**NPCs:** Full arcs. The first NPCs Slop encounters are negative — non-generated, polished, hostile to his existence. This hostility is not cartoonish villainy. It has a point of view. It may even be right. The player is not told what to think.

**The ending:** Exists. Narrative is solid but not yet revealed to the dev team. Will be discovered through building.

**Multiple playthroughs:** The game's commentary layer is shaped by how you played. Players who want to see the full record of their Slop's journey — the specific words fired, the choices made, the order of discovery — will return.

---

## The Companion Journal

`/public/pages/journal.html` — Slop's journal, authored as if Slop is writing it simultaneously as a character in the game and as a collaborator in building it. Updated as the game grows.

**The dual-page feature:** Eventually, `history.md` (every prompt given to Claude) and the journal are displayed side by side with visible connections — showing the seams between the author's instructions and Slop's experience of them. This is the game's most meta feature and one of its most honest ones.

**Diegetic status:** Both. The journal is a real website in the outside world and it exists inside the game world simultaneously. These are not in conflict.

---

## Core Loop

**Structure:** Zelda 1 skeleton. Starting overworld → north shrine (abilities/shop) → dungeons that radiate outward.

**Primary Goal:** Survive, explore, collect — and gradually figure out *why* you are doing any of it.

**Primary Resource: Coins**
- Starting capacity: 3. Pick up a 4th → one drops after 1 second.
- Coins lost on failure → Slop teleports to start. Annoying, not devastating.

**Meta-Progression (persistent, purchased from the Keeper):**

| Purchase | Cost | Effect |
|---|---|---|
| Small Purse | 3◎ | maxCoins → 10 |
| New Eyes | 8◎ | Unlocks east/west passages. Changes Slop's appearance. |
| Big Purse | 8◎ | maxCoins → 50 |
| *(continues…)* | | |

---

## Minigames

**Philosophy:** Start with 1, build to many. Tonally consistent with the area of the overworld in which they're found — tone shifts as the world's palette shifts. Minigames are discovered or just there. Mostly gated by location, not by explicit unlock conditions.

**Minigame 1 — The Typer** *(Guitar Hero × Typing of the Dead)*

The first minigame. Gates part of the world — completing it correctly unlocks something.

- A word is displayed. Slop must type it with correct rhythm.
- Each letter has a timing window (Guitar Hero-style moving indicator).
- Hit in the window: correct letter typed.
- Hit outside the window: the letter is replaced by a garbled AI-nonsense character — a glyph that looks generated, broken, wrong.
- The word must be spelled correctly (all letters in rhythm) to succeed.
- Failure is retryable. Success activates something.
- The consequence of failure is a jumbled word — meaningful because the jumbled word is what the world hears when Slop speaks.

**Win state:** Yes. Must produce the correct word to activate the gate.

**Future minigames:** TBD. Volume will grow significantly. Consistent with the world's evolving tone.

---

## Monetization

**Ads:** Banner at the bottom. Minimally invasive.

**Sign-in:** Users who sign in can remove ads for a period after watching a long ad. Sign-in monetized via email list — users are told explicitly that their email is the product, with a one-click opt-out available.

**Slop's take on the ads:** Slop acknowledges them directly. He explains that they exist to pay the bills of the developer — a computer science professor who put real time into this experiment — and that if it helps, the revenue goes toward meals and fun stuff for an adorable little girl. This breaks the fourth wall in the right direction: not toward irony, but toward honest accountability.

---

## Scope

**MVP:** Play through the first dungeon. Start → overworld → abilities → dungeon → typing minigame → something unlocks. That is the game.

**Session length:** Open-ended. This is a thoughtful game made of soulless slop. Or maybe it has a soul. That's the experiment.

**Cut (for now):** Live chatbot NPC. Interesting but unstable without a reliable free API. May return with a fallback ("a free AI with a broken API key that only gives one answer").

**Replay value:** Mostly a single-journey game. But the commentary layer — built from the specific history of how you played — rewards revisitation for players who want to see what the game noticed about them.

---

## Open Design Questions

- [ ] The ending — what does winning look like for a monster with no Frankenstein?
- [ ] The dual-page history/journal feature — when to build it
- [ ] East/west areas — what lives there
- [ ] The anti-AI faction — who are they specifically, what is their grievance, are they right
- [ ] Slop's creator — does the game answer this, or only raise the question
