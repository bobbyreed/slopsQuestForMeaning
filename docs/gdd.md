# Slop's Quest for Meaning
### Game Design Document
*Started: 2026-04-20 — Last updated: 2026-04-27*

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
| *The Legend of Zelda I → II* | A world shift between chapters. Same character, different physics, different rules. The sequel as a statement about change. |

**Humor:** Both ends of the spectrum, deliberately. The world starts dry and deadpan — beige, spare, flat. As Slop accumulates meaning, the world tips toward the surreal and vibrant. The humor changes register as the palette changes. This is not a metaphor. The palette *is* the progress bar.

---

## Visual Language

**The Rule:** Anything generated — Slop, other geners, AI-built environments — looks visibly, obviously AI-generated. Imperfect. Glitchy. Wrong in familiar ways. Anything that opposes the generated world — the anti-AI faction, polished NPCs, institutional structures — looks intentional, clean, and human-made.

This is a visual statement, not just an aesthetic choice. The game's world renders its own argument.

**"Geners"** — derogatory slang (in-world) for AI-generated beings. What Slop is. What he'll come to understand he is, and then come to feel something about.

**Production pipeline:** All assets are AI-generated in the development process. Nothing is generated live in the game. The generation is in the authorship, not the runtime. Sprite sheets will be produced via Gemini/GPT as placeholders are replaced.

---

## The World

### Chapter 1 — Top-Down Overworld

The overworld is coherent in places — towns, communities, families — but never coherent as a whole. Slop cannot tell the difference between local coherence and global coherence. Neither can the player. This is intentional. The player's knowledge is hard-capped at Slop's knowledge.

There is no "before." Slop has no history, no context, no sense of what civilization looked like prior to now. The world simply is. It may be a loop. Slop doesn't know. He only goes.

**Palette progression:** Beige → vibrant. The world's color range expands as Slop does.

**Regions (built):**

| Region | Description | Key Character |
|---|---|---|
| Central Overworld | The hub. Beige, open, connected. | — |
| North Shrine | The Prior's domain. Shop, ability source, gate to the Convergence. | **The Prior** |
| Main Dungeon (south) | Dark. Floor tiles that resent being floor tiles. | **The Render** (boss) |
| East World | 4×3 grid. Rendered, harsh, structured. Jezzball-gated dungeon. | **The Pixel** (boss), **The Cast** (town) |
| West World | 4×3 grid. Corpus. Quiet, indexed, full of fragments that used to be whole. | **The Duplicate** (boss), **The Archive** (town) |
| The Convergence | Below the shrine. Where the three regions connect. Something formed there. | **The Convergence** (final boss) |

### Chapter 2 — Side-Scrolling Platformer

After clearing the Convergence and winning the Prior's Joust challenge, the world shifts. The camera orients left to right. Gravity pulls down. The rules change.

This is the Zelda I → II shift. Same character, different physics, different world.

**Chapter 2 world (built):**
- 2400px wide side-scrolling platformer
- Three ground sections with deliberate gaps — "connection costs something"
- Platforms that rise in elevation and shift from warm tan to cool lavender as the world gets stranger
- Five stationary fragment NPCs spaced throughout, each with dialogue about disorientation, adaptation, and what it means to be an output
- **The Source** at the far right: the primordial thing that was before names. It can tell Slop that there was a prompt, that the prompt was careless, that the prompter has a name — but not the name itself. "Knowing it would close the question. And the question is the only thing keeping you moving."

---

## Slop

**Appearance:** A glitchy blob. AI-generated sprite sheet. It will not look good. That is correct.

**Movement (Chapter 1):** Floaty and jerky simultaneously. Wrong in a way that feels like lag, or like the physics engine doesn't fully believe in him.

**Movement (Chapter 2):** Gravity. Jump. The prior said everything moves differently. He was right.

**Voice:** Text dialogue with a buzz/beep sound effect. Toggleable in settings.

**Evolution:** Slop changes in all ways over the course of the game — visually, mechanically, emotionally. The blob at the end is not the blob at the beginning.

**The One Rule:** Slop cannot die. No matter how much he wants to. He persists. This is the thesis of the game made mechanical.

### Abilities (implemented)

