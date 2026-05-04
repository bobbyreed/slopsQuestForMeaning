// Ch2SpriteAnimScene — animated sprite viewer with canvas color-keying.
// Loads the ChatGPT sprite sheet, strips the dark background via pixel processing,
// then plays frame animations. Approximate coords — press D to see frame rects on the
// raw sheet and tune the FRAME_SETS table until they align.
//
// ← →   cycle animation sets
// ↑ ↓   adjust fps
// D      toggle debug overlay (raw sheet + frame bounds)
// ESC    return to menu

import Phaser from 'phaser'
import { W, H } from '../config/constants.js'

const ASSET_PATH = 'media/generated/'
const RAW_KEY    = 'ch2-chatgpt-raw'
const PROC_KEY   = 'ch2-chatgpt-proc'
const SHEET_W    = 1536
const SHEET_H    = 1024

// Color-key: remove pixels where max(r,g,b) < BRIGHT and saturation < SAT
// Tight thresholds preserve the grey-blue limbs while stripping the near-black bg.
const CK_BRIGHT = 50
const CK_SAT    = 0.20

// ── Frame set definitions ────────────────────────────────────────────────────
// x/y/w/h are in raw sheet pixels. stride = horizontal distance between frame origins.
// These are estimates — use D overlay to verify and adjust.

function row(n, x0, y, w, h, stride) {
  return Array.from({ length: n }, (_, i) => ({ x: x0 + i * stride, y, w, h }))
}

const FRAME_SETS = [
  {
    key:       'walk-simple',
    label:     'Walk Cycle  ·  12 frames  (rough)',
    frameRate: 8,
    frames:    row(12, 5, 28, 55, 110, 68),
  },
  {
    key:       'walk-full',
    label:     'Walk Cycle  ·  12 frames  (hi-fi)',
    frameRate: 8,
    frames:    row(12, 822, 28, 52, 110, 60),
  },
]

// ── Scene ────────────────────────────────────────────────────────────────────

export class Ch2SpriteAnimScene extends Phaser.Scene {
  constructor() { super('Ch2SpriteAnimScene') }

  // ── Lifecycle ──────────────────────────────────────────────────────────────

  preload() {
    if (this.textures.exists(RAW_KEY)) return

    const barX = W / 2 - 150
    const barY = H / 2 + 28
    this.add.rectangle(barX, barY, 300, 5, 0x1a1a1a).setOrigin(0, 0.5)
    const bar  = this.add.rectangle(barX, barY, 0, 5, 0x554433).setOrigin(0, 0.5)
    const lTxt = this.add.text(W / 2, H / 2, 'loading…', {
      fontSize: '12px', color: '#554433', fontFamily: 'Courier New',
    }).setOrigin(0.5)

    this.load.on('progress', v => {
      bar.width = v * 300
      lTxt.setText(`loading… ${Math.round(v * 100)}%`)
    })
    this.load.on('complete', () => { bar.destroy(); lTxt.destroy() })

    this.load.image(RAW_KEY, `${ASSET_PATH}ch2-slop-movement-sheet-chatgpt.png`)
  }

  create() {
    this._animIdx   = 0
    this._sprScale  = 3
    this._showDebug = false

    this.add.rectangle(W / 2, H / 2, W, H, 0x0a0a0a).setDepth(0)

    this._buildProcessedTexture()
    this._registerFrames()
    this._buildAnims()

    this._sprite = this.add.sprite(W / 2, H / 2 + 20, PROC_KEY, 'walk-simple-0')
      .setScale(this._sprScale)
      .setDepth(10)

    // Debug overlay — raw sheet scaled to canvas height, with frame rects drawn over it
    const dbgSc = H / SHEET_H
    this._dbgImg = this.add.image(0, 0, RAW_KEY)
      .setOrigin(0, 0).setScale(dbgSc).setAlpha(0).setDepth(5)
    this._dbgGfx = this.add.graphics().setDepth(6).setAlpha(0)
    this._dbgSc  = dbgSc

    // UI
    this._animLabel = this.add.text(W / 2, 14, '', {
      fontSize: '11px', color: '#ccbbaa', fontFamily: 'Courier New',
    }).setOrigin(0.5).setDepth(20)

    this._fpsLabel = this.add.text(W - 10, 14, '', {
      fontSize: '9px', color: '#665544', fontFamily: 'Courier New',
    }).setOrigin(1, 0).setDepth(20)

    this.add.text(W / 2, H - 12, '← → cycle  ·  ↑ ↓ fps  ·  D debug overlay  ·  ESC menu', {
      fontSize: '8px', color: '#2a1a0a', fontFamily: 'Courier New',
    }).setOrigin(0.5, 1).setDepth(20)

    this._setupKeys()
    this._playAnim(0)
    this.cameras.main.fadeIn(400, 10, 10, 10)
  }

