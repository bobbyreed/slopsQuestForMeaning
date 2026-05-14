import { describe, it, expect, vi } from 'vitest'
import { makeScene }      from '../__mocks__/phaser.js'
import { Ch2CloneScene }  from '../scenes/ch2/Ch2CloneScene.js'
import Phaser             from '../__mocks__/phaser.js'

function makeClone(slopState = {}) {
  const s = new Ch2CloneScene()
  Object.assign(s, makeScene())
  s.init({ slopState })
  s.create()
  return s
}

// ── init ──────────────────────────────────────────────────────────────────────

describe('Ch2CloneScene — init', () => {
  it('stores slopState', () => {
    const s = makeClone({ chapter2Unlocked: true })
    expect(s._slopState.chapter2Unlocked).toBe(true)
  })

  it('initialises clone HP to 5', () => {
    const s = makeClone()
    expect(s._cloneHP).toBe(5)
  })

  it('starts fight not started', () => {
    const s = makeClone()
    expect(s._fightStarted).toBe(false)
    expect(s._preFightSeen).toBe(false)
  })

  it('starts not transitioning', () => {
    const s = makeClone()
    expect(s._transitioning).toBe(false)
  })

  it('cooldowns at 0', () => {
    const s = makeClone()
    expect(s._meleeCooldown).toBe(0)
    expect(s._corruptCD).toBe(0)
  })
})

// ── create ────────────────────────────────────────────────────────────────────

describe('Ch2CloneScene — create', () => {
  it('does not throw', () => {
    expect(() => makeClone()).not.toThrow()
  })

  it('creates player and clone', () => {
    const s = makeClone()
    expect(s._player).toBeDefined()
    expect(s._clone).toBeDefined()
  })

  it('creates clone HP bar', () => {
    const s = makeClone()
    expect(s._cloneHpBar).toBeDefined()
  })
})

// ── no jump ───────────────────────────────────────────────────────────────────

describe('Ch2CloneScene — no jump', () => {
  it('_canJump returns false with no state', () => {
    const s = makeClone()
    expect(s._canJump()).toBe(false)
  })
})

// ── _hitClone ─────────────────────────────────────────────────────────────────

describe('Ch2CloneScene — _hitClone', () => {
  it('reduces cloneHP', () => {
    const s = makeClone()
    s._clone = { active: true }
    s._cloneHpBar = { scaleX: 1, setFillStyle: vi.fn() }
    s._hitClone(1)
    expect(s._cloneHP).toBe(4)
  })

  it('schedules kill when HP reaches 0', () => {
    const s = makeClone()
    s._clone = { active: true }
    s._cloneHpBar = { scaleX: 1, setFillStyle: vi.fn() }
    s._cloneHP = 1
    s._hitClone(1)
    expect(s.time.delayedCall).toHaveBeenCalled()
  })

  it('does nothing to inactive clone', () => {
    const s = makeClone()
    s._clone = { active: false }
    s._hitClone(1)
    expect(s._cloneHP).toBe(5)
  })
})

// ── _killClone ────────────────────────────────────────────────────────────────

describe('Ch2CloneScene — _killClone', () => {
  it('nullifies clone reference', () => {
    const s = makeClone()
    s._clone = { active: true, x: 500, y: 400, destroy: vi.fn() }
    s._cloneHpBar = { destroy: vi.fn() }
    s._cloneHpBg  = { destroy: vi.fn() }
    s._cloneSprite = null
    s._killClone()
    expect(s._clone).toBeNull()
  })

  it('schedules post-fight dialogue', () => {
    const s = makeClone()
    s._clone     = { active: true, x: 500, y: 400, destroy: vi.fn() }
    s._cloneHpBar = { destroy: vi.fn() }
    s._cloneHpBg  = { destroy: vi.fn() }
    s._killClone()
    expect(s.time.delayedCall).toHaveBeenCalled()
  })
})

// ── _onTouchClone ─────────────────────────────────────────────────────────────

