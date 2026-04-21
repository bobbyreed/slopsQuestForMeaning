import { describe, it, expect } from 'vitest'
import { BootScene } from '../scenes/BootScene.js'

describe('BootScene', () => {
  describe('create', () => {
    it('runs without throwing', () => {
      const b = new BootScene()
      expect(() => b.create()).not.toThrow()
    })

    it('starts TitleScene after creating textures', () => {
      const b = new BootScene()
      b.create()
      expect(b.scene.start).toHaveBeenCalledWith('TitleScene')
    })

    it('calls make.graphics for each texture', () => {
      const b = new BootScene()
      b.create()
      // slop, slop_eyes, keeper, the_render, coin, enemy, + tile textures (4)
      expect(b.make.graphics).toHaveBeenCalled()
      expect(b.make.graphics.mock.calls.length).toBeGreaterThanOrEqual(9)
    })

    it('generates textures with correct keys', () => {
      const b = new BootScene()
      b.create()
      const graphicsCalls = b.make.graphics.mock.results.map(r => r.value)
      const texKeys = graphicsCalls.flatMap(g => g.generateTexture.mock.calls.map(c => c[0]))
      expect(texKeys).toContain('slop')
      expect(texKeys).toContain('slop_eyes')
      expect(texKeys).toContain('keeper')
      expect(texKeys).toContain('the_render')
      expect(texKeys).toContain('coin')
      expect(texKeys).toContain('enemy')
    })

    it('destroys each graphics object after generating texture', () => {
      const b = new BootScene()
      b.create()
      const graphicsCalls = b.make.graphics.mock.results.map(r => r.value)
      graphicsCalls.forEach(g => expect(g.destroy).toHaveBeenCalled())
    })
  })
})
