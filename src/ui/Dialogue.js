import Phaser from 'phaser'

export class Dialogue {
  constructor(scene) {
    this.scene = scene
    this.active = false
    this._lines = []
    this._lineIdx = 0
    this._charIdx = 0
    this._onComplete = null
    this._typeEvent = null

    const W = scene.scale.width
    const H = scene.scale.height

    this._bg = scene.add.rectangle(W / 2, H - 72, W - 32, 110, 0x110820, 0.93)
      .setScrollFactor(0).setDepth(100).setVisible(false)

    this._speaker = scene.add.text(32, H - 124, '', {
      fontSize: '11px', color: '#8899cc', fontFamily: 'Courier New'
    }).setScrollFactor(0).setDepth(101).setVisible(false)

    this._body = scene.add.text(32, H - 108, '', {
      fontSize: '13px', color: '#d4d4d8', fontFamily: 'Courier New',
      wordWrap: { width: W - 64 }
    }).setScrollFactor(0).setDepth(101).setVisible(false)

    this._arrow = scene.add.text(W - 28, H - 24, '▶', {
      fontSize: '11px', color: '#7b61ff', fontFamily: 'Courier New'
    }).setScrollFactor(0).setDepth(101).setVisible(false)

    this._spaceKey = scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE)
  }

  show(speakerName, lines, onComplete) {
    this._lines = lines
    this._speakerName = speakerName
    this._lineIdx = 0
    this._charIdx = 0
    this._onComplete = onComplete
    this.active = true
    this._setVisible(true)
    this._typeLine()
  }

  _typeLine() {
    this._arrow.setVisible(false)
    this._speaker.setText(this._speakerName)
    this._body.setText('')
    this._charIdx = 0

    if (this._typeEvent) this._typeEvent.remove(false)

    const line = this._lines[this._lineIdx]
    this._typeEvent = this.scene.time.addEvent({
      delay: 38,
      repeat: line.length - 1,
      callback: () => {
        this._charIdx++
        this._body.setText(line.substring(0, this._charIdx))
        this._beep()
        if (this._charIdx >= line.length) this._arrow.setVisible(true)
      }
    })
  }

  _beep() {
    if (this._charIdx % 2 !== 0) return
    try {
      const ctx = this.scene.sound.context
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.frequency.value = 180 + Math.random() * 80
      osc.type = 'square'
      gain.gain.setValueAtTime(0.04, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.06)
      osc.start(ctx.currentTime)
      osc.stop(ctx.currentTime + 0.06)
    } catch (_) {}
  }

  update() {
    if (!this.active) return
    if (Phaser.Input.Keyboard.JustDown(this._spaceKey)) this._advance()
  }

  _advance() {
    const line = this._lines[this._lineIdx]
    if (this._charIdx < line.length) {
      if (this._typeEvent) this._typeEvent.remove(false)
      this._charIdx = line.length
      this._body.setText(line)
      this._arrow.setVisible(true)
      return
    }
    this._lineIdx++
    if (this._lineIdx >= this._lines.length) {
      this._close()
    } else {
      this._typeLine()
    }
  }

  _close() {
    this.active = false
    this._setVisible(false)
    if (this._typeEvent) this._typeEvent.remove(false)
    if (this._onComplete) this._onComplete()
  }

  _setVisible(v) {
    this._bg.setVisible(v)
    this._speaker.setVisible(v)
    this._body.setVisible(v)
    this._arrow.setVisible(false)
  }
}
