// Guitar Hero × Typing of the Dead
// Type each letter in rhythm. Miss the window → AI-glyph replaces the letter.
// Spell the word correctly to win.

import Phaser from 'phaser'

const GLITCH_CHARS = ['▓','░','▒','╬','╠','╣','Ω','Σ','∆','∇','≠','≈','∞','←','→','⊕','⊗','◆','※','⁂','✦','⬡','❋','⌘','▲','◀','✺']
const SWEEP_DURATION = 1800  // ms for one full sweep
const HIT_ZONE_LO   = 0.32
const HIT_ZONE_HI   = 0.68

export class TypingMinigameScene extends Phaser.Scene {
  constructor() { super('TypingMinigameScene') }

  init(data) {
    this._slopState   = data?.slopState  || {}
    this._returnScene = data?.returnScene || null
    // DungeonScene passes targetWord explicitly; west dungeon uses 'pattern' by default
    this._word        = (data?.targetWord || 'pattern').toLowerCase()
  }

  create() {
    const W = 800, H = 600

    this.add.rectangle(W / 2, H / 2, W, H, 0x08060f)

    // Title
    const titleLabel = this._returnScene
      ? '// SPEAK THE WORD //'
      : '// ARCHIVE QUERY TERMINAL //'
    this.add.text(W / 2, 38, titleLabel, {
      fontSize: '13px', color: '#554466', fontFamily: 'Courier New'
    }).setOrigin(0.5)

    // In standalone mode show the query word as a hint (DungeonScene has its own gate label)
    if (!this._returnScene) {
      this.add.text(W / 2, 58, `query: "${this._word}"`, {
        fontSize: '11px', color: '#3d2255', fontFamily: 'Courier New'
      }).setOrigin(0.5)
    }

    // Word display — shows letters typed so far
    this._letterDisplays = this._word.split('').map((_, i) => {
      const x = W / 2 + (i - (this._word.length - 1) / 2) * 52
      const box = this.add.rectangle(x, H / 2 - 20, 44, 52, 0x110820).setDepth(5)
      const text = this.add.text(x, H / 2 - 20, '_', {
        fontSize: '28px', color: '#443355', fontFamily: 'Courier New'
      }).setOrigin(0.5).setDepth(6)
      return { box, text, result: null }
    })

    // Current letter prompt
    this._promptLabel = this.add.text(W / 2, H / 2 + 60, '', {
      fontSize: '14px', color: '#887799', fontFamily: 'Courier New'
    }).setOrigin(0.5)

    // Timing bar
    const barY = H / 2 + 110
    const barW = 400
    this._barBg = this.add.rectangle(W / 2, barY, barW, 16, 0x1a1228)
    this._hitZone = this.add.rectangle(
      W / 2 - barW / 2 + HIT_ZONE_LO * barW + (HIT_ZONE_HI - HIT_ZONE_LO) * barW / 2,
      barY, (HIT_ZONE_HI - HIT_ZONE_LO) * barW, 16, 0x442266
    )
    this._indicator = this.add.rectangle(W / 2 - barW / 2, barY, 6, 22, 0xcc88ff)
    this._barW = barW

    // Instruction
    this._instructionText = this.add.text(W / 2, barY + 30, 'press the letter when the bar is in the zone', {
      fontSize: '10px', color: '#443355', fontFamily: 'Courier New'
    }).setOrigin(0.5)

    // Result banner (hidden until end)
    this._resultBanner = this.add.text(W / 2, H - 80, '', {
      fontSize: '16px', fontFamily: 'Courier New', align: 'center'
    }).setOrigin(0.5).setVisible(false)

    this._retryText = this.add.text(W / 2, H - 52, '', {
      fontSize: '11px', color: '#665577', fontFamily: 'Courier New'
    }).setOrigin(0.5).setVisible(false)

    // State
    this._letterIdx = 0
    this._typed = Array(this._word.length).fill(null)
    this._sweepT = 0
    this._sweepDir = 1
    this._waiting = false
    this._done = false
    this._transitioning = false

    // Keyboard listener
    this._keyListener = (evt) => this._onKey(evt.key)
    this.input.keyboard.on('keydown', this._keyListener)

    this.cameras.main.fadeIn(300, 0, 0, 0)
    this._beginLetter()
  }

  _beginLetter() {
    if (this._letterIdx >= this._word.length) { this._finish(); return }
    const letter = this._word[this._letterIdx].toUpperCase()
    this._promptLabel.setText(`press: [ ${letter} ]`).setColor('#cc99ff')
    this._waiting = false

    // Pulse the current letter box
    this.tweens.add({
      targets: this._letterDisplays[this._letterIdx].box,
      alpha: 0.4, yoyo: true, repeat: -1, duration: 500
    })
  }

