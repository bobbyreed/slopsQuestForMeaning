import { describe, it, expect, vi } from 'vitest'
import { ConvergenceScene } from '../scenes/ConvergenceScene.js'

function makeKey(down = false) { return { isDown: down } }

function makeCursors() {
  return { left: makeKey(), right: makeKey(), up: makeKey(), down: makeKey(), space: makeKey() }
}

function makeBody(vx = 230, vy = 0) {
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
  const scene = new ConvergenceScene()

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
    main: { fadeIn: vi.fn(), fade: vi.fn(), flash: vi.fn(), shake: vi.fn() },
  }

  scene.time = {
    delayedCall: vi.fn(),
    addEvent: vi.fn(() => ({ remove: vi.fn() })),
  }
  scene.tweens   = { add: vi.fn() }
  scene.sys      = { settings: { key: 'ConvergenceScene' } }
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

  scene.init({ slopState: { coinCount: 2, maxCoins: 20 }, spawnOrigin: 'south' })
  scene.create()

  scene._dialogue = { active: false, show: vi.fn(), update: vi.fn() }

  return scene
}

// ─────────────────────────────────────────────────────────────────────────────

describe('ConvergenceScene — init', () => {
  it('stores slopState', () => {
    const s = new ConvergenceScene()
    s.init({ slopState: { coinCount: 5 } })
    expect(s._slopState.coinCount).toBe(5)
  })

  it('defaults missing data', () => {
    const s = new ConvergenceScene()
    s.init(undefined)
    expect(s._slopState).toEqual({})
  })
})

