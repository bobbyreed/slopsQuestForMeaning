// Chapter 2 Demo Scene — standalone combat/movement sandbox.
// Tests the Chapter 2 mechanics before full integration:
//   SHIFT = jump (dash repurposed; the only jump for now)
//   Z     = melee attack (prompt repurposed as a forward thrust)
//   Q     = weak AoE corrupt (same radius as Ch1 but shorter range, longer CD)
//
// Not wired into main progression. Launch via dev console.

import Phaser from 'phaser'
import { W, H } from '../config/constants.js'

// ── Constants ──────────────────────────────────────────────────────────────────

const WORLD_W = 2000
const GRAVITY = 520
const MOVE_V  = 200
const JUMP_V  = -460

const PLAYER_W = 18
const PLAYER_H = 34   // taller than Ch1 blob — Slop has a body now

const MELEE_RANGE    = 44
const MELEE_COOLDOWN = 300
const MELEE_FLASH_MS = 140

const CORRUPT_RADIUS   = 88
const CORRUPT_COOLDOWN = 2800
const CORRUPT_EXPAND   = 340

const WALKER_V      = 55
const ENEMY_RESPAWN = 7000
const HIT_IMMUNITY  = 800

// ── Enemy definitions (fixed spawn positions) ──────────────────────────────────

const ENEMY_DEFS = [
  // Section 1 — intro walkers on flat ground
  { x: 280,  y: H - 62, type: 'walker' },
  { x: 460,  y: H - 62, type: 'walker' },
  // Section 2 — platform gauntlet
  { x: 720,  y: H - 62, type: 'armored' },
  { x: 870,  y: H - 310, type: 'walker' },
  { x: 1030, y: H - 62, type: 'walker' },
  // Section 3 — gap section
  { x: 1380, y: H - 310, type: 'armored' },
  { x: 1530, y: H - 232, type: 'walker' },
  // Section 4 — AoE chamber (grouped for testing AoE)
  { x: 1820, y: H - 62, type: 'walker' },
  { x: 1880, y: H - 62, type: 'walker' },
  { x: 1940, y: H - 62, type: 'armored' },
]

// ── Scene ──────────────────────────────────────────────────────────────────────

export class Chapter2DemoScene extends Phaser.Scene {
  constructor() { super('Chapter2DemoScene') }

  init(data) {
    this._slopState     = data?.slopState || {}
    this._facing        = 1    // 1 = right, -1 = left
    this._meleeCooldown = 0
    this._corruptCD     = 0
    this._meleeFlash    = 0
    this._hitImmunity   = 0
    this._lastSafeX     = 80
    this._lastSafeY     = H - 90
    this._enemies       = []
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
  }

  // ── Background ────────────────────────────────────────────────────────────────

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

  // ── World building ────────────────────────────────────────────────────────────

