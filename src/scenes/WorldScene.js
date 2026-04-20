import Phaser from 'phaser'
import { Slop } from '../entities/Slop.js'
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
    this._walls = this.physics.add.staticGroup()
    this._buildWalls()

    // Coins
    this._coins = this.physics.add.staticGroup()
    COIN_POSITIONS.forEach(([x, y]) => {
      this._coins.create(x, y, 'coin').refreshBody()
    })

    // Slop — spawn just south of the north door when returning from shrine
    const startX = this._returnState ? DOOR_X : W / 2
    const startY = this._returnState ? 80 : H - 100
    this.slop = new Slop(this, startX, startY, this._returnState || {})

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

    this._transitioning = false
  }

  _buildWalls() {
    const T = 32
    const gapLeft  = DOOR_X - DOOR_WIDTH / 2
    const gapRight = DOOR_X + DOOR_WIDTH / 2

    // Top wall — left segment
    this._wallRect(0, 0, gapLeft, T)
    // Top wall — right segment
    this._wallRect(gapRight, 0, W - gapRight, T)
    // Bottom wall
    this._wallRect(0, H - T, W, T)
    // Left wall
    this._wallRect(0, T, T, H - T * 2)
    // Right wall
    this._wallRect(W - T, T, T, H - T * 2)

    // Interior obstacles
    OBSTACLES.forEach(([x, y, w, h]) => this._wallRect(x, y, w, h))
  }

  _wallRect(x, y, w, h) {
    const rect = this.add.rectangle(x + w / 2, y + h / 2, w, h, 0xb8a898)
    this.physics.add.existing(rect, true)
    this._walls.add(rect)
  }

  _pickupCoin(slop, coin) {
    if (!coin.active) return
    coin.destroy()
    slop.coinCount++

    if (slop.coinCount > slop.maxCoins) {
      // Drop one coin near Slop after 1 second
      this.time.delayedCall(1000, () => {
        if (!this.scene.isActive('WorldScene')) return
        slop.coinCount--
        const cx = slop.x + Phaser.Math.Between(-24, 24)
        const cy = slop.y + Phaser.Math.Between(-24, 24)
        const dropped = this._coins.create(cx, cy, 'coin')
        dropped.refreshBody()
      })
    }
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

    // Prompt fire
    if (Phaser.Input.Keyboard.JustDown(this._spaceKey)) {
      this.slop.firePrompt()
    }

    // North door trigger
    if (this.slop.y < 40 && this.slop.x > DOOR_X - DOOR_WIDTH / 2 && this.slop.x < DOOR_X + DOOR_WIDTH / 2) {
      this._enterNorthShrine()
    }

    this._hud.update()
  }
}
