import Phaser from 'phaser'
import { BaseGameScene } from '../phaser/BaseGameScene.js'
import { Slop } from '../entities/Slop.js'
import { Enemy } from '../entities/Enemy.js'
import { HUD } from '../ui/HUD.js'
import { Sfx } from '../ui/Sfx.js'
import { W, H } from '../config/constants.js'
import { SaveState } from '../ui/SaveState.js'

const T = 32
const WALL_COLOR = 0xb8a898
const DOOR_X = W / 2
const DOOR_WIDTH = 72

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

export class WorldScene extends BaseGameScene {
  constructor() { super('WorldScene') }

  init(data) {
    this._returnState = data?.slopState ?? SaveState.load()
    this._spawnOrigin = data?.spawnOrigin || null
  }

  create() {
    const bg = this._returnState?.dungeonCleared ? 0xd8dce8
      : this._returnState?.hasEyes ? 0xdfd8e2
      : 0xe8dfc8
    this.add.rectangle(W / 2, H / 2, W, H, bg)

    this._hasEyes = this._returnState?.hasEyes ?? false
    this._walls = this.physics.add.staticGroup()
    this._buildWalls(this._hasEyes)

    this._coins = this.physics.add.staticGroup()
    COIN_POSITIONS.forEach(([x, y]) => {
      this._coins.create(x, y, 'coin').refreshBody()
    })

    const DUNGEON_SPAWN_X = 200
    let startX, startY
    if (this._spawnOrigin === 'shrine') {
      startX = DOOR_X; startY = 80
    } else if (this._spawnOrigin === 'dungeon') {
      startX = DUNGEON_SPAWN_X; startY = H - 80
    } else if (this._spawnOrigin === 'east') {
      startX = W - 60; startY = H / 2
    } else if (this._spawnOrigin === 'west') {
      startX = 60; startY = H / 2
    } else {
      startX = W / 2; startY = H - 100
    }
    this.slop = new Slop(this, startX, startY, this._returnState || {})
    if (this._returnState?.hasEyes) this.slop.applyEyes()

    if (this._spawnOrigin === 'dungeon' && this._returnState?.dungeonCleared) {
      this.time.delayedCall(700, () => this._showOneTimeHint("the dungeon is behind you. that counts."))
    }
    if (this._spawnOrigin === 'shrine' && this._returnState?.hasPrompt && !this._returnState?.dungeonCleared) {
      this.time.delayedCall(800, () => this._showOneTimeHint("press SPACE to fire a word"))
    }

    this._hud = new HUD(this, this.slop)

    this.physics.add.collider(this.slop, this._walls)
    this.physics.add.overlap(this.slop, this._coins, this._pickupCoin, null, this)

    this.add.text(DOOR_X, 22, '▲ north', {
      fontSize: '10px', color: '#998877', fontFamily: 'Courier New'
    }).setOrigin(0.5).setDepth(5)

    const DUNGEON_X = 200
    this.add.rectangle(DUNGEON_X, H - 32, 72, 32, 0x0a0810).setDepth(4)
    this.add.text(DUNGEON_X, H - 46, '▼ dungeon', {
      fontSize: '9px', color: '#665577', fontFamily: 'Courier New'
    }).setOrigin(0.5).setDepth(5)
    this._dungeonEntrance = this.add.zone(DUNGEON_X, H - 16, 72, 32)
    this.physics.world.enable(this._dungeonEntrance)
    this.physics.add.overlap(this.slop, this._dungeonEntrance, () => this._enterDungeon())

    this._cursors = this.input.keyboard.createCursorKeys()
    this._wasd = this.input.keyboard.addKeys({
      left:  Phaser.Input.Keyboard.KeyCodes.A,
      right: Phaser.Input.Keyboard.KeyCodes.D,
      up:    Phaser.Input.Keyboard.KeyCodes.W,
      down:  Phaser.Input.Keyboard.KeyCodes.S,
    })
    this._spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE)

    this._enemies = this.physics.add.group()
    const spawnPoints = [[200, 220], [600, 220], [400, 370]]
    spawnPoints.forEach(([x, y]) => this._enemies.add(new Enemy(this, x, y)))

    this.physics.add.collider(this._enemies, this._walls)
    this.physics.add.collider(this._enemies, this._enemies)

    this.physics.add.overlap(this.slop, this._enemies, (slop, enemy) => {
      if (this._slopHitTimer > 0 || enemy._dying) return
      this._slopHitTimer = 1200
      slop.coinCount = Math.max(0, slop.coinCount - 1)
      Sfx.slopHit(this)
      const angle = Math.atan2(slop.y - enemy.y, slop.x - enemy.x)
      slop.body.setVelocity(Math.cos(angle) * 280, Math.sin(angle) * 280)
      this.cameras.main.shake(120, 0.004)
    })

