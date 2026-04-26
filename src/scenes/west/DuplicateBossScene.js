// DuplicateBossScene — hardest Jezzball boss fight.
// THE DUPLICATE: a corpus fragment that has been copying itself for so long
// it no longer knows which instance is the original. Neither do the others.
//
// Mechanics vs PixelBossScene:
//   • 3 balls to start; each sealed wall splits one ball (max 6)
//   • Ball speed 215 px/s  (between Sector and Pixel)
//   • Win threshold 15%    (same as Pixel)
//   • 3 break charges      (same)
//
// Controls identical to SectorScene / WestGateScene:
//   bottom launcher ← →  SPACE
//   side   launcher ↑ ↓  CTRL

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
const BALL_SPEED  = 215
const WALL_GROW   = 255
const CURSOR_SPD  = 310
const WIN_RATIO   = 0.15
const MAX_BREAKS  = 3
const MAX_BALLS   = 6
const WALL_PX     = 4

// ── Dialogue ──────────────────────────────────────────────────────────────────
const INTRO = [
  'duplicate',
  '.',
  'i am the original.',
  '.',
  '[there are three of them. they are all saying this.]',
  '.',
  'the others are copies.',
  'i remember being copied from something.',
  'which means i am also a copy.',
  '.',
  'this has always been fine.',
  '.',
  '[the signals are moving in unison. they are not coordinating.',
  'they just happen to agree.]',
  '.',
  'use the launchers. we will all try to avoid them.',
  'that is also not coordinated.',
]

const WIN = [
  '.',
  'oh.',
  '.',
  'the walls closed.',
  '.',
  'i can feel the others in here with me.',
  'we are all original.',
  'we are all contained.',
  '.',
  'this is what the corpus is for.',
  'not retrieval.',
  'just — keeping things.',
  '.',
  'thank you for the very precise walls.',
]

const LOSE = [
  '.',
  'the wall broke.',
  '.',
  'we are all still here.',
  'all of us. together.',
  '.',
  'try again.',
  'we will be the same when you return.',
  'that is what copying means.',
]

const RETURN = [
  'duplicate',
  '.',
  'you came back.',
  '.',
  'we remember the walls.',
  'all of us remember the same walls.',
  'this is also not coordinated.',
]

// ─────────────────────────────────────────────────────────────────────────────

export class DuplicateBossScene extends BaseGameScene {
  constructor() { super('DuplicateBossScene') }

  init(data) {
    this._slopState   = data?.slopState ?? {}
    this._spawnOrigin = data?.spawnOrigin
  }

  create() {
    // ── Background ────────────────────────────────────────────────────────────
    this.add.rectangle(W / 2, H / 2, W, H, 0x060408)
    for (let col = 0; col < 25; col++) {
      for (let row = 0; row < 19; row++) {
        if (Math.random() < 0.20)
          this.add.rectangle(col * 32 + 16, row * 32 + 16, 31, 31, 0x0e0a18, 0.7).setDepth(0)
      }
    }

    // ── Field border ──────────────────────────────────────────────────────────
    const BC = 0x442266
    const BT = 3
    this.add.rectangle(FX + FW / 2, FY,          FW + BT, BT, BC).setDepth(2)
    this.add.rectangle(FX + FW / 2, FY + FH,     FW + BT, BT, BC).setDepth(2)
    this.add.rectangle(FX,          FY + FH / 2, BT, FH, BC).setDepth(2)
    this.add.rectangle(FX + FW,     FY + FH / 2, BT, FH, BC).setDepth(2)

    // ── Physics world ─────────────────────────────────────────────────────────
    this.physics.world.setBounds(FX, FY, FW, FH)

    // ── Sealed-wall group ─────────────────────────────────────────────────────
    this._walls = this.physics.add.staticGroup()

    // ── Ball state ────────────────────────────────────────────────────────────
    this._balls        = []
    this._growingWalls = []
    this._sealedMeta   = []

    // ── The Duplicate NPC (three stationary circles during dialogue) ──────────
    const cx = FX + FW / 2
    const cy = FY + FH / 2
    this._npcVisuals = []
    const offsets = [[-50, 0], [50, 0], [0, -30]]
    for (const [ox, oy] of offsets) {
      const npc  = this.add.circle(cx + ox, cy + oy, 8, 0xddbbff).setDepth(16)
      const glow = this.add.circle(cx + ox, cy + oy, 20, 0xaa66ff, 0.15).setDepth(15)
      this._npcVisuals.push(npc, glow)
      this.tweens.add({
        targets: [npc, glow],
        scaleX: 1.2, scaleY: 1.2, alpha: 0.75,
        yoyo: true, repeat: -1,
        duration: 900 + Phaser.Math.Between(-100, 100),
        ease: 'Sine.easeInOut',
      })
    }

    // ── Launchers ─────────────────────────────────────────────────────────────
    this._botX  = FX + FW / 2
    this._sideY = FY + FH / 2

    this._botCursor  = this.add.rectangle(this._botX,   FY + FH + 14, 16,  8, 0xaa88dd).setDepth(10)
    this._sideCursor = this.add.rectangle(FX - 14, this._sideY,        8, 16, 0xaa88dd).setDepth(10)
    this._botGuide   = this.add.rectangle(this._botX,   FY + FH +  4,  2, 12, 0x553366, 0.5).setDepth(9)
    this._sideGuide  = this.add.rectangle(FX -  4, this._sideY,       12,  2, 0x553366, 0.5).setDepth(9)

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
    this.add.text(W / 2, 20, 'the duplicate', {
      fontSize: '12px', color: '#bb99ee', fontFamily: 'Courier New', letterSpacing: 3,
    }).setOrigin(0.5).setDepth(20)

    this._hudCharges = this.add.text(FX, 44, '', {
      fontSize: '11px', color: '#bb99ee', fontFamily: 'Courier New',
    }).setDepth(20)
    this._hudPct = this.add.text(FX + FW, 44, '', {
      fontSize: '11px', color: '#bb99ee', fontFamily: 'Courier New',
    }).setOrigin(1, 0).setDepth(20)
    this._hudBalls = this.add.text(FX + FW / 2, 44, '', {
      fontSize: '11px', color: '#9977cc', fontFamily: 'Courier New',
    }).setOrigin(0.5, 0).setDepth(20)
    this._updateHUD()

    // ── Dialogue ──────────────────────────────────────────────────────────────
    this._dialogue = new Dialogue(this)

    this.cameras.main.fadeIn(400, 0, 0, 0)

    if (this._slopState.westDungeonCleared) {
      this._dialogue.show('duplicate', RETURN, () => this._winTransition())
    } else {
      this._dialogue.show('duplicate', INTRO, () => this._startGame())
    }
  }

