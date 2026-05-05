// Ch2AssetViewerScene — Chapter 2 background viewer.
// Cycles through all generated backgrounds with ← → or on-screen buttons.

import Phaser from 'phaser'
import { W, H } from '../config/constants.js'

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

const TOP = 44

export class Ch2AssetViewerScene extends Phaser.Scene {
  constructor() { super('Ch2AssetViewerScene') }

  preload() {
    const loadText = this.add.text(W / 2, H / 2, 'loading backgrounds…', {
      fontSize: '13px', color: '#998877', fontFamily: 'Courier New',
    }).setOrigin(0.5)

    const barX = W / 2 - 150
    const barY = H / 2 + 28
    this.add.rectangle(barX, barY, 300, 5, 0x443322).setOrigin(0, 0.5)
    const bar = this.add.rectangle(barX, barY, 0, 5, 0x887766).setOrigin(0, 0.5)

    this.load.on('progress', v => {
      loadText.setText(`loading backgrounds… ${Math.round(v * 100)}%`)
      bar.width = v * 300
    })
    this.load.on('complete', () => { loadText.destroy(); bar.destroy() })

    BG_KEYS.forEach(k => this.load.image(k, `${ASSET_PATH}${k}.png`))
  }

  create() {
    this._bgIdx = 0
    this._buildBackground()
    this._buildTopBar()
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
    this.add.rectangle(W / 2, TOP / 2, W, TOP, 0x000000, 0.72).setDepth(10)

    // Nav: sudo far-left, hub far-right
    this._makeBtn(40, TOP / 2, '◀ sudo', () => this._goSudo()).setDepth(11)
    this._makeBtn(W - 40, TOP / 2, 'hub ▶', () => this._goHub()).setDepth(11)

    // Content cycle: inset from nav buttons
    this._makeBtn(120, TOP / 2, '◀  prev', () => this._cycleBg(-1)).setDepth(11)
    this._makeBtn(W - 120, TOP / 2, 'next  ▶', () => this._cycleBg(1)).setDepth(11)

    this._bgLabel = this.add.text(W / 2, TOP / 2, `1 / ${BG_KEYS.length}  ·  ${BG_KEYS[0]}`, {
      fontSize: '13px', color: '#ddd0c0', fontFamily: 'Courier New',
    }).setOrigin(0.5).setDepth(11)

    this.add.text(W / 2, H - 14, '← → = cycle  ·  ESC = hub', {
      fontSize: '10px', color: '#665544', fontFamily: 'Courier New',
    }).setOrigin(0.5, 1).setDepth(10)
  }

  // ── Navigation ─────────────────────────────────────────────────────────────

  _goSudo() {
    this.cameras.main.fade(300, 0, 0, 0, false, (_, t) => {
      if (t === 1) this.scene.start('MenuScene', { openDev: true })
    })
  }

  _goHub() {
    this.cameras.main.fade(300, 0, 0, 0, false, (_, t) => {
      if (t === 1) this.scene.start('Ch2HubScene')
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
    if (Phaser.Input.Keyboard.JustDown(this._escKey)) this._goHub()
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  _makeBtn(x, y, txt, cb) {
    const btn = this.add.text(x, y, txt, {
      fontSize: '11px', color: '#ccbbaa', fontFamily: 'Courier New',
      backgroundColor: '#2a2218', padding: { x: 8, y: 4 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true })
    btn.on('pointerover', () => btn.setStyle({ color: '#ffffff', backgroundColor: '#443322' }))
    btn.on('pointerout',  () => btn.setStyle({ color: '#ccbbaa', backgroundColor: '#2a2218' }))
    btn.on('pointerdown', cb)
    return btn
  }
}
