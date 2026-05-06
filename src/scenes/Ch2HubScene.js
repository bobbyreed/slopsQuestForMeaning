// Ch2HubScene — landing page for all Chapter 2 asset tools.
// ESC returns to the dev menu / MenuScene.

import Phaser from 'phaser'
import { W, H } from '../config/constants.js'

const TOOLS = [
  {
    key:   'Ch2AssetViewerScene',
    label: 'BACKGROUNDS',
    desc:  '11 generated backgrounds\nprev / next cycle',
  },
  {
    key:   'Ch2FramePickerScene',
    label: 'FRAME PICKER',
    desc:  'drag to define frames\nsave configs to Firestore',
  },
  {
    key:   'Ch2SpriteAnimScene',
    label: 'ANIMATION',
    desc:  'color-keyed walk cycle\nframe debug overlay',
  },
]

const TOP    = 36
const CARD_W  = 190
const CARD_H  = 120
const CARD_GAP = 24
const TOTAL_W  = TOOLS.length * CARD_W + (TOOLS.length - 1) * CARD_GAP

export class Ch2HubScene extends Phaser.Scene {
  constructor() { super('Ch2HubScene') }

  create() {
    this.add.rectangle(W / 2, H / 2, W, H, 0x0a0a14)

    this._buildTopBar()

    this.add.text(W / 2, TOP + 50, 'CHAPTER 2  ·  TOOLS', {
      fontSize: '18px', color: '#ffffff', fontFamily: 'Courier New',
      backgroundColor: '#0d0b18', padding: { x: 12, y: 6 },
    }).setOrigin(0.5)

    this.add.text(W / 2, TOP + 90, 'asset viewers and animation test scenes', {
      fontSize: '12px', color: '#aaaaaa', fontFamily: 'Courier New',
      backgroundColor: '#0d0b18', padding: { x: 8, y: 4 },
    }).setOrigin(0.5)

    const cardY   = TOP + 90 + 26 + CARD_H / 2 + 10
    const startX  = W / 2 - TOTAL_W / 2 + CARD_W / 2
    TOOLS.forEach(({ key, label, desc }, i) => {
      this._makeCard(startX + i * (CARD_W + CARD_GAP), cardY, key, label, desc)
    })

    this.add.rectangle(W / 2, H - 20, W, 1, 0x443355)
    this.add.text(W / 2, H - 8, 'ESC = sudo menu', {
      fontSize: '11px', color: '#aaaaaa', fontFamily: 'Courier New',
      backgroundColor: '#0d0b18', padding: { x: 8, y: 4 },
    }).setOrigin(0.5, 1)

    this._escKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC)
    this.cameras.main.fadeIn(350, 10, 10, 20)
  }

  _buildTopBar() {
    this.add.rectangle(W / 2, TOP / 2, W, TOP, 0x000000).setDepth(10)
    this.add.rectangle(W / 2, TOP, W, 1, 0x443355).setDepth(11)
    this._makeBtn(44, TOP / 2, '◀ sudo', () => this._goSudo()).setDepth(12)
  }

  _goSudo() {
    this.cameras.main.fade(300, 10, 10, 20, false, (_, t) => {
      if (t === 1) this.scene.start('MenuScene', { openDev: true })
    })
  }

  _makeCard(cx, cy, sceneKey, label, desc) {
    const bg = this.add.rectangle(cx, cy, CARD_W, CARD_H, 0x1a1828)
      .setInteractive({ useHandCursor: true })
      .setStrokeStyle(2, 0x554466)

    const lbl = this.add.text(cx, cy - 28, label, {
      fontSize: '13px', color: '#ffffff', fontFamily: 'Courier New',
    }).setOrigin(0.5)

    const dsc = this.add.text(cx, cy + 6, desc, {
      fontSize: '11px', color: '#aaaaaa', fontFamily: 'Courier New',
      align: 'center', lineSpacing: 4,
    }).setOrigin(0.5)

    bg.on('pointerover', () => {
      bg.setFillColor(0x2a2040).setStrokeStyle(2, 0xaa88ff)
      lbl.setStyle({ color: '#ffffff' })
      dsc.setStyle({ color: '#cccccc' })
    })
    bg.on('pointerout', () => {
      bg.setFillColor(0x1a1828).setStrokeStyle(2, 0x554466)
      lbl.setStyle({ color: '#ffffff' })
      dsc.setStyle({ color: '#aaaaaa' })
    })
    bg.on('pointerdown', () => {
      this.cameras.main.fade(300, 10, 10, 20, false, (_, t) => {
        if (t === 1) this.scene.start(sceneKey)
      })
    })

    return { bg, lbl, dsc }
  }

  update() {
    if (Phaser.Input.Keyboard.JustDown(this._escKey)) this._goSudo()
  }

  _makeBtn(x, y, txt, cb) {
    const btn = this.add.text(x, y, txt, {
      fontSize: '11px', color: '#ccbbaa', fontFamily: 'Courier New',
      backgroundColor: '#1a1828', padding: { x: 8, y: 4 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true })
    btn.on('pointerover', () => btn.setStyle({ color: '#ffffff', backgroundColor: '#2a2040' }))
    btn.on('pointerout',  () => btn.setStyle({ color: '#ccbbaa', backgroundColor: '#1a1828' }))
    btn.on('pointerdown', cb)
    return btn
  }
}
