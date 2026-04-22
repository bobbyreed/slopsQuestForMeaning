import { describe, it, expect, vi } from 'vitest'
import { EastScene } from '../scenes/EastScene.js'
import { W, H } from '../config/constants.js'

function makeScene(data = {}) {
  const s = new EastScene()
  s.init({ slopState: {}, ...data })
  s.create()
  return s
}

describe('EastScene', () => {
  describe('create', () => {
    it('creates without throwing', () => {
      expect(() => makeScene()).not.toThrow()
    })

    it('spawns slop at left edge by default', () => {
      const s = makeScene()
      expect(s.slop.x).toBe(60)
    })

    it('spawns slop at right edge when spawnOrigin is east', () => {
      const s = makeScene({ spawnOrigin: 'east' })
      expect(s.slop.x).toBe(W - 60)
    })
  })

  describe('_showHint', () => {
    it('shows hint text on first call', () => {
      const s = makeScene()
      const before = s.add.text.mock.calls.length
      s._showHint('test hint')
      expect(s.add.text.mock.calls.length).toBeGreaterThan(before)
    })

    it('does not show hint a second time', () => {
      const s = makeScene()
      s._showHint('first')
      const after = s.add.text.mock.calls.length
      s._showHint('second')
      expect(s.add.text.mock.calls.length).toBe(after)
    })
  })

  describe('_enterEastWorld', () => {
    it('transitions to EastB0Scene', () => {
      const s = makeScene()
      s._enterEastWorld()
      const fadeCb = s.cameras.main.fade.mock.calls[0]?.[5]
      if (fadeCb) fadeCb(null, 1)
      expect(s.scene.start).toHaveBeenCalledWith('EastB0Scene', expect.objectContaining({ spawnOrigin: 'west' }))
    })
  })

  describe('update', () => {
    it('returns early when transitioning', () => {
      const s = makeScene()
      s._transitioning = true
      expect(() => s.update(null, 16)).not.toThrow()
      expect(s.cameras.main.fade).not.toHaveBeenCalled()
    })

    it('handles basic tick without throwing', () => {
      const s = makeScene()
      expect(() => s.update(null, 16)).not.toThrow()
    })

    it('transitions west when slop exits left gap', () => {
      const s = makeScene()
      s.slop.x = 10
      s.slop.y = H / 2  // in gap (240-360)
      s.update(null, 16)
      const fadeCb = s.cameras.main.fade.mock.calls[0]?.[5]
      if (fadeCb) fadeCb(null, 1)
      expect(s.scene.start).toHaveBeenCalledWith('WorldScene', expect.objectContaining({ spawnOrigin: 'east' }))
    })

    it('does not transition west when slop is outside gap range', () => {
      const s = makeScene()
      s.slop.x = 10
      s.slop.y = 50  // above gap (top is 240)
      s.update(null, 16)
      expect(s.cameras.main.fade).not.toHaveBeenCalled()
    })

    it('applies chasm pushback when slop is in chasm at low speed', () => {
      const s = makeScene()
      s.slop.x = 390  // inside chasm (350-450)
      s.slop.body.speed = 100  // too slow
      s.update(null, 16)
      expect(s.slop.body.velocity.x).not.toBe(0)
    })

    it('does not apply pushback when slop is fast enough', () => {
      const s = makeScene()
      s.slop.x = 390
      s.slop.body.speed = 300  // fast enough (>260)
      s.update(null, 16)
      // velocity won't be forced to pushDir*280
      expect(s.slop.body.velocity.x).toBe(0)
    })

    it('transitions east after crossing the chasm', () => {
      const s = makeScene()
      s.slop.x = W - 10  // past right wall gap
      s.slop.y = H / 2   // in vertical gap range
      s.update(null, 16)
      const fadeCb = s.cameras.main.fade.mock.calls[0]?.[5]
      if (fadeCb) fadeCb(null, 1)
      expect(s.scene.start).toHaveBeenCalledWith('EastB0Scene', expect.anything())
    })
  })
})
