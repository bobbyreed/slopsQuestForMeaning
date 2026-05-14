import { describe, it, expect, vi } from 'vitest'
import { makeScene }     from '../__mocks__/phaser.js'
import { Ch2TownScene }  from '../scenes/ch2/Ch2TownScene.js'
import Phaser            from '../__mocks__/phaser.js'

function makeTown(slopState = {}) {
  const s = new Ch2TownScene()
  Object.assign(s, makeScene())
  s.init({ slopState })
  s.create()
  return s
}

// ── init ──────────────────────────────────────────────────────────────────────

describe('Ch2TownScene — init', () => {
  it('stores slopState', () => {
    const s = makeTown({ chapter2Unlocked: true })
    expect(s._slopState.chapter2Unlocked).toBe(true)
  })

  it('starts with no NPCs triggered', () => {
    const s = makeTown()
    expect(s._npcTriggered.size).toBe(0)
  })

  it('starts not transitioning', () => {
    const s = makeTown()
    expect(s._transitioning).toBe(false)
  })
})

// ── create ────────────────────────────────────────────────────────────────────

describe('Ch2TownScene — create', () => {
  it('does not throw', () => {
    expect(() => makeTown()).not.toThrow()
  })

  it('creates player', () => {
    const s = makeTown()
    expect(s._player).toBeDefined()
  })

  it('spawns 3 NPCs', () => {
    const s = makeTown()
    expect(s._npcs).toHaveLength(3)
  })

  it('creates dialogue', () => {
    const s = makeTown()
    expect(s._dialogue).toBeDefined()
  })
})

// ── jump gate ─────────────────────────────────────────────────────────────────

describe('Ch2TownScene — jump gate', () => {
  it('cannot jump before ability granted', () => {
    const s = makeTown()
    expect(s._canJump()).toBe(false)
  })

  it('can jump after ch2JumpUnlocked is true', () => {
    const s = makeTown({ ch2JumpUnlocked: true })
    expect(s._canJump()).toBe(true)
  })
})

// ── _giveJump ─────────────────────────────────────────────────────────────────

describe('Ch2TownScene — _giveJump', () => {
  it('sets ch2JumpUnlocked on slopState', () => {
    const s = makeTown()
    s._giveJump(() => {})
    expect(s._slopState.ch2JumpUnlocked).toBe(true)
  })

  it('flashes camera', () => {
    const s = makeTown()
    s._giveJump(() => {})
    expect(s.cameras.main.flash).toHaveBeenCalled()
  })

  it('schedules after-dialogue via delayedCall', () => {
    const s = makeTown()
    s._giveJump(() => {})
    expect(s.time.delayedCall).toHaveBeenCalled()
  })
})

// ── NPC proximity ─────────────────────────────────────────────────────────────

describe('Ch2TownScene — NPC proximity', () => {
  it('triggers first NPC dialogue when player is close', () => {
    const s = makeTown()
    s._dialogue = { show: vi.fn(), update: vi.fn(), active: false }
    const npc = s._npcs[0]
    npc.sprite.x = 260
    npc.sprite.y = H - 60
    s._player.x = 265
    s._player.y = H - 60
    s._player.body = { velocity: { x: 0, y: 0 }, blocked: { down: true }, setVelocityX: vi.fn(), setVelocity: vi.fn() }
    s.update(0, 16)
    expect(s._dialogue.show).toHaveBeenCalledWith('resident', expect.any(Array), expect.any(Function))
  })

  it('does not retrigger a triggered NPC', () => {
    const s = makeTown()
    s._dialogue = { show: vi.fn(), update: vi.fn(), active: false }
    const npc = s._npcs[0]
    npc.triggered = true
    npc.sprite.x = 260
    npc.sprite.y = H - 60
    s._player.x = 265
    s._player.y = H - 60
    s._player.body = { velocity: { x: 0, y: 0 }, blocked: { down: true }, setVelocityX: vi.fn(), setVelocity: vi.fn() }
    s.update(0, 16)
    expect(s._dialogue.show).not.toHaveBeenCalled()
  })

  it('third NPC triggers jump ability when approached', () => {
    const s = makeTown()
    let giveJumpCalled = false
    s._giveJump = vi.fn(() => { giveJumpCalled = true })
    s._dialogue = { show: vi.fn((_, __, cb) => {}), update: vi.fn(), active: false }
    const npc = s._npcs[2]  // keeper — the one who gives jump
    npc.sprite.x = 1020
    npc.sprite.y = H - 60
    s._player.x = 1025
    s._player.y = H - 60
    s._player.body = { velocity: { x: 0, y: 0 }, blocked: { down: true }, setVelocityX: vi.fn(), setVelocity: vi.fn() }
    s.update(0, 16)
    // The show callback calls _giveJump — verify dialogue was called with linesBeforeGive
    const call = s._dialogue.show.mock.calls[0]
    expect(call[0]).toBe('keeper')
    expect(Array.isArray(call[1])).toBe(true)
  })
})

