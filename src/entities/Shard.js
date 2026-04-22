import Phaser from 'phaser'

// Shard — a fractured render artifact. Bounces off walls with near-zero drag,
// periodically "nullifies" (becomes semi-transparent and immune to prompts).
// During null phase the player's prompt passes through it; timing matters.
export class Shard extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y) {
    super(scene, x, y, 'enemy')
    scene.add.existing(this)
    scene.physics.add.existing(this)

    this.setDepth(9).setScale(0.7).setTint(0x88aaff)
    this.body.setSize(18, 18).setOffset(7, 7)
    this.body.setBounce(0.88, 0.88)
    this.body.setMaxVelocity(300, 300)
    this.body.setDrag(0, 0)

    this._dying   = false
    this._nulled  = false
    this._inNull  = false
    this._nullTimer   = 0
    this._nullCycle   = Phaser.Math.Between(2500, 5000)
    this._nullDuration = 480

    const angle = Math.random() * Math.PI * 2
    this.body.setVelocity(Math.cos(angle) * 230, Math.sin(angle) * 230)
  }

  tick(delta) {
    if (this._dying) return

    this._nullTimer += delta

    if (!this._inNull && this._nullTimer >= this._nullCycle) {
      this._inNull = true
      this._nulled = true
      this._nullTimer = 0
      this.setAlpha(0.2).setTint(0xffffff)
    } else if (this._inNull && this._nullTimer >= this._nullDuration) {
      this._inNull = false
      this._nulled = false
      this._nullTimer = 0
      this._nullCycle = Phaser.Math.Between(2500, 5000)
      this.setAlpha(1).setTint(0x88aaff)
    }
  }

  // Returns false if nulled (hit didn't register) so caller can skip the sound.
  onHit(word, onDeath) {
    if (this._dying || this._nulled) return false
    this._dying = true
    this.body.setVelocity(0, 0)
    const { x, y } = this

    const label = this.scene.add.text(x, y - 16, `[${word}]`, {
      fontSize: '11px', color: '#88aaff', fontFamily: 'Courier New',
      backgroundColor: '#060318', padding: { x: 3, y: 2 },
    }).setDepth(20).setOrigin(0.5)
    this.scene.tweens.add({
      targets: label, y: label.y - 36, alpha: 0, duration: 900,
      onComplete: () => label.destroy(),
    })

    this.setTint(0xffffff)
    this.scene.tweens.add({
      targets: this, scaleX: 1.4, scaleY: 1.4, duration: 55, yoyo: true,
      onComplete: () => {
        this.scene.tweens.add({
          targets: this, alpha: 0, scaleX: 0.05, scaleY: 0.05,
          duration: 260, ease: 'Quad.easeIn',
          onComplete: () => { if (onDeath) onDeath(x, y); this.destroy() },
        })
      },
    })
    return true
  }
}
