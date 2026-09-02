#!/usr/bin/env node
//
// zombie — a headless client that plays Slop's Quest badly, on purpose.
//
// It mashes keys at a real Chromium running the real build. The mashing is the
// cheap part; the value is that it reads the game's own state through
// window.__SLOP_GAME__ every tick, so it can tell "playing" apart from "stuck"
// and check invariants that a human playtester would need hours to trip.
//
// Usage:
//   npm run zombie                        -- 3 sessions x 90s from the menu
//   npm run zombie -- --sessions 8 --duration 180
//   npm run zombie -- --scene Ch3BossScene --state full
//   npm run zombie -- --headed --duration 30      (watch one play)
//
// Exits non-zero if anything was found, so it can gate CI.

import { chromium } from 'playwright'
import { spawn } from 'node:child_process'
import { mkdir, writeFile } from 'node:fs/promises'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..')

// ── Keys the game actually listens for ───────────────────────────────────────
// Weighted: movement dominates, because that is what a player mostly does and
// what gets you into the situations where the rare keys matter.
const KEYS = [
  ['ArrowLeft', 12], ['ArrowRight', 12], ['ArrowUp', 12], ['ArrowDown', 12],
  ['KeyW', 6], ['KeyA', 6], ['KeyS', 6], ['KeyD', 6],
  ['Space', 10],           // prompt / jump / advance dialogue / super
  ['Enter', 6],            // advance dialogue / pause menu
  ['KeyJ', 5], ['KeyK', 5],// ch3 melee
  ['KeyE', 4],             // interact / take the pen
  ['KeyQ', 4],             // corrupt / leave the pen
  ['ShiftLeft', 3],        // dash
  ['Escape', 2],           // close things
]
const KEY_BAG = KEYS.flatMap(([k, w]) => Array(w).fill(k))

// Non-movement keys, used on top of the walking intents.
const ACTION_BAG = [
  'Space', 'Space', 'Space', 'Space',   // prompt / jump / advance / super
  'Enter', 'Enter',                     // advance dialogue (also opens pause)
  'KeyJ', 'KeyJ', 'KeyK', 'KeyK',       // ch3 melee
  'KeyE', 'KeyQ',                       // interact / corrupt / the pen choice
  'ShiftLeft',                          // dash
  'KeyW', 'KeyA', 'KeyS', 'KeyD',       // the other movement scheme
]

// Keys worth holding rather than tapping — block, dash-run, sustained walking.
const HOLDABLE = new Set(['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown',
  'KeyW', 'KeyA', 'KeyS', 'KeyD', 'ShiftLeft'])

// ── Invariants ───────────────────────────────────────────────────────────────
// Each takes a sampled state and returns a string (the finding) or null.
// These are the rules the game's own progression depends on; every one of them
// corresponds to a way the player can be stranded.
const INVARIANTS = [
  {
    id: 'cleared-without-dash',
    check: s => s.dungeonCleared && !s.hasDash
      ? 'dungeonCleared is set but hasDash is not — the Render was skipped or gave nothing, so the east chasm can never be crossed'
      : null,
  },
  {
    id: 'east-cleared-without-corrupt',
    check: s => s.eastDungeonCleared && !s.hasCorrupt
      ? 'eastDungeonCleared is set but hasCorrupt is not — the Pixel gave nothing, so the west barrier can never be breached'
      : null,
  },
  {
    id: 'east-progress-without-eyes',
    check: s => (s.sectorCleared || s.eastDungeonCleared) && !s.hasEyes
      ? 'east progression recorded without hasEyes — the world walls that gate the east were never opened'
      : null,
  },
  {
    id: 'coins-over-cap',
    check: s => typeof s.coinCount === 'number' && typeof s.maxCoins === 'number'
      && s.coinCount > s.maxCoins + 1
      ? `coinCount ${s.coinCount} exceeds maxCoins ${s.maxCoins} by more than the one-coin drop grace`
      : null,
  },
  {
    id: 'negative-or-nan',
    check: s => {
      for (const k of ['coinCount', 'maxCoins']) {
        const v = s[k]
        if (typeof v === 'number' && (Number.isNaN(v) || v < 0)) return `${k} is ${v}`
      }
      return null
    },
  },
]

// Progression a new game must not begin with.
const PROGRESS_FLAGS = [
  'hasPrompt', 'hasEyes', 'hasDash', 'hasCorrupt',
  'dungeonCleared', 'sectorCleared', 'eastDungeonCleared',
  'westBarrierDestroyed', 'westGateCleared', 'westDungeonCleared',
  'finalDungeonCleared', 'chapter2Unlocked', 'priorGateUnlocked', 'chapter3Complete',
]

