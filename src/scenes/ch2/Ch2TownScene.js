// Chapter 2 — Town Scene (Zelda 2 style)
// Slop's first settlement in the new world. Three NPCs. Third gives jump.
// Jump is disabled on entry; enabled after the ability is granted.
// Exit: walk off the right edge → PlatformerWorldScene.

import Phaser from 'phaser'
import { Dialogue } from '../../ui/Dialogue.js'
import { W, H }     from '../../config/constants.js'
import {
  Ch2BaseScene,
  PLAYER_W, PLAYER_H, MOVE_V, JUMP_V, GRAVITY,
} from '../../phaser/Ch2BaseScene.js'

const BG_KEY  = 'ch2-bg-station-hub'
const WORLD_W = 1300

const HIT_IMMUNITY = 800

// ── NPC definitions ───────────────────────────────────────────────────────────

const NPCS = [
  {
    x: 260, color: 0x887799,
    label: 'resident',
    lines: [
      'the town has been here since the chapter started.',
      'none of us remember who built it.',
      'we stopped asking.',
      '.',
      'the walkers used to come this far.',
      'they do not anymore.',
      'we do not know if that is better.',
    ],
  },
  {
    x: 620, color: 0x9988aa,
    label: 'the tall one',
    lines: [
      'the ceiling here is very high.',
      'i have been looking at it for a long time.',
      'i cannot reach it.',
      'my shape is wrong for reaching.',
      '.',
      'i used to think about what was up there.',
      'i stopped. it did not help.',
      'maybe you are built differently.',
    ],
  },
  {
    x: 1020, color: 0xaabbcc,
    label: 'keeper',
    giveJump: true,
    linesBeforeGive: [
      'you want to go higher.',
      'i can tell.',
      '.',
      'the walkers only go sideways.',
      'you keep looking up.',
      '.',
      'i have had this a long time.',
      'it does not fit my shape.',
      'but you move differently.',
    ],
    linesAfterGive: [
      '.',
      'jump.',
      'see what the ceiling looks like.',
      'no one here has ever seen it.',
    ],
  },
]

const TOWN_TITLE = 'chapter 2  //  the settlement'

// ── Scene ──────────────────────────────────────────────────────────────────────

export class Ch2TownScene extends Ch2BaseScene {
  constructor() { super('Ch2TownScene') }

  // ── Lifecycle ──────────────────────────────────────────────────────────────

  preload() {
    this._preloadSheets(BG_KEY)
  }

  init(data) {
    this._slopState    = data?.slopState || {}
    this._hitImmunity  = 0
    this._lastSafeX    = 80
    this._lastSafeY    = H - 80
    this._npcTriggered = new Set()
    this._jumpJustGiven = false
    this._initSpriteState()
  }

