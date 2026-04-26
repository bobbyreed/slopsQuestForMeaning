// Tests for scene update() paths and inner methods not hit by create() alone.
import { describe, it, expect, vi } from 'vitest'
import Phaser from 'phaser'
import { WorldScene }        from '../scenes/WorldScene.js'
import { DungeonScene }      from '../scenes/DungeonScene.js'
import { NorthShrineScene }  from '../scenes/NorthShrineScene.js'

// ─── WorldScene ───────────────────────────────────────────────────────────────

describe('WorldScene.update', () => {
  function ready(initData = {}) {
    const w = new WorldScene()
    w.init(initData)
    w.create()
    return w
  }

  it('returns early when transitioning', () => {
    const w = ready()
    w._transitioning = true
    expect(() => w.update(null, 16)).not.toThrow()
    // slop.handleInput should not be called while transitioning
  })

  it('handles normal update tick without throwing', () => {
    const w = ready()
    expect(() => w.update(null, 16)).not.toThrow()
  })

  it('flashes Slop when slopHitTimer is active', () => {
    const w = ready()
    w._slopHitTimer = 600
    expect(() => w.update(null, 16)).not.toThrow()
    // timer should have decreased
    expect(w._slopHitTimer).toBe(584)
  })

  it('resets Slop alpha when hit timer expires', () => {
    const w = ready()
    w._slopHitTimer = 10
    w.update(null, 16)  // timer goes negative
    w.update(null, 16)  // second tick sees timer <= 0, resets alpha
    expect(w._slopHitTimer).toBeLessThanOrEqual(0)
    expect(w.slop._alpha).toBe(1)
  })

  it('triggers north shrine when Slop is in doorway', () => {
    const w = ready()
    w._enterNorthShrine = vi.fn()
    w.slop.x = 400  // DOOR_X
    w.slop.y = 30   // < 40
    w.update(null, 16)
    expect(w._enterNorthShrine).toHaveBeenCalled()
  })

  it('does not trigger shrine when outside doorway x range', () => {
    const w = ready()
    w._enterNorthShrine = vi.fn()
    w.slop.x = 100  // outside door range
    w.slop.y = 30
    w.update(null, 16)
    expect(w._enterNorthShrine).not.toHaveBeenCalled()
  })

  it('transitions to WestScene when Slop reaches west gap with hasEyes and barrier destroyed', () => {
    const w = ready({ slopState: { hasEyes: true, westBarrierDestroyed: true } })
    w._hasEyes = true
    w._westBarrierDestroyed = true
    w._sceneTransition = vi.fn()
    w.slop.x = 10   // near west wall
    w.slop.y = 300  // in gap band (240-360)
    w.update(null, 16)
    expect(w._sceneTransition).toHaveBeenCalledWith('WestScene', expect.any(Object))
  })

  it('does not transition to WestScene when barrier is intact', () => {
    const w = ready({ slopState: { hasEyes: true } })
    w._hasEyes = true
    w._westBarrierDestroyed = false
    w._sceneTransition = vi.fn()
    w.slop.x = 10
    w.slop.y = 300
    w.update(null, 16)
    expect(w._sceneTransition).not.toHaveBeenCalledWith('WestScene', expect.any(Object))
  })

  it('transitions to EastScene when Slop reaches east gap with hasEyes', () => {
    const w = ready({ slopState: { hasEyes: true } })
    w._hasEyes = true
    w._sceneTransition = vi.fn()
    w.slop.x = 795  // near east wall
    w.slop.y = 300
    w.update(null, 16)
    expect(w._sceneTransition).toHaveBeenCalledWith('EastScene', expect.any(Object))
  })

  it('builds walls with eye gaps when hasEyes is true', () => {
    const w = new WorldScene()
    w.init({ slopState: { hasEyes: true } })
    w.create()
    // Should have created passage hint texts (east/west)
    const textCalls = w.add.text.mock.calls.map(c => c[2])
    expect(textCalls.some(t => typeof t === 'string' && t.includes('west'))).toBe(true)
  })
})

// ─── DungeonScene ─────────────────────────────────────────────────────────────

describe('DungeonScene.update', () => {
  function ready(initData = {}) {
    const d = new DungeonScene()
    d.init(initData)
    d.create()
    return d
  }

  it('returns early when transitioning', () => {
    const d = ready()
    d._transitioning = true
    expect(() => d.update(null, 16)).not.toThrow()
  })

  it('handles normal update tick without throwing', () => {
    const d = ready()
    expect(() => d.update(null, 16)).not.toThrow()
  })

  it('decrements slopHitTimer each tick', () => {
    const d = ready()
    d._slopHitTimer = 200
    d.update(null, 16)
    expect(d._slopHitTimer).toBe(184)
  })

  it('exits dungeon when Slop reaches south edge', () => {
    const d = ready()
    d._exitDungeon = vi.fn()
    d.slop.y = 585  // > H - 20 = 580
    d.update(null, 16)
    expect(d._exitDungeon).toHaveBeenCalled()
  })

  it('enters FirstNPC when gate is open and Slop reaches north edge', () => {
    const d = ready({ unlocked: true })
    d._enterFirstNPC = vi.fn()
    d._gateBlocked = false
    d.slop.y = 30   // < 40
    d.update(null, 16)
    expect(d._enterFirstNPC).toHaveBeenCalled()
  })

  it('does not enter FirstNPC when gate is still blocked', () => {
    const d = ready()
    d._enterFirstNPC = vi.fn()
    d._gateBlocked = true
    d.slop.y = 30
    d.update(null, 16)
    expect(d._enterFirstNPC).not.toHaveBeenCalled()
  })
})

