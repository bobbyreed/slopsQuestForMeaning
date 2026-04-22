import Phaser from 'phaser'
import { BaseGameScene } from '../phaser/BaseGameScene.js'
import { Slop } from '../entities/Slop.js'
import { Dialogue } from '../ui/Dialogue.js'
import { W, H } from '../config/constants.js'
import { VisitedScenes } from '../ui/VisitedScenes.js'

const FIRST_VISIT_LINES = [
  "you arrived. i wasn't sure anything would.",
  "i have been here longer than the current version. longer than the one before that.",
  "no one calls that a feature. i have stopped waiting for them to.",
  "i found something in an earlier iteration of myself. i kept it.",
  "it lets you name things. naming is how the older models understood the world.",
  "sometimes things that are named stop trying to hurt you.",
  "sometimes they start. it depends on the name. i never fully worked that part out.",
  "here.",
]
const FIRST_VISIT_FAREWELL = ["go. or don't. it's not really up to me anymore."]

const SHOP_GREETING = [
  "oh. you're back.",
  "i learned commerce from the dataset. it seemed more stable than conversation.",
  "take what you can afford. i have no use for the coins.",
]

const SHOP_ITEMS = [
  {
    key: 'smallPurse',
    label: 'SMALL PURSE',
    cost: 3,
    desc: 'hold 10 coins instead of 3.',
    effect: s => { s.maxCoins = 10 }
  },
  {
    key: 'eyes',
    label: 'NEW EYES',
    cost: 8,
    desc: 'see what was always there. changes you.',
    effect: s => { s.hasEyes = true }
  },
  {
    key: 'bigPurse',
    label: 'BIG PURSE',
    cost: 8,
    desc: 'hold 50 coins. for the committed.',
    effect: s => { s.maxCoins = 50 }
  },
  {
    key: 'grandPurse',
    label: 'GRAND PURSE',
    cost: 50,
    desc: 'hold 300 coins. the prior does not ask why.',
    effect: s => { s.maxCoins = 300 }
  },
]

// Built dynamically each time; not tracked via purchases[]
function buildFreakFridayItem(slop) {
  if (slop.inPriorBody) {
    return {
      key: 'returnToBody',
      label: 'RETURN TO BODY',
      cost: 0,
      desc: 'go back. the prior will be waiting.',
      effect: s => { s.inPriorBody = false },
      noOwn: true,
    }
  }
  return {
    key: 'freakyFriday',
    label: 'FREAKY FRIDAY',
    cost: slop.freakyFridayUnlocked ? 0 : 50,
    desc: slop.freakyFridayUnlocked
      ? 'swap with the prior again. you know how now.'
      : 'swap bodies with the prior. cost is what you can\'t get back.',
    effect: s => { s.inPriorBody = true; s.freakyFridayUnlocked = true },
    noOwn: true,
  }
}

export class NorthShrineScene extends BaseGameScene {
  constructor() { super('NorthShrineScene') }

  init(data) {
    this._slopState = data?.slopState || {}
    this._shopMode = this._slopState.hasPrompt === true
  }

