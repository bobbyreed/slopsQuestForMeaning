// Ch2SpriteViewerScene — Chapter 2 sprite sheet presentation.
// Each sheet slowly pans left-to-right to reveal its full content, then fades to the next.
// Press SPACE / → to skip ahead. ESC to return to menu.
// Will evolve into a sprite frame editor once frame coordinates are defined.

import Phaser from 'phaser'
import { W, H } from '../config/constants.js'

const ASSET_PATH = 'media/generated/'

// All Gemini sheets are 1376×768. ChatGPT sheet is 1536×1024.
const SHEETS = [
  { key: 'ch2-slop-movement-sheet',        label: 'slop  ·  complete movement set' },
  { key: 'ch2-overview-sheet-v1',           label: 'chapter 2  ·  overview v1' },
  { key: 'ch2-overview-sheet-v2',           label: 'chapter 2  ·  overview v2' },
  { key: 'ch2-enemy-bestiary-sheet',        label: 'enemy bestiary' },
  { key: 'ch2-env-tileset-sheet',           label: 'environmental tilesets' },
  { key: 'ch2-slop-movement-sheet-chatgpt', label: 'slop  ·  movement set (chatgpt)' },
]

// Pixels per second for the horizontal scan — consistent reading pace across all sheets.
const SCAN_PX_PER_SEC = 32

export class Ch2SpriteViewerScene extends Phaser.Scene {
  constructor() { super('Ch2SpriteViewerScene') }

  preload() {
    const barX = W / 2 - 150
    const barY = H / 2 + 28
    this.add.rectangle(barX, barY, 300, 5, 0x1a1a1a).setOrigin(0, 0.5)
    const bar     = this.add.rectangle(barX, barY, 0, 5, 0x554433).setOrigin(0, 0.5)
    const loadTxt = this.add.text(W / 2, H / 2, 'loading…', {
      fontSize: '12px', color: '#554433', fontFamily: 'Courier New',
    }).setOrigin(0.5)

    this.load.on('progress', v => { bar.width = v * 300; loadTxt.setText(`loading… ${Math.round(v * 100)}%`) })
    this.load.on('complete', () => { bar.destroy(); loadTxt.destroy() })

    SHEETS.forEach(({ key }) => this.load.image(key, `${ASSET_PATH}${key}.png`))
  }

  create() {
    this._idx         = 0
    this._transitioning = false
    this._currentImg  = null
    this._scanTween   = null

    // Near-black background
    this.add.rectangle(W / 2, H / 2, W, H, 0x080808).setDepth(0)

    // Sheet label — bottom center
    this._label = this.add.text(W / 2, H - 14, '', {
      fontSize: '10px', color: '#443322', fontFamily: 'Courier New',
    }).setOrigin(0.5, 1).setDepth(20)

    // Counter — bottom right
    this._counter = this.add.text(W - 10, H - 14, '', {
      fontSize: '9px', color: '#332211', fontFamily: 'Courier New',
    }).setOrigin(1, 1).setDepth(20)

    // Hint — bottom left
    this.add.text(10, H - 14, 'SPACE / → = next  ·  ESC = menu', {
      fontSize: '8px', color: '#2a1a0a', fontFamily: 'Courier New',
    }).setOrigin(0, 1).setDepth(20)

    this._setupKeys()
    this._showSheet(0)
    this.cameras.main.fadeIn(600, 8, 8, 8)
  }

  // ── Sheet presentation ─────────────────────────────────────────────────────

  _showSheet(idx) {
    if (idx >= SHEETS.length) idx = 0
    this._idx = idx
    this._transitioning = false

    const { key, label } = SHEETS[idx]

    // Scale to fill full canvas height; sheet will be wider than the canvas.
    const src   = this.textures.get(key).source[0]
    const scale = H / src.height
    const scaledW = src.width * scale
    const excess  = Math.max(0, scaledW - W)

    const img = this.add.image(0, 0, key)
      .setOrigin(0, 0)
      .setScale(scale)
      .setDepth(5)
      .setAlpha(0)

    this._currentImg = img
    this._label.setText(label)
    this._counter.setText(`${idx + 1} / ${SHEETS.length}`)

    // Fade in, then scan
    this.tweens.add({
      targets: img, alpha: 1, duration: 700, ease: 'Sine.easeIn',
      onComplete: () => this._startScan(img, excess),
    })
  }

  _startScan(img, excess) {
    if (excess < 1) {
      // Sheet fits the canvas — hold, then advance
      this.time.delayedCall(4000, () => this._fadeToNext(img))
      return
    }

    const duration = (excess / SCAN_PX_PER_SEC) * 1000

    this._scanTween = this.tweens.add({
      targets: img,
      x: -excess,
      duration,
      ease: 'Sine.easeInOut',
      onComplete: () => {
        this.time.delayedCall(1000, () => this._fadeToNext(img))
      },
    })
  }

  _fadeToNext(img) {
    if (this._transitioning) return
    this._transitioning = true

    this._scanTween?.stop()
    this._scanTween = null

    this.tweens.add({
      targets: img, alpha: 0, duration: 500, ease: 'Sine.easeIn',
      onComplete: () => {
        img.destroy()
        this._currentImg = null
        this._showSheet(this._idx + 1)
      },
    })
  }

  _advance() {
    if (this._transitioning) return
    this._fadeToNext(this._currentImg)
  }

  // ── Keys ───────────────────────────────────────────────────────────────────

  _setupKeys() {
    this._spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE)
    this._rightKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.RIGHT)
    this._escKey   = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC)
  }

  update() {
    if (Phaser.Input.Keyboard.JustDown(this._spaceKey) || Phaser.Input.Keyboard.JustDown(this._rightKey)) {
      this._advance()
    }
    if (Phaser.Input.Keyboard.JustDown(this._escKey)) {
      this._transitioning = true
      this.cameras.main.fade(350, 8, 8, 8, false, (_, t) => {
        if (t === 1) this.scene.start('Ch2HubScene')
      })
    }
  }
}