  _buildWorld() {
    const g = (x, w)    => this._plat(x, H - 24, w, 48, 0xb4a494)
    const l = (x, y, w) => this._plat(x, y, w, 14, 0xa89888)
    const hi = (x, y, w) => this._plat(x, y, w, 14, 0x9c8c80)
    const s = (x, y, w) => this._plat(x, y, w, 14, 0x9a8898)  // strange tint

    // Section 1 — flat intro, plenty of ground to learn melee
    g(0, 620)
    l(190, H - 120, 140)
    l(380, H - 210, 110)

    // Section 2 — platform ascent
    g(650, 440)
    l(670, H - 160, 120)
    hi(840, H - 285, 100)
    l(990, H - 195, 130)

    // Section 3 — gap section (test jump precision)
    g(1190, 210)
    l(1160, H - 375, 90)
    l(1350, H - 295, 84)
    l(1510, H - 218, 92)
    g(1510, 300)

    // Section 4 — AoE chamber (grouped enemies on narrow ground)
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

  // ── Player ────────────────────────────────────────────────────────────────────

  _spawnPlayer(x, y) {
    this._player = this.add.rectangle(x, y, PLAYER_W, PLAYER_H, 0xc8b898)
    this.physics.add.existing(this._player)
    if (this._player.body) {
      this._player.body.setCollideWorldBounds(true)
    }
    this._player.setDepth(10)
    this.physics.add.collider(this._player, this._platforms)

    // Head — slightly lighter, sits above body
    this._head = this.add.rectangle(x, y - PLAYER_H / 2 - 7, 12, 12, 0xd4c8a0).setDepth(10)

    // Melee arm — hidden until attack
    this._arm = this.add.rectangle(x + 22, y - 4, 26, 10, 0xe8d8a8, 0).setDepth(11)

    // Small label
    this._playerLabel = this.add.text(x, y - PLAYER_H / 2 - 22, 'slop', {
      fontSize: '7px', color: '#8a7a6a', fontFamily: 'Courier New',
    }).setOrigin(0.5).setDepth(12)
  }

  // ── Enemies ───────────────────────────────────────────────────────────────────

  _spawnAllEnemies() {
    ENEMY_DEFS.forEach((def, i) => this._spawnEnemy(def, i))
  }

  _spawnEnemy(def, idx) {
    const isArmored = def.type === 'armored'
    const color = isArmored ? 0x706070 : 0x887060
    const e = this.add.rectangle(def.x, def.y, 16, 24, color)
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
      const bar = this.add.rectangle(def.x, def.y - 20, 14, 3, 0xdd6633).setDepth(9)
      e._hpBar = bar
    }

    this.physics.add.collider(e, this._platforms)
    this.physics.add.overlap(this._player, e, () => this._onPlayerEnemyContact(e))

    this._enemies.push(e)
    return e
  }

  // ── Combat ────────────────────────────────────────────────────────────────────

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

    // Primary ring
    const ring = this.add.rectangle(px, py, 12, 12, 0x7733aa, 0.65).setDepth(15)
    this.tweens.add({
      targets: ring,
      scaleX: CORRUPT_RADIUS / 6, scaleY: CORRUPT_RADIUS / 6,
      alpha: 0, duration: CORRUPT_EXPAND, ease: 'Quad.easeOut',
      onComplete: () => ring.destroy(),
    })

    // Echo ring — slightly delayed, gives depth
    this.time.delayedCall(90, () => {
      const ring2 = this.add.rectangle(px, py, 8, 8, 0x9944cc, 0.35).setDepth(14)
      this.tweens.add({
        targets: ring2,
        scaleX: CORRUPT_RADIUS / 4 / 2, scaleY: CORRUPT_RADIUS / 4 / 2,
        alpha: 0, duration: CORRUPT_EXPAND * 0.65, ease: 'Quad.easeOut',
        onComplete: () => ring2.destroy(),
      })
    })

    this.cameras.main.shake(80, 0.003)