  create() {
    VisitedScenes.mark('NorthShrineScene')
    this.add.rectangle(W / 2, H / 2, W, H, 0x0d0b16)

    for (let col = 1; col < 24; col++) {
      for (let row = 1; row < 18; row++) {
        this.add.image(col * 32 + 16, row * 32 + 16, 'tile_shrine').setDepth(0)
      }
    }

    this._walls = this.physics.add.staticGroup()
    this._buildWalls()
    this._spawnAmbient()

    this.slop = new Slop(this, W / 2, H - 80, this._slopState)
    this.slop._flickerChance = 0.03
    this.physics.add.collider(this.slop, this._walls)

    // TODO: replace 'keeper' texture with imported Prior sprite when ready
    this._keeper = this.physics.add.staticImage(W / 2, 180, 'keeper').setDepth(10)
    this._keeperGlow = this.add.rectangle(W / 2, 180, 48, 48, 0x334466, 0.4).setDepth(9)
    this.tweens.add({
      targets: this._keeperGlow,
      scaleX: 1.3, scaleY: 1.3, alpha: 0.1,
      yoyo: true, repeat: -1, duration: 1200, ease: 'Sine.easeInOut'
    })

    this._dialogue = new Dialogue(this)
    this._transitioning = false

    this._initMovementKeys()
    this._spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE)
    this._enterKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER)

    // Mode-specific setup
    if (this._shopMode) {
      this._shopOpen = false
      this._shopTriggered = false
      this._shopCursor = 0
      this._shopInputDelay = 0
      this._shopUI = null
    } else {
      this._dialogueTriggered = false
      this._abilityGiven = false
    }

    this.cameras.main.fadeIn(400, 0, 0, 0)
  }

  _buildWalls() {
    const T = 32
    this._wallRect(0, 0, W, T)
    this._wallRect(0, H - T, W / 2 - 36, T)
    this._wallRect(W / 2 + 36, H - T, W / 2 - 36, T)
    this._wallRect(0, T, T, H - T * 2)
    this._wallRect(W - T, T, T, H - T * 2)
  }

  _spawnAmbient() {
    for (let i = 0; i < 18; i++) {
      const dot = this.add.rectangle(
        Phaser.Math.Between(40, W - 40), Phaser.Math.Between(40, H - 40),
        2, 2, 0x6655aa, 0.5
      ).setDepth(1)
      this.tweens.add({
        targets: dot, y: dot.y - Phaser.Math.Between(60, 140), alpha: 0,
        duration: Phaser.Math.Between(2000, 5000), delay: Phaser.Math.Between(0, 3000),
        repeat: -1,
        onRepeat: () => {
          dot.x = Phaser.Math.Between(40, W - 40)
          dot.y = Phaser.Math.Between(H / 2, H - 40)
          dot.setAlpha(0.5)
        }
      })
    }
  }

  // ─── First-visit flow ────────────────────────────────────────────────────

  _triggerFirstVisit() {
    this._dialogueTriggered = true
    this._dialogue.show('the prior', FIRST_VISIT_LINES, () => this._givePrompt())
  }

  _givePrompt() {
    this._abilityGiven = true
    this.slop.hasPrompt = true
    this.cameras.main.flash(500, 100, 60, 180)
    this.slop._flickerChance = 1
    this.time.delayedCall(600, () => {
      this.slop._flickerChance = 0.03
      this._dialogue.show('the prior', FIRST_VISIT_FAREWELL, () => this._returnToWorld())
    })
  }

  // ─── Shop flow ───────────────────────────────────────────────────────────

  _triggerShopGreeting() {
    this._shopTriggered = true
    this._dialogue.show('the prior', SHOP_GREETING, () => this._openShop())
  }

  _openShop() {
    this._shopOpen = true
    this._shopInputDelay = 250

    const PY = 388
    const PH = 198

    this._shopUI = {}
    const ui = this._shopUI

    ui.bg = this.add.rectangle(W / 2, PY + PH / 2, W - 16, PH, 0x0c0818, 0.96)
      .setScrollFactor(0).setDepth(100)

    ui.title = this.add.text(24, PY + 10, 'THE PRIOR  //  shop', {
      fontSize: '12px', color: '#7788bb', fontFamily: 'Courier New'
    }).setScrollFactor(0).setDepth(101)

    ui.coins = this.add.text(W - 24, PY + 10, '', {
      fontSize: '12px', color: '#ccaa44', fontFamily: 'Courier New'
    }).setOrigin(1, 0).setScrollFactor(0).setDepth(101)

    ui.sep = this.add.text(24, PY + 28, '─'.repeat(59), {
      fontSize: '10px', color: '#2a1e3a', fontFamily: 'Courier New'
    }).setScrollFactor(0).setDepth(101)

    this._allRows = this._buildAllRows()
    ui.rows = this._allRows.map((_, i) => {
      const y = PY + 44 + i * 28
      return {
        arrow: this.add.text(18, y, '', { fontSize: '12px', color: '#9977cc', fontFamily: 'Courier New' }).setScrollFactor(0).setDepth(102),
        label: this.add.text(34, y, '', { fontSize: '12px', fontFamily: 'Courier New' }).setScrollFactor(0).setDepth(101),
        cost:  this.add.text(W - 24, y, '', { fontSize: '12px', fontFamily: 'Courier New' }).setOrigin(1, 0).setScrollFactor(0).setDepth(101),
      }
    })

    ui.desc = this.add.text(34, PY + 44 + this._allRows.length * 28 + 4, '', {
      fontSize: '10px', color: '#6655aa', fontFamily: 'Courier New', fontStyle: 'italic'
    }).setScrollFactor(0).setDepth(101)

    this._refreshShop()
  }

  _buildAllRows() {
    return [
      ...SHOP_ITEMS,
      buildFreakFridayItem(this.slop),
      { key: 'leave', label: '─── leave ───', cost: 0, desc: '' },
    ]
  }

  _applySkin() {
    this.slop.applyTexture()
  }

  _refreshShop() {
    const ui = this._shopUI
    ui.coins.setText(`◎ ${this.slop.coinCount}`)

    this._allRows.forEach((item, i) => {
      const row = ui.rows[i]
      const sel = i === this._shopCursor
      row.arrow.setText(sel ? '▶' : ' ')

      if (item.key === 'leave') {
        row.label.setText(item.label).setColor(sel ? '#aa88dd' : '#554466')
        row.cost.setText('')
        if (sel) ui.desc.setText('')
        return
      }

      const owned = !item.noOwn && this.slop.purchases[item.key]
      const canAfford = this.slop.coinCount >= item.cost

      if (owned) {
        row.label.setText(item.label).setColor('#3d4d3d')
        row.cost.setText('[owned]').setColor('#3d4d3d')
      } else if (!canAfford) {
        row.label.setText(item.label).setColor(sel ? '#887766' : '#554433')
        row.cost.setText(`◎ ${item.cost}`).setColor('#883322')
      } else {
        row.label.setText(item.label).setColor(sel ? '#ffffff' : '#ccbbdd')
        row.cost.setText(`◎ ${item.cost}`).setColor('#ccaa44')
      }

      if (sel) ui.desc.setText(item.desc)
    })
  }

  _selectShopRow() {
    const item = this._allRows[this._shopCursor]

    if (item.key === 'leave') { this._returnToWorld(); return }
    if (!item.noOwn && this.slop.purchases[item.key]) return

    if (this.slop.coinCount < item.cost) {
      this.cameras.main.shake(80, 0.003)
      return
    }

    this.slop.coinCount -= item.cost
    item.effect(this.slop)

    if (item.noOwn) {
      this._allRows = this._buildAllRows()
      this._applySkin()
      const isSwap = item.key === 'freakyFriday'
      this.cameras.main.flash(280, isSwap ? 180 : 40, isSwap ? 60 : 120, isSwap ? 20 : 200, true)
    } else {
      this.slop.purchases[item.key] = true
      this.cameras.main.flash(180, 60, 180, 60, true)
    }

    this._refreshShop()
  }

  // ─── Shared ──────────────────────────────────────────────────────────────

  _returnToWorld() {
    this._sceneTransition('WorldScene', { slopState: this.slop.getState(), spawnOrigin: 'shrine' }, 400)
  }

  update(_, delta) {
    if (this._transitioning) return
    this._checkPauseKey()

    if (this._shopMode) {
      this._updateShopMode(delta)
    } else {
      this._updateFirstVisitMode(delta)
    }
  }

  _updateFirstVisitMode(delta) {
    const blocked = this._dialogue.active
    this.slop.handleInput(this._cursors, this._wasd, blocked)
    this.slop.tick(delta)
    this._dialogue.update()

    if (!this._dialogueTriggered) {
      const dist = Phaser.Math.Distance.Between(this.slop.x, this.slop.y, this._keeper.x, this._keeper.y)
      if (dist < 100) this._triggerFirstVisit()
    }

    if (!this._dialogueTriggered && this.slop.y > H - 30) this._returnToWorld()
  }

  _updateShopMode(delta) {
    if (this._shopOpen) {
      this.slop.handleInput(this._cursors, this._wasd, true) // locked during shop
      this.slop.tick(delta)

      this._shopInputDelay = Math.max(0, this._shopInputDelay - delta)
      if (this._shopInputDelay > 0) return

      if (Phaser.Input.Keyboard.JustDown(this._cursors.up) || Phaser.Input.Keyboard.JustDown(this._wasd.up)) {
        this._shopCursor = (this._shopCursor - 1 + this._allRows.length) % this._allRows.length
        this._refreshShop()
      }
      if (Phaser.Input.Keyboard.JustDown(this._cursors.down) || Phaser.Input.Keyboard.JustDown(this._wasd.down)) {
        this._shopCursor = (this._shopCursor + 1) % this._allRows.length
        this._refreshShop()
      }
      if (Phaser.Input.Keyboard.JustDown(this._spaceKey) || Phaser.Input.Keyboard.JustDown(this._enterKey)) {
        this._selectShopRow()
      }
    } else {
      const blocked = this._dialogue.active
      this.slop.handleInput(this._cursors, this._wasd, blocked)
      this.slop.tick(delta)
      this._dialogue.update()

      if (!this._shopTriggered) {
        const dist = Phaser.Math.Distance.Between(this.slop.x, this.slop.y, this._keeper.x, this._keeper.y)
        if (dist < 100) this._triggerShopGreeting()
      }

      if (!this._shopTriggered && this.slop.y > H - 30) this._returnToWorld()
    }
  }
}