// ── The page-side sampler ────────────────────────────────────────────────────
// Runs inside the browser. Reads the live scene and whatever Slop state it can
// find, and buffers errors that happen between samples.
const PAGE_HOOK = () => {
  window.__ZOMBIE__ = { errors: [] }
  const push = (kind, message) => {
    if (window.__ZOMBIE__.errors.length < 50) window.__ZOMBIE__.errors.push({ kind, message })
  }
  window.addEventListener('error', e => push('error', String(e.message || e.error)))
  window.addEventListener('unhandledrejection', e => push('rejection', String(e.reason)))

  window.__zombieSample = () => {
    const out = { scenes: [], state: null, errors: window.__ZOMBIE__.errors.splice(0) }
    const game = window.__SLOP_GAME__
    if (!game || !game.scene) return out
    let active = []
    try { active = game.scene.getScenes(true) } catch (_) { return out }
    out.scenes = active.map(s => s.sys?.settings?.key).filter(Boolean)

    // Prefer a live Slop entity; fall back to whatever slopState the scene holds.
    for (const s of active) {
      if (s.slop && typeof s.slop.getState === 'function') {
        try { out.state = s.slop.getState(); break } catch (_) { /* keep looking */ }
      }
    }
    if (!out.state) {
      for (const s of active) {
        if (s._slopState && typeof s._slopState === 'object') { out.state = { ...s._slopState }; break }
      }
    }
    // Chapter 3 tracks health outside the Slop entity.
    for (const s of active) {
      if (typeof s._hp === 'number') { out.hp = s._hp; break }
    }
    // Position, so a report can say whether the client was moving or just
    // standing in a room pressing buttons.
    for (const s of active) {
      const p = s.slop || s._player
      if (p && typeof p.x === 'number') { out.pos = [Math.round(p.x), Math.round(p.y)]; break }
    }
    return out
  }
}

// ── Small helpers ────────────────────────────────────────────────────────────

function mulberry32(seed) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6D2B79F5) >>> 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const sleep = ms => new Promise(r => setTimeout(r, ms))

function parseArgs(argv) {
  const a = {
    url: null, sessions: 3, duration: 90, seed: Date.now() % 100000,
    headed: false, scene: null, state: null, out: null, stall: 25, resume: false,
    sweep: false, quiet: false,
  }
  for (let i = 0; i < argv.length; i++) {
    const k = argv[i]
    const next = () => argv[++i]
    if (k === '--url') a.url = next()
    else if (k === '--sessions')  a.sessions = Number(next())
    else if (k === '--duration')  a.duration = Number(next())
    else if (k === '--seed')      a.seed = Number(next())
    else if (k === '--scene')     a.scene = next()
    else if (k === '--state')     a.state = next()
    else if (k === '--out')       a.out = next()
    else if (k === '--stall')     a.stall = Number(next())
    else if (k === '--headed')    a.headed = true
    else if (k === '--resume')    a.resume = true
    else if (k === '--sweep')     a.sweep = true
    else if (k === '--quiet')     a.quiet = true
    else if (k === '--help' || k === '-h') { a.help = true }
  }
  return a
}

const HELP = `
zombie — headless client that plays the game badly to shake out bugs

  --sessions N    how many independent playthroughs      (default 3)
  --duration S    seconds each session mashes            (default 90)
  --seed N        base seed; session k uses seed+k       (default: clock)
  --scene KEY     start in this scene instead of the menu
  --state PRESET  fresh | afterDungeon | eyes | preFinal | full  (with --scene)
  --stall S       seconds of no state change = soft-lock (default 25)
  --sweep         one short run in every major scene (best coverage per minute)
  --quiet         print only the summary line
  --resume        keep whatever save is there instead of starting fresh
  --url URL       test an already-running server instead of starting one
  --headed        show the browser
  --out DIR       report directory (default tools/zombie/reports/<stamp>)
`

