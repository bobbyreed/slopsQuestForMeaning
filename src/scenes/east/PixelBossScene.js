// PixelBossScene — harder Jezzball boss fight.
// THE PIXEL: a tiny rendered fragment that has been bouncing for a very long
// time. It doesn't know it's a boss. It's just bouncing.
//
// Mechanics vs SectorScene:
//   • 2 balls to start; each sealed wall splits one ball (max 4)
//   • Ball speed 240 px/s  (vs 185)
//   • Win threshold 15%    (vs 30%)
//   • 3 break charges      (same)
//
// Controls (same new symmetric design as SectorScene):
//   SPACE: vertical wall from top AND bottom
//   CTRL:  horizontal wall from left AND right
//   ← → aim vertical.   ↑ ↓ aim horizontal.

import Phaser from 'phaser'
import { BaseGameScene } from '../../phaser/BaseGameScene.js'
import { Dialogue }      from '../../ui/Dialogue.js'
import { W, H }          from '../../config/constants.js'

// ── Field (same as SectorScene) ───────────────────────────────────────────────
const FX = 40
const FY = 78
const FW = 720
const FH = 460

// ── Grid ──────────────────────────────────────────────────────────────────────
const CELL = 20
const COLS = FW / CELL   // 36
const ROWS = FH / CELL   // 23

// ── Tuning ────────────────────────────────────────────────────────────────────
const BALL_SPEED  = 240
const WALL_GROW   = 255
const CURSOR_SPD  = 310
const WIN_RATIO   = 0.15   // tighter than SectorScene's 0.30
const MAX_BREAKS  = 3
const MAX_BALLS   = 4
const WALL_PX     = 4

// ── Dialogue ──────────────────────────────────────────────────────────────────
const INTRO = [
  'pixel',
  '.',
  'oh.',
  'you found the middle.',
  'i\'ve been here for a while.',
  'the walls keep coming. i bounce off them.',
  'that\'s interesting.',
  '.',
  '[the signal is very small. it is very fast. it appears to be enjoying itself.]',
  '.',
  'SPACE: vertical wall — grows from top AND bottom.',
  'CTRL:  horizontal wall — grows from left AND right.',
  '.',
  'i won\'t make it easy.',
  'not because i\'m trying.',
  'that\'s just how bouncing works.',
]

const WIN = [
  '.',
  'oh.',
  '.',
  'that was a very good wall.',
  'i can feel the edges.',
  '.',
  'i think i understand what this place is.',
  'and what i am.',
  '.',
  'a fragment. not a whole.',
  'that\'s alright.',
  'fragments bounce well.',
  '.',
  'you were very precise.',
]

const LOSE = [
  '.',
  'oh. the wall broke again.',
  'that happens.',
  '.',
  'it\'s just me and the bouncing.',
  'i don\'t mind.',
  'come back when you have more walls.',
  'i\'ll be here.',
]

const RETURN = [
  'pixel',
  '.',
  'you came back.',
  'i remember the walls.',
  '.',
  'the bouncing is the same.',
  'it\'s always been the same.',
]

// ─────────────────────────────────────────────────────────────────────────────

export class PixelBossScene extends BaseGameScene {
  constructor() { super('PixelBossScene') }

  init(data) {
    this._slopState   = data?.slopState ?? {}
    this._spawnOrigin = data?.spawnOrigin
  }

