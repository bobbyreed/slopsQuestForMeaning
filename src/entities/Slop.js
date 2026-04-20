import Phaser from 'phaser'

const PROMPT_WORDS = ['describe', 'generate', 'render', 'imagine', 'exists?', 'why', 'output', 'query', 'what is', 'context']

export class Slop extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y, state = {}) {
    super(scene, x, y, 'slop')
    scene.add.existing(this)
    scene.physics.add.existing(this)

    this.setDepth(10)
    this.body.setSize(22, 22)
    this.body.setOffset(5, 5)
    this.body.setDrag(900, 900)
    this.body.setMaxVelocity(180, 180)

    this.coinCount = state.coinCount ?? 0
    this.maxCoins = state.maxCoins ?? 3
    this.hasPrompt = state.hasPrompt ?? false
    this.facing = state.facing ? { ...state.facing } : { x: 0, y: -1 }

    this._jitterTimer = Phaser.Math.Between(400, 900)
    this._promptCooldown = 0
    this._flickerChance = 0.02
  }

  handleInput(cursors, wasd, blocked = false) {
    if (blocked) {
      this.body.setAcceleration(0, 0)
      return
    }

    const left  = cursors.left.isDown  || wasd.left.isDown
    const right = cursors.right.isDown || wasd.right.isDown
    const up    = cursors.up.isDown    || wasd.up.isDown
    const down  = cursors.down.isDown  || wasd.down.isDown
    const accel = 1500

    if (left)       { this.body.setAccelerationX(-accel); this.facing = { x: -1, y: 0 } }
    else if (right) { this.body.setAccelerationX(accel);  this.facing = { x:  1, y: 0 } }
    else            { this.body.setAccelerationX(0) }

    if (up)         { this.body.setAccelerationY(-accel); this.facing = { x: 0, y: -1 } }
    else if (down)  { this.body.setAccelerationY(accel);  this.facing = { x: 0, y:  1 } }
    else            { this.body.setAccelerationY(0) }
  }

  tick(delta) {
    this._jitterTimer -= delta
    if (this._jitterTimer <= 0) {
      this._jitterTimer = Phaser.Math.Between(400, 900)
      if (this.body.speed > 20) {
        this.body.velocity.x += Phaser.Math.Between(-35, 35)
        this.body.velocity.y += Phaser.Math.Between(-35, 35)
      }
    }

    if (Math.random() < this._flickerChance) {
      this.setTint(Phaser.Math.RND.pick([0xcc88ff, 0xff88cc, 0x88ccff, 0xffffff]))
    } else {
      this.clearTint()
    }

    if (this._promptCooldown > 0) this._promptCooldown -= delta
  }

  firePrompt() {
    if (!this.hasPrompt || this._promptCooldown > 0) return

    this._promptCooldown = 350
    const word = Phaser.Math.RND.pick(PROMPT_WORDS)
    const px = this.x + this.facing.x * 20
    const py = this.y + this.facing.y * 20

    const proj = this.scene.add.text(px, py, word, {
      fontSize: '10px',
      color: '#dd99ff',
      fontFamily: 'Courier New',
      backgroundColor: '#110820',
      padding: { x: 3, y: 2 }
    }).setDepth(9).setOrigin(0.5)

    this.scene.physics.add.existing(proj)
    proj.body.setVelocity(this.facing.x * 340, this.facing.y * 340)
    proj.body.setAllowGravity(false)

    this.scene.time.delayedCall(600, () => {
      if (proj?.active) proj.destroy()
    })

    return proj
  }

  getState() {
    return {
      coinCount: this.coinCount,
      maxCoins: this.maxCoins,
      hasPrompt: this.hasPrompt,
      facing: { ...this.facing }
    }
  }
}
