// Chapter 2 Demo Scene — standalone combat/movement sandbox.
// Tests the Chapter 2 mechanics before full integration:
//   ← →   move
//   SHIFT  jump
//   Z      melee attack
//   Q      AoE corrupt
//
// Sprite animations loaded from Firestore (walk / dash configs).
// Not wired into main progression. Launch via dev console.

import Phaser from 'phaser'
import { W, H } from '../config/constants.js'
import { AnimConfig } from '../firestore/AnimConfig.js'
import { buildProcessedTexture } from '../util/colorKey.js'

// ── Constants ──────────────────────────────────────────────────────────────────

const ASSET_PATH = 'media/generated/'

const SHEET_META = {
  'ch2-slop-movement-sheet-chatgpt': { w: 1536, h: 1024 },
  'ch2-slop-movement-sheet':         { w: 1376, h: 768  },
  'ch2-overview-sheet-v1':           { w: 1376, h: 768  },
  'ch2-overview-sheet-v2':           { w: 1376, h: 768  },
  'ch2-enemy-bestiary-sheet':        { w: 1376, h: 768  },
  'ch2-env-tileset-sheet':           { w: 1376, h: 768  },
}

// Sprite visual scale — tune this if the character looks too large/small
const SPRITE_SCALE = 1.0

const WORLD_W = 2000
const GRAVITY = 520
const MOVE_V  = 200
const JUMP_V  = -460

const PLAYER_W = 18
const PLAYER_H = 34

const MELEE_RANGE    = 44
const MELEE_COOLDOWN = 300
const MELEE_FLASH_MS = 140

const CORRUPT_RADIUS   = 88
const CORRUPT_COOLDOWN = 2800
const CORRUPT_EXPAND   = 340

const WALKER_V      = 55
const ENEMY_RESPAWN = 7000
const HIT_IMMUNITY  = 800

const ENEMY_DEFS = [
  { x: 280,  y: H - 62,  type: 'walker'  },
  { x: 460,  y: H - 62,  type: 'walker'  },
  { x: 720,  y: H - 62,  type: 'armored' },
  { x: 870,  y: H - 310, type: 'walker'  },
  { x: 1030, y: H - 62,  type: 'walker'  },
  { x: 1380, y: H - 310, type: 'armored' },
  { x: 1530, y: H - 232, type: 'walker'  },
  { x: 1820, y: H - 62,  type: 'walker'  },
  { x: 1880, y: H - 62,  type: 'walker'  },
  { x: 1940, y: H - 62,  type: 'armored' },
]

// ── Scene ──────────────────────────────────────────────────────────────────────

export class Chapter2DemoScene extends Phaser.Scene {
  constructor() { super('Chapter2DemoScene') }

  // ── Lifecycle ──────────────────────────────────────────────────────────────

  preload() {
    const toLoad = Object.keys(SHEET_META).filter(k => !this.textures.exists(k))
    if (!toLoad.length) return

    const barX = W / 2 - 150
    const barY = H / 2 + 28
    this.add.rectangle(barX, barY, 300, 5, 0x1a1a1a).setOrigin(0, 0.5)
    const bar  = this.add.rectangle(barX, barY, 0, 5, 0x887766).setOrigin(0, 0.5)
    const lTxt = this.add.text(W / 2, H / 2, 'loading…', {
      fontSize: '12px', color: '#887766', fontFamily: 'Courier New',
    }).setOrigin(0.5)

    this.load.on('progress', v => { bar.width = v * 300; lTxt.setText(`loading… ${Math.round(v * 100)}%`) })
    this.load.on('complete', () => { bar.destroy(); lTxt.destroy() })

    toLoad.forEach(k => this.load.image(k, `${ASSET_PATH}${k}.png`))
  }

  init(data) {
    this._slopState     = data?.slopState || {}
    this._facing        = 1
    this._meleeCooldown = 0
    this._corruptCD     = 0
    this._meleeFlash    = 0
    this._hitImmunity   = 0
    this._lastSafeX     = 80
    this._lastSafeY     = H - 90
    this._enemies       = []
    this._sprite        = null
    this._animState     = null
    this._walkAnimKey   = null
    this._dashAnimKey   = null
    this._spriteYOffset = 0
  }