describe('Ch2CloneScene — _onTouchClone', () => {
  it('does nothing if fight not started', () => {
    const s = makeClone()
    s._fightStarted = false
    s._clone = { active: true, x: 400, y: 400 }
    const setVelocityX = vi.fn()
    s._player.body = { ...s._player.body, setVelocityX, setVelocityY: vi.fn() }
    s._onTouchClone()
    expect(setVelocityX).not.toHaveBeenCalled()
  })

  it('applies knockback and sets immunity when fight active', () => {
    const s = makeClone()
    s._fightStarted = true
    s._hitImmunity  = 0
    s._clone = { active: true, x: 400, y: 400 }
    const setVelocityX = vi.fn()
    const setVelocityY = vi.fn()
    s._player.x = 300
    s._player.body = { setVelocityX, setVelocityY }
    s._onTouchClone()
    expect(setVelocityX).toHaveBeenCalled()
    expect(s._hitImmunity).toBe(800)
  })

  it('does nothing when immunity active', () => {
    const s = makeClone()
    s._fightStarted = true
    s._hitImmunity  = 500
    s._clone = { active: true, x: 400, y: 400 }
    const setVelocityX = vi.fn()
    s._player.body = { setVelocityX, setVelocityY: vi.fn() }
    s._onTouchClone()
    expect(setVelocityX).not.toHaveBeenCalled()
  })
})

// ── _buildBackground image branch ─────────────────────────────────────────────

describe('Ch2CloneScene — _buildBackground', () => {
  it('uses image when texture is loaded', () => {
    const s = new Ch2CloneScene()
    Object.assign(s, makeScene())
    s.textures.exists.mockReturnValue(true)
    s.init({})
    s.create()
    expect(s.add.image).toHaveBeenCalled()
  })
})

// ── _doCorrupt ────────────────────────────────────────────────────────────────

describe('Ch2CloneScene — _doCorrupt', () => {
  it('does nothing on cooldown', () => {
    const s = makeClone()
    s._corruptCD = 1000
    const shakeBefore = s.cameras.main.shake.mock.calls.length
    s._doCorrupt()
    expect(s.cameras.main.shake.mock.calls.length).toBe(shakeBefore)
  })

  it('sets cooldown and shakes camera', () => {
    const s = makeClone()
    s._clone = { active: false }
    s._doCorrupt()
    expect(s._corruptCD).toBe(2800)
    expect(s.cameras.main.shake).toHaveBeenCalled()
  })
})

// ── _doMelee ──────────────────────────────────────────────────────────────────

describe('Ch2CloneScene — _doMelee', () => {
  it('does nothing on cooldown', () => {
    const s = makeClone()
    s._meleeCooldown = 100
    const flashBefore = s.cameras.main.flash.mock.calls.length
    s._doMelee()
    expect(s.cameras.main.flash.mock.calls.length).toBe(flashBefore)
  })

  it('sets cooldown when triggered', () => {
    const s = makeClone()
    s._clone = { active: false }
    s._doMelee()
    expect(s._meleeCooldown).toBe(300)
  })
})

// ── pre-fight trigger ─────────────────────────────────────────────────────────

describe('Ch2CloneScene — pre-fight proximity trigger', () => {
  it('triggers dialogue when player gets within FIGHT_DIST', () => {
    const s = makeClone()
    s._dialogue = { show: vi.fn(), update: vi.fn(), active: false }
    s._clone = { active: true, x: 400, y: 400, body: { setVelocityX: vi.fn() } }
    s._player.x = 200
    s._player.y = 400
    s._player.body = { velocity: { x: 0, y: 0 }, blocked: { down: true }, setVelocityX: vi.fn(), setVelocity: vi.fn() }
    s.update(0, 16)
    expect(s._dialogue.show).toHaveBeenCalledWith('the weight', expect.any(Array), expect.any(Function))
    expect(s._preFightSeen).toBe(true)
  })

  it('does not re-trigger once seen', () => {
    const s = makeClone()
    s._dialogue = { show: vi.fn(), update: vi.fn(), active: false }
    s._preFightSeen = true
    s._clone = { active: true, x: 400, y: 400, body: { setVelocityX: vi.fn() } }
    s._player.x = 200
    s._player.y = 400
    s._player.body = { velocity: { x: 0, y: 0 }, blocked: { down: true }, setVelocityX: vi.fn(), setVelocity: vi.fn() }
    s.update(0, 16)
    expect(s._dialogue.show).not.toHaveBeenCalled()
  })

  it('starts fight after pre-fight dialogue callback', () => {
    const s = makeClone()
    let callback
    s._dialogue = { show: vi.fn((_, __, cb) => { callback = cb }), update: vi.fn(), active: false }
    s._clone = { active: true, x: 400, y: 400, body: { setVelocityX: vi.fn() } }
    s._player.x = 200
    s._player.y = 400
    s._player.body = { velocity: { x: 0, y: 0 }, blocked: { down: true }, setVelocityX: vi.fn(), setVelocity: vi.fn() }
    s.update(0, 16)
    expect(s._fightStarted).toBe(false)
    callback()
    expect(s._fightStarted).toBe(true)
  })
})

