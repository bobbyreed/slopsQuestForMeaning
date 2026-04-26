import { describe, it, expect, vi, beforeEach } from 'vitest'
import Phaser from '../__mocks__/phaser.js'
import { WorldScene } from '../scenes/WorldScene.js'

function makeWorld(initData = {}) {
  const w = new WorldScene()
  w.init(initData)
  return w
}

describe('WorldScene', () => {
  describe('init', () => {
    it('stores slopState as _returnState', () => {
      const state = { coinCount: 3 }
      const w = makeWorld({ slopState: state })
      expect(w._returnState).toEqual(state)
    })

    it('stores spawnOrigin', () => {
      const w = makeWorld({ spawnOrigin: 'shrine' })
      expect(w._spawnOrigin).toBe('shrine')
    })

    it('defaults to null when no data', () => {
      const w = makeWorld()
      expect(w._returnState).toBeNull()
      expect(w._spawnOrigin).toBeNull()
    })
  })

  describe('create — spawn coordinates', () => {
    it('spawns at shrine door when spawnOrigin is "shrine"', () => {
      const w = makeWorld({ spawnOrigin: 'shrine', slopState: {} })
      w.create()
      expect(w.slop.x).toBe(400)  // DOOR_X
      expect(w.slop.y).toBe(80)
    })

    it('spawns near dungeon exit when spawnOrigin is "dungeon"', () => {
      const w = makeWorld({ spawnOrigin: 'dungeon', slopState: {} })
      w.create()
      expect(w.slop.x).toBe(200)  // DUNGEON_SPAWN_X
      expect(w.slop.y).toBe(520)  // H - 80
    })

    it('spawns at default centre-south on first load', () => {
      const w = makeWorld()
      w.create()
      expect(w.slop.x).toBe(400)  // W / 2
      expect(w.slop.y).toBe(500)  // H - 100
    })
  })

  describe('_pickupCoin', () => {
    function pickupSetup(coinCount = 0, maxCoins = 3) {
      const w = makeWorld()
      w.create()
      w.slop.coinCount = coinCount
      w.slop.maxCoins  = maxCoins
      w._dropPending   = false
      const coin = { active: true, destroy: vi.fn(), getData: vi.fn(() => false) }
      return { w, coin }
    }

    it('increments coinCount on pickup', () => {
      const { w, coin } = pickupSetup(0, 3)
      w._pickupCoin(w.slop, coin)
      expect(w.slop.coinCount).toBe(1)
    })

    it('destroys the coin on pickup', () => {
      const { w, coin } = pickupSetup(0, 3)
      w._pickupCoin(w.slop, coin)
      expect(coin.destroy).toHaveBeenCalled()
    })

    it('ignores inactive coins', () => {
      const { w, coin } = pickupSetup(0, 3)
      coin.active = false
      w._pickupCoin(w.slop, coin)
      expect(w.slop.coinCount).toBe(0)
    })

    it('ignores coins marked justDropped', () => {
      const { w, coin } = pickupSetup(0, 3)
      coin.getData.mockReturnValue(true)
      w._pickupCoin(w.slop, coin)
      expect(w.slop.coinCount).toBe(0)
    })

    it('ignores pickup when already overcap', () => {
      const { w, coin } = pickupSetup(4, 3)  // overcap
      w._pickupCoin(w.slop, coin)
      expect(w.slop.coinCount).toBe(4)  // unchanged
    })

    it('schedules a drop when coinCount exceeds maxCoins', () => {
      const { w, coin } = pickupSetup(3, 3)  // at cap, pickup will exceed
      w._pickupCoin(w.slop, coin)
      expect(w.slop.coinCount).toBe(4)  // temporarily overcap
      expect(w._dropPending).toBe(true)
      expect(w.time.delayedCall).toHaveBeenCalled()
    })

    it('does not schedule a second drop if one is already pending', () => {
      const { w, coin } = pickupSetup(3, 3)
      w._dropPending = true
      const callCountBefore = w.time.delayedCall.mock.calls.length
      w._pickupCoin(w.slop, coin)
      expect(w.time.delayedCall.mock.calls.length).toBe(callCountBefore)
    })
  })

  describe('_spawnCoinAt', () => {
    it('creates a coin at roughly the given position', () => {
      const w = makeWorld()
      w.create()
      const createSpy = w._coins.create
      w._spawnCoinAt(300, 400)
      expect(createSpy).toHaveBeenCalled()
    })

    it('marks the new coin as justDropped', () => {
      const w = makeWorld()
      w.create()
      const mockCoin = { refreshBody: vi.fn(), setData: vi.fn(), active: true }
      w._coins.create.mockReturnValue(mockCoin)
      w._spawnCoinAt(300, 400)
      expect(mockCoin.setData).toHaveBeenCalledWith('justDropped', true)
    })
  })

  describe('_enterDungeon', () => {
    it('prevents double-transition', () => {
      const w = makeWorld()
      w.create()
      w._transitioning = true
      w._enterDungeon()
      expect(w.cameras.main.fade).not.toHaveBeenCalled()
    })

    it('starts transition and calls DungeonScene', () => {
      const w = makeWorld()
      w.create()
      w._enterDungeon()
      expect(w._transitioning).toBe(true)
      expect(w.cameras.main.fade).toHaveBeenCalled()
      // Simulate fade completing
      const fadeCb = w.cameras.main.fade.mock.calls[0][5]
      fadeCb(null, 1)
      expect(w.scene.start).toHaveBeenCalledWith('DungeonScene', expect.any(Object))
    })
  })

  describe('_enterNorthShrine', () => {
    it('starts NorthShrineScene on fade complete', () => {
      const w = makeWorld()
      w.create()
      w._enterNorthShrine()
      const fadeCb = w.cameras.main.fade.mock.calls[0][5]
      fadeCb(null, 1)
      expect(w.scene.start).toHaveBeenCalledWith('NorthShrineScene', expect.any(Object))
    })
  })

  describe('_showOneTimeHint', () => {
    it('creates a text element', () => {
      const w = makeWorld()
      w.create()
      w._showOneTimeHint('test hint')
      expect(w.add.text).toHaveBeenCalledWith(
        expect.any(Number), expect.any(Number), 'test hint', expect.any(Object)
      )
    })
  })

  describe('_showAreaHint', () => {
    it('shows default message and prevents re-entry', () => {
      const w = makeWorld()
      w.create()
      w._showAreaHint()
      expect(w._areaHintActive).toBe(true)
    })

    it('does nothing if already active', () => {
      const w = makeWorld()
      w.create()
      w._areaHintActive = true
      const callsBefore = w.add.text.mock.calls.length
      w._showAreaHint()
      expect(w.add.text.mock.calls.length).toBe(callsBefore)
    })

    it('fires delayedCall callback which fades hint and resets flag via onComplete', () => {
      const w = makeWorld()
      w.create()
      w._showAreaHint()

      // Fire the delayedCall callback
      const delayCalls = w.time.delayedCall.mock.calls
      const hintDelayCb = delayCalls[delayCalls.length - 1][1]
      hintDelayCb()

      // Now fire the tween onComplete that was registered in the delayCb
      const tweenCalls = w.tweens.add.mock.calls
      const lastTween = tweenCalls[tweenCalls.length - 1][0]
      expect(lastTween.onComplete).toBeDefined()
      lastTween.onComplete()

      expect(w._areaHintActive).toBe(false)
    })
  })

  describe('update — prompt-enemy collision', () => {
    it('calls onHit when a prompt overlaps an enemy', () => {
      const w = makeWorld({ slopState: {} })
      w.create()

      const fakeEnemy = {
        active: true, _dying: false, tick: vi.fn(),
        getBounds: () => ({ x: 100, y: 100, width: 32, height: 32 }),
        onHit: vi.fn(),
      }
      w._enemies.getChildren.mockReturnValue([fakeEnemy])

      const fakePrompt = {
        active: true, text: 'generate',
        getBounds: () => ({ x: 100, y: 100, width: 20, height: 20 }),
        destroy: vi.fn(),
      }
      w._prompts = [fakePrompt]

      vi.mocked(Phaser.Geom.Intersects.RectangleToRectangle).mockReturnValueOnce(true)
      w.update(null, 16)

      expect(fakeEnemy.onHit).toHaveBeenCalledWith('generate', expect.any(Function))
    })

    it('fires the onDeath coin spawn callback', () => {
      const w = makeWorld({ slopState: {} })
      w.create()
      const coinCreateSpy = w._coins.create

      let capturedCb
      const fakeEnemy = {
        active: true, _dying: false, tick: vi.fn(),
        getBounds: () => ({ x: 200, y: 200, width: 32, height: 32 }),
        onHit: vi.fn((word, cb) => { capturedCb = cb }),
      }
      w._enemies.getChildren.mockReturnValue([fakeEnemy])

      const fakePrompt = {
        active: true, text: 'render',
        getBounds: () => ({ x: 200, y: 200, width: 20, height: 20 }),
        destroy: vi.fn(),
      }
      w._prompts = [fakePrompt]

      vi.mocked(Phaser.Geom.Intersects.RectangleToRectangle).mockReturnValueOnce(true)
      w.update(null, 16)

      capturedCb?.(200, 200)
      expect(coinCreateSpy).toHaveBeenCalled()
    })

    it('ticks active enemies each update', () => {
      const w = makeWorld({ slopState: {} })
      w.create()

      const fakeEnemy = { active: true, tick: vi.fn() }
      w._enemies.getChildren.mockReturnValue([fakeEnemy])
      w._prompts = []

      w.update(null, 16)

      expect(fakeEnemy.tick).toHaveBeenCalledWith(16, w.slop.x, w.slop.y)
    })
  })
})

