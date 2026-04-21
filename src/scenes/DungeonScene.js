import Phaser from 'phaser'
import { Slop } from '../entities/Slop.js'
import { Enemy } from '../entities/Enemy.js'
import { HUD } from '../ui/HUD.js'

const W = 800
const H = 600
const T = 32

// Target word the minigame must unlock
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

export class DungeonScene extends Phaser.Scene {
  constructor() { super('DungeonScene') }

  init(data) {
    this._slopState = data?.slopState || {}
    this._unlocked = data?.unlocked || this._slopState.dungeonCleared || false
  }

  create() {
    // Dark dungeon background
    this.add.rectangle(W / 2, H / 2, W, H, 0x0a0810)

    // Floor tiles
    for (let col = 1; col < 24; col++) {
      for (let row = 1; row < 18; row++) {
        this.add.image(col * T + 16, row * T + 16, 'tile_shrine').setDepth(0)
      }
    }

    this._walls = this.physics.add.staticGroup()
    this._buildWalls()

    this._spawnAmbient()

    // Slop — enters from south
    this.slop = new Slop(this, W / 2, H - 80, this._slopState)
    this.slop._flickerChance = 0.03
    if (this._slopState.hasEyes) this.slop.setTexture('slop_eyes')
    this.physics.add.collider(this.slop, this._walls)

    // Enemies — skip if already cleared
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
      const angle = Math.atan2(slop.y - enemy.y, slop.x - enemy.x)
      slop.body.setVelocity(Math.cos(angle) * 280, Math.sin(angle) * 280)
      this.cameras.main.shake(100, 0.003)
    })

    // Locked gate at north — blocks until minigame solved
    this._gateBlocked = !this._unlocked
    this._gate = this._buildGate()

    // Minigame trigger — a glowing circle near the gate
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

    // HUD
    this._hud = new HUD(this, this.slop)

    // Input
    this._cursors = this.input.keyboard.createCursorKeys()
    this._wasd = this.input.keyboard.addKeys({
      left:  Phaser.Input.Keyboard.KeyCodes.A,
      right: Phaser.Input.Keyboard.KeyCodes.D,
      up:    Phaser.Input.Keyboard.KeyCodes.W,
      down:  Phaser.Input.Keyboard.KeyCodes.S,
    })
    this._eKey      = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E)
    this._spaceKey  = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE)

    this._prompts = []
    this._slopHitTimer = 0
    this._dropPending = false
    this._transitioning = false

    this.cameras.main.fadeIn(400, 0, 0, 0)
  }

  _buildWalls() {
    // Outer walls with south gap (exit back to world) and north gap (locked gate)
    const southGapLeft  = W / 2 - 36
    const southGapRight = W / 2 + 36

    this._wallRect(0, 0, W, T)                          // top — solid (gate handles north)
    this._wallRect(0, H - T, southGapLeft, T)           // bottom left
    this._wallRect(southGapRight, H - T, W - southGapRight, T) // bottom right
    this._wallRect(0, T, T, H - T * 2)                  // left
    this._wallRect(W - T, T, T, H - T * 2)              // right

    OBSTACLES.forEach(([x, y, w, h]) => this._wallRect(x, y, w, h))
  }

  _buildGate() {
    const gateY = T
    const gateW = 72

    // Visual gate bars
    const gate = this.add.container(W / 2, gateY + 16).setDepth(15)
    for (let i = -2; i <= 2; i++) {
      const bar = this.add.rectangle(i * 12, 0, 4, 28, this._gateBlocked ? 0x884422 : 0x228844)
      gate.add(bar)
      if (!this._gateBlocked) this._animateGateOpen(bar)
    }

    // Gate label
    const label = this.add.text(W / 2, gateY + 38, this._gateBlocked ? `speak: "${UNLOCK_WORD}"` : '[ open ]', {
      fontSize: '9px', color: this._gateBlocked ? '#886644' : '#448866', fontFamily: 'Courier New'
    }).setOrigin(0.5).setDepth(16)

    // Physics blocker for gate
    if (this._gateBlocked) {
      this._gateBlocker = this.add.rectangle(W / 2, gateY + 8, gateW, T, 0x000000, 0)
      this.physics.add.existing(this._gateBlocker, true)
      this._walls.add(this._gateBlocker)
    }

    this._gateContainer = gate
    this._gateLabel = label
    return gate
  }

  _wallRect(x, y, w, h) {
    const rect = this.add.rectangle(x + w / 2, y + h / 2, w, h, 0x1e1830)
    this.physics.add.existing(rect, true)
    this._walls.add(rect)
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
    this.cameras.main.fade(350, 0, 0, 0, false, (_, t) => {
      if (t === 1) {
        this.scene.start('TypingMinigameScene', {
          slopState: this.slop.getState(),
          targetWord: UNLOCK_WORD,
          returnScene: 'DungeonScene'
        })
      }
    })
  }

  _enterFirstNPC() {
    if (this._transitioning) return
    this._transitioning = true
    this.cameras.main.fade(350, 0, 0, 0, false, (_, t) => {
      if (t === 1) this.scene.start('FirstNPCScene', { slopState: this.slop.getState() })
    })
  }

  _exitDungeon() {
    if (this._transitioning) return
    this._transitioning = true
    this.cameras.main.fade(350, 0, 0, 0, false, (_, t) => {
      if (t === 1) this.scene.start('WorldScene', { slopState: this.slop.getState(), spawnOrigin: 'dungeon' })
    })
  }

  update(_, delta) {
    if (this._transitioning) return

    this.slop.handleInput(this._cursors, this._wasd)
    this.slop.tick(delta)

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

    // Prompt-enemy collision
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

    this._enemies.getChildren().forEach(e => { if (e.active) e.tick(delta, this.slop.x, this.slop.y) })

    // Minigame trigger proximity + E key
    const nearTrigger = this._gateBlocked &&
      Phaser.Math.Distance.Between(this.slop.x, this.slop.y, W / 2, 110) < 60
    this._triggerZone.setVisible(this._gateBlocked)
    this._triggerLabel.setVisible(this._gateBlocked && nearTrigger)
    if (nearTrigger && Phaser.Input.Keyboard.JustDown(this._eKey)) {
      this._enterMinigame()
    }

    // North exit when gate open
    if (!this._gateBlocked && this.slop.y < 40) {
      this._enterFirstNPC()
    }

    // South exit
    if (this.slop.y > H - 20) this._exitDungeon()

    this._hud.update()
  }
}