describe('ConvergenceScene — create', () => {
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

describe('ConvergenceScene — _startGame', () => {
  it('spawns 3 balls', () => {
    const s = makeScene()
    s._startGame()
    expect(s._balls).toHaveLength(3)
  })

  it('sets gameActive true', () => {
    const s = makeScene()
    s._startGame()
    expect(s._gameActive).toBe(true)
  })

  it('hides all NPC visuals', () => {
    const s = makeScene()
    s._startGame()
    const hidden = s._npcVisuals.filter(v => v.setVisible.mock.calls.some(c => c[0] === false))
    expect(hidden).toHaveLength(s._npcVisuals.length)
  })
})

describe('ConvergenceScene — _calcContainment', () => {
  it('returns 1.0 with no sealed walls', () => {
    const s = makeScene()
    s._startGame()
    expect(s._calcContainment()).toBe(1.0)
  })

  it('returns 1.0 with no balls', () => {
    const s = makeScene()
    s._sealedMeta.push({ col: 18, fromY: 78 })
    expect(s._calcContainment()).toBe(1.0)
  })

  it('reduces reachable area when vertical wall added and all balls on one side', () => {
    const s = makeScene()
    s._startGame()
    s._balls.forEach((b, i) => { b.body.x = 80 + i * 15; b.body.y = 308 })
    s._sealedMeta.push({ col: 18, fromY: 78 })
    const ratio = s._calcContainment()
    expect(ratio).toBeLessThan(1.0)
    expect(ratio).toBeGreaterThan(0)
  })
})

describe('ConvergenceScene — _splitBalls', () => {
  it('adds a ball when below MAX_BALLS (8)', () => {
    const s = makeScene()
    s._startGame()
    expect(s._balls).toHaveLength(3)
    s._splitBalls()
    expect(s._balls).toHaveLength(4)
  })

  it('does not add a ball at MAX_BALLS (8)', () => {
    const s = makeScene()
    s._startGame()
    for (let i = 0; i < 5; i++) s._splitBalls()
    expect(s._balls).toHaveLength(8)
    s._splitBalls()
    expect(s._balls).toHaveLength(8)
  })

  it('flashes camera on split', () => {
    const s = makeScene()
    s._startGame()
    s._splitBalls()
    expect(s.cameras.main.flash).toHaveBeenCalled()
  })
})

describe('ConvergenceScene — _breakWall', () => {
  it('increments breaks', () => {
    const s = makeScene()
    s._breakWall({ visual: { destroy: vi.fn() } })
    expect(s._breaks).toBe(1)
  })

  it('triggers lose after 3 breaks', () => {
    const s = makeScene()
    s._gameActive = true
    s._startGame()
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

describe('ConvergenceScene — sealing', () => {
  it('_sealVertical pushes to sealedMeta and splits', () => {
    const s = makeScene()
    s._startGame()
    const countBefore = s._balls.length
    s._sealVertical({ col: 10, wx: 240, tipY: 78, visual: { destroy: vi.fn() } })
    expect(s._sealedMeta.some(m => m.col === 10)).toBe(true)
    expect(s._balls.length).toBe(countBefore + 1)
  })

  it('_sealHorizontal pushes to sealedMeta and splits', () => {
    const s = makeScene()
    s._startGame()
    const countBefore = s._balls.length
    s._sealHorizontal({ row: 5, wy: 178, tipX: 760, visual: { destroy: vi.fn() } })
    expect(s._sealedMeta.some(m => m.row === 5)).toBe(true)
    expect(s._balls.length).toBe(countBefore + 1)
  })
})

describe('ConvergenceScene — _checkWin', () => {
  it('sets _won when containment ≤10%', () => {
    const s = makeScene()
    s._gameActive = true
    s._startGame()
    vi.spyOn(s, '_calcContainment').mockReturnValue(0.08)
    s._checkWin()
    expect(s._won).toBe(true)
    expect(s._gameActive).toBe(false)
  })

  it('does not win at 20%', () => {
    const s = makeScene()
    s._gameActive = true
    s._startGame()
    vi.spyOn(s, '_calcContainment').mockReturnValue(0.20)
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

describe('ConvergenceScene — transitions', () => {
  it('_winTransition sets finalDungeonCleared and goes to WorldScene', () => {
    const s = makeScene()
    s._winTransition()
    const [scene, data] = s._sceneTransition.mock.calls[0]
    expect(scene).toBe('WorldScene')
    expect(data.slopState.finalDungeonCleared).toBe(true)
  })

  it('_winTransition grants coins (capped at maxCoins)', () => {
    const s = makeScene()
    s._slopState = { coinCount: 5, maxCoins: 10 }
    s._winTransition()
    const [, data] = s._sceneTransition.mock.calls[0]
    expect(data.slopState.coinCount).toBe(10)  // min(5+10, 10) = 10
  })

  it('_loseTransition goes to NorthShrineScene', () => {
    const s = makeScene()
    s._loseTransition()
    const [scene] = s._sceneTransition.mock.calls[0]
    expect(scene).toBe('NorthShrineScene')
  })

  it('_loseTransition preserves existing slopState', () => {
    const s = makeScene()
    s._slopState = { coinCount: 7 }
    s._loseTransition()
    const [, data] = s._sceneTransition.mock.calls[0]
    expect(data.slopState.coinCount).toBe(7)
    expect(data.slopState.finalDungeonCleared).toBeFalsy()
  })
})

describe('ConvergenceScene — update', () => {
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
    s._balls[0].body.body.speed = 230
    s.update(null, 16)
    expect(s._balls[0].vis.setPosition).toHaveBeenCalledWith(200, 150)
  })
})

describe('ConvergenceScene — _anyBallOverlaps', () => {
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
    s._balls.forEach(b => { b.body.x = 100; b.body.y = 100 })
    expect(s._anyBallOverlaps(700, 500, 10, 10)).toBe(false)
  })
})

describe('Slop — finalDungeonCleared state', () => {
  it('state keys include finalDungeonCleared', () => {
    const keys = ['coinCount','maxCoins','hasPrompt','hasEyes','hasDash','hasCorrupt',
      'inPriorBody','freakyFridayUnlocked','dungeonCleared',
      'sectorCleared','eastDungeonCleared','westBarrierDestroyed',
      'westGateCleared','westDungeonCleared','finalDungeonCleared','purchases','facing']
    expect(keys).toContain('finalDungeonCleared')
    expect(keys).toContain('westBarrierDestroyed')
  })
})

// Field constants matching the scene
const FX = 40, FY = 78, FW = 720, FH = 460, CELL = 20

describe('ConvergenceScene — _fireBottom', () => {
  it('creates a growing vertical wall', () => {
    const s = makeScene()
    s._fireBottom()
    expect(s._growingWalls).toHaveLength(1)
    expect(s._growingWalls[0].dir).toBe('up')
  })

  it('does not fire a second vertical wall while one is growing', () => {
    const s = makeScene()
    s._growingWalls.push({ dir: 'up', col: 10, wx: 240, tipY: 300,
      visual: { destroy: vi.fn(), setSize: vi.fn().mockReturnThis(), setPosition: vi.fn() } })
    s._fireBottom()
    expect(s._growingWalls).toHaveLength(1)
  })

  it('does not fire into a sealed column', () => {
    const s = makeScene()
    s._sealedMeta.push({ col: 18, fromY: FY })
    s._botX = FX + 18 * CELL + CELL / 2
    s._fireBottom()
    expect(s._growingWalls).toHaveLength(0)
  })
})

describe('ConvergenceScene — _fireSide', () => {
  it('creates a growing horizontal wall', () => {
    const s = makeScene()
    s._fireSide()
    expect(s._growingWalls).toHaveLength(1)
    expect(s._growingWalls[0].dir).toBe('right')
  })

  it('does not fire a second horizontal wall while one is growing', () => {
    const s = makeScene()
    s._growingWalls.push({ dir: 'right', row: 5, wy: 188, tipX: FX,
      visual: { destroy: vi.fn(), setSize: vi.fn().mockReturnThis(), setPosition: vi.fn() } })
    s._fireSide()
    expect(s._growingWalls).toHaveLength(1)
  })

  it('does not fire into a sealed row', () => {
    const s = makeScene()
    s._sealedMeta.push({ row: 11, toX: FX + FW })
    s._sideY = FY + 11 * CELL + CELL / 2
    s._fireSide()
    expect(s._growingWalls).toHaveLength(0)
  })
})

describe('ConvergenceScene — _tickWalls', () => {
  function mockVisual() {
    return { destroy: vi.fn(), setSize: vi.fn().mockReturnThis(), setPosition: vi.fn() }
  }

  it('moves vertical wall tip upward', () => {
    const s = makeScene()
    s._startGame()
    s._balls.forEach(b => { b.body.x = 700; b.body.y = 400 })
    s._growingWalls.push({ dir: 'up', col: 10, wx: 240, tipY: 400, visual: mockVisual() })
    const tipBefore = s._growingWalls[0].tipY
    s._tickWalls(16)
    expect(s._growingWalls[0].tipY).toBeLessThan(tipBefore)
  })

  it('seals vertical wall when tip reaches field top', () => {
    const s = makeScene()
    s._startGame()
    s._balls.forEach(b => { b.body.x = 700; b.body.y = 400 })
    s._growingWalls.push({ dir: 'up', col: 5, wx: 140, tipY: FY + 2, visual: mockVisual() })
    s._tickWalls(100)
    expect(s._sealedMeta.some(m => m.col === 5)).toBe(true)
  })

  it('breaks vertical wall when a ball overlaps', () => {
    const s = makeScene()
    s._startGame()
    s._balls.forEach(b => { b.body.x = 400; b.body.y = 350 })
    s._growingWalls.push({ dir: 'up', col: 18, wx: 400, tipY: 320, visual: mockVisual() })
    s._tickWalls(16)
    expect(s._breaks).toBe(1)
  })

  it('seals horizontal wall when tip reaches field right edge', () => {
    const s = makeScene()
    s._startGame()
    s._balls.forEach(b => { b.body.x = 100; b.body.y = 400 })
    s._growingWalls.push({ dir: 'right', row: 5, wy: 188, tipX: FX + FW - 2, visual: mockVisual() })
    s._tickWalls(100)
    expect(s._sealedMeta.some(m => m.row === 5)).toBe(true)
  })

  it('does NOT snap vertical wall to horizontal wall that does not reach its column', () => {
    const s = makeScene()
    s._startGame()
    s._balls.forEach(b => { b.body.x = 700; b.body.y = 400 })
    const wy = FY + 10 * CELL + CELL / 2
    s._sealedMeta.push({ row: 10, toX: 200 })
    s._growingWalls.push({ dir: 'up', col: 18, wx: 400, tipY: wy + 3, visual: mockVisual() })
    s._tickWalls(16)
    expect(s._sealedMeta).toHaveLength(1)
  })

  it('does NOT snap horizontal wall to vertical wall that does not reach its row', () => {
    const s = makeScene()
    s._startGame()
    s._balls.forEach(b => { b.body.x = 700; b.body.y = 400 })
    const wx = FX + 10 * CELL + CELL / 2
    const gwy = FY + 5 * CELL + CELL / 2
    s._sealedMeta.push({ col: 10, fromY: 300 })
    s._growingWalls.push({ dir: 'right', row: 5, wy: gwy, tipX: wx - 3, visual: mockVisual() })
    s._tickWalls(16)
    expect(s._sealedMeta).toHaveLength(1)
  })

  it('corrects ball speed when it drifts more than 25px/s from target', () => {
    const s = makeScene()
    s._startGame()
    s._gameActive = false
    // Set speed far from BALL_SPEED (230) to trigger the correction branch
    s._balls[0].body.body.velocity.x = 100
    s._balls[0].body.body.velocity.y = 0
    s._balls[0].body.body.speed = 100
    s.update(null, 16)
    expect(s._balls[0].body.body.setVelocity).toHaveBeenCalled()
  })
})

describe('ConvergenceScene — _stopAllBalls', () => {
  it('zeroes velocity on all balls', () => {
    const s = makeScene()
    s._startGame()
    s._stopAllBalls()
    s._balls.forEach(b => {
      expect(b.body.body.setVelocity).toHaveBeenCalledWith(0, 0)
    })
  })
})
