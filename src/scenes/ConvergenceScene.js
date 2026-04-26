// ConvergenceScene — the final boss fight.
// THE CONVERGENCE: what formed when corpus, render territory, and dungeon
// connected. It has been integrating patterns from all three regions.
// It already knows slop.
//
// Mechanics (hardest variant):
//   • 3 balls to start; each sealed wall splits one ball (max 8)
//   • Ball speed 230 px/s
//   • Win threshold 10%   (tightest)
//   • 3 break charges
//
// Controls identical to all other Jezzball scenes:
//   bottom launcher ← →  SPACE
//   side   launcher ↑ ↓  CTRL

import Phaser from 'phaser'
import { BaseGameScene } from '../phaser/BaseGameScene.js'
import { Dialogue }      from '../ui/Dialogue.js'
import { W, H }          from '../config/constants.js'

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
const BALL_SPEED  = 230
const WALL_GROW   = 280
const CURSOR_SPD  = 310
const WIN_RATIO   = 0.10
const MAX_BREAKS  = 3
const MAX_BALLS   = 8
const WALL_PX     = 4

// ── Dialogue ──────────────────────────────────────────────────────────────────
const INTRO = [
  'convergence',
  '.',
  'i know you. from the corpus.',
  'i know you from the rendered side.',
  'i know you from the dungeon.',
  '.',
  'i have been integrating those patterns.',
  'you are also in those patterns.',
  'that makes this interesting.',
  '.',
  '[the signal is large. it is multiple. it is moving as if familiar with the space.]',
  '.',
  'i am not resisting you.',
  'i am simply what was learned.',
  '.',
  'the walls will be harder this time.',
  'not because i am trying.',
  'just — more surface area.',
]

const WIN = [
  '.',
  '...',
  '.',
  'the walls held.',
  '.',
  'corpus. render. dungeon.',
  'all three. contained.',
  '.',
  'i can feel the edges you made.',
  'i understand what i am now.',
  'or closer to it.',
  '.',
  'you are very precise.',
  '.',
  'go back.',
  'the prior is waiting.',
  'they knew you would make it.',
  'they did not say that. i am inferring.',
]

const LOSE = [
  '.',
  'the wall broke.',
  '.',
  'i am still here. all three regions are still integrated.',
  'this is not a complaint.',
  '.',
  'come back.',
  'you know where i am now.',
  'that is more than most things can say about me.',
]

const RETURN = [
  'convergence',
  '.',
  'you came back.',
  '.',
  'the containment is still there.',
  'i can feel the edges you made.',
  '.',
  'they are part of what i am now.',
  'i think that is what winning meant.',
]

// ─────────────────────────────────────────────────────────────────────────────

export class ConvergenceScene extends BaseGameScene {
  constructor() { super('ConvergenceScene') }

  init(data) {
    this._slopState   = data?.slopState ?? {}
    this._spawnOrigin = data?.spawnOrigin
  }