// Presets mirror the dev console's, so --scene jumps land in a coherent world.
const PRESETS = {
  fresh:        {},
  afterDungeon: { hasPrompt: true, hasDash: true, dungeonCleared: true, maxCoins: 10, coinCount: 5 },
  eyes:         { hasPrompt: true, hasDash: true, hasEyes: true, dungeonCleared: true, maxCoins: 10, coinCount: 5 },
  preFinal:     { hasPrompt: true, hasDash: true, hasEyes: true, hasCorrupt: true, dungeonCleared: true,
                  sectorCleared: true, eastDungeonCleared: true, westBarrierDestroyed: true,
                  westGateCleared: true, westDungeonCleared: true, maxCoins: 50, coinCount: 20 },
  full:         { hasPrompt: true, hasDash: true, hasEyes: true, hasCorrupt: true, dungeonCleared: true,
                  sectorCleared: true, eastDungeonCleared: true, westBarrierDestroyed: true,
                  westGateCleared: true, westDungeonCleared: true, finalDungeonCleared: true,
                  chapter2Unlocked: true, priorGateUnlocked: true, maxCoins: 50, coinCount: 20 },
}

// One short run per scene. Random input will never type "exist" at the dungeon
// gate or win a minigame, so deep scenes are unreachable by mashing from the
// menu — the sweep drops the client straight into each one instead. This is
// where nearly all the coverage per minute comes from.
const SWEEP = [
  { scene: null,                  state: 'fresh'        },  // the real front door
  { scene: 'WorldScene',          state: 'eyes'         },
  { scene: 'NorthShrineScene',    state: 'preFinal'     },
  { scene: 'DungeonScene',        state: 'afterDungeon' },
  { scene: 'FirstNPCScene',       state: 'fresh'        },
  { scene: 'EastScene',           state: 'eyes'         },
  { scene: 'SectorScene',         state: 'eyes'         },
  { scene: 'PixelBossScene',      state: 'eyes'         },
  { scene: 'WestScene',           state: 'preFinal'     },
  { scene: 'WestGateScene',       state: 'preFinal'     },
  { scene: 'DuplicateBossScene',  state: 'preFinal'     },
  { scene: 'ConvergenceScene',    state: 'preFinal'     },
  { scene: 'JoustScene',          state: 'preFinal'     },
  { scene: 'Ch2OpeningScene',     state: 'full'         },
  { scene: 'Ch2CloneScene',       state: 'full'         },
  { scene: 'Ch2TownScene',        state: 'full'         },
  { scene: 'Ch3StageScene',       state: 'full'         },
  { scene: 'Ch3BossScene',        state: 'full'         },
  { scene: 'Ch3CreditsScene',     state: 'full'         },
]

// ── Server ───────────────────────────────────────────────────────────────────

async function startServer() {
  const proc = spawn('npx', ['vite', 'preview', '--port', '4317', '--strictPort'],
    { cwd: ROOT, stdio: ['ignore', 'pipe', 'pipe'] })
  const url = 'http://localhost:4317/'
  for (let i = 0; i < 60; i++) {
    await sleep(250)
    try {
      const res = await fetch(url)
      if (res.ok) return { proc, url }
    } catch (_) { /* not up yet */ }
  }
  proc.kill()
  throw new Error('vite preview did not come up on 4317 — is the port taken? try --url')
}

// ── One session ──────────────────────────────────────────────────────────────

