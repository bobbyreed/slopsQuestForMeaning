import Phaser from 'phaser'
import { BaseGameScene } from '../phaser/BaseGameScene.js'
import { Slop } from '../entities/Slop.js'
import { HUD } from '../ui/HUD.js'
import { W, H, T } from '../config/constants.js'

// The chasm — a gap in the world too wide to walk, requiring dash momentum.
const CHASM_L = 350
const CHASM_R = 450
const CHASM_MID = 400

export class EastScene extends BaseGameScene {
  constructor() { super('EastScene') }

  init(data) {
    this._slopState   = data?.slopState || {}
    this._spawnOrigin = data?.spawnOrigin
  }

  create() {
    this.add.rectangle(W / 2, H / 2, W, H, 0x100a06)

    // Tile grid — same dark mosaic as original
    for (let col = 1; col < 24; col++) {
      for (let row = 1; row < 18; row++) {
        if (Math.random() < 0.45) {
          this.add.rectangle(col * T + 16, row * T + 16, T - 2, T - 2, 0x1a1208, 0.5).setDepth(0)
        }
      }
    }

    // ── Chasm ────────────────────────────────────────────────────────────────
    // Void
    this.add.rectangle(CHASM_MID, H / 2, CHASM_R - CHASM_L, H, 0x000000).setDepth(3)
    // Edge cracks (jagged detail)
    for (let y = 0; y < H; y += 18) {
      const jL = Phaser.Math.Between(-6, 6)
      const jR = Phaser.Math.Between(-6, 6)
      this.add.rectangle(CHASM_L + jL, y + 9, 5, 18, 0x221100, 0.9).setDepth(4)
      this.add.rectangle(CHASM_R + jR, y + 9, 5, 18, 0x221100, 0.9).setDepth(4)
    }
    // Heat shimmer glow strips
    this.add.rectangle(CHASM_L - 4, H / 2, 3, H, 0x441100, 0.4).setDepth(4)
    this.add.rectangle(CHASM_R + 4, H / 2, 3, H, 0x441100, 0.4).setDepth(4)

    this._spawnChasmEmbers()

    // ── Walls (left gap y=240-360, right gap y=240-360) ──────────────────────
    this._walls = this.physics.add.staticGroup()
    const c = 0x1a1208
    this._wallRect(0, 0, W, T, c)
    this._wallRect(0, H - T, W, T, c)
    // Left wall with gap to WorldScene
    this._wallRect(0, T, T, 240 - T, c)
    this._wallRect(0, 360, T, H - T - 360, c)
    // Right wall with gap to east world
    this._wallRect(W - T, T, T, 240 - T, c)
    this._wallRect(W - T, 360, T, H - T - 360, c)

    // ── Spawn ─────────────────────────────────────────────────────────────────
    // spawnOrigin 'east' means player came from EastB0 (right side of chasm)
    const startX = this._spawnOrigin === 'east' ? W - 60 : 60
    this.slop = new Slop(this, startX, H / 2, this._slopState)
    this.physics.add.collider(this.slop, this._walls)

    // Direction hints
    this.add.text(14, H / 2, '◀\nworld', {
      fontSize: '9px', color: '#3d2a14', fontFamily: 'Courier New', align: 'center',
    }).setOrigin(0.5).setDepth(5)
    this.add.text(W - 14, H / 2, '▶\neast', {
      fontSize: '9px', color: '#3d2a14', fontFamily: 'Courier New', align: 'center',
    }).setOrigin(0.5).setDepth(5)

    this._initMovementKeys()
    this._hud = new HUD(this, this.slop)
    this._transitioning  = false
    this._chasmHinted    = false

    this.cameras.main.fadeIn(400, 0, 0, 0)
  }

  _spawnChasmEmbers() {
    for (let i = 0; i < 18; i++) {
      const ex = Phaser.Math.Between(CHASM_L + 4, CHASM_R - 4)
      const ey = Phaser.Math.Between(20, H - 20)
      const dot = this.add.rectangle(ex, ey, 2, 2, 0x883300, 0.7).setDepth(5)
      this.tweens.add({
        targets: dot,
        y: dot.y - Phaser.Math.Between(40, 100),
        alpha: 0,
        duration: Phaser.Math.Between(1200, 3000),
        delay:    Phaser.Math.Between(0, 2000),
        repeat: -1,
        onRepeat: () => {
          dot.x = Phaser.Math.Between(CHASM_L + 4, CHASM_R - 4)
          dot.y = Phaser.Math.Between(H / 2, H - 20)
          dot.setAlpha(0.7)
        },
      })
    }
  }

  _showHint(msg) {
    if (this._chasmHinted) return
    this._chasmHinted = true
    const hint = this.add.text(W / 2, H / 2 - 60, msg, {
      fontSize: '11px', color: '#664422', fontFamily: 'Courier New',
    }).setOrigin(0.5).setDepth(50).setAlpha(0)
    this.tweens.add({ targets: hint, alpha: 1, duration: 250 })
    this.time.delayedCall(2400, () => {
      this.tweens.add({
        targets: hint, alpha: 0, duration: 500,
        onComplete: () => { hint.destroy(); this._chasmHinted = false },
      })
    })
  }

  _enterEastWorld() {
    this._sceneTransition('EastB0Scene', {
      slopState: this.slop.getState(), spawnOrigin: 'west',
    })
  }

  update(_, delta) {
    if (this._transitioning) return

    this.slop.handleInput(this._cursors, this._wasd)
    this.slop.tick(delta)

    // ── Chasm pushback ───────────────────────────────────────────────────────
    const inChasm = this.slop.x > CHASM_L && this.slop.x < CHASM_R
    if (inChasm && this.slop.body.speed < 260) {
      const pushDir = this.slop.x < CHASM_MID ? -1 : 1
      this.slop.body.setVelocityX(pushDir * 280)
      this._showHint(
        this.slop.hasDash ? 'SHIFT — then run across.' : 'the gap is too wide to walk.'
      )
    }

    // ── Navigation ───────────────────────────────────────────────────────────
    const inGap = this.slop.y > 240 && this.slop.y < 360
    if (inGap && this.slop.x < 20) {
      this._sceneTransition('WorldScene', {
        slopState: this.slop.getState(), spawnOrigin: 'east',
      })
    }
    // Only allow east exit if slop is past the chasm
    if (inGap && this.slop.x > W - 20 && this.slop.x > CHASM_R) {
      this._enterEastWorld()
    }

    this._hud.update()
  }
}
