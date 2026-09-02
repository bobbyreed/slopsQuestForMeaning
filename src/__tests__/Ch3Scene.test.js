import { describe, it, expect, vi } from 'vitest'
import { makeScene } from '../__mocks__/phaser.js'
import Phaser        from '../__mocks__/phaser.js'
import { Ch3Scene }  from '../scenes/ch2/Ch3Scene.js'

function makeCh3(slopState = {}) {
  const s = new Ch3Scene()
  Object.assign(s, makeScene())
  s.init({ slopState })
  s.create()
  return s
}

describe('Ch3Scene — init', () => {
  it('stores slopState', () => {
    const s = new Ch3Scene()
    s.init({ slopState: { coinCount: 7 } })
    expect(s._slopState.coinCount).toBe(7)
  })

  it('defaults missing slopState', () => {
    const s = new Ch3Scene()
    s.init(undefined)
    expect(s._slopState).toEqual({})
  })

  it('starts not returning', () => {
    const s = new Ch3Scene()
    s.init({})
    expect(s._returning).toBe(false)
  })
})

describe('Ch3Scene — create', () => {
  it('does not throw', () => {
    expect(() => makeCh3()).not.toThrow()
  })

  it('marks chapter2Complete on the carried state', () => {
    const s = makeCh3({ ch2JumpUnlocked: true })
    expect(s._slopState.chapter2Complete).toBe(true)
    expect(s._slopState.ch2JumpUnlocked).toBe(true)
  })

  it('fades in', () => {
    const s = makeCh3()
    expect(s.cameras.main.fadeIn).toHaveBeenCalled()
  })
})

describe('Ch3Scene — update', () => {
  it('advances into Ch3StageScene when SPACE/ENTER is pressed', () => {
    const s = makeCh3()
    const spy = vi.spyOn(Phaser.Input.Keyboard, 'JustDown').mockReturnValue(true)
    s.cameras.main.fade.mockImplementation((_, r, g, b, _fromBlack, cb) => cb(null, 1))
    s.update()
    expect(s.scene.start).toHaveBeenCalledWith('Ch3StageScene', expect.any(Object))
    spy.mockRestore()
  })

  it('does nothing while no key is pressed', () => {
    const s = makeCh3()
    s.update()
    expect(s.scene.start).not.toHaveBeenCalled()
  })

  it('ignores input once already returning', () => {
    const s = makeCh3()
    s._returning = true
    const spy = vi.spyOn(Phaser.Input.Keyboard, 'JustDown').mockReturnValue(true)
    s.update()
    expect(s.scene.start).not.toHaveBeenCalled()
    spy.mockRestore()
  })
})

// Regression: pressing SPACE during the scene's own 800ms fadeIn used to lock
// the game permanently. camera.fade(..., force=false, cb) is a no-op while any
// fade effect is already running, so the callback never fired — but _returning
// had already been set, and update() returns early forever after that. Found by
// the zombie client; every fade transition in the game had the same shape.
describe('Ch3Scene — advancing during the fade-in', () => {
  it('forces the fade so the transition cannot be swallowed', () => {
    const s = new Ch3Scene()
    s.init({ slopState: {} })
    s.create()
    const spy = vi.spyOn(Phaser.Input.Keyboard, 'JustDown').mockReturnValue(true)
    s.update()
    spy.mockRestore()

    expect(s.cameras.main.fade).toHaveBeenCalled()
    const force = s.cameras.main.fade.mock.calls.at(-1)[4]
    expect(force).toBe(true)
  })

  it('still reaches the stage when the forced fade completes', () => {
    const s = new Ch3Scene()
    s.init({ slopState: {} })
    s.create()
    const spy = vi.spyOn(Phaser.Input.Keyboard, 'JustDown').mockReturnValue(true)
    s.update()
    spy.mockRestore()
    s.cameras.main.fade.mock.calls.at(-1)[5](null, 1)
    expect(s.scene.start).toHaveBeenCalledWith('Ch3StageScene', expect.any(Object))
  })
})
