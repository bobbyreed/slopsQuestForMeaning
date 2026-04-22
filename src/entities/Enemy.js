import Phaser from 'phaser'

export class Enemy extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y) {
    super(scene, x, y, 'enemy')
    scene.add.existing(this)
    scene.physics.add.existing(this)

    this.setDepth(9)
    this.body.setSize(22, 22)
    this.body.setOffset(5, 5)
    this.body.setMaxVelocity(90, 90)
    this.body.setDrag(400, 400)

    this._dying = false
    this._wanderTimer = Phaser.Math.Between(600, 1800)
    this._flickerTimer = Phaser.Math.Between(400, 1400)
    this._pickNewDirection()
  }

  _pickNewDirection() {
    const angle = Math.random() * Math.PI * 2
    const speed = Phaser.Math.Between(35, 75)
    this._vx = Math.cos(angle) * speed
    this._vy = Math.sin(angle) * speed
  }

  tick(delta, slopX, slopY) {
    if (this._dying) return

    const dist = Phaser.Math.Distance.Between(this.x, this.y, slopX, slopY)

    if (dist < 170) {
      const angle = Math.atan2(slopY - this.y, slopX - this.x)
      this.body.setVelocity(Math.cos(angle) * 90, Math.sin(angle) * 90)
    } else {
      this._wanderTimer -= delta
      if (this._wanderTimer <= 0) {
        this._wanderTimer = Phaser.Math.Between(600, 1800)
        this._pickNewDirection()
      }
      this.body.setVelocity(this._vx, this._vy)
    }

    this._flickerTimer -= delta
    if (this._flickerTimer <= 0) {
      this._flickerTimer = Phaser.Math.Between(400, 1400)
      if (Math.random() < 0.35) {
        this.setTint(0xff3322)
        this.scene.time.delayedCall(70, () => { if (this.active) this.clearTint() })
      }
    }
  }

  onHit(word, onDeath) {
    if (this._dying) return false
    this._dying = true
    this.body.setVelocity(0, 0)
    const deathX = this.x, deathY = this.y

    // Float the naming word up
    const label = this.scene.add.text(this.x, this.y - 16, `[${word}]`, {
      fontSize: '11px', color: '#dd99ff', fontFamily: 'Courier New',
      backgroundColor: '#110820', padding: { x: 3, y: 2 }
    }).setDepth(20).setOrigin(0.5)

    this.scene.tweens.add({
      targets: label, y: label.y - 36, alpha: 0, duration: 900,
      onComplete: () => label.destroy()
    })

    // Hit flash → shrink away
    this.setTint(0xffffff)
    this.scene.tweens.add({
      targets: this, scaleX: 1.5, scaleY: 1.5, duration: 70, yoyo: true,
      onComplete: () => {
        this.scene.tweens.add({
          targets: this, alpha: 0, scaleX: 0.05, scaleY: 0.05,
          duration: 320, ease: 'Quad.easeIn',
          onComplete: () => {
            if (onDeath) onDeath(deathX, deathY)
            this.destroy()
          }
        })
      }
    })
    return true
  }
}
