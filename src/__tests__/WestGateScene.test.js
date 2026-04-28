import { describe, it, expect, vi } from 'vitest'
import { WestGateScene } from '../scenes/west/WestGateScene.js'

// Field constants matching the scene
const FX = 40, FY = 78, FW = 720, FH = 460, CELL = 20

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

function mockVisual() {
  return { destroy: vi.fn(), setSize: vi.fn().mockReturnThis(), setPosition: vi.fn() }
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
    s._sealedMeta.push({ type: 'v', col: 18, wx: FX + 18 * CELL + CELL / 2, yTop: FY, yBot: FY + FH })
    const ratio = s._calcContainment()
    expect(ratio).toBeLessThan(1.0)
    expect(ratio).toBeGreaterThan(0)
  })

  it('returns 1.0 when ball is on the wall cell', () => {
    const s = makeScene()
    s._ballBody.x = FX + 18 * CELL + CELL / 2
    s._ballBody.y = 308
    s._sealedMeta.push({ type: 'v', col: 18, wx: FX + 18 * CELL + CELL / 2, yTop: FY, yBot: FY + FH })
    // ball is in the sealed column — should return 1.0
    expect(s._calcContainment()).toBe(1.0)
  })
})

describe('WestGateScene — _breakWall', () => {
  it('increments breaks', () => {
    const s = makeScene()
    s._breakWall({ visA: { destroy: vi.fn() }, visB: { destroy: vi.fn() } })
    expect(s._breaks).toBe(1)
  })

  it('triggers lose after 3 breaks', () => {
    const s = makeScene()
    s._gameActive = true
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

describe('WestGateScene — sealing', () => {
  it('_sealVertical pushes to sealedMeta', () => {
    const s = makeScene()
    s._sealVertical({ col: 10, wx: 240, tipA: FY + FH, tipB: FY, visA: mockVisual(), visB: mockVisual() })
    expect(s._sealedMeta.some(m => m.col === 10)).toBe(true)
  })

  it('_sealHorizontal pushes to sealedMeta', () => {
    const s = makeScene()
    s._sealHorizontal({ row: 5, wy: 178, tipA: FX + FW, tipB: FX, visA: mockVisual(), visB: mockVisual() })
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

describe('WestGateScene — _fireVertical', () => {
  it('creates a growing vertical wall', () => {
    const s = makeScene()
    s._gameActive = true
    s._fireVertical()
    expect(s._growingWalls).toHaveLength(1)
    expect(s._growingWalls[0].type).toBe('vertical')
  })

  it('does not fire a second vertical wall while one is growing', () => {
    const s = makeScene()
    s._growingWalls.push({ type: 'vertical', col: 10, wx: 240,
      tipA: FY, tipB: FY + FH, doneA: false, doneB: false,
      visA: mockVisual(), visB: mockVisual() })
    s._fireVertical()
    expect(s._growingWalls).toHaveLength(1)
  })

  it('does not fire into a sealed column', () => {
    const s = makeScene()
    s._sealedMeta.push({ type: 'v', col: 18, wx: FX + 18 * CELL + CELL / 2, yTop: FY, yBot: FY + FH })
    s._botX = FX + 18 * CELL + CELL / 2   // aim at col 18
    s._fireVertical()
    expect(s._growingWalls).toHaveLength(0)
  })
})

describe('WestGateScene — _fireHorizontal', () => {
  it('creates a growing horizontal wall', () => {
    const s = makeScene()
    s._gameActive = true
    s._fireHorizontal()
    expect(s._growingWalls).toHaveLength(1)
    expect(s._growingWalls[0].type).toBe('horizontal')
  })

  it('does not fire a second horizontal wall while one is growing', () => {
    const s = makeScene()
    s._growingWalls.push({ type: 'horizontal', row: 5, wy: 188,
      tipA: FX, tipB: FX + FW, doneA: false, doneB: false,
      visA: mockVisual(), visB: mockVisual() })
    s._fireHorizontal()
    expect(s._growingWalls).toHaveLength(1)
  })

  it('does not fire into a sealed row', () => {
    const s = makeScene()
    s._sealedMeta.push({ type: 'h', row: 11, wy: FY + 11 * CELL + CELL / 2, xLeft: FX, xRight: FX + FW })
    s._sideY = FY + 11 * CELL + CELL / 2
    s._fireHorizontal()
    expect(s._growingWalls).toHaveLength(0)
  })
})

describe('WestGateScene — _tickWalls', () => {
  it('moves vertical wall tip upward (tipB decreases)', () => {
    const s = makeScene()
    s._growingWalls.push({ type: 'vertical', col: 10, wx: 240,
      tipA: FY, tipB: FY + FH, doneA: false, doneB: false,
      visA: mockVisual(), visB: mockVisual() })
    s._ballBody.x = 700; s._ballBody.y = 400
    const tipBBefore = s._growingWalls[0].tipB
    s._tickWalls(16)
    expect(s._growingWalls[0].tipB).toBeLessThan(tipBBefore)
  })

  it('seals vertical wall when both halves finish', () => {
    const s = makeScene()
    // doneA already true; tipB near FY so one tick finishes it
    s._growingWalls.push({ type: 'vertical', col: 10, wx: 240,
      tipA: FY + FH, tipB: FY + 2, doneA: true, doneB: false,
      visA: mockVisual(), visB: mockVisual() })
    s._ballBody.x = 700; s._ballBody.y = 400
    s._tickWalls(100)
    expect(s._sealedMeta.some(m => m.col === 10)).toBe(true)
    expect(s._growingWalls).toHaveLength(0)
  })

  it('breaks vertical wall when ball overlaps', () => {
    const s = makeScene()
    // tipA has grown down to y=350 — visA spans FY→350, ball at y=350 overlaps it
    s._growingWalls.push({ type: 'vertical', col: 18, wx: 400,
      tipA: 350, tipB: FY + FH, doneA: false, doneB: false,
      visA: mockVisual(), visB: mockVisual() })
    s._ballBody.x = 400; s._ballBody.y = 350
    s._tickWalls(16)
    expect(s._breaks).toBe(1)
    expect(s._growingWalls).toHaveLength(0)
  })

  it('moves horizontal wall tipA rightward', () => {
    const s = makeScene()
    s._growingWalls.push({ type: 'horizontal', row: 5, wy: 188,
      tipA: FX, tipB: FX + FW, doneA: false, doneB: false,
      visA: mockVisual(), visB: mockVisual() })
    s._ballBody.x = 700; s._ballBody.y = 400
    const tipABefore = s._growingWalls[0].tipA
    s._tickWalls(16)
    expect(s._growingWalls[0].tipA).toBeGreaterThan(tipABefore)
  })

  it('seals horizontal wall when both halves finish', () => {
    const s = makeScene()
    // doneA already true; tipB near FX so one tick finishes it
    s._growingWalls.push({ type: 'horizontal', row: 5, wy: 188,
      tipA: FX + FW, tipB: FX + 2, doneA: true, doneB: false,
      visA: mockVisual(), visB: mockVisual() })
    s._ballBody.x = 100; s._ballBody.y = 400
    s._tickWalls(100)
    expect(s._sealedMeta.some(m => m.row === 5)).toBe(true)
    expect(s._growingWalls).toHaveLength(0)
  })

  it('breaks horizontal wall when ball overlaps', () => {
    const s = makeScene()
    const wy = FY + 11 * CELL + CELL / 2
    // tipA has grown right to x=200 — visA spans FX→200, ball at x=200 overlaps it
    s._growingWalls.push({ type: 'horizontal', row: 11, wy,
      tipA: 200, tipB: FX + FW, doneA: false, doneB: false,
      visA: mockVisual(), visB: mockVisual() })
    s._ballBody.x = 200; s._ballBody.y = wy
    s._tickWalls(16)
    expect(s._breaks).toBe(1)
    expect(s._growingWalls).toHaveLength(0)
  })

  it('does NOT snap vertical wall to a horizontal wall that does not reach its column (phantom snap fix)', () => {
    const s = makeScene()
    const wy = FY + 10 * CELL + CELL / 2   // row 10 y = 288
    // Horizontal wall ends at x=200, col 18 is at wx=400 — span does NOT cover col 18
    s._sealedMeta.push({ type: 'h', row: 10, wy, xLeft: FX, xRight: 200 })
    // tipB starts just above wy so one tick crosses it
    s._growingWalls.push({ type: 'vertical', col: 18, wx: 400,
      tipA: FY, tipB: wy + 3, doneA: false, doneB: false,
      visA: mockVisual(), visB: mockVisual() })
    s._ballBody.x = 700; s._ballBody.y = 400
    s._tickWalls(16)   // tipB crosses wy but xRight=200 < wx=400 → no snap
    expect(s._sealedMeta).toHaveLength(1)
  })

  it('does NOT snap horizontal wall to a vertical wall that does not reach its row (phantom snap fix)', () => {
    const s = makeScene()
    const wx = FX + 10 * CELL + CELL / 2   // col 10 wx = 250
    const gwy = FY + 5 * CELL + CELL / 2   // row 5 wy = 188
    // Vertical wall starts at yTop=300 — below row 5 wy=188 (wall does NOT cover that row)
    s._sealedMeta.push({ type: 'v', col: 10, wx, yTop: 300, yBot: FY + FH })
    // tipA starts just left of wx so one tick crosses it
    s._growingWalls.push({ type: 'horizontal', row: 5, wy: gwy,
      tipA: wx - 3, tipB: FX + FW, doneA: false, doneB: false,
      visA: mockVisual(), visB: mockVisual() })
    s._ballBody.x = 700; s._ballBody.y = 400
    s._tickWalls(16)   // tipA crosses wx but yTop=300 > gwy=188 → no snap
    expect(s._sealedMeta).toHaveLength(1)
  })
})
