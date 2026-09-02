# zombie

A headless client that plays the game badly, on purpose, and writes down what broke.

It drives a real Chromium against a real production build. The key-mashing is the
cheap part — the value is that it reads the game's own state through
`window.__SLOP_GAME__` on every tick, so it can tell *playing* apart from *stuck*
and check rules that a human playtester would need hours of replaying to trip.

```bash
npm run zombie -- --sweep            # best coverage per minute — start here
npm run zombie                       # 3 sessions x 90s from the menu
npm run zombie -- --scene Ch3BossScene --state full --duration 120
npm run zombie -- --headed --duration 30      # watch one play
npm run zombie -- --help
```

First time only: `npx playwright install chromium`.

Exits non-zero when anything is found, so it can gate CI.

## Reading the output

Every run writes a directory under `reports/<timestamp>/` (gitignored):

| file | what it is |
|---|---|
| `summary.txt` | ~15 lines. **Read this one.** On a clean run it is the whole story. |
| `report.md` | Per-finding detail: repro seed, scene, screenshot, and a scene-dwell table. |
| `findings.json` | The same thing structured, for scripting. |
| `*.png` | A screenshot captured at the moment of each finding. |

The console prints `summary.txt` and nothing else, so the normal loop is: run it,
read the summary, and only open `report.md` when something is actually there.

## Why `--sweep` is the important mode

Random input will never type `exist` at the dungeon gate, never win the archive's
typing minigame, and never beat a boss. Mashing from the menu therefore explores
the first two rooms and stops — real, but shallow.

`--sweep` instead drops the client directly into each major scene with a
plausible save state and gives each one a short burst. One sweep touches the
whole game; a menu run tests the one path a sweep can't fake, which is the actual
front door.

## What it looks for

**Runtime errors.** Uncaught exceptions, unhandled rejections, and console
errors, attributed to whatever scene was active.

**Soft-locks, split into two signals.** It fingerprints the active scene, every
progression flag, and live fight state (health, meter, phase). When that stops
moving for `--stall` seconds under continuous input, what it reports depends on
whether the player is still walking around:

- `soft-lock` — nothing moved at all: no scene, no state, no position. The room
  is not responding. This is the shape of the bug where losing to The Render
  left the player in a room whose only exit was decorative. **Treat as a bug.**
- `no-exit-found` — the player moved freely but nothing changed. Usually just
  random input failing to find the door, which is normal and not breakage. It is
  reported anyway because a room a mindless player can't leave in half a minute
  is a candidate for clearer signposting. **Treat as polish input, not a defect.**

`--stall` is clamped to 60% of `--duration`, since a stall window as long as the
run itself can never trip.

**Cold-start integrity.** Unless `--resume`, each session gets its own browser
context, has `slop_save` and `slop_visited` wiped before any page script runs,
and types `new game` on the way in. It then checks that the new game actually
*began* new — any progression flag already set is reported. That is the shape of
the bug where a fresh start came up with the dungeon pre-cleared.

**Progression invariants.** These encode the rules the game's own advancement
depends on, so violating one means a player can be permanently stranded:

| invariant | why it strands the player |
|---|---|
| `dungeonCleared` ⇒ `hasDash` | The Render grants the dash; without it the east chasm is uncrossable. |
| `eastDungeonCleared` ⇒ `hasCorrupt` | The Pixel grants CORRUPT; without it the west barrier can't be breached. |
| east progress ⇒ `hasEyes` | The world's side walls only open with Eyes. |
| `coinCount` ≤ `maxCoins` + 1 | One coin of grace for the drop animation; more means the cap leaked. |
| no negative or `NaN` counters | — |

Adding one is a few lines in `INVARIANTS` at the top of `zombie.mjs`.

## Honest limits

A clean run is **weak evidence, not proof.** Random input explores shallowly, so
read it as "nothing obvious broke on the paths it happened to walk" and check the
scene-dwell table in `report.md` to see how far that actually was. It cannot
judge whether the game is *fun*, whether a fight is balanced, or whether text
renders legibly — it only catches crashes, stalls, and broken state rules.

It also can't beat anything on purpose. Where a scene needs a real win to
progress, use `--scene` to start on the far side of it.