// ── _buildBackground image branch ────────────────────────────────────────────

describe('Ch2TownScene — _buildBackground', () => {
  it('uses image when texture is loaded', () => {
    const s = new Ch2TownScene()
    Object.assign(s, makeScene())
    s.textures.exists.mockReturnValue(true)
    s.init({})
    s.create()
    expect(s.add.image).toHaveBeenCalled()
  })
})

// ── _updateJumpHint ───────────────────────────────────────────────────────────

describe('Ch2TownScene — _updateJumpHint', () => {
  it('updates hint text once when jump is unlocked', () => {
    const s = makeTown({ ch2JumpUnlocked: true })
    const hint = { setText: vi.fn() }
    s._jumpHint = hint
    s._updateJumpHint()
    expect(hint.setText).toHaveBeenCalledWith(expect.stringContaining('jump'))
  })

  it('does not update hint a second time', () => {
    const s = makeTown({ ch2JumpUnlocked: true })
    const hint = { setText: vi.fn() }
    s._jumpHint = hint
    s._hintUpdated = true
    s._updateJumpHint()
    expect(hint.setText).not.toHaveBeenCalled()
  })

  it('does not update hint before jump unlocked', () => {
    const s = makeTown()
    const hint = { setText: vi.fn() }
    s._jumpHint = hint
    s._updateJumpHint()
    expect(hint.setText).not.toHaveBeenCalled()
  })
})

// ── exit trigger ──────────────────────────────────────────────────────────────

describe('Ch2TownScene — exit trigger', () => {
  it('transitions to PlatformerWorldScene at right edge', () => {
    const s = makeTown()
    s._player.x = 1300
    s._player.body = { velocity: { x: 0, y: 0 }, blocked: { down: true }, setVelocityX: vi.fn(), setVelocity: vi.fn() }
    s._dialogue = { update: vi.fn(), active: false }
    s.update(0, 16)
    expect(s.cameras.main.fade).toHaveBeenCalled()
  })

  it('passes updated slopState including ch2JumpUnlocked', () => {
    const s = makeTown()
    s._slopState = { ...s._slopState, ch2JumpUnlocked: true }
    s._player.x = 1300
    s._player.body = { velocity: { x: 0, y: 0 }, blocked: { down: true }, setVelocityX: vi.fn(), setVelocity: vi.fn() }
    s._dialogue = { update: vi.fn(), active: false }
    s.cameras.main.fade.mockImplementation((_, r, g, b, _fromBlack, cb) => cb(null, 1))
    s.update(0, 16)
    expect(s.scene.start).toHaveBeenCalledWith('PlatformerWorldScene', expect.objectContaining({
      slopState: expect.objectContaining({ ch2JumpUnlocked: true }),
    }))
  })
})

// ── movement with jump ────────────────────────────────────────────────────────

describe('Ch2TownScene — movement', () => {
  it('player moves right when right key is held', () => {
    const s = makeTown()
    s._dialogue = { update: vi.fn(), active: false }
    s._npcs.forEach(n => { n.triggered = true })
    s._cursors.right.isDown = true
    s._player.body = { velocity: { x: 0, y: 0 }, blocked: { down: true }, setVelocityX: vi.fn(), setVelocity: vi.fn() }
    s.update(0, 16)
    expect(s._player.body.setVelocityX).toHaveBeenCalledWith(190)
    expect(s._facing).toBe(1)
  })

  it('player does not jump before ability granted', () => {
    const s = makeTown()
    s._dialogue = { update: vi.fn(), active: false }
    s._npcs.forEach(n => { n.triggered = true })
    s._player.body = { velocity: { x: 0, y: 0 }, blocked: { down: true }, setVelocityX: vi.fn(), setVelocity: vi.fn(), setVelocityY: vi.fn() }
    vi.mocked(Phaser.Input.Keyboard.JustDown).mockReturnValueOnce(true)
    s.update(0, 16)
    expect(s._player.body.setVelocityY).not.toHaveBeenCalled()
  })

  it('player jumps after ability granted', () => {
    const s = makeTown({ ch2JumpUnlocked: true })
    s._dialogue = { update: vi.fn(), active: false }
    s._npcs.forEach(n => { n.triggered = true })
    s._player.body = { velocity: { x: 0, y: 0 }, blocked: { down: true }, setVelocityX: vi.fn(), setVelocity: vi.fn(), setVelocityY: vi.fn() }
    vi.mocked(Phaser.Input.Keyboard.JustDown).mockReturnValueOnce(true)
    s.update(0, 16)
    expect(s._player.body.setVelocityY).toHaveBeenCalledWith(-460)
  })
})

// ── preload ───────────────────────────────────────────────────────────────────

describe('Ch2TownScene — preload', () => {
  it('does not throw', () => {
    const s = new Ch2TownScene()
    Object.assign(s, makeScene())
    expect(() => s.preload()).not.toThrow()
  })
})

const H = 600