async function runSession(browser, opts, index, outDir) {
  const label = opts.scene ? `${opts.scene}/${opts.state || 'full'}` : 'menu'
  const seed = opts.seed + index
  const rand = mulberry32(seed)
  const pick = arr => arr[Math.floor(rand() * arr.length)]

  const findings = []
  const scenesSeen = new Set()
  const dwell = {}                      // scene key -> ms observed
  let moved = false
  let firstPos = null
  // Each session gets its own browser context, so saves never leak between
  // sessions. On top of that, unless --resume, wipe both of the game's
  // localStorage keys before any page script runs, so a session is provably a
  // cold start rather than incidentally one.
  const context = await browser.newContext({ viewport: { width: 900, height: 700 } })
  const page = await context.newPage()
  if (!opts.resume) {
    await page.addInitScript(() => {
      try {
        localStorage.removeItem('slop_save')
        localStorage.removeItem('slop_visited')
      } catch (_) { /* storage unavailable is fine */ }
    })
  }
  await page.addInitScript(PAGE_HOOK)

  const consoleErrors = []
  page.on('pageerror', e => consoleErrors.push(String(e.message || e)))
  page.on('console', m => { if (m.type() === 'error') consoleErrors.push(m.text()) })

  const record = async (id, detail, extra = {}) => {
    if (findings.some(f => f.id === id && f.detail === detail)) return  // once each
    const shot = `s${index}-${id}-${findings.length}.png`
    try { await page.screenshot({ path: join(outDir, shot) }) } catch (_) { /* best effort */ }
    findings.push({ id, detail, seed, session: index, shot, ...extra })
  }

  await page.goto(opts.url, { waitUntil: 'load' })
  await page.waitForFunction(() => !!window.__SLOP_GAME__, null, { timeout: 15000 })
    .catch(() => { throw new Error('window.__SLOP_GAME__ never appeared — is this the right build?') })

  const activeScenes = () => page.evaluate(() =>
    (window.__SLOP_GAME__?.scene?.getScenes(true) || []).map(s => s.sys?.settings?.key))

  if (opts.scene) {
    const state = PRESETS[opts.state || 'full'] || {}
    await sleep(1200)
    await page.evaluate(({ key, st }) => {
      window.__SLOP_GAME__.scene.start(key, { slopState: st, playerHealth: 100 })
    }, { key: opts.scene, st: state })
    await sleep(1200)
  } else {
    // Bootstrap past the front door. The title wants any key, and the menu is a
    // focused DOM terminal that swallows keystrokes — random mashing will never
    // spell "play", so type it deliberately. Without this every session dies on
    // the doormat and reports a soft-lock in MenuScene.
    let booted = false
    for (let attempt = 0; attempt < 40 && !booted; attempt++) {
      const scenes = await activeScenes().catch(() => [])
      if (scenes.includes('TitleScene')) {
        await page.keyboard.press('Space').catch(() => {})
      } else if (scenes.includes('MenuScene')) {
        const input = page.locator('#slop-input')
        if (await input.count()) {
          // "new game" clears the save and the visited map on the way in, so the
          // run starts clean and the command itself gets exercised every session.
          await input.fill(opts.resume ? 'play' : 'new game').catch(() => {})
          await page.keyboard.press('Enter').catch(() => {})
          await sleep(1600)
          const after = await activeScenes().catch(() => [])
          if (!after.includes('MenuScene')) booted = true
        }
      } else if (scenes.length && !scenes.includes('BootScene')) {
        booted = true      // already in the game somehow
      }
      if (!booted) await sleep(400)
    }
    if (!booted) {
      await record('bootstrap-failed',
        'could not get from the title/menu into the game — the client never started playing')
      await context.close()
      return { seed, findings, scenesSeen: [...scenesSeen].sort(), dwell, moved: false, label }
    }

    // A cold start must actually be cold. Anything already cleared here means
    // the wipe did not take or something re-seeded the save — which is exactly
    // how a "fresh" run ends up unable to reach the corruption power.
    if (!opts.resume) {
      const birth = await page.evaluate(() => window.__zombieSample?.() ?? null).catch(() => null)
      const carried = birth?.state
        ? PROGRESS_FLAGS.filter(f => birth.state[f])
        : []
      if (carried.length) {
        await record('fresh-start-carries-progress',
          `a brand-new game began with ${carried.join(', ')} already set`,
          { scenes: birth.scenes, state: birth.state })
      }
    }
  }

  const deadline = Date.now() + opts.duration * 1000
  let lastFingerprint = ''
  let lastChange = Date.now()
  const held = new Set()

  // Movement runs on "intents": pick a direction, lean on it for a beat, then
  // re-roll. Uniform random taps barely move the player — they cancel out — and
  // a 72px door in an 800x600 room almost never gets found that way. Committing
  // to a direction for a second at a time is both closer to how a person walks
  // and dramatically better at covering ground.
  const DIRS = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown']
  let intent = null
  let intentUntil = 0

  const releaseIntent = async () => {
    if (intent) { await page.keyboard.up(intent).catch(() => {}); held.delete(intent) }
    intent = null
  }

  while (Date.now() < deadline) {
    // ── act ──
    const now = Date.now()
    if (now >= intentUntil) {
      await releaseIntent()
      if (rand() < 0.85) {
        intent = pick(DIRS)
        await page.keyboard.down(intent).catch(() => {})
        held.add(intent)
      }
      intentUntil = now + 400 + Math.floor(rand() * 1000)
    }

    // Action keys on top of the walking.
    if (rand() < 0.55) {
      const key = pick(ACTION_BAG)
      if (key === 'ShiftLeft' && rand() < 0.5) {
        await page.keyboard.down(key).catch(() => {})
        await sleep(120)
        await page.keyboard.up(key).catch(() => {})
      } else {
        await page.keyboard.press(key).catch(() => {})
      }
    }
    await sleep(40 + Math.floor(rand() * 90))

    // ── observe ──
    let sample
    try {
      sample = await page.evaluate(() => window.__zombieSample?.() ?? null)
    } catch (e) {
      await record('page-crashed', `evaluate failed: ${String(e).slice(0, 200)}`)
      break
    }
    if (!sample) continue

    sample.scenes.forEach(s => { scenesSeen.add(s); dwell[s] = (dwell[s] || 0) + 120 })
    if (sample.pos) {
      firstPos ??= sample.pos
      if (Math.abs(sample.pos[0] - firstPos[0]) > 24 || Math.abs(sample.pos[1] - firstPos[1]) > 24) moved = true
    }

    // Enter opens the pause menu, and its terminal eats keystrokes. A player
    // would close it; sitting in it burns the whole session reading a map.
    if (sample.scenes.includes('PauseScene')) {
      await releaseIntent()
      await page.keyboard.press('Escape').catch(() => {})
      await sleep(120)
    }

    for (const err of sample.errors) {
      await record(`runtime-${err.kind}`, err.message.slice(0, 300), { scenes: sample.scenes })
    }

    if (sample.state) {
      for (const inv of INVARIANTS) {
        const hit = inv.check(sample.state)
        if (hit) await record(inv.id, hit, { scenes: sample.scenes, state: sample.state })
      }
    }

    // ── soft-lock detector ──
    // The fingerprint is the scene set plus the progression flags. If neither
    // moves for --stall seconds while we are hammering keys, the player is in a
    // room that cannot be left — the exact shape of the FirstNPCScene bug.
    const fingerprint = JSON.stringify([
      sample.scenes,
      sample.state ? Object.entries(sample.state)
        .filter(([, v]) => typeof v === 'boolean' || typeof v === 'number')
        .map(([k, v]) => `${k}:${v}`) : [],
    ])
    if (fingerprint !== lastFingerprint) {
      lastFingerprint = fingerprint
      lastChange = Date.now()
    } else if (Date.now() - lastChange > opts.stall * 1000) {
      await record('soft-lock',
        `no scene or state change for ${opts.stall}s of continuous input in ${sample.scenes.join(' + ') || '(no active scene)'}`,
        { scenes: sample.scenes, state: sample.state })
      lastChange = Date.now()   // keep going; report once per stall window
    }
  }

  for (const k of held) await page.keyboard.up(k).catch(() => {})

  for (const err of consoleErrors.slice(0, 10)) {
    await record('console-error', err.slice(0, 300))
  }

  await context.close()
  return { seed, findings, scenesSeen: [...scenesSeen].sort(), dwell, moved, label }
}

