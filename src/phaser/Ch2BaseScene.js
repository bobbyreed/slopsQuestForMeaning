// Shared base class for all Chapter 2 production scenes.
// Provides the Firestore sprite pipeline, jump gate, and common physics helpers.
// Each subclass calls _preloadSheets(bgKey) in preload() and
// _initSpriteState() + _loadAnimConfigs(prefix) in init/create.

import Phaser from 'phaser'
import { AnimConfig }            from '../firestore/AnimConfig.js'
import { buildProcessedTexture } from '../util/colorKey.js'
import { W, H }                  from '../config/constants.js'

export const ASSET_PATH   = 'media/generated/'
export const SPRITE_SCALE = 1.0
export const PLAYER_W     = 22
export const PLAYER_H     = 28
export const MOVE_V       = 190
export const JUMP_V       = -460
export const WALKER_V     = 55
export const GRAVITY      = 520

export const SHEET_META = {
  'ch2-slop-movement-sheet-chatgpt': { w: 1536, h: 1024 },
  'ch2-slop-movement-sheet':         { w: 1376, h: 768  },
  'ch2-overview-sheet-v1':           { w: 1376, h: 768  },
  'ch2-overview-sheet-v2':           { w: 1376, h: 768  },
  'ch2-enemy-bestiary-sheet':        { w: 1376, h: 768  },
  'ch2-env-tileset-sheet':           { w: 1376, h: 768  },
}

export class Ch2BaseScene extends Phaser.Scene {

  // ── Preload ──────────────────────────────────────────────────────────────

  _preloadSheets(bgKey) {
    const toLoad  = Object.keys(SHEET_META).filter(k => !this.textures.exists(k))
    const bgNeeds = bgKey && !this.textures.exists(bgKey)
    if (!toLoad.length && !bgNeeds) return

    const barX = W / 2 - 150
    const barY  = H / 2 + 28
    this.add.rectangle(barX, barY, 300, 5, 0x1a1a1a).setOrigin(0, 0.5)
    const bar  = this.add.rectangle(barX, barY, 0, 5, 0x887766).setOrigin(0, 0.5)
    const lTxt = this.add.text(W / 2, H / 2, 'loading…', {
      fontSize: '12px', color: '#887766', fontFamily: 'Courier New',
    }).setOrigin(0.5)
    this.load.on('progress', v => { bar.width = v * 300; lTxt.setText(`loading… ${Math.round(v * 100)}%`) })
    this.load.on('complete', () => { bar.destroy(); lTxt.destroy() })
    toLoad.forEach(k => this.load.image(k, `${ASSET_PATH}${k}.png`))
    if (bgNeeds) this.load.image(bgKey, `${ASSET_PATH}${bgKey}.png`)
  }

  // ── Sprite state ─────────────────────────────────────────────────────────

  _initSpriteState() {
    this._sprite          = null
    this._animPool        = []
    this._activeAnimIdx   = 0
    this._animState       = null
    this._spriteYOffset   = 0
    this._facing          = 1
    this._transitioning   = false
  }

  // ── Async Firestore animation load ───────────────────────────────────────

  async _loadAnimConfigs(prefix) {
    try {
      const configs = await AnimConfig.loadAll()
      if (configs.length) {
        const sheetKeys = [...new Set(configs.map(c => c.sheetKey).filter(Boolean))]
        sheetKeys.forEach(sk => {
          if (this.textures?.exists(sk)) buildProcessedTexture(this.textures, sk, SHEET_META)
        })
        configs.forEach((cfg, i) => {
          if (!cfg.frames?.length || !SHEET_META[cfg.sheetKey]) return
          const animKey = `${prefix}-${cfg.id || i}`
          this._registerAnim(animKey, cfg)
          this._animPool.push({ key: animKey, label: cfg.label || cfg.sheetKey, cfg })
        })
        if (this._animPool.length > 0) {
          this._activeAnimIdx = 0
          this._attachSprite(this._animPool[0].cfg)
        }
      }
    } catch (e) {
      console.warn(`[${this.constructor.name}] anim load failed:`, e.message)
    }
    this._onAnimsLoaded()
  }

  // Override in subclasses to attach additional sprites (e.g. clone) after load
  _onAnimsLoaded() {}

  _registerAnim(animKey, cfg) {
    const procKey = 'proc-' + cfg.sheetKey
    if (!this.textures?.exists(procKey)) return
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
    if (!this.textures?.exists(procKey)) return
    const f0 = cfg.frames[0]
    this._spriteYOffset = (PLAYER_H - f0.h * SPRITE_SCALE) / 2
    if (this._sprite) this._sprite.destroy()
    const animKey = this._animPool[this._activeAnimIdx]?.key || ''
    this._sprite = this.add.sprite(
      this._player.x, this._player.y + this._spriteYOffset,
      procKey, `${animKey}-0`
    ).setScale(SPRITE_SCALE).setDepth(10)
    this._player.setAlpha(0)
    this._animState = null
    if (animKey) this._sprite.play(animKey)
  }

  _setAnimState(state) {
    if (!this._sprite) return
    const animKey = this._animPool[this._activeAnimIdx]?.key
    if (!animKey || this._animState === state) return
    this._animState = state
    if (state === 'walk' || state === 'air') this._sprite.play(animKey)
    else if (state === 'idle') this._sprite.anims.pause()
  }

  _syncPlayerVisuals() {
    if (!this._player || !this._sprite) return
    this._sprite.x = this._player.x
    this._sprite.y = this._player.y + this._spriteYOffset
    this._sprite.setFlipX(this._facing < 0)
  }

  // ── Jump gate ────────────────────────────────────────────────────────────

  _canJump() {
    return !!this._slopState?.ch2JumpUnlocked
  }

  // ── Shared helpers ───────────────────────────────────────────────────────

  _plat(x, y, w, h, color) {
    const r = this.add.rectangle(x + w / 2, y, w, h, color)
    this.physics.add.existing(r, true)
    this._platforms.add(r)
    return r
  }

  _sceneTransition(key, data) {
    if (this._transitioning) return
    this._transitioning = true
    this.cameras.main.fade(600, 0, 0, 0, false, (_, t) => {
      if (t === 1) this.scene.start(key, data)
    })
  }
}
