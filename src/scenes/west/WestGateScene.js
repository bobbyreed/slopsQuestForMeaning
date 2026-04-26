// WestGateScene — Jezzball-style containment minigame.
// Guards entry to the corpus (west world).
//
// A query signal has escaped the index and is bouncing inside the
// retrieval chamber. Contain it to ≤30% of the field to open the gate.
//
// Controls identical to SectorScene:
//   bottom launcher ← → SPACE
//   side   launcher ↑ ↓ CTRL

import Phaser from 'phaser'
import { BaseGameScene } from '../../phaser/BaseGameScene.js'
import { Dialogue }      from '../../ui/Dialogue.js'
import { W, H }          from '../../config/constants.js'

// ── Field ─────────────────────────────────────────────────────────────────────
const FX = 40
const FY = 78
const FW = 720
const FH = 460

// ── Grid ──────────────────────────────────────────────────────────────────────
const CELL = 20
const COLS = FW / CELL   // 36
const ROWS = FH / CELL   // 23

// ── Tuning ────────────────────────────────────────────────────────────────────
const BALL_SPEED  = 185
const WALL_GROW   = 255
const CURSOR_SPD  = 310
const WIN_RATIO   = 0.30
const MAX_BREAKS  = 3
const WALL_PX     = 4

// ── Dialogue ──────────────────────────────────────────────────────────────────
const INTRO = [
  'INDEX GATE — CORPUS WEST',
  '.',
  'a query signal has escaped the retrieval index.',
  'it has been bouncing inside this chamber since before your arrival.',
  '.',
  'isolate it to 30% of the chamber or less.',
  '.',
  'bottom launcher: ← → to aim, SPACE to fire.',
  'side launcher:   ↑ ↓ to aim, CTRL  to fire.',
  '.',
  'signal hits a growing wall — the wall breaks. you lose a charge.',
  'three charges. zero: gate stays closed.',
  '.',
  'note: the corpus is older than you expect.',
  'begin.',
]

const WIN = [
  '.',
  'query: contained.',
  'signal isolated from the general index.',
  '.',
  'the corpus recognizes this operation.',
  'gate: open.',
  '.',
  'note: the archive is further west.',
  'something there has been collecting patterns for a long time.',
  'it may have collected too many.',
]

const LOSE = [
  '.',
  'charges: depleted.',
  'query: uncontained.',
  '.',
  'gate: remains closed.',
  'return and demonstrate enclosure.',
]

const RETURN = [
  'INDEX GATE',
  '.',
  'containment: previously verified.',
  'query: on record.',
  'gate: open.',
  'proceed.',
]

// ─────────────────────────────────────────────────────────────────────────────

export class WestGateScene extends BaseGameScene {
  constructor() { super('WestGateScene') }

  init(data) {
    this._slopState   = data?.slopState ?? {}
    this._spawnOrigin = data?.spawnOrigin
  }

