import { describe, it, expect, vi } from 'vitest'
import { TitleScene } from '../scenes/TitleScene.js'

function makeTitle() {
  return new TitleScene()
}

describe('TitleScene', () => {
  describe('create', () => {
    it('runs without throwing', () => {
      const t = makeTitle()
      expect(() => t.create()).not.toThrow()
    })

    it('sets _ready to false initially', () => {
      const t = makeTitle()
      t.create()
      expect(t._ready).toBe(false)
    })

    it('calls fadeIn on the camera', () => {
      const t = makeTitle()
      t.create()
      expect(t.cameras.main.fadeIn).toHaveBeenCalled()
    })

    it('registers keyboard and pointer listeners', () => {
      const t = makeTitle()
      t.create()
      expect(t.input.keyboard.on).toHaveBeenCalledWith('keydown', expect.any(Function))
      expect(t.input.on).toHaveBeenCalledWith('pointerdown', expect.any(Function))
    })
  })

  describe('_proceed', () => {
    it('does nothing if not ready', () => {
      const t = makeTitle()
      t.create()
      t._ready = false
      t._proceed()
      expect(t.cameras.main.fade).not.toHaveBeenCalled()
    })

    it('triggers camera fade and starts MenuScene when ready', () => {
      const t = makeTitle()
      t.create()
      t._ready = true
      t._proceed()
      expect(t.cameras.main.fade).toHaveBeenCalled()
      // Simulate fade complete
      const fadeCb = t.cameras.main.fade.mock.calls[0][5]
      fadeCb(null, 1)
      expect(t.scene.start).toHaveBeenCalledWith('MenuScene')
    })

    it('sets _ready to false to prevent double-fire', () => {
      const t = makeTitle()
      t.create()
      t._ready = true
      t._proceed()
      expect(t._ready).toBe(false)
    })
  })

  describe('create — callback coverage', () => {
    it('fires the addEvent glitch callback without throwing', () => {
      const t = makeTitle()
      t.create()
      const opts = t.time.addEvent.mock.calls[0][0]
      const orig = Math.random
      Math.random = () => 0.1  // < 0.3 → enters tint branch
      expect(() => opts.callback()).not.toThrow()
      Math.random = orig
    })

    it('fires the addEvent callback with random >= 0.3 (no tint branch)', () => {
      const t = makeTitle()
      t.create()
      const opts = t.time.addEvent.mock.calls[0][0]
      const orig = Math.random
      Math.random = () => 0.9  // >= 0.3 → skips tint
      expect(() => opts.callback()).not.toThrow()
      Math.random = orig
    })

    it('fires the tween onComplete callback without throwing', () => {
      const t = makeTitle()
      t.create()
      const withComplete = t.tweens.add.mock.calls.find(c => c[0].onComplete)
      expect(withComplete).toBeTruthy()
      expect(() => withComplete[0].onComplete()).not.toThrow()
    })
  })
})