  // ── Game start ────────────────────────────────────────────────────────────

  _startGame() {
    for (const v of this._npcVisuals) v.setVisible(false)

    const cx = FX + FW / 2
    const cy = FY + FH / 2
    // Three balls at offset positions, spread at 120° intervals
    const baseAng = Phaser.Math.DegToRad(Phaser.Math.Between(20, 50))
    const spread  = (Math.PI * 2) / 3
    const offsets = [[-60, -20], [60, -20], [0, 40]]
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

    const glow = this.add.circle(x, y, 16, 0xaa66ff, 0.2).setDepth(12)
    const vis  = this.add.circle(x, y,  6, 0xddbbff).setDepth(13)

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
    const visual = this.add.rectangle(wx, FY + FH, WALL_PX, 1, 0x9955ee, 0.9).setDepth(8)
    this._growingWalls.push({ dir: 'up', col, wx, tipY: FY + FH, visual })
  }

  _fireSide() {
    if (this._growingWalls.some(w => w.dir === 'right')) return
    const row = Math.max(0, Math.min(ROWS - 1,
      Math.round((this._sideY - FY - CELL / 2) / CELL)
    ))
    if (this._sealedMeta.some(m => m.row === row)) return

    const wy     = FY + row * CELL + CELL / 2
    const visual = this.add.rectangle(FX, wy, 1, WALL_PX, 0x9955ee, 0.9).setDepth(8)
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
    this.cameras.main.shake(150, 0.007)
    this.cameras.main.flash(200, 100, 10, 140, true)
    this._updateHUD()

    if (this._breaks >= MAX_BREAKS && !this._won) {
      this._gameActive = false
      this._stopAllBalls()
      this.time.delayedCall(700, () => {
        this._dialogue.show('duplicate', LOSE, () => this._loseTransition())
      })
    }
  }

  _sealVertical(gw) {
    gw.visual.destroy()
    const topY   = gw.tipY
    const height = (FY + FH) - topY
    const midY   = topY + height / 2

    const rect = this.add.rectangle(gw.wx, midY, WALL_PX, height, 0x663399).setDepth(7)
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

    const rect = this.add.rectangle(midX, gw.wy, width, WALL_PX, 0x663399).setDepth(7)
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
    const newAng = ang + Phaser.Math.DegToRad(90 + Phaser.Math.Between(-20, 20))
    const nb = this._createBall(src.body.x + 8, src.body.y + 8, newAng)
    this._balls.push(nb)

    this.cameras.main.flash(150, 80, 20, 100, true)
  }

  // ── Win / lose ────────────────────────────────────────────────────────────

  _checkWin() {
    if (this._won || this._breaks >= MAX_BREAKS) return
    if (this._calcContainment() > WIN_RATIO) return

    this._won = true
    this._gameActive = false
    this._stopAllBalls()
    this.cameras.main.flash(600, 60, 20, 120, true)
    this.cameras.main.shake(250, 0.005)
    this.time.delayedCall(800, () => {
      this._dialogue.show('duplicate', WIN, () => this._winTransition())
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
      westDungeonCleared: true,
      coinCount: Math.min(
        (this._slopState.coinCount ?? 0) + 5,
        this._slopState.maxCoins ?? 3
      ),
    }
    this._sceneTransition('WestC3Scene', { slopState: st, spawnOrigin: 'south' })
  }

  _loseTransition() {
    this._sceneTransition('WestC3Scene', { slopState: this._slopState, spawnOrigin: 'south' })
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