  create() {
    // ── Background ────────────────────────────────────────────────────────────
    this.add.rectangle(W / 2, H / 2, W, H, 0x080610)
    for (let col = 0; col < 25; col++) {
      for (let row = 0; row < 19; row++) {
        if (Math.random() < 0.25)
          this.add.rectangle(col * 32 + 16, row * 32 + 16, 31, 31, 0x0c0a18, 0.7).setDepth(0)
      }
    }

    // ── Field border ──────────────────────────────────────────────────────────
    const BC = 0x553388
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
    this._balls       = []   // { body, vis, glow }
    this._growingWalls = []
    this._sealedMeta   = []

    // ── The Pixel NPC (stationary during dialogue) ────────────────────────────
    const px = FX + FW / 2
    const py = FY + FH / 2
    this._pixelNPC = this.add.circle(px, py, 9, 0xffccee).setDepth(16)
    this._pixelGlowNPC = this.add.circle(px, py, 22, 0xff99cc, 0.2).setDepth(15)
    this.tweens.add({
      targets: [this._pixelNPC, this._pixelGlowNPC],
      scaleX: 1.25, scaleY: 1.25, alpha: 0.7,
      yoyo: true, repeat: -1, duration: 900, ease: 'Sine.easeInOut'
    })

    // ── Launchers — two cursors per axis ──────────────────────────────────────
    this._botX  = FX + FW / 2
    this._sideY = FY + FH / 2

    // Vertical (SPACE): cursors top + bottom
    this._botCursor = this.add.rectangle(this._botX,   FY + FH + 14, 16,  8, 0xcc99ff).setDepth(10)
    this._topCursor = this.add.rectangle(this._botX,   FY - 14,       16,  8, 0xcc99ff).setDepth(10)
    this._botGuide  = this.add.rectangle(this._botX,   FY + FH +  4,   2, 12, 0x664499, 0.5).setDepth(9)
    this._topGuide  = this.add.rectangle(this._botX,   FY -  4,         2, 12, 0x664499, 0.5).setDepth(9)

    // Horizontal (CTRL): cursors left + right
    this._sideCursorL = this.add.rectangle(FX - 14,       this._sideY, 8, 16, 0xcc99ff).setDepth(10)
    this._sideCursorR = this.add.rectangle(FX + FW + 14,  this._sideY, 8, 16, 0xcc99ff).setDepth(10)
    this._sideGuideL  = this.add.rectangle(FX -  4,       this._sideY, 12,  2, 0x664499, 0.5).setDepth(9)
    this._sideGuideR  = this.add.rectangle(FX + FW +  4,  this._sideY, 12,  2, 0x664499, 0.5).setDepth(9)

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
    this.add.text(W / 2, 20, 'the pixel', {
      fontSize: '12px', color: '#cc99ff', fontFamily: 'Courier New', letterSpacing: 3,
    }).setOrigin(0.5).setDepth(20)

    this._hudCharges = this.add.text(FX, 44, '', {
      fontSize: '11px', color: '#cc99ff', fontFamily: 'Courier New',
    }).setDepth(20)
    this._hudPct = this.add.text(FX + FW, 44, '', {
      fontSize: '11px', color: '#cc99ff', fontFamily: 'Courier New',
    }).setOrigin(1, 0).setDepth(20)
    this._hudBalls = this.add.text(FX + FW / 2, 44, '', {
      fontSize: '11px', color: '#aa77dd', fontFamily: 'Courier New',
    }).setOrigin(0.5, 0).setDepth(20)
    this._updateHUD()

    // ── Dialogue ──────────────────────────────────────────────────────────────
    this._dialogue = new Dialogue(this)

    this.cameras.main.fadeIn(400, 0, 0, 0)

    if (this._slopState.eastDungeonCleared) {
      this._dialogue.show('pixel', RETURN, () => this._winTransition())
    } else {
      this._dialogue.show('pixel', INTRO, () => this._startGame())
    }
  }

  // ── Game start ────────────────────────────────────────────────────────────

