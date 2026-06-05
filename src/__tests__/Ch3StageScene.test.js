import { describe, it, expect, vi } from 'vitest'
import { makeScene }      from '../__mocks__/phaser.js'
import Phaser             from '../__mocks__/phaser.js'
import { Ch3StageScene }  from '../scenes/ch3/Ch3StageScene.js'

function makeStage(data = {}) {
  const s = new Ch3StageScene()
  Object.assign(s, makeScene())
  s.init(data)
  s.create()
  return s
}

// A lightweight enemy stand-in for combat tests.
function fakeEnemy(scene, overrides = {}) {
  return {
    x: scene._px + 20, groundY: scene._groundY, facing: -1,
    hp: 30, maxHp: 30, nextAttack: 0, dead: false,
    rect:   { setFillStyle: vi.fn(), setDepth: vi.fn(), destroy: vi.fn(), x: 0, y: 0 },
    shadow: { destroy: vi.fn(), x: 0, y: 0 },
    ...overrides,
  }
}

describe('Ch3StageScene — init', () => {
  it('stores slopState', () => {
    const s = new Ch3StageScene()
    s.init({ slopState: { chapter2Complete: true } })
    expect(s._slopState.chapter2Complete).toBe(true)
  })

  it('defaults health to full when none carried', () => {
    const s = new Ch3StageScene()
    s.init({})
    expect(s._hp).toBe(100)
  })

  it('carries playerHealth when provided', () => {
    const s = new Ch3StageScene()
    s.init({ playerHealth: 42 })
    expect(s._hp).toBe(42)
  })

  it('starts advancing, not transitioning, no enemies', () => {
    const s = new Ch3StageScene()
    s.init({})
    expect(s._advancing).toBe(true)
    expect(s._transitioning).toBe(false)
    expect(s._enemies).toEqual([])
  })
})

describe('Ch3StageScene — create', () => {
  it('does not throw', () => {
    expect(() => makeStage()).not.toThrow()
  })

  it('creates the player and an HP bar', () => {
    const s = makeStage()
    expect(s._player).toBeDefined()
    expect(s._hpBar).toBeDefined()
  })
})

describe('Ch3StageScene — waves', () => {
  it('_spawnWave adds enemies and locks the gate', () => {
    const s = makeStage()
    s._spawnWave({ x: 620, spawns: [[700, 470], [820, 520]] })
    expect(s._enemies).toHaveLength(2)
    expect(s._gateActive).toBe(true)
    expect(s._advancing).toBe(false)
  })

  it('clears the gate and advances once all enemies are dead', () => {
    const s = makeStage()
    s._spawnWave({ x: 620, spawns: [[700, 470]] })
    s._enemies.forEach(e => { e.dead = true })
    s._updateWaves()
    expect(s._gateActive).toBe(false)
    expect(s._advancing).toBe(true)
    expect(s._currentWave).toBe(1)
  })
})

describe('Ch3StageScene — combat', () => {
  it('_attack(punch) sets attacking + cooldown and shows a strike', () => {
    const s = makeStage()
    const before = s.tweens.add.mock.calls.length
    s._attack('punch')
    expect(s._isAttacking).toBe(true)
    expect(s._canPunch).toBe(false)
    expect(s.tweens.add.mock.calls.length).toBeGreaterThan(before)
  })

  it('_attack does nothing while already attacking', () => {
    const s = makeStage()
    s._isAttacking = true
    s._canKick = true
    s._attack('kick')
    expect(s._canKick).toBe(true) // never entered the cooldown gate
  })

  it('_dealHit damages an enemy in front and in range', () => {
    const s = makeStage()
    s._facing = 1
    const e = fakeEnemy(s, { x: s._px + 20 })
    s._enemies = [e]
    s._dealHit(60, 8)
    expect(e.hp).toBe(22)
  })

  it('_dealHit misses an enemy behind the player', () => {
    const s = makeStage()
    s._facing = 1
    const e = fakeEnemy(s, { x: s._px - 40 })
    s._enemies = [e]
    s._dealHit(60, 8)
    expect(e.hp).toBe(30)
  })

  it('_hitEnemy kills an enemy at zero HP', () => {
    const s = makeStage()
    const e = fakeEnemy(s, { hp: 5 })
    s._enemies = [e]
    s._hitEnemy(e, 8)
    expect(e.dead).toBe(true)
  })

  it('_damagePlayer reduces HP and can end the run', () => {
    const s = makeStage()
    s._hp = 4
    s._damagePlayer(6, 0)
    expect(s._hp).toBe(0)
    expect(s._gameOver).toBe(true)
  })

  it('a punch connects after its windup (deferred hit fires)', () => {
    const s = makeStage()
    s._facing = 1
    s.time.delayedCall = vi.fn((_, cb) => { if (cb) cb() })
    const e = fakeEnemy(s, { x: s._px + 20 })
    s._enemies = [e]
    s._attack('punch')
    expect(e.hp).toBeLessThan(30)
  })

  it('_killEnemy destroys the enemy visuals', () => {
    const s = makeStage()
    s.tweens.add = vi.fn((cfg) => { if (cfg.onComplete) cfg.onComplete() })
    const e = fakeEnemy(s)
    s._killEnemy(e)
    expect(e.dead).toBe(true)
    expect(e.shadow.destroy).toHaveBeenCalled()
    expect(e.rect.destroy).toHaveBeenCalled()
  })
})

describe('Ch3StageScene — update', () => {
  it('moves right when the right key is held', () => {
    const s = makeStage()
    s._cursors.right.isDown = true
    const x0 = s._px
    s.update(0, 16)
    expect(s._px).toBeGreaterThan(x0)
  })

  it('starts a jump when SPACE is pressed from the ground', () => {
    const s = makeStage()
    const spy = vi.spyOn(Phaser.Input.Keyboard, 'JustDown').mockReturnValue(true)
    s.update(0, 16)
    expect(s._z).toBeGreaterThan(0)
    spy.mockRestore()
  })

  it('hands off to the boss at the end of the stage', () => {
    const s = makeStage()
    s._currentWave = 999 // past all waves so none re-spawn
    s._px = 2950
    s.update(0, 16)
    expect(s._bossStarted).toBe(true)
    expect(s._transitioning).toBe(true)
  })

  it('does nothing once transitioning', () => {
    const s = makeStage()
    s._transitioning = true
    const x0 = s._px
    s._cursors.right.isDown = true
    s.update(0, 16)
    expect(s._px).toBe(x0)
  })

  it('an enemy in range lunges and damages the player', () => {
    const s = makeStage()
    s.time.now = 1000
    s.time.delayedCall = vi.fn((_, cb) => { if (cb) cb() })
    const e = fakeEnemy(s, { x: s._px + 40, groundY: s._groundY })
    s._enemies = [e]
    s.update(0, 16)
    expect(s._hp).toBeLessThan(100)
  })
})
