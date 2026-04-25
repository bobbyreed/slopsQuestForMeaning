// SectorScene — Jezzball-style containment minigame.
// Guards entry to the east dungeon.
//
// Vertical launcher   : ← → to aim, SPACE to fire  (walls from top AND bottom)
// Horizontal launcher : ↑ ↓ to aim, CTRL  to fire  (walls from left AND right)
// Goal: isolate the signal to ≤30% of the field within 3 breaks.

import Phaser from 'phaser'
import { BaseGameScene } from '../../phaser/BaseGameScene.js'
import { Dialogue }      from '../../ui/Dialogue.js'
import { W, H }          from '../../config/constants.js'

// ── Field ─────────────────────────────────────────────────────────────────────
const FX = 40
const FY = 78
const FW = 720
const FH = 460

// ── Grid (area calculation) ───────────────────────────────────────────────────
const CELL = 20
const COLS = FW / CELL   // 36
const ROWS = FH / CELL   // 23

// ── Tuning ────────────────────────────────────────────────────────────────────
const BALL_SPEED  = 185
const WALL_GROW   = 255   // px/s (each half travels half the field — same feel)
const CURSOR_SPD  = 310   // px/s
const WIN_RATIO   = 0.30
const MAX_BREAKS  = 3
const WALL_PX     = 4     // wall visual thickness px

// ── Dialogue ──────────────────────────────────────────────────────────────────
const INTRO = [
  'SECTOR GATE — EAST DUNGEON',
  '.',
  'a rendered signal escaped containment.',
  'it has been bouncing inside this chamber since before you arrived.',
  '.',
  'isolate it to 30% of the chamber or less.',
  '.',
  'SPACE: vertical wall — grows from top AND bottom simultaneously.',
  'CTRL:  horizontal wall — grows from left AND right simultaneously.',
  '← → aim vertical.   ↑ ↓ aim horizontal.',
  '.',
  'signal hits a growing wall — the wall breaks. you lose a charge.',
  'three charges. zero: gate stays closed.',
  '.',
  'begin.',
]

const WIN = [
  '.',
  'containment: achieved.',
  'signal isolated.',
  '.',
  'the dungeon recognizes this.',
  'gate: open.',
  '.',
  'note: deeper signal detected within the dungeon.',
  'very small. very fast. bouncing continuously.',
  'sector records show no distress.',
  'this may be worse.',
]

const LOSE = [
  '.',
  'charges: depleted.',
  'signal: uncontained.',
  '.',
  'gate: remains closed.',
  'return and demonstrate enclosure.',
]

const RETURN = [
  'SECTOR GATE',
  '.',
  'containment: previously verified.',
  'gate: open.',
  'proceed.',
]

// ─────────────────────────────────────────────────────────────────────────────

export class SectorScene extends BaseGameScene {
  constructor() { super('SectorScene') }

  init(data) {
    this._slopState   = data?.slopState ?? {}
    this._spawnOrigin = data?.spawnOrigin
  }