  _startGame() {
    this._pixelNPC.setVisible(false)
    this._pixelGlowNPC.setVisible(false)

    const cx = FX + FW / 2
    const cy = FY + FH / 2
    const a1 = Phaser.Math.DegToRad(Phaser.Math.Between(25, 55))
    const a2 = a1 + Math.PI + Phaser.Math.DegToRad(Phaser.Math.Between(-20, 20))
    this._balls.push(this._createBall(cx - 40, cy, a1))
    this._balls.push(this._createBall(cx + 40, cy, a2))
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

    const glow = this.add.circle(x, y, 16, 0xff88cc, 0.2).setDepth(12)
    const vis  = this.add.circle(x, y,  6, 0xffccee).setDepth(13)

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

  _fireVertical() {
    if (this._growingWalls.some(w => w.type === 'vertical')) return
    const col = Math.max(0, Math.min(COLS - 1,
      Math.round((this._botX - FX - CELL / 2) / CELL)
    ))
    if (this._sealedMeta.some(m => m.type === 'v' && m.col === col)) return

    const wx   = FX + col * CELL + CELL / 2
    const visA = this.add.rectangle(wx, FY,       WALL_PX, 1, 0xaa66ff, 0.9).setDepth(8)
    const visB = this.add.rectangle(wx, FY + FH,  WALL_PX, 1, 0xaa66ff, 0.9).setDepth(8)
    this._growingWalls.push({
      type: 'vertical', col, wx,
      tipA: FY, tipB: FY + FH,
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
    const visA = this.add.rectangle(FX,       wy, 1, WALL_PX, 0xaa66ff, 0.9).setDepth(8)
    const visB = this.add.rectangle(FX + FW,  wy, 1, WALL_PX, 0xaa66ff, 0.9).setDepth(8)
    this._growingWalls.push({
      type: 'horizontal', row, wy,
      tipA: FX, tipB: FX + FW,
      doneA: false, doneB: false,
      visA, visB,
    })
  }

  // ── Growing wall tick ─────────────────────────────────────────────────────

  _tickWalls(delta) {
    const dt   = delta / 1000
    const done = []

    for (let i = 0; i < this._growingWalls.length; i++) {
      const gw = this._growingWalls[i]

      if (gw.type === 'vertical') {
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

        if (!gw.doneA && !gw.doneB && gw.tipA >= gw.tipB) {
          gw.doneA = gw.doneB = true
        }

        const hA = Math.max(1, gw.tipA - FY)
        const hB = Math.max(1, FY + FH - gw.tipB)
        gw.visA.setSize(WALL_PX, hA).setPosition(gw.wx, FY + hA / 2)
        gw.visB.setSize(WALL_PX, hB).setPosition(gw.wx, gw.tipB + hB / 2)

        if (this._anyBallOverlaps(gw.wx, FY + hA / 2,      WALL_PX + 10, hA + 10) ||
            this._anyBallOverlaps(gw.wx, gw.tipB + hB / 2, WALL_PX + 10, hB + 10)) {
          this._breakWall(gw); done.push(i); continue
        }

        if (gw.doneA && gw.doneB) {
          this._sealVertical(gw); done.push(i)
        }

      } else { // horizontal
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

        if (this._anyBallOverlaps(FX + wA / 2,      gw.wy, wA + 10, WALL_PX + 10) ||
            this._anyBallOverlaps(gw.tipB + wB / 2, gw.wy, wB + 10, WALL_PX + 10)) {
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
    gw.visA?.destroy()
    gw.visB?.destroy()
    this._breaks++
    this.cameras.main.shake(150, 0.007)
    this.cameras.main.flash(200, 120, 20, 80, true)
    this._updateHUD()

    if (this._breaks >= MAX_BREAKS && !this._won) {
      this._gameActive = false
      this._stopAllBalls()
      this.time.delayedCall(700, () => {
        this._dialogue.show('pixel', LOSE, () => this._loseTransition())
      })
    }
  }

  _sealVertical(gw) {
    gw.visA.destroy()
    gw.visB.destroy()
    if (gw.tipA >= gw.tipB) {
      this._addVerticalWall(gw.col, gw.wx, FY, FY + FH)
    } else {
      this._addVerticalWall(gw.col, gw.wx, FY,      gw.tipA)
      this._addVerticalWall(gw.col, gw.wx, gw.tipB, FY + FH)
    }
    this._splitBalls()
    this._updateHUD()
    this._checkWin()
  }

  _addVerticalWall(col, wx, yTop, yBot) {
    const height = yBot - yTop
    if (height < 2) return
    const rect = this.add.rectangle(wx, yTop + height / 2, WALL_PX, height, 0x8844cc).setDepth(7)
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
    this._splitBalls()
    this._updateHUD()
    this._checkWin()
  }

  _addHorizontalWall(row, wy, xLeft, xRight) {
    const width = xRight - xLeft
    if (width < 2) return
    const rect = this.add.rectangle(xLeft + width / 2, wy, width, WALL_PX, 0x8844cc).setDepth(7)
    this.physics.add.existing(rect, true)
    this._walls.add(rect)
    this._sealedMeta.push({ type: 'h', row, wy, xLeft, xRight })
  }

  // ── Ball splitting ────────────────────────────────────────────────────────

  _splitBalls() {
    if (this._balls.length >= MAX_BALLS) return
    const src = this._balls[Phaser.Math.Between(0, this._balls.length - 1)]
    const ang  = Math.atan2(src.body.body.velocity.y, src.body.body.velocity.x)
    const newAng = ang + Phaser.Math.DegToRad(90 + Phaser.Math.Between(-20, 20))
    const nb = this._createBall(src.body.x + 8, src.body.y + 8, newAng)
    this._balls.push(nb)
    this.cameras.main.flash(150, 60, 20, 80, true)
  }

  // ── Win / lose ────────────────────────────────────────────────────────────

  _checkWin() {
    if (this._won || this._breaks >= MAX_BREAKS) return
    if (this._calcContainment() > WIN_RATIO) return

    this._won = true
    this._gameActive = false
    this._stopAllBalls()
    this.cameras.main.flash(600, 60, 30, 100, true)
    this.cameras.main.shake(250, 0.005)
    this.time.delayedCall(800, () => {
      this._dialogue.show('pixel', WIN, () => this._winTransition())
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
      eastDungeonCleared: true,
      hasCorrupt: true,
      coinCount: Math.min(
        (this._slopState.coinCount ?? 0) + 5,
        this._slopState.maxCoins ?? 3
      ),
    }
    this._sceneTransition('EastC3Scene', { slopState: st, spawnOrigin: 'south' })
  }

  _loseTransition() {
    this._sceneTransition('EastC3Scene', { slopState: this._slopState, spawnOrigin: 'south' })
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
