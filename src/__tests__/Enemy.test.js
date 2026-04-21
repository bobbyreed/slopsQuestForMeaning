import { describe, it, expect, vi, beforeEach } from 'vitest'
import { makeScene } from '../__mocks__/phaser.js'
import { Enemy } from '../entities/Enemy.js'

function makeEnemy() {
  const scene = makeScene()
  return { enemy: new Enemy(scene, 200, 300), scene }
}

describe('Enemy', () => {
  describe('constructor', () => {
    it('positions at given coordinates', () => {
      const { enemy } = makeEnemy()
      expect(enemy.x).toBe(200)
      expect(enemy.y).toBe(300)
    })

    it('starts alive and not dying', () => {
      const { enemy } = makeEnemy()
      expect(enemy.active).toBe(true)
      expect(enemy._dying).toBe(false)
    })
  })

  describe('tick — wandering behaviour', () => {
    it('sets velocity when Slop is far away (wandering)', () => {
      const { enemy } = makeEnemy()
      // Slop is 500px away — outside chase range of 170px
      enemy.tick(16, enemy.x + 500, enemy.y)
      const speed = Math.sqrt(enemy.body.velocity.x ** 2 + enemy.body.velocity.y ** 2)
      expect(speed).toBeGreaterThan(0)
    })

    it('picks a new direction when wander timer expires', () => {
      const { enemy } = makeEnemy()
      enemy._wanderTimer = 1  // expires on next tick
      const vxBefore = enemy._vx
      enemy.tick(50, enemy.x + 500, enemy.y)  // far away, timer expires
      // _pickNewDirection was called; timer was reset
      expect(enemy._wanderTimer).toBeGreaterThan(0)
    })
  })

  describe('tick — chasing behaviour', () => {
    it('chases Slop when within 170px', () => {
      const { enemy } = makeEnemy()
      // Slop is 50px away (within chase range)
      enemy.tick(16, 250, 300)
      const speed = Math.sqrt(enemy.body.velocity.x ** 2 + enemy.body.velocity.y ** 2)
      expect(speed).toBeGreaterThan(0)
    })

    it('does nothing when already dying', () => {
      const { enemy } = makeEnemy()
      enemy._dying = true
      enemy.body.setVelocity(0, 0)
      enemy.tick(16, 250, 300)
      expect(enemy.body.velocity.x).toBe(0)
      expect(enemy.body.velocity.y).toBe(0)
    })

    it('moves in the direction of Slop when chasing', () => {
      const { enemy } = makeEnemy()
      // Slop is directly to the right within range
      enemy.tick(16, enemy.x + 100, enemy.y)
      expect(enemy.body.velocity.x).toBeGreaterThan(0)
    })
  })

  describe('onHit', () => {
    it('sets _dying to true immediately', () => {
      const { enemy } = makeEnemy()
      enemy.onHit('render')
      expect(enemy._dying).toBe(true)
    })

    it('zeroes velocity on hit', () => {
      const { enemy } = makeEnemy()
      enemy.body.setVelocity(90, 45)
      enemy.onHit('generate')
      expect(enemy.body.velocity.x).toBe(0)
      expect(enemy.body.velocity.y).toBe(0)
    })

    it('does not trigger a second time if already dying', () => {
      const { enemy, scene } = makeEnemy()
      enemy._dying = true
      enemy.onHit('query')
      // tweens.add should not have been called (no death animation)
      expect(scene.tweens.add).not.toHaveBeenCalled()
    })

    it('calls onDeath callback with the position after animation', () => {
      const { enemy, scene } = makeEnemy()
      const cb = vi.fn()

      // Capture the tween onComplete and call it manually
      let outerComplete
      scene.tweens.add.mockImplementation(opts => {
        if (opts.onComplete) outerComplete = opts.onComplete
      })

      enemy.onHit('describe', cb)

      // First tween fires (flash/scale), calling its onComplete starts the shrink tween
      outerComplete?.()

      // The shrink tween also has an onComplete — capture and fire it
      let innerComplete
      scene.tweens.add.mockImplementation(opts => {
        if (opts.onComplete) innerComplete = opts.onComplete
      })
      outerComplete?.()
      innerComplete?.()

      // onDeath should have been called with the enemy's coordinates
      expect(cb).toHaveBeenCalledWith(200, 300)
    })

    it('creates a floating word label', () => {
      const { enemy, scene } = makeEnemy()
      enemy.onHit('context')
      expect(scene.add.text).toHaveBeenCalled()
      const call = scene.add.text.mock.calls[0]
      expect(call[2]).toContain('context')
    })
  })
})
