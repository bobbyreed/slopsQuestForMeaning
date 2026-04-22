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
          Sfx.enemyDeath(this)
          enemy.onHit(word, (ex, ey) => this._spawnCoinAt(ex, ey))
          break
        }
      }
    }
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
