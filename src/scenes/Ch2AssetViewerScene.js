// Ch2AssetViewerScene — Chapter 2 asset viewer and import testbed.
// Loads all generated sprite sheets and backgrounds, displays them for inspection.
// Background cycles with ← → or on-screen buttons. Click any sheet thumbnail to expand.
// Will eventually evolve into a sprite editor + background editor.

import Phaser from 'phaser'
import { W, H } from '../config/constants.js'

// ── Asset manifests ────────────────────────────────────────────────────────────

const ASSET_PATH = 'media/generated/'

const BG_KEYS = [
  'ch2-bg-desert-wasteland',
  'ch2-bg-cavern-v1',
  'ch2-bg-cavern-v2',
  'ch2-bg-cavern-labeled',
  'ch2-bg-crystal-city-v1',
  'ch2-bg-crystal-city-v2',
  'ch2-bg-desert-town-concept',
  'ch2-bg-station-hub',
  'ch2-bg-decayed-station',
  'ch2-bg-void-ruins-v1-chatgpt',
  'ch2-bg-void-ruins-v2-chatgpt',
]

const SHEET_DEFS = [
  { key: 'ch2-slop-movement-sheet',        label: 'slop movement (gemini)' },
  { key: 'ch2-overview-sheet-v1',           label: 'overview v1' },
  { key: 'ch2-overview-sheet-v2',           label: 'overview v2' },
  { key: 'ch2-enemy-bestiary-sheet',        label: 'enemy bestiary' },
  { key: 'ch2-env-tileset-sheet',           label: 'env tilesets' },
  { key: 'ch2-slop-movement-sheet-chatgpt', label: 'slop movement (chatgpt)' },
]

const PANEL_H = 168
const TOP_BAR_H = 44

// ── Scene ──────────────────────────────────────────────────────────────────────

export class Ch2AssetViewerScene extends Phaser.Scene {
  constructor() { super('Ch2AssetViewerScene') }

  preload() {
    const loadText = this.add.text(W / 2, H / 2, 'loading assets…', {
      fontSize: '13px', color: '#998877', fontFamily: 'Courier New',
    }).setOrigin(0.5)

    const bar = this.add.rectangle(W / 2, H / 2 + 28, 0, 6, 0x887766).setOrigin(0, 0.5)
    this.add.rectangle(W / 2, H / 2 + 28, 300, 6, 0x443322).setOrigin(0, 0.5)

    this.load.on('progress', v => {
      loadText.setText(`loading assets… ${Math.round(v * 100)}%`)
      bar.width = v * 300
    })
    this.load.on('complete', () => { loadText.destroy(); bar.destroy() })

    BG_KEYS.forEach(k => this.load.image(k, `${ASSET_PATH}${k}.png`))
    SHEET_DEFS.forEach(({ key }) => this.load.image(key, `${ASSET_PATH}${key}.png`))
  }

  create() {
    this._bgIdx       = 0
    this._overlayObjs = null

    this._buildBackground()
    this._buildTopBar()
    this._buildSheetPanel()
    this._setupKeys()

    this.cameras.main.fadeIn(400, 0, 0, 0)
  }

  // ── Background ─────────────────────────────────────────────────────────────

  _buildBackground() {
    this._bg = this.add.image(W / 2, H / 2, BG_KEYS[0])
      .setDisplaySize(W, H)
      .setDepth(0)
  }

  _cycleBg(dir) {
    this._bgIdx = (this._bgIdx + BG_KEYS.length + dir) % BG_KEYS.length
    const key = BG_KEYS[this._bgIdx]
    this._bg.setTexture(key)
    this._bgLabel.setText(`${this._bgIdx + 1} / ${BG_KEYS.length}  ·  ${key}`)
  }

  // ── Top bar ────────────────────────────────────────────────────────────────

  _buildTopBar() {
    this.add.rectangle(W / 2, TOP_BAR_H / 2, W, TOP_BAR_H, 0x000000, 0.62).setDepth(10)

    this._bgLabel = this.add.text(W / 2, TOP_BAR_H / 2, `1 / ${BG_KEYS.length}  ·  ${BG_KEYS[0]}`, {
      fontSize: '11px', color: '#ddd0c0', fontFamily: 'Courier New',
    }).setOrigin(0.5).setDepth(11)

    this._makeBtn(58, TOP_BAR_H / 2, '◀  prev bg', () => this._cycleBg(-1)).setDepth(11)
    this._makeBtn(W - 58, TOP_BAR_H / 2, 'next bg  ▶', () => this._cycleBg(1)).setDepth(11)
  }

  // ── Sheet panel ────────────────────────────────────────────────────────────