    for (const enemy of this._enemies) {
      if (!enemy?.active) continue
      const dist = Phaser.Math.Distance.Between(px, py, enemy.x, enemy.y)
      if (dist <= CORRUPT_RADIUS) {
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

    if (enemy._hp <= 0) {
      this.time.delayedCall(80, () => this._killEnemy(enemy))
    }
  }

  _killEnemy(enemy) {
    if (!enemy?.active) return
    const defIdx = enemy._defIdx

    for (let i = 0; i < 5; i++) {
      const p = this.add.rectangle(
        enemy.x + Phaser.Math.Between(-6, 6),
        enemy.y + Phaser.Math.Between(-4, 4),
        Phaser.Math.Between(3, 6), Phaser.Math.Between(3, 6),
        enemy._type === 'armored' ? 0x9999cc : 0xcc9966
      ).setDepth(20)
      this.tweens.add({
        targets: p,
        x: p.x + Phaser.Math.Between(-45, 45),
        y: p.y + Phaser.Math.Between(-40, 8),
        alpha: 0, duration: 380, ease: 'Quad.easeOut',
        onComplete: () => p.destroy(),
      })
    }

    if (enemy._hpBar) enemy._hpBar.destroy()
    enemy.destroy()
    this._enemies = this._enemies.filter(e => e !== enemy)

    this.time.delayedCall(ENEMY_RESPAWN, () => {
      const def = ENEMY_DEFS[defIdx]
      if (!def) return
      this._spawnEnemy(def, defIdx)
    })
  }

  _onPlayerEnemyContact(enemy) {
    if (!enemy?.active) return
    if (this._hitImmunity > 0) return
    this._hitImmunity = HIT_IMMUNITY

    const dir = Math.sign(this._player.x - enemy.x) || 1
    if (this._player?.body) {
      this._player.body.setVelocityX(dir * 260)
      this._player.body.setVelocityY(-180)
    }

    this.cameras.main.shake(100, 0.004)
    this.cameras.main.flash(90, 220, 60, 60)

    this._player.setFillStyle(0xee5533)
    this.time.delayedCall(200, () => {
      if (this._player?.active) this._player.setFillStyle(0xc8b898)
    })
  }

  // ── HUD ───────────────────────────────────────────────────────────────────────

  _buildHUD() {
    const dim = { fontSize: '9px', color: '#8a7a6a', fontFamily: 'Courier New' }

    this.add.text(16, H - 44, '← →  move', dim).setScrollFactor(0).setDepth(30)
    this.add.text(112, H - 44, 'SHIFT  jump', dim).setScrollFactor(0).setDepth(30)
    this.add.text(222, H - 44, 'Z  attack', dim).setScrollFactor(0).setDepth(30)
    this.add.text(308, H - 44, 'Q  aoe', dim).setScrollFactor(0).setDepth(30)

    this._meleeLabel   = this.add.text(222, H - 28, 'ready', {
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
    if (this._meleeLabel) {
      this._meleeLabel.setText(
        this._meleeCooldown > 0 ? `${Math.ceil(this._meleeCooldown / 100) * 100}ms` : 'ready'
      )
    }
    if (this._corruptLabel) {
      this._corruptLabel.setText(
        this._corruptCD > 0 ? `${(this._corruptCD / 1000).toFixed(1)}s` : 'ready'
      )
    }
  }

  // ── Sync player visuals ───────────────────────────────────────────────────────

  _syncPlayerVisuals() {
    if (!this._player) return
    const px = this._player.x
    const py = this._player.y

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
      this._playerLabel.y = py - PLAYER_H / 2 - 22
    }
  }

  // ── Update ────────────────────────────────────────────────────────────────────

  update(_, delta) {
    if (!this._player?.body) return

    const body  = this._player.body
    const left  = this._cursors?.left?.isDown  || this._aKey?.isDown
    const right = this._cursors?.right?.isDown || this._dKey?.isDown

    if (left)       { body.setVelocityX(-MOVE_V); this._facing = -1 }
    else if (right) { body.setVelocityX(MOVE_V);  this._facing =  1 }
    else {
      body.setVelocityX(Math.abs(body.velocity.x) < 5 ? 0 : body.velocity.x * 0.78)
    }

    if (Phaser.Input.Keyboard.JustDown(this._shiftKey) && body.blocked?.down) {
      body.setVelocityY(JUMP_V)
      this.cameras.main.flash(30, 180, 160, 120)
    }

    if (this._player.y > H + 80) {
      this._player.x = this._lastSafeX
      this._player.y = this._lastSafeY - 50
      body.setVelocity(0, 0)
    } else if (body.blocked?.down) {
      this._lastSafeX = this._player.x
      this._lastSafeY = this._player.y
    }

    if (this._meleeCooldown > 0)   this._meleeCooldown -= delta
    if (this._corruptCD > 0)       this._corruptCD     -= delta
    if (this._hitImmunity > 0)     this._hitImmunity   -= delta

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
      if (enemy._hpBar) {
        enemy._hpBar.x = enemy.x
        enemy._hpBar.y = enemy.y - 20
      }
    }

    this._syncPlayerVisuals()
    this._updateHUD()
  }
}