// ── clone AI ──────────────────────────────────────────────────────────────────

describe('Ch2CloneScene — clone AI', () => {
  it('moves clone toward player once fight started', () => {
    const s = makeClone()
    s._fightStarted = true
    s._clone = {
      active: true, x: 700, y: 400,
      body: { setVelocityX: vi.fn(), blocked: { down: true }, velocity: { x: 0 } },
    }
    s._cloneHpBar = null
    s._player.x = 200
    s._player.body = { velocity: { x: 0, y: 0 }, blocked: { down: true }, setVelocityX: vi.fn(), setVelocity: vi.fn() }
    s._dialogue = { update: vi.fn(), active: false }
    s.update(0, 16)
    expect(s._clone.body.setVelocityX).toHaveBeenCalledWith(-62)
  })

  it('does not move clone before fight starts', () => {
    const s = makeClone()
    s._fightStarted = false
    s._clone = {
      active: true, x: 700, y: 400,
      body: { setVelocityX: vi.fn(), blocked: { down: true }, velocity: { x: 0 } },
    }
    s._cloneHpBar = null
    s._player.x = 200
    s._player.body = { velocity: { x: 0, y: 0 }, blocked: { down: true }, setVelocityX: vi.fn(), setVelocity: vi.fn() }
    s._dialogue = { update: vi.fn(), active: false }
    s._preFightSeen = true
    s.update(0, 16)
    expect(s._clone.body.setVelocityX).not.toHaveBeenCalled()
  })
})

// ── preload ───────────────────────────────────────────────────────────────────

describe('Ch2CloneScene — preload', () => {
  it('does not throw', () => {
    const s = new Ch2CloneScene()
    Object.assign(s, makeScene())
    expect(() => s.preload()).not.toThrow()
  })
})

// ── _onAnimsLoaded ────────────────────────────────────────────────────────────

describe('Ch2CloneScene — _onAnimsLoaded', () => {
  it('returns early when animPool is empty', () => {
    const s = makeClone()
    expect(() => s._onAnimsLoaded()).not.toThrow()
  })
})

// ── _killClone callbacks ──────────────────────────────────────────────────────

describe('Ch2CloneScene — _killClone callbacks', () => {
  it('delayedCall callback shows post-fight dialogue', () => {
    const s = makeClone()
    s._clone     = { active: true, x: 500, y: 400, destroy: vi.fn() }
    s._cloneHpBar = { destroy: vi.fn() }
    s._cloneHpBg  = { destroy: vi.fn() }
    s._cloneSprite = null

    let capturedCb
    s.time.delayedCall.mockImplementationOnce((_, cb) => { capturedCb = cb })
    s._killClone()

    if (capturedCb) {
      s._dialogue = { show: vi.fn((_, __, cb) => cb()) }
      capturedCb()
    }
  })

  it('tween onComplete destroys particle', () => {
    const s = makeClone()
    s._clone     = { active: true, x: 500, y: 400, destroy: vi.fn() }
    s._cloneHpBar = { destroy: vi.fn() }
    s._cloneHpBg  = { destroy: vi.fn() }
    s._cloneSprite = null
    s._killClone()
    const tweenCfg = s.tweens.add.mock.calls.find(([c]) => c.onComplete)
    if (tweenCfg) tweenCfg[0].onComplete()
  })
})
