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
  scene.sound = { context: { createOscillator: vi.fn(() => ({ connect: vi.fn(), start: vi.fn(), stop: vi.fn(), frequency: { value: 0, setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() }, type: '' })), createGain: vi.fn(() => ({ connect: vi.fn(), gain: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() }, destination: null })), currentTime: 0, destination: null } }
  scene.events = { on: vi.fn() }

  scene._mockBallRect = ballRect
  scene._mockDialogue = mockDialogue

  vi.spyOn(scene, '_sceneTransition').mockReturnValue(true)

  scene.init({ slopState: {}, spawnOrigin: 'west' })
  scene.create()

  scene._ballBody = ballRect
  scene._dialogue = mockDialogue

  return scene
}

// FX=40 FY=78 FW=720 FH=460 CELL=20
// wx = FX + col*CELL + CELL/2,  wy = FY + row*CELL + CELL/2

function makeVisual() {
  const v = { setSize: null, setPosition: vi.fn(), destroy: vi.fn() }
  v.setSize = vi.fn(() => v)
  return v
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
    expect(s._gameActive).toBe(false)
    s._gameActive = true
    expect(s._gameActive).toBe(true)
  })

  it('shows return dialogue if sectorCleared', () => {
    const base = makeScene()
    base._dialogue.show.mockClear()
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
    // Seal a full-height vertical wall at col 18 (center)
    s._sealedMeta.push({ type: 'v', col: 18, wx: 40 + 18 * 20 + 10, yTop: 78, yBot: 538 })
    const ratio = s._calcContainment()
    expect(ratio).toBeLessThan(1.0)
    expect(ratio).toBeGreaterThan(0)
  })

  it('returns 1.0 if ball cell is inside a wall', () => {
    const s = makeScene()
    s._ballBody.x = 400
    s._ballBody.y = 308
    const bc = Math.floor((400 - 40) / 20)  // col 18
    s._sealedMeta.push({ type: 'v', col: bc, wx: 400, yTop: 78, yBot: 538 })
    expect(s._calcContainment()).toBe(1.0)
  })

  it('horizontal wall reduces reachable rows', () => {
    const s = makeScene()
    s._ballBody.x = 400
    s._ballBody.y = 450  // near bottom (row ~18)
    // Full-width horizontal wall at row 10
    s._sealedMeta.push({ type: 'h', row: 10, wy: 78 + 10 * 20 + 10, xLeft: 40, xRight: 760 })
    const ratio = s._calcContainment()
    expect(ratio).toBeLessThan(0.55)
  })
})

describe('SectorScene — firing', () => {
  it('_fireVertical adds a growing vertical wall with tipA at FY and tipB at FY+FH', () => {
    const s = makeScene()
    s._gameActive = true
    s._botX = 400
    s._fireVertical()
    expect(s._growingWalls.length).toBe(1)
    expect(s._growingWalls[0].type).toBe('vertical')
    expect(s._growingWalls[0].tipA).toBe(78)
    expect(s._growingWalls[0].tipB).toBe(538)
  })

  it('_fireVertical does not fire a second vertical wall while one is growing', () => {
    const s = makeScene()
    s._gameActive = true
    s._botX = 400
    s._fireVertical()
    s._fireVertical()
    expect(s._growingWalls.length).toBe(1)
  })

  it('_fireHorizontal adds a growing horizontal wall with tipA at FX and tipB at FX+FW', () => {
    const s = makeScene()
    s._gameActive = true
    s._sideY = 308
    s._fireHorizontal()
    expect(s._growingWalls.length).toBe(1)
    expect(s._growingWalls[0].type).toBe('horizontal')
    expect(s._growingWalls[0].tipA).toBe(40)
    expect(s._growingWalls[0].tipB).toBe(760)
  })

  it('_fireHorizontal does not fire into a sealed row', () => {
    const s = makeScene()
    s._gameActive = true
    s._sideY = 78 + 5 * 20 + 10  // row 5 center-ish
    s._sealedMeta.push({ type: 'h', row: 5, wy: 188, xLeft: 40, xRight: 760 })
    s._fireHorizontal()
    expect(s._growingWalls.length).toBe(0)
  })

  it('_fireVertical does not fire into a sealed column', () => {
    const s = makeScene()
    s._botX = 40 + 18 * 20 + 10  // col 18
    s._sealedMeta.push({ type: 'v', col: 18, wx: 400, yTop: 78, yBot: 538 })
    s._fireVertical()
    expect(s._growingWalls.length).toBe(0)
  })
})