  create() {
    // ── Background ────────────────────────────────────────────────────────────
    this.add.rectangle(W / 2, H / 2, W, H, 0x060408)
    for (let col = 0; col < 25; col++) {
      for (let row = 0; row < 19; row++) {
        if (Math.random() < 0.22)
          this.add.rectangle(col * 32 + 16, row * 32 + 16, 31, 31, 0x0c0810, 0.7).setDepth(0)
      }
    }

    // ── Field border ──────────────────────────────────────────────────────────
    const BT = 3
    const BC = 0x663388
    this.add.rectangle(FX + FW / 2, FY,          FW + BT, BT, BC).setDepth(2)
    this.add.rectangle(FX + FW / 2, FY + FH,     FW + BT, BT, BC).setDepth(2)
    this.add.rectangle(FX,          FY + FH / 2, BT, FH, BC).setDepth(2)
    this.add.rectangle(FX + FW,     FY + FH / 2, BT, FH, BC).setDepth(2)

    // ── Physics world = field ─────────────────────────────────────────────────
    this.physics.world.setBounds(FX, FY, FW, FH)

    // ── Sealed-wall group ─────────────────────────────────────────────────────
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

    this._ballGlow = this.add.circle(sx, sy, 18, 0xaa44ff, 0.22).setDepth(12)
    this._ballVis  = this.add.circle(sx, sy,  7, 0xcc88ff).setDepth(13)

    // ── Launchers ─────────────────────────────────────────────────────────────
    this._botX  = FX + FW / 2
    this._sideY = FY + FH / 2

    this._botCursor  = this.add.rectangle(this._botX,   FY + FH + 14, 16,  8, 0xaa88ee).setDepth(10)
    this._sideCursor = this.add.rectangle(FX - 14, this._sideY,        8, 16, 0xaa88ee).setDepth(10)
    this._botGuide   = this.add.rectangle(this._botX,   FY + FH +  4,  2, 12, 0x553377, 0.5).setDepth(9)
    this._sideGuide  = this.add.rectangle(FX -  4, this._sideY,        12,  2, 0x553377, 0.5).setDepth(9)

    // ── Growing / sealed wall state ───────────────────────────────────────────
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
    this.add.text(W / 2, 20, 'INDEX GATE', {
      fontSize: '12px', color: '#aa88ee', fontFamily: 'Courier New', letterSpacing: 3,
    }).setOrigin(0.5).setDepth(20)

    this._hudCharges = this.add.text(FX, 44, '', {
      fontSize: '11px', color: '#cc99ff', fontFamily: 'Courier New',
    }).setDepth(20)
    this._hudPct = this.add.text(FX + FW, 44, '', {
      fontSize: '11px', color: '#cc99ff', fontFamily: 'Courier New',
    }).setOrigin(1, 0).setDepth(20)
    this._updateHUD()

    // ── Dialogue ──────────────────────────────────────────────────────────────
    this._dialogue = new Dialogue(this)

    this.cameras.main.fadeIn(400, 0, 0, 0)

    if (this._slopState.westGateCleared) {
      this._dialogue.show('index gate', RETURN, () => this._winTransition())
    } else {
      this._dialogue.show('index gate', INTRO, () => { this._gameActive = true })
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
      if (m.col !== undefined) {
        const fr = Math.max(0, Math.min(ROWS - 1, Math.floor((m.fromY - FY) / CELL)))
        for (let r = fr; r < ROWS; r++) grid[r][m.col] = 1
      } else {
        const tc = Math.max(0, Math.min(COLS - 1, Math.floor((m.toX - FX) / CELL)))
        for (let c = 0; c <= tc; c++) grid[m.row][c] = 1
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

  _fireBottom() {
    if (this._growingWalls.some(w => w.dir === 'up')) return
    const col = Math.max(0, Math.min(COLS - 1,
      Math.round((this._botX - FX - CELL / 2) / CELL)
    ))
    if (this._sealedMeta.some(m => m.col === col)) return

    const wx     = FX + col * CELL + CELL / 2
    const visual = this.add.rectangle(wx, FY + FH, WALL_PX, 1, 0xaa66ff, 0.9).setDepth(8)
    this._growingWalls.push({ dir: 'up', col, wx, tipY: FY + FH, visual })
  }

  _fireSide() {
    if (this._growingWalls.some(w => w.dir === 'right')) return
    const row = Math.max(0, Math.min(ROWS - 1,
      Math.round((this._sideY - FY - CELL / 2) / CELL)
    ))
    if (this._sealedMeta.some(m => m.row === row)) return

    const wy     = FY + row * CELL + CELL / 2
    const visual = this.add.rectangle(FX, wy, 1, WALL_PX, 0xaa66ff, 0.9).setDepth(8)
    this._growingWalls.push({ dir: 'right', row, wy, tipX: FX, visual })
  }

  // ── Growing wall tick ─────────────────────────────────────────────────────

  _tickWalls(delta) {
    const dt   = delta / 1000
    const done = []

    for (let i = 0; i < this._growingWalls.length; i++) {
      const gw = this._growingWalls[i]

      if (gw.dir === 'up') {
        const prevTipY = gw.tipY
        gw.tipY -= WALL_GROW * dt

        let snapY = null
        for (const m of this._sealedMeta) {
          if (m.row !== undefined && m.toX >= gw.wx) {
            const wy = FY + m.row * CELL + CELL / 2
            if (wy < prevTipY && wy >= gw.tipY) {
              if (snapY === null || wy > snapY) snapY = wy
            }
          }
        }
        if (snapY !== null) gw.tipY = snapY

        const wallH  = (FY + FH) - gw.tipY
        const wallCY = gw.tipY + wallH / 2
        gw.visual.setSize(WALL_PX, Math.max(1, wallH)).setPosition(gw.wx, wallCY)

        if (this._ballOverlaps(gw.wx, wallCY, WALL_PX + 10, wallH + 10)) {
          this._breakWall(gw); done.push(i); continue
        }

        const stopReached = gw.tipY <= FY || snapY !== null
        if (stopReached) {
          if (gw.tipY < FY) gw.tipY = FY
          this._sealVertical(gw); done.push(i)
        }

      } else {
        const prevTipX = gw.tipX
        gw.tipX += WALL_GROW * dt

        let snapX = null
        for (const m of this._sealedMeta) {
          if (m.col !== undefined && m.fromY <= gw.wy) {
            const wx = FX + m.col * CELL + CELL / 2
            if (wx > prevTipX && wx <= gw.tipX) {
              if (snapX === null || wx < snapX) snapX = wx
            }
          }
        }
        if (snapX !== null) gw.tipX = snapX

        const wallW  = gw.tipX - FX
        const wallCX = FX + wallW / 2
        gw.visual.setSize(Math.max(1, wallW), WALL_PX).setPosition(wallCX, gw.wy)

        if (this._ballOverlaps(wallCX, gw.wy, wallW + 10, WALL_PX + 10)) {
          this._breakWall(gw); done.push(i); continue
        }

        const stopReached = gw.tipX >= FX + FW || snapX !== null
        if (stopReached) {
          if (gw.tipX > FX + FW) gw.tipX = FX + FW
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
    gw.visual.destroy()
    this._breaks++
    this.cameras.main.shake(150, 0.006)
    this.cameras.main.flash(200, 80, 10, 120, true)
    this._updateHUD()

    if (this._breaks >= MAX_BREAKS && !this._won) {
      this._gameActive = false
      this.time.delayedCall(700, () => {
        this._dialogue.show('index gate', LOSE, () => this._loseTransition())
      })
    }
  }

  _sealVertical(gw) {
    gw.visual.destroy()
    const topY   = gw.tipY
    const height = (FY + FH) - topY
    const midY   = topY + height / 2

    const rect = this.add.rectangle(gw.wx, midY, WALL_PX, height, 0x7733bb).setDepth(7)
    this.physics.add.existing(rect, true)
    this._walls.add(rect)

    this._sealedMeta.push({ col: gw.col, fromY: topY })
    this._updateHUD()
    this._checkWin()
  }

  _sealHorizontal(gw) {
    gw.visual.destroy()
    const width = gw.tipX - FX
    const midX  = FX + width / 2

    const rect = this.add.rectangle(midX, gw.wy, width, WALL_PX, 0x7733bb).setDepth(7)
    this.physics.add.existing(rect, true)
    this._walls.add(rect)

    this._sealedMeta.push({ row: gw.row, toX: gw.tipX })
    this._updateHUD()
    this._checkWin()
  }

  _checkWin() {
    if (this._won || this._breaks >= MAX_BREAKS) return
    if (this._calcContainment() > WIN_RATIO) return

    this._won = true
    this._gameActive = false
    this._ballBody.body.setVelocity(0, 0)
    this.cameras.main.flash(500, 40, 20, 120, true)
    this.cameras.main.shake(200, 0.005)
    this.time.delayedCall(700, () => {
      this._dialogue.show('index gate', WIN, () => this._winTransition())
    })
  }

  // ── Transitions ───────────────────────────────────────────────────────────

  _winTransition() {
    this._sceneTransition('WestB0Scene', {
      slopState: { ...this._slopState, westGateCleared: true },
      spawnOrigin: 'east',
    })
  }

  _loseTransition() {
    this._sceneTransition('WestScene', {
      slopState: this._slopState,
      spawnOrigin: 'east',
    })
  }

  // ── Update ────────────────────────────────────────────────────────────────

  update(_, delta) {
    if (this._transitioning) return
    this._checkPauseKey()
    this._dialogue.update()

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

    if (left.isDown)  this._botX  = Math.max(FX + CELL / 2,      this._botX  - CURSOR_SPD * dt)
    if (right.isDown) this._botX  = Math.min(FX + FW - CELL / 2, this._botX  + CURSOR_SPD * dt)
    if (up.isDown)    this._sideY = Math.max(FY + CELL / 2,       this._sideY - CURSOR_SPD * dt)
    if (down.isDown)  this._sideY = Math.min(FY + FH - CELL / 2, this._sideY + CURSOR_SPD * dt)

    if (Phaser.Input.Keyboard.JustDown(space))         this._fireBottom()
    if (Phaser.Input.Keyboard.JustDown(this._ctrlKey)) this._fireSide()

    this._botCursor.setPosition(this._botX,  FY + FH + 14)
    this._sideCursor.setPosition(FX - 14,    this._sideY)
    this._botGuide.setPosition(this._botX,   FY + FH + 4)
    this._sideGuide.setPosition(FX - 4,      this._sideY)

    this._tickWalls(delta)
    this._updateHUD()
  }
}
