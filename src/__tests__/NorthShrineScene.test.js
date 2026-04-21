import { describe, it, expect, vi } from 'vitest'
import { NorthShrineScene } from '../scenes/NorthShrineScene.js'

function makeShrine(initData = {}) {
  const s = new NorthShrineScene()
  s.init(initData)
  return s
}

describe('NorthShrineScene', () => {
  describe('init', () => {
    it('sets _shopMode false on first visit (no prompt yet)', () => {
      const s = makeShrine({ slopState: { hasPrompt: false } })
      expect(s._shopMode).toBe(false)
    })

    it('sets _shopMode true on return when hasPrompt is true', () => {
      const s = makeShrine({ slopState: { hasPrompt: true } })
      expect(s._shopMode).toBe(true)
    })

    it('defaults to first-visit mode with no state', () => {
      const s = makeShrine()
      expect(s._shopMode).toBe(false)
    })
  })

  describe('create', () => {
    it('creates without throwing in first-visit mode', () => {
      const s = makeShrine({ slopState: { hasPrompt: false } })
      expect(() => s.create()).not.toThrow()
    })

    it('creates without throwing in shop mode', () => {
      const s = makeShrine({ slopState: { hasPrompt: true } })
      expect(() => s.create()).not.toThrow()
    })
  })

  describe('_returnToWorld', () => {
    it('prevents double-transition', () => {
      const s = makeShrine({ slopState: {} })
      s.create()
      s._transitioning = true
      s._returnToWorld()
      expect(s.cameras.main.fade).not.toHaveBeenCalled()
    })

    it('starts WorldScene with spawnOrigin "shrine"', () => {
      const s = makeShrine({ slopState: {} })
      s.create()
      s._returnToWorld()
      const fadeCb = s.cameras.main.fade.mock.calls[0][5]
      fadeCb(null, 1)
      expect(s.scene.start).toHaveBeenCalledWith('WorldScene', expect.objectContaining({
        spawnOrigin: 'shrine',
      }))
    })
  })

  describe('_givePrompt (first-visit flow)', () => {
    it('sets hasPrompt on slop', () => {
      const s = makeShrine({ slopState: { hasPrompt: false } })
      s.create()
      s._givePrompt()
      expect(s.slop.hasPrompt).toBe(true)
    })
  })

  describe('shop — _selectShopRow', () => {
    function shopScene(coinCount = 10) {
      const s = makeShrine({ slopState: { hasPrompt: true, coinCount, maxCoins: 3, purchases: { smallPurse: false, eyes: false, bigPurse: false } } })
      s.create()
      s._openShop()
      s._shopInputDelay = 0  // bypass the delay guard
      return s
    }

    it('deducts coins when buying an affordable item', () => {
      const s = shopScene(10)
      s._shopCursor = 0  // smallPurse costs 3
      const before = s.slop.coinCount
      s._selectShopRow()
      expect(s.slop.coinCount).toBe(before - 3)
    })

    it('marks item as purchased', () => {
      const s = shopScene(10)
      s._shopCursor = 0
      s._selectShopRow()
      expect(s.slop.purchases.smallPurse).toBe(true)
    })

    it('does not allow buying the same item twice', () => {
      const s = shopScene(10)
      s._shopCursor = 0
      s._selectShopRow()
      const coinsAfterFirst = s.slop.coinCount
      s._selectShopRow()
      expect(s.slop.coinCount).toBe(coinsAfterFirst)
    })

    it('shakes camera when cannot afford', () => {
      const s = shopScene(1)  // only 1 coin, smallPurse costs 3
      s._shopCursor = 0
      s._selectShopRow()
      expect(s.cameras.main.shake).toHaveBeenCalled()
    })

    it('leave row triggers _returnToWorld', () => {
      const s = shopScene(10)
      s._returnToWorld = vi.fn()
      s._shopCursor = s._allRows.length - 1  // "leave" row is last
      s._selectShopRow()
      expect(s._returnToWorld).toHaveBeenCalled()
    })

    it('buying smallPurse increases maxCoins to 10', () => {
      const s = shopScene(10)
      s._shopCursor = 0
      s._selectShopRow()
      expect(s.slop.maxCoins).toBe(10)
    })

    it('buying eyes sets hasEyes to true', () => {
      const s = shopScene(10)
      s._shopCursor = 1  // eyes costs 8
      s._selectShopRow()
      expect(s.slop.hasEyes).toBe(true)
    })
  })
})
