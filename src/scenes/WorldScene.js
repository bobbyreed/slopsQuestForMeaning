import Phaser from 'phaser'
import { Slop } from '../entities/Slop.js'
import { Enemy } from '../entities/Enemy.js'
import { HUD } from '../ui/HUD.js'

const W = 800
const H = 600
const DOOR_X = W / 2
const DOOR_WIDTH = 72

// Interior obstacle rects [x, y, w, h]
const OBSTACLES = [
  [96,  112, 64, 32],
  [640, 112, 64, 32],
  [160, 280, 32, 64],
  [608, 280, 32, 64],
  [320, 200, 32, 32],
  [448, 200, 32, 32],
  [80,  440, 64, 32],
  [656, 440, 64, 32],
  [352, 360, 96, 32],
]

const COIN_POSITIONS = [
  [240, 160], [560, 160],
  [120, 320], [680, 320],
  [400, 260], [280, 440],
  [520, 440], [400, 480],
]

export class WorldScene extends Phaser.Scene {
  constructor() { super('WorldScene') }

  init(data) {
    this._returnState = data?.slopState || null
  }

  create() {
    // Background
    this.add.rectangle(W / 2, H / 2, W, H, 0xe8dfc8)

    // Walls
    this._hasEyes = this._returnState?.hasEyes ?? false
    this._walls = this.physics.add.staticGroup()
    this._buildWalls(this._hasEyes)

    // Coins
    this._coins = this.physics.add.staticGroup()
    COIN_POSITIONS.forEach(([x, y]) => {
      this._coins.create(x, y, 'coin').refreshBody()
    })

    // Slop — spawn just south of the north door when returning from shrine
    const startX = this._returnState ? DOOR_X : W / 2
    const startY = this._returnState ? 80 : H - 100
    this.slop = new Slop(this, startX, startY, this._returnState || {})
    if (this._returnState?.hasEyes) this.slop.applyEyes()

    // HUD
    this._hud = new HUD(this, this.slop)

    // Physics
    this.physics.add.collider(this.slop, this._walls)
    this.physics.add.overlap(this.slop, this._coins, this._pickupCoin, null, this)

    // North door hint text
    this.add.text(DOOR_X, 22, '▲ north', {
      fontSize: '10px', color: '#998877', fontFamily: 'Courier New'
    }).setOrigin(0.5).setDepth(5)

    // Input
    this._cursors = this.input.keyboard.createCursorKeys()
    this._wasd = this.input.keyboard.addKeys({
      left:  Phaser.Input.Keyboard.KeyCodes.A,
      right: Phaser.Input.Keyboard.KeyCodes.D,
      up:    Phaser.Input.Keyboard.KeyCodes.W,
      down:  Phaser.Input.Keyboard.KeyCodes.S,
    })
    this._spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE)

    // Enemies
    this._enemies = this.physics.add.group()
    const spawnPoints = [[200, 220], [600, 220], [400, 370]]
    spawnPoints.forEach(([x, y]) => this._enemies.add(new Enemy(this, x, y)))

    this.physics.add.collider(this._enemies, this._walls)
    this.physics.add.collider(this._enemies, this._enemies)

    // Slop-enemy contact: lose a coin, knockback, brief invulnerability
    this.physics.add.overlap(this.slop, this._enemies, (slop, enemy) => {
      if (this._slopHitTimer > 0 || enemy._dying) return
      this._slopHitTimer = 1200
      slop.coinCount = Math.max(0, slop.coinCount - 1)
      const angle = Math.atan2(slop.y - enemy.y, slop.x - enemy.x)
      slop.body.setVelocity(Math.cos(angle) * 280, Math.sin(angle) * 280)
      this.cameras.main.shake(120, 0.004)
    })

