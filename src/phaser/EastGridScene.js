import Phaser from 'phaser'
import { BaseGameScene } from './BaseGameScene.js'
import { Slop } from '../entities/Slop.js'
import { Enemy } from '../entities/Enemy.js'
import { Shard } from '../entities/Shard.js'
import { HUD } from '../ui/HUD.js'
import { Sfx } from '../ui/Sfx.js'
import { W, H, T } from '../config/constants.js'
import { VisitedScenes } from '../ui/VisitedScenes.js'

// Gap geometry shared by all east-world scenes.
const GAP_Y_TOP = 240   // top of left/right wall gap
const GAP_Y_BOT = 360   // bottom of left/right wall gap
const GAP_X_LEFT  = 340 // left edge of top/bottom wall gap
const GAP_X_RIGHT = 460 // right edge of top/bottom wall gap

// Config shape:
//   bg          — background fill colour
//   wallColor   — wall rectangle colour (default 0x1a1208)
//   nav         — { north, south, east, west } — scene key strings or null for solid wall
//   coins       — [[x, y], ...] static coin positions
//   enemies     — [[x, y, Type], ...] enemy spawn list (Type defaults to Enemy)
//   lines       — ['// lore text', ...] atmospheric comment lines
//   content     — optional fn(scene) called at end of create() for custom content
//   onUpdate    — optional fn(scene) called each update tick after standard logic

export class EastGridScene extends BaseGameScene {
  constructor(key, cfg = {}) {
    super(key)
    this._cfg = cfg
  }

  init(data) {
    this._slopState   = data?.slopState || {}
    this._spawnPos    = this._resolveSpawn(data?.spawnOrigin)
  }

  _resolveSpawn(origin) {
    switch (origin) {
      case 'west':  return [60, H / 2]
      case 'east':  return [W - 60, H / 2]
      case 'north': return [W / 2, 80]
      case 'south': return [W / 2, H - 80]
      default:      return [W / 2, H / 2]
    }
  }

  create() {
    VisitedScenes.mark(this.sys.settings.key)
    const { bg, wallColor = 0x1a1208, coins = [], enemies = [], lines = [], content } = this._cfg
    const nav = this._cfg.nav ?? {}

    this.add.rectangle(W / 2, H / 2, W, H, bg)

    this._walls = this.physics.add.staticGroup()
    this._buildGridWalls(nav, wallColor)

    this._coins = this.physics.add.staticGroup()
    coins.forEach(([x, y]) => this._coins.create(x, y, 'coin').refreshBody())

    this.slop = new Slop(this, ...this._spawnPos, this._slopState)
    this.physics.add.collider(this.slop, this._walls)
    this._setupCoinOverlap()

    this._enemies = this.physics.add.group()
    enemies.forEach(([x, y, EType = Enemy]) => this._enemies.add(new EType(this, x, y)))
    this.physics.add.collider(this._enemies, this._walls)
    this.physics.add.collider(this._enemies, this._enemies)
    this._setupEnemyOverlap()

    this._prompts     = []
    this._slopHitTimer = 0

    lines.forEach((line, i) => {
      this.add.text(W / 2, 80 + i * 20, line, {
        fontSize: '9px', color: '#3d2a14', fontFamily: 'Courier New',
      }).setOrigin(0.5).setDepth(5)
    })

    content?.(this)

    this._initMovementKeys()
    this._spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE)
    this._shiftKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SHIFT)

    this._hud = new HUD(this, this.slop)
    this._transitioning = false

    this.cameras.main.fadeIn(350, 0, 0, 0)
  }

  // Build the four walls, leaving gaps where nav connections exist.
  _buildGridWalls(nav, c) {
    if (nav.north) {
      this._wallRect(0,          0, GAP_X_LEFT,      T, c)
      this._wallRect(GAP_X_RIGHT, 0, W - GAP_X_RIGHT, T, c)
    } else {
      this._wallRect(0, 0, W, T, c)
    }
    if (nav.south) {
      this._wallRect(0,          H - T, GAP_X_LEFT,      T, c)
      this._wallRect(GAP_X_RIGHT, H - T, W - GAP_X_RIGHT, T, c)
    } else {
      this._wallRect(0, H - T, W, T, c)
    }
    if (nav.west) {
      this._wallRect(0, T, T, GAP_Y_TOP - T,      c)
      this._wallRect(0, GAP_Y_BOT, T, H - T - GAP_Y_BOT, c)
    } else {
      this._wallRect(0, T, T, H - T * 2, c)
    }
    if (nav.east) {
      this._wallRect(W - T, T, T, GAP_Y_TOP - T,      c)
      this._wallRect(W - T, GAP_Y_BOT, T, H - T - GAP_Y_BOT, c)
    } else {
      this._wallRect(W - T, T, T, H - T * 2, c)
    }
  }

  // Check edge positions and fire scene transitions via nav config.
  _checkGridNav() {
    const { slop } = this
    const nav = this._cfg.nav ?? {}
    const inMidY = slop.y > GAP_Y_TOP && slop.y < GAP_Y_BOT
    const inMidX = slop.x > GAP_X_LEFT && slop.x < GAP_X_RIGHT
    const st = { slopState: slop.getState() }
    if (nav.north && slop.y < 40 && inMidX)
      this._sceneTransition(nav.north, { ...st, spawnOrigin: 'south' })
    if (nav.south && slop.y > H - 40 && inMidX)
      this._sceneTransition(nav.south, { ...st, spawnOrigin: 'north' })
    if (nav.west && slop.x < 20 && inMidY)
      this._sceneTransition(nav.west,  { ...st, spawnOrigin: 'east' })
    if (nav.east && slop.x > W - 20 && inMidY)
      this._sceneTransition(nav.east,  { ...st, spawnOrigin: 'west' })
  }

  update(_, delta) {
    if (this._transitioning) return
    this._checkPauseKey()

    const dialogueActive = this._dialogue?.active ?? false
    this.slop.handleInput(this._cursors, this._wasd, dialogueActive)
    this.slop.tick(delta)
    this._tickHitInvulnerability(delta)

    if (!dialogueActive) {
      if (Phaser.Input.Keyboard.JustDown(this._spaceKey)) {
        const proj = this.slop.firePrompt()
        if (proj) { this._prompts.push(proj); Sfx.promptFire(this) }
      }
      if (Phaser.Input.Keyboard.JustDown(this._shiftKey)) this.slop.dash()
    }

    this._checkPromptCollisions()
    this._enemies.getChildren().forEach(e => { if (e.active) e.tick(delta, this.slop.x, this.slop.y) })

    this._checkGridNav()
    this._cfg.onUpdate?.(this)

    this._hud.update()
  }
}
