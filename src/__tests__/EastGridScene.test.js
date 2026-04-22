import { describe, it, expect, vi } from 'vitest'
import { EastGridScene } from '../phaser/EastGridScene.js'
import { CastTownScene } from '../scenes/east/CastTownScene.js'
import { W, H } from '../config/constants.js'
import Phaser from 'phaser'

function makeGrid(navOverride = {}, extras = {}) {
  const s = new EastGridScene('TestEastScene', {
    bg: 0x080808, wallColor: 0x1a1208,
    nav: { north: null, south: 'SouthScene', east: 'EastScene', west: null, ...navOverride },
    coins: [],
    enemies: [],
    ...extras,
  })
  s.init({ slopState: {} })
  s.create()
  return s
}

describe('EastGridScene', () => {
  describe('_resolveSpawn', () => {
    it('west → spawn at left (60, H/2)', () => {
      const s = new EastGridScene('T', { bg: 0, nav: {} })
      expect(s._resolveSpawn('west')).toEqual([60, H / 2])
    })

    it('east → spawn at right (W-60, H/2)', () => {
      const s = new EastGridScene('T', { bg: 0, nav: {} })
      expect(s._resolveSpawn('east')).toEqual([W - 60, H / 2])
    })

    it('north → spawn at top (W/2, 80)', () => {
      const s = new EastGridScene('T', { bg: 0, nav: {} })
      expect(s._resolveSpawn('north')).toEqual([W / 2, 80])
    })

    it('south → spawn at bottom (W/2, H-80)', () => {
      const s = new EastGridScene('T', { bg: 0, nav: {} })
      expect(s._resolveSpawn('south')).toEqual([W / 2, H - 80])
    })

    it('default → center', () => {
      const s = new EastGridScene('T', { bg: 0, nav: {} })
      expect(s._resolveSpawn(undefined)).toEqual([W / 2, H / 2])
    })
  })

  describe('init', () => {
    it('stores slopState', () => {
      const s = new EastGridScene('T', { bg: 0, nav: {} })
      s.init({ slopState: { coinCount: 3 } })
      expect(s._slopState.coinCount).toBe(3)
    })

    it('resolves spawn from spawnOrigin', () => {
      const s = new EastGridScene('T', { bg: 0, nav: {} })
      s.init({ slopState: {}, spawnOrigin: 'east' })
      expect(s._spawnPos[0]).toBe(W - 60)
    })
  })

  describe('create', () => {
    it('creates without throwing', () => {
      expect(() => makeGrid()).not.toThrow()
    })

    it('creates coins from config', () => {
      const s = new EastGridScene('T', {
        bg: 0, nav: {}, coins: [[100, 200], [300, 400]]
      })
      s.init({ slopState: {} })
      s.create()
      expect(s._coins.create).toHaveBeenCalledTimes(2)
    })

    it('renders lore lines from config', () => {
      const s = new EastGridScene('T', {
        bg: 0, nav: {}, lines: ['// test line']
      })
      s.init({ slopState: {} })
      s.create()
      expect(s.add.text).toHaveBeenCalledWith(
        expect.any(Number), expect.any(Number), '// test line', expect.any(Object)
      )
    })

    it('calls content callback if provided', () => {
      const content = vi.fn()
      const s = new EastGridScene('T', { bg: 0, nav: {}, content })
      s.init({ slopState: {} })
      s.create()
      expect(content).toHaveBeenCalledWith(s)
    })
  })

  describe('_checkGridNav', () => {
    it('transitions east when slop exits east gap', () => {
      const s = makeGrid({ east: 'EastTarget' })
      s.slop.x = W + 5   // past right edge
      s.slop.y = H / 2   // in vertical gap range
      s._checkGridNav()
      const fadeCb = s.cameras.main.fade.mock.calls[0]?.[5]
      if (fadeCb) fadeCb(null, 1)
      expect(s.scene.start).toHaveBeenCalledWith('EastTarget', expect.anything())
    })

    it('transitions south when slop exits south gap', () => {
      const s = makeGrid({ south: 'SouthTarget' })
      s.slop.x = W / 2   // in horizontal gap range
      s.slop.y = H + 5
      s._checkGridNav()
      const fadeCb = s.cameras.main.fade.mock.calls[0]?.[5]
      if (fadeCb) fadeCb(null, 1)
      expect(s.scene.start).toHaveBeenCalledWith('SouthTarget', expect.anything())
    })

    it('does not transition when not in gap range', () => {
      const s = makeGrid({ east: 'EastTarget' })
      s.slop.x = W + 5
      s.slop.y = 50   // outside vertical gap
      s._checkGridNav()
      expect(s.cameras.main.fade).not.toHaveBeenCalled()
    })

    it('passes spawnOrigin west when going east', () => {
      const s = makeGrid({ east: 'EastTarget' })
      s.slop.x = W + 5; s.slop.y = H / 2
      s._checkGridNav()
      const fadeCb = s.cameras.main.fade.mock.calls[0]?.[5]
      if (fadeCb) fadeCb(null, 1)
      const call = s.scene.start.mock.calls[0]
      expect(call[1].spawnOrigin).toBe('west')
    })
  })

  describe('update', () => {
    it('handles basic tick without throwing', () => {
      const s = makeGrid()
      expect(() => s.update(null, 16)).not.toThrow()
    })

    it('returns early when transitioning', () => {
      const s = makeGrid()
      s._transitioning = true
      expect(() => s.update(null, 16)).not.toThrow()
    })

    it('calls onUpdate config hook if provided', () => {
      const onUpdate = vi.fn()
      const s = new EastGridScene('T', { bg: 0, nav: {}, onUpdate })
      s.init({ slopState: {} })
      s.create()
      s.update(null, 16)
      expect(onUpdate).toHaveBeenCalledWith(s)
    })

    it('launches PauseScene when ENTER is just pressed', () => {
      const s = makeGrid()
      Phaser.Input.Keyboard.JustDown.mockReturnValueOnce(true)
      s.update(null, 16)
      expect(s.scene.launch).toHaveBeenCalledWith('PauseScene', expect.objectContaining({ fromScene: 'TestEastScene' }))
      expect(s.scene.pause).toHaveBeenCalled()
    })
  })
})

