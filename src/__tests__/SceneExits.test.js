// SceneExits.test.js
//
// Verifies that every room scene in the navigation graph has at least one
// working exit — an exit method that ultimately calls scene.start. Scenes
// with no player navigation (pure pipeline transitions like Boot/Title) are
// tested the same way, with their own exit logic.
//
// To add a dead-end room (a purposeful terminal scene with no exit), set
// `deadend: true` in the SCENE_MANIFEST entry below. Dead ends are skipped
// by the per-exit tests but still appear in the manifest so the decision is
// explicit and reviewable.

import { describe, it, expect, vi } from 'vitest'
import { BootScene }            from '../scenes/BootScene.js'
import { TitleScene }           from '../scenes/TitleScene.js'
import { WorldScene }           from '../scenes/WorldScene.js'
import { DungeonScene }         from '../scenes/DungeonScene.js'
import { FirstNPCScene }        from '../scenes/FirstNPCScene.js'
import { NorthShrineScene }     from '../scenes/NorthShrineScene.js'
import { TypingMinigameScene }  from '../scenes/TypingMinigameScene.js'
import { EastScene }            from '../scenes/EastScene.js'
import { WestScene }            from '../scenes/WestScene.js'
import { RenderBossScene }      from '../scenes/RenderBossScene.js'
import {
  EastA0Scene, EastA1Scene, EastA2Scene, EastA3Scene,
  EastB0Scene, EastB1Scene, EastB3Scene,
  EastC0Scene, EastC1Scene, EastC2Scene, EastC3Scene,
} from '../scenes/east/EastGridScenes.js'
import { CastTownScene }        from '../scenes/east/CastTownScene.js'
import {
  WestA0Scene, WestA1Scene, WestA2Scene, WestA3Scene,
  WestB0Scene, WestB1Scene, WestB3Scene,
  WestC0Scene, WestC1Scene, WestC2Scene, WestC3Scene,
} from '../scenes/west/WestGridScenes.js'
import { WestGateScene }        from '../scenes/west/WestGateScene.js'
import { ArchiveTownScene }     from '../scenes/west/ArchiveTownScene.js'
import { DuplicateBossScene }   from '../scenes/west/DuplicateBossScene.js'

// ── helpers ───────────────────────────────────────────────────────────────────

// Fire the most-recent camera.fade callback at completion (t === 1).
function triggerFade(scene) {
  const calls = scene.cameras.main.fade.mock.calls
  if (!calls.length) return
  const cb = calls[calls.length - 1][5]
  if (cb) cb(null, 1)
}

function makeWorld() {
  const s = new WorldScene()
  s.init({})
  s.create()
  return s
}

function makeDungeon(opts = {}) {
  const s = new DungeonScene()
  s.init(opts)
  s.create()
  return s
}

function makeFirstNPC() {
  const s = new FirstNPCScene()
  s.init({ slopState: {} })
  s.create()
  return s
}

function makeNorthShrine() {
  const s = new NorthShrineScene()
  s.init({ slopState: {} })
  s.create()
  return s
}

function makeTypingMinigame() {
  const s = new TypingMinigameScene()
  s.init({ slopState: {}, targetWord: 'exist', returnScene: 'DungeonScene' })
  s.create()
  return s
}

function makeBoot() {
  // BootScene.create() calls this.scene.start immediately; don't call create
  // here — we test _proceed-equivalent directly for the pipeline scenes below.
  return new BootScene()
}

function makeTitle() {
  const s = new TitleScene()
  // Don't call create; _proceed is testable standalone
  s._ready = true
  return s
}

// ── manifest ──────────────────────────────────────────────────────────────────