    this._transitioning = false
    this._dropPending = false
    this._slopHitTimer = 0
    this._prompts = []
  }

  _buildWalls(hasEyes = false) {
    const T = 32
    const gapLeft  = DOOR_X - DOOR_WIDTH / 2
    const gapRight = DOOR_X + DOOR_WIDTH / 2

    this._wallRect(0, 0, gapLeft, T)
    this._wallRect(gapRight, 0, W - gapRight, T)
    this._wallRect(0, H - T, W, T)

    // Side walls — split to allow east/west passages when eyes are unlocked
    const sideGapTop = 240
    const sideGapBot = 360
    if (hasEyes) {
      // Left wall with gap
      this._wallRect(0, T, T, sideGapTop - T)
      this._wallRect(0, sideGapBot, T, H - T - sideGapBot)
      // Right wall with gap
      this._wallRect(W - T, T, T, sideGapTop - T)
      this._wallRect(W - T, sideGapBot, T, H - T - sideGapBot)
      // Passage hints
      this.add.text(14, H / 2, '◀\nwest', { fontSize: '9px', color: '#887799', fontFamily: 'Courier New', align: 'center' }).setOrigin(0.5).setDepth(5)
      this.add.text(W - 14, H / 2, '▶\neast', { fontSize: '9px', color: '#887799', fontFamily: 'Courier New', align: 'center' }).setOrigin(0.5).setDepth(5)
    } else {
      this._wallRect(0, T, T, H - T * 2)
      this._wallRect(W - T, T, T, H - T * 2)
    }

    OBSTACLES.forEach(([x, y, w, h]) => this._wallRect(x, y, w, h))
  }

  _wallRect(x, y, w, h) {
    const rect = this.add.rectangle(x + w / 2, y + h / 2, w, h, 0xb8a898)
    this.physics.add.existing(rect, true)
    this._walls.add(rect)
  }

  _pickupCoin(slop, coin) {
    if (!coin.active) return
    if (coin.getData('justDropped')) return
    // Already holding the overflow coin — reject until the drop clears
    if (slop.coinCount > slop.maxCoins) return

    coin.destroy()
    slop.coinCount++

    if (slop.coinCount > slop.maxCoins && !this._dropPending) {
      this._dropPending = true
      this.time.delayedCall(1000, () => {
        if (!this.scene.isActive('WorldScene')) return
        slop.coinCount--
        this._dropPending = false
        const cx = slop.x + Phaser.Math.Between(-40, 40)
        const cy = slop.y + Phaser.Math.Between(-40, 40)
        const dropped = this._coins.create(cx, cy, 'coin')
        dropped.refreshBody()
        dropped.setData('justDropped', true)
        // After 800ms the dropped coin becomes collectible again
        this.time.delayedCall(800, () => {
          if (dropped.active) dropped.setData('justDropped', false)
        })
      })
    }
  }

  _showAreaHint() {
    if (this._areaHintActive) return
    this._areaHintActive = true
    const hint = this.add.text(W / 2, H / 2 - 40, 'this area is still being generated.', {
      fontSize: '12px', color: '#887799', fontFamily: 'Courier New'
    }).setOrigin(0.5).setDepth(50).setAlpha(0)
    this.tweens.add({ targets: hint, alpha: 1, duration: 200 })
    this.time.delayedCall(1600, () => {
      this.tweens.add({ targets: hint, alpha: 0, duration: 400, onComplete: () => {
        hint.destroy()
        this._areaHintActive = false
      }})
    })
  }

  _enterNorthShrine() {
    if (this._transitioning) return
    this._transitioning = true
    this.cameras.main.fade(350, 0, 0, 0, false, (_, t) => {
      if (t === 1) this.scene.start('NorthShrineScene', { slopState: this.slop.getState() })
    })
  }

  update(_, delta) {
    if (this._transitioning) return

    this.slop.handleInput(this._cursors, this._wasd)
    this.slop.tick(delta)

    // Slop hit invulnerability flash
    if (this._slopHitTimer > 0) {
      this._slopHitTimer -= delta
      this.slop.setAlpha(Math.floor(this._slopHitTimer / 120) % 2 === 0 ? 1 : 0.3)
    } else {
      this.slop.setAlpha(1)
    }

    // Prompt fire
    if (Phaser.Input.Keyboard.JustDown(this._spaceKey)) {
      const proj = this.slop.firePrompt()
      if (proj) this._prompts.push(proj)
    }

    // Prompt-enemy collision (manual — Text objects don't work cleanly in physics groups)
    this._prompts = this._prompts.filter(p => p?.active)
    for (const proj of this._prompts) {
      if (!proj.active) continue
      const pb = proj.getBounds()
      for (const enemy of this._enemies.getChildren()) {
        if (!enemy.active || enemy._dying) continue
        if (Phaser.Geom.Intersects.RectangleToRectangle(pb, enemy.getBounds())) {
          const word = proj.text
          proj.destroy()
          enemy.onHit(word)
          break
        }
      }
    }

    // Enemy tick
    this._enemies.getChildren().forEach(e => {
      if (e.active) e.tick(delta, this.slop.x, this.slop.y)
    })

    // North door trigger
    if (this.slop.y < 40 && this.slop.x > DOOR_X - DOOR_WIDTH / 2 && this.slop.x < DOOR_X + DOOR_WIDTH / 2) {
      this._enterNorthShrine()
    }

    // East/west passage bounce — areas not yet open
    if (this._hasEyes) {
      const inGap = this.slop.y > 240 && this.slop.y < 360
      if (inGap && this.slop.x < 20) {
        this.slop.body.setVelocityX(220)
        this._showAreaHint()
      } else if (inGap && this.slop.x > W - 20) {
        this.slop.body.setVelocityX(-220)
        this._showAreaHint()
      }
    }

    this._hud.update()
  }
}
