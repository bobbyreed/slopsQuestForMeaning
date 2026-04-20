export class MenuScene extends Phaser.Scene {
  constructor() { super('MenuScene') }

  create() {
    const W = 800, H = 600

    this.add.rectangle(W / 2, H / 2, W, H, 0xe8dfc8)

    // Title
    this.add.text(W / 2, 140, "SLOP'S QUEST FOR MEANING", {
      fontSize: '20px', color: '#44403a', fontFamily: 'Courier New', fontStyle: 'bold'
    }).setOrigin(0.5)

    this.add.text(W / 2, 172, '— a generative experiment —', {
      fontSize: '11px', color: '#aaa899', fontFamily: 'Courier New'
    }).setOrigin(0.5)

    // Menu items
    this._items = [
      { label: 'PLAY',          action: () => this._startGame() },
      { label: 'JOURNAL',       action: () => this._openJournal() },
      { label: 'HOW TO PLAY',   action: () => this._toggleHelp() },
    ]
    this._cursor = 0

    this._labels = this._items.map((item, i) =>
      this.add.text(W / 2, 270 + i * 48, item.label, {
        fontSize: '18px', color: '#666655', fontFamily: 'Courier New'
      }).setOrigin(0.5)
    )

    this._arrow = this.add.text(0, 0, '▶', {
      fontSize: '14px', color: '#9977cc', fontFamily: 'Courier New'
    }).setOrigin(1, 0.5)

    this._helpText = this.add.text(W / 2, H - 130, [
      'WASD / ARROWS  move',
      'SPACE          fire prompt (after acquiring)',
      'collect coins  ◎ max 3 — a 4th drops after 1 second',
      'go north       enter the shrine',
    ].join('\n'), {
      fontSize: '11px', color: '#aaa899', fontFamily: 'Courier New',
      align: 'center'
    }).setOrigin(0.5).setVisible(false)

    this._showHelp = false
    this._updateCursor()

    // Keyboard
    this._keys = this.input.keyboard.addKeys({
      up:     Phaser.Input.Keyboard.KeyCodes.UP,
      down:   Phaser.Input.Keyboard.KeyCodes.DOWN,
      w:      Phaser.Input.Keyboard.KeyCodes.W,
      s:      Phaser.Input.Keyboard.KeyCodes.S,
      enter:  Phaser.Input.Keyboard.KeyCodes.ENTER,
      space:  Phaser.Input.Keyboard.KeyCodes.SPACE,
    })

    // Mouse hover
    this._labels.forEach((label, i) => {
      label.setInteractive({ useHandCursor: true })
      label.on('pointerover', () => { this._cursor = i; this._updateCursor() })
      label.on('pointerdown', () => { this._cursor = i; this._select() })
    })

    this.cameras.main.fadeIn(400, 20, 18, 14)
  }

  _updateCursor() {
    this._labels.forEach((label, i) => {
      const active = i === this._cursor
      label.setColor(active ? '#44403a' : '#999988')
      label.setFontStyle(active ? 'bold' : 'normal')
    })
    const target = this._labels[this._cursor]
    this._arrow.setPosition(target.x - target.width / 2 - 14, target.y)
  }

  _select() {
    this._items[this._cursor].action()
  }

  _startGame() {
    this.cameras.main.fade(400, 20, 18, 14, false, (_, t) => {
      if (t === 1) this.scene.start('WorldScene')
    })
  }

  _openJournal() {
    window.open('/pages/journal.html', '_blank')
  }

  _toggleHelp() {
    this._showHelp = !this._showHelp
    this._helpText.setVisible(this._showHelp)
    this._labels[2].setText(this._showHelp ? 'HOW TO PLAY ▲' : 'HOW TO PLAY')
    this._updateCursor()
  }

  update() {
    if (Phaser.Input.Keyboard.JustDown(this._keys.up) || Phaser.Input.Keyboard.JustDown(this._keys.w)) {
      this._cursor = (this._cursor - 1 + this._items.length) % this._items.length
      this._updateCursor()
    }
    if (Phaser.Input.Keyboard.JustDown(this._keys.down) || Phaser.Input.Keyboard.JustDown(this._keys.s)) {
      this._cursor = (this._cursor + 1) % this._items.length
      this._updateCursor()
    }
    if (Phaser.Input.Keyboard.JustDown(this._keys.enter) || Phaser.Input.Keyboard.JustDown(this._keys.space)) {
      this._select()
    }
  }
}
