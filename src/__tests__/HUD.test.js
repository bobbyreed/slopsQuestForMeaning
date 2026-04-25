import { describe, it, expect, vi } from 'vitest'
import { makeScene, makeTextObj } from '../__mocks__/phaser.js'
import { HUD } from '../ui/HUD.js'

function makeHUD(slopOverrides = {}) {
  const scene = makeScene()
  const slop = { coinCount: 0, maxCoins: 3, hasPrompt: false, hasCorrupt: false, _corruptCooldown: 0, ...slopOverrides }
  const hud = new HUD(scene, slop)
  return { hud, slop, scene }
}

describe('HUD', () => {
  describe('constructor', () => {
    it('creates coin, prompt, and corrupt labels via scene.add.text', () => {
      const { scene } = makeHUD()
      expect(scene.add.text).toHaveBeenCalledTimes(3)
    })
  })

  describe('update', () => {
    it('shows coin count correctly', () => {
      const { hud, slop } = makeHUD({ coinCount: 2, maxCoins: 3 })
      hud.update()
      expect(hud.coinLabel._text).toBe('◎ 2/3')
    })

    it('uses normal colour when coinCount is within limit', () => {
      const { hud, slop } = makeHUD({ coinCount: 1, maxCoins: 3 })
      hud.update()
      expect(hud.coinLabel._color).toBe('#555533')
    })

    it('uses warning colour when coinCount exceeds maxCoins', () => {
      const { hud, slop } = makeHUD({ coinCount: 4, maxCoins: 3 })
      hud.update()
      expect(hud.coinLabel._color).toBe('#ffaa44')
    })

    it('shows prompt hint when hasPrompt is true', () => {
      const { hud } = makeHUD({ hasPrompt: true })
      hud.update()
      expect(hud.promptLabel._text).toBe('[SPACE] prompt')
    })

    it('hides prompt hint when hasPrompt is false', () => {
      const { hud } = makeHUD({ hasPrompt: false })
      hud.update()
      expect(hud.promptLabel._text).toBe('')
    })
  })

  describe('destroy', () => {
    it('destroys all labels', () => {
      const { hud } = makeHUD()
      hud.destroy()
      expect(hud.coinLabel.active).toBe(false)
      expect(hud.promptLabel.active).toBe(false)
      expect(hud.corruptLabel.active).toBe(false)
    })
  })

  describe('corrupt label', () => {
    it('shows [Q] corrupt when hasCorrupt is true and cooldown is 0', () => {
      const { hud } = makeHUD({ hasCorrupt: true, _corruptCooldown: 0 })
      hud.update()
      expect(hud.corruptLabel._text).toBe('[Q] corrupt')
    })

    it('shows [Q] ... when hasCorrupt is true and cooldown is active', () => {
      const { hud } = makeHUD({ hasCorrupt: true, _corruptCooldown: 1200 })
      hud.update()
      expect(hud.corruptLabel._text).toBe('[Q] ...')
    })

    it('hides corrupt label when hasCorrupt is false', () => {
      const { hud } = makeHUD({ hasCorrupt: false })
      hud.update()
      expect(hud.corruptLabel._text).toBe('')
    })
  })
})
