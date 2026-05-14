// Chapter 2 — Clone Scene
// Slop meets the version of himself that didn't get a quest.
// Enclosed arena fight. Clone walks toward the player; same sprite, purple tint.
// No jumping. Defeat the clone → Ch2TownScene.

import Phaser from 'phaser'
import { Dialogue } from '../../ui/Dialogue.js'
import { W, H }     from '../../config/constants.js'
import {
  Ch2BaseScene,
  PLAYER_W, PLAYER_H, MOVE_V, WALKER_V, SPRITE_SCALE,
} from '../../phaser/Ch2BaseScene.js'

const BG_KEY  = 'ch2-bg-cavern-v1'
const WORLD_W = 980

const GRAVITY      = 520
const MELEE_RANGE  = 44
const MELEE_CD     = 300
const CORRUPT_R    = 88
const CORRUPT_CD   = 2800
const HIT_IMMUNITY = 800

const CLONE_HP    = 5
const CLONE_SPD   = 62
const CLONE_W     = PLAYER_W
const CLONE_H     = PLAYER_H
const FIGHT_DIST  = 520   // proximity that triggers pre-fight dialogue

const PRE_FIGHT_LINES = [
  'you look familiar.',
  'same prompt.',
  'same model.',
  'different output.',
  '.',
  'you got direction.',
  'i accumulated.',
  '.',
  'let us see what that difference costs.',
]

const POST_FIGHT_LINES = [
  'i do not know if that was defeat.',
  'you kept moving.',
  'i stopped.',
  'maybe that is all there is to it.',
  '.',
  'there is a town ahead.',
  'they know things about moving up.',
  'ask them.',
]

// ── Scene ──────────────────────────────────────────────────────────────────────

export class Ch2CloneScene extends Ch2BaseScene {
  constructor() { super('Ch2CloneScene') }

  // ── Lifecycle ──────────────────────────────────────────────────────────────

  preload() {
    this._preloadSheets(BG_KEY)
  }

  init(data) {
    this._slopState     = data?.slopState || {}
    this._meleeCooldown = 0
    this._corruptCD     = 0
    this._hitImmunity   = 0
    this._preFightSeen  = false
    this._fightStarted  = false
    this._cloneHP       = CLONE_HP
    this._lastSafeX     = 80
    this._lastSafeY     = H - 80
    this._clone         = null
    this._cloneSprite   = null
    this._cloneSpriteYOffset = 0
    this._initSpriteState()
  }

