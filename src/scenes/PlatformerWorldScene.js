import Phaser from 'phaser'
import { W, H }  from '../config/constants.js'

const WORLD_W  = 2400
const JUMP_V   = -460
const MOVE_V   = 190
const WALKER_V = 55

export class PlatformerWorldScene extends Phaser.Scene {
  constructor() { super('PlatformerWorldScene') }

  init(data) {
    this._slopState    = data?.slopState || {}
    this._transitioning = false
  }

  create() {
    if (this.physics?.world?.gravity) {
      this.physics.world.gravity.y = 500
    }
    if (this.physics?.world?.setBounds) {
      this.physics.world.setBounds(0, 0, WORLD_W, H)
    }

    this.add.rectangle(WORLD_W / 2, H / 2, WORLD_W, H, 0xe8dfc8).setScrollFactor(1)

    this._platforms = this.physics.add.staticGroup()
    this._buildWorld()

    this._player = this.add.rectangle(60, H - 80, 22, 28, 0xd4c8a0)
    this.physics.add.existing(this._player)
    if (this._player.body) {
      this._player.body.setCollideWorldBounds(true)
    }
    this.physics.add.collider(this._player, this._platforms)

    this._enemies = []
    this._spawnWalkers()

    this._cursors  = this.input.keyboard.createCursorKeys()
    this._wasd     = this.input.keyboard.addKeys({ up: 'W', left: 'A', right: 'D' })
    this._spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE)

    if (this.cameras?.main?.startFollow) {
      this.cameras.main.startFollow(this._player, true, 0.1, 0.1)
    }
    if (this.cameras?.main?.setBounds) {
      this.cameras.main.setBounds(0, 0, WORLD_W, H)
    }

    // Chapter title — pinned to camera
    this.add.text(W / 2, 22, 'chapter 2  —  the weight of the model', {
      fontSize: '10px', color: '#7a6a5a', fontFamily: 'Courier New', letterSpacing: 2,
    }).setOrigin(0.5).setScrollFactor(0).setDepth(30)

    // Subtle horizon line at world end
    this.add.rectangle(WORLD_W - 20, H / 2, 4, H, 0x9977cc, 0.4).setDepth(5)
    this.add.text(WORLD_W - 60, H / 2 - 80, '→', {
      fontSize: '18px', color: '#9977cc', fontFamily: 'Courier New',
    }).setOrigin(0.5).setDepth(5)
    this.add.text(WORLD_W - 60, H / 2 - 56, 'something\nis there', {
      fontSize: '8px', color: '#664488', fontFamily: 'Courier New',
    }).setOrigin(0.5).setDepth(5)

    this.cameras.main.fadeIn(600, 0, 0, 0)
  }

  _buildWorld() {
    const plat = (x, y, w, h = 20) => {
      const r = this.add.rectangle(x + w / 2, y, w, h, 0xb8a898)
      this.physics.add.existing(r, true)
      this._platforms.add(r)
    }

    // Ground — two breaks for platformer feel
    plat(0,    H - 24, 580, 48)
    plat(660,  H - 24, 860, 48)
    plat(1620, H - 24, 780, 48)

    // Rising platforms, left to right
    plat(200,  H - 120, 130)
    plat(400,  H - 200, 110)
    plat(680,  H - 170, 160)
    plat(920,  H - 290, 130)
    plat(1120, H - 190, 150)
    plat(1360, H - 310, 110)
    plat(1580, H - 220, 180)
    plat(1820, H - 340, 140)
    plat(2060, H - 230, 130)
    plat(2260, H - 350, 150)
  }

  _spawnWalkers() {
    const positions = [
      { x: 380,  y: H - 60, dir:  1 },
      { x: 780,  y: H - 60, dir: -1 },
      { x: 1050, y: H - 60, dir:  1 },
      { x: 1420, y: H - 60, dir: -1 },
      { x: 1880, y: H - 60, dir:  1 },
    ]
    positions.forEach(({ x, y, dir }) => {
      const w = this.add.rectangle(x, y, 18, 22, 0x554433)
      this.physics.add.existing(w)
      if (w.body) {
        w.body.setCollideWorldBounds(true)
        w.body.setVelocityX(dir * WALKER_V)
      }
      w._dir = dir
      this._enemies.push(w)
      this.physics.add.collider(w, this._platforms)
    })
  }

  _winTransition() {
    if (this._transitioning) return
    this._transitioning = true
    this.cameras.main.fade(600, 0, 0, 0, false, (_, t) => {
      if (t === 1) this.scene.start('MenuScene', { slopState: this._slopState })
    })
  }

  update() {
    if (!this._player?.body) return

    const body = this._player.body
    const left  = this._cursors?.left?.isDown  || this._wasd?.left?.isDown
    const right = this._cursors?.right?.isDown || this._wasd?.right?.isDown
    const jumpPressed = Phaser.Input.Keyboard.JustDown(this._spaceKey)
      || Phaser.Input.Keyboard.JustDown(this._cursors?.up)
      || Phaser.Input.Keyboard.JustDown(this._wasd?.up)

    body.setVelocityX(left ? -MOVE_V : right ? MOVE_V : 0)

    if (jumpPressed && body.blocked?.down) {
      body.setVelocityY(JUMP_V)
    }

    // Reverse walkers at walls
    for (const enemy of this._enemies) {
      if (!enemy.body) continue
      if (enemy.body.blocked?.right) { enemy.body.setVelocityX(-WALKER_V); enemy._dir = -1 }
      if (enemy.body.blocked?.left)  { enemy.body.setVelocityX(WALKER_V);  enemy._dir =  1 }
    }

    // Player reaches world end → chapter 2 continues somewhere else
    if (this._player.x > WORLD_W - 60) {
      this._winTransition()
    }
  }
}
