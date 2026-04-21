import { describe, it, expect, vi } from 'vitest'
import { makeScene } from '../__mocks__/phaser.js'
import { Dialogue } from '../ui/Dialogue.js'

function makeDialogue() {
  const scene = makeScene()
  const d = new Dialogue(scene)
  return { d, scene }
}

describe('Dialogue', () => {
  describe('constructor', () => {
    it('starts inactive', () => {
      const { d } = makeDialogue()
      expect(d.active).toBe(false)
    })

    it('creates background rectangle', () => {
      const { scene } = makeDialogue()
      expect(scene.add.rectangle).toHaveBeenCalled()
    })
  })

  describe('show', () => {
    it('sets active to true', () => {
      const { d } = makeDialogue()
      d.show('slop', ['hello world'], () => {})
      expect(d.active).toBe(true)
    })

    it('stores the speaker name', () => {
      const { d } = makeDialogue()
      d.show('the prior', ['line'], () => {})
      expect(d._speakerName).toBe('the prior')
    })

    it('stores the lines array', () => {
      const { d } = makeDialogue()
      const lines = ['line one', 'line two']
      d.show('slop', lines, () => {})
      expect(d._lines).toEqual(lines)
    })

    it('resets lineIdx to 0', () => {
      const { d } = makeDialogue()
      d._lineIdx = 5
      d.show('slop', ['hi'], () => {})
      expect(d._lineIdx).toBe(0)
    })

    it('calls _typeLine (timer event is registered)', () => {
      const { d, scene } = makeDialogue()
      d.show('slop', ['hello'], () => {})
      expect(scene.time.addEvent).toHaveBeenCalled()
    })
  })

  describe('_advance', () => {
    it('skips to end of line when still typing', () => {
      const { d } = makeDialogue()
      d._lines = ['hello world']
      d._lineIdx = 0
      d._charIdx = 3
      d._typeEvent = { remove: vi.fn() }
      d._advance()
      expect(d._body._text).toBe('hello world')
    })

    it('moves to next line when current line is complete', () => {
      const { d } = makeDialogue()
      d._lines = ['line one', 'line two']
      d._lineIdx = 0
      d._charIdx = 8  // full length of 'line one'
      d._typeEvent = { remove: vi.fn() }
      d._advance()
      expect(d._lineIdx).toBe(1)
    })

    it('calls onComplete and closes when last line is advanced', () => {
      const { d } = makeDialogue()
      const cb = vi.fn()
      d._lines = ['only line']
      d._lineIdx = 0
      d._charIdx = 9  // full length
      d._onComplete = cb
      d._typeEvent = { remove: vi.fn() }
      d._advance()
      expect(cb).toHaveBeenCalled()
      expect(d.active).toBe(false)
    })
  })

  describe('_close', () => {
    it('sets active to false', () => {
      const { d } = makeDialogue()
      d.active = true
      d._typeEvent = null
      d._close()
      expect(d.active).toBe(false)
    })

    it('calls onComplete callback', () => {
      const { d } = makeDialogue()
      const cb = vi.fn()
      d._onComplete = cb
      d._typeEvent = null
      d._close()
      expect(cb).toHaveBeenCalled()
    })

    it('removes the type event if one is pending', () => {
      const { d } = makeDialogue()
      const ev = { remove: vi.fn() }
      d._typeEvent = ev
      d._close()
      expect(ev.remove).toHaveBeenCalled()
    })
  })

  describe('update', () => {
    it('does nothing when inactive', () => {
      const { d } = makeDialogue()
      d.active = false
      const advanceSpy = vi.spyOn(d, '_advance')
      d.update()
      expect(advanceSpy).not.toHaveBeenCalled()
    })

    it('calls _advance when active and JustDown fires', async () => {
      const { d } = makeDialogue()
      d._lines = ['hello']
      d._lineIdx = 0
      d._charIdx = 5  // fully typed
      d._typeEvent = { remove: vi.fn() }
      d._onComplete = vi.fn()
      d.active = true
      // Make JustDown return true this one time
      const Phaser = (await import('../__mocks__/phaser.js')).default
      vi.mocked(Phaser.Input.Keyboard.JustDown).mockReturnValueOnce(true)
      d.update()
      // _advance was called — dialogue should now be closed
      expect(d.active).toBe(false)
    })
  })

  describe('_typeLine callback', () => {
    it('types characters one by one via the timer callback', () => {
      const { d, scene } = makeDialogue()
      d._lines = ['hi']
      d._lineIdx = 0
      d._speakerName = 'slop'
      d._typeLine()

      // Capture and invoke the addEvent callback
      const eventOpts = scene.time.addEvent.mock.calls[0][0]
      expect(eventOpts.callback).toBeDefined()

      // Fire callback once — should type first character
      eventOpts.callback()
      expect(d._body._text).toBe('h')

      // Fire again — should type second character and show arrow
      eventOpts.callback()
      expect(d._body._text).toBe('hi')
    })
  })
})