  // ── Texture processing ─────────────────────────────────────────────────────

  _buildProcessedTexture() {
    if (this.textures.exists(PROC_KEY)) return

    const img    = this.textures.get(RAW_KEY).source[0].image
    const canvas = document.createElement('canvas')
    canvas.width  = img.naturalWidth  || SHEET_W
    canvas.height = img.naturalHeight || SHEET_H

    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    ctx.drawImage(img, 0, 0)

    const id   = ctx.getImageData(0, 0, canvas.width, canvas.height)
    const data = id.data

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i], g = data[i + 1], b = data[i + 2]
      const max = Math.max(r, g, b)
      const sat = max === 0 ? 0 : (max - Math.min(r, g, b)) / max
      if (max < CK_BRIGHT && sat < CK_SAT) {
        data[i + 3] = 0
      }
    }

    ctx.putImageData(id, 0, 0)
    this.textures.addCanvas(PROC_KEY, canvas)
  }

  _registerFrames() {
    const tex = this.textures.get(PROC_KEY)
    FRAME_SETS.forEach(fs => {
      fs.frames.forEach((f, i) => {
        const name = `${fs.key}-${i}`
        if (!tex.has(name)) tex.add(name, 0, f.x, f.y, f.w, f.h)
      })
    })
  }

  _buildAnims() {
    FRAME_SETS.forEach(fs => {
      if (this.anims.exists(fs.key)) return
      this.anims.create({
        key:       fs.key,
        frames:    fs.frames.map((_, i) => ({ key: PROC_KEY, frame: `${fs.key}-${i}` })),
        frameRate: fs.frameRate,
        repeat:    -1,
      })
    })
  }

  // ── Playback ───────────────────────────────────────────────────────────────

  _playAnim(idx) {
    if (idx < 0)                  idx = FRAME_SETS.length - 1
    if (idx >= FRAME_SETS.length) idx = 0
    this._animIdx = idx
    const fs = FRAME_SETS[idx]
    this._sprite.play(fs.key)
    this._animLabel.setText(fs.label)
    this._fpsLabel.setText(`${fs.frameRate} fps`)
    if (this._showDebug) this._renderDebug()
  }

  _adjustFps(delta) {
    const fs = FRAME_SETS[this._animIdx]
    fs.frameRate = Math.max(1, Math.min(30, fs.frameRate + delta))
    this._fpsLabel.setText(`${fs.frameRate} fps`)
    this._sprite.anims.msPerFrame = 1000 / fs.frameRate
  }

  // ── Debug overlay ──────────────────────────────────────────────────────────

  _toggleDebug() {
    this._showDebug = !this._showDebug
    const on = this._showDebug
    this._dbgImg.setAlpha(on ? 0.9 : 0)
    this._dbgGfx.setAlpha(on ? 1 : 0)
    this._sprite.setAlpha(on ? 0 : 1)
    if (on) this._renderDebug()
  }

  _renderDebug() {
    const g  = this._dbgGfx
    const sc = this._dbgSc
    g.clear()

    // Current anim — bright green
    g.lineStyle(1, 0x00ff88, 1.0)
    FRAME_SETS[this._animIdx].frames.forEach(f => {
      g.strokeRect(f.x * sc, f.y * sc, f.w * sc, f.h * sc)
    })

    // Other anims — dim yellow
    g.lineStyle(1, 0xdddd00, 0.35)
    FRAME_SETS.forEach((fs, idx) => {
      if (idx === this._animIdx) return
      fs.frames.forEach(f => g.strokeRect(f.x * sc, f.y * sc, f.w * sc, f.h * sc))
    })
  }

  // ── Keys ───────────────────────────────────────────────────────────────────

  _setupKeys() {
    this._kL   = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.LEFT)
    this._kR   = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.RIGHT)
    this._kU   = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.UP)
    this._kDn  = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.DOWN)
    this._kD   = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D)
    this._kEsc = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC)
  }

  update() {
    const J = Phaser.Input.Keyboard.JustDown
    if (J(this._kL))   this._playAnim(this._animIdx - 1)
    if (J(this._kR))   this._playAnim(this._animIdx + 1)
    if (J(this._kU))   this._adjustFps(+1)
    if (J(this._kDn))  this._adjustFps(-1)
    if (J(this._kD))   this._toggleDebug()
    if (J(this._kEsc)) {
      this.cameras.main.fade(350, 10, 10, 10, false, (_, t) => {
        if (t === 1) this.scene.start('Ch2HubScene')
      })
    }
  }
}
