// Chapter 3 — entry seam.
//
// Chapter 3 is being built as a SEPARATE Phaser project and will be connected
// here once its repo is available. This scene is the clean handoff point: it
// persists the player's state at the chapter boundary (so the external chapter
// can resume from it on the same domain/save) and shows a "to be continued"
// beat instead of dead-ending into the old platformer.
//
// TO WIRE IN THE REAL CHAPTER 3 (later):
//   - If bundled into this project: register its first scene in main.js and
//     replace the body of create() with a transition to it.
//   - If deployed separately: redirect from here (window.location) to its URL,
//     handing off `this._slopState` via the shared save / a query param.

import Phaser       from 'phaser'
import { W, H }     from '../../config/constants.js'
import { SaveState } from '../../ui/SaveState.js'

export class Ch3Scene extends Phaser.Scene {
  constructor() { super('Ch3Scene') }

  init(data) {
    this._slopState = data?.slopState || {}
    this._returning = false
  }

  create() {
    // Mark Chapter 2 complete and persist, so the (separate) Chapter 3 project
    // can pick the player up from here.
    this._slopState = { ...this._slopState, chapter2Complete: true }
    try { SaveState.save(this._slopState) } catch (_) {}

    this.add.rectangle(W / 2, H / 2, W, H, 0x0a0810)

    this.add.text(W / 2, H / 2 - 44, 'chapter 3', {
      fontSize: '24px', color: '#c8b8e8', fontFamily: 'Courier New', letterSpacing: 5,
    }).setOrigin(0.5).setDepth(2)

    this.add.text(W / 2, H / 2 - 8, 'the final chapter', {
      fontSize: '11px', color: '#7766aa', fontFamily: 'Courier New', letterSpacing: 3,
    }).setOrigin(0.5).setDepth(2)

    const cont = this.add.text(W / 2, H / 2 + 44, 'to be continued…', {
      fontSize: '10px', color: '#55486f', fontFamily: 'Courier New',
    }).setOrigin(0.5).setDepth(2)
    this.tweens.add({
      targets: cont, alpha: 0.2,
      yoyo: true, repeat: -1, duration: 1200, ease: 'Sine.easeInOut',
    })

    this.add.text(W / 2, H - 40, 'press SPACE to return to the terminal', {
      fontSize: '9px', color: '#44405a', fontFamily: 'Courier New',
    }).setOrigin(0.5).setDepth(2)

    // Drifting motes, matching the Ch2 ambient feel.
    for (let i = 0; i < 14; i++) {
      const dot = this.add.rectangle(
        Phaser.Math.Between(40, W - 40), Phaser.Math.Between(40, H - 40),
        2, 2, 0x6655aa, 0.5
      ).setDepth(1)
      this.tweens.add({
        targets: dot, y: dot.y - Phaser.Math.Between(60, 160), alpha: 0,
        duration: Phaser.Math.Between(2600, 5200), delay: Phaser.Math.Between(0, 3000),
        repeat: -1,
        onRepeat: () => { dot.x = Phaser.Math.Between(40, W - 40); dot.y = Phaser.Math.Between(H / 2, H - 40); dot.setAlpha(0.5) },
      })
    }

    this._spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE)
    this._enterKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER)
    this.cameras.main.fadeIn(800, 0, 0, 0)
  }

  update() {
    if (this._returning) return
    if (Phaser.Input.Keyboard.JustDown(this._spaceKey) || Phaser.Input.Keyboard.JustDown(this._enterKey)) {
      this._returning = true
      this.cameras.main.fade(500, 0, 0, 0, false, (_, t) => {
        if (t === 1) this.scene.start('MenuScene')
      })
    }
  }
}
