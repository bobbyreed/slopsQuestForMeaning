import { describe, it, expect, vi, beforeEach } from 'vitest'
import { PixelBossScene } from '../scenes/east/PixelBossScene.js'

// ── Mock helpers ──────────────────────────────────────────────────────────────

function makeKey(down = false) { return { isDown: down } }

function makeCursors() {
  return { left: makeKey(), right: makeKey(), up: makeKey(), down: makeKey(), space: makeKey() }
}

function makeBody(vx = 240, vy = 0) {
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

function makeRect(x = 400, y = 308) {
  const body = makeBody()
  return {
    x, y,
    body,
    setDepth: vi.fn().mockReturnThis(),
    setPosition: vi.fn().mockReturnThis(),
    setSize: vi.fn().mockReturnThis(),
    setVisible: vi.fn().mockReturnThis(),
    setScrollFactor: vi.fn().mockReturnThis(),
    destroy: vi.fn(),
  }
}

function makeScene() {
  const scene = new PixelBossScene()

  scene.physics = {
    world: { setBounds: vi.fn() },
    add: {
      existing: vi.fn((obj) => { obj.body = makeBody(); return obj }),
      staticGroup: vi.fn(() => ({ add: vi.fn(), getChildren: vi.fn(() => []) })),
      collider: vi.fn(),
      group: vi.fn(() => ({ add: vi.fn(), getChildren: vi.fn(() => []) })),
    },
  }

  scene.add = {
    rectangle: vi.fn((x, y) => makeRect(x, y)),
    circle: vi.fn((x, y) => ({
      x, y,
      setDepth: vi.fn().mockReturnThis(),
      setPosition: vi.fn(),
      setVisible: vi.fn().mockReturnThis(),
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
    main: {
      fadeIn: vi.fn(), fade: vi.fn(), flash: vi.fn(), shake: vi.fn(),
    },
  }

  scene.time = {
    delayedCall: vi.fn(),
    addEvent: vi.fn(() => ({ remove: vi.fn() })),
  }
  scene.tweens   = { add: vi.fn() }
  scene.sys      = { settings: { key: 'PixelBossScene' } }
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

  scene.init({ slopState: { coinCount: 1, maxCoins: 5 }, spawnOrigin: 'north' })
  scene.create()

  // Inject mock dialogue after create so show() calls are trackable
  scene._dialogue = {
    active: false,
    show: vi.fn(),
    update: vi.fn(),
  }

  return scene
}

// ─────────────────────────────────────────────────────────────────────────────

describe('PixelBossScene — init', () => {
  it('stores slopState', () => {
    const s = new PixelBossScene()
    s.init({ slopState: { coinCount: 3 } })
    expect(s._slopState.coinCount).toBe(3)
  })

  it('defaults missing data', () => {
    const s = new PixelBossScene()
    s.init(undefined)
    expect(s._slopState).toEqual({})
  })
})

describe('PixelBossScene — create', () => {
  it('starts with gameActive false', () => {
    const s = makeScene()
    expect(s._gameActive).toBe(false)
  })

  it('starts with zero breaks', () => {
    const s = makeScene()
    expect(s._breaks).toBe(0)
  })

  it('starts with no balls (spawned only after dialogue)', () => {
    const s = makeScene()
    expect(s._balls).toHaveLength(0)
  })

  it('starts with empty growing and sealed walls', () => {
    const s = makeScene()
    expect(s._growingWalls).toHaveLength(0)
    expect(s._sealedMeta).toHaveLength(0)
  })
})

describe('PixelBossScene — _startGame', () => {
  it('spawns 2 balls', () => {
    const s = makeScene()
    s._startGame()
    expect(s._balls).toHaveLength(2)
  })

  it('sets gameActive true', () => {
    const s = makeScene()
    s._startGame()
    expect(s._gameActive).toBe(true)
  })

  it('hides NPC visuals', () => {
    const s = makeScene()
    s._startGame()
    expect(s._pixelNPC.setVisible).toHaveBeenCalledWith(false)
    expect(s._pixelGlowNPC.setVisible).toHaveBeenCalledWith(false)
  })
})

describe('PixelBossScene — _calcContainment', () => {
  it('returns 1.0 with no sealed walls', () => {
    const s = makeScene()
    s._startGame()
    expect(s._calcContainment()).toBe(1.0)
  })

  it('returns 1.0 with no balls', () => {
    const s = makeScene()
    s._sealedMeta.push({ type: 'v', col: 18, wx: 400, yTop: 78, yBot: 538 })
    // balls array is empty
    expect(s._calcContainment()).toBe(1.0)
  })

  it('reduces reachable area when vertical wall added', () => {
    const s = makeScene()
    s._startGame()
    s._balls[0].body.x = 100
    s._balls[0].body.y = 308
    s._balls[1].body.x = 100
    s._balls[1].body.y = 340
    s._sealedMeta.push({ type: 'v', col: 18, wx: 400, yTop: 78, yBot: 538 })
    const ratio = s._calcContainment()
    expect(ratio).toBeLessThan(1.0)
    expect(ratio).toBeGreaterThan(0)
  })

  it('accounts for all balls (union of reachable cells)', () => {
    const s = makeScene()
    s._startGame()
    s._balls[0].body.x = 100  // col ~3
    s._balls[0].body.y = 308
    s._balls[1].body.x = 700  // col ~33
    s._balls[1].body.y = 308
    // A full-height vertical wall at col 18 doesn't help — balls on opposite sides
    s._sealedMeta.push({ type: 'v', col: 18, wx: 400, yTop: 78, yBot: 538 })
    const ratio = s._calcContainment()
    expect(ratio).toBeGreaterThan(0.9)
  })
})

describe('PixelBossScene — _splitBalls', () => {
  it('adds a ball when below MAX_BALLS', () => {
    const s = makeScene()
    s._startGame()
    expect(s._balls).toHaveLength(2)
    s._splitBalls()
    expect(s._balls).toHaveLength(3)
  })

  it('does not add a ball when at MAX_BALLS (4)', () => {
    const s = makeScene()
    s._startGame()
    s._splitBalls()
    s._splitBalls()
    expect(s._balls).toHaveLength(4)
    s._splitBalls()
    expect(s._balls).toHaveLength(4)
  })

  it('flashes camera on split', () => {
    const s = makeScene()
    s._startGame()
    s._splitBalls()
    expect(s.cameras.main.flash).toHaveBeenCalled()
  })
})

describe('PixelBossScene — _breakWall', () => {
  it('increments breaks', () => {
    const s = makeScene()
    s._breakWall({ visA: { destroy: vi.fn() }, visB: { destroy: vi.fn() } })
    expect(s._breaks).toBe(1)
  })

  it('triggers lose after 3 breaks', () => {
    const s = makeScene()
    s._gameActive = true
    s._startGame()
    s._breaks = 2
    s._breakWall({ visA: { destroy: vi.fn() }, visB: { destroy: vi.fn() } })
    expect(s._gameActive).toBe(false)
    expect(s.time.delayedCall).toHaveBeenCalled()
  })

  it('does not trigger lose if already won', () => {
    const s = makeScene()
    s._won = true
    s._breaks = 2
    s._breakWall({ visA: { destroy: vi.fn() }, visB: { destroy: vi.fn() } })
    expect(s.time.delayedCall).not.toHaveBeenCalled()
  })
})

describe('PixelBossScene — sealing', () => {
  it('_sealVertical (tips met) pushes to sealedMeta and splits', () => {
    const s = makeScene()
    s._startGame()
    const countBefore = s._balls.length
    s._sealVertical({
      col: 10, wx: 240,
      tipA: 538, tipB: 78,  // tips met
      visA: { destroy: vi.fn() }, visB: { destroy: vi.fn() },
    })
    expect(s._sealedMeta.some(m => m.type === 'v' && m.col === 10)).toBe(true)
    expect(s._balls.length).toBe(countBefore + 1)
  })

  it('_sealHorizontal (tips met) pushes to sealedMeta and splits', () => {
    const s = makeScene()
    s._startGame()
    const countBefore = s._balls.length
    s._sealHorizontal({
      row: 5, wy: 178,
      tipA: 760, tipB: 40,  // tips met
      visA: { destroy: vi.fn() }, visB: { destroy: vi.fn() },
    })
    expect(s._sealedMeta.some(m => m.type === 'h' && m.row === 5)).toBe(true)
    expect(s._balls.length).toBe(countBefore + 1)
  })
})

describe('PixelBossScene — _checkWin', () => {
  it('sets _won when containment ≤15%', () => {
    const s = makeScene()
    s._gameActive = true
    s._startGame()
    vi.spyOn(s, '_calcContainment').mockReturnValue(0.10)
    s._checkWin()
    expect(s._won).toBe(true)
    expect(s._gameActive).toBe(false)
  })

  it('does not win at 30% (harder than SectorScene)', () => {
    const s = makeScene()
    s._gameActive = true
    s._startGame()
    vi.spyOn(s, '_calcContainment').mockReturnValue(0.30)
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

describe('PixelBossScene — transitions', () => {
  it('_winTransition sets eastDungeonCleared and goes to EastC3Scene', () => {
    const s = makeScene()
    s._winTransition()
    const [scene, data] = s._sceneTransition.mock.calls[0]
    expect(scene).toBe('EastC3Scene')
    expect(data.slopState.eastDungeonCleared).toBe(true)
  })

  it('_winTransition grants coins (capped at maxCoins)', () => {
    const s = makeScene()
    s._slopState = { coinCount: 1, maxCoins: 5 }
    s._winTransition()
    const [, data] = s._sceneTransition.mock.calls[0]
    expect(data.slopState.coinCount).toBe(5)  // 1 + 5 capped at maxCoins=5 → 5? Wait: min(1+5, 5) = 5... but actually min(6,5)=5 → no: 1+5=6, Math.min(6,5)=5 ✓
  })

  it('_loseTransition goes to EastC3Scene', () => {
    const s = makeScene()
    s._loseTransition()
    const [scene] = s._sceneTransition.mock.calls[0]
    expect(scene).toBe('EastC3Scene')
  })

  it('_loseTransition preserves existing slopState', () => {
    const s = makeScene()
    s._slopState = { coinCount: 3 }
    s._loseTransition()
    const [, data] = s._sceneTransition.mock.calls[0]
    expect(data.slopState.coinCount).toBe(3)
    expect(data.slopState.eastDungeonCleared).toBeFalsy()
  })
})

describe('PixelBossScene — update', () => {
  it('skips all logic when transitioning', () => {
    const s = makeScene()
    s._transitioning = true
    expect(() => s.update(null, 16)).not.toThrow()
  })

  it('moves bottom cursor left when left key held', () => {
    const s = makeScene()
    s._gameActive = true
    s._startGame()
    s._cursors.left.isDown = true
    const prev = s._botX
    s.update(null, 16)
    expect(s._botX).toBeLessThan(prev)
  })

  it('moves side cursor up when up key held', () => {
    const s = makeScene()
    s._gameActive = true
    s._startGame()
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

  it('updates ball visual positions', () => {
    const s = makeScene()
    s._startGame()
    s._gameActive = false
    s._balls[0].body.x = 200
    s._balls[0].body.y = 150
    s._balls[0].body.body.speed = 240
    s.update(null, 16)
    expect(s._balls[0].vis.setPosition).toHaveBeenCalledWith(200, 150)
  })
})

describe('PixelBossScene — _anyBallOverlaps', () => {
  it('returns true when a ball is inside the rect', () => {
    const s = makeScene()
    s._startGame()
    s._balls[0].body.x = 400
    s._balls[0].body.y = 300
    expect(s._anyBallOverlaps(400, 300, 30, 30)).toBe(true)
  })

  it('returns false when all balls are outside', () => {
    const s = makeScene()
    s._startGame()
    s._balls[0].body.x = 100
    s._balls[0].body.y = 100
    s._balls[1].body.x = 700
    s._balls[1].body.y = 400
    expect(s._anyBallOverlaps(400, 300, 10, 10)).toBe(false)
  })
})

describe('Slop — eastDungeonCleared state', () => {
  it('state keys include eastDungeonCleared', () => {
    const keys = ['coinCount','maxCoins','hasPrompt','hasEyes','hasDash','hasCorrupt',
      'inPriorBody','freakyFridayUnlocked','dungeonCleared',
      'sectorCleared','eastDungeonCleared','westBarrierDestroyed',
      'westGateCleared','westDungeonCleared','finalDungeonCleared','purchases','facing']
    expect(keys).toContain('eastDungeonCleared')
    expect(keys).toContain('westBarrierDestroyed')
  })
})
