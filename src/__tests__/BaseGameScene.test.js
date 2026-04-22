import { describe, it, expect, vi } from 'vitest'
import Phaser from '../__mocks__/phaser.js'
import { BaseGameScene } from '../phaser/BaseGameScene.js'

// Minimal concrete subclass so we can instantiate an abstract-ish base class
class TestScene extends BaseGameScene {
  constructor() { super('TestScene') }
}

function makeBase() {
  const s = new TestScene()
  s._walls = s.physics.add.staticGroup()
  s._coins = s.physics.add.staticGroup()
  s._enemies = s.physics.add.group()
  s._prompts = []
  s._slopHitTimer = 0
  s._transitioning = false
  const slopAlpha = { _alpha: 1 }
  s.slop = { setAlpha: vi.fn(a => { slopAlpha._alpha = a }), get _alpha() { return slopAlpha._alpha }, getState: vi.fn(() => ({})) }
  return s
}

describe('BaseGameScene._initMovementKeys', () => {
  it('creates cursor keys', () => {
    const s = makeBase()
    s._initMovementKeys()
    expect(s.input.keyboard.createCursorKeys).toHaveBeenCalled()
    expect(s._cursors).toBeDefined()
  })

  it('adds WASD keys', () => {
    const s = makeBase()
    s._initMovementKeys()
    expect(s.input.keyboard.addKeys).toHaveBeenCalled()
    expect(s._wasd).toBeDefined()
  })
})

describe('BaseGameScene._setupCoinOverlap', () => {
  it('registers an overlap between slop and coins', () => {
    const s = makeBase()
    s.slop = { coinCount: 0, maxCoins: 10, body: { setVelocity: vi.fn() } }
    s._setupCoinOverlap()
    expect(s.physics.add.overlap).toHaveBeenCalledWith(s.slop, s._coins, expect.any(Function))
  })

  it('coin pickup increments coinCount', () => {
    const s = makeBase()
    s.slop = { coinCount: 2, maxCoins: 10, body: { setVelocity: vi.fn() } }
    s._setupCoinOverlap()
    const cb = s.physics.add.overlap.mock.calls[0][2]
    const coin = { active: true, getData: vi.fn(() => false), destroy: vi.fn() }
    cb(s.slop, coin)
    expect(s.slop.coinCount).toBe(3)
  })

  it('skips inactive coins', () => {
    const s = makeBase()
    s.slop = { coinCount: 0, maxCoins: 10 }
    s._setupCoinOverlap()
    const cb = s.physics.add.overlap.mock.calls[0][2]
    const coin = { active: false, getData: vi.fn(() => false), destroy: vi.fn() }
    cb(s.slop, coin)
    expect(s.slop.coinCount).toBe(0)
  })

  it('skips justDropped coins', () => {
    const s = makeBase()
    s.slop = { coinCount: 0, maxCoins: 10 }
    s._setupCoinOverlap()
    const cb = s.physics.add.overlap.mock.calls[0][2]
    const coin = { active: true, getData: vi.fn(() => true), destroy: vi.fn() }
    cb(s.slop, coin)
    expect(s.slop.coinCount).toBe(0)
  })

  it('caps coinCount at maxCoins', () => {
    const s = makeBase()
    s.slop = { coinCount: 10, maxCoins: 10 }
    s._setupCoinOverlap()
    const cb = s.physics.add.overlap.mock.calls[0][2]
    const coin = { active: true, getData: vi.fn(() => false), destroy: vi.fn() }
    cb(s.slop, coin)
    expect(s.slop.coinCount).toBe(10)
  })
})

describe('BaseGameScene._setupEnemyOverlap', () => {
  it('registers an overlap between slop and enemies', () => {
    const s = makeBase()
    s.slop = { coinCount: 2, body: { setVelocity: vi.fn() }, x: 100, y: 100 }
    s._setupEnemyOverlap()
    expect(s.physics.add.overlap).toHaveBeenCalledWith(s.slop, s._enemies, expect.any(Function))
  })

  it('decrements coinCount on hit', () => {
    const s = makeBase()
    s.slop = { coinCount: 2, body: { setVelocity: vi.fn() }, x: 100, y: 100 }
    s._slopHitTimer = 0
    s._setupEnemyOverlap()
    const cb = s.physics.add.overlap.mock.calls[0][2]
    const enemy = { _dying: false, x: 90, y: 100 }
    cb(s.slop, enemy)
    expect(s.slop.coinCount).toBe(1)
  })

  it('skips hit when slop is invulnerable', () => {
    const s = makeBase()
    s.slop = { coinCount: 2, body: { setVelocity: vi.fn() }, x: 100, y: 100 }
    s._slopHitTimer = 500
    s._setupEnemyOverlap()
    const cb = s.physics.add.overlap.mock.calls[0][2]
    const enemy = { _dying: false, x: 90, y: 100 }
    cb(s.slop, enemy)
    expect(s.slop.coinCount).toBe(2)
  })

  it('skips hit against dying enemy', () => {
    const s = makeBase()
    s.slop = { coinCount: 2, body: { setVelocity: vi.fn() }, x: 100, y: 100 }
    s._slopHitTimer = 0
    s._setupEnemyOverlap()
    const cb = s.physics.add.overlap.mock.calls[0][2]
    const enemy = { _dying: true, x: 90, y: 100 }
    cb(s.slop, enemy)
    expect(s.slop.coinCount).toBe(2)
  })

  it('shakes camera with supplied params', () => {
    const s = makeBase()
    s.slop = { coinCount: 1, body: { setVelocity: vi.fn() }, x: 100, y: 100 }
    s._slopHitTimer = 0
    s._setupEnemyOverlap(200, 0.01)
    const cb = s.physics.add.overlap.mock.calls[0][2]
    cb(s.slop, { _dying: false, x: 90, y: 100 })
    expect(s.cameras.main.shake).toHaveBeenCalledWith(200, 0.01)
  })
})

