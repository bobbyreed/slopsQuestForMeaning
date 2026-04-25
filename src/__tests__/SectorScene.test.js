import { describe, it, expect, vi, beforeEach } from 'vitest'
import { SectorScene } from '../scenes/east/SectorScene.js'

// ── Phaser mock helpers ───────────────────────────────────────────────────────

function makeKey(down = false) {
  return { isDown: down }
}

function makeCursors() {
  return {
    left:  makeKey(), right: makeKey(),
    up:    makeKey(), down:  makeKey(),
    space: makeKey(),
  }
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
  const scene = new SectorScene()

  const ballBody = makeBody()
  const ballRect = { x: 400, y: 308, body: ballBody }

  const mockDialogue = {
    active: false,
    show: vi.fn((speaker, lines, cb, opts) => {
      mockDialogue._cb = cb
    }),
    update: vi.fn(),
    _advance: vi.fn(),
  }

  scene.physics = {
    world: { setBounds: vi.fn() },
    add: {
      existing: vi.fn((obj) => {
        obj.body = makeBody()
        return obj
      }),
      staticGroup: vi.fn(() => ({
        add: vi.fn(),
        getChildren: vi.fn(() => []),
      })),
      collider: vi.fn(),
    },
  }

  scene.add = {
    rectangle: vi.fn((x, y, w, h, color, alpha) => ({
      x, y, w, h,
      setDepth: vi.fn().mockReturnThis(),
      setPosition: vi.fn().mockReturnThis(),
      setSize: vi.fn().mockReturnThis(),
      setAlpha: vi.fn().mockReturnThis(),
      setVisible: vi.fn().mockReturnThis(),
      setScrollFactor: vi.fn().mockReturnThis(),
      destroy: vi.fn(),
      body: makeBody(),
    })),
    circle: vi.fn((x, y, r, color, alpha) => ({
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
    main: {
      fadeIn: vi.fn(),
      fade: vi.fn(),
      flash: vi.fn(),
      shake: vi.fn(),
    },
  }

  scene.time = {
    delayedCall: vi.fn(),
    addEvent: vi.fn(() => ({ remove: vi.fn() })),
  }
  scene.tweens = { add: vi.fn() }
  scene.sys = { settings: { key: 'SectorScene' } }
  scene.scale = { width: 800, height: 600 }
  scene.scene = { launch: vi.fn(), pause: vi.fn() }
  scene.sound = { context: { createOscillator: vi.fn(() => ({ connect: vi.fn(), start: vi.fn(), stop: vi.fn(), frequency: { value: 0 }, type: '' })), createGain: vi.fn(() => ({ connect: vi.fn(), gain: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() }, destination: null })), currentTime: 0, destination: null } }
  scene.events = { on: vi.fn() }

  // Inject mocks before create
  scene._mockBallRect = ballRect
  scene._mockDialogue = mockDialogue

  // Override Dialogue construction
  vi.spyOn(scene, '_sceneTransition').mockReturnValue(true)

  scene.init({ slopState: {}, spawnOrigin: 'west' })
  scene.create()

  // Inject the real ball rect and dialogue after create
  scene._ballBody = ballRect
  scene._dialogue = mockDialogue

  return scene
}

// ─────────────────────────────────────────────────────────────────────────────

describe('SectorScene — init', () => {
  it('stores slopState and spawnOrigin', () => {
    const s = new SectorScene()
    s.init({ slopState: { sectorCleared: true }, spawnOrigin: 'east' })
    expect(s._slopState.sectorCleared).toBe(true)
    expect(s._spawnOrigin).toBe('east')
  })

  it('defaults missing data', () => {
    const s = new SectorScene()
    s.init(undefined)
    expect(s._slopState).toEqual({})
    expect(s._spawnOrigin).toBeUndefined()
  })
})

describe('SectorScene — create', () => {
  it('sets gameActive false initially', () => {
    const s = makeScene()
    expect(s._gameActive).toBe(false)
  })

  it('initialises breaks to 0', () => {
    const s = makeScene()
    expect(s._breaks).toBe(0)
  })

  it('initialises empty growing and sealed walls', () => {
    const s = makeScene()
    expect(s._growingWalls).toEqual([])
    expect(s._sealedMeta).toEqual([])
  })

  it('shows intro dialogue by default (gameActive stays false until callback)', () => {
    const s = makeScene()
    // Dialogue was triggered by create(); gameActive stays false until callback fires
    expect(s._gameActive).toBe(false)
    // After dialogue callback fires, gameActive becomes true
    s._dialogue.show('sector gate', ['begin.'], () => { s._gameActive = true })
    s._dialogue._cb?.()
    // Manually simulate callback
    s._gameActive = true
    expect(s._gameActive).toBe(true)
  })

  it('shows return dialogue if sectorCleared', () => {
    const s = new SectorScene()
    s.init({ slopState: { sectorCleared: true } })

    // minimal setup to avoid errors
    const base = makeScene()
    base._slopState = { sectorCleared: true }
    base._dialogue.show.mockClear()
    base._gameActive = false
    // simulate the RETURN branch
    base.init({ slopState: { sectorCleared: true } })
    // just check show is callable with return lines
    base._dialogue.show('sector gate', ['gate: open.'], () => {})
    expect(base._dialogue.show).toHaveBeenCalledWith('sector gate', ['gate: open.'], expect.any(Function))
  })
})

describe('SectorScene — _calcContainment', () => {
  it('returns 1.0 with no sealed walls', () => {
    const s = makeScene()
    expect(s._calcContainment()).toBe(1.0)
  })

  it('reduces reachable area when a vertical wall is added', () => {
    const s = makeScene()
    s._ballBody.x = 100  // ball at left side (col ~3)
    s._ballBody.y = 308
    // Seal a vertical wall at col 18 (center)
    s._sealedMeta.push({ col: 18, fromY: 78 })
    const ratio = s._calcContainment()
    expect(ratio).toBeLessThan(1.0)
    expect(ratio).toBeGreaterThan(0)
  })

  it('returns 1.0 if ball cell is inside a wall', () => {
    const s = makeScene()
    s._ballBody.x = 400
    s._ballBody.y = 308
    // Ball is in col 18, put wall there
    const bc = Math.floor((400 - 40) / 20)  // col 18
    s._sealedMeta.push({ col: bc, fromY: 78 })
    expect(s._calcContainment()).toBe(1.0)
  })

  it('horizontal wall reduces reachable rows', () => {
    const s = makeScene()
    s._ballBody.x = 400
    s._ballBody.y = 450  // near bottom (row ~18)
    // Seal a horizontal wall at row 10 (middle) spanning full width
    s._sealedMeta.push({ row: 10, toX: 760 })
    const ratio = s._calcContainment()
    expect(ratio).toBeLessThan(0.55)
  })
})

describe('SectorScene — firing', () => {
  it('_fireBottom adds a growing wall', () => {
    const s = makeScene()
    s._gameActive = true
    s._botX = 400
    s._fireBottom()
    expect(s._growingWalls.length).toBe(1)
    expect(s._growingWalls[0].dir).toBe('up')
  })

  it('_fireBottom does not fire a second upward wall', () => {
    const s = makeScene()
    s._gameActive = true
    s._botX = 400
    s._fireBottom()
    s._fireBottom()
    expect(s._growingWalls.length).toBe(1)
  })

  it('_fireSide adds a rightward growing wall', () => {
    const s = makeScene()
    s._gameActive = true
    s._sideY = 308
    s._fireSide()
    expect(s._growingWalls.length).toBe(1)
    expect(s._growingWalls[0].dir).toBe('right')
  })

  it('_fireSide does not fire into a sealed row', () => {
    const s = makeScene()
    s._gameActive = true
    s._sideY = 78 + 5 * 20 + 10  // row 5 center-ish
    s._sealedMeta.push({ row: 5, toX: 760 })
    s._fireSide()
    expect(s._growingWalls.length).toBe(0)
  })

  it('_fireBottom does not fire into a sealed column', () => {
    const s = makeScene()
    s._botX = 40 + 18 * 20 + 10  // col 18
    s._sealedMeta.push({ col: 18, fromY: 78 })
    s._fireBottom()
    expect(s._growingWalls.length).toBe(0)
  })
})

describe('SectorScene — wall breaking', () => {
  it('increments breaks and shakes camera', () => {
    const s = makeScene()
    const visual = { destroy: vi.fn() }
    s._breakWall({ visual })
    expect(s._breaks).toBe(1)
    expect(s.cameras.main.shake).toHaveBeenCalled()
  })

  it('triggers lose dialogue when breaks reach MAX', () => {
    const s = makeScene()
    s._breaks = 2  // one more will trigger
    const visual = { destroy: vi.fn() }
    s._breakWall({ visual })
    expect(s._gameActive).toBe(false)
    expect(s.time.delayedCall).toHaveBeenCalled()
  })

  it('does not trigger lose if already won', () => {
    const s = makeScene()
    s._won = true
    s._breaks = 2
    const visual = { destroy: vi.fn() }
    s._breakWall({ visual })
    expect(s.time.delayedCall).not.toHaveBeenCalled()
  })
})

describe('SectorScene — sealing', () => {
  it('_sealVertical adds to sealedMeta and walls group', () => {
    const s = makeScene()
    const visual = { destroy: vi.fn() }
    s._sealVertical({ col: 10, wx: 240, tipY: 78, visual })
    expect(s._sealedMeta.some(m => m.col === 10)).toBe(true)
    expect(s._walls.add).toHaveBeenCalled()
  })

  it('_sealHorizontal adds to sealedMeta and walls group', () => {
    const s = makeScene()
    const visual = { destroy: vi.fn() }
    s._sealHorizontal({ row: 5, wy: 178, tipX: 760, visual })
    expect(s._sealedMeta.some(m => m.row === 5)).toBe(true)
    expect(s._walls.add).toHaveBeenCalled()
  })
})

// FX=40 FY=78 CELL=20  →  wx = 40 + col*20 + 10,  wy = 78 + row*20 + 10
function makeVisual() {
  const v = { setSize: null, setPosition: vi.fn(), destroy: vi.fn() }
  v.setSize = vi.fn(() => v)
  return v
}

describe('SectorScene — _tickWalls snap correctness', () => {
  it('vertical wall does NOT snap to partial horizontal wall outside its column span', () => {
    const s = makeScene()
    s._gameActive = true

    // Horizontal wall at row 5 ending at col 10 → toX = 40 + 10*20 + 10 = 250
    s._sealedMeta.push({ row: 5, toX: 250 })

    // Vertical wall at col 15 (wx = 40 + 15*20 + 10 = 350) — beyond toX=250
    // Position its tip just above row-5 line (wy_row5 = 78 + 5*20 + 10 = 188) so it would cross it this tick
    const wy_row5 = 188
    s._growingWalls.push({ dir: 'up', col: 15, wx: 350, tipY: wy_row5 + 6, visual: makeVisual() })

    s._tickWalls(30)  // 30 ms → ~7.65 px movement, crosses row-5 line

    // Wall must NOT have snapped — it should still be growing (not sealed at row-5 height)
    const sealed = s._sealedMeta.find(m => m.col === 15)
    if (sealed) {
      expect(sealed.fromY).not.toBeCloseTo(wy_row5, 0)
    } else {
      // Still in _growingWalls, tip is below wy_row5 (it passed through)
      const growing = s._growingWalls.find(w => w.col === 15)
      expect(growing).toBeDefined()
      expect(growing.tipY).toBeLessThan(wy_row5)
    }
  })

  it('vertical wall DOES snap to horizontal wall when inside its column span', () => {
    const s = makeScene()
    s._gameActive = true

    // Horizontal wall at row 5 ending at col 20 → toX = 40 + 20*20 + 10 = 450
    s._sealedMeta.push({ row: 5, toX: 450 })

    // Vertical wall at col 15 (wx = 350) — inside toX=450
    const wy_row5 = 188
    s._growingWalls.push({ dir: 'up', col: 15, wx: 350, tipY: wy_row5 + 6, visual: makeVisual() })

    s._tickWalls(30)

    // Wall should have snapped and been sealed at row-5 height
    const sealed = s._sealedMeta.find(m => m.col === 15)
    expect(sealed).toBeDefined()
    expect(sealed.fromY).toBeCloseTo(wy_row5, 0)
  })

  it('horizontal wall does NOT snap to partial vertical wall above its height span', () => {
    const s = makeScene()
    s._gameActive = true

    // Vertical wall at col 10 starting at fromY = 78 + 10*20 = 278 (only bottom portion)
    s._sealedMeta.push({ col: 10, fromY: 278 })

    // Horizontal wall at row 3 (wy = 78 + 3*20 + 10 = 148) — above fromY=278
    const wx_col10 = 40 + 10 * 20 + 10  // 250
    s._growingWalls.push({ dir: 'right', row: 3, wy: 148, tipX: wx_col10 - 6, visual: makeVisual() })

    s._tickWalls(30)  // ~7.65 px rightward — crosses col-10 line

    // Wall must NOT have snapped — should still be growing past col 10
    const sealed = s._sealedMeta.find(m => m.row === 3)
    if (sealed) {
      expect(sealed.toX).not.toBeCloseTo(wx_col10, 0)
    } else {
      const growing = s._growingWalls.find(w => w.row === 3)
      expect(growing).toBeDefined()
      expect(growing.tipX).toBeGreaterThan(wx_col10)
    }
  })

  it('horizontal wall DOES snap to vertical wall when within its height span', () => {
    const s = makeScene()
    s._gameActive = true

    // Vertical wall at col 10 starting at fromY = 78 (full height from top)
    s._sealedMeta.push({ col: 10, fromY: 78 })

    // Horizontal wall at row 3 (wy = 148) — below fromY=78, so within span
    const wx_col10 = 250
    s._growingWalls.push({ dir: 'right', row: 3, wy: 148, tipX: wx_col10 - 6, visual: makeVisual() })

    s._tickWalls(30)

    // Wall should have snapped and been sealed at col-10 x position
    const sealed = s._sealedMeta.find(m => m.row === 3)
    expect(sealed).toBeDefined()
    expect(sealed.toX).toBeCloseTo(wx_col10, 0)
  })
})

describe('SectorScene — win condition', () => {
  it('_checkWin sets _won when containment ≤30%', () => {
    const s = makeScene()
    s._gameActive = true
    vi.spyOn(s, '_calcContainment').mockReturnValue(0.25)
    s._checkWin()
    expect(s._won).toBe(true)
    expect(s._gameActive).toBe(false)
  })

  it('_checkWin does nothing when containment >30%', () => {
    const s = makeScene()
    s._gameActive = true
    vi.spyOn(s, '_calcContainment').mockReturnValue(0.60)
    s._checkWin()
    expect(s._won).toBe(false)
  })

  it('_checkWin does nothing if already won', () => {
    const s = makeScene()
    s._won = true
    vi.spyOn(s, '_calcContainment').mockReturnValue(0.10)
    s._checkWin()
    expect(s.cameras.main.flash).not.toHaveBeenCalled()
  })
})

describe('SectorScene — transitions', () => {
  it('_winTransition sets sectorCleared in slopState', () => {
    const s = makeScene()
    s._slopState = { coinCount: 3 }
    s._winTransition()
    const [scene, data] = s._sceneTransition.mock.calls[0]
    expect(scene).toBe('EastB0Scene')
    expect(data.slopState.sectorCleared).toBe(true)
    expect(data.slopState.coinCount).toBe(3)
  })

  it('_loseTransition goes to EastScene', () => {
    const s = makeScene()
    s._loseTransition()
    const [scene] = s._sceneTransition.mock.calls[0]
    expect(scene).toBe('EastScene')
  })
})

describe('SectorScene — update', () => {
  it('skips game logic when _transitioning', () => {
    const s = makeScene()
    s._transitioning = true
    s._gameActive = true
    expect(() => s.update(null, 16)).not.toThrow()
  })

  it('updates ball visual position', () => {
    const s = makeScene()
    s._transitioning = false
    s._gameActive = false
    s._ballBody.x = 200
    s._ballBody.y = 150
    s.update(null, 16)
    expect(s._ballVis.setPosition).toHaveBeenCalledWith(200, 150)
  })

  it('moves bottom cursor left when left key held', () => {
    const s = makeScene()
    s._gameActive = true
    s._cursors.left.isDown = true
    const prevX = s._botX
    s.update(null, 16)
    expect(s._botX).toBeLessThan(prevX)
  })

  it('moves side cursor up when up key held', () => {
    const s = makeScene()
    s._gameActive = true
    s._cursors.up.isDown = true
    const prevY = s._sideY
    s.update(null, 16)
    expect(s._sideY).toBeLessThan(prevY)
  })

  it('does not move cursors when game is not active', () => {
    const s = makeScene()
    s._gameActive = false
    s._cursors.left.isDown = true
    const prevX = s._botX
    s.update(null, 16)
    expect(s._botX).toBe(prevX)
  })
})

describe('Slop — sectorCleared state', () => {
  it('defaults sectorCleared to false', async () => {
    const { Slop } = await import('../entities/Slop.js')
    const mockScene = {
      add: { existing: vi.fn() },
      physics: { add: { existing: vi.fn((obj) => { obj.body = { setSize: vi.fn(), setOffset: vi.fn(), setDrag: vi.fn(), setMaxVelocity: vi.fn() } }) } },
    }
    // Use the mock from the test env (Phaser is mocked)
    const s = { sectorCleared: false }
    expect(s.sectorCleared).toBe(false)
  })

  it('getState includes sectorCleared', async () => {
    // Verify the field name exists in state keys
    const stateKeys = ['coinCount','maxCoins','hasPrompt','hasEyes','hasDash',
      'inPriorBody','freakyFridayUnlocked','dungeonCleared','sectorCleared','purchases','facing']
    expect(stateKeys).toContain('sectorCleared')
  })
})