describe('WorldScene — west barrier', () => {
  it('_buildWestBarrier populates _westBarrierTiles when hasEyes is true', () => {
    const w = makeWorld({ slopState: { hasEyes: true } })
    w.create()
    expect(w._westBarrierTiles.length).toBeGreaterThan(0)
  })

  it('does not build barrier when hasEyes is false', () => {
    const w = makeWorld({ slopState: { hasEyes: false } })
    w.create()
    expect(w._westBarrierTiles).toHaveLength(0)
  })

  it('does not build barrier when westBarrierDestroyed is true', () => {
    const w = makeWorld({ slopState: { hasEyes: true, westBarrierDestroyed: true } })
    w.create()
    expect(w._westBarrierTiles).toHaveLength(0)
  })

  it('_activateCorrupt override sets _westBarrierDestroyed when all tiles are gone', () => {
    const w = makeWorld({ slopState: { hasEyes: true } })
    w.create()
    // Mark all barrier tiles as inactive (simulating corrupt destroying them)
    w._westBarrierTiles.forEach(t => { t.active = false })
    // Mock _corruptibles.getChildren to return empty (tiles already gone)
    w._corruptibles.getChildren.mockReturnValue([])
    w.slop.x = 50
    w.slop.y = 300
    w._activateCorrupt()
    expect(w._westBarrierDestroyed).toBe(true)
    expect(w.slop.westBarrierDestroyed).toBe(true)
  })

  it('_activateCorrupt override does NOT set flag when some tiles remain active', () => {
    const w = makeWorld({ slopState: { hasEyes: true } })
    w.create()
    // Leave some tiles active
    if (w._westBarrierTiles.length > 1) {
      w._westBarrierTiles[0].active = false
      // w._westBarrierTiles[1] stays active
    }
    w._corruptibles.getChildren.mockReturnValue([])
    w.slop.x = 50
    w.slop.y = 300
    w._activateCorrupt()
    expect(w._westBarrierDestroyed).toBe(false)
  })
})
