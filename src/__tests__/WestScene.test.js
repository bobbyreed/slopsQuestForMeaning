import { describe, it, expect } from 'vitest'
import { WestScene } from '../scenes/WestScene.js'
import { W, H } from '../config/constants.js'

function makeScene(data = {}) {
  const s = new WestScene()
  s.init({ slopState: { hasEyes: true }, ...data })
  s.create()
  return s
}

describe('WestScene', () => {
  describe('init', () => {
    it('stores spawnOrigin', () => {
      const s = new WestScene()
      s.init({ slopState: {}, spawnOrigin: 'west' })
      expect(s._spawnOrigin).toBe('west')
    })
  })

  describe('create', () => {
    it('creates without throwing', () => {
      expect(() => makeScene()).not.toThrow()
    })

    it('spawns slop at right edge by default (entry from WorldScene)', () => {
      const s = makeScene()
      expect(s.slop.x).toBe(W - 60)
    })

    it('spawns slop at left edge when spawnOrigin is west (entry from WestGateScene)', () => {
      const s = makeScene({ spawnOrigin: 'west' })
      expect(s.slop.x).toBe(60)
    })
  })

  describe('update', () => {
    it('handles basic tick without throwing', () => {
      const s = makeScene()
      expect(() => s.update(null, 16)).not.toThrow()
    })

    it('returns early when transitioning', () => {
      const s = makeScene()
      s._transitioning = true
      expect(() => s.update(null, 16)).not.toThrow()
      expect(s.cameras.main.fade).not.toHaveBeenCalled()
    })

    it('transitions east (to WorldScene) when slop exits right gap', () => {
      const s = makeScene()
      s.slop.x = W - 10
      s.slop.y = H / 2  // in vertical gap (240-360)
      s.update(null, 16)
      const fadeCb = s.cameras.main.fade.mock.calls[0]?.[5]
      if (fadeCb) fadeCb(null, 1)
      expect(s.scene.start).toHaveBeenCalledWith('WorldScene', expect.objectContaining({ spawnOrigin: 'west' }))
    })

    it('transitions west (to WestGateScene) when slop exits left gap', () => {
      const s = makeScene()
      s.slop.x = 10
      s.slop.y = H / 2  // in vertical gap (240-360)
      s.update(null, 16)
      const fadeCb = s.cameras.main.fade.mock.calls[0]?.[5]
      if (fadeCb) fadeCb(null, 1)
      expect(s.scene.start).toHaveBeenCalledWith('WestGateScene', expect.objectContaining({ spawnOrigin: 'east' }))
    })

    it('does not transition when slop is outside the gap', () => {
      const s = makeScene()
      s.slop.x = W - 10
      s.slop.y = 50  // above gap range
      s.update(null, 16)
      expect(s.cameras.main.fade).not.toHaveBeenCalled()
    })

    it('does not transition west when slop is outside the gap', () => {
      const s = makeScene()
      s.slop.x = 10
      s.slop.y = 50  // above gap range
      s.update(null, 16)
      expect(s.cameras.main.fade).not.toHaveBeenCalled()
    })
  })
})
