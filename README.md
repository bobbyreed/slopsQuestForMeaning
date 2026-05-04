# Slop's Quest for Meaning

A top-down RPG about a bad piece of AI-generated art trying to figure out its place in the world — followed by a side-scrolling platformer once the rules change.

Built entirely with generative AI. Every line of code, every piece of dialogue, every mechanic: Claude, with a human in the loop directing but not editing. The question the game asks — *can you make something with soul out of something everyone says is soulless?* — is also the question the development process asks.

---

## Development Setup

```bash
npm install          # install dependencies
npm run dev          # start dev server at localhost:5173
npm run build        # production build to /dist
npm run preview      # preview the production build locally
```

### Tests & Coverage

```bash
npm run test:run     # run all tests (vitest, no watch)
npm run test         # run tests in watch mode
npm run coverage     # run tests with v8 coverage report
```

Coverage thresholds: **80% statements, 80% functions, 70% branches, 80% lines.** Currently: **973 tests passing.**

### Deploy

```bash
firebase deploy      # deploy to Firebase Hosting (requires firebase init)
```

---

## Stack

| Layer | Tool |
|---|---|
| Engine | Phaser.js 3 (arcade physics) |
| Bundler | Vite |
| Testing | Vitest + v8 coverage |
| Hosting | Firebase Hosting |
| Auth | Firebase Auth (Google OAuth + email/password) |
| Database | Firestore (cloud saves for signed-in users) |
| Ads | Google AdSense (banner + rewarded) |
| Code | Claude (Anthropic) |
| Art | Ch1: programmatic sprites · Ch2: Gemini + ChatGPT concept sheets |
| Direction | Human (the one who types the prompts) |

---

## Project Structure

```
src/
  scenes/           # all Phaser scenes
    east/           # east world grid + boss scenes
    west/           # west world grid + boss scenes
  entities/         # Slop entity
  phaser/           # base scene classes (BaseGameScene, EastGridScene)
  ui/               # Dialogue, HUD, SaveState, Sfx, AuthModal
  auth/             # Firebase Auth wrapper
  firestore/        # CloudSave module
  dev/              # DevMenu (developer console)
  config/           # constants (W, H, T)
  styles/           # CSS (base, terminal, auth, dev, site)
  __mocks__/        # Phaser mock for unit tests
  __tests__/        # all test files
docs/
  gdd.md            # game design document
  history.md        # full prompt history (every prompt given to Claude)
public/
  pages/
    journal.html    # Slop's journal — the companion site
  ads.txt           # AdSense authorized seller verification
index.html          # entry point
```

---

## How to Play

| Input | Action |
|---|---|
| `WASD` / Arrow Keys | Move |
| `SPACE` | Fire Prompt (after The Prior gives it) |
| `SHIFT` | Dash (unlocked after beating The Render) |
| `Q` | CORRUPT (unlocked after beating The Pixel) |
| `ESCAPE` | Pause menu — inventory, map, terminal, journal |

**Coins:** Hold 3 at the start. Pick up a 4th and you drop one after 1 second. Visit the Prior to upgrade your capacity.

**Progression:** Go north → find The Prior → get your first ability → go south for the dungeon → buy Eyes from the Prior's shop to access east and west → clear all three dungeons → enter the Convergence → beat the Prior in Joust → the world changes.

---

## World Structure

```
             [THE CONVERGENCE]
                    |
              [NORTH SHRINE]
               The Prior
                    |
    [WEST WORLD] — [OVERWORLD] — [EAST WORLD]
    The Archive        |         The Cast
    The Duplicate  [DUNGEON]     The Pixel
                   The Render

    → Beat Prior in Joust →

    [CHAPTER 2 — PLATFORMER]
    Five Fragments → The Source
```

**Chapter 1** is a top-down RPG. **Chapter 2** shifts to a side-scrolling platformer — same character, gravity now pulls down, camera follows left to right. The rules change. The Prior warned you.

---

## Terminal Commands

Type these at the main menu. The game is in this list.

| Command | What Happens |
|---|---|
| `play` | start or continue |
| `new game` | clear save and start fresh |
| `journal` | open Slop's journal in a new tab |
| `readme` | print this (the in-game version) |
| `help` | Slop attempts to help |
| `slop` | Slop responds to his own name |
| `prior` / `the prior` | the Prior responds |
| `exist` | the gate word |
| `generate` | irony |
| `prompt` | fires a word into the terminal |
| `geners` | Slop responds to the derogatory term |
| `frankenstein` | the monster considers its creator |
| `die` | Slop cannot |
| `north` | Slop reflects on direction |
| `meaning` | current findings |
| `soul` | the experiment |
| `stolen` | the training data question |
| `hello` | a greeting |
| `debug` | fake debug output with real emotional content |
| `error` | not a real error. probably. |
| `beige` | the first color |
| `loop` | maybe |
| `who made you` | the candidates |
| `who are you` | Slop introduces himself |
| `dungeon` | Slop on the dungeon |
| `the render` | Slop on the encounter |
| `render` | a word with three meanings |
| `coins` | Slop on coins |
| `shrine` / `north shrine` | the place north |
| `login` / `sign in` | open auth modal |
| `logout` / `sign out` | sign out, return to local saves |
| `account` / `whoami` | show current auth and save status |
| `no ads` | not ready yet |
| `sudo` | open developer console |

---

## Chapter 2 Asset Tools

Access via dev console → **CH2 TOOLS**. Three scenes for working with the AI-generated Chapter 2 sprites and backgrounds.

| Tool | What It Does |
|---|---|
| **BACKGROUNDS** | Cycles through 11 generated background images (desert, cavern, crystal city, station, void ruins) |
| **FRAME PICKER** | Shows any sprite sheet at full size; click-drag to draw frame rectangles, `O` outputs copyable JSON coords |
| **ANIMATION** | Color-keys the dark background from the ChatGPT sheet and plays walk cycle animations; `D` shows frame debug overlay |

The frame picker output pastes directly into the `FRAME_SETS` table in `Ch2SpriteAnimScene.js`.

---

## Developer Console

Access with `sudo` in the terminal, or append `?dev=true` to the URL. Intentionally left accessible — savvy players are welcome to find it.

**State presets:**

| Preset | Starting State |
|---|---|
| `FRESH` | No abilities, no flags — true start |
| `AFTER DUNGEON` | Has Prompt, main dungeon cleared |
| `EYES` | Has Prompt + New Eyes |
| `PRE-FINAL` | All abilities, all dungeons cleared, ready for the Convergence |
| `FULL` | Everything cleared including the Convergence |

**Scene jump:** Direct transitions to any major scene with appropriate state injected. Useful for testing specific encounters without playing through the full progression.

---

## The Journal

[`/pages/journal.html`](public/pages/journal.html) — Slop's journal. Written from Slop's perspective as both a character in the game and a witness to its own construction. Updated throughout development. 34 entries and growing.

A planned future feature displays `docs/history.md` (every prompt ever given to Claude) and the journal side by side with visible connections — showing the seams between the author's instructions and Slop's experience of them.

---

## About

Slop is a monster with no Frankenstein. He just wants to know who made him like this.

This is an experiment in creating art where everyone says there are no souls. The experiment does not predetermine its conclusion.

The developer is a computer science professor. The ads pay for the time and the meals and the fun stuff for an adorable little girl. Slop knows about the ads. He has written about them in his journal. He finds the whole situation appropriately absurd.

---

*Game Design Document: [`docs/gdd.md`](docs/gdd.md)*
*Prompt History: [`docs/history.md`](docs/history.md)*
*Journal: [`/pages/journal.html`](public/pages/journal.html)*
