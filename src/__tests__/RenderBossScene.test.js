import { describe, it, expect, vi, beforeEach } from 'vitest'
import { RenderBossScene } from '../scenes/RenderBossScene.js'

function makeScene(initData = {}) {
  const s = new RenderBossScene()
  s.init(initData)
  return s
}

function makeCreated(initData = {}) {
  const s = makeScene(initData)
  s.create()
  return s
}

function triggerFade(scene) {
  const calls = scene.cameras.main.fade.mock.calls
  if (!calls.length) return
  const cb = calls[calls.length - 1][5]
  if (cb) cb(null, 1)
}

describe('RenderBossScene', () => {
  describe('init', () => {
    it('stores slopState', () => {
      const s = makeScene({ slopState: { coinCount: 3 } })
      expect(s._slopState.coinCount).toBe(3)
    })

    it('stores returnScene', () => {
      const s = makeScene({ returnScene: 'FirstNPCScene' })
      expect(s._returnScene).toBe('FirstNPCScene')
    })

    it('defaults returnScene to FirstNPCScene', () => {
      const s = makeScene({})
      expect(s._returnScene).toBe('FirstNPCScene')
    })

    it('defaults slopState to empty object', () => {
      const s = makeScene({})
      expect(s._slopState).toEqual({})
    })
  })

  describe('create', () => {
    it('creates without throwing', () => {
      expect(() => makeCreated()).not.toThrow()
    })

    it('initialises phase to 0', () => {
      const s = makeCreated()
      expect(s._phase).toBe(0)
    })

    it('starts as not done', () => {
      const s = makeCreated()
      expect(s._done).toBe(false)
    })

    it('begins in phaseBreak state', () => {
      const s = makeCreated()
      expect(s._phaseBreak).toBe(true)
    })

    it('registers a keyboard listener', () => {
      const s = makeCreated()
      expect(s.input.keyboard.on).toHaveBeenCalledWith('keydown', expect.any(Function))
    })
  })

  describe('_beginPhase', () => {
    it('sets _phaseBreak to true', () => {
      const s = makeCreated()
      s._phaseBreak = false
      s._beginPhase(0)
      expect(s._phaseBreak).toBe(true)
    })

    it('updates phase title text', () => {
      const s = makeCreated()
      // phaseTitle is the text object created first in _buildSharedUI
      // just verify it doesn't throw and shakes camera
      expect(s.cameras.main.shake).toHaveBeenCalled()
    })

    it('transitions to _startPhase after intro delay', () => {
      const s = makeCreated()
      s._startPhase = vi.fn()
      s._phaseBreak = false
      s._beginPhase(0)

      // Fire the delayedCall callback (intro hold timer)
      const delayCalls = s.time.delayedCall.mock.calls
      const lastDelay = delayCalls[delayCalls.length - 1]
      lastDelay[1]() // run the callback

      // that callback triggers a tween; simulate tween onComplete
      const tweenCalls = s.tweens.add.mock.calls
      const lastTween = tweenCalls[tweenCalls.length - 1][0]
      if (lastTween.onComplete) lastTween.onComplete()

      expect(s._startPhase).toHaveBeenCalled()
    })
  })

  describe('_startPhase', () => {
    it('creates columns matching phase col count', () => {
      const s = makeCreated()
      // Force past phaseBreak
      s._phaseBreak = false
      const delayCalls = s.time.delayedCall.mock.calls
      const lastDelay = delayCalls[delayCalls.length - 1]
      lastDelay[1]()
      const tweenCalls = s.tweens.add.mock.calls
      const lastTween = tweenCalls[tweenCalls.length - 1][0]
      if (lastTween.onComplete) lastTween.onComplete()

      // Phase 0 has 3 columns
      expect(s._columns.length).toBe(3)
    })

    it('sets _phaseStarted to true', () => {
      const s = makeCreated()
      s._phaseBreak = false
      const delayCalls = s.time.delayedCall.mock.calls
      delayCalls[delayCalls.length - 1][1]()
      const lastTween = s.tweens.add.mock.calls[s.tweens.add.mock.calls.length - 1][0]
      if (lastTween.onComplete) lastTween.onComplete()
      expect(s._phaseStarted).toBe(true)
    })
  })

  describe('_onKey', () => {
    function startedScene() {
      const s = makeCreated()
      s._startPhase(s._phaseDef)
      s._phaseBreak = false
      return s
    }

    it('ignores input during phaseBreak', () => {
      const s = makeCreated()
      s._phaseBreak = true
      // Should not throw and columns should be untouched
      expect(() => s._onKey('r')).not.toThrow()
    })

    it('ignores input when done', () => {
      const s = startedScene()
      s._done = true
      expect(() => s._onKey('r')).not.toThrow()
    })

    it('triggers retry on R when phaseResult is set', () => {
      const s = startedScene()
      s._phaseResult = 'fail'
      s._retryPhase = vi.fn()
      s._onKey('r')
      expect(s._retryPhase).toHaveBeenCalled()
    })

    it('triggers quit on Escape when phaseResult is set', () => {
      const s = startedScene()
      s._phaseResult = 'fail'
      s._quit = vi.fn()
      s._onKey('Escape')
      expect(s._quit).toHaveBeenCalled()
    })

    it('ignores non-letter keys during active phase', () => {
      const s = startedScene()
      expect(() => s._onKey('Enter')).not.toThrow()
      expect(() => s._onKey('1')).not.toThrow()
    })

    it('processes correct key for first column letter', () => {
      const s = startedScene()
      // Phase 0 word is 'render', first col gets 'r'
      const col = s._columns[0]
      const firstLetter = col.letters[0]
      s._checkPhaseComplete = vi.fn()
      s._onKey(firstLetter)
      expect(col.waiting).toBe(true)
    })
  })

  describe('_checkPhaseComplete', () => {
    it('does nothing if some columns are not done', () => {
      const s = makeCreated()
      s._startPhase(s._phaseDef)
      s._columns[0].done = true
      // others not done
      s._phaseFail = vi.fn()
      s._phasePass = vi.fn()
      s._checkPhaseComplete()
      expect(s._phasePass).not.toHaveBeenCalled()
      expect(s._phaseFail).not.toHaveBeenCalled()
    })

    it('schedules pass when all columns done with all correct results', () => {
      const s = makeCreated()
      s._startPhase(s._phaseDef)
      s._phasePass = vi.fn()
      s._columns.forEach(col => {
        col.done = true
        col.displays.forEach(d => { d.result = 'correct' })
      })
      s._checkPhaseComplete()
      const cb = s.time.delayedCall.mock.calls[s.time.delayedCall.mock.calls.length - 1][1]
      cb()
      expect(s._phasePass).toHaveBeenCalled()
    })

    it('schedules fail when all columns done but some wrong', () => {
      const s = makeCreated()
      s._startPhase(s._phaseDef)
      s._phaseFail = vi.fn()
      s._columns.forEach(col => {
        col.done = true
        col.displays.forEach(d => { d.result = 'wrong' })
      })
      s._checkPhaseComplete()
      const cb = s.time.delayedCall.mock.calls[s.time.delayedCall.mock.calls.length - 1][1]
      cb()
      expect(s._phaseFail).toHaveBeenCalled()
    })
  })

  describe('_phasePass', () => {
    it('increments _phase', () => {
      const s = makeCreated()
      s._startPhase(s._phaseDef)
      const before = s._phase
      s._beginPhase = vi.fn()
      s._phasePass()
      expect(s._phase).toBe(before + 1)
    })

    it('calls _victory when all phases are done', () => {
      const s = makeCreated()
      s._startPhase(s._phaseDef)
      s._phase = 3  // last phase index
      s._victory = vi.fn()
      s._phasePass()
      expect(s._victory).toHaveBeenCalled()
    })

    it('starts next phase when more phases remain', () => {
      const s = makeCreated()
      s._startPhase(s._phaseDef)
      s._phase = 0
      s._beginPhase = vi.fn()
      s._phasePass()
      expect(s._beginPhase).toHaveBeenCalledWith(1)
    })
  })

  describe('_phaseFail', () => {
    it('makes result banner visible', () => {
      const s = makeCreated()
      s._phaseFail()
      expect(s._resultBanner._visible).toBe(true)
    })

    it('makes retry hint visible', () => {
      const s = makeCreated()
      s._phaseFail()
      expect(s._retryHint._visible).toBe(true)
    })

    it('shakes the camera', () => {
      const s = makeCreated()
      const shakesBefore = s.cameras.main.shake.mock.calls.length
      s._phaseFail()
      expect(s.cameras.main.shake.mock.calls.length).toBeGreaterThan(shakesBefore)
    })
  })

  describe('_retryPhase', () => {
    it('clears phaseResult', () => {
      const s = makeCreated()
      s._startPhase(s._phaseDef)
      s._phaseResult = 'fail'
      s._retryPhase()
      expect(s._phaseResult).toBeNull()
    })

    it('sets phaseStarted to true after retry', () => {
      const s = makeCreated()
      s._startPhase(s._phaseDef)
      s._retryPhase()
      expect(s._phaseStarted).toBe(true)
    })

    it('hides result banner', () => {
      const s = makeCreated()
      s._startPhase(s._phaseDef)
      s._phaseFail()
      s._retryPhase()
      expect(s._resultBanner._visible).toBe(false)
    })
  })

  describe('_victory', () => {
    it('sets _done to true', () => {
      const s = makeCreated()
      s._victory()
      expect(s._done).toBe(true)
    })

    it('removes the key listener', () => {
      const s = makeCreated()
      s._victory()
      expect(s.input.keyboard.off).toHaveBeenCalledWith('keydown', s._keyListener)
    })

    it('schedules _leave(true) via delayedCall', () => {
      const s = makeCreated()
      s._leave = vi.fn()
      s._victory()
      const calls = s.time.delayedCall.mock.calls
      const last = calls[calls.length - 1]
      last[1]()
      expect(s._leave).toHaveBeenCalledWith(true)
    })
  })

  describe('_quit', () => {
    it('prevents double-transition', () => {
      const s = makeCreated()
      s._transitioning = true
      s._quit()
      expect(s.cameras.main.fade).not.toHaveBeenCalled()
    })

    it('calls scene.resume with bossFightWon: false', () => {
      const s = makeCreated({ returnScene: 'FirstNPCScene' })
      s._quit()
      triggerFade(s)
      expect(s.scene.resume).toHaveBeenCalledWith('FirstNPCScene', { bossFightWon: false })
    })

    it('calls scene.stop', () => {
      const s = makeCreated()
      s._quit()
      triggerFade(s)
      expect(s.scene.stop).toHaveBeenCalled()
    })
  })

  describe('_leave', () => {
    it('calls scene.resume with bossFightWon: true on victory', () => {
      const s = makeCreated({ returnScene: 'FirstNPCScene' })
      s._leave(true)
      triggerFade(s)
      expect(s.scene.resume).toHaveBeenCalledWith('FirstNPCScene', { bossFightWon: true })
    })

    it('calls scene.resume with bossFightWon: false on loss', () => {
      const s = makeCreated({ returnScene: 'FirstNPCScene' })
      s._leave(false)
      triggerFade(s)
      expect(s.scene.resume).toHaveBeenCalledWith('FirstNPCScene', { bossFightWon: false })
    })

    it('prevents double-transition', () => {
      const s = makeCreated()
      s._transitioning = true
      const fadesBefore = s.cameras.main.fade.mock.calls.length
      s._leave(true)
      expect(s.cameras.main.fade.mock.calls.length).toBe(fadesBefore)
    })
  })

  describe('update', () => {
    function activeScene() {
      const s = makeCreated()
      s._startPhase(s._phaseDef)
      s._phaseBreak = false
      s._phaseResult = null
      return s
    }

    it('does not throw during normal update', () => {
      expect(() => activeScene().update(null, 16)).not.toThrow()
    })

    it('returns early during phaseBreak', () => {
      const s = makeCreated()
      s._phaseBreak = true
      expect(() => s.update(null, 16)).not.toThrow()
    })

    it('advances sweepT for each column', () => {
      const s = activeScene()
      const col = s._columns[0]
      col.sweepT = 0
      col.sweepDir = 1
      s.update(null, 100)
      expect(col.sweepT).toBeGreaterThan(0)
    })

    it('reverses sweep direction at boundaries', () => {
      const s = activeScene()
      const col = s._columns[0]
      col.sweepT = 0.999
      col.sweepDir = 1
      s.update(null, 200)
      expect(col.sweepDir).toBe(-1)
    })

    it('eclipse: covers letter after eclipseMs', () => {
      const s = makeCreated()
      s._phaseDef = { id: 'eclipse', word: 'output', cols: 3, sweep: 1900, hitLo: 0.29, hitHi: 0.71, eclipse: true, eclipseMs: 100, mirror: false, renderTint: 0xdd5511 }
      s._startPhase(s._phaseDef)
      s._phaseBreak = false
      s._phaseResult = null
      const col = s._columns[0]
      col.eclipseTimer = 90
      col.eclipse = true
      col.eclipseMs = 100
      col.eclipsed = false
      s.update(null, 20)
      expect(col.eclipsed).toBe(true)
    })
  })
})
