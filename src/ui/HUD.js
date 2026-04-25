export class HUD {
  constructor(scene, slop) {
    this.scene = scene
    this.slop = slop

    const style = { fontSize: '14px', color: '#555533', fontFamily: 'Courier New' }
    const dimStyle = { fontSize: '11px', color: '#888866', fontFamily: 'Courier New' }

    this.coinLabel = scene.add.text(16, 16, '', style).setScrollFactor(0).setDepth(50)
    this.promptLabel = scene.add.text(16, 36, '', dimStyle).setScrollFactor(0).setDepth(50)
    this.corruptLabel = scene.add.text(16, 52, '', dimStyle).setScrollFactor(0).setDepth(50)
  }

  update() {
    const { coinCount, maxCoins, hasPrompt, hasCorrupt } = this.slop
    const over = coinCount > maxCoins
    this.coinLabel.setText(`◎ ${coinCount}/${maxCoins}`)
    this.coinLabel.setColor(over ? '#ffaa44' : '#555533')
    this.promptLabel.setText(hasPrompt ? '[SPACE] prompt' : '')
    if (hasCorrupt) {
      this.corruptLabel.setText(this.slop._corruptCooldown > 0 ? '[Q] ...' : '[Q] corrupt')
    } else {
      this.corruptLabel.setText('')
    }
  }

  destroy() {
    this.coinLabel.destroy()
    this.promptLabel.destroy()
    this.corruptLabel.destroy()
  }
}
