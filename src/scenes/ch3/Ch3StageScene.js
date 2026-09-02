// Chapter 3 — The Climb (beat-'em-up stage)
//
// A side-scrolling brawl up through the stack toward THE AUTHOR. Mechanics are
// adapted from the slopsBeatEmUpDemo template into this project's idiom: manual
// floor-band movement, a z-height hop with a ground shadow, wave gates that lock
// the advance until cleared, and distance-math combat (punch / kick) in the same
// style as Ch2OpeningScene's melee. Procedural art (rectangles), Slop palette;
// Firestore Slop sprites are a later polish pass.
//
// Controls: arrows / WASD move · J punch · K kick · SPACE jump
// Exit: reach the end of the stage → Ch3BossScene (THE AUTHOR), carrying health.

import Phaser   from 'phaser'
import { W, H } from '../../config/constants.js'

const WORLD_W   = 3000
const FLOOR_TOP = 408   // walkable band (groundY), near the bottom of the 600px canvas
const FLOOR_BOT = 560

const CH3 = {
  player: {
    speed: 200, health: 100,
    punchDamage: 8, kickDamage: 14,
    punchRange: 60, kickRange: 78,
    punchCooldown: 220, kickCooldown: 380,
    attackY: 28,
    jumpVelocity: 560, gravity: 1800, airDodgeZ: 38,
  },
  enemy: {
    speed: 84, health: 30, damage: 6,
    attackRange: 54, attackCooldown: 950, aggroRange: 480,
  },
  bossTriggerX: WORLD_W - 160,
}

// Waves placed along the stage. Each is a gate: the advance locks until the
// wave is cleared, then a ▶ prompt lets the player move on. [x, y] are spawn
// positions; `x` is the trigger the player must reach to start the wave.
const WAVES = [
  { x: 620,  spawns: [[700, 470], [820, 520], [760, 430]] },
  { x: 1340, spawns: [[1420, 480], [1540, 440], [1480, 530], [1600, 470]] },
  { x: 2160, spawns: [[2240, 470], [2360, 520], [2300, 430], [2440, 500], [2380, 545]] },
]

const TITLE = 'chapter 3  //  the climb'

export class Ch3StageScene extends Phaser.Scene {
  constructor() { super('Ch3StageScene') }

  init(data) {
    this._slopState   = data?.slopState || {}
    this._hp          = typeof data?.playerHealth === 'number' ? data.playerHealth : CH3.player.health
    this._enemies     = []
    this._z           = 0
    this._vz          = 0
    this._facing      = 1
    this._isAttacking = false
    this._canPunch    = true
    this._canKick     = true
    this._meleeFlash  = 0
    this._currentWave = 0
    this._gateActive  = false
    this._gateLockX   = 0
    this._advancing   = true
    this._bossStarted = false
    this._gameOver    = false
    this._transitioning = false
  }

