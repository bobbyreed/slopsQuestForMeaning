import Phaser from 'phaser'
import { Slop } from '../entities/Slop.js'
import { Dialogue } from '../ui/Dialogue.js'

const W = 800
const H = 600

const KEEPER_LINES = [
  "you arrived. i wasn't sure anything would.",
  "i have something for you. i don't know exactly what it does.",
  "it lets you name things. sometimes that helps.",
  "sometimes things that are named stop trying to hurt you.",
  "sometimes they start. it depends on the name.",
  "here. take it.",
]

const KEEPER_FAREWELL = [
  "go. or don't. it's not really up to me.",
]

export class NorthShrineScene extends Phaser.Scene {
  constructor() { super('NorthShrineScene') }

  init(data) {
    this._slopState = data?.slopState || {}
  }

  create() {
    // Dark background
    this.add.rectangle(W / 2, H / 2, W, H, 0x0d0b16)

    // Tile floor
    for (let col = 1; col < 24; col++) {
      for (let row = 1; row < 18; row++) {
        this.add.image(col * 32 + 16, row * 32 + 16, 'tile_shrine').setDepth(0)
      }
    }

    // Walls
    this._walls = this.physics.add.staticGroup()
    this._buildWalls()

    // Ambient particles — slow drifting dots
    this._spawnAmbient()

    // Slop — enters from the south
    this.slop = new Slop(this, W / 2, H - 80, this._slopState)
    this.slop._flickerChance = 0.03
    this.physics.add.collider(this.slop, this._walls)

    // Keeper — center-north
    this._keeper = this.physics.add.staticImage(W / 2, 180, 'keeper').setDepth(10)

    // Keeper glow
    this._keeperGlow = this.add.rectangle(W / 2, 180, 48, 48, 0x334466, 0.4).setDepth(9)
    this.tweens.add({
      targets: this._keeperGlow,
      scaleX: 1.3, scaleY: 1.3, alpha: 0.1,
      yoyo: true, repeat: -1, duration: 1200, ease: 'Sine.easeInOut'
    })

    // Dialogue system
    this._dialogue = new Dialogue(this)
    this._dialogueTriggered = false
    this._abilityGiven = false
    this._transitioning = false

    // Input
    this._cursors = this.input.keyboard.createCursorKeys()
    this._wasd = this.input.keyboard.addKeys({
      left:  Phaser.Input.Keyboard.KeyCodes.A,
      right: Phaser.Input.Keyboard.KeyCodes.D,
      up:    Phaser.Input.Keyboard.KeyCodes.W,
      down:  Phaser.Input.Keyboard.KeyCodes.S,
    })

    // Fade in
    this.cameras.main.fadeIn(400, 0, 0, 0)
  }

  _buildWalls() {
    const T = 32
    // Top wall — solid (no exit)
    this._wallRect(0, 0, W, T)
    // Bottom wall — gap in center (south exit back to world)
    this._wallRect(0, H - T, W / 2 - 36, T)
    this._wallRect(W / 2 + 36, H - T, W / 2 - 36, T)
    // Left / right
    this._wallRect(0, T, T, H - T * 2)
    this._wallRect(W - T, T, T, H - T * 2)
  }

  _wallRect(x, y, w, h) {
    const rect = this.add.rectangle(x + w / 2, y + h / 2, w, h, 0x1e1830)
    this.physics.add.existing(rect, true)
    this._walls.add(rect)
  }

  _spawnAmbient() {
    for (let i = 0; i < 18; i++) {
      const dot = this.add.rectangle(
        Phaser.Math.Between(40, W - 40),
        Phaser.Math.Between(40, H - 40),
        2, 2, 0x6655aa, 0.5
      ).setDepth(1)
      this.tweens.add({
        targets: dot,
        y: dot.y - Phaser.Math.Between(60, 140),
        alpha: 0,
        duration: Phaser.Math.Between(2000, 5000),
        delay: Phaser.Math.Between(0, 3000),
        repeat: -1,
        onRepeat: () => {
          dot.x = Phaser.Math.Between(40, W - 40)
          dot.y = Phaser.Math.Between(H / 2, H - 40)
          dot.setAlpha(0.5)
        }
      })
    }
  }

  _triggerDialogue() {
    this._dialogueTriggered = true
    this._dialogue.show('keeper', KEEPER_LINES, () => this._giveAbility())
  }

  _giveAbility() {
    this._abilityGiven = true
    this.slop.hasPrompt = true

    // Flash effect
    this.cameras.main.flash(500, 100, 60, 180)

    // Glitch Slop hard for a moment
    this.slop._flickerChance = 1
    this.time.delayedCall(600, () => {
      this.slop._flickerChance = 0.03
      // Farewell lines, then return
      this._dialogue.show('keeper', KEEPER_FAREWELL, () => this._returnToWorld())
    })
  }

  _returnToWorld() {
    if (this._transitioning) return
    this._transitioning = true
    this.cameras.main.fade(400, 0, 0, 0, false, (_, t) => {
      if (t === 1) this.scene.start('WorldScene', { slopState: this.slop.getState() })
    })
  }

  update(_, delta) {
    if (this._transitioning) return

    const blocked = this._dialogue.active
    this.slop.handleInput(this._cursors, this._wasd, blocked)
    this.slop.tick(delta)
    this._dialogue.update()

    // Trigger dialogue when Slop gets close to Keeper
    if (!this._dialogueTriggered) {
      const dist = Phaser.Math.Distance.Between(this.slop.x, this.slop.y, this._keeper.x, this._keeper.y)
      if (dist < 100) this._triggerDialogue()
    }

    // South door exit (only before dialogue — emergency exit)
    if (!this._dialogueTriggered && this.slop.y > H - 30) {
      this._returnToWorld()
    }
  }
}
