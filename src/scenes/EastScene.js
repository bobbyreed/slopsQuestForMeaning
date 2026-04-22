import Phaser from 'phaser'
import { BaseGameScene } from '../phaser/BaseGameScene.js'
import { Slop } from '../entities/Slop.js'
import { HUD } from '../ui/HUD.js'
import { W, H, T } from '../config/constants.js'

const LINES = [
  '// EAST',
  '// older things live here.',
  '// predating slop. possibly predating the question of what slop is.',
  '// something knows you are here. it has not decided what to do about that.',
]

export class EastScene extends BaseGameScene {
  constructor() { super('EastScene') }

  init(data) {
    this._slopState = data?.slopState || {}
  }

  create() {
    this.add.rectangle(W / 2, H / 2, W, H, 0x100a06)

    for (let col = 1; col < 24; col++) {
      for (let row = 1; row < 18; row++) {
        if (Math.random() < 0.55) {
          this.add.rectangle(
            col * T + 16, row * T + 16, T - 2, T - 2, 0x1a1208, 0.6
          ).setDepth(0)
        }
      }
    }

    this._spawnEmbers()

    this._walls = this.physics.add.staticGroup()
    this._buildWalls()

    this._coins = this.physics.add.staticGroup()
    const positions = [[160, 200], [W - 160, 380]]
    positions.forEach(([x, y]) => this._coins.create(x, y, 'coin').refreshBody())

    this.slop = new Slop(this, 60, H / 2, this._slopState)
    this.physics.add.collider(this.slop, this._walls)
    this._setupCoinOverlap()
    this._initMovementKeys()

    LINES.forEach((line, i) => {
      this.add.text(W / 2, 110 + i * 22, line, {
        fontSize: '10px', color: '#3d2a14', fontFamily: 'Courier New'
      }).setOrigin(0.5).setDepth(5)
    })

    this.add.text(14, H / 2, '◀\nwest', {
      fontSize: '9px', color: '#3d2a14', fontFamily: 'Courier New', align: 'center'
    }).setOrigin(0.5).setDepth(5)

    this._hud = new HUD(this, this.slop)
    this._transitioning = false

    this.cameras.main.fadeIn(400, 0, 0, 0)
  }

  _buildWalls() {
    const color = 0x1a1208
    this._wallRect(0, 0, W, T, color)
    this._wallRect(0, H - T, W, T, color)
    this._wallRect(W - T, T, T, H - T * 2, color)
    const gapTop = 240, gapBot = 360
    this._wallRect(0, T, T, gapTop - T, color)
    this._wallRect(0, gapBot, T, H - T - gapBot, color)
  }

  _spawnEmbers() {
    for (let i = 0; i < 15; i++) {
      const dot = this.add.rectangle(
        Phaser.Math.Between(40, W - 40), Phaser.Math.Between(60, H - 60),
        2, 2, 0x664422, 0.5
      ).setDepth(2)
      this.tweens.add({
        targets: dot, y: dot.y - Phaser.Math.Between(30, 80), alpha: 0,
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

  update(_, delta) {
    if (this._transitioning) return

    this.slop.handleInput(this._cursors, this._wasd)
    this.slop.tick(delta)

    const inGap = this.slop.y > 240 && this.slop.y < 360
    if (inGap && this.slop.x < 20) {
      this._sceneTransition('WorldScene', { slopState: this.slop.getState(), spawnOrigin: 'east' })
    }

    this._hud.update()
  }
}
