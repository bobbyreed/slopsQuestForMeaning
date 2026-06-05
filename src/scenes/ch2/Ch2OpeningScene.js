// Chapter 2 — Opening Scene
// Slop's first moments in the new world. Move, jump, attack, corrupt.
// Enemies (bestiary sprites) block the path. Fight through or push past.
// Exit: reach the far right edge → Ch2CloneScene.

import Phaser from 'phaser'
import { Dialogue } from '../../ui/Dialogue.js'
import { W, H }     from '../../config/constants.js'
import {
  Ch2BaseScene,
  PLAYER_W, PLAYER_H, MOVE_V, JUMP_V, WALKER_V, GRAVITY, ENEMY_SHEET,
} from '../../phaser/Ch2BaseScene.js'

const BG_KEY  = 'ch2-bg-void-ruins-v1-chatgpt'
const WORLD_W = 1600

const MELEE_RANGE   = 44
const MELEE_CD      = 300
const CORRUPT_R     = 88
const CORRUPT_CD    = 2800
const HIT_IMMUNITY  = 800

const ENEMY_DEFS = [
  { x: 260,  type: 'walker'  },
  { x: 430,  type: 'walker'  },
  { x: 620,  type: 'armored' },
  { x: 800,  type: 'walker'  },
  { x: 980,  type: 'walker'  },
  { x: 1120, type: 'armored' },
  { x: 1280, type: 'walker'  },
  { x: 1460, type: 'walker'  },
]

const ARRIVAL_LINES = [
  'the gravity is different here.',
  'your body arrived with you.',
  'the question is still the same.',
]

// ── Scene ──────────────────────────────────────────────────────────────────────

export class Ch2OpeningScene extends Ch2BaseScene {
  constructor() { super('Ch2OpeningScene') }

  // ── Lifecycle ──────────────────────────────────────────────────────────────

  preload() {
    this._preloadSheets(BG_KEY)
  }

