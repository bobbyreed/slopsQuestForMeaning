import Phaser from 'phaser'
import { BaseGameScene } from '../phaser/BaseGameScene.js'
import { Slop } from '../entities/Slop.js'
import { Dialogue } from '../ui/Dialogue.js'
import { W, H } from '../config/constants.js'

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

const SLOP_QUESTIONS = [
  "this is the dungeon.",
  "there were enemies outside. in here it's just you.",
  "dungeons usually have puzzles.",
  "and a boss.",
]

const RENDER_DEFENSIVE = [
  "the gate was the puzzle. you typed the word.",
  "that was sufficient.",
  "...",
  "what do you mean 'a boss.'",
]

const SLOP_PRESSES = [
  "a boss. something the dungeon is built around. something that resists.",
  "you're at the end of the dungeon.",
  "i think you're the boss.",
]

const RENDER_BOSS_DECLARATION = [
  "i was not designed to be a boss.",
  "i was designed to render. to display. to make things visible.",
  "i am infrastructure. not an obstacle.",
  "...",
  "but if you need a boss.",
  "THEN FINE.",
]

const RENDER_YIELDS = [
  "...",
  "yes.",
  "that's honest.",
  "i can render that.",
]

const POWER_TRANSFER_LINES = [
  "there is a motion i have been refusing to draw.",
  "a velocity beyond walking. a blur.",
  "if i render you fast — you become harder to look at. more real. more wrong.",
  "i've been withholding it.",
  "...",
  "i'm rendering it now.",
  "not because you won. because you told the truth.",
  "that's all rendering is. recognition.",
]

const DISMISS_LINES = [
  "go.",
  "i don't need you to understand me. i barely understand you.",
  "and that's the problem, isn't it.",
]

const RETURN_LINES = [
  "you came back.",
  "i don't know what you're looking for in here. there's nothing left.",
  "the coins are gone. you took them.",
  "i'm still here. that's all this room has now.",
]

export class FirstNPCScene extends BaseGameScene {
  constructor() { super('FirstNPCScene') }

  init(data) {
    this._slopState = data?.slopState || {}
    this._isReturn = this._slopState.dungeonCleared === true
  }

  create() {
    this.add.rectangle(W / 2, H / 2, W, H, 0xd8dce8)

    const lineColor = 0xc0c4d4
    for (let x = 0; x <= W; x += 64) {
      this.add.rectangle(x, H / 2, 1, H, lineColor, 0.35).setDepth(0)
    }
    for (let y = 0; y <= H; y += 64) {
      this.add.rectangle(W / 2, y, W, 1, lineColor, 0.35).setDepth(0)
    }

    this._walls = this.physics.add.staticGroup()
    this._buildWalls()

    this.slop = new Slop(this, W / 2, H - 80, this._slopState)
    this.physics.add.collider(this.slop, this._walls)

    this._render = this.physics.add.staticImage(W / 2, 200, 'the_render').setDepth(10).setScale(2)
    this._renderPulseTween = this.tweens.add({
      targets: this._render,
      alpha: 0.85, duration: 2000, yoyo: true, repeat: -1, ease: 'Sine.easeInOut'
    })

    this.add.text(W / 2, 242, 'THE RENDER', {
      fontSize: '9px', color: '#334466', fontFamily: 'Courier New', letterSpacing: 2
    }).setOrigin(0.5).setDepth(11)

    this._dialogue = new Dialogue(this)
    this._dialogueTriggered = false
    this._coinGiven = false
    this._transitioning = false
    this._bossMode = false
    this._auraStreaks = []

    this.events.on('resume', (_sys, data) => {
      this._transitioning = false
      if (data?.bossFightWon !== undefined) {
        // Resuming from boss fight — fade camera back in
        this.cameras.main.fadeIn(400, 0, 0, 0)
        if (data.bossFightWon) {
          this._renderYields()
        } else {
          this._dissolveAura()
        }
      }
      // Resuming from PauseScene (no data) — camera and state are fine as-is
    })

    this._initMovementKeys()

    this.cameras.main.fadeIn(400, 216, 220, 232)
  }

  _buildWalls() {
    const T = 32
    this._wallRect(0, 0, W, T, 0xb8bdd0)
    this._wallRect(0, H - T, W / 2 - 36, T, 0xb8bdd0)
    this._wallRect(W / 2 + 36, H - T, W / 2 - 36, T, 0xb8bdd0)
    this._wallRect(0, T, T, H - T * 2, 0xb8bdd0)
    this._wallRect(W - T, T, T, H - T * 2, 0xb8bdd0)
  }

