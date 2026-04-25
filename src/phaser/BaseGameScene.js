import Phaser from 'phaser'
import { Sfx } from '../ui/Sfx.js'
import { SaveState } from '../ui/SaveState.js'

export class BaseGameScene extends Phaser.Scene {
  _initMovementKeys() {
    this._cursors = this.input.keyboard.createCursorKeys()
    this._wasd = this.input.keyboard.addKeys({
      left:  Phaser.Input.Keyboard.KeyCodes.A,
      right: Phaser.Input.Keyboard.KeyCodes.D,
      up:    Phaser.Input.Keyboard.KeyCodes.W,
      down:  Phaser.Input.Keyboard.KeyCodes.S,
    })
    this._enterKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER)
    this._qKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.Q)
  }

  _checkPauseKey() {
    if (!this._enterKey) return
    if (!Phaser.Input.Keyboard.JustDown(this._enterKey)) return
    const key = this.sys.settings.key
    this.scene.launch('PauseScene', {
      fromScene: key,
      slopState: this.slop?.getState?.() ?? {},
      currentScene: key,
    })
    this.scene.pause()
  }

  _setupCoinOverlap() {
    this.physics.add.overlap(this.slop, this._coins, (slop, coin) => {
      if (!coin.active || coin.getData('justDropped')) return
      coin.destroy()
      slop.coinCount = Math.min(slop.coinCount + 1, slop.maxCoins)
      Sfx.coin(this)
    })
  }

  _setupEnemyOverlap(shakeDuration = 120, shakeMagnitude = 0.004) {
    this.physics.add.overlap(this.slop, this._enemies, (slop, enemy) => {
      if (this._slopHitTimer > 0 || enemy._dying) return
      this._slopHitTimer = 1200
      slop.coinCount = Math.max(0, slop.coinCount - 1)
      Sfx.slopHit(this)
      const angle = Math.atan2(slop.y - enemy.y, slop.x - enemy.x)
      slop.body.setVelocity(Math.cos(angle) * 280, Math.sin(angle) * 280)
      this.cameras.main.shake(shakeDuration, shakeMagnitude)
    })
  }

  // Shared wall-building primitive. Dungeon/Shrine default to dark purple;
  // WorldScene passes its own tan color.
  _wallRect(x, y, w, h, color = 0x1e1830) {
    const rect = this.add.rectangle(x + w / 2, y + h / 2, w, h, color)
    this.physics.add.existing(rect, true)
    this._walls.add(rect)
  }

  // Spawns a coin near (x, y) and briefly marks it justDropped so it cannot
  // be immediately re-collected. Uses the scene's own key for the isActive check.
  _spawnCoinAt(x, y) {
    if (!this.scene.isActive(this.sys.settings.key)) return
    const coin = this._coins.create(
      x + Phaser.Math.Between(-12, 12),
      y + Phaser.Math.Between(-12, 12),
      'coin'
    )
    coin.refreshBody()
    coin.setData('justDropped', true)
    this.time.delayedCall(400, () => { if (coin.active) coin.setData('justDropped', false) })
  }

  // Handles the post-hit invulnerability flash each tick.
  _tickHitInvulnerability(delta) {
    if (this._slopHitTimer > 0) {
      this._slopHitTimer -= delta
      this.slop.setAlpha(Math.floor(this._slopHitTimer / 120) % 2 === 0 ? 1 : 0.3)
    } else {
      this.slop.setAlpha(1)
    }
  }

  // Manual prompt→enemy collision sweep (Text objects don't integrate cleanly
  // with Phaser physics groups).
  _checkPromptCollisions() {
    this._prompts = this._prompts.filter(p => p?.active)
    for (const proj of this._prompts) {
      if (!proj.active) continue
      const pb = proj.getBounds()
      for (const enemy of this._enemies.getChildren()) {
        if (!enemy.active || enemy._dying) continue
        if (Phaser.Geom.Intersects.RectangleToRectangle(pb, enemy.getBounds())) {
          const word = proj.text
          proj.destroy()
          if (enemy.onHit(word, (ex, ey) => this._spawnCoinAt(ex, ey)) !== false) {
            Sfx.enemyDeath(this)
          }
          break
        }
      }
    }
  }

  // Short-range glitch pulse that destroys corruptible tiles within RANGE px.
  _activateCorrupt() {
    const RANGE = 100
    const sx = this.slop.x
    const sy = this.slop.y

    const ring = this.add.circle(sx, sy, 10, 0xcc33ff, 0.85).setDepth(15)
    this.tweens.add({
      targets: ring,
      scaleX: RANGE / 5, scaleY: RANGE / 5,
      alpha: 0,
      duration: 380,
      ease: 'Cubic.easeOut',
      onComplete: () => ring.destroy(),
    })

    if (this._corruptibles) {
      this._corruptibles.getChildren().slice().forEach(tile => {
        if (!tile.active) return
        const dist = Phaser.Math.Distance.Between(sx, sy, tile.x, tile.y)
        if (dist > RANGE) return
        const flash = this.add.rectangle(tile.x, tile.y, tile.width, tile.height, 0xff33ff, 0.85).setDepth(20)
        this.tweens.add({
          targets: flash, alpha: 0, scaleX: 2.2, scaleY: 2.2,
          duration: 340, ease: 'Cubic.easeOut',
          onComplete: () => flash.destroy(),
        })
        tile.destroy()
      })
    }

    Sfx.corrupt(this)
  }

  // Fades out and starts another scene. Auto-saves slopState before leaving.
  // Returns false (no-op) if a transition is already in progress.
  _sceneTransition(sceneName, data, duration = 350) {
    if (this._transitioning) return false
    this._transitioning = true
    if (this.slop?.getState) SaveState.save(this.slop.getState())
    this.cameras.main.fade(duration, 0, 0, 0, false, (_, t) => {
      if (t === 1) this.scene.start(sceneName, data)
    })
    return true
  }
}
