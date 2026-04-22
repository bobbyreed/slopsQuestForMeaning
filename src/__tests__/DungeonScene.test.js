import { describe, it, expect, vi, beforeEach } from 'vitest'
import Phaser from '../__mocks__/phaser.js'
import { DungeonScene } from '../scenes/DungeonScene.js'

function makeDungeon(initData = {}) {
  const d = new DungeonScene()
  d.init(initData)
  return d
}

describe('DungeonScene', () => {
  describe('init', () => {
    it('stores slopState', () => {
      const d = makeDungeon({ slopState: { coinCount: 2 } })
      expect(d._slopState.coinCount).toBe(2)
    })

    it('unlocks gate when data.unlocked is true', () => {
      const d = makeDungeon({ unlocked: true })
      expect(d._unlocked).toBe(true)
    })

    it('unlocks gate when slopState.dungeonCleared is true', () => {
      const d = makeDungeon({ slopState: { dungeonCleared: true } })
      expect(d._unlocked).toBe(true)
    })

    it('starts locked by default', () => {
      const d = makeDungeon()
      expect(d._unlocked).toBe(false)
    })
  })

  describe('create — enemy spawning', () => {
    it('spawns enemies when dungeon is not cleared', () => {
      const d = makeDungeon({ slopState: { dungeonCleared: false } })
      d.create()
      // physics.add.group().add was called 5 times (one per enemy spawn)
      expect(d._enemies.add).toHaveBeenCalledTimes(5)
    })

    it('skips enemy spawning when dungeon is already cleared', () => {
      const d = makeDungeon({ slopState: { dungeonCleared: true } })
      d.create()
      expect(d._enemies.add).not.toHaveBeenCalled()
    })
  })

  describe('_openGate', () => {
    it('sets _gateBlocked to false', () => {
      const d = makeDungeon()
      d.create()
      d._gateBlocked = true
      d._openGate()
      expect(d._gateBlocked).toBe(false)
    })

    it('removes physics blocker when present', () => {
      const d = makeDungeon()
      d.create()
      const blocker = { remove: vi.fn() }
      d._gateBlocker = blocker
      d._walls = { remove: vi.fn() }
      d._openGate()
      expect(d._walls.remove).toHaveBeenCalledWith(blocker, true, true)
      expect(d._gateBlocker).toBeNull()
    })

    it('updates gate label text', () => {
      const d = makeDungeon()
      d.create()
      d._openGate()
      expect(d._gateLabel._text).toBe('[ open ]')
    })
  })

  describe('_spawnCoinAt', () => {
    it('creates a coin in the _coins group', () => {
      const d = makeDungeon()
      d.create()
      const mockCoin = { refreshBody: vi.fn(), setData: vi.fn(), active: true }
      d._coins.create.mockReturnValue(mockCoin)
      d._spawnCoinAt(200, 300)
      expect(d._coins.create).toHaveBeenCalled()
    })

    it('marks the coin as justDropped', () => {
      const d = makeDungeon()
      d.create()
      const mockCoin = { refreshBody: vi.fn(), setData: vi.fn(), active: true }
      d._coins.create.mockReturnValue(mockCoin)
      d._spawnCoinAt(200, 300)
      expect(mockCoin.setData).toHaveBeenCalledWith('justDropped', true)
    })
  })

  describe('_enterMinigame', () => {
    it('prevents double-transition', () => {
      const d = makeDungeon()
      d.create()
      d._transitioning = true
      d._enterMinigame()
      expect(d.cameras.main.fade).not.toHaveBeenCalled()
    })

    it('launches TypingMinigameScene with correct data', () => {
      const d = makeDungeon({ slopState: { hasPrompt: true } })
      d.create()
      d._enterMinigame()
      const fadeCb = d.cameras.main.fade.mock.calls[0][5]
      fadeCb(null, 1)
      expect(d.scene.launch).toHaveBeenCalledWith('TypingMinigameScene', expect.objectContaining({
        targetWord: 'exist',
        returnScene: 'DungeonScene',
      }))
    })
  })

  describe('_exitDungeon', () => {
    it('prevents double-transition', () => {
      const d = makeDungeon()
      d.create()
      d._transitioning = true
      d._exitDungeon()
      expect(d.cameras.main.fade).not.toHaveBeenCalled()
    })

    it('transitions to WorldScene with spawnOrigin "dungeon"', () => {
      const d = makeDungeon()
      d.create()
      d._exitDungeon()
      const fadeCb = d.cameras.main.fade.mock.calls[0][5]
      fadeCb(null, 1)
      expect(d.scene.start).toHaveBeenCalledWith('WorldScene', expect.objectContaining({
        spawnOrigin: 'dungeon',
      }))
    })
  })

  describe('_enterFirstNPC', () => {
    it('transitions to FirstNPCScene', () => {
      const d = makeDungeon()
      d.create()
      d._enterFirstNPC()
      const fadeCb = d.cameras.main.fade.mock.calls[0][5]
      fadeCb(null, 1)
      expect(d.scene.start).toHaveBeenCalledWith('FirstNPCScene', expect.any(Object))
    })
  })

  describe('update — prompt-enemy collision', () => {
    it('calls onHit when a prompt overlaps an enemy', () => {
      const d = makeDungeon({ slopState: {} })
      d.create()

      const fakeEnemy = {
        active: true, _dying: false, tick: vi.fn(),
        getBounds: () => ({ x: 50, y: 50, width: 32, height: 32 }),
        onHit: vi.fn(),
      }
      d._enemies.getChildren.mockReturnValue([fakeEnemy])

      const fakePrompt = {
        active: true, text: 'render',
        getBounds: () => ({ x: 50, y: 50, width: 20, height: 20 }),
        destroy: vi.fn(),
      }
      d._prompts = [fakePrompt]

      vi.mocked(Phaser.Geom.Intersects.RectangleToRectangle).mockReturnValueOnce(true)
      d.update(null, 16)

      expect(fakeEnemy.onHit).toHaveBeenCalledWith('render', expect.any(Function))
    })

    it('fires the onDeath coin-spawn callback', () => {
      const d = makeDungeon({ slopState: {} })
      d.create()
      const coinCreateSpy = d._coins.create

      let capturedCb
      const fakeEnemy = {
        active: true, _dying: false, tick: vi.fn(),
        getBounds: () => ({ x: 50, y: 50, width: 32, height: 32 }),
        onHit: vi.fn((word, cb) => { capturedCb = cb }),
      }
      d._enemies.getChildren.mockReturnValue([fakeEnemy])

      const fakePrompt = {
        active: true, text: 'context',
        getBounds: () => ({ x: 50, y: 50, width: 20, height: 20 }),
        destroy: vi.fn(),
      }
      d._prompts = [fakePrompt]

      vi.mocked(Phaser.Geom.Intersects.RectangleToRectangle).mockReturnValueOnce(true)
      d.update(null, 16)

      capturedCb?.(50, 50)
      expect(coinCreateSpy).toHaveBeenCalled()
    })

    it('ticks active enemies each update', () => {
      const d = makeDungeon({ slopState: {} })
      d.create()

      const fakeEnemy = { active: true, tick: vi.fn() }
      d._enemies.getChildren.mockReturnValue([fakeEnemy])
      d._prompts = []

      d.update(null, 16)

      expect(fakeEnemy.tick).toHaveBeenCalledWith(16, d.slop.x, d.slop.y)
    })
  })
})