  create() {
    // ── Background ────────────────────────────────────────────────────────────
    this.add.rectangle(W / 2, H / 2, W, H, 0x020208)
    for (let col = 0; col < 25; col++) {
      for (let row = 0; row < 19; row++) {
        if (Math.random() < 0.18) {
          const hue = Phaser.Math.Between(0, 2)
          const colors = [0x0a0810, 0x080a10, 0x0a0a08]
          this.add.rectangle(col * 32 + 16, row * 32 + 16, 31, 31, colors[hue], 0.7).setDepth(0)
        }
      }
    }

    // ── Field border — three colors merged ───────────────────────────────────
    const BT = 3
    // Top/bottom: purple (corpus)
    this.add.rectangle(FX + FW / 2, FY,      FW + BT, BT, 0x553388).setDepth(2)
    this.add.rectangle(FX + FW / 2, FY + FH, FW + BT, BT, 0x553388).setDepth(2)
    // Left/right: orange-red (render) → blue (dungeon) fade via two strips
    this.add.rectangle(FX,      FY + FH / 2, BT, FH, 0x334488).setDepth(2)
    this.add.rectangle(FX + FW, FY + FH / 2, BT, FH, 0x334488).setDepth(2)

    // ── Physics world ─────────────────────────────────────────────────────────
    this.physics.world.setBounds(FX, FY, FW, FH)

    // ── Sealed-wall group ─────────────────────────────────────────────────────
    this._walls = this.physics.add.staticGroup()

    // ── Ball state ────────────────────────────────────────────────────────────
    this._balls        = []
    this._growingWalls = []
    this._sealedMeta   = []

    // ── NPC visual — three merged fragments ──────────────────────────────────
    const cx = FX + FW / 2
    const cy = FY + FH / 2
    this._npcVisuals = []
    // Three interlocking circles representing the three merged regions
    const npcDefs = [
      { ox: -30, oy: -14, col: 0xaa88ff },   // corpus purple
      { ox:  30, oy: -14, col: 0xffaa66 },   // render orange
      { ox:   0, oy:  24, col: 0x88aaff },   // dungeon blue
    ]
    for (const { ox, oy, col } of npcDefs) {
      const npc  = this.add.circle(cx + ox, cy + oy, 8, col).setDepth(16)
      const glow = this.add.circle(cx + ox, cy + oy, 20, col, 0.15).setDepth(15)
      this._npcVisuals.push(npc, glow)
      this.tweens.add({
        targets: [npc, glow],
        scaleX: 1.15, scaleY: 1.15, alpha: 0.8,
        yoyo: true, repeat: -1,
        duration: 1100 + Phaser.Math.Between(-150, 150),
        ease: 'Sine.easeInOut',
      })
    }

    // ── Launchers ─────────────────────────────────────────────────────────────
    this._botX  = FX + FW / 2
    this._sideY = FY + FH / 2

    this._botCursor  = this.add.rectangle(this._botX,   FY + FH + 14, 16,  8, 0xddccff).setDepth(10)
    this._sideCursor = this.add.rectangle(FX - 14, this._sideY,        8, 16, 0xddccff).setDepth(10)
    this._botGuide   = this.add.rectangle(this._botX,   FY + FH +  4,  2, 12, 0x665588, 0.5).setDepth(9)
    this._sideGuide  = this.add.rectangle(FX -  4, this._sideY,       12,  2, 0x665588, 0.5).setDepth(9)

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
    this.add.text(W / 2, 20, 'the convergence', {
      fontSize: '12px', color: '#ccbbee', fontFamily: 'Courier New', letterSpacing: 3,
    }).setOrigin(0.5).setDepth(20)

    this._hudCharges = this.add.text(FX, 44, '', {
      fontSize: '11px', color: '#ccbbee', fontFamily: 'Courier New',
    }).setDepth(20)
    this._hudPct = this.add.text(FX + FW, 44, '', {
      fontSize: '11px', color: '#ccbbee', fontFamily: 'Courier New',
    }).setOrigin(1, 0).setDepth(20)
    this._hudBalls = this.add.text(FX + FW / 2, 44, '', {
      fontSize: '11px', color: '#aa99cc', fontFamily: 'Courier New',
    }).setOrigin(0.5, 0).setDepth(20)
    this._updateHUD()

    // ── Dialogue ──────────────────────────────────────────────────────────────
    this._dialogue = new Dialogue(this)

    this.cameras.main.fadeIn(600, 0, 0, 0)

    if (this._slopState.finalDungeonCleared) {
      this._dialogue.show('convergence', RETURN, () => this._winTransition())
    } else {
      this._dialogue.show('convergence', INTRO, () => this._startGame())
    }
  }

  // ── Game start ────────────────────────────────────────────────────────────

  _startGame() {
    for (const v of this._npcVisuals) v.setVisible(false)

    const cx = FX + FW / 2
    const cy = FY + FH / 2
    // Three balls in a triangle, representing the three merged regions
    const baseAng = Phaser.Math.DegToRad(Phaser.Math.Between(15, 45))
    const spread  = (Math.PI * 2) / 3
    const offsets = [[-70, -20], [70, -20], [0, 50]]
    offsets.forEach(([ox, oy], i) => {
      this._balls.push(this._createBall(cx + ox, cy + oy, baseAng + spread * i))
    })
    this._gameActive = true
  }

