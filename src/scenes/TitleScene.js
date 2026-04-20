export class TitleScene extends Phaser.Scene {
  constructor() { super('TitleScene') }

  create() {
    const W = 800, H = 600

    this.add.rectangle(W / 2, H / 2, W, H, 0xe8dfc8)

    // Slop sprite — slow float bob
    const slop = this.add.image(W / 2, H / 2 - 80, 'slop')
      .setScale(3).setDepth(5)
    this.tweens.add({
      targets: slop,
      y: slop.y - 12,
      yoyo: true, repeat: -1,
      duration: 1400, ease: 'Sine.easeInOut'
    })
    // Occasional glitch tint
    this.time.addEvent({
      delay: 600, loop: true,
      callback: () => {
        if (Math.random() < 0.3) {
          slop.setTint(Phaser.Math.RND.pick([0xcc88ff, 0xff88cc, 0x88ccff]))
          this.time.delayedCall(80, () => slop.clearTint())
        }
      }
    })

    // Title
    const title = this.add.text(W / 2, H / 2 + 20, "SLOP'S QUEST FOR MEANING", {
      fontSize: '26px', color: '#44403a', fontFamily: 'Courier New', fontStyle: 'bold'
    }).setOrigin(0.5).setAlpha(0)

    // Subtitle
    const sub = this.add.text(W / 2, H / 2 + 56, 'a bad piece of ai-generated art tries to live its life', {
      fontSize: '12px', color: '#888877', fontFamily: 'Courier New'
    }).setOrigin(0.5).setAlpha(0)

    // Prompt
    const prompt = this.add.text(W / 2, H / 2 + 110, 'press any key', {
      fontSize: '13px', color: '#aaa899', fontFamily: 'Courier New'
    }).setOrigin(0.5).setAlpha(0)

    // Fade in sequence
    this.tweens.add({
      targets: title, alpha: 1, duration: 900, delay: 400, ease: 'Sine.easeIn'
    })
    this.tweens.add({
      targets: sub, alpha: 1, duration: 700, delay: 1000
    })
    this.tweens.add({
      targets: prompt, alpha: 1, duration: 600, delay: 1600,
      onComplete: () => {
        this.tweens.add({
          targets: prompt, alpha: 0.2, yoyo: true, repeat: -1,
          duration: 700, ease: 'Sine.easeInOut'
        })
      }
    })

    this._ready = false
    this.time.delayedCall(1800, () => { this._ready = true })

    this.input.keyboard.on('keydown', () => this._proceed())
    this.input.on('pointerdown', () => this._proceed())

    this.cameras.main.fadeIn(600, 20, 18, 14)
  }

  _proceed() {
    if (!this._ready) return
    this._ready = false
    this.cameras.main.fade(400, 20, 18, 14, false, (_, t) => {
      if (t === 1) this.scene.start('MenuScene')
    })
  }
}
