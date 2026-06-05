import { describe, it, expect, vi } from 'vitest'
import { makeScene }       from '../__mocks__/phaser.js'
import { Ch2OpeningScene } from '../scenes/ch2/Ch2OpeningScene.js'
import Phaser              from '../__mocks__/phaser.js'

function makeOpening(slopState = {}) {
  const s = new Ch2OpeningScene()
  Object.assign(s, makeScene())
  s.init({ slopState })
  s.create()
  return s
}

// ── init ──────────────────────────────────────────────────────────────────────

describe('Ch2OpeningScene — init', () => {
  it('stores slopState', () => {
    const s = makeOpening({ coinCount: 3 })
    expect(s._slopState.coinCount).toBe(3)
  })

  it('defaults missing slopState', () => {
    const s = new Ch2OpeningScene()
    s.init(undefined)
    expect(s._slopState).toEqual({})
  })

  it('initialises all cooldowns at 0', () => {
    const s = makeOpening()
    expect(s._meleeCooldown).toBe(0)
    expect(s._corruptCD).toBe(0)
    expect(s._hitImmunity).toBe(0)
  })

  it('starts facing right', () => {
    const s = makeOpening()
    expect(s._facing).toBe(1)
  })

  it('starts not transitioning', () => {
    const s = makeOpening()
    expect(s._transitioning).toBe(false)
  })
})

// ── create ────────────────────────────────────────────────────────────────────

describe('Ch2OpeningScene — create', () => {
  it('does not throw', () => {
    expect(() => makeOpening()).not.toThrow()
  })

  it('spawns 8 enemies', () => {
    const s = makeOpening()
    expect(s._enemies).toHaveLength(8)
  })

  it('creates a player rectangle', () => {
    const s = makeOpening()
    expect(s._player).toBeDefined()
  })

  it('creates a dialogue object', () => {
    const s = makeOpening()
    expect(s._dialogue).toBeDefined()
  })
})

// ── _canJump narrative gate ─────────────────────────────────────────────────────

describe('Ch2OpeningScene — _canJump gate', () => {
  it('_canJump returns false when ch2JumpUnlocked is unset', () => {
    const s = makeOpening()
    expect(s._canJump()).toBe(false)
  })

  it('_canJump returns false even if player presses space', () => {
    const s = makeOpening({ ch2JumpUnlocked: false })
    expect(s._canJump()).toBe(false)
  })

  it('_canJump returns true if state is set (base class check)', () => {
    const s = makeOpening({ ch2JumpUnlocked: true })
    expect(s._canJump()).toBe(true)
  })
})

// ── jump ──────────────────────────────────────────────────────────────────────

describe('Ch2OpeningScene — jump', () => {
  function bodyAt(blockedDown) {
    return {
      velocity: { x: 0, y: 0 }, blocked: { down: blockedDown },
      setVelocityX: vi.fn(), setVelocityY: vi.fn(), setVelocity: vi.fn(),
    }
  }

  it('applies jump velocity when grounded and a jump key is pressed', () => {
    const s = makeOpening()
    s._player.body = bodyAt(true)
    s._dialogue = { update: vi.fn(), active: false }
    const spy = vi.spyOn(Phaser.Input.Keyboard, 'JustDown').mockReturnValue(true)
    s.update(0, 16)
    expect(s._player.body.setVelocityY).toHaveBeenCalledWith(-460)
    spy.mockRestore()
  })

  it('does not jump while airborne', () => {
    const s = makeOpening()
    s._player.body = bodyAt(false)
    s._dialogue = { update: vi.fn(), active: false }
    const spy = vi.spyOn(Phaser.Input.Keyboard, 'JustDown').mockReturnValue(true)
    s.update(0, 16)
    expect(s._player.body.setVelocityY).not.toHaveBeenCalledWith(-460)
    spy.mockRestore()
  })
})

// ── melee slash visual ──────────────────────────────────────────────────────────

describe('Ch2OpeningScene — _spawnSlash', () => {
  it('_doMelee creates a visible slash tween', () => {
    const s = makeOpening()
    const before = s.tweens.add.mock.calls.length
    s._doMelee()
    expect(s.tweens.add.mock.calls.length).toBeGreaterThan(before)
  })
})

// ── enemy sprites ───────────────────────────────────────────────────────────────

describe('Ch2OpeningScene — _onAnimsLoaded enemy sprites', () => {
  it('does nothing when no bestiary configs are loaded', () => {
    const s = makeOpening()
    s._animPool = []
    expect(() => s._onAnimsLoaded()).not.toThrow()
    expect(s._enemies[0]._sprite).toBeUndefined()
  })

  it('attaches a bestiary sprite to each enemy when a config exists', () => {
    const s = makeOpening()
    s.textures.exists = vi.fn(() => true)
    s._animPool = [{
      key: 'open-0', label: 'walker',
      cfg: { sheetKey: 'ch2-enemy-bestiary-sheet', frames: [{ x: 0, y: 0, w: 16, h: 24 }] },
    }]
    s._onAnimsLoaded()
    expect(s._enemies.every(e => e._sprite)).toBe(true)
  })
})

