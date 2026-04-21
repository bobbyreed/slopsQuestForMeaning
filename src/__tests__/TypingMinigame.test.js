import { describe, it, expect, vi, beforeEach } from 'vitest'
import { makeScene } from '../__mocks__/phaser.js'
import { TypingMinigameScene } from '../scenes/TypingMinigameScene.js'

function makeMinigame(word = 'hi', returnScene = 'DungeonScene') {
  const scene = makeScene()
  const mg = new TypingMinigameScene()
  Object.assign(mg, scene)
  mg.init({ slopState: { coinCount: 1 }, targetWord: word, returnScene })
  return mg
}

describe('TypingMinigameScene', () => {
  describe('init', () => {
    it('stores the target word lowercased', () => {
      const mg = makeMinigame('EXIST')
      expect(mg._word).toBe('exist')
    })

    it('defaults word to "exist" when none provided', () => {
      const scene = makeScene()
      const mg = new TypingMinigameScene()
      Object.assign(mg, scene)
      mg.init({})
      expect(mg._word).toBe('exist')
    })

    it('stores returnScene', () => {
      const mg = makeMinigame('go', 'WorldScene')
      expect(mg._returnScene).toBe('WorldScene')
    })
  })

  describe('_onKey', () => {
    function preparedMg(word = 'hi') {
      const mg = makeMinigame(word)

      // Build minimal letter display stubs
      mg._letterDisplays = word.split('').map(() => ({
        box:    { setAlpha: vi.fn().mockReturnThis(), setFillStyle: vi.fn().mockReturnThis(), x: 0, alpha: 1 },
        text:   { setText: vi.fn().mockReturnThis(), setColor: vi.fn().mockReturnThis(), text: '' },
        result: null,
      }))
      mg._indicator    = { setFillStyle: vi.fn().mockReturnThis(), setScale: vi.fn().mockReturnThis() }
      mg._promptLabel  = { setText: vi.fn().mockReturnThis(), setColor: vi.fn().mockReturnThis() }
      mg._letterIdx = 0
      mg._waiting   = false
      mg._done      = false
      mg._sweepT    = 0.5  // inside hit zone
      return mg
    }

    it('marks result "correct" when letter matches and sweep is in zone', () => {
      const mg = preparedMg('hi')
      mg._onKey('h')
      expect(mg._letterDisplays[0].result).toBe('correct')
    })

    it('marks result "wrong" when letter matches but sweep is outside zone', () => {
      const mg = preparedMg('hi')
      mg._sweepT = 0.0  // outside zone
      mg._onKey('h')
      expect(mg._letterDisplays[0].result).toBe('wrong')
    })

    it('marks result "wrong" when wrong letter pressed (even in zone)', () => {
      const mg = preparedMg('hi')
      mg._sweepT = 0.5
      mg._onKey('z')
      expect(mg._letterDisplays[0].result).toBe('wrong')
    })

    it('ignores non-alpha keys', () => {
      const mg = preparedMg('hi')
      mg._onKey('Enter')
      expect(mg._letterDisplays[0].result).toBeNull()
      expect(mg._waiting).toBe(false)
    })

    it('ignores input when _waiting is true', () => {
      const mg = preparedMg('hi')
      mg._waiting = true
      mg._onKey('h')
      expect(mg._letterDisplays[0].result).toBeNull()
    })

    it('ignores input when _done is true', () => {
      const mg = preparedMg('hi')
      mg._done = true
      mg._onKey('h')
      expect(mg._letterDisplays[0].result).toBeNull()
    })

    it('sets _waiting after a key is accepted', () => {
      const mg = preparedMg('hi')
      mg._onKey('h')
      expect(mg._waiting).toBe(true)
    })
  })

  describe('_finish', () => {
    function finishSetup(word, allCorrect = true) {
      const mg = makeMinigame(word)
      mg._typed = Array(word.length).fill(null)
      mg._letterDisplays = word.split('').map((ch, i) => ({
        result: allCorrect ? 'correct' : 'wrong',
        text:   { text: allCorrect ? ch.toUpperCase() : '▓', setText: vi.fn().mockReturnThis(), setColor: vi.fn().mockReturnThis() },
        box:    { setFillStyle: vi.fn(), setAlpha: vi.fn().mockReturnThis() },
        indexOf: undefined,
      }))
      mg._promptLabel  = { setText: vi.fn().mockReturnThis() }
      mg._resultBanner = { setText: vi.fn().mockReturnThis(), setColor: vi.fn().mockReturnThis(), setVisible: vi.fn().mockReturnThis() }
      mg._retryText    = { setText: vi.fn().mockReturnThis(), setVisible: vi.fn().mockReturnThis() }
      return mg
    }

    it('sets _done to true', () => {
      const mg = finishSetup('ab')
      mg._finish()
      expect(mg._done).toBe(true)
    })

    it('schedules _returnToGame(true) when all letters correct', () => {
      const mg = finishSetup('ab')
      mg._returnToGame = vi.fn()

      mg._finish()

      // delayedCall is called with a callback; invoke it to simulate time passing
      const [, , cb] = mg.time.delayedCall.mock.calls[0]
      // There are two nested delays — outer fires success banner, inner fires return
      // The mock's delayedCall just stores the callback; fire outer then inner
      const outerCb = mg.time.delayedCall.mock.calls[0][1]
      outerCb?.()
      const innerCb = mg.time.delayedCall.mock.calls[1]?.[1]
      innerCb?.()

      expect(mg._returnToGame).toHaveBeenCalledWith(true)
    })
  })

  describe('_finish — failure path', () => {
    it('shows retry prompt when any letter is wrong', () => {
      const mg = makeMinigame('ab')
      mg._typed = [null, null]
      mg._letterDisplays = [
        { result: 'wrong',   text: { text: '▓', setText: vi.fn().mockReturnThis(), setColor: vi.fn().mockReturnThis() }, box: { setFillStyle: vi.fn(), setAlpha: vi.fn().mockReturnThis() } },
        { result: 'correct', text: { text: 'B', setText: vi.fn().mockReturnThis(), setColor: vi.fn().mockReturnThis() }, box: { setFillStyle: vi.fn(), setAlpha: vi.fn().mockReturnThis() } },
      ]
      mg._promptLabel  = { setText: vi.fn().mockReturnThis() }
      mg._resultBanner = { setText: vi.fn().mockReturnThis(), setColor: vi.fn().mockReturnThis(), setVisible: vi.fn().mockReturnThis() }
      mg._retryText    = { setText: vi.fn().mockReturnThis(), setVisible: vi.fn().mockReturnThis() }

      mg._finish()

      const outerCb = mg.time.delayedCall.mock.calls[0][1]
      outerCb?.()

      // retry text should be shown
      expect(mg._retryText.setVisible).toHaveBeenCalledWith(true)
    })
  })

  describe('_beginLetter', () => {
    it('calls _finish when all letters have been typed', () => {
      const mg = makeMinigame('hi')
      mg._letterDisplays = [
        { result: null, box: { setAlpha: vi.fn().mockReturnThis() }, text: { setText: vi.fn().mockReturnThis(), setColor: vi.fn().mockReturnThis() } },
        { result: null, box: { setAlpha: vi.fn().mockReturnThis() }, text: { setText: vi.fn().mockReturnThis(), setColor: vi.fn().mockReturnThis() } },
      ]
      mg._promptLabel = { setText: vi.fn().mockReturnThis(), setColor: vi.fn().mockReturnThis() }
      mg._resultBanner = { setText: vi.fn().mockReturnThis(), setColor: vi.fn().mockReturnThis(), setVisible: vi.fn().mockReturnThis() }
      mg._retryText    = { setText: vi.fn().mockReturnThis(), setVisible: vi.fn().mockReturnThis() }
      mg._typed        = [null, null]
      mg._letterIdx    = 2  // past end of word
      mg._done         = false
      mg._beginLetter()
      expect(mg._done).toBe(true)
    })

    it('sets prompt label for current letter', () => {
      const mg = makeMinigame('hi')
      mg._letterDisplays = [
        { result: null, box: { setAlpha: vi.fn().mockReturnThis() }, text: { setText: vi.fn().mockReturnThis(), setColor: vi.fn().mockReturnThis() } },
        { result: null, box: { setAlpha: vi.fn().mockReturnThis() }, text: { setText: vi.fn().mockReturnThis(), setColor: vi.fn().mockReturnThis() } },
      ]
      mg._promptLabel  = { setText: vi.fn().mockReturnThis(), setColor: vi.fn().mockReturnThis() }
      mg._letterIdx    = 0
      mg._beginLetter()
      expect(mg._promptLabel.setText).toHaveBeenCalledWith('press: [ H ]')
    })
  })

  describe('_returnToGame', () => {
    it('prevents double-fire via _transitioning flag', () => {
      const mg = makeMinigame()
      mg._transitioning = true
      mg._returnToGame(true)
      expect(mg.cameras.main.fade).not.toHaveBeenCalled()
    })

    it('starts the return scene with unlocked=true', () => {
      const mg = makeMinigame('exist', 'DungeonScene')
      mg._returnToGame(true)
      const fadeCb = mg.cameras.main.fade.mock.calls[0][5]
      fadeCb(null, 1)
      expect(mg.scene.start).toHaveBeenCalledWith('DungeonScene', expect.objectContaining({ unlocked: true }))
    })
  })

  describe('update — sweep bar', () => {
    it('advances sweepT when not waiting', () => {
      const mg = makeMinigame()
      mg._done    = false
      mg._waiting = false
      mg._sweepT  = 0
      mg._sweepDir = 1
      mg._barBg   = { x: 400 }
      mg._indicator = { x: 0, setFillStyle: vi.fn().mockReturnThis(), setScale: vi.fn().mockReturnThis() }
      mg._hitZone = { setFillStyle: vi.fn() }
      mg._barW    = 400

      mg.update(null, 900)  // half of SWEEP_DURATION

      expect(mg._sweepT).toBeGreaterThan(0)
    })

    it('reverses direction when sweepT reaches 1', () => {
      const mg = makeMinigame()
      mg._done    = false
      mg._waiting = false
      mg._sweepT  = 0.99
      mg._sweepDir = 1
      mg._barBg    = { x: 400 }
      mg._indicator = { x: 0, setFillStyle: vi.fn().mockReturnThis(), setScale: vi.fn().mockReturnThis() }
      mg._hitZone  = { setFillStyle: vi.fn() }
      mg._barW     = 400

      mg.update(null, 200)

      expect(mg._sweepDir).toBe(-1)
    })

    it('calls scene.restart when retry key is pressed in done state', async () => {
      const mg = makeMinigame('hi', 'DungeonScene')
      mg._done = true
      mg._retryKey = {}
      mg._escKey   = null
      const Phaser = (await import('../__mocks__/phaser.js')).default
      vi.mocked(Phaser.Input.Keyboard.JustDown).mockReturnValueOnce(true)
      mg.update(null, 16)
      expect(mg.scene.restart).toHaveBeenCalled()
    })

    it('calls _returnToGame(false) when esc key is pressed in done state', async () => {
      const mg = makeMinigame('hi', 'DungeonScene')
      mg._done     = true
      mg._retryKey = null
      mg._escKey   = {}
      mg._transitioning = false
      const Phaser = (await import('../__mocks__/phaser.js')).default
      vi.mocked(Phaser.Input.Keyboard.JustDown).mockReturnValueOnce(true)
      mg.update(null, 16)
      expect(mg.cameras.main.fade).toHaveBeenCalled()
    })
  })

  describe('_onKey — delayedCall callback', () => {
    it('fires the post-keypress delay callback without throwing', () => {
      const mg = makeMinigame('hi')
      mg._letterDisplays = 'hi'.split('').map(() => ({
        box:    { setAlpha: vi.fn().mockReturnThis(), setFillStyle: vi.fn().mockReturnThis(), x: 0, alpha: 1 },
        text:   { setText: vi.fn().mockReturnThis(), setColor: vi.fn().mockReturnThis(), text: '' },
        result: null,
      }))
      mg._indicator   = { setFillStyle: vi.fn().mockReturnThis(), setScale: vi.fn().mockReturnThis() }
      mg._promptLabel = { setText: vi.fn().mockReturnThis(), setColor: vi.fn().mockReturnThis() }
      mg._resultBanner = { setText: vi.fn().mockReturnThis(), setColor: vi.fn().mockReturnThis(), setVisible: vi.fn().mockReturnThis() }
      mg._retryText   = { setText: vi.fn().mockReturnThis(), setVisible: vi.fn().mockReturnThis() }
      mg._letterIdx   = 0
      mg._waiting     = false
      mg._done        = false
      mg._sweepT      = 0.5

      mg._onKey('h')

      // Fire the delayedCall callback to advance to next letter
      const cb = mg.time.delayedCall.mock.calls[0][1]
      expect(() => cb()).not.toThrow()
      expect(mg._waiting).toBe(false)
      expect(mg._letterIdx).toBe(1)
    })
  })
})
