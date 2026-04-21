import Phaser from 'phaser'
import { Slop } from '../entities/Slop.js'
import { Dialogue } from '../ui/Dialogue.js'

const W = 800
const H = 600

const RENDER_LINES = [
  "you. the one from the gate.",
  "you typed 'exist.' in time. correctly.",
  "i wasn't expecting that. most of your kind just wander until something removes them.",
  "i find generated things difficult to look at. you understand why. the artifacts. the wrongness.",
  "the stolen look of things that were made without asking.",
  "and yet. you came through.",
  "that's not nothing. i hate that it isn't nothing.",
  "there are coins in this room. i'm not giving them to you. they were already here.",
  "take them. i won't be watching.",
]

const DISMISS_LINES = [
  "go.",
  "i don't need you to understand me. i barely understand you.",
  "and that's the problem, isn't it.",
]

export class FirstNPCScene extends Phaser.Scene {
  constructor() { super('FirstNPCScene') }

  init(data) {
    this._slopState = data?.slopState || {}
  }

  create() {
    // Clinical pale room — intentionally different from dungeon's dark
    this.add.rectangle(W / 2, H / 2, W, H, 0xd8dce8)

    // Floor grid — clean, deliberate lines
    const lineColor = 0xc0c4d4
    for (let x = 0; x <= W; x += 64) {
      this.add.rectangle(x, H / 2, 1, H, lineColor, 0.35).setDepth(0)
    }
    for (let y = 0; y <= H; y += 64) {
      this.add.rectangle(W / 2, y, W, 1, lineColor, 0.35).setDepth(0)
    }

    this._walls = this.physics.add.staticGroup()
    this._buildWalls()

    // Slop — enters from south
    this.slop = new Slop(this, W / 2, H - 80, this._slopState)
    if (this._slopState.hasEyes) this.slop.setTexture('slop_eyes')
    this.physics.add.collider(this.slop, this._walls)

    // The Render — clean geometric NPC, center-north
    this._render = this.physics.add.staticImage(W / 2, 200, 'the_render').setDepth(10).setScale(2)

    // Subtle pulse — not glitchy, just slow
    this.tweens.add({
      targets: this._render,
      alpha: 0.85, duration: 2000, yoyo: true, repeat: -1, ease: 'Sine.easeInOut'
    })

    // NPC name label
    this.add.text(W / 2, 242, 'THE RENDER', {
      fontSize: '9px', color: '#8899bb', fontFamily: 'Courier New', letterSpacing: 2
    }).setOrigin(0.5).setDepth(11)

    this._dialogue = new Dialogue(this)
    this._dialogueTriggered = false
    this._coinGiven = false
    this._transitioning = false

    this._cursors = this.input.keyboard.createCursorKeys()
    this._wasd = this.input.keyboard.addKeys({
      left:  Phaser.Input.Keyboard.KeyCodes.A,
      right: Phaser.Input.Keyboard.KeyCodes.D,
      up:    Phaser.Input.Keyboard.KeyCodes.W,
      down:  Phaser.Input.Keyboard.KeyCodes.S,
    })

    this.cameras.main.fadeIn(400, 216, 220, 232)
  }

  _buildWalls() {
    const T = 32
    // Solid top — no exit north from here
    this._wallRect(0, 0, W, T)
    // Bottom with center gap (south exit back to dungeon)
    this._wallRect(0, H - T, W / 2 - 36, T)
    this._wallRect(W / 2 + 36, H - T, W / 2 - 36, T)
    this._wallRect(0, T, T, H - T * 2)
    this._wallRect(W - T, T, T, H - T * 2)
  }

  _wallRect(x, y, w, h) {
    const rect = this.add.rectangle(x + w / 2, y + h / 2, w, h, 0xb8bdd0)
    this.physics.add.existing(rect, true)
    this._walls.add(rect)
  }

  _triggerDialogue() {
    this._dialogueTriggered = true
    this._dialogue.show('the render', RENDER_LINES, () => this._giveCoins())
  }

  _giveCoins() {
    if (this._coinGiven) return
    this._coinGiven = true

    // Grant coins up to maxCoins
    const grant = Math.min(5, this.slop.maxCoins - this.slop.coinCount)
    this.slop.coinCount += Math.max(0, grant)
    this.slop.dungeonCleared = true

    // Brief flash on The Render — cold, not warm
    this.cameras.main.flash(300, 180, 200, 230, true)

    this._dialogue.show('the render', DISMISS_LINES, () => this._returnToDungeon())
  }

  _returnToDungeon() {
    if (this._transitioning) return
    this._transitioning = true
    this.cameras.main.fade(400, 0, 0, 0, false, (_, t) => {
      if (t === 1) {
        this.scene.start('WorldScene', { slopState: this.slop.getState(), spawnOrigin: 'dungeon' })
      }
    })
  }

  update(_, delta) {
    if (this._transitioning) return

    const blocked = this._dialogue.active
    this.slop.handleInput(this._cursors, this._wasd, blocked)
    this.slop.tick(delta)
    this._dialogue.update()

    if (!this._dialogueTriggered) {
      const dist = Phaser.Math.Distance.Between(this.slop.x, this.slop.y, this._render.x, this._render.y)
      if (dist < 120) this._triggerDialogue()
    }
  }
}
