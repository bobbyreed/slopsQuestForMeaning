import { describe, it, expect, vi } from 'vitest'
import { makeScene } from '../__mocks__/phaser.js'
import { Shard } from '../entities/Shard.js'

function makeShard() {
  const scene = makeScene()
  const s = new Shard(scene, 100, 200)
  return { shard: s, scene }
}

describe('Shard', () => {
  describe('constructor', () => {
    it('creates without throwing', () => {
      expect(() => makeShard()).not.toThrow()
    })

    it('starts not dying and not nulled', () => {
      const { shard } = makeShard()
      expect(shard._dying).toBe(false)
      expect(shard._nulled).toBe(false)
    })

    it('has initial velocity set', () => {
      const { shard } = makeShard()
      const speed = Math.sqrt(shard.body.velocity.x ** 2 + shard.body.velocity.y ** 2)
      expect(speed).toBeGreaterThan(0)
    })
  })

  describe('tick — null phase', () => {
    it('enters null phase when timer exceeds cycle', () => {
      const { shard } = makeShard()
      shard._nullCycle = 100
      shard.tick(200)
      expect(shard._nulled).toBe(true)
      expect(shard._inNull).toBe(true)
    })

    it('exits null phase when null duration elapses', () => {
      const { shard } = makeShard()
      shard._nullCycle = 100
      shard.tick(200)      // enter null
      shard._nullDuration = 50
      shard._nullTimer = 0
      shard.tick(100)      // exit null
      expect(shard._nulled).toBe(false)
      expect(shard._inNull).toBe(false)
    })

    it('returns early when dying', () => {
      const { shard } = makeShard()
      shard._dying = true
      shard._nullCycle = 10
      shard.tick(100)
      expect(shard._nulled).toBe(false) // no state change when dying
    })
  })

  describe('onHit', () => {
    it('returns true and sets _dying when not nulled', () => {
      const { shard } = makeShard()
      const result = shard.onHit('generate', vi.fn())
      expect(result).toBe(true)
      expect(shard._dying).toBe(true)
    })

    it('returns false when nulled', () => {
      const { shard } = makeShard()
      shard._nulled = true
      const result = shard.onHit('generate', vi.fn())
      expect(result).toBe(false)
      expect(shard._dying).toBe(false)
    })

    it('returns false when already dying', () => {
      const { shard } = makeShard()
      shard._dying = true
      const result = shard.onHit('generate', vi.fn())
      expect(result).toBe(false)
    })

    it('does not call onDeath immediately (deferred via tween)', () => {
      const { shard } = makeShard()
      const cb = vi.fn()
      shard.onHit('exists', cb)
      // Callback is inside a nested tween — not called synchronously
      expect(cb).not.toHaveBeenCalled()
    })

    it('stops body velocity on hit', () => {
      const { shard } = makeShard()
      shard.body.velocity.x = 200
      shard.onHit('render', vi.fn())
      expect(shard.body.velocity.x).toBe(0)
    })
  })
})
