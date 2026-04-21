import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Sfx } from '../ui/Sfx.js'

function makeScene(overrides = {}) {
  const osc = {
    connect: vi.fn(), start: vi.fn(), stop: vi.fn(),
    type: 'sine',
    frequency: { value: 440, setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() },
  }
  const gain = {
    connect: vi.fn(),
    gain: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() },
  }
  const ctx = {
    currentTime: 0,
    destination: {},
    createOscillator: vi.fn(() => osc),
    createGain: vi.fn(() => gain),
    ...overrides,
  }
  return { sound: { context: ctx }, _ctx: ctx, _osc: osc, _gain: gain }
}

describe('Sfx', () => {
  describe('coin', () => {
    it('creates two oscillators for a two-tone sound', () => {
      const { sound, _ctx } = makeScene()
      Sfx.coin({ sound })
      expect(_ctx.createOscillator).toHaveBeenCalledTimes(2)
      expect(_ctx.createGain).toHaveBeenCalledTimes(2)
    })

    it('does not throw when sound context is unavailable', () => {
      expect(() => Sfx.coin({ sound: null })).not.toThrow()
      expect(() => Sfx.coin({})).not.toThrow()
    })
  })

  describe('enemyDeath', () => {
    it('creates one sawtooth oscillator', () => {
      const { sound, _ctx, _osc } = makeScene()
      Sfx.enemyDeath({ sound })
      expect(_ctx.createOscillator).toHaveBeenCalledTimes(1)
      expect(_osc.type).toBe('sawtooth')
    })

    it('ramps frequency downward', () => {
      const { sound, _osc } = makeScene()
      Sfx.enemyDeath({ sound })
      expect(_osc.frequency.setValueAtTime).toHaveBeenCalledWith(220, 0)
      expect(_osc.frequency.exponentialRampToValueAtTime).toHaveBeenCalledWith(55, expect.any(Number))
    })

    it('does not throw when context unavailable', () => {
      expect(() => Sfx.enemyDeath({})).not.toThrow()
    })
  })

  describe('slopHit', () => {
    it('creates three oscillators for a chord', () => {
      const { sound, _ctx } = makeScene()
      Sfx.slopHit({ sound })
      expect(_ctx.createOscillator).toHaveBeenCalledTimes(3)
    })

    it('does not throw when context unavailable', () => {
      expect(() => Sfx.slopHit({})).not.toThrow()
    })
  })

  describe('promptFire', () => {
    it('creates one oscillator', () => {
      const { sound, _ctx } = makeScene()
      Sfx.promptFire({ sound })
      expect(_ctx.createOscillator).toHaveBeenCalledTimes(1)
    })

    it('ramps frequency upward', () => {
      const { sound, _osc } = makeScene()
      Sfx.promptFire({ sound })
      expect(_osc.frequency.setValueAtTime).toHaveBeenCalledWith(440, 0)
      expect(_osc.frequency.exponentialRampToValueAtTime).toHaveBeenCalledWith(880, expect.any(Number))
    })

    it('does not throw when context unavailable', () => {
      expect(() => Sfx.promptFire({})).not.toThrow()
    })
  })
})