// ── Report ───────────────────────────────────────────────────────────────────

function buildReport(opts, results, ms) {
  const all = results.flatMap(r => r.findings)
  const scenes = [...new Set(results.flatMap(r => r.scenesSeen))].sort()
  const byId = {}
  for (const f of all) (byId[f.id] ??= []).push(f)

  let md = `# zombie report\n\n`
  md += `- ran ${results.length} session(s) x ${opts.duration}s in ${(ms / 1000).toFixed(1)}s wall\n`
  md += `- base seed \`${opts.seed}\`${opts.scene ? `, forced into \`${opts.scene}\` with \`${opts.state || 'full'}\`` : ', from the menu'}\n`
  md += `- ${opts.resume ? 'resumed whatever save was present' : 'cold start: storage wiped and "new game" typed each session'}\n`
  md += `- **${all.length} finding(s)** across ${Object.keys(byId).length} kind(s)\n\n`

  md += `## scenes reached\n\n`
  if (!scenes.length) {
    md += '_none — the client never got into the game_\n\n'
  } else {
    const dwell = {}
    for (const r of results) for (const [k, v] of Object.entries(r.dwell || {})) dwell[k] = (dwell[k] || 0) + v
    md += `| scene | approx. seconds observed |\n|---|---|\n`
    for (const [k, v] of Object.entries(dwell).sort((a, b) => b[1] - a[1])) {
      md += `| \`${k}\` | ${(v / 1000).toFixed(0)} |\n`
    }
    md += `\n`
  }

  if (!all.length) {
    md += `## findings\n\nNothing tripped. That is weak evidence, not proof: random input explores\nshallowly, so treat a clean run as "no obvious crashes or stalls on the paths\nit happened to walk," and check **scenes reached** to see how far that was.\n`
    return md
  }

  md += `## findings\n\n`
  for (const [id, list] of Object.entries(byId).sort((a, b) => b[1].length - a[1].length)) {
    md += `### \`${id}\` — ${list.length}x\n\n`
    for (const f of list.slice(0, 5)) {
      md += `- ${f.detail}\n`
      md += `  - session ${f.session}, seed \`${f.seed}\`, reproduce with \`npm run zombie -- --sessions 1 --seed ${f.seed}\`\n`
      if (f.scenes?.length) md += `  - scene: \`${f.scenes.join(' + ')}\`\n`
      if (f.shot) md += `  - screenshot: \`${f.shot}\`\n`
    }
    if (list.length > 5) md += `- _...and ${list.length - 5} more_\n`
    md += `\n`
  }
  return md
}