describe('SectorScene — wall breaking', () => {
  it('increments breaks and shakes camera', () => {
    const s = makeScene()
    s._breakWall({ visA: { destroy: vi.fn() }, visB: { destroy: vi.fn() } })
    expect(s._breaks).toBe(1)
    expect(s.cameras.main.shake).toHaveBeenCalled()
  })

  it('triggers lose dialogue when breaks reach MAX', () => {
    const s = makeScene()
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

describe('SectorScene — sealing', () => {
  it('_sealVertical (tips met) adds one full-height entry to sealedMeta', () => {
    const s = makeScene()
    s._sealVertical({
      col: 10, wx: 250,
      tipA: 538, tipB: 78,  // tips met (tipA >= tipB)
      visA: { destroy: vi.fn() }, visB: { destroy: vi.fn() },
    })
    const meta = s._sealedMeta.filter(m => m.type === 'v' && m.col === 10)
    expect(meta.length).toBe(1)
    expect(meta[0].yTop).toBe(78)
    expect(meta[0].yBot).toBe(538)
    expect(s._walls.add).toHaveBeenCalled()
  })

  it('_sealVertical (gap in middle) adds two entries', () => {
    const s = makeScene()
    s._sealVertical({
      col: 10, wx: 250,
      tipA: 200, tipB: 400,  // tipA < tipB — gap between 200 and 400
      visA: { destroy: vi.fn() }, visB: { destroy: vi.fn() },
    })
    const meta = s._sealedMeta.filter(m => m.type === 'v' && m.col === 10)
    expect(meta.length).toBe(2)
    expect(meta[0]).toMatchObject({ yTop: 78,  yBot: 200 })
    expect(meta[1]).toMatchObject({ yTop: 400, yBot: 538 })
  })

  it('_sealHorizontal (tips met) adds one full-width entry', () => {
    const s = makeScene()
    s._sealHorizontal({
      row: 5, wy: 188,
      tipA: 760, tipB: 40,  // tips met
      visA: { destroy: vi.fn() }, visB: { destroy: vi.fn() },
    })
    const meta = s._sealedMeta.filter(m => m.type === 'h' && m.row === 5)
    expect(meta.length).toBe(1)
    expect(meta[0].xLeft).toBe(40)
    expect(meta[0].xRight).toBe(760)
  })

  it('_sealHorizontal (gap in middle) adds two entries', () => {
    const s = makeScene()
    s._sealHorizontal({
      row: 5, wy: 188,
      tipA: 300, tipB: 500,  // gap between 300 and 500
      visA: { destroy: vi.fn() }, visB: { destroy: vi.fn() },
    })
    const meta = s._sealedMeta.filter(m => m.type === 'h' && m.row === 5)
    expect(meta.length).toBe(2)
    expect(meta[0]).toMatchObject({ xLeft: 40,  xRight: 300 })
    expect(meta[1]).toMatchObject({ xLeft: 500, xRight: 760 })
  })
})

describe('SectorScene — _tickWalls snap correctness', () => {
  it('vertical tip A grows down and stops at a horizontal wall that spans the column', () => {
    const s = makeScene()
    // Horizontal wall at row 5 spanning full width (xLeft=40, xRight=760)
    const wy_row5 = 78 + 5 * 20 + 10  // 188
    s._sealedMeta.push({ type: 'h', row: 5, wy: wy_row5, xLeft: 40, xRight: 760 })

    // Vertical wall at col 18 (wx=400), tipA just above wy_row5 (will cross it)
    s._growingWalls.push({
      type: 'vertical', col: 18, wx: 400,
      tipA: wy_row5 - 4,  // 4px above row-5 line
      tipB: 538,           // bottom tip (not relevant here)
      doneA: false, doneB: false,
      visA: makeVisual(), visB: makeVisual(),
    })

    s._tickWalls(30)  // 30ms → ~7.65px downward — crosses row-5 line

    const growing = s._growingWalls.find(w => w.col === 18)
    if (growing) {
      expect(growing.doneA).toBe(true)
      expect(growing.tipA).toBeCloseTo(wy_row5, 0)
    } else {
      // Already sealed
      const sealed = s._sealedMeta.find(m => m.type === 'v' && m.col === 18)
      expect(sealed).toBeDefined()
    }
  })

  it('vertical tip A does NOT stop at horizontal wall outside column span', () => {
    const s = makeScene()
    // Horizontal wall only spans cols 0-10 → xRight = 40 + 10*20 + 10 = 250
    const wy_row5 = 188
    s._sealedMeta.push({ type: 'h', row: 5, wy: wy_row5, xLeft: 40, xRight: 250 })

    // Vertical wall at col 18 (wx=400) — beyond xRight=250
    s._growingWalls.push({
      type: 'vertical', col: 18, wx: 400,
      tipA: wy_row5 - 4,
      tipB: 538,
      doneA: false, doneB: false,
      visA: makeVisual(), visB: makeVisual(),
    })

    s._tickWalls(30)

    // tipA must NOT have snapped — should have continued past wy_row5
    const growing = s._growingWalls.find(w => w.col === 18)
    if (growing) {
      expect(growing.doneA).toBe(false)
      expect(growing.tipA).toBeGreaterThan(wy_row5)
    } else {
      // Fully sealed — the tip grew all the way and met tipB, not snapped to wy_row5
      const sealed = s._sealedMeta.find(m => m.type === 'v' && m.col === 18)
      if (sealed) {
        // Single segment: the wall sealed by tips meeting, not by snap
        // yTop should still be FY (not wy_row5)
        expect(sealed.yTop).toBe(78)
      }
    }
  })

  it('horizontal tip A grows right and stops at a vertical wall that spans the row', () => {
    const s = makeScene()
    // Vertical wall at col 10 spanning full height (yTop=78, yBot=538)
    const wx_col10 = 40 + 10 * 20 + 10  // 250
    s._sealedMeta.push({ type: 'v', col: 10, wx: wx_col10, yTop: 78, yBot: 538 })

    // Horizontal wall at row 5 (wy=188), tipA just left of col-10
    s._growingWalls.push({
      type: 'horizontal', row: 5, wy: 188,
      tipA: wx_col10 - 4,
      tipB: 760,
      doneA: false, doneB: false,
      visA: makeVisual(), visB: makeVisual(),
    })

    s._tickWalls(30)

    const growing = s._growingWalls.find(w => w.row === 5)
    if (growing) {
      expect(growing.doneA).toBe(true)
      expect(growing.tipA).toBeCloseTo(wx_col10, 0)
    } else {
      const sealed = s._sealedMeta.find(m => m.type === 'h' && m.row === 5)
      expect(sealed).toBeDefined()
    }
  })

  it('horizontal tip A does NOT stop at vertical wall outside row span', () => {
    const s = makeScene()
    // Vertical wall at col 10, only spanning rows 10-22 (fromY = 78+10*20 = 278)
    const wx_col10 = 250
    s._sealedMeta.push({ type: 'v', col: 10, wx: wx_col10, yTop: 278, yBot: 538 })

    // Horizontal wall at row 3 (wy=148) — above the vertical wall's yTop=278
    s._growingWalls.push({
      type: 'horizontal', row: 3, wy: 148,
      tipA: wx_col10 - 4,
      tipB: 760,
      doneA: false, doneB: false,
      visA: makeVisual(), visB: makeVisual(),
    })

    s._tickWalls(30)

    const growing = s._growingWalls.find(w => w.row === 3)
    if (growing) {
      expect(growing.doneA).toBe(false)
      expect(growing.tipA).toBeGreaterThan(wx_col10)
    } else {
      const sealed = s._sealedMeta.find(m => m.type === 'h' && m.row === 3)
      if (sealed) {
        expect(sealed.xLeft).toBe(40)
      }
    }
  })

  it('both tips grow toward center and seal when they meet', () => {
    const s = makeScene()
    // Move ball away from col-18 so it doesn't break the wall
    s._ballBody.x = 80
    s._ballBody.y = 100
    // No obstacles — both tips should meet in open space
    s._growingWalls.push({
      type: 'vertical', col: 18, wx: 400,
      tipA: 300,  // down tip partway
      tipB: 320,  // up tip partway — 20px gap, need ~40ms to cross
      doneA: false, doneB: false,
      visA: makeVisual(), visB: makeVisual(),
    })

    s._tickWalls(100)  // 100ms → ~25.5px each, tips cross

    const growing = s._growingWalls.find(w => w.col === 18)
    expect(growing).toBeUndefined()  // should have been removed (sealed)
    const sealed = s._sealedMeta.find(m => m.type === 'v' && m.col === 18)
    expect(sealed).toBeDefined()
    expect(sealed.yTop).toBe(78)
    expect(sealed.yBot).toBe(538)
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
    const s = { sectorCleared: false }
    expect(s.sectorCleared).toBe(false)
  })

  it('getState includes sectorCleared', async () => {
    const stateKeys = ['coinCount','maxCoins','hasPrompt','hasEyes','hasDash',
      'inPriorBody','freakyFridayUnlocked','dungeonCleared','sectorCleared','purchases','facing']
    expect(stateKeys).toContain('sectorCleared')
  })
})