  _onKey(key) {
    if (this._waiting || this._done) return
    if (this._letterIdx >= this._word.length) return

    const expected = this._word[this._letterIdx]
    const pressed  = key.toLowerCase()
    if (pressed.length !== 1 || !/[a-z]/.test(pressed)) return

    this._waiting = true
    const inZone   = this._sweepT >= HIT_ZONE_LO && this._sweepT <= HIT_ZONE_HI
    const correct  = pressed === expected && inZone

    const display = this._letterDisplays[this._letterIdx]
    this.tweens.killTweensOf(display.box)
    display.box.setAlpha(1)

    if (correct) {
      display.text.setText(expected.toUpperCase()).setColor('#ccffcc')
      display.box.setFillStyle(0x224422)
      display.result = 'correct'
      this._indicator.setFillStyle(0x44ff88)
    } else {
      const glyph = Phaser.Math.RND.pick(GLITCH_CHARS)
      display.text.setText(glyph).setColor('#cc44aa')
      display.box.setFillStyle(0x330022)
      display.result = 'wrong'
      this._indicator.setFillStyle(0xff2244)
      // Shake the display
      this.tweens.add({ targets: display.box, x: display.box.x + 6, yoyo: true, repeat: 3, duration: 50 })
    }

    this.time.delayedCall(500, () => {
      this._indicator.setFillStyle(0xcc88ff)
      this._letterIdx++
      this._waiting = false
      this._beginLetter()
    })
  }

  _finish() {
    this._done = true
    this._promptLabel.setText('')

    const allCorrect = this._typed.every((_, i) => this._letterDisplays[i].result === 'correct')
    // Re-check from displays
    const success = this._letterDisplays.every(d => d.result === 'correct')

    this.time.delayedCall(400, () => {
      if (success) {
        this._resultBanner
          .setText(`[ ${this._word.toUpperCase()} ]\n\nthe gate opens.`)
          .setColor('#88ffaa').setVisible(true)

        this.time.delayedCall(1800, () => this._returnToGame(true))
      } else {
        const typed = this._letterDisplays.map(d =>
          d.result === 'correct' ? this._word[this._letterDisplays.indexOf(d)].toUpperCase() : d.text.text
        ).join('')
        this._resultBanner
          .setText(`[ ${typed} ]\n\nthe gate did not understand.`)
          .setColor('#cc44aa').setVisible(true)
        this._retryText.setText('press R to try again  /  press ESC to leave').setVisible(true)
        this._retryKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.R)
        this._escKey   = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC)
      }
    })
  }

  _returnToGame(unlocked) {
    if (this._transitioning) return
    this._transitioning = true
    this.input.keyboard.off('keydown', this._keyListener)
    this.cameras.main.fade(400, 0, 0, 0, false, (_, t) => {
      if (t === 1) {
        if (this._returnScene) {
          // Overlay mode: called from DungeonScene (paused, waiting for result)
          this.scene.resume(this._returnScene, { unlocked })
          this.scene.stop()
        } else {
          // Standalone mode: west dungeon gate — full scene transition
          const dest   = unlocked ? 'DuplicateBossScene' : 'WestC3Scene'
          const origin = unlocked ? 'north' : 'south'
          this.scene.start(dest, { slopState: this._slopState, spawnOrigin: origin })
        }
      }
    })
  }

  update(_, delta) {
    if (this._done) {
      if (this._retryKey && Phaser.Input.Keyboard.JustDown(this._retryKey)) this.scene.restart({ slopState: this._slopState, targetWord: this._word, returnScene: this._returnScene })
      if (this._escKey  && Phaser.Input.Keyboard.JustDown(this._escKey))  this._returnToGame(false)
      return
    }

    if (!this._waiting) {
      // Sweep the timing bar back and forth
      this._sweepT += this._sweepDir * (delta / SWEEP_DURATION)
      if (this._sweepT >= 1) { this._sweepT = 1; this._sweepDir = -1 }
      if (this._sweepT <= 0) { this._sweepT = 0; this._sweepDir =  1 }

      const barLeft = this._barBg.x - this._barW / 2
      this._indicator.x = barLeft + this._sweepT * this._barW

      // Glow when in zone
      const inZone = this._sweepT >= HIT_ZONE_LO && this._sweepT <= HIT_ZONE_HI
      this._hitZone.setFillStyle(inZone ? 0x6633aa : 0x331155)
      this._indicator.setScale(1, inZone ? 1.4 : 1)
    }
  }
}