    this._transitioning = false
    this._dropPending = false
    this._slopHitTimer = 0
    this._prompts = []
  }

  _buildWalls(hasEyes = false) {
    const gapLeft  = DOOR_X - DOOR_WIDTH / 2
    const gapRight = DOOR_X + DOOR_WIDTH / 2

    this._wallRect(0, 0, gapLeft, T, WALL_COLOR)
    this._wallRect(gapRight, 0, W - gapRight, T, WALL_COLOR)

    const DUNGEON_X = 200, DUNGEON_GAP = 72
    this._wallRect(0, H - T, DUNGEON_X - DUNGEON_GAP / 2, T, WALL_COLOR)
    this._wallRect(DUNGEON_X + DUNGEON_GAP / 2, H - T, W - (DUNGEON_X + DUNGEON_GAP / 2), T, WALL_COLOR)

    const sideGapTop = 240
    const sideGapBot = 360
    if (hasEyes) {
      this._wallRect(0, T, T, sideGapTop - T, WALL_COLOR)
      this._wallRect(0, sideGapBot, T, H - T - sideGapBot, WALL_COLOR)
      this._wallRect(W - T, T, T, sideGapTop - T, WALL_COLOR)
      this._wallRect(W - T, sideGapBot, T, H - T - sideGapBot, WALL_COLOR)
      this.add.text(14, H / 2, '◀\nwest', { fontSize: '9px', color: '#887799', fontFamily: 'Courier New', align: 'center' }).setOrigin(0.5).setDepth(5)
      this.add.text(W - 14, H / 2, '▶\neast', { fontSize: '9px', color: '#887799', fontFamily: 'Courier New', align: 'center' }).setOrigin(0.5).setDepth(5)
    } else {
      this._wallRect(0, T, T, H - T * 2, WALL_COLOR)
      this._wallRect(W - T, T, T, H - T * 2, WALL_COLOR)
    }

    OBSTACLES.forEach(([x, y, w, h]) => this._wallRect(x, y, w, h, WALL_COLOR))
  }

  _pickupCoin(slop, coin) {
    if (!coin.active) return
    if (coin.getData('justDropped')) return
    if (slop.coinCount > slop.maxCoins) return

    coin.destroy()
    slop.coinCount++
    Sfx.coin(this)

    if (slop.coinCount > slop.maxCoins && !this._dropPending) {
      this._dropPending = true
      this.time.delayedCall(1000, () => {
        if (!this.scene.isActive('WorldScene')) return
        slop.coinCount--
        this._dropPending = false
        const cx = slop.x + Phaser.Math.Between(-40, 40)
        const cy = slop.y + Phaser.Math.Between(-40, 40)
        const dropped = this._coins.create(cx, cy, 'coin')
        dropped.refreshBody()
        dropped.setData('justDropped', true)
        this.time.delayedCall(800, () => {
          if (dropped.active) dropped.setData('justDropped', false)
        })
      })
    }
  }

  _enterDungeon() {
    this._sceneTransition('DungeonScene', { slopState: this.slop.getState() })
  }

  _enterNorthShrine() {
    this._sceneTransition('NorthShrineScene', { slopState: this.slop.getState() })
  }

  _showOneTimeHint(msg) {
    const hint = this.add.text(W / 2, H / 2 - 40, msg, {
      fontSize: '12px', color: '#887799', fontFamily: 'Courier New'
    }).setOrigin(0.5).setDepth(50).setAlpha(0)
    this.tweens.add({ targets: hint, alpha: 1, duration: 300 })
    this.time.delayedCall(2200, () => {
      this.tweens.add({ targets: hint, alpha: 0, duration: 500, onComplete: () => hint.destroy() })
    })
  }

  _showAreaHint(msg = 'this area is still being generated.') {
    if (this._areaHintActive) return
    this._areaHintActive = true
    const hint = this.add.text(W / 2, H / 2 - 40, msg, {
      fontSize: '12px', color: '#887799', fontFamily: 'Courier New'
    }).setOrigin(0.5).setDepth(50).setAlpha(0)
    this.tweens.add({ targets: hint, alpha: 1, duration: 200 })
    this.time.delayedCall(1600, () => {
      this.tweens.add({ targets: hint, alpha: 0, duration: 400, onComplete: () => {
        hint.destroy()
        this._areaHintActive = false
      }})
    })
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

    this._checkPromptCollisions()

    this._enemies.getChildren().forEach(e => {
      if (e.active) e.tick(delta, this.slop.x, this.slop.y)
    })

    if (this.slop.y < 40 && this.slop.x > DOOR_X - DOOR_WIDTH / 2 && this.slop.x < DOOR_X + DOOR_WIDTH / 2) {
      this._enterNorthShrine()
    }

    if (this._hasEyes) {
      const inGap = this.slop.y > 240 && this.slop.y < 360
      if (inGap && this.slop.x < 20) {
        this._sceneTransition('WestScene', { slopState: this.slop.getState() })
      } else if (inGap && this.slop.x > W - 20) {
        this._sceneTransition('EastScene', { slopState: this.slop.getState() })
      }
    }

    this._hud.update()
  }
}