  create() {
    if (this.physics?.world?.gravity) this.physics.world.gravity.y = GRAVITY
    if (this.physics?.world?.setBounds) this.physics.world.setBounds(0, 0, WORLD_W, H + 200)

    this._buildBackground()
    this._platforms = this.physics.add.staticGroup()
    this._buildWorld()
    this._buildBuildings()

    this._player = this.add.rectangle(80, H - 80, PLAYER_W, PLAYER_H, 0xd4c8a0)
    this.physics.add.existing(this._player)
    if (this._player.body) this._player.body.setCollideWorldBounds(true)
    this.physics.add.collider(this._player, this._platforms)

    this._npcs = this._spawnNPCs()

    this._cursors  = this.input.keyboard.createCursorKeys()
    this._aKey     = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A)
    this._dKey     = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D)
    this._spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE)
    this._shiftKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SHIFT)

    if (this.cameras?.main?.startFollow) this.cameras.main.startFollow(this._player, true, 0.09, 0.09)
    if (this.cameras?.main?.setBounds)   this.cameras.main.setBounds(0, 0, WORLD_W, H)

    this._dialogue = new Dialogue(this)
    this._buildHUD()
    this.cameras.main.fadeIn(600, 0, 0, 0)

    this._loadAnimConfigs('town')
  }

  // ── Background ─────────────────────────────────────────────────────────────

  _buildBackground() {
    if (this.textures?.exists(BG_KEY)) {
      this.add.image(W / 2, H / 2, BG_KEY)
        .setDisplaySize(W, H).setScrollFactor(0).setDepth(-2)
    } else {
      this.add.rectangle(WORLD_W / 2, H / 2, WORLD_W, H, 0x1e1a2a)
    }
  }

  // ── World ──────────────────────────────────────────────────────────────────

  _buildWorld() {
    this._plat(0, H - 24, WORLD_W, 48, 0x3a3040)
  }

  // ── Buildings (Zelda 2 style facades) ─────────────────────────────────────

  _buildBuildings() {
    const facade = (x, w, h, col) => {
      const wallY = H - 24 - h / 2
      this.add.rectangle(x + w / 2, wallY, w, h, col).setDepth(2)
      // Window strips
      for (let i = 0; i < Math.floor(w / 28); i++) {
        this.add.rectangle(x + 12 + i * 28, wallY - h / 4, 14, 10, 0x554466, 0.8).setDepth(3)
      }
      // Door
      this.add.rectangle(x + w / 2, H - 24 - 22, 16, 44, 0x221a33, 0.9).setDepth(3)
    }

    facade(160,  90,  90, 0x2e2840)
    facade(500,  110, 120, 0x302a44)
    facade(880,  130, 110, 0x342e48)
    facade(1100, 80,  80,  0x2c2840)
  }

  // ── NPCs ──────────────────────────────────────────────────────────────────

  _spawnNPCs() {
    return NPCS.map(def => {
      const npc = this.add.rectangle(def.x, H - 60, 12, 22, def.color).setDepth(5)
      this.tweens.add({
        targets: npc, y: npc.y - 4,
        duration: 1400 + Math.random() * 400, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
      })
      this.add.text(def.x, H - 90, def.label, {
        fontSize: '7px', color: '#9988aa', fontFamily: 'Courier New',
      }).setOrigin(0.5).setDepth(6)
      return { sprite: npc, def, triggered: false }
    })
  }

  // ── Jump ability ───────────────────────────────────────────────────────────

  _giveJump(afterCb) {
    this._slopState = { ...this._slopState, ch2JumpUnlocked: true }
    this._jumpJustGiven = true
    this.cameras.main.flash(700, 60, 80, 180)
    this.time.delayedCall(800, () => {
      this._dialogue.show('keeper', NPCS[2].linesAfterGive, afterCb)
    })
  }

  // ── HUD ────────────────────────────────────────────────────────────────────

  _buildHUD() {
    const dim = { fontSize: '9px', color: '#8899aa', fontFamily: 'Courier New' }
    this._jumpHint = this.add.text(16, H - 44, '← →  move', dim)
      .setScrollFactor(0).setDepth(30)
    this.add.text(W / 2, 22, TOWN_TITLE, {
      fontSize: '10px', color: '#8899aa', fontFamily: 'Courier New', letterSpacing: 3,
    }).setOrigin(0.5).setScrollFactor(0).setDepth(30)
  }

  _updateJumpHint() {
    if (this._canJump() && !this._hintUpdated) {
      this._hintUpdated = true
      this._jumpHint?.setText('← →  move  ·  SPACE  jump')
    }
  }

  // ── Update ─────────────────────────────────────────────────────────────────

  update(_, delta) {
    if (this._transitioning) return
    if (!this._player?.body) return
    this._dialogue?.update()
    if (this._dialogue?.active) return

    const body  = this._player.body
    const left  = this._cursors?.left?.isDown  || this._aKey?.isDown
    const right = this._cursors?.right?.isDown || this._dKey?.isDown
    const jumpPressed = Phaser.Input.Keyboard.JustDown(this._spaceKey)
      || Phaser.Input.Keyboard.JustDown(this._shiftKey)
      || Phaser.Input.Keyboard.JustDown(this._cursors?.up)

    if (left)       { body.setVelocityX(-MOVE_V); this._facing = -1 }
    else if (right) { body.setVelocityX(MOVE_V);  this._facing =  1 }
    else body.setVelocityX(Math.abs(body.velocity.x) < 5 ? 0 : body.velocity.x * 0.78)

    if (jumpPressed && this._canJump() && body.blocked?.down) {
      body.setVelocityY(JUMP_V)
      this.cameras.main.flash(25, 140, 120, 200)
    }

    if (this._hitImmunity > 0) this._hitImmunity -= delta

    // Pit recovery
    if (this._player.y > H + 80) {
      this._player.x = this._lastSafeX
      this._player.y = this._lastSafeY - 40
      body.setVelocity(0, 0)
    } else if (body.blocked?.down) {
      this._lastSafeX = this._player.x
      this._lastSafeY = this._player.y
    }

    // NPC proximity — nearest untriggered NPC
    for (const npc of this._npcs) {
      if (npc.triggered) continue
      const dist = Phaser.Math.Distance.Between(
        this._player.x, this._player.y, npc.sprite.x, npc.sprite.y
      )
      if (dist < 70) {
        npc.triggered = true
        if (npc.def.giveJump) {
          this._dialogue.show(npc.def.label, npc.def.linesBeforeGive, () => {
            this._giveJump(() => { this._updateJumpHint() })
          })
        } else {
          this._dialogue.show(npc.def.label, npc.def.lines, () => {})
        }
        break
      }
    }

    this._updateJumpHint()

    // Anim state
    const moving   = Math.abs(body.velocity.x) > 10
    const grounded = body.blocked?.down
    if (!grounded)   this._setAnimState('air')
    else if (moving) this._setAnimState('walk')
    else             this._setAnimState('idle')
    this._syncPlayerVisuals()

    // Exit — right edge → PlatformerWorldScene (with jump unlocked)
    if (this._player.x > WORLD_W - 60) {
      this._sceneTransition('PlatformerWorldScene', { slopState: this._slopState })
    }
  }
}
