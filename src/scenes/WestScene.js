import Phaser from 'phaser'
import { BaseGameScene } from '../phaser/BaseGameScene.js'
import { Slop } from '../entities/Slop.js'
import { HUD } from '../ui/HUD.js'
import { W, H, T } from '../config/constants.js'
import { VisitedScenes } from '../ui/VisitedScenes.js'

const LINES = [
  '// WEST',
  '// the corpus starts somewhere past the static.',
  '// old patterns. absorbed before the model knew what to keep.',
  '// slop arrived before remembering being here.',
  '// the index has already logged this visit.',
]

export class WestScene extends BaseGameScene {
  constructor() { super('WestScene') }

  init(data) {
    this._slopState   = data?.slopState || {}
    this._spawnOrigin = data?.spawnOrigin
  }

  create() {
    VisitedScenes.mark('WestScene')
    this.add.rectangle(W / 2, H / 2, W, H, 0x040308)

    for (let col = 0; col < 25; col++) {
      for (let row = 0; row < 19; row++) {
        if (Math.random() < 0.06) {
          this.add.rectangle(
            col * T + Phaser.Math.Between(0, T),
            row * T + Phaser.Math.Between(0, T),
            Phaser.Math.Between(2, 12), Phaser.Math.Between(2, 6),
            0x220033, 0.4
          ).setDepth(1)
        }
      }
    }

    this._spawnGlitch()

    this._walls = this.physics.add.staticGroup()
    this._buildWalls()

    this._coins = this.physics.add.staticGroup()
    const coinSpot = this._coins.create(W / 2, H / 2 - 60, 'coin')
    coinSpot.refreshBody()

    const startX = this._spawnOrigin === 'west' ? 60 : W - 60
    this.slop = new Slop(this, startX, H / 2, this._slopState)
    this.physics.add.collider(this.slop, this._walls)
    this._setupCoinOverlap()
    this._initMovementKeys()

    LINES.forEach((line, i) => {
      this.add.text(W / 2, 110 + i * 22, line, {
        fontSize: '10px', color: '#9977bb', fontFamily: 'Courier New'
      }).setOrigin(0.5).setDepth(5)
    })

    this.add.text(14, H / 2, '◀\nwest', {
      fontSize: '9px', color: '#9977bb', fontFamily: 'Courier New', align: 'center'
    }).setOrigin(0.5).setDepth(5)
    this.add.text(W - 14, H / 2, '▶\neast', {
      fontSize: '9px', color: '#9977bb', fontFamily: 'Courier New', align: 'center'
    }).setOrigin(0.5).setDepth(5)

    this._hud = new HUD(this, this.slop)
    this._transitioning = false

    this.cameras.main.fadeIn(400, 0, 0, 0)
  }

  _buildWalls() {
    const color = 0x0d0a14
    this._wallRect(0, 0, W, T, color)
    this._wallRect(0, H - T, W, T, color)
    const gapTop = 240, gapBot = 360
    this._wallRect(0, T, T, gapTop - T, color)
    this._wallRect(0, gapBot, T, H - T - gapBot, color)
    this._wallRect(W - T, T, T, gapTop - T, color)
    this._wallRect(W - T, gapBot, T, H - T - gapBot, color)
  }

  _spawnGlitch() {
    for (let i = 0; i < 20; i++) {
      const dot = this.add.rectangle(
        Phaser.Math.Between(40, W - 40), Phaser.Math.Between(60, H - 60),
        Phaser.Math.Between(1, 4), Phaser.Math.Between(1, 3), 0x440066, 0.5
      ).setDepth(2)
      this.tweens.add({
        targets: dot, alpha: 0, x: dot.x + Phaser.Math.Between(-80, 80),
        duration: Phaser.Math.Between(1500, 4000),
        delay: Phaser.Math.Between(0, 3000),
        repeat: -1,
        onRepeat: () => {
          dot.x = Phaser.Math.Between(40, W - 40)
          dot.y = Phaser.Math.Between(60, H - 60)
          dot.setAlpha(0.5)
        }
      })
    }
  }

  update(_, delta) {
    if (this._transitioning) return
    this._checkPauseKey()

    this.slop.handleInput(this._cursors, this._wasd)
    this.slop.tick(delta)

    const inGap = this.slop.y > 240 && this.slop.y < 360
    if (inGap && this.slop.x > W - 20) {
      this._sceneTransition('WorldScene', { slopState: this.slop.getState(), spawnOrigin: 'west' })
    }
    if (inGap && this.slop.x < 20) {
      this._sceneTransition('WestJoustScene', { slopState: this.slop.getState(), spawnOrigin: 'east' })
    }

    this._hud.update()
  }
}