  create() {
    if (this.physics?.world?.gravity) this.physics.world.gravity.y = GRAVITY
    if (this.physics?.world?.setBounds) this.physics.world.setBounds(0, 0, WORLD_W, H + 200)

    this._buildBackground()
    this._platforms = this.physics.add.staticGroup()
    this._buildWorld()

    this._player = this.add.rectangle(80, H - 80, PLAYER_W, PLAYER_H, 0xd4c8a0)
    this.physics.add.existing(this._player)
    if (this._player.body) this._player.body.setCollideWorldBounds(true)
    this.physics.add.collider(this._player, this._platforms)

    this._spawnClone()

    this._cursors = this.input.keyboard.createCursorKeys()
    this._aKey    = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A)
    this._dKey    = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D)
    this._zKey    = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.Z)
    this._qKey    = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.Q)

    if (this.cameras?.main?.startFollow) this.cameras.main.startFollow(this._player, true, 0.09, 0.09)
    if (this.cameras?.main?.setBounds)   this.cameras.main.setBounds(0, 0, WORLD_W, H)

    this._dialogue = new Dialogue(this)
    this._buildHUD()
    this.cameras.main.fadeIn(600, 0, 0, 0)

    this._loadAnimConfigs('clone')
  }

  // ── Clone sprite (attached after Firestore anims load) ─────────────────────

  _onAnimsLoaded() {
    if (!this._animPool.length || !this._clone?.active) return
    const entry   = this._animPool[0]
    const procKey = 'proc-' + entry.cfg.sheetKey
    if (!this.textures?.exists(procKey)) return

    const f0 = entry.cfg.frames[0]
    this._cloneSpriteYOffset = (CLONE_H - f0.h * SPRITE_SCALE) / 2

    if (this._cloneSprite) this._cloneSprite.destroy()
    this._cloneSprite = this.add.sprite(
      this._clone.x, this._clone.y + this._cloneSpriteYOffset,
      procKey, `${entry.key}-0`
    ).setScale(SPRITE_SCALE).setDepth(10).setTint(0xcc88ff).setFlipX(true)
    this._clone.setAlpha(0)
    this._cloneSprite.play(entry.key)
  }

  // ── Background ─────────────────────────────────────────────────────────────

  _buildBackground() {
    if (this.textures?.exists(BG_KEY)) {
      this.add.image(W / 2, H / 2, BG_KEY)
        .setDisplaySize(W, H).setScrollFactor(0).setDepth(-2)
    } else {
      this.add.rectangle(WORLD_W / 2, H / 2, WORLD_W, H, 0x120e1c)
    }
  }

  // ── World ──────────────────────────────────────────────────────────────────

  _buildWorld() {
    this._plat(0, H - 24, WORLD_W, 48, 0x221a2a)
    // Low pillars flanking the arena for atmosphere
    this._plat(0,  H - 24, 14, H, 0x1a1422)
    this._plat(WORLD_W - 14, H - 24, 14, H, 0x1a1422)
  }

  // ── Clone ──────────────────────────────────────────────────────────────────

  _spawnClone() {
    const cx = WORLD_W - 120
    this._clone = this.add.rectangle(cx, H - 80, CLONE_W, CLONE_H, 0x9944bb)
    this.physics.add.existing(this._clone)
    if (this._clone.body) this._clone.body.setCollideWorldBounds(true)
    this.physics.add.collider(this._clone, this._platforms)
    this.physics.add.overlap(this._player, this._clone, () => this._onTouchClone())

    this._cloneHpBar = this.add.rectangle(cx, H - 110, 60, 5, 0xaa44dd).setDepth(12)
    this._cloneHpBg  = this.add.rectangle(cx, H - 110, 60, 5, 0x332244).setDepth(11)
    this.add.text(cx, H - 124, 'the weight', {
      fontSize: '7px', color: '#aa66cc', fontFamily: 'Courier New',
    }).setOrigin(0.5).setDepth(12)
  }

  // ── Combat ─────────────────────────────────────────────────────────────────

  _doMelee() {
    if (this._meleeCooldown > 0) return
    this._meleeCooldown = MELEE_CD
    this.cameras.main.flash(50, 200, 160, 80)
    const px = this._player.x, py = this._player.y
    if (this._clone?.active) {
      const dx = this._clone.x - px
      if (Math.sign(dx) === this._facing || Math.abs(dx) <= 6) {
        if (Math.abs(dx) < MELEE_RANGE + 8 && Math.abs(this._clone.y - py) < 26) {
          this._hitClone(1)
        }
      }
    }
  }

  _doCorrupt() {
    if (this._corruptCD > 0) return
    this._corruptCD = CORRUPT_CD
    const px = this._player.x, py = this._player.y
    const ring = this.add.rectangle(px, py, 12, 12, 0x7733aa, 0.65).setDepth(15)
    this.tweens.add({
      targets: ring, scaleX: CORRUPT_R / 6, scaleY: CORRUPT_R / 6,
      alpha: 0, duration: 340, ease: 'Quad.easeOut',
      onComplete: () => ring.destroy(),
    })
    this.cameras.main.shake(80, 0.003)
    if (this._clone?.active) {
      if (Phaser.Math.Distance.Between(px, py, this._clone.x, this._clone.y) <= CORRUPT_R) {
        this._hitClone(1)
      }
    }
  }

  _hitClone(dmg) {
    if (!this._clone?.active) return
    this._cloneHP -= dmg
    const ratio = Math.max(0, this._cloneHP / CLONE_HP)
    this._cloneHpBar.scaleX = ratio
    this._cloneHpBar.setFillStyle(ratio > 0.4 ? 0xaa44dd : 0xdd2288)

    const visual = this._cloneSprite || this._clone
    this.tweens.add({
      targets: visual, alpha: 0.2, duration: 70, yoyo: true, repeat: 1,
      onComplete: () => { if (visual?.active) visual.setAlpha(1) },
    })
    if (this._cloneHP <= 0) this.time.delayedCall(100, () => this._killClone())
  }

  _killClone() {
    if (!this._clone?.active) return
    // Shatter particles
    for (let i = 0; i < 8; i++) {
      const p = this.add.rectangle(
        this._clone.x + Phaser.Math.Between(-10, 10),
        this._clone.y + Phaser.Math.Between(-6, 6),
        Phaser.Math.Between(4, 8), Phaser.Math.Between(4, 8), 0xcc88ff
      ).setDepth(20)
      this.tweens.add({
        targets: p,
        x: p.x + Phaser.Math.Between(-60, 60), y: p.y + Phaser.Math.Between(-50, 10),
        alpha: 0, duration: 450, ease: 'Quad.easeOut',
        onComplete: () => p.destroy(),
      })
    }
    this.cameras.main.flash(120, 100, 40, 160)

    if (this._cloneSprite) { this._cloneSprite.destroy(); this._cloneSprite = null }
    if (this._cloneHpBar) { this._cloneHpBar.destroy(); this._cloneHpBar = null }
    if (this._cloneHpBg)  { this._cloneHpBg.destroy();  this._cloneHpBg  = null }
    this._clone.destroy()
    this._clone = null

    this.time.delayedCall(600, () => {
      this._dialogue.show('the weight', POST_FIGHT_LINES, () => {
        this._sceneTransition('Ch2TownScene', { slopState: this._slopState })
      })
    })
  }

  _onTouchClone() {
    if (!this._clone?.active || this._hitImmunity > 0 || !this._fightStarted) return
    this._hitImmunity = HIT_IMMUNITY
    const dir = Math.sign(this._player.x - this._clone.x) || 1
    if (this._player?.body) {
      this._player.body.setVelocityX(dir * 280)
      this._player.body.setVelocityY(-150)
    }
    this.cameras.main.shake(90, 0.004)
  }

  // ── HUD ────────────────────────────────────────────────────────────────────

  _buildHUD() {
    const dim = { fontSize: '9px', color: '#776688', fontFamily: 'Courier New' }
    this.add.text(16,  H - 44, '← →  move',  dim).setScrollFactor(0).setDepth(30)
    this.add.text(112, H - 44, 'Z  attack',  dim).setScrollFactor(0).setDepth(30)
    this.add.text(200, H - 44, 'Q  corrupt', dim).setScrollFactor(0).setDepth(30)
    this._corruptLabel = this.add.text(200, H - 28, 'ready', {
      fontSize: '8px', color: '#9966cc', fontFamily: 'Courier New',
    }).setScrollFactor(0).setDepth(30)
    this.add.text(W / 2, 22, 'chapter 2  //  the double', {
      fontSize: '10px', color: '#776688', fontFamily: 'Courier New', letterSpacing: 3,
    }).setOrigin(0.5).setScrollFactor(0).setDepth(30)
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

    if (left)       { body.setVelocityX(-MOVE_V); this._facing = -1 }
    else if (right) { body.setVelocityX(MOVE_V);  this._facing =  1 }
    else body.setVelocityX(Math.abs(body.velocity.x) < 5 ? 0 : body.velocity.x * 0.78)

    // No jump — not yet granted

    // Pit recovery
    if (this._player.y > H + 80) {
      this._player.x = this._lastSafeX
      this._player.y = this._lastSafeY - 40
      body.setVelocity(0, 0)
    } else if (body.blocked?.down) {
      this._lastSafeX = this._player.x
      this._lastSafeY = this._player.y
    }

    // Cooldowns
    if (this._meleeCooldown > 0) this._meleeCooldown -= delta
    if (this._corruptCD     > 0) this._corruptCD     -= delta
    if (this._hitImmunity   > 0) this._hitImmunity   -= delta

    if (Phaser.Input.Keyboard.JustDown(this._zKey)) this._doMelee()
    if (Phaser.Input.Keyboard.JustDown(this._qKey)) this._doCorrupt()

    // Pre-fight proximity trigger
    if (!this._preFightSeen && this._clone?.active) {
      const dist = Phaser.Math.Distance.Between(
        this._player.x, this._player.y, this._clone.x, this._clone.y
      )
      if (dist < FIGHT_DIST) {
        this._preFightSeen = true
        this._dialogue.show('the weight', PRE_FIGHT_LINES, () => {
          this._fightStarted = true
        })
      }
    }

    // Clone AI — walks toward player once fight started
    if (this._fightStarted && this._clone?.body) {
      const dir = Math.sign(this._player.x - this._clone.x)
      this._clone.body.setVelocityX(dir * CLONE_SPD)
      if (this._cloneSprite && this._clone.active) {
        this._cloneSprite.x = this._clone.x
        this._cloneSprite.y = this._clone.y + this._cloneSpriteYOffset
        this._cloneSprite.setFlipX(this._clone.x > this._player.x)
      }
      if (this._cloneHpBar) {
        this._cloneHpBar.x = this._clone.x
        this._cloneHpBar.y = this._clone.y - 26
        this._cloneHpBg.x  = this._clone.x
        this._cloneHpBg.y  = this._clone.y - 26
      }
    }

    // Anim state
    const moving   = Math.abs(body.velocity.x) > 10
    const grounded = body.blocked?.down
    if (!grounded)   this._setAnimState('air')
    else if (moving) this._setAnimState('walk')
    else             this._setAnimState('idle')
    this._syncPlayerVisuals()

    this._corruptLabel?.setText(this._corruptCD > 0 ? `${(this._corruptCD / 1000).toFixed(1)}s` : 'ready')
  }
}