  create() {
    if (this.physics?.world?.gravity) this.physics.world.gravity.y = GRAVITY
    if (this.physics?.world?.setBounds) this.physics.world.setBounds(0, 0, WORLD_W, H + 200)

    this._buildBackground()
    this._platforms = this.physics.add.staticGroup()
    this._buildWorld()

    this._spawnPlayer(80, H - 90)
    this._spawnAllEnemies()

    this._cursors  = this.input.keyboard.createCursorKeys()
    this._aKey     = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A)
    this._dKey     = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D)
    this._shiftKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SHIFT)
    this._zKey     = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.Z)
    this._qKey     = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.Q)

    if (this.cameras?.main?.startFollow) this.cameras.main.startFollow(this._player, true, 0.09, 0.09)
    if (this.cameras?.main?.setBounds)   this.cameras.main.setBounds(0, 0, WORLD_W, H)

    this._buildHUD()
    this.cameras.main.fadeIn(500, 0, 0, 0)

    this._animLoadText = this.add.text(W / 2, 36, 'loading animations…', {
      fontSize: '10px', color: '#776655', fontFamily: 'Courier New',
    }).setOrigin(0.5).setScrollFactor(0).setDepth(50)

    this._loadAnimConfigs()
  }

  // ── Sprite setup (async) ───────────────────────────────────────────────────

  async _loadAnimConfigs() {
    try {
      const configs = await AnimConfig.loadAll()

      const walkCfg = configs.find(c => c.label?.toLowerCase().includes('walk'))
      const dashCfg = configs.find(c => c.label?.toLowerCase().includes('dash'))

      if (walkCfg || dashCfg) {
        // Color-key every unique sheet referenced by found configs
        const sheetKeys = [...new Set([walkCfg?.sheetKey, dashCfg?.sheetKey].filter(Boolean))]
        sheetKeys.forEach(sk => {
          if (this.textures.exists(sk)) this._buildProcessedTexture(sk)
        })

        if (walkCfg) this._registerAnim('slop-walk', walkCfg)
        if (dashCfg) this._registerAnim('slop-dash', dashCfg)

        this._walkAnimKey = walkCfg ? 'slop-walk' : null
        this._dashAnimKey = dashCfg ? 'slop-dash' : null

        this._attachSprite(walkCfg || dashCfg)
      }
    } catch (e) {
      console.warn('[Ch2Demo] anim config load failed:', e.message)
    }

    this._animLoadText?.destroy()
    this._animLoadText = null
  }

  _buildProcessedTexture(sheetKey) {
    buildProcessedTexture(this.textures, sheetKey, SHEET_META)
  }

  _registerAnim(animKey, cfg) {
    const procKey = 'proc-' + cfg.sheetKey
    if (!this.textures.exists(procKey)) return

    const tex = this.textures.get(procKey)
    cfg.frames.forEach((f, i) => {
      const name = `${animKey}-${i}`
      if (!tex.has(name)) tex.add(name, 0, f.x, f.y, f.w, f.h)
    })

    if (!this.anims.exists(animKey)) {
      this.anims.create({
        key:       animKey,
        frames:    cfg.frames.map((_, i) => ({ key: procKey, frame: `${animKey}-${i}` })),
        frameRate: cfg.frameRate || 8,
        repeat:    -1,
      })
    }
  }

  _attachSprite(cfg) {
    const procKey = 'proc-' + cfg.sheetKey
    if (!this.textures.exists(procKey)) return

    // Compute Y offset so sprite feet align with physics rectangle bottom
    const frame0 = cfg.frames[0]
    this._spriteYOffset = (PLAYER_H - frame0.h * SPRITE_SCALE) / 2

    this._sprite = this.add.sprite(
      this._player.x,
      this._player.y + this._spriteYOffset,
      procKey,
      (this._walkAnimKey || this._dashAnimKey) + '-0'
    ).setScale(SPRITE_SCALE).setDepth(10)

    // Hide the placeholder rectangle and head; sprite owns the visuals now
    this._player.setAlpha(0)
    this._head?.destroy()
    this._head = null

    // Start in walk state so the animation plays immediately
    this._animState = null
    if (this._walkAnimKey) this._sprite.play(this._walkAnimKey)
  }

  // ── Animation state ────────────────────────────────────────────────────────

  _setAnimState(state) {
    if (!this._sprite || this._animState === state) return
    this._animState = state

    switch (state) {
      case 'walk':
        if (this._walkAnimKey) this._sprite.play(this._walkAnimKey)
        break
      case 'idle':
        // Pause on current walk frame rather than snapping to frame 0
        this._sprite.anims.pause()
        break
      case 'air':
        if (this._dashAnimKey) this._sprite.play(this._dashAnimKey)
        else if (this._walkAnimKey) this._sprite.play(this._walkAnimKey)
        break
    }
  }

  // ── Background ─────────────────────────────────────────────────────────────

  _buildBackground() {
    this.add.rectangle(WORLD_W / 2, H / 2, WORLD_W, H, 0xede4d4)

    for (let i = 0; i < 14; i++) {
      this.add.rectangle(
        i * 152 + 76, H - 55 - (i % 3) * 24, 136, 60 + (i % 4) * 14, 0xd8ccbc, 0.4
      ).setScrollFactor(0.25)
    }
    for (let i = 0; i < 12; i++) {
      this.add.rectangle(
        i * 188 + 94, H * 0.38, 1, H * 0.55, 0xc0b4a4, 0.2
      ).setScrollFactor(0.5)
    }
  }

  // ── World building ─────────────────────────────────────────────────────────

  _buildWorld() {
    const g  = (x, w)    => this._plat(x, H - 24,  w, 48, 0xb4a494)
    const l  = (x, y, w) => this._plat(x, y,        w, 14, 0xa89888)
    const hi = (x, y, w) => this._plat(x, y,        w, 14, 0x9c8c80)
    const s  = (x, y, w) => this._plat(x, y,        w, 14, 0x9a8898)

    g(0, 620)
    l(190, H - 120, 140)
    l(380, H - 210, 110)

    g(650, 440)
    l(670, H - 160, 120)
    hi(840, H - 285, 100)
    l(990, H - 195, 130)

    g(1190, 210)
    l(1160, H - 375, 90)
    l(1350, H - 295, 84)
    l(1510, H - 218, 92)
    g(1510, 300)

    g(1820, 180)
    s(1760, H - 270, 120)
    s(1970, H - 370, 110)
  }

  _plat(x, y, w, h, color) {
    const r = this.add.rectangle(x + w / 2, y, w, h, color)
    this.physics.add.existing(r, true)
    this._platforms.add(r)
    return r
  }

  // ── Player ─────────────────────────────────────────────────────────────────

  _spawnPlayer(x, y) {
    // Physics rectangle — stays as the physics body throughout
    this._player = this.add.rectangle(x, y, PLAYER_W, PLAYER_H, 0xc8b898)
    this.physics.add.existing(this._player)
    if (this._player.body) this._player.body.setCollideWorldBounds(true)
    this._player.setDepth(10)
    this.physics.add.collider(this._player, this._platforms)

    // Placeholder visuals (hidden when sprite loads)
    this._head = this.add.rectangle(x, y - PLAYER_H / 2 - 7, 12, 12, 0xd4c8a0).setDepth(10)
    this._arm  = this.add.rectangle(x + 22, y - 4, 26, 10, 0xe8d8a8, 0).setDepth(11)

    this._playerLabel = this.add.text(x, y - PLAYER_H / 2 - 22, 'slop', {
      fontSize: '7px', color: '#8a7a6a', fontFamily: 'Courier New',
    }).setOrigin(0.5).setDepth(12)
  }

  // ── Enemies ────────────────────────────────────────────────────────────────

  _spawnAllEnemies() {
    ENEMY_DEFS.forEach((def, i) => this._spawnEnemy(def, i))
  }

  _spawnEnemy(def, idx) {
    const isArmored = def.type === 'armored'
    const e = this.add.rectangle(def.x, def.y, 16, 24, isArmored ? 0x706070 : 0x887060)
    this.physics.add.existing(e)
    if (e.body) {
      e.body.setCollideWorldBounds(true)
      e.body.setVelocityX(WALKER_V * (idx % 2 === 0 ? 1 : -1))
    }
    e._dir    = idx % 2 === 0 ? 1 : -1
    e._hp     = isArmored ? 2 : 1
    e._maxHp  = e._hp
    e._type   = def.type
    e._defIdx = idx
    e.setDepth(8)

    if (isArmored) {
      e._hpBar = this.add.rectangle(def.x, def.y - 20, 14, 3, 0xdd6633).setDepth(9)
    }

    this.physics.add.collider(e, this._platforms)
    this.physics.add.overlap(this._player, e, () => this._onPlayerEnemyContact(e))

    this._enemies.push(e)
    return e
  }

  // ── Combat ─────────────────────────────────────────────────────────────────

  _doMeleeAttack() {
    if (this._meleeCooldown > 0) return
    this._meleeCooldown = MELEE_COOLDOWN
    this._meleeFlash    = MELEE_FLASH_MS

    this._arm?.setAlpha(0.88)
    this.cameras.main.flash(50, 200, 160, 80)

    const px = this._player.x
    const py = this._player.y

    for (const enemy of this._enemies) {
      if (!enemy?.active) continue
      const dx = enemy.x - px
      if (Math.sign(dx) !== this._facing && Math.abs(dx) > 6) continue
      if (Math.abs(dx) < MELEE_RANGE + 8 && Math.abs(enemy.y - py) < 26) {
        this._hitEnemy(enemy, 1)
      }
    }
  }

  _doCorruptAoE() {
    if (this._corruptCD > 0) return
    this._corruptCD = CORRUPT_COOLDOWN

    const px = this._player.x
    const py = this._player.y

    const ring = this.add.rectangle(px, py, 12, 12, 0x7733aa, 0.65).setDepth(15)
    this.tweens.add({
      targets: ring, scaleX: CORRUPT_RADIUS / 6, scaleY: CORRUPT_RADIUS / 6,
      alpha: 0, duration: CORRUPT_EXPAND, ease: 'Quad.easeOut',
      onComplete: () => ring.destroy(),
    })

    this.time.delayedCall(90, () => {
      const ring2 = this.add.rectangle(px, py, 8, 8, 0x9944cc, 0.35).setDepth(14)
      this.tweens.add({
        targets: ring2, scaleX: CORRUPT_RADIUS / 8, scaleY: CORRUPT_RADIUS / 8,
        alpha: 0, duration: CORRUPT_EXPAND * 0.65, ease: 'Quad.easeOut',
        onComplete: () => ring2.destroy(),
      })
    })

    this.cameras.main.shake(80, 0.003)

    for (const enemy of this._enemies) {
      if (!enemy?.active) continue
      if (Phaser.Math.Distance.Between(px, py, enemy.x, enemy.y) <= CORRUPT_RADIUS) {
        this._hitEnemy(enemy, 1)
      }
    }
  }

  _hitEnemy(enemy, dmg) {
    if (!enemy?.active) return
    enemy._hp -= dmg

    this.tweens.add({
      targets: enemy, alpha: 0.2, duration: 70, yoyo: true, repeat: 1,
      onComplete: () => { if (enemy?.active) enemy.setAlpha(1) },
    })

    if (enemy._hpBar) {
      const ratio = Math.max(0, enemy._hp / enemy._maxHp)
      enemy._hpBar.scaleX = ratio
      enemy._hpBar.setFillStyle(ratio > 0.5 ? 0xdd6633 : 0xdd2222)
    }

    if (enemy._hp <= 0) this.time.delayedCall(80, () => this._killEnemy(enemy))
  }

  _killEnemy(enemy) {
    if (!enemy?.active) return
    const defIdx = enemy._defIdx

    for (let i = 0; i < 5; i++) {
      const p = this.add.rectangle(
        enemy.x + Phaser.Math.Between(-6, 6), enemy.y + Phaser.Math.Between(-4, 4),
        Phaser.Math.Between(3, 6), Phaser.Math.Between(3, 6),
        enemy._type === 'armored' ? 0x9999cc : 0xcc9966
      ).setDepth(20)
      this.tweens.add({
        targets: p,
        x: p.x + Phaser.Math.Between(-45, 45), y: p.y + Phaser.Math.Between(-40, 8),
        alpha: 0, duration: 380, ease: 'Quad.easeOut',
        onComplete: () => p.destroy(),
      })
    }

    if (enemy._hpBar) enemy._hpBar.destroy()
    enemy.destroy()
    this._enemies = this._enemies.filter(e => e !== enemy)

    this.time.delayedCall(ENEMY_RESPAWN, () => {
      const def = ENEMY_DEFS[defIdx]
      if (def) this._spawnEnemy(def, defIdx)
    })
  }

  _onPlayerEnemyContact(enemy) {
    if (!enemy?.active || this._hitImmunity > 0) return
    this._hitImmunity = HIT_IMMUNITY

    const dir = Math.sign(this._player.x - enemy.x) || 1
    if (this._player?.body) {
      this._player.body.setVelocityX(dir * 260)
      this._player.body.setVelocityY(-180)
    }

    this.cameras.main.shake(100, 0.004)
    this.cameras.main.flash(90, 220, 60, 60)

    // Flash the sprite (or rectangle) on hit
    const visual = this._sprite || this._player
    const origAlpha = visual.alpha
    this.tweens.add({
      targets: visual, alpha: 0.2, duration: 60, yoyo: true, repeat: 2,
      onComplete: () => { if (visual?.active) visual.setAlpha(origAlpha) },
    })
  }

  // ── HUD ────────────────────────────────────────────────────────────────────

  _buildHUD() {
    const dim = { fontSize: '9px', color: '#8a7a6a', fontFamily: 'Courier New' }

    this.add.text(16,  H - 44, '← →  move',   dim).setScrollFactor(0).setDepth(30)
    this.add.text(112, H - 44, 'SHIFT  jump',  dim).setScrollFactor(0).setDepth(30)
    this.add.text(222, H - 44, 'Z  attack',    dim).setScrollFactor(0).setDepth(30)
    this.add.text(308, H - 44, 'Q  aoe',       dim).setScrollFactor(0).setDepth(30)

    this._meleeLabel = this.add.text(222, H - 28, 'ready', {
      fontSize: '8px', color: '#cc9966', fontFamily: 'Courier New',
    }).setScrollFactor(0).setDepth(30)

    this._corruptLabel = this.add.text(308, H - 28, 'ready', {
      fontSize: '8px', color: '#9966cc', fontFamily: 'Courier New',
    }).setScrollFactor(0).setDepth(30)

    this.add.text(W / 2, 18, 'chapter 2  //  demo', {
      fontSize: '10px', color: '#998880', fontFamily: 'Courier New', letterSpacing: 3,
    }).setOrigin(0.5).setScrollFactor(0).setDepth(30)
  }

  _updateHUD() {
    this._meleeLabel?.setText(
      this._meleeCooldown > 0 ? `${Math.ceil(this._meleeCooldown / 100) * 100}ms` : 'ready'
    )
    this._corruptLabel?.setText(
      this._corruptCD > 0 ? `${(this._corruptCD / 1000).toFixed(1)}s` : 'ready'
    )
  }

  // ── Sync visuals ───────────────────────────────────────────────────────────

  _syncPlayerVisuals() {
    if (!this._player) return
    const px = this._player.x
    const py = this._player.y

    if (this._sprite) {
      this._sprite.x = px
      this._sprite.y = py + this._spriteYOffset
      this._sprite.setFlipX(this._facing < 0)
    }

    if (this._head) {
      this._head.x = px
      this._head.y = py - PLAYER_H / 2 - 7
    }

    if (this._arm) {
      this._arm.x = px + this._facing * (PLAYER_W / 2 + 13)
      this._arm.y = py - 4
    }

    if (this._playerLabel) {
      this._playerLabel.x = px
      this._playerLabel.y = py - PLAYER_H / 2 - (this._sprite ? this._spriteYOffset * -1 + 10 : 22)
    }
  }

  // ── Update ─────────────────────────────────────────────────────────────────

  update(_, delta) {
    if (!this._player?.body) return

    const body    = this._player.body
    const left    = this._cursors?.left?.isDown  || this._aKey?.isDown
    const right   = this._cursors?.right?.isDown || this._dKey?.isDown
    const grounded = body.blocked?.down

    if (left)       { body.setVelocityX(-MOVE_V); this._facing = -1 }
    else if (right) { body.setVelocityX(MOVE_V);  this._facing =  1 }
    else {
      body.setVelocityX(Math.abs(body.velocity.x) < 5 ? 0 : body.velocity.x * 0.78)
    }

    if (Phaser.Input.Keyboard.JustDown(this._shiftKey) && grounded) {
      body.setVelocityY(JUMP_V)
      this.cameras.main.flash(30, 180, 160, 120)
    }

    // Pit recovery
    if (this._player.y > H + 80) {
      this._player.x = this._lastSafeX
      this._player.y = this._lastSafeY - 50
      body.setVelocity(0, 0)
    } else if (grounded) {
      this._lastSafeX = this._player.x
      this._lastSafeY = this._player.y
    }

    // Animation state
    const moving = Math.abs(body.velocity.x) > 10
    if (!grounded)      this._setAnimState('air')
    else if (moving)    this._setAnimState('walk')
    else                this._setAnimState('idle')

    // Cooldowns
    if (this._meleeCooldown > 0) this._meleeCooldown -= delta
    if (this._corruptCD     > 0) this._corruptCD     -= delta
    if (this._hitImmunity   > 0) this._hitImmunity   -= delta

    if (this._meleeFlash > 0) {
      this._meleeFlash -= delta
      if (this._meleeFlash <= 0 && this._arm) this._arm.setAlpha(0)
    }

    if (Phaser.Input.Keyboard.JustDown(this._zKey)) this._doMeleeAttack()
    if (Phaser.Input.Keyboard.JustDown(this._qKey)) this._doCorruptAoE()

    for (const enemy of this._enemies) {
      if (!enemy?.body) continue
      if (enemy.body.blocked?.right) { enemy.body.setVelocityX(-WALKER_V); enemy._dir = -1 }
      if (enemy.body.blocked?.left)  { enemy.body.setVelocityX(WALKER_V);  enemy._dir =  1 }
      if (enemy._hpBar) { enemy._hpBar.x = enemy.x; enemy._hpBar.y = enemy.y - 20 }
    }

    this._syncPlayerVisuals()
    this._updateHUD()
  }
}