describe('CastTownScene', () => {
  function makeCastTown() {
    const s = new CastTownScene()
    s.init({ slopState: {} })
    s.create()
    return s
  }

  it('creates without throwing', () => {
    expect(() => makeCastTown()).not.toThrow()
  })

  it('has three NPCs', () => {
    const s = makeCastTown()
    expect(s._npcs.length).toBe(3)
  })

  it('NPC proximity triggers dialogue when slop is close', () => {
    const s = makeCastTown()
    const npc = s._npcs[0]
    // Place slop directly on the guard NPC
    s.slop.x = npc.sprite.x
    s.slop.y = npc.sprite.y
    // Run the onUpdate hook directly
    s._cfg.onUpdate(s)
    expect(npc.triggered).toBe(true)
  })

  it('does not re-trigger an already-triggered NPC', () => {
    const s = makeCastTown()
    // Mark all NPCs as already triggered
    s._npcs.forEach(n => { n.triggered = true })
    s.slop.x = s._npcs[0].sprite.x
    s.slop.y = s._npcs[0].sprite.y
    const showSpy = vi.spyOn(s._dialogue, 'show')
    s._cfg.onUpdate(s)
    expect(showSpy).not.toHaveBeenCalled()
  })

  it('does not trigger when slop is far away', () => {
    const s = makeCastTown()
    s.slop.x = 700
    s.slop.y = 500  // far from all NPCs
    s._cfg.onUpdate(s)
    expect(s._npcs.every(n => !n.triggered)).toBe(true)
  })

  it('does not trigger while dialogue is active', () => {
    const s = makeCastTown()
    s._dialogue.active = true
    const npc = s._npcs[0]
    s.slop.x = npc.sprite.x
    s.slop.y = npc.sprite.y
    s._cfg.onUpdate(s)
    expect(npc.triggered).toBe(false)
  })
})