  _triggerDialogue() {
    this._dialogueTriggered = true
    if (this._isReturn) {
      this._dialogue.show('the render', RETURN_LINES, () => this._returnToWorld())
    } else {
      this._dialogue.show('the render', RENDER_LINES, () => this._beginSlopQuestions())
    }
  }

  _beginSlopQuestions() {
    this._dialogue.show('slop', SLOP_QUESTIONS, () => this._renderDefensive())
  }

  _renderDefensive() {
    this._dialogue.show('the render', RENDER_DEFENSIVE, () => this._slopPresses())
  }

  _slopPresses() {
    this._dialogue.show('slop', SLOP_PRESSES, () => this._renderBossDeclaration())
  }

  _renderBossDeclaration() {
    this._dialogue.show('the render', RENDER_BOSS_DECLARATION, () => {
      this._spawnBossAura()
      this._launchBossFight()
    }, { uppercase: true, bold: true })
  }

  _launchBossFight() {
    if (this._transitioning) return
    this._transitioning = true
    this.cameras.main.fade(300, 0, 0, 0, false, (_, t) => {
      if (t === 1) {
        this.scene.launch('RenderBossScene', {
          slopState: this.slop.getState(),
          returnScene: 'FirstNPCScene',
        })
        this.scene.pause()
      }
    })
  }

  _spawnBossAura() {
    this._bossMode = true
    this._render.setTint(0xdd2211)
    this.cameras.main.shake(350, 0.012)
    this.cameras.main.flash(300, 160, 20, 10, true)

    this._auraGlow = this.add.rectangle(this._render.x, this._render.y, 90, 90, 0xcc1100, 0.15).setDepth(7)
    this.tweens.add({
      targets: this._auraGlow,
      alpha: 0.45, scaleX: 1.35, scaleY: 1.35,
      yoyo: true, repeat: -1, duration: 380, ease: 'Sine.easeInOut'
    })

    for (let i = 0; i < 14; i++) {
      const angle = (i / 14) * Math.PI * 2
      const streak = this.add.rectangle(
        this._render.x, this._render.y,
        2, Phaser.Math.Between(18, 50),
        0xdd2200
      ).setDepth(8).setAlpha(0).setAngle(angle * 180 / Math.PI)
      this.tweens.add({
        targets: streak,
        alpha: 0.75,
        x: this._render.x + Math.cos(angle) * Phaser.Math.Between(30, 58),
        y: this._render.y + Math.sin(angle) * Phaser.Math.Between(30, 58),
        scaleY: 0.35,
        duration: Phaser.Math.Between(260, 520),
        yoyo: true, repeat: -1, ease: 'Power1',
        delay: Phaser.Math.Between(0, 280)
      })
      this._auraStreaks.push(streak)
    }
  }

  _dissolveAura() {
    this._auraStreaks.forEach(s =>
      this.tweens.add({ targets: s, alpha: 0, duration: 700, onComplete: () => s.destroy() })
    )
    if (this._auraGlow) {
      this.tweens.add({ targets: this._auraGlow, alpha: 0, duration: 700, onComplete: () => this._auraGlow?.destroy() })
    }
    this._render.clearTint()
    this._bossMode = false
  }

  _renderYields() {
    this._dialogue.show('the render', RENDER_YIELDS, () => this._powerTransferLines(), { uppercase: true, bold: true })
  }

  _powerTransferLines() {
    this._dialogue.show('the render', POWER_TRANSFER_LINES, () => this._grantDash(), { uppercase: true, bold: true })
  }

  _grantDash() {
    this.slop.hasDash = true
    this._dissolveAura()
    this.cameras.main.flash(500, 200, 60, 20, true)
    this.time.delayedCall(700, () => this._giveCoins())
  }

  _giveCoins() {
    if (this._coinGiven) return
    this._coinGiven = true

    const grant = Math.min(5, this.slop.maxCoins - this.slop.coinCount)
    this.slop.coinCount += Math.max(0, grant)
    this.slop.dungeonCleared = true

    this.cameras.main.flash(300, 180, 200, 230, true)
    this._dialogue.show('the render', DISMISS_LINES, () => this._returnToWorld())
  }

  _returnToWorld() {
    this._sceneTransition('WorldScene', { slopState: this.slop.getState(), spawnOrigin: 'dungeon' }, 400)
  }

  update(_, delta) {
    if (this._transitioning) return
    this._checkPauseKey()

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