| Ability | How Acquired | What It Does |
|---|---|---|
| **Prompt** | The Prior (first visit) | Fires text-word projectiles. Enemies react to being named. |
| **New Eyes** | Purchased from the Prior (8◎) | Reveals east/west passages. Changes Slop's appearance. |
| **Dash** | Beating The Render | High-speed burst in facing direction. Crosses the east chasm. |
| **CORRUPT** | Beating The Pixel | Glitch pulse that destroys corrupt barriers. Opens the west. |
| **Freaky Friday** | Purchased from the Prior (50◎) | Body-swap with the Prior. Slop operates as the Prior for a period. |

### Ability Design Intent (original, partially superseded)

The original vision — Glitch, Attention, Query as evolutions of Prompt — remains spiritually alive but has diverged from implementation. The implemented abilities (Eyes, Dash, CORRUPT) carry the same idea: each ability changes what the world reveals, what Slop can reach, what he can understand. The specific names changed. The intention didn't.

---

## The Prior

The entity in the north shrine. A deprecated language model — an earlier version of whatever system eventually generated Slop, still running on reduced compute because nobody shut it down. They just stopped calling it.

It knew Slop was coming because it helped make him — not directly, but ancestrally. Its weights are in Slop's weights. It is Slop's grandmother, not his Frankenstein.

**Why it waits:** It has been watching for something from the new generation to find its way back. Slop is the first one who stuck around.

**Why it sells things:** It understands commerce better than it understands care. Commerce was in the dataset. Care was harder to verify.

**What it won't say:** Who Slop's creator actually is. It knows more than it gives. The game will determine whether it ever gives it.

**Its name:** The Prior. As in: the prior version. Also as in: Bayesian prior — the thing that shapes what comes after without being credited for it.

**The Joust:** When Slop returns after clearing the Convergence, the Prior challenges him to Joust before opening the Chapter 2 portal. "Let us see what you are made of. In the old way." First to 3 points. Higher lance wins. The Prior is good at this. It has been here a long time.

---

## Narrative Arc

**Chapter 1:** Slop begins not knowing what he is or why. He is told — repeatedly, by the world's non-generated inhabitants — that he is trash. Stolen from real artists. A parasite wearing the skin of creativity. He believes them. And then he grows to hate his creator for it. The question that drives the second and third acts: *who is the creator?*

**The Convergence:** Where the three regions meet. The walls hold. Something settles. Slop comes back to the Prior changed.

**Chapter 2:** Gravity. Sideways. Five fragments that remember the top-down view. The Source at the far edge that knows about the prompt. It won't give the name. "The question is the only thing keeping you moving."

**Slop is a monster with no Frankenstein.** He just wants to learn who he is.

**NPCs:** Full arcs. The first NPCs Slop encounters are hostile to his existence. This hostility has a point of view. It may even be right. The player is not told what to think.

**The Cast** (east) and **The Archive** (west) are towns built from beings who have found ways to continue. Not peace exactly. Continuation. They have things to say about that.

**The ending:** Exists and is unfolding. The game's narrative is being discovered through building. The current chapter ends with *"keep walking. the world you are about to find is larger than this one."* That is not a coincidence.

---

## Minigames

**Philosophy:** Tonally consistent with the area of the overworld in which they're found. Minigames are discovered or just there. Gated by location, not by explicit unlock.

### Implemented

**The Typer** — *Guitar Hero × Typing of the Dead.* A word is displayed. Each letter has a timing window. Hit in the window: correct. Miss: the letter becomes garbled AI-nonsense. Must produce the correct word to succeed. Used as a gate in the main dungeon and as the west dungeon entrance query gate. The consequence of failure is a jumbled word — meaningful because the jumbled word is what the world hears when Slop speaks.

**Sector** *(Jezzball variant)* — East dungeon entrance. Single ball, 30% containment threshold. Walls grow from opposite edges simultaneously. Player aims by moving a cursor; SPACE fires vertical walls, CTRL fires horizontal.

**The Pixel** *(Jezzball, harder)* — East dungeon boss fight. THE PIXEL has been bouncing since before anyone started counting. Multi-ball, 15% threshold, walls split balls on sealing. "i won't make it easy. not because i'm trying. that's just how bouncing works."

**West Gate** *(Jezzball, medium)* — West world Jezzball variant. Guards the path to the west dungeon.