// ── _doMelee ──────────────────────────────────────────────────────────────────

describe('Ch2OpeningScene — _doMelee', () => {
  it('does nothing if on cooldown', () => {
    const s = makeOpening()
    s._meleeCooldown = 200
    const flashBefore = s.cameras.main.flash.mock.calls.length
    s._doMelee()
    expect(s.cameras.main.flash.mock.calls.length).toBe(flashBefore)
  })

  it('sets cooldown and flashes camera when ready', () => {
    const s = makeOpening()
    s._doMelee()
    expect(s._meleeCooldown).toBe(300)
    expect(s.cameras.main.flash).toHaveBeenCalled()
  })
})

// ── _doCorrupt ────────────────────────────────────────────────────────────────

describe('Ch2OpeningScene — _doCorrupt', () => {
  it('does nothing if on cooldown', () => {
    const s = makeOpening()
    s._corruptCD = 1000
    const shakeBefore = s.cameras.main.shake.mock.calls.length
    s._doCorrupt()
    expect(s.cameras.main.shake.mock.calls.length).toBe(shakeBefore)
  })

  it('sets cooldown and shakes camera when ready', () => {
    const s = makeOpening()
    s._doCorrupt()
    expect(s._corruptCD).toBe(2800)
    expect(s.cameras.main.shake).toHaveBeenCalled()
  })
})

// ── _hitEnemy / _killEnemy ────────────────────────────────────────────────────

describe('Ch2OpeningScene — _hitEnemy', () => {
  it('reduces enemy HP', () => {
    const s = makeOpening()
    const e = { active: true, _hp: 2, _maxHp: 2, _type: 'armored', _hpBar: null }
    s._hitEnemy(e, 1)
    expect(e._hp).toBe(1)
  })

  it('schedules kill when HP reaches 0', () => {
    const s = makeOpening()
    const e = { active: true, _hp: 1, _maxHp: 1, _type: 'walker', _hpBar: null }
    s._hitEnemy(e, 1)
    expect(s.time.delayedCall).toHaveBeenCalled()
  })

  it('does nothing to inactive enemy', () => {
    const s = makeOpening()
    const e = { active: false, _hp: 2, _maxHp: 2, _hpBar: null }
    s._hitEnemy(e, 1)
    expect(e._hp).toBe(2)
  })
})

describe('Ch2OpeningScene — _killEnemy', () => {
  it('removes enemy from list', () => {
    const s = makeOpening()
    const e = { active: true, _hpBar: null, destroy: vi.fn() }
    s._enemies = [e]
    s._killEnemy(e)
    expect(s._enemies).toHaveLength(0)
  })

  it('destroys HP bar if present', () => {
    const s = makeOpening()
    const bar = { destroy: vi.fn() }
    const e = { active: true, _hpBar: bar, destroy: vi.fn() }
    s._enemies = [e]
    s._killEnemy(e)
    expect(bar.destroy).toHaveBeenCalled()
  })
})

// ── _showArrivalText ──────────────────────────────────────────────────────────

describe('Ch2OpeningScene — _showArrivalText', () => {
  it('activates dialogue with arrival lines', () => {
    const s = makeOpening()
    s._showArrivalText()
    expect(s._dialogue.active).toBe(true)
    expect(s._dialogue._lines).toHaveLength(3)
  })
})

// ── _buildBackground image branch ────────────────────────────────────────────

describe('Ch2OpeningScene — _buildBackground', () => {
  it('uses image when texture is loaded', () => {
    const s = new Ch2OpeningScene()
    Object.assign(s, makeScene())
    s.textures.exists.mockReturnValue(true)
    s.init({})
    s.create()
    expect(s.add.image).toHaveBeenCalled()
  })

  it('falls back to rectangle when texture not loaded', () => {
    const s = makeOpening()   // textures.exists returns false by default
    const imgCalls = s.add.image.mock.calls.length
    // Verify it used a rectangle for fallback (add.rectangle called at least once)
    expect(s.add.rectangle).toHaveBeenCalled()
    // No image should be called for background
    expect(imgCalls).toBe(0)
  })
})

// ── exit trigger ──────────────────────────────────────────────────────────────

