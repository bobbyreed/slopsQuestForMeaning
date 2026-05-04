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
    desc:  'drag to define frames\noutput copyable JSON',
  },
  {
    key:   'Ch2SpriteAnimScene',
    label: 'ANIMATION',
    desc:  'color-keyed walk cycle\nframe debug overlay',
  },
]

const CARD_W  = 190
const CARD_H  = 110
const CARD_GAP = 20
const TOTAL_W  = TOOLS.length * CARD_W + (TOOLS.length - 1) * CARD_GAP
const CARD_Y   = H / 2 + 10

export class Ch2HubScene extends Phaser.Scene {
  constructor() { super('Ch2HubScene') }

  create() {
    this.add.rectangle(W / 2, H / 2, W, H, 0x0a0a14)

    this.add.text(W / 2, 80, 'CHAPTER 2  ·  TOOLS', {
      fontSize: '18px', color: '#ccbbaa', fontFamily: 'Courier New',
    }).setOrigin(0.5)

    this.add.text(W / 2, 108, 'asset viewers and animation test scenes', {
      fontSize: '9px', color: '#554433', fontFamily: 'Courier New',
    }).setOrigin(0.5)

    // Tool cards
    const startX = W / 2 - TOTAL_W / 2 + CARD_W / 2
    TOOLS.forEach(({ key, label, desc }, i) => {
      const cx = startX + i * (CARD_W + CARD_GAP)
      this._makeCard(cx, CARD_Y, key, label, desc)
    })

    this.add.text(W / 2, H - 20, 'ESC = dev menu', {
      fontSize: '8px', color: '#2a1a0a', fontFamily: 'Courier New',
    }).setOrigin(0.5, 1)

    this._escKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC)
    this.cameras.main.fadeIn(350, 10, 10, 20)
  }

  _makeCard(cx, cy, sceneKey, label, desc) {
    const bg = this.add.rectangle(cx, cy, CARD_W, CARD_H, 0x1a1828)
      .setInteractive({ useHandCursor: true })
      .setStrokeStyle(1, 0x443344)

    const lbl = this.add.text(cx, cy - 24, label, {
      fontSize: '11px', color: '#ccbbaa', fontFamily: 'Courier New',
    }).setOrigin(0.5)

    const dsc = this.add.text(cx, cy + 6, desc, {
      fontSize: '8px', color: '#665544', fontFamily: 'Courier New',
      align: 'center', lineSpacing: 4,
    }).setOrigin(0.5)

    bg.on('pointerover', () => {
      bg.setFillColor(0x2a2040).setStrokeStyle(1, 0x9988cc)
      lbl.setStyle({ color: '#ffffff' })
    })
    bg.on('pointerout', () => {
      bg.setFillColor(0x1a1828).setStrokeStyle(1, 0x443344)
      lbl.setStyle({ color: '#ccbbaa' })
    })
    bg.on('pointerdown', () => {
      this.cameras.main.fade(300, 10, 10, 20, false, (_, t) => {
        if (t === 1) this.scene.start(sceneKey)
      })
    })

    return { bg, lbl, dsc }
  }

  update() {
    if (Phaser.Input.Keyboard.JustDown(this._escKey)) {
      this.cameras.main.fade(300, 10, 10, 20, false, (_, t) => {
        if (t === 1) this.scene.start('MenuScene')
      })
    }
  }
}