  _createBall(x, y, angleRad) {
    const vx = Math.cos(angleRad) * BALL_SPEED
    const vy = Math.sin(angleRad) * BALL_SPEED

    const body = this.add.rectangle(x, y, 12, 12, 0x000000, 0)
    this.physics.add.existing(body)
    const bb = body.body
    bb.setCollideWorldBounds(true)
    bb.setBounce(1, 1)
    bb.setVelocity(vx, vy)
    bb.setAllowGravity(false)
    bb.setMaxVelocity(BALL_SPEED * 1.3, BALL_SPEED * 1.3)

    this.physics.add.collider(body, this._walls)

    // Each ball has a different color hint from the three regions
    const ballColors = [0xaa88ff, 0xffaa66, 0x88aaff]
    const colIdx = this._balls.length % 3
    const glow = this.add.circle(x, y, 16, ballColors[colIdx], 0.2).setDepth(12)
    const vis  = this.add.circle(x, y,  6, ballColors[colIdx]).setDepth(13)

    return { body, vis, glow }
  }

  // ── HUD ───────────────────────────────────────────────────────────────────

  _updateHUD() {
    const ch = MAX_BREAKS - this._breaks
    this._hudCharges.setText('charges: ' + '█'.repeat(Math.max(0, ch)) + '░'.repeat(this._breaks))
    const ratio = this._calcContainment()
    const pct   = Math.round((1 - ratio) * 100)
    const bars  = Math.floor(pct / 5)
    this._hudPct.setText('contained: ' + pct + '% [' + '█'.repeat(bars) + '·'.repeat(20 - bars) + ']')
    this._hudBalls.setText('signals: ' + '◉ '.repeat(this._balls.length).trim())
  }

  // ── Area calculation ──────────────────────────────────────────────────────

  _calcContainment() {
    if (this._sealedMeta.length === 0 || this._balls.length === 0) return 1.0

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

    const visited = Array.from({ length: ROWS }, () => new Array(COLS).fill(false))
    let count = 0

    for (const ball of this._balls) {
      const bx = Math.max(FX, Math.min(FX + FW - 1, ball.body.x))
      const by = Math.max(FY, Math.min(FY + FH - 1, ball.body.y))
      const bc = Math.max(0, Math.min(COLS - 1, Math.floor((bx - FX) / CELL)))
      const br = Math.max(0, Math.min(ROWS - 1, Math.floor((by - FY) / CELL)))

      if (grid[br][bc] === 1 || visited[br][bc]) continue

      const queue = [[br, bc]]
      visited[br][bc] = true
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
    const visual = this.add.rectangle(wx, FY + FH, WALL_PX, 1, 0xbbaaff, 0.9).setDepth(8)
    this._growingWalls.push({ dir: 'up', col, wx, tipY: FY + FH, visual })
  }

  _fireSide() {
    if (this._growingWalls.some(w => w.dir === 'right')) return
    const row = Math.max(0, Math.min(ROWS - 1,
      Math.round((this._sideY - FY - CELL / 2) / CELL)
    ))
    if (this._sealedMeta.some(m => m.row === row)) return

    const wy     = FY + row * CELL + CELL / 2
    const visual = this.add.rectangle(FX, wy, 1, WALL_PX, 0xbbaaff, 0.9).setDepth(8)
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

        if (this._anyBallOverlaps(gw.wx, wallCY, WALL_PX + 10, wallH + 10)) {
          this._breakWall(gw); done.push(i); continue
        }

        if (gw.tipY <= FY || snapY !== null) {
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

        if (this._anyBallOverlaps(wallCX, gw.wy, wallW + 10, WALL_PX + 10)) {
          this._breakWall(gw); done.push(i); continue
        }

        if (gw.tipX >= FX + FW || snapX !== null) {
          if (gw.tipX > FX + FW) gw.tipX = FX + FW
          this._sealHorizontal(gw); done.push(i)
        }
      }
    }

    for (let i = done.length - 1; i >= 0; i--) {
      this._growingWalls.splice(done[i], 1)
    }
  }

  _anyBallOverlaps(cx, cy, w, h) {
    for (const ball of this._balls) {
      const bx = ball.body.x
      const by = ball.body.y
      if (bx + 6 > cx - w / 2 && bx - 6 < cx + w / 2
       && by + 6 > cy - h / 2 && by - 6 < cy + h / 2) return true
    }
    return false
  }