// Each entry: name, make factory, exits[] (methods that should trigger
// scene.start), optional args[] (positional args per exit method), and an
// optional deadend flag.
const SCENE_MANIFEST = [
  {
    name: 'BootScene',
    // create() itself triggers the pipeline exit; test via create directly
    exits: [{ method: 'create', args: [] }],
    makeClean: makeBoot,
  },
  {
    name: 'TitleScene',
    exits: [{ method: '_proceed', args: [] }],
    makeClean: makeTitle,
  },
  {
    name: 'WorldScene',
    exits: [
      { method: '_enterDungeon',     args: [] },
      { method: '_enterNorthShrine', args: [] },
      { method: '_sceneTransition',  args: ['EastScene', {}] },
    ],
    makeClean: makeWorld,
  },
  {
    name: 'DungeonScene',
    exits: [
      { method: '_exitDungeon',   args: [] },
      { method: '_enterFirstNPC', args: [] },
      { method: '_enterMinigame', args: [] },
    ],
    makeClean: () => makeDungeon({}),
  },
  {
    name: 'FirstNPCScene',
    exits: [{ method: '_returnToWorld', args: [] }],
    makeClean: makeFirstNPC,
  },
  {
    name: 'NorthShrineScene',
    exits: [{ method: '_returnToWorld', args: [] }],
    makeClean: makeNorthShrine,
  },
  {
    name: 'TypingMinigameScene',
    exits: [{ method: '_returnToGame', args: [false] }],
    makeClean: makeTypingMinigame,
  },
  {
    name: 'WestScene',
    exits: [
      { method: '_sceneTransition', args: ['WorldScene', {}] },
      { method: '_sceneTransition', args: ['WestGateScene', {}] },
    ],
    makeClean: () => { const s = new WestScene(); s.init({ slopState: { hasEyes: true } }); s.create(); return s },
  },
  {
    name: 'RenderBossScene',
    exits: [{ method: '_quit', args: [] }],
    makeClean: () => {
      const s = new RenderBossScene()
      s.init({ slopState: {} })
      s.create()
      return s
    },
  },
  // ── East world grid ──────────────────────────────────────────────────────────
  // All grid scenes share the same exit mechanism (_sceneTransition).
  // We test one valid transition per scene to verify the mechanism works.
  {
    name: 'EastScene (chasm)',
    exits: [{ method: '_sceneTransition', args: ['WorldScene', {}] }],
    makeClean: () => { const s = new EastScene(); s.init({ slopState: { hasEyes: true, hasDash: true } }); s.create(); return s },
  },
  {
    name: 'EastA0Scene',
    exits: [{ method: '_sceneTransition', args: ['EastA1Scene', {}] }],
    makeClean: () => { const s = new EastA0Scene(); s.init({ slopState: {} }); s.create(); return s },
  },
  {
    name: 'EastA1Scene',
    exits: [{ method: '_sceneTransition', args: ['EastA2Scene', {}] }],
    makeClean: () => { const s = new EastA1Scene(); s.init({ slopState: {} }); s.create(); return s },
  },
  {
    name: 'EastA2Scene',
    exits: [{ method: '_sceneTransition', args: ['EastA3Scene', {}] }],
    makeClean: () => { const s = new EastA2Scene(); s.init({ slopState: {} }); s.create(); return s },
  },
  {
    name: 'EastA3Scene',
    exits: [{ method: '_sceneTransition', args: ['EastB3Scene', {}] }],
    makeClean: () => { const s = new EastA3Scene(); s.init({ slopState: {} }); s.create(); return s },
  },
  {
    name: 'EastB0Scene',
    exits: [{ method: '_sceneTransition', args: ['EastB1Scene', {}] }],
    makeClean: () => { const s = new EastB0Scene(); s.init({ slopState: {} }); s.create(); return s },
  },
  {
    name: 'EastB1Scene',
    exits: [{ method: '_sceneTransition', args: ['EastB2Scene', {}] }],
    makeClean: () => { const s = new EastB1Scene(); s.init({ slopState: {} }); s.create(); return s },
  },
  {
    name: 'CastTownScene (EastB2)',
    exits: [{ method: '_sceneTransition', args: ['EastB3Scene', {}] }],
    makeClean: () => { const s = new CastTownScene(); s.init({ slopState: {} }); s.create(); return s },
  },
  {
    name: 'EastB3Scene',
    exits: [{ method: '_sceneTransition', args: ['EastA3Scene', {}] }],
    makeClean: () => { const s = new EastB3Scene(); s.init({ slopState: {} }); s.create(); return s },
  },
  {
    name: 'EastC0Scene',
    exits: [{ method: '_sceneTransition', args: ['EastC1Scene', {}] }],
    makeClean: () => { const s = new EastC0Scene(); s.init({ slopState: {} }); s.create(); return s },
  },
  {
    name: 'EastC1Scene',
    exits: [{ method: '_sceneTransition', args: ['EastC2Scene', {}] }],
    makeClean: () => { const s = new EastC1Scene(); s.init({ slopState: {} }); s.create(); return s },
  },
  {
    name: 'EastC2Scene',
    exits: [{ method: '_sceneTransition', args: ['EastC3Scene', {}] }],
    makeClean: () => { const s = new EastC2Scene(); s.init({ slopState: {} }); s.create(); return s },
  },
  {
    name: 'EastC3Scene (dungeon stub)',
    exits: [{ method: '_sceneTransition', args: ['EastC2Scene', {}] }],
    makeClean: () => { const s = new EastC3Scene(); s.init({ slopState: {} }); s.create(); return s },
  },
  // ── West world grid ──────────────────────────────────────────────────────────
  {
    name: 'WestGateScene',
    exits: [
      { method: '_winTransition', args: [] },
      { method: '_loseTransition', args: [] },
    ],
    makeClean: () => { const s = new WestGateScene(); s.init({ slopState: {} }); s.create(); return s },
  },
  {
    name: 'WestA0Scene',
    exits: [{ method: '_sceneTransition', args: ['WestA1Scene', {}] }],
    makeClean: () => { const s = new WestA0Scene(); s.init({ slopState: {} }); s.create(); return s },
  },
  {
    name: 'WestA1Scene',
    exits: [{ method: '_sceneTransition', args: ['WestA2Scene', {}] }],
    makeClean: () => { const s = new WestA1Scene(); s.init({ slopState: {} }); s.create(); return s },
  },
  {
    name: 'WestA2Scene',
    exits: [{ method: '_sceneTransition', args: ['WestA3Scene', {}] }],
    makeClean: () => { const s = new WestA2Scene(); s.init({ slopState: {} }); s.create(); return s },
  },
  {
    name: 'WestA3Scene',
    exits: [{ method: '_sceneTransition', args: ['WestB3Scene', {}] }],
    makeClean: () => { const s = new WestA3Scene(); s.init({ slopState: {} }); s.create(); return s },
  },
  {
    name: 'WestB0Scene',
    exits: [{ method: '_sceneTransition', args: ['WestB1Scene', {}] }],
    makeClean: () => { const s = new WestB0Scene(); s.init({ slopState: {} }); s.create(); return s },
  },
  {
    name: 'WestB1Scene',
    exits: [{ method: '_sceneTransition', args: ['WestB2Scene', {}] }],
    makeClean: () => { const s = new WestB1Scene(); s.init({ slopState: {} }); s.create(); return s },
  },
  {
    name: 'ArchiveTownScene (WestB2)',
    exits: [{ method: '_sceneTransition', args: ['WestB3Scene', {}] }],
    makeClean: () => { const s = new ArchiveTownScene(); s.init({ slopState: {} }); s.create(); return s },
  },
  {
    name: 'WestB3Scene',
    exits: [{ method: '_sceneTransition', args: ['WestA3Scene', {}] }],
    makeClean: () => { const s = new WestB3Scene(); s.init({ slopState: {} }); s.create(); return s },
  },
  {
    name: 'WestC0Scene',
    exits: [{ method: '_sceneTransition', args: ['WestC1Scene', {}] }],
    makeClean: () => { const s = new WestC0Scene(); s.init({ slopState: {} }); s.create(); return s },
  },
  {
    name: 'WestC1Scene',
    exits: [{ method: '_sceneTransition', args: ['WestC2Scene', {}] }],
    makeClean: () => { const s = new WestC1Scene(); s.init({ slopState: {} }); s.create(); return s },
  },
  {
    name: 'WestC2Scene',
    exits: [{ method: '_sceneTransition', args: ['WestC3Scene', {}] }],
    makeClean: () => { const s = new WestC2Scene(); s.init({ slopState: {} }); s.create(); return s },
  },
  {
    name: 'WestC3Scene',
    exits: [
      { method: '_sceneTransition', args: ['WestC2Scene', {}] },
      { method: '_sceneTransition', args: ['DuplicateBossScene', {}] },
    ],
    makeClean: () => { const s = new WestC3Scene(); s.init({ slopState: {} }); s.create(); return s },
  },
  {
    name: 'DuplicateBossScene',
    exits: [
      { method: '_winTransition', args: [] },
      { method: '_loseTransition', args: [] },
    ],
    makeClean: () => { const s = new DuplicateBossScene(); s.init({ slopState: {} }); s.create(); return s },
  },
  // Example of how to add a dead-end room:
  //   { name: 'SomeTerminalScene', deadend: true, makeClean: ..., exits: [] }
]

// ── structural invariant ──────────────────────────────────────────────────────

describe('Scene exit manifest — structural', () => {
  it('every non-deadend scene has at least one exit defined', () => {
    const missing = SCENE_MANIFEST.filter(s => !s.deadend && s.exits.length === 0)
    expect(missing.map(s => s.name)).toEqual([])
  })
})

// ── per-scene exit tests ──────────────────────────────────────────────────────

SCENE_MANIFEST.filter(s => !s.deadend).forEach(({ name, makeClean, exits }) => {
  describe(`${name} exits`, () => {
    exits.forEach(({ method, args }) => {
      it(`${method}() triggers a scene transition`, () => {
        const scene = makeClean()
        ;['start', 'launch', 'resume'].forEach(m => scene.scene[m]?.mockClear())

        scene[method](...args)
        triggerFade(scene)

        const transitioned = ['start', 'launch', 'resume'].some(
          m => (scene.scene[m]?.mock?.calls?.length ?? 0) > 0
        )
        expect(transitioned).toBe(true)
      })
    })
  })
})