describe('BaseGameScene._wallRect', () => {
  it('creates a rectangle and adds it to the walls group', () => {
    const s = makeBase()
    s._wallRect(0, 0, 100, 32)
    expect(s.add.rectangle).toHaveBeenCalled()
    expect(s._walls.add).toHaveBeenCalled()
  })

  it('uses the supplied color instead of the default', () => {
    const s = makeBase()
    s._wallRect(0, 0, 100, 32, 0xb8a898)
    const call = s.add.rectangle.mock.calls[0]
    expect(call[4]).toBe(0xb8a898)
  })
})

describe('BaseGameScene._spawnCoinAt', () => {
  it('creates a coin in the coins group', () => {
    const s = makeBase()
    const createSpy = s._coins.create
    s._spawnCoinAt(200, 300)
    expect(createSpy).toHaveBeenCalled()
  })

  it('marks the coin as justDropped', () => {
    const s = makeBase()
    const mockCoin = { refreshBody: vi.fn(), setData: vi.fn(), active: true }
    s._coins.create.mockReturnValue(mockCoin)
    s._spawnCoinAt(200, 300)
    expect(mockCoin.setData).toHaveBeenCalledWith('justDropped', true)
  })

  it('does nothing when the scene is not active', () => {
    const s = makeBase()
    s.scene.isActive.mockReturnValue(false)
    const createSpy = s._coins.create
    s._spawnCoinAt(200, 300)
    expect(createSpy).not.toHaveBeenCalled()
  })

  it('fires the delayed justDropped-clear callback without throwing', () => {
    const s = makeBase()
    const mockCoin = { refreshBody: vi.fn(), setData: vi.fn(), active: true }
    s._coins.create.mockReturnValue(mockCoin)
    s._spawnCoinAt(200, 300)
    const cb = s.time.delayedCall.mock.calls[0][1]
    expect(() => cb()).not.toThrow()
  })
})

describe('BaseGameScene._tickHitInvulnerability', () => {
  it('decrements the timer and flashes Slop', () => {
    const s = makeBase()
    s._slopHitTimer = 600
    s._tickHitInvulnerability(16)
    expect(s._slopHitTimer).toBe(584)
  })

  it('resets alpha to 1 when timer is at zero', () => {
    const s = makeBase()
    s._slopHitTimer = 0
    s._tickHitInvulnerability(16)
    expect(s.slop.setAlpha).toHaveBeenCalledWith(1)
  })
})

describe('BaseGameScene._checkPromptCollisions', () => {
  it('calls onHit when a prompt overlaps an enemy', () => {
    const s = makeBase()
    const fakeEnemy = {
      active: true, _dying: false,
      getBounds: () => ({ x: 100, y: 100, width: 32, height: 32 }),
      onHit: vi.fn(),
    }
    s._enemies.getChildren.mockReturnValue([fakeEnemy])

    const fakePrompt = {
      active: true, text: 'generate',
      getBounds: () => ({ x: 100, y: 100, width: 20, height: 20 }),
      destroy: vi.fn(),
    }
    s._prompts = [fakePrompt]

    vi.mocked(Phaser.Geom.Intersects.RectangleToRectangle).mockReturnValueOnce(true)
    s._checkPromptCollisions()

    expect(fakeEnemy.onHit).toHaveBeenCalledWith('generate', expect.any(Function))
  })

  it('skips inactive prompts', () => {
    const s = makeBase()
    s._prompts = [{ active: false, text: 'x', getBounds: vi.fn(), destroy: vi.fn() }]
    s._enemies.getChildren.mockReturnValue([])
    expect(() => s._checkPromptCollisions()).not.toThrow()
  })
})

describe('BaseGameScene._sceneTransition', () => {
  it('sets _transitioning and calls fade', () => {
    const s = makeBase()
    s._sceneTransition('WorldScene', { foo: 1 })
    expect(s._transitioning).toBe(true)
    expect(s.cameras.main.fade).toHaveBeenCalled()
  })

  it('starts the target scene in the fade callback', () => {
    const s = makeBase()
    s._sceneTransition('WorldScene', { foo: 1 })
    const cb = s.cameras.main.fade.mock.calls[0][5]
    cb(null, 1)
    expect(s.scene.start).toHaveBeenCalledWith('WorldScene', { foo: 1 })
  })

  it('returns false and does nothing when already transitioning', () => {
    const s = makeBase()
    s._transitioning = true
    const result = s._sceneTransition('WorldScene', {})
    expect(result).toBe(false)
    expect(s.cameras.main.fade).not.toHaveBeenCalled()
  })
})
