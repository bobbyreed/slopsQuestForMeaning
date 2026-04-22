import Phaser from 'phaser'
import { BaseGameScene } from '../phaser/BaseGameScene.js'
import { Slop } from '../entities/Slop.js'
import { Enemy } from '../entities/Enemy.js'
import { HUD } from '../ui/HUD.js'
import { Sfx } from '../ui/Sfx.js'
import { W, H, T } from '../config/constants.js'

const UNLOCK_WORD = 'exist'

const OBSTACLES = [
  [64,  96,  T, T*2],
  [704, 96,  T, T*2],
  [192, 224, T*2, T],
  [576, 224, T*2, T],
  [96,  400, T*2, T],
  [640, 400, T*2, T],
  [336, 160, T*3, T],
]

export class DungeonScene extends BaseGameScene {
  constructor() { super('DungeonScene') }

  init(data) {
    this._slopState = data?.slopState || {}
    this._unlocked = data?.unlocked || this._slopState.dungeonCleared || false
  }

  create() {
    this.add.rectangle(W / 2, H / 2, W, H, 0x0a0810)

    for (let col = 1; col < 24; col++) {
      for (let row = 1; row < 18; row++) {
        this.add.image(col * T + 16, row * T + 16, 'tile_shrine').setDepth(0)
      }
    }

    this._walls = this.physics.add.staticGroup()
    this._buildWalls()

    this._spawnAmbient()

    this._coins = this.physics.add.staticGroup()

    this.slop = new Slop(this, W / 2, H - 80, this._slopState)
    this.slop._flickerChance = 0.03
    this.physics.add.collider(this.slop, this._walls)
    this.physics.add.overlap(this.slop, this._coins, (slop, coin) => {
      if (!coin.active || coin.getData('justDropped')) return
      coin.destroy()
      slop.coinCount = Math.min(slop.coinCount + 1, slop.maxCoins)
      Sfx.coin(this)
    })

    this._enemies = this.physics.add.group()
    if (!this._slopState.dungeonCleared) {
      const spawns = [[180, 180], [620, 180], [400, 280], [200, 380], [600, 380]]
      spawns.forEach(([x, y]) => this._enemies.add(new Enemy(this, x, y)))
    }
    this.physics.add.collider(this._enemies, this._walls)
    this.physics.add.collider(this._enemies, this._enemies)
    this.physics.add.overlap(this.slop, this._enemies, (slop, enemy) => {
      if (this._slopHitTimer > 0 || enemy._dying) return
      this._slopHitTimer = 1200
      slop.coinCount = Math.max(0, slop.coinCount - 1)
      Sfx.slopHit(this)
      const angle = Math.atan2(slop.y - enemy.y, slop.x - enemy.x)
      slop.body.setVelocity(Math.cos(angle) * 280, Math.sin(angle) * 280)
      this.cameras.main.shake(100, 0.003)
    })

    this._gateBlocked = !this._unlocked
    this._gate = this._buildGate()

    this._triggerZone = this.add.circle(W / 2, 110, 18, 0xcc88ff, 0.25).setDepth(5)
    this._triggerLabel = this.add.text(W / 2, 84, '▲ interact [E]', {
      fontSize: '9px', color: '#887799', fontFamily: 'Courier New'
    }).setOrigin(0.5).setDepth(6)
    this.tweens.add({
      targets: [this._triggerZone, this._triggerLabel],
      alpha: 0.3, yoyo: true, repeat: -1, duration: 900
    })

    if (this._unlocked) {
      this._openGate()
    }

    this._hud = new HUD(this, this.slop)

    this._cursors = this.input.keyboard.createCursorKeys()
    this._wasd = this.input.keyboard.addKeys({
      left:  Phaser.Input.Keyboard.KeyCodes.A,
      right: Phaser.Input.Keyboard.KeyCodes.D,
      up:    Phaser.Input.Keyboard.KeyCodes.W,
      down:  Phaser.Input.Keyboard.KeyCodes.S,
    })
    this._eKey     = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E)
    this._spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE)
    this._shiftKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SHIFT)

    this.events.on('resume', (_sys, data) => {
      if (data?.unlocked) this._openGate()
      this._transitioning = false
      this.cameras.main.fadeIn(300, 0, 0, 0)
    })

    this._prompts = []
    this._slopHitTimer = 0
    this._dropPending = false
    this._transitioning = false

    this.cameras.main.fadeIn(400, 0, 0, 0)
  }

  _buildWalls() {
    const southGapLeft  = W / 2 - 36
    const southGapRight = W / 2 + 36

    const northGapHalf = 36
    this._wallRect(0, 0, W / 2 - northGapHalf, T)
    this._wallRect(W / 2 + northGapHalf, 0, W / 2 - northGapHalf, T)
    this._wallRect(0, H - T, southGapLeft, T)
    this._wallRect(southGapRight, H - T, W - southGapRight, T)
    this._wallRect(0, T, T, H - T * 2)
    this._wallRect(W - T, T, T, H - T * 2)

    OBSTACLES.forEach(([x, y, w, h]) => this._wallRect(x, y, w, h))
  }

  _buildGate() {
    const gateY = T
    const gateW = 72

    const gate = this.add.container(W / 2, gateY + 16).setDepth(15)
    for (let i = -2; i <= 2; i++) {
      const bar = this.add.rectangle(i * 12, 0, 4, 28, this._gateBlocked ? 0x884422 : 0x228844)
      gate.add(bar)
      if (!this._gateBlocked) this._animateGateOpen(bar)
    }

    const label = this.add.text(W / 2, gateY + 38, this._gateBlocked ? `speak: "${UNLOCK_WORD}"` : '[ open ]', {
      fontSize: '9px', color: this._gateBlocked ? '#886644' : '#448866', fontFamily: 'Courier New'
    }).setOrigin(0.5).setDepth(16)

    if (this._gateBlocked) {
      this._gateBlocker = this.add.rectangle(W / 2, T / 2, gateW, T, 0x000000, 0)
      this.physics.add.existing(this._gateBlocker, true)
      this._walls.add(this._gateBlocker)
    }

    this._gateContainer = gate
    this._gateLabel = label
    return gate
  }

  _openGate() {
    this._gateBlocked = false
    this._gateLabel?.setText('[ open ]').setColor('#448866')
    this._gateContainer?.getAll().forEach(bar => {
      if (bar.type === 'Rectangle') {
        bar.setFillStyle(0x228844)
        this._animateGateOpen(bar)
      }
    })
    if (this._gateBlocker) {
      this._walls.remove(this._gateBlocker, true, true)
      this._gateBlocker = null
    }
  }

  _animateGateOpen(bar) {
    this.tweens.add({
      targets: bar, scaleY: 0, alpha: 0, duration: 600,
      ease: 'Quad.easeIn', delay: Phaser.Math.Between(0, 200)
    })
  }

  _spawnAmbient() {
    for (let i = 0; i < 12; i++) {
      const dot = this.add.rectangle(
        Phaser.Math.Between(40, W - 40), Phaser.Math.Between(40, H - 40),
        2, 2, 0x443366, 0.4
      ).setDepth(1)
      this.tweens.add({
        targets: dot, y: dot.y - Phaser.Math.Between(50, 120), alpha: 0,
        duration: Phaser.Math.Between(2500, 5500), delay: Phaser.Math.Between(0, 3000),
        repeat: -1,
        onRepeat: () => {
          dot.x = Phaser.Math.Between(40, W - 40)
          dot.y = Phaser.Math.Between(H / 2, H - 40)
          dot.setAlpha(0.4)
        }
      })
    }
  }

  _enterMinigame() {
    if (this._transitioning) return
    this._transitioning = true
    this.cameras.main.fade(250, 0, 0, 0, false, (_, t) => {
      if (t === 1) {
        this.scene.launch('TypingMinigameScene', {
          slopState: this.slop.getState(),
          targetWord: UNLOCK_WORD,
          returnScene: 'DungeonScene',
        })
        this.scene.pause()
      }
    })
  }

  _enterFirstNPC() {
    this._sceneTransition('FirstNPCScene', { slopState: this.slop.getState() })
  }

  _exitDungeon() {
    this._sceneTransition('WorldScene', { slopState: this.slop.getState(), spawnOrigin: 'dungeon' })
  }

  update(_, delta) {
    if (this._transitioning) return

    this.slop.handleInput(this._cursors, this._wasd)
    this.slop.tick(delta)
    this._tickHitInvulnerability(delta)

    if (Phaser.Input.Keyboard.JustDown(this._spaceKey)) {
      const proj = this.slop.firePrompt()
      if (proj) { this._prompts.push(proj); Sfx.promptFire(this) }
    }
    if (Phaser.Input.Keyboard.JustDown(this._shiftKey)) this.slop.dash()

    this._checkPromptCollisions()

    this._enemies.getChildren().forEach(e => { if (e.active) e.tick(delta, this.slop.x, this.slop.y) })

    const nearTrigger = this._gateBlocked &&
      Phaser.Math.Distance.Between(this.slop.x, this.slop.y, W / 2, 110) < 60
    this._triggerZone.setVisible(this._gateBlocked)
    this._triggerLabel.setVisible(this._gateBlocked && nearTrigger)
    if (nearTrigger && Phaser.Input.Keyboard.JustDown(this._eKey)) {
      this._enterMinigame()
    }

    if (!this._gateBlocked && this.slop.y < 40) {
      this._enterFirstNPC()
    }

    if (this.slop.y > H - 20) this._exitDungeon()

    this._hud.update()
  }
}