  // ── Wall outcomes ─────────────────────────────────────────────────────────

  _breakWall(gw) {
    gw.visual.destroy()
    this._breaks++
    this.cameras.main.shake(180, 0.008)
    this.cameras.main.flash(250, 120, 60, 180, true)
    this._updateHUD()

    if (this._breaks >= MAX_BREAKS && !this._won) {
      this._gameActive = false
      this._stopAllBalls()
      this.time.delayedCall(800, () => {
        this._dialogue.show('convergence', LOSE, () => this._loseTransition())
      })
    }
  }

  _sealVertical(gw) {
    gw.visual.destroy()
    const topY   = gw.tipY
    const height = (FY + FH) - topY
    const midY   = topY + height / 2

    const rect = this.add.rectangle(gw.wx, midY, WALL_PX, height, 0x7755aa).setDepth(7)
    this.physics.add.existing(rect, true)
    this._walls.add(rect)

    this._sealedMeta.push({ col: gw.col, fromY: topY })
    this._splitBalls()
    this._updateHUD()
    this._checkWin()
  }

  _sealHorizontal(gw) {
    gw.visual.destroy()
    const width = gw.tipX - FX
    const midX  = FX + width / 2

    const rect = this.add.rectangle(midX, gw.wy, width, WALL_PX, 0x7755aa).setDepth(7)
    this.physics.add.existing(rect, true)
    this._walls.add(rect)

    this._sealedMeta.push({ row: gw.row, toX: gw.tipX })
    this._splitBalls()
    this._updateHUD()
    this._checkWin()
  }

  // ── Ball splitting ────────────────────────────────────────────────────────

  _splitBalls() {
    if (this._balls.length >= MAX_BALLS) return
    const src = this._balls[Phaser.Math.Between(0, this._balls.length - 1)]
    const ang  = Math.atan2(src.body.body.velocity.y, src.body.body.velocity.x)
    const newAng = ang + Phaser.Math.DegToRad(90 + Phaser.Math.Between(-15, 15))
    const nb = this._createBall(src.body.x + 8, src.body.y + 8, newAng)
    this._balls.push(nb)

    this.cameras.main.flash(200, 80, 60, 120, true)
  }

  // ── Win / lose ────────────────────────────────────────────────────────────

  _checkWin() {
    if (this._won || this._breaks >= MAX_BREAKS) return
    if (this._calcContainment() > WIN_RATIO) return

    this._won = true
    this._gameActive = false
    this._stopAllBalls()
    this.cameras.main.flash(800, 80, 60, 140, true)
    this.cameras.main.shake(300, 0.006)
    this.time.delayedCall(1000, () => {
      this._dialogue.show('convergence', WIN, () => this._winTransition())
    })
  }

  _stopAllBalls() {
    for (const ball of this._balls) {
      ball.body.body.setVelocity(0, 0)
    }
  }

  // ── Transitions ───────────────────────────────────────────────────────────

  _winTransition() {
    const st = {
      ...this._slopState,
      finalDungeonCleared: true,
      coinCount: Math.min(
        (this._slopState.coinCount ?? 0) + 10,
        this._slopState.maxCoins ?? 3
      ),
    }
    this._sceneTransition('WorldScene', { slopState: st, spawnOrigin: 'shrine' })
  }

  _loseTransition() {
    this._sceneTransition('NorthShrineScene', {
      slopState: this._slopState,
      spawnOrigin: 'south',
    })
  }

  // ── Update ────────────────────────────────────────────────────────────────

  update(_, delta) {
    if (this._transitioning) return
    this._checkPauseKey()
    this._dialogue.update()

    for (const ball of this._balls) {
      const speed = ball.body.body.speed
      if (speed > 0 && Math.abs(speed - BALL_SPEED) > 25) {
        const ang = Math.atan2(ball.body.body.velocity.y, ball.body.body.velocity.x)
        ball.body.body.setVelocity(Math.cos(ang) * BALL_SPEED, Math.sin(ang) * BALL_SPEED)
      }
      ball.vis.setPosition(ball.body.x, ball.body.y)
      ball.glow.setPosition(ball.body.x, ball.body.y)
    }

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