  create() {
    if (this.physics?.world?.gravity) this.physics.world.gravity.y = 0
    if (this.physics?.world?.setBounds) this.physics.world.setBounds(0, 0, WORLD_W, H)

    this._buildBackground()
    this._buildFloor()

    // Player — invisible hit point drives position; a visible body + shadow are
    // drawn each frame at (x, groundY - z) / (x, groundY).
    this._px = 120
    this._groundY = FLOOR_BOT - 30
    this._playerShadow = this.add.circle(this._px, this._groundY, 16, 0x000000, 0.32).setDepth(1)
    this._player = this.add.rectangle(this._px, this._groundY, 22, 30, 0xd4c8a0).setDepth(10)

    this._cursors  = this.input.keyboard.createCursorKeys()
    this._aKey     = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A)
    this._dKey     = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D)
    this._wKey     = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W)
    this._sKey     = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S)
    this._jKey     = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.J)
    this._kKey     = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.K)
    this._spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE)

    if (this.cameras?.main?.startFollow) this.cameras.main.startFollow(this._player, true, 0.1, 0.1)
    if (this.cameras?.main?.setBounds)   this.cameras.main.setBounds(0, 0, WORLD_W, H)
    if (this.cameras?.main?.setDeadzone) this.cameras.main.setDeadzone(220, H)

    this._buildHUD()
    this.cameras.main.fadeIn(600, 0, 0, 0)
  }

  // ── World ──────────────────────────────────────────────────────────────────

  _buildBackground() {
    this.add.rectangle(WORLD_W / 2, H / 2, WORLD_W, H, 0x161020).setDepth(-100)
    // Parallax "stack" silhouettes climbing into the dark.
    for (let i = 0; i < 26; i++) {
      this.add.rectangle(
        i * 120 + 60, FLOOR_TOP - 40 - (i % 4) * 30,
        18, 80 + (i % 5) * 26, 0x0f0a18, 0.7
      ).setScrollFactor(0.3).setDepth(-90)
    }
  }

  _buildFloor() {
    this.add.rectangle(WORLD_W / 2, (FLOOR_TOP + H) / 2, WORLD_W, H - FLOOR_TOP + 40, 0x241c2e).setDepth(-50)
    this.add.rectangle(WORLD_W / 2, FLOOR_TOP, WORLD_W, 4, 0x3a3048).setDepth(-49)
  }

  _buildHUD() {
    this.add.rectangle(16, 16, 246, 22, 0x000000, 0.5).setOrigin(0, 0).setScrollFactor(0).setDepth(10000)
    this._hpBar = this.add.rectangle(19, 19, 240, 16, 0x9988cc).setOrigin(0, 0).setScrollFactor(0).setDepth(10001)
    this.add.text(22, 19, 'SLOP', { fontSize: '10px', color: '#150f22', fontFamily: 'Courier New' })
      .setScrollFactor(0).setDepth(10002)

    this.add.text(W / 2, 22, TITLE, {
      fontSize: '10px', color: '#8877aa', fontFamily: 'Courier New', letterSpacing: 3,
    }).setOrigin(0.5).setScrollFactor(0).setDepth(10000)

    this.add.text(16, H - 22, 'arrows / WASD  move   ·   J  punch   ·   K  kick   ·   SPACE  jump', {
      fontSize: '9px', color: '#665577', fontFamily: 'Courier New',
    }).setScrollFactor(0).setDepth(10000)

    this._banner = this.add.text(W / 2, 120, '', {
      fontSize: '30px', color: '#c8b8e8', fontFamily: 'Courier New', stroke: '#000', strokeThickness: 5,
    }).setOrigin(0.5).setScrollFactor(0).setDepth(10010).setAlpha(0)

    this._goArrow = this.add.text(W - 50, H / 2, '▶', {
      fontSize: '44px', color: '#c8b8e8', fontFamily: 'Courier New',
    }).setOrigin(0.5).setScrollFactor(0).setDepth(10010).setAlpha(0)
  }

  // ── Enemies ──────────────────────────────────────────────────────────────────

  _spawnWave(wave) {
    this._advancing  = false
    this._gateActive = true
    this._gateLockX  = wave.x + 180
    wave.spawns.forEach(([x, y]) => {
      const groundY = Phaser.Math.Clamp(y, FLOOR_TOP, FLOOR_BOT)
      const shadow  = this.add.circle(x, groundY, 15, 0x000000, 0.3).setDepth(1)
      const rect    = this.add.rectangle(x, groundY, 20, 28, 0x664466).setDepth(10)
      this._enemies.push({
        x, groundY, facing: -1, hp: CH3.enemy.health, maxHp: CH3.enemy.health,
        nextAttack: 0, dead: false, rect, shadow,
      })
    })
    this._flashBanner('INCOMING!')
  }

  _aliveEnemies() {
    return this._enemies.filter(e => !e.dead).length
  }

  // ── Combat ─────────────────────────────────────────────────────────────────

  _attack(type) {
    const isPunch = type === 'punch'
    if (this._isAttacking) return
    if (isPunch && !this._canPunch) return
    if (!isPunch && !this._canKick) return

    this._isAttacking = true
    this._meleeFlash  = isPunch ? 120 : 160
    const damage   = isPunch ? CH3.player.punchDamage : CH3.player.kickDamage
    const range    = isPunch ? CH3.player.punchRange  : CH3.player.kickRange
    const cooldown = isPunch ? CH3.player.punchCooldown : CH3.player.kickCooldown

    this._spawnStrike(range, isPunch)
    this.time.delayedCall(isPunch ? 50 : 90, () => this._dealHit(range, damage))
    this.time.delayedCall(isPunch ? 160 : 240, () => { this._isAttacking = false })

    if (isPunch) { this._canPunch = false; this.time.delayedCall(cooldown, () => { this._canPunch = true }) }
    else         { this._canKick  = false; this.time.delayedCall(cooldown, () => { this._canKick  = true }) }
  }

  // Visible swipe in front of Slop so the strike reads on screen.
  _spawnStrike(range, isPunch) {
    const sx = this._px + this._facing * (range / 2)
    const strike = this.add.rectangle(sx, this._groundY - this._z - 8, range, isPunch ? 14 : 22,
      isPunch ? 0xffe0a0 : 0xffc070, 0.85).setDepth(14)
    strike.scaleX = 0.3
    this.tweens.add({
      targets: strike, scaleX: 1.4, alpha: 0,
      duration: isPunch ? 150 : 200, ease: 'Quad.easeOut',
      onComplete: () => strike.destroy(),
    })
  }

  _dealHit(range, damage) {
    let connected = false
    for (const e of this._enemies) {
      if (e.dead) continue
      const inFront = (e.x - this._px) * this._facing > -10
      const dx = Math.abs(e.x - this._px)
      const dy = Math.abs(e.groundY - this._groundY)
      if (inFront && dx <= range && dy <= CH3.player.attackY) {
        this._hitEnemy(e, damage)
        connected = true
      }
    }
    if (connected) this.cameras.main.shake(80, 0.005)
  }

  _hitEnemy(e, damage) {
    if (e.dead) return
    e.hp = Math.max(0, e.hp - damage)
    // knockback away from Slop
    e.x += (e.x < this._px ? -1 : 1) * 18
    e.rect.setFillStyle(0xffffff)
    this.time.delayedCall(70, () => { if (!e.dead) e.rect.setFillStyle(0x664466) })
    if (e.hp <= 0) this._killEnemy(e)
  }

  _killEnemy(e) {
    e.dead = true
    for (let i = 0; i < 6; i++) {
      const p = this.add.rectangle(
        e.x + Phaser.Math.Between(-8, 8), e.groundY - 12 + Phaser.Math.Between(-8, 8),
        Phaser.Math.Between(3, 6), Phaser.Math.Between(3, 6), 0x9977aa
      ).setDepth(20)
      this.tweens.add({
        targets: p, x: p.x + Phaser.Math.Between(-50, 50), y: p.y + Phaser.Math.Between(-40, 10),
        alpha: 0, duration: 420, ease: 'Quad.easeOut', onComplete: () => p.destroy(),
      })
    }
    e.shadow.destroy()
    this.tweens.add({
      targets: e.rect, alpha: 0, angle: e.facing * 80, duration: 380,
      onComplete: () => e.rect.destroy(),
    })
  }

  _damagePlayer(amount, fromX) {
    if (this._gameOver) return
    this._hp = Math.max(0, this._hp - amount)
    this._px += (this._px < fromX ? -1 : 1) * 22
    this.cameras.main.shake(110, 0.008)
    this.cameras.main.flash(110, 120, 0, 40)
    if (this._hp <= 0) this._handleGameOver()
  }

  // ── Banners ──────────────────────────────────────────────────────────────────

  _flashBanner(text) {
    this._banner.setText(text).setAlpha(1).setScale(0.6)
    this.tweens.add({ targets: this._banner, scale: 1, duration: 180, ease: 'Back.easeOut' })
    this.tweens.add({ targets: this._banner, alpha: 0, delay: 850, duration: 380 })
  }

  _showGoArrow() {
    this._goArrow.setAlpha(1)
    this.tweens.add({
      targets: this._goArrow, x: W - 30, duration: 480, yoyo: true, repeat: 4,
      onComplete: () => this._goArrow.setAlpha(0),
    })
  }

  // ── Update ─────────────────────────────────────────────────────────────────

  update(_, delta) {
    if (this._transitioning || this._gameOver) return
    const dt = delta / 1000

    this._updatePlayer(dt)
    this._updateEnemies(delta)
    this._updateWaves()
    this._render()
    this._updateHUD()

    if (this._meleeFlash > 0) this._meleeFlash -= delta

    if (!this._bossStarted && this._advancing && this._px >= CH3.bossTriggerX) {
      this._startBoss()
    }
  }

  _updatePlayer(dt) {
    // Jump (manual z integration; arcade gravity stays off for top-down).
    if (this._z === 0 && this._vz === 0 && Phaser.Input.Keyboard.JustDown(this._spaceKey)) {
      this._vz = CH3.player.jumpVelocity
    }
    if (this._z > 0 || this._vz > 0) {
      this._vz -= CH3.player.gravity * dt
      this._z  += this._vz * dt
      if (this._z <= 0) { this._z = 0; this._vz = 0 }
    }

    const left  = this._cursors?.left?.isDown  || this._aKey?.isDown
    const right = this._cursors?.right?.isDown || this._dKey?.isDown
    const up    = this._cursors?.up?.isDown    || this._wKey?.isDown
    const down  = this._cursors?.down?.isDown  || this._sKey?.isDown

    if (!this._isAttacking) {
      let vx = 0, vy = 0
      if (left)  { vx = -CH3.player.speed; this._facing = -1 }
      else if (right) { vx = CH3.player.speed; this._facing = 1 }
      if (up)    vy = -CH3.player.speed
      else if (down) vy = CH3.player.speed
      if (vx !== 0 && vy !== 0) { vx *= Math.SQRT1_2; vy *= Math.SQRT1_2 }
      this._px      += vx * dt
      this._groundY += vy * dt
    }

    this._px      = Phaser.Math.Clamp(this._px, 20, WORLD_W - 20)
    this._groundY = Phaser.Math.Clamp(this._groundY, FLOOR_TOP, FLOOR_BOT)
    if (this._gateActive) this._px = Math.min(this._px, this._gateLockX)

    if (Phaser.Input.Keyboard.JustDown(this._jKey)) this._attack('punch')
    if (Phaser.Input.Keyboard.JustDown(this._kKey)) this._attack('kick')
  }

  _updateEnemies(delta) {
    const time = this.time.now ?? 0
    for (const e of this._enemies) {
      if (e.dead) continue
      const dx = this._px - e.x
      const dy = this._groundY - e.groundY
      const dist = Math.hypot(dx, dy)
      if (dist > CH3.enemy.aggroRange) continue

      e.facing = dx < 0 ? -1 : 1
      if (dist > CH3.enemy.attackRange) {
        const ang = Math.atan2(dy, dx)
        e.x       += Math.cos(ang) * CH3.enemy.speed * (delta / 1000)
        e.groundY += Math.sin(ang) * CH3.enemy.speed * (delta / 1000)
        e.groundY = Phaser.Math.Clamp(e.groundY, FLOOR_TOP, FLOOR_BOT)
      } else if (time > e.nextAttack && Math.abs(dy) < 40) {
        e.nextAttack = time + CH3.enemy.attackCooldown
        this._enemyLunge(e)
      }
    }
  }

  _enemyLunge(e) {
    const lungeX = e.x + e.facing * 12
    this.tweens.add({ targets: e.rect, x: lungeX, duration: 110, yoyo: true })
    this.time.delayedCall(90, () => {
      if (e.dead || this._gameOver) return
      // A high enough jump clears the strike (the airDodge window).
      if (this._z > CH3.player.airDodgeZ) return
      const dy = this._groundY - e.groundY
      const dist = Math.hypot(this._px - e.x, dy)
      if (dist <= CH3.enemy.attackRange + 10 && Math.abs(dy) < 40) {
        this._damagePlayer(CH3.enemy.damage, e.x)
      }
    })
  }

  _updateWaves() {
    if (this._advancing && this._currentWave < WAVES.length) {
      const wave = WAVES[this._currentWave]
      if (this._px >= wave.x - W / 2) this._spawnWave(wave)
    }
    if (this._gateActive && this._aliveEnemies() === 0) {
      this._gateActive = false
      this._advancing  = true
      this._currentWave++
      this._flashBanner('CLEAR!')
      this._showGoArrow()
    }
  }

  // Draw the body at the jump height and keep the shadow on the floor.
  _render() {
    this._player.x = this._px
    this._player.y = this._groundY - this._z
    this._player.setDepth(this._groundY)
    const lift = Math.min(this._z, 120) / 280
    this._playerShadow.x = this._px
    this._playerShadow.y = this._groundY + 2
    this._playerShadow.setScale(1 - lift).setAlpha(0.32 * (1 - lift) + 0.08)

    for (const e of this._enemies) {
      if (e.dead) continue
      e.rect.x = e.x
      e.rect.y = e.groundY
      e.rect.setDepth(e.groundY)
      e.shadow.x = e.x
      e.shadow.y = e.groundY + 2
    }
  }

  _updateHUD() {
    const pct = Phaser.Math.Clamp(this._hp / CH3.player.health, 0, 1)
    this._hpBar.width = 240 * pct
    this._hpBar.setFillStyle(pct > 0.5 ? 0x9988cc : pct > 0.25 ? 0xccaa44 : 0xdd4466)
  }

  // ── Boss handoff / game over ─────────────────────────────────────────────────

  _startBoss() {
    this._bossStarted = true
    this._advancing   = false
    this._flashBanner('THE AUTHOR')
    this._transition('Ch3BossScene', { slopState: this._slopState, playerHealth: this._hp }, 900)
  }

  _handleGameOver() {
    this._gameOver = true
    this.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0.7).setScrollFactor(0).setDepth(20000)
    this.add.text(W / 2, H / 2 - 16, 'you stopped moving', {
      fontSize: '22px', color: '#dd4466', fontFamily: 'Courier New', stroke: '#000', strokeThickness: 5,
    }).setOrigin(0.5).setScrollFactor(0).setDepth(20001)
    this.add.text(W / 2, H / 2 + 26, 'press SPACE to keep climbing', {
      fontSize: '12px', color: '#cfd6e4', fontFamily: 'Courier New',
    }).setOrigin(0.5).setScrollFactor(0).setDepth(20001)
    this.input.keyboard.once('keydown-SPACE', () => this.scene.restart({ slopState: this._slopState }))
  }

  _transition(key, data, delay = 0) {
    if (this._transitioning) return
    this._transitioning = true
    const go = () => this.cameras.main.fade(500, 0, 0, 0, true, (_, t) => { if (t === 1) this.scene.start(key, data) })
    if (delay > 0) this.time.delayedCall(delay, go)
    else go()
  }
}