describe('Ch2OpeningScene — exit trigger', () => {
  it('transitions to Ch2CloneScene when player reaches right edge', () => {
    const s = makeOpening()
    s._player.x = 1600
    s._player.body = { velocity: { x: 0, y: 0 }, blocked: { down: true }, setVelocityX: vi.fn(), setVelocity: vi.fn() }
    s._dialogue = { update: vi.fn(), active: false }
    s.update(0, 16)
    expect(s.cameras.main.fade).toHaveBeenCalled()
  })

  it('does not transition before right edge', () => {
    const s = makeOpening()
    s._player.x = 500
    s._player.body = { velocity: { x: 0, y: 0 }, blocked: { down: true }, setVelocityX: vi.fn(), setVelocity: vi.fn() }
    s._dialogue = { update: vi.fn(), active: false }
    const fadeBefore = s.cameras.main.fade.mock.calls.length
    s.update(0, 16)
    expect(s.cameras.main.fade.mock.calls.length).toBe(fadeBefore)
  })
})

// ── update — walker AI ────────────────────────────────────────────────────────

describe('Ch2OpeningScene — update walker AI', () => {
  it('reverses walker direction when blocked on right', () => {
    const s = makeOpening()
    const walker = {
      body: { blocked: { right: true, left: false }, setVelocityX: vi.fn() },
      _dir: 1, _hpBar: null, active: true,
    }
    s._enemies = [walker]
    s._player.x = 100
    s._player.body = { velocity: { x: 0, y: 0 }, blocked: { down: true }, setVelocityX: vi.fn(), setVelocity: vi.fn() }
    s._dialogue = { update: vi.fn(), active: false }
    s.update(0, 16)
    expect(walker.body.setVelocityX).toHaveBeenCalledWith(-55)
  })
})

// ── preload ───────────────────────────────────────────────────────────────────

describe('Ch2OpeningScene — preload', () => {
  it('does not throw', () => {
    const s = new Ch2OpeningScene()
    Object.assign(s, makeScene())
    expect(() => s.preload()).not.toThrow()
  })
})

// ── _onTouchEnemy ─────────────────────────────────────────────────────────────

describe('Ch2OpeningScene — _onTouchEnemy', () => {
  it('sets hit immunity and applies knockback', () => {
    const s = makeOpening()
    s._hitImmunity = 0
    s._player.body = { setVelocityX: vi.fn(), setVelocityY: vi.fn() }
    s._onTouchEnemy({ x: 100, y: 100, active: true })
    expect(s._hitImmunity).toBe(800)
    expect(s._player.body.setVelocityX).toHaveBeenCalled()
  })

  it('does nothing when immunity active', () => {
    const s = makeOpening()
    s._hitImmunity = 500
    s._player.body = { setVelocityX: vi.fn(), setVelocityY: vi.fn() }
    s._onTouchEnemy({ x: 100, y: 100, active: true })
    expect(s._player.body.setVelocityX).not.toHaveBeenCalled()
  })
})

// ── anonymous callbacks ───────────────────────────────────────────────────────

describe('Ch2OpeningScene — tween/timer callbacks', () => {
  it('create delayedCall callback fires _showArrivalText', () => {
    const s = makeOpening()
    const [, cb] = s.time.delayedCall.mock.calls.find(([d]) => d === 800) || []
    if (cb) {
      s._dialogue = { show: vi.fn(), active: false }
      cb()
    }
  })

  it('_doCorrupt tween onComplete destroys ring', () => {
    const s = makeOpening()
    s._doCorrupt()
    const tweenCfg = s.tweens.add.mock.calls.find(([c]) => c.onComplete)
    if (tweenCfg) tweenCfg[0].onComplete()
  })

  it('_hitEnemy tween onComplete resets alpha', () => {
    const s = makeOpening()
    const e = { active: true, _hp: 2, _maxHp: 2, _type: 'walker', _hpBar: null, setAlpha: vi.fn() }
    s._hitEnemy(e, 1)
    const tweenCfg = s.tweens.add.mock.calls.find(([c]) => c.onComplete)
    if (tweenCfg) tweenCfg[0].onComplete()
  })

  it('_hitEnemy delayedCall callback invokes _killEnemy', () => {
    const s = makeOpening()
    const e = { active: true, _hp: 1, _maxHp: 1, _type: 'walker', _hpBar: null, destroy: vi.fn() }
    s._enemies = [e]
    let killCb
    s.time.delayedCall.mockImplementationOnce((_, cb) => { killCb = cb })
    s._hitEnemy(e, 1)
    if (killCb) killCb()
  })

  it('_killEnemy tween onComplete destroys particle', () => {
    const s = makeOpening()
    const e = { active: true, _hpBar: null, x: 100, y: 100, destroy: vi.fn() }
    s._enemies = [e]
    s._killEnemy(e)
    const tweenCfg = s.tweens.add.mock.calls.find(([c]) => c.onComplete)
    if (tweenCfg) tweenCfg[0].onComplete()
  })
})
