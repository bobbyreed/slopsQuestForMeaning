import { describe, it, expect, vi, beforeEach } from 'vitest'
import { FirstNPCScene } from '../scenes/FirstNPCScene.js'

function makeScene(initData = {}) {
  const s = new FirstNPCScene()
  s.init(initData)
  return s
}

describe('FirstNPCScene', () => {
  describe('init', () => {
    it('stores slopState', () => {
      const s = makeScene({ slopState: { coinCount: 2 } })
      expect(s._slopState.coinCount).toBe(2)
    })

    it('_isReturn is false when dungeonCleared is not yet set', () => {
      const s = makeScene({ slopState: { dungeonCleared: false } })
      expect(s._isReturn).toBe(false)
    })

    it('_isReturn is true when dungeonCleared is true', () => {
      const s = makeScene({ slopState: { dungeonCleared: true } })
      expect(s._isReturn).toBe(true)
    })

    it('_isReturn defaults to false with no state', () => {
      const s = makeScene()
      expect(s._isReturn).toBe(false)
    })
  })

  describe('create', () => {
    it('creates without throwing', () => {
      const s = makeScene({ slopState: {} })
      expect(() => s.create()).not.toThrow()
    })
  })

  describe('_giveCoins', () => {
    function preparedScene(coinCount = 0, maxCoins = 3) {
      const s = makeScene({ slopState: { coinCount, maxCoins } })
      s.create()
      return s
    }

    it('sets dungeonCleared on slop', () => {
      const s = preparedScene(0, 3)
      s._giveCoins()
      expect(s.slop.dungeonCleared).toBe(true)
    })

    it('grants up to 5 coins capped at maxCoins', () => {
      const s = preparedScene(0, 3)
      s._giveCoins()
      expect(s.slop.coinCount).toBe(3)  // grant 5, but cap at 3
    })

    it('does not exceed maxCoins', () => {
      const s = preparedScene(2, 10)
      s._giveCoins()
      expect(s.slop.coinCount).toBe(7)  // 2 + 5
    })

    it('grants 0 when already at maxCoins', () => {
      const s = preparedScene(3, 3)
      s._giveCoins()
      expect(s.slop.coinCount).toBe(3)  // no change
    })

    it('only fires once (sets _coinGiven guard)', () => {
      const s = preparedScene(0, 10)
      s._giveCoins()
      const afterFirst = s.slop.coinCount
      s._giveCoins()
      expect(s.slop.coinCount).toBe(afterFirst)  // second call does nothing
    })
  })

  describe('_returnToDungeon', () => {
    it('prevents double-transition', () => {
      const s = makeScene({ slopState: {} })
      s.create()
      s._transitioning = true
      s._returnToDungeon()
      expect(s.cameras.main.fade).not.toHaveBeenCalled()
    })

    it('starts WorldScene with spawnOrigin "dungeon"', () => {
      const s = makeScene({ slopState: {} })
      s.create()
      s._returnToDungeon()
      const fadeCb = s.cameras.main.fade.mock.calls[0][5]
      fadeCb(null, 1)
      expect(s.scene.start).toHaveBeenCalledWith('WorldScene', expect.objectContaining({
        spawnOrigin: 'dungeon',
      }))
    })
  })

  describe('update', () => {
    it('handles normal tick without throwing', () => {
      const s = makeScene({ slopState: {} })
      s.create()
      expect(() => s.update(null, 16)).not.toThrow()
    })

    it('returns early when transitioning', () => {
      const s = makeScene({ slopState: {} })
      s.create()
      s._transitioning = true
      expect(() => s.update(null, 16)).not.toThrow()
    })

    it('triggers dialogue when Slop is close to the render', () => {
      const s = makeScene({ slopState: {} })
      s.create()
      s._triggerDialogue = vi.fn()
      s._dialogueTriggered = false
      s.slop.x = s._render.x
      s.slop.y = s._render.y
      s.update(null, 16)
      expect(s._triggerDialogue).toHaveBeenCalled()
    })
  })

  describe('_triggerDialogue', () => {
    it('shows RENDER_LINES on first visit', () => {
      const s = makeScene({ slopState: { dungeonCleared: false } })
      s.create()
      s._dialogue = { show: vi.fn() }
      s._triggerDialogue()
      expect(s._dialogueTriggered).toBe(true)
      // First argument to show should be 'the render'
      expect(s._dialogue.show).toHaveBeenCalledWith('the render', expect.any(Array), expect.any(Function))
      // The lines passed on first visit should include text about the gate
      const lines = s._dialogue.show.mock.calls[0][1]
      expect(lines.some(l => l.includes('gate'))).toBe(true)
    })

    it('shows RETURN_LINES on repeat visit', () => {
      const s = makeScene({ slopState: { dungeonCleared: true } })
      s.create()
      s._dialogue = { show: vi.fn() }
      s._triggerDialogue()
      const lines = s._dialogue.show.mock.calls[0][1]
      expect(lines.some(l => l.includes('came back'))).toBe(true)
    })
  })
})