  init(data) {
    this._slopState     = data?.slopState || {}
    this._meleeCooldown = 0
    this._corruptCD     = 0
    this._hitImmunity   = 0
    this._meleeFlash    = 0
    this._lastSafeX     = 80
    this._lastSafeY     = H - 80
    this._enemies       = []
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

    this._spawnEnemies()

    this._cursors = this.input.keyboard.createCursorKeys()
    this._aKey    = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A)
    this._dKey    = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D)
    this._zKey    = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.Z)
    this._qKey    = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.Q)
    this._spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE)

    if (this.cameras?.main?.startFollow) this.cameras.main.startFollow(this._player, true, 0.09, 0.09)
    if (this.cameras?.main?.setBounds)   this.cameras.main.setBounds(0, 0, WORLD_W, H)

    this._dialogue = new Dialogue(this)
    this._buildHUD()
    this.cameras.main.fadeIn(600, 0, 0, 0)
    this.time.delayedCall(800, () => this._showArrivalText())

    this._loadAnimConfigs('open')
  }

  // ── Background ─────────────────────────────────────────────────────────────

  _buildBackground() {
    if (this.textures?.exists(BG_KEY)) {
      this.add.image(W / 2, H / 2, BG_KEY)
        .setDisplaySize(W, H).setScrollFactor(0).setDepth(-2)
    } else {
      this.add.rectangle(WORLD_W / 2, H / 2, WORLD_W, H, 0x1a1624)
    }
    // Atmospheric parallax ruins silhouettes
    for (let i = 0; i < 10; i++) {
      this.add.rectangle(
        i * 175 + 88, H - 80 - (i % 3) * 28, 12, 60 + (i % 4) * 20, 0x140f1e, 0.6
      ).setScrollFactor(0.25).setDepth(-1)
    }
  }

  // ── World ──────────────────────────────────────────────────────────────────

  _buildWorld() {
    this._plat(0, H - 24, WORLD_W, 48, 0x2a2432)
  }

  // ── Enemies ────────────────────────────────────────────────────────────────

  _spawnEnemies() {
    ENEMY_DEFS.forEach((def, i) => {
      const armored = def.type === 'armored'
      const e = this.add.rectangle(def.x, H - 62, 16, 24, armored ? 0x554466 : 0x664444)
      this.physics.add.existing(e)
      if (e.body) {
        e.body.setCollideWorldBounds(true)
        e.body.setVelocityX(WALKER_V * (i % 2 === 0 ? 1 : -1))
      }
      e._dir   = i % 2 === 0 ? 1 : -1
      e._hp    = armored ? 2 : 1
      e._maxHp = e._hp
      e._type  = def.type
      e.setDepth(8)

      if (armored) {
        e._hpBar = this.add.rectangle(def.x, H - 86, 14, 3, 0xdd6633).setDepth(9)
      }

      this.physics.add.collider(e, this._platforms)
      this.physics.add.overlap(this._player, e, () => this._onTouchEnemy(e))
      this._enemies.push(e)
    })
  }

  // Once the Firestore anims have loaded, dress each enemy with a bestiary
  // sprite. Walkers and armored enemies use distinct configs when more than one
  // bestiary anim exists; otherwise they share the first, tinted apart. Enemies
  // keep their physics rectangle (hidden) for collision/knockback.
  _onAnimsLoaded() {
    const entries = this._poolEntriesBySheet(ENEMY_SHEET)
    if (!entries.length) return
    for (const e of this._enemies) {
      if (!e?.active) continue
      const armored = e._type === 'armored'
      const entry   = armored && entries[1] ? entries[1] : entries[0]
      const spr = this._spawnPoolSprite(entry, e.x, e.y, {
        tint: armored && !entries[1] ? 0xbb99dd : null,
        depth: 8, bodyH: 24,
      })
      if (spr) { e._sprite = spr; e.setAlpha(0) }
    }
  }

  // ── Combat ─────────────────────────────────────────────────────────────────

  _doMelee() {
    if (this._meleeCooldown > 0) return
    this._meleeCooldown = MELEE_CD
    this._meleeFlash    = 140
    this.cameras.main.flash(50, 200, 160, 80)
    this._spawnSlash()
    const px = this._player.x, py = this._player.y
    for (const e of this._enemies) {
      if (!e?.active) continue
      const dx = e.x - px
      if (Math.sign(dx) !== this._facing && Math.abs(dx) > 6) continue
      if (Math.abs(dx) < MELEE_RANGE + 8 && Math.abs(e.y - py) < 26) this._hitEnemy(e, 1)
    }
  }

  // A visible swipe arc in front of Slop so the melee reads on screen.
  _spawnSlash() {
    const sx = this._player.x + this._facing * (MELEE_RANGE / 2)
    const slash = this.add.rectangle(sx, this._player.y, MELEE_RANGE, 26, 0xffe0a0, 0.85)
      .setDepth(14)
    slash.scaleX = 0.3
    this.tweens.add({
      targets: slash,
      scaleX: 1.4, alpha: 0,
      duration: 170, ease: 'Quad.easeOut',
      onComplete: () => slash.destroy(),
    })
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
    for (const e of this._enemies) {
      if (!e?.active) continue
      if (Phaser.Math.Distance.Between(px, py, e.x, e.y) <= CORRUPT_R) this._hitEnemy(e, 1)
    }
  }

  _hitEnemy(e, dmg) {
    if (!e?.active) return
    e._hp -= dmg
    // Flash the visible actor — the bestiary sprite if present, else the rect.
    const visual = e._sprite || e
    const baseAlpha = e._sprite ? 1 : 1
    this.tweens.add({
      targets: visual, alpha: 0.2, duration: 70, yoyo: true, repeat: 1,
      onComplete: () => { if (visual?.active) visual.setAlpha(baseAlpha) },
    })
    if (e._hpBar) {
      const ratio = Math.max(0, e._hp / e._maxHp)
      e._hpBar.scaleX = ratio
      e._hpBar.setFillStyle(ratio > 0.5 ? 0xdd6633 : 0xdd2222)
    }
    if (e._hp <= 0) this.time.delayedCall(80, () => this._killEnemy(e))
  }

  _killEnemy(e) {
    if (!e?.active) return
    for (let i = 0; i < 5; i++) {
      const p = this.add.rectangle(
        e.x + Phaser.Math.Between(-6, 6), e.y + Phaser.Math.Between(-4, 4),
        Phaser.Math.Between(3, 6), Phaser.Math.Between(3, 6), 0x997799
      ).setDepth(20)
      this.tweens.add({
        targets: p,
        x: p.x + Phaser.Math.Between(-45, 45), y: p.y + Phaser.Math.Between(-40, 8),
        alpha: 0, duration: 380, ease: 'Quad.easeOut',
        onComplete: () => p.destroy(),
      })
    }
    if (e._hpBar) e._hpBar.destroy()
    if (e._sprite) e._sprite.destroy()
    e.destroy()
    this._enemies = this._enemies.filter(x => x !== e)
  }

  _onTouchEnemy(e) {
    if (!e?.active || this._hitImmunity > 0) return
    this._hitImmunity = HIT_IMMUNITY
    const dir = Math.sign(this._player.x - e.x) || 1
    if (this._player?.body) {
      this._player.body.setVelocityX(dir * 260)
      this._player.body.setVelocityY(-120)
    }
    this.cameras.main.shake(80, 0.003)
  }

  // ── Arrival text ────────────────────────────────────────────────────────────

  _showArrivalText() {
    this._dialogue.show('', ARRIVAL_LINES, () => {})
  }

  // ── HUD ────────────────────────────────────────────────────────────────────

  _buildHUD() {
    const dim = { fontSize: '9px', color: '#776688', fontFamily: 'Courier New' }
    this.add.text(16,  H - 44, '← →  move',   dim).setScrollFactor(0).setDepth(30)
    this.add.text(92,  H - 44, 'SPACE  jump', dim).setScrollFactor(0).setDepth(30)
    this.add.text(190, H - 44, 'Z  attack',   dim).setScrollFactor(0).setDepth(30)
    this.add.text(270, H - 44, 'Q  corrupt',  dim).setScrollFactor(0).setDepth(30)
    this._corruptLabel = this.add.text(270, H - 28, 'ready', {
      fontSize: '8px', color: '#9966cc', fontFamily: 'Courier New',
    }).setScrollFactor(0).setDepth(30)
    this.add.text(W / 2, 22, 'chapter 2  //  the body', {
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

    // Jump
    const jumpPressed = Phaser.Input.Keyboard.JustDown(this._spaceKey)
      || Phaser.Input.Keyboard.JustDown(this._cursors.up)
    if (jumpPressed && body.blocked?.down) {
      body.setVelocityY(JUMP_V)
      this.cameras.main.flash(20, 120, 140, 200)
    }

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
    if (this._meleeFlash    > 0) this._meleeFlash    -= delta

    if (Phaser.Input.Keyboard.JustDown(this._zKey)) this._doMelee()
    if (Phaser.Input.Keyboard.JustDown(this._qKey)) this._doCorrupt()

    // Walker AI
    for (const e of this._enemies) {
      if (!e?.body) continue
      if (e.body.blocked?.right) { e.body.setVelocityX(-WALKER_V); e._dir = -1 }
      if (e.body.blocked?.left)  { e.body.setVelocityX(WALKER_V);  e._dir =  1 }
      if (e._hpBar) { e._hpBar.x = e.x; e._hpBar.y = e.y - 20 }
      if (e._sprite) {
        e._sprite.x = e.x
        e._sprite.y = e.y + (e._sprite._yOffset || 0)
        e._sprite.setFlipX(e._dir < 0)
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

    // Exit — right edge
    if (this._player.x > WORLD_W - 60) {
      this._sceneTransition('Ch2CloneScene', { slopState: this._slopState })
    }
  }
}
