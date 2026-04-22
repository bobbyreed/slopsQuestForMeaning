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

  describe('_returnToWorld', () => {
    it('prevents double-transition', () => {
      const s = makeScene({ slopState: {} })
      s.create()
      s._transitioning = true
      s._returnToWorld()
      expect(s.cameras.main.fade).not.toHaveBeenCalled()
    })

    it('starts WorldScene with spawnOrigin "dungeon"', () => {
      const s = makeScene({ slopState: {} })
      s.create()
      s._returnToWorld()
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

  describe('boss flow', () => {
    function prepScene() {
      const s = makeScene({ slopState: {} })
      s.create()
      return s
    }

    it('_launchBossFight calls scene.launch with RenderBossScene', () => {
      const s = prepScene()
      s._transitioning = false
      s._launchBossFight()
      const cb = s.cameras.main.fade.mock.calls[0][5]
      cb(null, 1)
      expect(s.scene.launch).toHaveBeenCalledWith('RenderBossScene', expect.objectContaining({ returnScene: 'FirstNPCScene' }))
    })

    it('_launchBossFight pauses the scene', () => {
      const s = prepScene()
      s._launchBossFight()
      const cb = s.cameras.main.fade.mock.calls[0][5]
      cb(null, 1)
      expect(s.scene.pause).toHaveBeenCalled()
    })

    it('_launchBossFight is no-op when already transitioning', () => {
      const s = prepScene()
      s._transitioning = true
      s._launchBossFight()
      expect(s.cameras.main.fade).not.toHaveBeenCalled()
    })

    it('_spawnBossAura sets _bossMode to true', () => {
      const s = prepScene()
      s._spawnBossAura()
      expect(s._bossMode).toBe(true)
    })

    it('_dissolveAura sets _bossMode to false', () => {
      const s = prepScene()
      s._spawnBossAura()
      s._dissolveAura()
      expect(s._bossMode).toBe(false)
    })

    it('_renderYields shows dialogue with RENDER_YIELDS content', () => {
      const s = prepScene()
      s._dialogue = { show: vi.fn() }
      s._renderYields()
      expect(s._dialogue.show).toHaveBeenCalledWith(
        'the render', expect.any(Array), expect.any(Function), expect.any(Object)
      )
      const lines = s._dialogue.show.mock.calls[0][1]
      expect(lines.some(l => l.includes('yes') || l.includes('honest') || l.includes('render'))).toBe(true)
    })

    it('resume event with bossFightWon: true calls _renderYields', () => {
      const s = prepScene()
      s._renderYields = vi.fn()
      s._dissolveAura = vi.fn()
      // Simulate scene resume event
      const resumeHandler = s.events.on.mock.calls.find(c => c[0] === 'resume')?.[1]
      expect(resumeHandler).toBeDefined()
      resumeHandler(null, { bossFightWon: true })
      expect(s._renderYields).toHaveBeenCalled()
    })

    it('resume event without bossFightWon calls _dissolveAura', () => {
      const s = prepScene()
      s._dissolveAura = vi.fn()
      const resumeHandler = s.events.on.mock.calls.find(c => c[0] === 'resume')?.[1]
      resumeHandler(null, { bossFightWon: false })
      expect(s._dissolveAura).toHaveBeenCalled()
    })
  })

  describe('dialogue chain', () => {
    function prepScene() {
      const s = makeScene({ slopState: {} })
      s.create()
      s._dialogue = { show: vi.fn(), active: false, update: vi.fn() }
      return s
    }

    it('_beginSlopQuestions calls show with slop speaker', () => {
      const s = prepScene()
      s._beginSlopQuestions()
      expect(s._dialogue.show).toHaveBeenCalledWith('slop', expect.any(Array), expect.any(Function))
    })

    it('_renderDefensive calls show with the render speaker', () => {
      const s = prepScene()
      s._renderDefensive()
      expect(s._dialogue.show).toHaveBeenCalledWith('the render', expect.any(Array), expect.any(Function))
    })

    it('_slopPresses calls show with slop speaker', () => {
      const s = prepScene()
      s._slopPresses()
      expect(s._dialogue.show).toHaveBeenCalledWith('slop', expect.any(Array), expect.any(Function))
    })

    it('_renderBossDeclaration calls show with uppercase/bold options', () => {
      const s = prepScene()
      s._spawnBossAura = vi.fn()
      s._launchBossFight = vi.fn()
      s._renderBossDeclaration()
      expect(s._dialogue.show).toHaveBeenCalledWith(
        'the render', expect.any(Array), expect.any(Function),
        expect.objectContaining({ uppercase: true, bold: true })
      )
    })

    it('_powerTransferLines calls show with uppercase/bold options', () => {
      const s = prepScene()
      s._powerTransferLines()
      expect(s._dialogue.show).toHaveBeenCalledWith(
        'the render', expect.any(Array), expect.any(Function),
        expect.objectContaining({ uppercase: true, bold: true })
      )
    })

    it('_grantDash sets hasDash on slop', () => {
      const s = prepScene()
      s._dissolveAura = vi.fn()
      s._grantDash()
      expect(s.slop.hasDash).toBe(true)
    })

    it('_grantDash schedules _giveCoins via delayedCall', () => {
      const s = prepScene()
      s._dissolveAura = vi.fn()
      s._giveCoins = vi.fn()
      s._grantDash()
      const cb = s.time.delayedCall.mock.calls[s.time.delayedCall.mock.calls.length - 1][1]
      cb()
      expect(s._giveCoins).toHaveBeenCalled()
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
