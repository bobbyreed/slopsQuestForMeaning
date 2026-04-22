import { describe, it, expect, vi, beforeEach } from 'vitest'
import { makeScene } from '../__mocks__/phaser.js'
import { Slop } from '../entities/Slop.js'

function makeSlop(state = {}) {
  const scene = makeScene()
  return { slop: new Slop(scene, 100, 200, state), scene }
}

describe('Slop', () => {
  describe('constructor — default state', () => {
    it('positions correctly', () => {
      const { slop } = makeSlop()
      expect(slop.x).toBe(100)
      expect(slop.y).toBe(200)
    })

    it('initialises coinCount and maxCoins', () => {
      const { slop } = makeSlop()
      expect(slop.coinCount).toBe(0)
      expect(slop.maxCoins).toBe(3)
    })

    it('hasPrompt defaults to false', () => {
      expect(makeSlop().slop.hasPrompt).toBe(false)
    })

    it('hasEyes defaults to false', () => {
      expect(makeSlop().slop.hasEyes).toBe(false)
    })

    it('dungeonCleared defaults to false', () => {
      expect(makeSlop().slop.dungeonCleared).toBe(false)
    })

    it('facing defaults to north', () => {
      expect(makeSlop().slop.facing).toEqual({ x: 0, y: -1 })
    })

    it('purchases all default to false', () => {
      const { purchases } = makeSlop().slop
      expect(purchases).toEqual({ smallPurse: false, eyes: false, bigPurse: false, grandPurse: false })
    })
  })

  describe('constructor — restoring saved state', () => {
    const saved = {
      coinCount: 7,
      maxCoins: 10,
      hasPrompt: true,
      hasEyes: true,
      dungeonCleared: true,
      purchases: { smallPurse: true, eyes: true, bigPurse: false },
      facing: { x: 1, y: 0 },
    }

    it('restores all numeric fields', () => {
      const { slop } = makeSlop(saved)
      expect(slop.coinCount).toBe(7)
      expect(slop.maxCoins).toBe(10)
    })

    it('restores boolean flags', () => {
      const { slop } = makeSlop(saved)
      expect(slop.hasPrompt).toBe(true)
      expect(slop.hasEyes).toBe(true)
      expect(slop.dungeonCleared).toBe(true)
    })

    it('restores purchases without aliasing the original object', () => {
      const { slop } = makeSlop(saved)
      expect(slop.purchases.smallPurse).toBe(true)
      slop.purchases.smallPurse = false
      expect(saved.purchases.smallPurse).toBe(true) // original unchanged
    })

    it('restores facing direction', () => {
      const { slop } = makeSlop(saved)
      expect(slop.facing).toEqual({ x: 1, y: 0 })
    })
  })

  describe('getState', () => {
    it('returns a snapshot of all state fields', () => {
      const { slop } = makeSlop({ coinCount: 2, maxCoins: 10, hasPrompt: true, hasEyes: false, dungeonCleared: true })
      const state = slop.getState()
      expect(state).toMatchObject({
        coinCount: 2,
        maxCoins: 10,
        hasPrompt: true,
        hasEyes: false,
        dungeonCleared: true,
      })
    })

    it('returns a plain object (not the Slop instance)', () => {
      const { slop } = makeSlop()
      expect(slop.getState()).not.toBe(slop)
    })

    it('purchases snapshot does not alias internal object', () => {
      const { slop } = makeSlop()
      const state = slop.getState()
      state.purchases.smallPurse = true
      expect(slop.purchases.smallPurse).toBe(false)
    })
  })

  describe('applyEyes', () => {
    it('sets hasEyes to true', () => {
      const { slop } = makeSlop()
      slop.applyEyes()
      expect(slop.hasEyes).toBe(true)
    })

    it('switches texture to slop_eyes', () => {
      const { slop } = makeSlop()
      slop.applyEyes()
      expect(slop._texture).toBe('slop_eyes')
    })

    it('increases flicker chance', () => {
      const { slop } = makeSlop()
      const before = slop._flickerChance
      slop.applyEyes()
      expect(slop._flickerChance).toBeGreaterThan(before)
    })
  })

  describe('handleInput', () => {
    function makeCursors(overrides = {}) {
      return {
        left:  { isDown: false },
        right: { isDown: false },
        up:    { isDown: false },
        down:  { isDown: false },
        ...overrides,
      }
    }

    it('accelerates left and updates facing', () => {
      const { slop } = makeSlop({ hasPrompt: true })
      slop.handleInput(makeCursors({ left: { isDown: true } }), makeCursors())
      expect(slop.body._acceleration.x).toBeLessThan(0)
      expect(slop.facing.x).toBe(-1)
    })

    it('accelerates right', () => {
      const { slop } = makeSlop()
      slop.handleInput(makeCursors({ right: { isDown: true } }), makeCursors())
      expect(slop.body._acceleration.x).toBeGreaterThan(0)
    })

    it('accelerates up', () => {
      const { slop } = makeSlop()
      slop.handleInput(makeCursors({ up: { isDown: true } }), makeCursors())
      expect(slop.body._acceleration.y).toBeLessThan(0)
      expect(slop.facing.y).toBe(-1)
    })

    it('accelerates down', () => {
      const { slop } = makeSlop()
      slop.handleInput(makeCursors({ down: { isDown: true } }), makeCursors())
      expect(slop.body._acceleration.y).toBeGreaterThan(0)
    })

    it('zeroes acceleration when no key pressed', () => {
      const { slop } = makeSlop()
      slop.handleInput(makeCursors(), makeCursors())
      expect(slop.body._acceleration.x).toBe(0)
      expect(slop.body._acceleration.y).toBe(0)
    })

    it('does nothing when blocked', () => {
      const { slop } = makeSlop()
      slop.handleInput(makeCursors({ left: { isDown: true } }), makeCursors(), true)
      expect(slop.body._acceleration.x).toBe(0)
    })
  })

  describe('tick', () => {
    it('decrements the jitter timer', () => {
      const { slop } = makeSlop()
      const before = slop._jitterTimer
      slop.tick(100)
      expect(slop._jitterTimer).toBe(before - 100)
    })

    it('resets jitter timer when it expires', () => {
      const { slop } = makeSlop()
      slop._jitterTimer = 10
      slop.tick(50)  // timer expires
      expect(slop._jitterTimer).toBeGreaterThan(0)
    })

    it('decrements prompt cooldown', () => {
      const { slop } = makeSlop()
      slop._promptCooldown = 200
      slop.tick(50)
      expect(slop._promptCooldown).toBe(150)
    })

    it('does not decrement cooldown below 0', () => {
      const { slop } = makeSlop()
      slop._promptCooldown = 0
      slop.tick(50)
      expect(slop._promptCooldown).toBe(0)
    })
  })

  describe('applyTexture', () => {
    it('sets keeper texture when inPriorBody is true', () => {
      const { slop } = makeSlop({ inPriorBody: true })
      expect(slop._texture).toBe('keeper')
    })

    it('sets slop_eyes texture when hasEyes is true and not in prior body', () => {
      const { slop } = makeSlop({ hasEyes: true })
      expect(slop._texture).toBe('slop_eyes')
    })

    it('stays slop texture by default', () => {
      const { slop } = makeSlop()
      expect(slop._texture).toBe('slop')
    })

    it('prefers keeper over slop_eyes when both flags are set', () => {
      const { slop } = makeSlop({ inPriorBody: true, hasEyes: true })
      expect(slop._texture).toBe('keeper')
    })
  })

  describe('dash', () => {
    it('returns false when hasDash is false', () => {
      const { slop } = makeSlop({ hasDash: false })
      expect(slop.dash()).toBe(false)
    })

    it('returns true on successful dash', () => {
      const { slop } = makeSlop({ hasDash: true })
      expect(slop.dash()).toBe(true)
    })

    it('sets _dashActive after dash', () => {
      const { slop } = makeSlop({ hasDash: true })
      slop.dash()
      expect(slop._dashActive).toBeGreaterThan(0)
    })

    it('sets _dashCooldown after dash', () => {
      const { slop } = makeSlop({ hasDash: true })
      slop.dash()
      expect(slop._dashCooldown).toBeGreaterThan(0)
    })

    it('returns false when cooldown is active', () => {
      const { slop } = makeSlop({ hasDash: true })
      slop.dash()
      expect(slop.dash()).toBe(false)
    })

    it('applies velocity in facing direction', () => {
      const { slop } = makeSlop({ hasDash: true, facing: { x: 1, y: 0 } })
      slop.dash()
      expect(slop.body.velocity.x).toBeGreaterThan(0)
    })
  })

  describe('tick — dash active', () => {
    it('decrements _dashActive when active', () => {
      const { slop } = makeSlop({ hasDash: true })
      slop.dash()
      const before = slop._dashActive
      slop.tick(50)
      expect(slop._dashActive).toBe(before - 50)
    })

    it('resets drag when dashActive expires', () => {
      const { slop } = makeSlop({ hasDash: true })
      slop.dash()
      slop._dashActive = 10
      slop.tick(50)
      expect(slop._dashActive).toBeLessThanOrEqual(0)
    })
  })

  describe('firePrompt', () => {
    it('returns undefined when hasPrompt is false', () => {
      const { slop } = makeSlop({ hasPrompt: false })
      expect(slop.firePrompt()).toBeUndefined()
    })

    it('returns a projectile object when hasPrompt is true', () => {
      const { slop } = makeSlop({ hasPrompt: true })
      const proj = slop.firePrompt()
      expect(proj).toBeTruthy()
    })

    it('enforces cooldown — second call in quick succession returns undefined', () => {
      const { slop } = makeSlop({ hasPrompt: true })
      slop.firePrompt()
      expect(slop.firePrompt()).toBeUndefined()
    })

    it('projectile velocity follows facing direction', () => {
      const { slop } = makeSlop({ hasPrompt: true, facing: { x: 1, y: 0 } })
      const proj = slop.firePrompt()
      expect(proj.body.velocity.x).toBeGreaterThan(0)
      expect(proj.body.velocity.y).toBe(0)
    })
  })
})
