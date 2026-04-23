import { describe, it, expect, vi } from 'vitest'
import { WestGateScene } from '../scenes/west/WestGateScene.js'

function makeKey(down = false) { return { isDown: down } }

function makeCursors() {
  return { left: makeKey(), right: makeKey(), up: makeKey(), down: makeKey(), space: makeKey() }
}

function makeBody(vx = 185, vy = 0) {
  return {
    setCollideWorldBounds: vi.fn().mockReturnThis(),
    setBounce: vi.fn().mockReturnThis(),
    setVelocity: vi.fn().mockReturnThis(),
    setAllowGravity: vi.fn().mockReturnThis(),
    setMaxVelocity: vi.fn().mockReturnThis(),
    velocity: { x: vx, y: vy },
    speed: Math.hypot(vx, vy),
  }
}

function makeScene() {
  const scene = new WestGateScene()

  scene.physics = {
    world: { setBounds: vi.fn() },
    add: {
      existing: vi.fn((obj) => { obj.body = makeBody(); return obj }),
      staticGroup: vi.fn(() => ({ add: vi.fn(), getChildren: vi.fn(() => []) })),
      collider: vi.fn(),
    },
  }

  scene.add = {
    rectangle: vi.fn((x, y) => ({
      x, y,
      setDepth: vi.fn().mockReturnThis(),
      setPosition: vi.fn().mockReturnThis(),
      setSize: vi.fn().mockReturnThis(),
      setVisible: vi.fn().mockReturnThis(),
      setScrollFactor: vi.fn().mockReturnThis(),
      destroy: vi.fn(),
      body: makeBody(),
    })),
    circle: vi.fn((x, y) => ({
      x, y,
      setDepth: vi.fn().mockReturnThis(),
      setPosition: vi.fn(),
    })),
    text: vi.fn(() => ({
      setOrigin: vi.fn().mockReturnThis(),
      setDepth: vi.fn().mockReturnThis(),
      setScrollFactor: vi.fn().mockReturnThis(),
      setVisible: vi.fn().mockReturnThis(),
      setFontStyle: vi.fn().mockReturnThis(),
      setText: vi.fn(),
    })),
  }

  scene.input = {
    keyboard: {
      createCursorKeys: vi.fn(() => makeCursors()),
      addKey: vi.fn(() => makeKey()),
      on: vi.fn(),
    },
  }

  scene.cameras = {
    main: { fadeIn: vi.fn(), fade: vi.fn(), flash: vi.fn(), shake: vi.fn() },
  }

  scene.time = {
    delayedCall: vi.fn(),
    addEvent: vi.fn(() => ({ remove: vi.fn() })),
  }
  scene.tweens   = { add: vi.fn() }
  scene.sys      = { settings: { key: 'WestGateScene' } }
  scene.scale    = { width: 800, height: 600 }
  scene.scene    = { launch: vi.fn(), pause: vi.fn() }
  scene.sound    = {
    context: {
      createOscillator: vi.fn(() => ({ connect: vi.fn(), start: vi.fn(), stop: vi.fn(), frequency: { value: 0 }, type: '' })),
      createGain: vi.fn(() => ({ connect: vi.fn(), gain: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() }, destination: null })),
      currentTime: 0, destination: null,
    },
  }
  scene.events = { on: vi.fn() }

  vi.spyOn(scene, '_sceneTransition').mockReturnValue(true)

  scene.init({ slopState: { coinCount: 2, maxCoins: 5 }, spawnOrigin: 'east' })
  scene.create()

  scene._dialogue = { active: false, show: vi.fn(), update: vi.fn() }

  return scene
}

// ─────────────────────────────────────────────────────────────────────────────

describe('WestGateScene — init', () => {
  it('stores slopState', () => {
    const s = new WestGateScene()
    s.init({ slopState: { coinCount: 4 } })
    expect(s._slopState.coinCount).toBe(4)
  })

  it('defaults missing data', () => {
    const s = new WestGateScene()
    s.init(undefined)
    expect(s._slopState).toEqual({})
  })
})

describe('WestGateScene — create', () => {
  it('starts with gameActive false', () => {
    const s = makeScene()
    expect(s._gameActive).toBe(false)
  })

  it('starts with zero breaks', () => {
    const s = makeScene()
    expect(s._breaks).toBe(0)
  })

  it('starts with empty growing and sealed walls', () => {
    const s = makeScene()
    expect(s._growingWalls).toHaveLength(0)
    expect(s._sealedMeta).toHaveLength(0)
  })

  it('has a ball body with physics', () => {
    const s = makeScene()
    expect(s._ballBody).toBeDefined()
  })
})

