import { describe, it, expect, vi } from 'vitest'
import { makeScene } from '../__mocks__/phaser.js'
import { PlatformerWorldScene } from '../scenes/PlatformerWorldScene.js'
import Phaser from '../__mocks__/phaser.js'

function makePlatformer(slopState = {}) {
  const s = new PlatformerWorldScene()
  Object.assign(s, makeScene())
  s.init({ slopState })
  s.create()
  return s
}

describe('PlatformerWorldScene — init', () => {
  it('initialises flags', () => {
    const s = makePlatformer()
    expect(s._transitioning).toBe(false)
    expect(s._sourceTriggered).toBe(false)
  })

  it('stores slopState', () => {
    const s = makePlatformer({ coinCount: 3 })
    expect(s._slopState.coinCount).toBe(3)
  })
})

describe('PlatformerWorldScene — _showArrivalText', () => {
  it('adds a text object and tweens it in', () => {
    const s = makePlatformer()
    const prevTextCalls = s.add.text.mock.calls.length
    s._showArrivalText()
    expect(s.add.text.mock.calls.length).toBeGreaterThan(prevTextCalls)
    expect(s.tweens.add).toHaveBeenCalled()
  })

  it('fires onComplete callback without throwing', () => {
    const s = makePlatformer()
    s._showArrivalText()
    // The last tweens.add call is the fade-in; fire its onComplete
    const tweenCalls = s.tweens.add.mock.calls
    const arrivalTween = tweenCalls.at(-1)?.[0]
    expect(() => arrivalTween?.onComplete?.()).not.toThrow()
  })

  it('fires the delayedCall inside onComplete, then fade-out onComplete', () => {
    const s = makePlatformer()
    s._showArrivalText()
    // Fire fade-in onComplete → schedules delayedCall
    const arrivalTween = s.tweens.add.mock.calls.at(-1)?.[0]
    arrivalTween?.onComplete?.()
    // Fire delay → schedules fade-out tween
    const delayCb = s.time.delayedCall.mock.calls.at(-1)?.[1]
    delayCb?.()
    // Fire fade-out onComplete → destroys overlay
    const fadeOutTween = s.tweens.add.mock.calls.at(-1)?.[0]
    expect(() => fadeOutTween?.onComplete?.()).not.toThrow()
  })
})

describe('PlatformerWorldScene — _triggerFragment', () => {
  it('marks fragment as triggered', () => {
    const s = makePlatformer()
    const frag = { triggered: false, lines: ['hello'], sprite: { x: 100, y: 100 } }
    s._triggerFragment(frag)
    expect(frag.triggered).toBe(true)
  })

  it('shows dialogue with fragment lines', () => {
    const s = makePlatformer()
    s._dialogue = { show: vi.fn(), update: vi.fn(), active: false }
    const frag = { triggered: false, lines: ['hello', 'world'], sprite: { x: 100, y: 100 } }
    s._triggerFragment(frag)
    expect(s._dialogue.show).toHaveBeenCalledWith('fragment', ['hello', 'world'], expect.any(Function))
  })
})

describe('PlatformerWorldScene — _triggerSource', () => {
  it('sets _sourceTriggered to true', () => {
    const s = makePlatformer()
    s._triggerSource()
    expect(s._sourceTriggered).toBe(true)
  })

  it('shows source dialogue', () => {
    const s = makePlatformer()
    s._dialogue = { show: vi.fn(), update: vi.fn(), active: false }
    s._triggerSource()
    expect(s._dialogue.show).toHaveBeenCalledWith('the source', expect.any(Array), expect.any(Function))
  })

  it('dialogue callback calls _winTransition', () => {
    const s = makePlatformer()
    s._dialogue = { show: vi.fn(), update: vi.fn(), active: false }
    s._triggerSource()
    const cb = s._dialogue.show.mock.calls[0][2]
    cb()  // fires _winTransition
    expect(s.cameras.main.fade).toHaveBeenCalled()
  })
})

describe('PlatformerWorldScene — update', () => {
  function preparedScene() {
    const s = makePlatformer()
    s._dialogue = { update: vi.fn(), active: false }
    s._player = {
      x: 100, y: 300,
      body: {
        setVelocityX: vi.fn(), setVelocityY: vi.fn(), setVelocity: vi.fn(),
        blocked: { down: true, left: false, right: false },
        velocity: { x: 0, y: 0 },
      },
    }
    s._enemies = []
    s._fragments = []
    s._sourceSprite = null
    return s
  }

  it('calls dialogue.update each tick', () => {
    const s = preparedScene()
    s.update()
    expect(s._dialogue.update).toHaveBeenCalled()
  })

  it('moves player left on left input', () => {
    const s = preparedScene()
    s._cursors.left.isDown = true
    s.update()
    expect(s._player.body.setVelocityX).toHaveBeenCalledWith(-190)
  })

  it('moves player right on right input', () => {
    const s = preparedScene()
    s._cursors.right.isDown = true
    s.update()
    expect(s._player.body.setVelocityX).toHaveBeenCalledWith(190)
  })

  it('does not move player when no input', () => {
    const s = preparedScene()
    s.update()
    expect(s._player.body.setVelocityX).toHaveBeenCalledWith(0)
  })

  it('respawns player when they fall below the world', () => {
    const s = preparedScene()
    s._player.y = 700   // below H + 60
    s._player.body.blocked.down = false   // falling, not on ground
    s._lastSafeX = 200
    s._lastSafeY = 400
    s.update()
    expect(s._player.x).toBe(200)
    expect(s._player.body.setVelocity).toHaveBeenCalledWith(0, 0)
  })

  it('triggers fragment when player is within 80px', () => {
    const s = preparedScene()
    s._player.x = 100
    s._player.y = 300
    const frag = {
      triggered: false, lines: ['hi'],
      sprite: { x: 140, y: 310 },
    }
    s._fragments = [frag]
    s._dialogue = { update: vi.fn(), active: false, show: vi.fn() }
    s.update()
    expect(frag.triggered).toBe(true)
  })

  it('triggers source when player is within 90px', () => {
    const s = preparedScene()
    s._player.x = 2300
    s._player.y = 400
    s._sourceSprite = { x: 2310, y: 400 }
    s._dialogue = { update: vi.fn(), active: false, show: vi.fn() }
    s._sourceTriggered = false
    s.update()
    expect(s._sourceTriggered).toBe(true)
  })

  it('does not process player when dialogue is active', () => {
    const s = preparedScene()
    s._dialogue.active = true
    s._cursors.right.isDown = true
    s.update()
    expect(s._player.body.setVelocityX).not.toHaveBeenCalled()
  })

  it('reverses walker direction when blocked on right', () => {
    const s = preparedScene()
    const walker = {
      body: {
        blocked: { right: true, left: false },
        velocity: { x: 55 },
        setVelocityX: vi.fn(),
      },
      _dir: 1,
    }
    s._enemies = [walker]
    s.update()
    expect(walker.body.setVelocityX).toHaveBeenCalledWith(-WALKER_V)
  })
})

const WALKER_V = 55
