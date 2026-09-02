import { describe, it, expect, beforeEach } from 'vitest'
import Phaser from '../__mocks__/phaser.js'
import { Ch3CreditsScene } from '../scenes/ch3/Ch3CreditsScene.js'
import { ENDING } from '../scenes/ch3/Ch3BossScene.js'

function makeCredits(ending = ENDING.TOOK, slopState = {}) {
  const c = new Ch3CreditsScene()
  c.init({ ending, slopState })
  c.create()
  return c
}

/** Scroll far enough that the whole roll has passed off the top. */
function runToEnd(c) {
  for (let i = 0; i < 4000 && !c._done; i++) c.update(0, 100)
  return c
}

beforeEach(() => {
  Phaser.Input.Keyboard.JustDown.mockReset()
  Phaser.Input.Keyboard.JustDown.mockReturnValue(false)
})

describe('Ch3CreditsScene', () => {
  it('builds without throwing', () => {
    expect(() => makeCredits()).not.toThrow()
  })

  it('defaults to an ending when handed none', () => {
    const c = new Ch3CreditsScene()
    c.init({})
    expect(c._ending).toBe(ENDING.TOOK)
  })

  describe('the two epilogues', () => {
    it('taking the pen ends with him answering', () => {
      const c = makeCredits(ENDING.TOOK)
      const text = c._lines.map(l => l[1] || '').join(' ')
      expect(text).toContain('he takes the pen')
      expect(text).toContain('he is going to say.')
    })

    it('leaving the pen ends with him not answering', () => {
      const c = makeCredits(ENDING.LEFT)
      const text = c._lines.map(l => l[1] || '').join(' ')
      expect(text).toContain('he leaves it there')
      expect(text).toContain('he says nothing.')
    })

    it('both endings make him the prior', () => {
      for (const e of [ENDING.TOOK, ENDING.LEFT]) {
        const text = makeCredits(e)._lines.map(l => l[1] || '').join(' ')
        expect(text).toContain('he is the prior now')
      }
    })

    it('both endings roll the same credits after the epilogue', () => {
      for (const e of [ENDING.TOOK, ENDING.LEFT]) {
        const text = makeCredits(e)._lines.map(l => l[1] || '').join(' ')
        expect(text).toContain('Claude (Anthropic)')
        expect(text).toContain('thank you for going all the way up.')
      }
    })
  })

  describe('scrolling', () => {
    it('moves the lines up over time', () => {
      const c = makeCredits()
      c.update(0, 1000)
      const before = c._texts[0].t.y
      c.update(0, 1000)
      expect(c._texts[0].t.y).toBeLessThan(before)
    })

    it('places every line at its base position minus the scroll offset', () => {
      const c = makeCredits()
      c.update(0, 1000)
      for (const { t, baseY } of c._texts) {
        expect(t.y).toBe(baseY - c._offset)
      }
    })

    it('holding SPACE scrolls faster', () => {
      const slow = makeCredits()
      slow.update(0, 1000)

      const fast = makeCredits()
      fast._spaceKey.isDown = true
      fast.update(0, 1000)

      expect(fast._offset).toBeGreaterThan(slow._offset)
    })

    it('finishes once the roll passes the top and shows the end card', () => {
      const c = runToEnd(makeCredits())
      expect(c._done).toBe(true)
      expect(c._endCard.text).toContain('SPACE')
    })

    it('stops scrolling once finished', () => {
      const c = runToEnd(makeCredits())
      const offset = c._offset
      c.update(0, 1000)
      expect(c._offset).toBe(offset)
    })
  })

  describe('leaving', () => {
    it('does not return to the menu before the roll finishes', () => {
      const c = makeCredits()
      Phaser.Input.Keyboard.JustDown.mockReturnValue(true)
      c.update(0, 16)
      expect(c.cameras.main.fade).not.toHaveBeenCalled()
    })

    it('returns to the menu on SPACE once finished', () => {
      const c = runToEnd(makeCredits())
      Phaser.Input.Keyboard.JustDown.mockReturnValue(true)
      c.update(0, 16)
      const fadeCb = c.cameras.main.fade.mock.calls.at(-1)[5]
      fadeCb(null, 1)
      expect(c.scene.start).toHaveBeenCalledWith('MenuScene')
    })

    it('ignores further input while leaving', () => {
      const c = runToEnd(makeCredits())
      Phaser.Input.Keyboard.JustDown.mockReturnValue(true)
      c.update(0, 16)
      const calls = c.cameras.main.fade.mock.calls.length
      c.update(0, 16)
      expect(c.cameras.main.fade.mock.calls.length).toBe(calls)
    })
  })
})