describe('WestGateScene — _calcContainment', () => {
  it('returns 1.0 with no sealed walls', () => {
    const s = makeScene()
    expect(s._calcContainment()).toBe(1.0)
  })

  it('reduces reachable area when vertical wall added', () => {
    const s = makeScene()
    s._ballBody.x = 100
    s._ballBody.y = 308
    s._sealedMeta.push({ col: 18, fromY: 78 })
    const ratio = s._calcContainment()
    expect(ratio).toBeLessThan(1.0)
    expect(ratio).toBeGreaterThan(0)
  })

  it('returns 1.0 when ball is on the wall cell', () => {
    const s = makeScene()
    s._ballBody.x = 40 + 18 * 20 + 10
    s._ballBody.y = 308
    s._sealedMeta.push({ col: 18, fromY: 78 })
    // ball is in the sealed column — should return 1.0
    expect(s._calcContainment()).toBe(1.0)
  })
})

describe('WestGateScene — _breakWall', () => {
  it('increments breaks', () => {
    const s = makeScene()
    s._breakWall({ visual: { destroy: vi.fn() } })
    expect(s._breaks).toBe(1)
  })

  it('triggers lose after 3 breaks', () => {
    const s = makeScene()
    s._gameActive = true
    s._breaks = 2
    s._breakWall({ visual: { destroy: vi.fn() } })
    expect(s._gameActive).toBe(false)
    expect(s.time.delayedCall).toHaveBeenCalled()
  })

  it('does not trigger lose if already won', () => {
    const s = makeScene()
    s._won = true
    s._breaks = 2
    s._breakWall({ visual: { destroy: vi.fn() } })
    expect(s.time.delayedCall).not.toHaveBeenCalled()
  })
})

describe('WestGateScene — sealing', () => {
  it('_sealVertical pushes to sealedMeta', () => {
    const s = makeScene()
    s._sealVertical({ col: 10, wx: 240, tipY: 78, visual: { destroy: vi.fn() } })
    expect(s._sealedMeta.some(m => m.col === 10)).toBe(true)
  })

  it('_sealHorizontal pushes to sealedMeta', () => {
    const s = makeScene()
    s._sealHorizontal({ row: 5, wy: 178, tipX: 760, visual: { destroy: vi.fn() } })
    expect(s._sealedMeta.some(m => m.row === 5)).toBe(true)
  })
})

describe('WestGateScene — _checkWin', () => {
  it('sets _won when containment ≤30%', () => {
    const s = makeScene()
    s._gameActive = true
    vi.spyOn(s, '_calcContainment').mockReturnValue(0.25)
    s._checkWin()
    expect(s._won).toBe(true)
    expect(s._gameActive).toBe(false)
  })

  it('does not win at 50%', () => {
    const s = makeScene()
    s._gameActive = true
    vi.spyOn(s, '_calcContainment').mockReturnValue(0.50)
    s._checkWin()
    expect(s._won).toBe(false)
  })

  it('does nothing if already won', () => {
    const s = makeScene()
    s._won = true
    vi.spyOn(s, '_calcContainment').mockReturnValue(0.05)
    s._checkWin()
    expect(s.cameras.main.flash).not.toHaveBeenCalled()
  })
})

describe('WestGateScene — transitions', () => {
  it('_winTransition sets westGateCleared and goes to WestB0Scene', () => {
    const s = makeScene()
    s._winTransition()
    const [scene, data] = s._sceneTransition.mock.calls[0]
    expect(scene).toBe('WestB0Scene')
    expect(data.slopState.westGateCleared).toBe(true)
  })

  it('_winTransition passes spawnOrigin east', () => {
    const s = makeScene()
    s._winTransition()
    const [, data] = s._sceneTransition.mock.calls[0]
    expect(data.spawnOrigin).toBe('east')
  })

  it('_loseTransition goes to WestScene', () => {
    const s = makeScene()
    s._loseTransition()
    const [scene] = s._sceneTransition.mock.calls[0]
    expect(scene).toBe('WestScene')
  })

  it('_loseTransition preserves slopState', () => {
    const s = makeScene()
    s._slopState = { coinCount: 3 }
    s._loseTransition()
    const [, data] = s._sceneTransition.mock.calls[0]
    expect(data.slopState.coinCount).toBe(3)
    expect(data.slopState.westGateCleared).toBeFalsy()
  })
})

describe('WestGateScene — update', () => {
  it('skips all logic when transitioning', () => {
    const s = makeScene()
    s._transitioning = true
    expect(() => s.update(null, 16)).not.toThrow()
  })

  it('moves bottom cursor left when left key held', () => {
    const s = makeScene()
    s._gameActive = true
    s._cursors.left.isDown = true
    const prev = s._botX
    s.update(null, 16)
    expect(s._botX).toBeLessThan(prev)
  })

  it('moves side cursor up when up key held', () => {
    const s = makeScene()
    s._gameActive = true
    s._cursors.up.isDown = true
    const prev = s._sideY
    s.update(null, 16)
    expect(s._sideY).toBeLessThan(prev)
  })

  it('does not move cursors when game is inactive', () => {
    const s = makeScene()
    s._gameActive = false
    s._cursors.right.isDown = true
    const prev = s._botX
    s.update(null, 16)
    expect(s._botX).toBe(prev)
  })
})