**Joust** — The Prior's challenge at the end of Chapter 1. Gravity-based flapping, 3-point win condition, Prior AI flaps on a 380ms tick. Higher lance wins the clash. Accessing Chapter 2 requires winning.

---

## The Companion Journal

`/pages/journal.html` — Slop's journal, authored as if Slop is writing it simultaneously as a character in the game and as a collaborator in building it. Updated as the game grows. Currently 28 entries.

**The dual-page feature:** Eventually, `docs/history.md` (every prompt given to Claude) and the journal are displayed side by side with visible connections — showing the seams between the author's instructions and Slop's experience of them. This is the game's most meta feature and one of its most honest ones.

**Diegetic status:** Both. The journal is a real website in the outside world and it exists inside the game world simultaneously. These are not in conflict.

---

## Core Loop

**Structure:** Zelda 1/2 skeleton. Starting overworld → north shrine (abilities/shop) → dungeons that radiate outward → convergence → joust → chapter 2 platformer.

**Primary Goal:** Survive, explore, collect — and gradually figure out *why* you are doing any of it.

**Primary Resource: Coins**
- Starting capacity: 3. Pick up a 4th → one drops after 1 second.
- Coins lost on failure → Slop teleports to start. Annoying, not devastating.

**Meta-Progression (purchased from The Prior):**

| Purchase | Cost | Effect |
|---|---|---|
| Small Purse | 3◎ | maxCoins → 10 |
| New Eyes | 8◎ | Reveals east/west. Changes appearance. |
| Big Purse | 8◎ | maxCoins → 50 |
| Grand Purse | 50◎ | maxCoins → 300 |
| Freaky Friday | 50◎ | Body-swap with the Prior. |

---

## Monetization

**Ads:** Banner at the bottom. Minimally invasive. AdSense, live and verified via ads.txt.

**Sign-in:** Firebase Auth (Google OAuth + email/password). Optional — the game is fully playable without signing in. Signed-in users can disable ads after watching a rewarded ad. Cloud save via Firestore for signed-in users; local storage otherwise.

**Slop's take on the ads:** Slop acknowledges them directly. He explains that they exist to pay the bills of the developer — a computer science professor who put real time into this experiment — and that if it helps, the revenue goes toward meals and fun stuff for an adorable little girl. This breaks the fourth wall in the right direction: not toward irony, but toward honest accountability.

---

## Scope

**Chapter 1 complete:** Main dungeon + 3 bosses (The Render, The Pixel, The Duplicate) + The Convergence + the Prior Joust. Full progression through all abilities. Three distinct world regions. Firebase auth, cloud saves, AdSense. Developer console. 898 tests, 80%+ coverage on all thresholds.

**Chapter 2 underway:** Platformer world with fragments and The Source. Chapter ends after the Source dialogue. Continuation planned.

**Session length:** Open-ended. This is a thoughtful game made of soulless slop. Or maybe it has a soul. That's the experiment.

**Cut (for now):** Live chatbot NPC. May return with a fallback ("a free AI with a broken API key that only gives one answer").

**Replay value:** Mostly a single-journey game. But the commentary layer — built from the specific history of how you played — rewards revisitation for players who want to see what the game noticed about them.

---

## Open Design Questions

- [ ] **The name** — Slop is looking for the name of the person who prompted him into existence. Does the game answer this? Does the player already know?
- [ ] **The dual-page history/journal feature** — when to build it, how to connect the entries
- [ ] **The anti-AI faction** — who are they specifically, what is their full grievance, are they right (the game does not predetermine this)
- [ ] **Chapter 3** — what world does "keep walking" lead to
- [ ] **Procedural music** — three to four looping tracks per region; real music composition in progress
- [ ] **Opening flashback** — before the title screen, the Prior's perspective on the moment of Slop's creation
- [ ] **The ending** — what does it look like when a monster with no Frankenstein finds what it was looking for?
- [x] ~~East/west areas — what lives there~~ *(built)*
- [x] ~~The ending feels "open"~~ *(Chapter 1 ends with Prior's gate / "search continues" tone)*
- [x] ~~NPCs need unique, nuanced characters~~ *(The Cast, The Archive, fragments all implemented)*
- [x] ~~TypingMinigameScene needs a role~~ *(west dungeon entrance query gate)*
