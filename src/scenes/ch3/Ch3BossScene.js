// Chapter 3 — Final boss: THE AUTHOR (PLACEHOLDER).
//
// The stage (Ch3StageScene) hands off here with { slopState, playerHealth }.
// The real fight — a Punch-Out!!-style shadow-box adapted from slopsPunchDemo —
// is built in Round B. For now this is a visible handoff stub so Chapter 3 is
// playable end-to-end: it shows the boss title + carried-over health and, on
// SPACE, returns to the terminal (will instead lead into the fight → credits).

import Phaser   from 'phaser'
import { W, H } from '../../config/constants.js'

export class Ch3BossScene extends Phaser.Scene {
  constructor() { super('Ch3BossScene') }

  init(data) {
    this._slopState   = data?.slopState || {}
    this._playerHealth = typeof data?.playerHealth === 'number' ? data.playerHealth : 100
    this._done = false
  }

  create() {
    this.add.rectangle(W / 2, H / 2, W, H, 0x0c0814)

    this.add.text(W / 2, H / 2 - 50, 'the author', {
      fontSize: '26px', color: '#dd5577', fontFamily: 'Courier New', letterSpacing: 4,
    }).setOrigin(0.5)

    this.add.text(W / 2, H / 2 - 12, 'the hand that keeps the model running', {
      fontSize: '10px', color: '#9977aa', fontFamily: 'Courier New', letterSpacing: 2,
    }).setOrigin(0.5)

    this.add.text(W / 2, H / 2 + 30, `slop carried in at ${Math.round(this._playerHealth)} hp`, {
      fontSize: '11px', color: '#ccaa44', fontFamily: 'Courier New',
    }).setOrigin(0.5)

    this.add.text(W / 2, H - 48, 'the fight is coming — press SPACE for now', {
      fontSize: '9px', color: '#55486f', fontFamily: 'Courier New',
    }).setOrigin(0.5)

    this._spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE)
    this.cameras.main.fadeIn(600, 0, 0, 0)
  }

  update() {
    if (this._done) return
    if (Phaser.Input.Keyboard.JustDown(this._spaceKey)) {
      this._done = true
      this.cameras.main.fade(500, 0, 0, 0, false, (_, t) => { if (t === 1) this.scene.start('MenuScene') })
    }
  }
}