// ─── NorthShrineScene ─────────────────────────────────────────────────────────

describe('NorthShrineScene._updateFirstVisitMode', () => {
  function ready() {
    const s = new NorthShrineScene()
    s.init({ slopState: { hasPrompt: false } })
    s.create()
    return s
  }

  it('triggers first visit when Slop is close to keeper', () => {
    const s = ready()
    s._triggerFirstVisit = vi.fn()
    s._dialogueTriggered = false
    // Move slop right next to the keeper (x=400, y=300 matches staticImage mock default)
    s.slop.x = 400
    s.slop.y = 300
    s._updateFirstVisitMode(16)
    expect(s._triggerFirstVisit).toHaveBeenCalled()
  })

  it('does not re-trigger if already triggered', () => {
    const s = ready()
    s._triggerFirstVisit = vi.fn()
    s._dialogueTriggered = true
    s.slop.x = 400; s.slop.y = 300
    s._updateFirstVisitMode(16)
    expect(s._triggerFirstVisit).not.toHaveBeenCalled()
  })

  it('returns to world when Slop reaches south edge without triggering dialogue', () => {
    const s = ready()
    s._returnToWorld = vi.fn()
    s._dialogueTriggered = false
    s.slop.y = 580   // > H - 30 = 570
    s._updateFirstVisitMode(16)
    expect(s._returnToWorld).toHaveBeenCalled()
  })
})

describe('NorthShrineScene._updateShopMode', () => {
  function shopReady() {
    const s = new NorthShrineScene()
    s.init({ slopState: { hasPrompt: true, coinCount: 5, maxCoins: 3, purchases: { smallPurse: false, eyes: false, bigPurse: false } } })
    s.create()
    return s
  }

  it('shop not open: triggers greeting when Slop is close to keeper', () => {
    const s = shopReady()
    s._shopOpen = false
    s._triggerShopGreeting = vi.fn()
    s._shopTriggered = false
    s.slop.x = 400; s.slop.y = 300  // close to keeper (matches staticImage mock default y)
    s._updateShopMode(16)
    expect(s._triggerShopGreeting).toHaveBeenCalled()
  })

  it('shop open: processes tick when delay has cleared', () => {
    const s = shopReady()
    s._openShop()
    s._shopInputDelay = 0
    expect(() => s._updateShopMode(16)).not.toThrow()
  })

  it('shop open: moves cursor down when JustDown returns true for down', () => {
    const s = shopReady()
    s._openShop()
    s._shopInputDelay = 0
    const startCursor = s._shopCursor
    // Mock JustDown to return true for the down key check
    // up-key check fires twice (|| short-circuit on two keys), then down fires
    vi.mocked(Phaser.Input.Keyboard.JustDown).mockReturnValueOnce(false) // up key 1
    vi.mocked(Phaser.Input.Keyboard.JustDown).mockReturnValueOnce(false) // up key 2
    vi.mocked(Phaser.Input.Keyboard.JustDown).mockReturnValueOnce(true)  // down
    s._updateShopMode(16)
    expect(s._shopCursor).toBe((startCursor + 1) % s._allRows.length)
  })

  it('shop open: skips input while delay is active', () => {
    const s = shopReady()
    s._openShop()
    s._shopInputDelay = 250
    const cursor = s._shopCursor
    s._updateShopMode(16)
    // cursor unchanged because delay was active
    expect(s._shopCursor).toBe(cursor)
  })

  it('shop open: moves cursor up when JustDown returns true for up', () => {
    const s = shopReady()
    s._openShop()
    s._shopInputDelay = 0
    const startCursor = s._shopCursor
    vi.mocked(Phaser.Input.Keyboard.JustDown).mockReturnValueOnce(true)  // up key 1
    s._updateShopMode(16)
    expect(s._shopCursor).toBe((startCursor - 1 + s._allRows.length) % s._allRows.length)
  })

  it('shop open: selects row when space is pressed', () => {
    const s = shopReady()
    s._openShop()
    s._shopInputDelay = 0
    s._selectShopRow = vi.fn()
    // up: false×2, down: false×2, space: true
    vi.mocked(Phaser.Input.Keyboard.JustDown)
      .mockReturnValueOnce(false).mockReturnValueOnce(false)  // up
      .mockReturnValueOnce(false).mockReturnValueOnce(false)  // down
      .mockReturnValueOnce(true)                               // space
    s._updateShopMode(16)
    expect(s._selectShopRow).toHaveBeenCalled()
  })
})

describe('NorthShrineScene first-visit triggers', () => {
  it('_triggerFirstVisit sets _dialogueTriggered', () => {
    const s = new NorthShrineScene()
    s.init({ slopState: {} })
    s.create()
    s._triggerFirstVisit()
    expect(s._dialogueTriggered).toBe(true)
  })

  it('_triggerShopGreeting sets _shopTriggered', () => {
    const s = new NorthShrineScene()
    s.init({ slopState: { hasPrompt: true } })
    s.create()
    s._triggerShopGreeting()
    expect(s._shopTriggered).toBe(true)
  })
})