  _buildSheetPanel() {
    const panelY = H - PANEL_H / 2

    this.add.rectangle(W / 2, panelY, W, PANEL_H, 0x080808, 0.80).setDepth(10)

    this.add.text(8, H - PANEL_H + 6, 'sprite sheets  ·  click to expand', {
      fontSize: '8px', color: '#554433', fontFamily: 'Courier New',
    }).setDepth(11)

    this.add.text(W - 8, H - PANEL_H + 6, `ESC = menu  ·  ← → = cycle background`, {
      fontSize: '8px', color: '#554433', fontFamily: 'Courier New',
    }).setOrigin(1, 0).setDepth(11)

    const cols  = SHEET_DEFS.length
    const colW  = W / cols
    const thumbW = colW - 10
    const thumbH = PANEL_H - 30

    SHEET_DEFS.forEach(({ key, label }, i) => {
      const cx = i * colW + colW / 2
      const cy = panelY - 8

      this.add.rectangle(cx, cy, thumbW, thumbH, 0x181818).setDepth(11)

      const img = this.add.image(cx, cy, key).setDepth(12)
      const scale = Math.min(thumbW / img.width, thumbH / img.height)
      img.setScale(scale)

      this.tweens.add({
        targets: img, y: cy - 5, yoyo: true, repeat: -1,
        duration: 2200 + i * 280, ease: 'Sine.easeInOut', delay: i * 180,
      })

      this.add.text(cx, H - 6, label, {
        fontSize: '7px', color: '#665544', fontFamily: 'Courier New', align: 'center',
      }).setOrigin(0.5, 1).setDepth(12)

      img.setInteractive({ useHandCursor: true })
      img.on('pointerover', () => img.setTint(0xddccff))
      img.on('pointerout',  () => img.clearTint())
      img.on('pointerdown', () => this._expandSheet(key, label))
    })
  }

  // ── Sheet expand overlay ───────────────────────────────────────────────────

  _expandSheet(key, label) {
    if (this._overlayObjs) return

    const PAD  = 36
    const maxW = W - PAD * 2
    const maxH = H - PAD * 2

    const items = []
    const add = obj => { items.push(obj); return obj }

    // Backdrop — click anywhere to close
    add(
      this.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0.88)
        .setDepth(50)
        .setInteractive()
        .on('pointerdown', () => this._closeOverlay())
    )

    // Sheet image — scaled to maximum fit
    const img = add(this.add.image(W / 2, H / 2 + 14, key).setDepth(51))
    const scale = Math.min(maxW / img.width, (maxH - 28) / img.height)
    img.setScale(scale)

    // Label
    add(this.add.text(W / 2, PAD / 2, label, {
      fontSize: '13px', color: '#e8e0d0', fontFamily: 'Courier New',
    }).setOrigin(0.5).setDepth(51))

    // Close button
    const closeBtn = add(this.add.text(W - PAD, PAD / 2, '✕  close', {
      fontSize: '11px', color: '#ccbbaa', fontFamily: 'Courier New',
      backgroundColor: '#2a2218', padding: { x: 9, y: 5 },
    }).setOrigin(1, 0.5).setDepth(51).setInteractive({ useHandCursor: true }))
    closeBtn.on('pointerover', () => closeBtn.setStyle({ color: '#ffffff' }))
    closeBtn.on('pointerout',  () => closeBtn.setStyle({ color: '#ccbbaa' }))
    closeBtn.on('pointerdown', () => this._closeOverlay())

    // Prevent clicks on the image from bubbling to the backdrop
    img.setInteractive()
    img.on('pointerdown', e => e.stopPropagation())

    // Fade in
    items.forEach(o => {
      o.setAlpha(0)
      this.tweens.add({ targets: o, alpha: 1, duration: 180 })
    })

    this._overlayObjs = items
  }

  _closeOverlay() {
    if (!this._overlayObjs) return
    const objs = this._overlayObjs
    this._overlayObjs = null
    this.tweens.add({
      targets: objs, alpha: 0, duration: 140,
      onComplete: () => objs.forEach(o => o.destroy()),
    })
  }

  // ── Keys ───────────────────────────────────────────────────────────────────

  _setupKeys() {
    this._leftKey  = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.LEFT)
    this._rightKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.RIGHT)
    this._aKey     = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A)
    this._dKey     = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D)
    this._escKey   = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC)
  }

  update() {
    if (Phaser.Input.Keyboard.JustDown(this._leftKey) || Phaser.Input.Keyboard.JustDown(this._aKey)) {
      this._cycleBg(-1)
    }
    if (Phaser.Input.Keyboard.JustDown(this._rightKey) || Phaser.Input.Keyboard.JustDown(this._dKey)) {
      this._cycleBg(1)
    }
    if (Phaser.Input.Keyboard.JustDown(this._escKey)) {
      if (this._overlayObjs) {
        this._closeOverlay()
      } else {
        this.cameras.main.fade(300, 0, 0, 0, false, (_, t) => {
          if (t === 1) this.scene.start('MenuScene')
        })
      }
    }
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  _makeBtn(x, y, txt, cb) {
    const btn = this.add.text(x, y, txt, {
      fontSize: '11px', color: '#ccbbaa', fontFamily: 'Courier New',
      backgroundColor: '#2a2218', padding: { x: 10, y: 5 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true })
    btn.on('pointerover', () => btn.setStyle({ color: '#ffffff', backgroundColor: '#443322' }))
    btn.on('pointerout',  () => btn.setStyle({ color: '#ccbbaa', backgroundColor: '#2a2218' }))
    btn.on('pointerdown', cb)
    return btn
  }
}