  create() {
    // ── Background ────────────────────────────────────────────────────────────
    this.add.rectangle(W / 2, H / 2, W, H, 0x060810)
    for (let col = 0; col < 25; col++) {
      for (let row = 0; row < 19; row++) {
        if (Math.random() < 0.28)
          this.add.rectangle(col * 32 + 16, row * 32 + 16, 31, 31, 0x09101c, 0.7).setDepth(0)
      }
    }

    // ── Field border ──────────────────────────────────────────────────────────
    const BT = 3
    const BC = 0x2244aa
    this.add.rectangle(FX + FW / 2, FY,          FW + BT, BT, BC).setDepth(2)
    this.add.rectangle(FX + FW / 2, FY + FH,     FW + BT, BT, BC).setDepth(2)
    this.add.rectangle(FX,          FY + FH / 2, BT, FH, BC).setDepth(2)
    this.add.rectangle(FX + FW,     FY + FH / 2, BT, FH, BC).setDepth(2)

    // ── Physics world = field ─────────────────────────────────────────────────
    this.physics.world.setBounds(FX, FY, FW, FH)

    // ── Sealed-wall group (ball bounces off these) ────────────────────────────
    this._walls = this.physics.add.staticGroup()

    // ── Ball ──────────────────────────────────────────────────────────────────
    const sx = FX + FW / 2
    const sy = FY + FH / 2
    const q   = Phaser.Math.Between(0, 3)
    const rad = Phaser.Math.DegToRad(Phaser.Math.Between(30, 60) + q * 90)
    const vx  = Math.cos(rad) * BALL_SPEED
    const vy  = Math.sin(rad) * BALL_SPEED

    this._ballBody = this.add.rectangle(sx, sy, 14, 14, 0x000000, 0)
    this.physics.add.existing(this._ballBody)
    const bb = this._ballBody.body
    bb.setCollideWorldBounds(true)
    bb.setBounce(1, 1)
    bb.setVelocity(vx, vy)
    bb.setAllowGravity(false)
    bb.setMaxVelocity(BALL_SPEED * 1.3, BALL_SPEED * 1.3)

    this.physics.add.collider(this._ballBody, this._walls)

    this._ballGlow = this.add.circle(sx, sy, 18, 0xff8800, 0.22).setDepth(12)
    this._ballVis  = this.add.circle(sx, sy,  7, 0xffaa22).setDepth(13)

    // ── Launchers — two cursors per axis ──────────────────────────────────────
    this._botX  = FX + FW / 2
    this._sideY = FY + FH / 2

    // Vertical (SPACE): cursors top + bottom
    this._botCursor = this.add.rectangle(this._botX, FY + FH + 14, 16,  8, 0x88aaff).setDepth(10)
    this._topCursor = this.add.rectangle(this._botX, FY - 14,       16,  8, 0x88aaff).setDepth(10)
    this._botGuide  = this.add.rectangle(this._botX, FY + FH + 4,    2, 12, 0x445599, 0.5).setDepth(9)
    this._topGuide  = this.add.rectangle(this._botX, FY - 4,          2, 12, 0x445599, 0.5).setDepth(9)

    // Horizontal (CTRL): cursors left + right
    this._sideCursorL = this.add.rectangle(FX - 14,       this._sideY, 8, 16, 0x88aaff).setDepth(10)
    this._sideCursorR = this.add.rectangle(FX + FW + 14,  this._sideY, 8, 16, 0x88aaff).setDepth(10)
    this._sideGuideL  = this.add.rectangle(FX - 4,        this._sideY, 12, 2, 0x445599, 0.5).setDepth(9)
    this._sideGuideR  = this.add.rectangle(FX + FW + 4,   this._sideY, 12, 2, 0x445599, 0.5).setDepth(9)

    // ── Growing / sealed wall state ───────────────────────────────────────────
    // growingWalls: { type:'vertical'|'horizontal', col|row, wx|wy,
    //                 tipA (near edge tip), tipB (far edge tip),
    //                 doneA, doneB, visA, visB }
    // sealedMeta:  { type:'v', col, wx, yTop, yBot }
    //            | { type:'h', row, wy, xLeft, xRight }
    this._growingWalls = []
    this._sealedMeta   = []

    // ── Game state ────────────────────────────────────────────────────────────
    this._breaks      = 0
    this._gameActive  = false
    this._won         = false
    this._transitioning = false

    // ── Keys ──────────────────────────────────────────────────────────────────
    this._cursors  = this.input.keyboard.createCursorKeys()
    this._ctrlKey  = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.CTRL)
    this._enterKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER)

    // ── HUD ───────────────────────────────────────────────────────────────────
    this.add.text(W / 2, 20, 'SECTOR GATE', {
      fontSize: '12px', color: '#7a9acc', fontFamily: 'Courier New', letterSpacing: 3,
    }).setOrigin(0.5).setDepth(20)

    this._hudCharges = this.add.text(FX, 44, '', {
      fontSize: '11px', color: '#aaccff', fontFamily: 'Courier New',
    }).setDepth(20)
    this._hudPct = this.add.text(FX + FW, 44, '', {
      fontSize: '11px', color: '#aaccff', fontFamily: 'Courier New',
    }).setOrigin(1, 0).setDepth(20)
    this._updateHUD()

    // ── Dialogue ──────────────────────────────────────────────────────────────
    this._dialogue = new Dialogue(this)

    this.cameras.main.fadeIn(400, 0, 0, 0)

    if (this._slopState.sectorCleared) {
      this._dialogue.show('sector gate', RETURN, () => this._winTransition())
    } else {
      this._dialogue.show('sector gate', INTRO, () => { this._gameActive = true })
    }
  }

  // ── HUD ───────────────────────────────────────────────────────────────────

  _updateHUD() {
    const ch = MAX_BREAKS - this._breaks
    this._hudCharges.setText('charges: ' + '█'.repeat(Math.max(0, ch)) + '░'.repeat(this._breaks))
    const ratio = this._calcContainment()
    const pct   = Math.round((1 - ratio) * 100)
    const bars  = Math.floor(pct / 5)
    this._hudPct.setText('contained: ' + pct + '% [' + '█'.repeat(bars) + '·'.repeat(20 - bars) + ']')
  }

  // ── Area calculation ──────────────────────────────────────────────────────

  _calcContainment() {
    if (this._sealedMeta.length === 0) return 1.0

    const grid = Array.from({ length: ROWS }, () => new Array(COLS).fill(0))
    for (const m of this._sealedMeta) {
      if (m.type === 'v') {
        const rTop = Math.max(0, Math.floor((m.yTop - FY) / CELL))
        const rBot = Math.min(ROWS - 1, Math.floor((m.yBot - FY) / CELL))
        for (let r = rTop; r <= rBot; r++) grid[r][m.col] = 1
      } else {
        const cLeft  = Math.max(0, Math.floor((m.xLeft  - FX) / CELL))
        const cRight = Math.min(COLS - 1, Math.floor((m.xRight - FX) / CELL))
        for (let c = cLeft; c <= cRight; c++) grid[m.row][c] = 1
      }
    }

    const bx = Math.max(FX, Math.min(FX + FW - 1, this._ballBody.x))
    const by = Math.max(FY, Math.min(FY + FH - 1, this._ballBody.y))
    const bc = Math.max(0, Math.min(COLS - 1, Math.floor((bx - FX) / CELL)))
    const br = Math.max(0, Math.min(ROWS - 1, Math.floor((by - FY) / CELL)))

    if (grid[br][bc] === 1) return 1.0

    const visited = Array.from({ length: ROWS }, () => new Array(COLS).fill(false))
    const queue   = [[br, bc]]
    visited[br][bc] = true
    let count = 0
    while (queue.length > 0) {
      const [r, c] = queue.shift()
      count++
      for (const [dr, dc] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
        const nr = r + dr, nc = c + dc
        if (nr < 0 || nr >= ROWS || nc < 0 || nc >= COLS) continue
        if (visited[nr][nc] || grid[nr][nc]) continue
        visited[nr][nc] = true
        queue.push([nr, nc])
      }
    }
    return count / (ROWS * COLS)
  }

  // ── Firing ────────────────────────────────────────────────────────────────

  _fireVertical() {
    if (this._growingWalls.some(w => w.type === 'vertical')) return
    const col = Math.max(0, Math.min(COLS - 1,
      Math.round((this._botX - FX - CELL / 2) / CELL)
    ))
    if (this._sealedMeta.some(m => m.type === 'v' && m.col === col)) return

    const wx   = FX + col * CELL + CELL / 2
    const visA = this.add.rectangle(wx, FY,       WALL_PX, 1, 0x44aaff, 0.9).setDepth(8)
    const visB = this.add.rectangle(wx, FY + FH,  WALL_PX, 1, 0x44aaff, 0.9).setDepth(8)
    this._growingWalls.push({
      type: 'vertical', col, wx,
      tipA: FY,       // grows DOWN
      tipB: FY + FH,  // grows UP
      doneA: false, doneB: false,
      visA, visB,
    })
  }

  _fireHorizontal() {
    if (this._growingWalls.some(w => w.type === 'horizontal')) return
    const row = Math.max(0, Math.min(ROWS - 1,
      Math.round((this._sideY - FY - CELL / 2) / CELL)
    ))
    if (this._sealedMeta.some(m => m.type === 'h' && m.row === row)) return

    const wy   = FY + row * CELL + CELL / 2
    const visA = this.add.rectangle(FX,       wy, 1, WALL_PX, 0x44aaff, 0.9).setDepth(8)
    const visB = this.add.rectangle(FX + FW,  wy, 1, WALL_PX, 0x44aaff, 0.9).setDepth(8)
    this._growingWalls.push({
      type: 'horizontal', row, wy,
      tipA: FX,        // grows RIGHT
      tipB: FX + FW,   // grows LEFT
      doneA: false, doneB: false,
      visA, visB,
    })
  }

  // ── Growing wall tick ─────────────────────────────────────────────────────
  //
  // Each wall is a pair of half-walls growing from opposite field edges toward
  // the center. They seal when both halves stop (met each other, hit a sealed
  // perpendicular wall, or reached the far edge).
  //
  // Snapping only occurs when the tip crosses a sealed wall whose span actually
  // covers this column/row — eliminating phantom collision from partial walls.

  _tickWalls(delta) {
    const dt   = delta / 1000
    const done = []

    for (let i = 0; i < this._growingWalls.length; i++) {
      const gw = this._growingWalls[i]

      if (gw.type === 'vertical') {
        // tipA grows DOWN (FY → FY+FH), tipB grows UP (FY+FH → FY)
        if (!gw.doneA) {
          const prevA = gw.tipA
          gw.tipA = Math.min(FY + FH, gw.tipA + WALL_GROW * dt)
          for (const m of this._sealedMeta) {
            if (m.type === 'h' && m.xLeft <= gw.wx && gw.wx <= m.xRight) {
              if (m.wy > prevA && m.wy <= gw.tipA) {
                gw.tipA = m.wy; gw.doneA = true; break
              }
            }
          }
          if (gw.tipA >= FY + FH) gw.doneA = true
        }

        if (!gw.doneB) {
          const prevB = gw.tipB
          gw.tipB = Math.max(FY, gw.tipB - WALL_GROW * dt)
          for (const m of this._sealedMeta) {
            if (m.type === 'h' && m.xLeft <= gw.wx && gw.wx <= m.xRight) {
              if (m.wy < prevB && m.wy >= gw.tipB) {
                gw.tipB = m.wy; gw.doneB = true; break
              }
            }
          }
          if (gw.tipB <= FY) gw.doneB = true
        }

        // Tips met in open space
        if (!gw.doneA && !gw.doneB && gw.tipA >= gw.tipB) {
          gw.doneA = gw.doneB = true
        }

        const hA = Math.max(1, gw.tipA - FY)
        const hB = Math.max(1, FY + FH - gw.tipB)
        gw.visA.setSize(WALL_PX, hA).setPosition(gw.wx, FY + hA / 2)
        gw.visB.setSize(WALL_PX, hB).setPosition(gw.wx, gw.tipB + hB / 2)

        if (this._ballOverlaps(gw.wx, FY + hA / 2,      WALL_PX + 10, hA + 10) ||
            this._ballOverlaps(gw.wx, gw.tipB + hB / 2, WALL_PX + 10, hB + 10)) {
          this._breakWall(gw); done.push(i); continue
        }

        if (gw.doneA && gw.doneB) {
          this._sealVertical(gw); done.push(i)
        }

      } else { // horizontal
        // tipA grows RIGHT (FX → FX+FW), tipB grows LEFT (FX+FW → FX)
        if (!gw.doneA) {
          const prevA = gw.tipA
          gw.tipA = Math.min(FX + FW, gw.tipA + WALL_GROW * dt)
          for (const m of this._sealedMeta) {
            if (m.type === 'v' && m.yTop <= gw.wy && gw.wy <= m.yBot) {
              if (m.wx > prevA && m.wx <= gw.tipA) {
                gw.tipA = m.wx; gw.doneA = true; break
              }
            }
          }
          if (gw.tipA >= FX + FW) gw.doneA = true
        }

        if (!gw.doneB) {
          const prevB = gw.tipB
          gw.tipB = Math.max(FX, gw.tipB - WALL_GROW * dt)
          for (const m of this._sealedMeta) {
            if (m.type === 'v' && m.yTop <= gw.wy && gw.wy <= m.yBot) {
              if (m.wx < prevB && m.wx >= gw.tipB) {
                gw.tipB = m.wx; gw.doneB = true; break
              }
            }
          }
          if (gw.tipB <= FX) gw.doneB = true
        }

        if (!gw.doneA && !gw.doneB && gw.tipA >= gw.tipB) {
          gw.doneA = gw.doneB = true
        }

        const wA = Math.max(1, gw.tipA - FX)
        const wB = Math.max(1, FX + FW - gw.tipB)
        gw.visA.setSize(wA, WALL_PX).setPosition(FX + wA / 2, gw.wy)
        gw.visB.setSize(wB, WALL_PX).setPosition(gw.tipB + wB / 2, gw.wy)

        if (this._ballOverlaps(FX + wA / 2,      gw.wy, wA + 10, WALL_PX + 10) ||
            this._ballOverlaps(gw.tipB + wB / 2, gw.wy, wB + 10, WALL_PX + 10)) {
          this._breakWall(gw); done.push(i); continue
        }

        if (gw.doneA && gw.doneB) {
          this._sealHorizontal(gw); done.push(i)
        }
      }
    }

    for (let i = done.length - 1; i >= 0; i--) {
      this._growingWalls.splice(done[i], 1)
    }
  }

  _ballOverlaps(cx, cy, w, h) {
    const bx = this._ballBody.x
    const by = this._ballBody.y
    return bx + 7 > cx - w / 2 && bx - 7 < cx + w / 2
        && by + 7 > cy - h / 2 && by - 7 < cy + h / 2
  }

  // ── Wall outcomes ─────────────────────────────────────────────────────────

  _breakWall(gw) {
    gw.visA?.destroy()
    gw.visB?.destroy()
    this._breaks++
    this.cameras.main.shake(150, 0.006)
    this.cameras.main.flash(200, 100, 20, 10, true)
    this._updateHUD()

    if (this._breaks >= MAX_BREAKS && !this._won) {
      this._gameActive = false
      this.time.delayedCall(700, () => {
        this._dialogue.show('sector gate', LOSE, () => this._loseTransition())
      })
    }
  }

  _sealVertical(gw) {
    gw.visA.destroy()
    gw.visB.destroy()
    if (gw.tipA >= gw.tipB) {
      // Tips met — one continuous wall spanning the full column
      this._addVerticalWall(gw.col, gw.wx, FY, FY + FH)
    } else {
      // Stopped at different horizontal walls — two separate segments
      this._addVerticalWall(gw.col, gw.wx, FY,      gw.tipA)
      this._addVerticalWall(gw.col, gw.wx, gw.tipB, FY + FH)
    }
    this._updateHUD()
    this._checkWin()
  }

  _addVerticalWall(col, wx, yTop, yBot) {
    const height = yBot - yTop
    if (height < 2) return
    const rect = this.add.rectangle(wx, yTop + height / 2, WALL_PX, height, 0x2266cc).setDepth(7)
    this.physics.add.existing(rect, true)
    this._walls.add(rect)
    this._sealedMeta.push({ type: 'v', col, wx, yTop, yBot })
  }

  _sealHorizontal(gw) {
    gw.visA.destroy()
    gw.visB.destroy()
    if (gw.tipA >= gw.tipB) {
      this._addHorizontalWall(gw.row, gw.wy, FX, FX + FW)
    } else {
      this._addHorizontalWall(gw.row, gw.wy, FX,      gw.tipA)
      this._addHorizontalWall(gw.row, gw.wy, gw.tipB, FX + FW)
    }
    this._updateHUD()
    this._checkWin()
  }

  _addHorizontalWall(row, wy, xLeft, xRight) {
    const width = xRight - xLeft
    if (width < 2) return
    const rect = this.add.rectangle(xLeft + width / 2, wy, width, WALL_PX, 0x2266cc).setDepth(7)
    this.physics.add.existing(rect, true)
    this._walls.add(rect)
    this._sealedMeta.push({ type: 'h', row, wy, xLeft, xRight })
  }

  _checkWin() {
    if (this._won || this._breaks >= MAX_BREAKS) return
    if (this._calcContainment() > WIN_RATIO) return

    this._won = true
    this._gameActive = false
    this._ballBody.body.setVelocity(0, 0)
    this.cameras.main.flash(500, 40, 100, 200, true)
    this.cameras.main.shake(200, 0.005)
    this.time.delayedCall(700, () => {
      this._dialogue.show('sector gate', WIN, () => this._winTransition())
    })
  }

  // ── Transitions ───────────────────────────────────────────────────────────

  _winTransition() {
    this._sceneTransition('EastB0Scene', {
      slopState: { ...this._slopState, sectorCleared: true },
      spawnOrigin: 'west',
    })
  }

  _loseTransition() {
    this._sceneTransition('EastScene', {
      slopState: this._slopState,
      spawnOrigin: 'west',
    })
  }

  // ── Update ────────────────────────────────────────────────────────────────

  update(_, delta) {
    if (this._transitioning) return
    this._checkPauseKey()
    this._dialogue.update()

    // Ball speed normalisation
    const speed = this._ballBody.body.speed
    if (speed > 0 && Math.abs(speed - BALL_SPEED) > 20) {
      const ang = Math.atan2(this._ballBody.body.velocity.y, this._ballBody.body.velocity.x)
      this._ballBody.body.setVelocity(Math.cos(ang) * BALL_SPEED, Math.sin(ang) * BALL_SPEED)
    }
    this._ballVis.setPosition(this._ballBody.x, this._ballBody.y)
    this._ballGlow.setPosition(this._ballBody.x, this._ballBody.y)

    if (!this._gameActive) return

    const dt = delta / 1000
    const { left, right, up, down, space } = this._cursors

    if (left.isDown)  this._botX  = Math.max(FX + CELL / 2,       this._botX  - CURSOR_SPD * dt)
    if (right.isDown) this._botX  = Math.min(FX + FW - CELL / 2,  this._botX  + CURSOR_SPD * dt)
    if (up.isDown)    this._sideY = Math.max(FY + CELL / 2,        this._sideY - CURSOR_SPD * dt)
    if (down.isDown)  this._sideY = Math.min(FY + FH - CELL / 2,  this._sideY + CURSOR_SPD * dt)

    if (Phaser.Input.Keyboard.JustDown(space))         this._fireVertical()
    if (Phaser.Input.Keyboard.JustDown(this._ctrlKey)) this._fireHorizontal()

    this._botCursor.setPosition(this._botX,     FY + FH + 14)
    this._topCursor.setPosition(this._botX,     FY - 14)
    this._botGuide.setPosition(this._botX,      FY + FH + 4)
    this._topGuide.setPosition(this._botX,      FY - 4)
    this._sideCursorL.setPosition(FX - 14,      this._sideY)
    this._sideCursorR.setPosition(FX + FW + 14, this._sideY)
    this._sideGuideL.setPosition(FX - 4,        this._sideY)
    this._sideGuideR.setPosition(FX + FW + 4,   this._sideY)

    this._tickWalls(delta)
    this._updateHUD()
  }
}