// A deliberately tiny digest. On a clean run this is the whole story; on a dirty
// one it names each finding and points at report.md for the detail. Keeping it
// short matters — this is what gets read after every run.
function buildSummary(opts, results, ms, outDir) {
  const all = results.flatMap(r => r.findings)
  const byId = {}
  for (const f of all) (byId[f.id] ??= []).push(f)

  const dwell = {}
  for (const r of results) for (const [k, v] of Object.entries(r.dwell || {})) dwell[k] = (dwell[k] || 0) + v
  const reached = Object.keys(dwell).length

  const lines = []
  lines.push(`zombie: ${results.length} run(s), ${(ms / 1000).toFixed(0)}s, ${reached} scene(s) reached, ${all.length} finding(s)`)
  lines.push(`mode: ${opts.sweep ? 'sweep' : opts.scene ? `${opts.scene}/${opts.state || 'full'}` : 'menu'}` +
             ` | ${opts.resume ? 'resumed save' : 'cold start'} | base seed ${opts.seed}`)

  const idle = results.filter(r => !r.moved && !r.findings.some(f => f.id === 'bootstrap-failed'))
  if (idle.length) lines.push(`note: ${idle.length} run(s) never moved the player — ${idle.map(r => r.label).join(', ')}`)

  if (!all.length) {
    lines.push('')
    lines.push('no findings.')
  } else {
    lines.push('')
    lines.push('FINDINGS')
    for (const [id, list] of Object.entries(byId).sort((a, b) => b[1].length - a[1].length)) {
      const where = [...new Set(list.map(f => f.scenes?.join('+') || '?'))].slice(0, 3).join(', ')
      lines.push(`  ${id} x${list.length}  [${where}]  seed ${list[0].seed}`)
      lines.push(`    ${list[0].detail.slice(0, 150)}`)
    }
  }
  lines.push('')
  lines.push(`detail: ${join(outDir, 'report.md')}`)
  return lines.join('\n')
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const opts = parseArgs(process.argv.slice(2))
  if (opts.help) { console.log(HELP); return 0 }

  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
  const outDir = opts.out || join(ROOT, 'tools', 'zombie', 'reports', stamp)
  await mkdir(outDir, { recursive: true })

  let server = null
  if (!opts.url) {
    console.log('starting vite preview...')
    server = await startServer()
    opts.url = server.url
  }
  console.log(`zombie -> ${opts.url}`)

  const browser = await chromium.launch({ headless: !opts.headed })
  const started = Date.now()
  const results = []

  // A run is a list of (scene, state) pairs. --sweep is the plan; otherwise it
  // is the same target N times with different seeds.
  const plan = opts.sweep
    ? SWEEP
    : Array.from({ length: opts.sessions }, () => ({ scene: opts.scene, state: opts.state }))

  try {
    for (let i = 0; i < plan.length; i++) {
      const runOpts = { ...opts, scene: plan[i].scene, state: plan[i].state }
      const r = await runSession(browser, runOpts, i, outDir)
      results.push(r)
      if (!opts.quiet) {
        console.log(`  ${String(i + 1).padStart(2)}/${plan.length} ${r.label.padEnd(28)} ${String(r.findings.length).padStart(2)} finding(s)`)
      }
    }
  } finally {
    await browser.close()
    server?.proc.kill()
  }

  const ms = Date.now() - started
  const md = buildReport(opts, results, ms)
  const summary = buildSummary(opts, results, ms, outDir)
  await writeFile(join(outDir, 'report.md'), md)
  await writeFile(join(outDir, 'summary.txt'), summary)
  await writeFile(join(outDir, 'findings.json'), JSON.stringify({ opts, results }, null, 2))

  const total = results.reduce((n, r) => n + r.findings.length, 0)
  console.log('\n' + summary)
  return total ? 1 : 0
}

main().then(
  code => process.exit(code),
  err => { console.error('zombie failed:', err.message); process.exit(2) }
)
