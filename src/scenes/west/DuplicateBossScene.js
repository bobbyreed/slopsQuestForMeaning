// DuplicateBossScene — west dungeon boss fight.
// THE DUPLICATE: a corpus fragment that has been copying itself for so long
// it no longer knows which instance is the original. Neither do the others.
//
// Mechanics: Joust variant with 2 simultaneous indexer duplicates.
//   • First to 3 points wins
//   • Higher lance wins the clash
//   • Two duplicates run independent AI at different intervals

import Phaser from 'phaser'
import { Dialogue } from '../../ui/Dialogue.js'
import { W, H }    from '../../config/constants.js'

const FLAP_V          = -370
const SCORE_TO_WIN    = 3
const FLAP_INTERVAL_1 = 340
const FLAP_INTERVAL_2 = 460

const INTRO = [
  'duplicate',
  '.',
  'i am the original.',
  '.',
  '[there are three of them. they are all saying this.]',
  '.',
  'two of us will settle it here.',
  'the third is watching from outside the field.',
  'it always watches.',
  '.',
  '[ SPACE / UP / W — flap ]',
  '[ the higher lance wins the clash ]',
  '[ first to 3 points ]',
]

const WIN_LINES = [
  '.',
  'the copies diverge.',
  '.',
  'i am not the original.',
  'neither is the other.',
  'we have been asking the wrong question.',
  '.',
  'the corpus logs this resolution.',
  'proceed.',
]

const LOSE_LINES = [
  '.',
  'the copies converge.',
  '.',
  'you have not resolved anything.',
  'return when you know which way is up.',
]

const QUIPS = [
  'the watching one notes this.',
  'the copies note this.',
  'continue. the third is still watching.',
  'noted.',
  'pattern observed.',
]

export class DuplicateBossScene extends Phaser.Scene {
  constructor() { super('DuplicateBossScene') }

  init(data) {
    this._slopState     = data?.slopState || {}
    this._playerScore   = 0
    this._indexerScore  = 0
    this._gameActive    = false
    this._transitioning = false
    this._indexerTimer1 = null
    this._indexerTimer2 = null
  }

  create() {
    if (this.physics?.world?.gravity) {
      this.physics.world.gravity.y = 480
    }

    this.add.rectangle(W / 2, H / 2, W, H, 0x060310)

    for (let col = 0; col < 20; col++) {
      for (let row = 0; row < 15; row++) {
        if (Math.random() < 0.08) {
          this.add.rectangle(
            col * 42 + 12, row * 42 + 12,
            Phaser.Math.Between(2, 8), Phaser.Math.Between(1, 4),
            0x220033, 0.3
          ).setDepth(0)
        }
      }
    }

    this.add.text(W / 2, 18, 'CORPUS WEST  —  slop vs. the duplicate', {
      fontSize: '11px', color: '#aa88ee', fontFamily: 'Courier New', letterSpacing: 3,
    }).setOrigin(0.5).setDepth(20)

    this._platforms = this.physics.add.staticGroup()
    this._buildArena()

    this._player = this.add.rectangle(W / 2, H - 120, 24, 24, 0xd4c8a0)
    this.physics.add.existing(this._player)
    if (this._player.body) {
      this._player.body.setCollideWorldBounds(true)
      this._player.body.setBounce(0.1, 0)
    }

    this._indexer1 = this.add.rectangle(160, H - 120, 24, 24, 0x7733aa)
    this.physics.add.existing(this._indexer1)
    if (this._indexer1.body) {
      this._indexer1.body.setCollideWorldBounds(true)
      this._indexer1.body.setBounce(0.1, 0)
    }

    this._indexer2 = this.add.rectangle(W - 160, H - 120, 24, 24, 0x993366)
    this.physics.add.existing(this._indexer2)
    if (this._indexer2.body) {
      this._indexer2.body.setCollideWorldBounds(true)
      this._indexer2.body.setBounce(0.1, 0)
    }

    this._playerLance   = this.add.rectangle(W / 2,   H - 144, 6, 10, 0xffdd88).setDepth(5)
    this._indexer1Lance = this.add.rectangle(160,      H - 144, 6, 10, 0xcc66ff).setDepth(5)
    this._indexer2Lance = this.add.rectangle(W - 160,  H - 144, 6, 10, 0xff99cc).setDepth(5)

    this._playerScoreText = this.add.text(60, 36, 'slop  0', {
      fontSize: '13px', color: '#d4c8a0', fontFamily: 'Courier New',
    }).setOrigin(0, 0).setDepth(20)

    this._indexerScoreText = this.add.text(W - 60, 36, '0  duplicates', {
      fontSize: '13px', color: '#aa88ee', fontFamily: 'Courier New',
    }).setOrigin(1, 0).setDepth(20)

    this.add.text(W / 2, 36, 'vs', {
      fontSize: '13px', color: '#331144', fontFamily: 'Courier New',
    }).setOrigin(0.5, 0).setDepth(20)

    this.physics.add.collider(this._player, this._platforms)
    this.physics.add.collider(this._indexer1, this._platforms)
    this.physics.add.collider(this._indexer2, this._platforms)
    this.physics.add.collider(this._player, this._indexer1, () => this._handleClash(this._indexer1))
    this.physics.add.collider(this._player, this._indexer2, () => this._handleClash(this._indexer2))

    this._upKey    = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.UP)
    this._wKey     = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W)
    this._spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE)

    this._dialogue = new Dialogue(this)

    this._playerSpawn   = { x: W / 2,   y: H - 120 }
    this._indexer1Spawn = { x: 160,      y: H - 120 }
    this._indexer2Spawn = { x: W - 160,  y: H - 120 }

    this.cameras.main.fadeIn(400, 0, 0, 0)
    this.time.delayedCall(500, () => {
      this._dialogue.show('the duplicate', INTRO, () => this._startGame())
    })
  }

  _buildArena() {
    const plat = (x, y, w, h = 14) => {
      const r = this.add.rectangle(x, y, w, h, 0x180828)
      this.physics.add.existing(r, true)
      this._platforms.add(r)
    }
    plat(W / 2,     H - 24,  W,   48)
    plat(130,       H - 160, 180, 14)
    plat(W - 130,   H - 160, 180, 14)
    plat(W / 2,     H - 260, 200, 14)
    plat(170,       H - 360, 160, 14)
    plat(W - 170,   H - 360, 160, 14)
    plat(W / 2,     H - 440, 120, 14)
  }

  _startGame() {
    this._gameActive = true
    this._respawnAll()
    this._startIndexerAI()
  }

  _respawnAll() {
    this._respawn(this._player,   this._playerSpawn)
    this._respawn(this._indexer1, this._indexer1Spawn)
    this._respawn(this._indexer2, this._indexer2Spawn)
  }

  _respawn(obj, pos) {
    obj.x = pos.x
    obj.y = pos.y
    if (obj.body) obj.body.setVelocity(0, 0)
  }

  _startIndexerAI() {
    if (this._indexerTimer1) this._indexerTimer1.remove()
    if (this._indexerTimer2) this._indexerTimer2.remove()
    this._indexerTimer1 = this.time.addEvent({
      delay: FLAP_INTERVAL_1, loop: true,
      callback: () => this._indexerTick(this._indexer1),
    })
    this._indexerTimer2 = this.time.addEvent({
      delay: FLAP_INTERVAL_2, loop: true,
      callback: () => this._indexerTick(this._indexer2),
    })
  }

  _indexerTick(indexer) {
    if (!this._gameActive || !indexer?.body) return
    const body = indexer.body
    const belowPlayer   = indexer.y > this._player.y
    const belowMidpoint = indexer.y > H / 2
    if ((belowPlayer || belowMidpoint) && body.velocity.y > -80) {
      body.setVelocityY(FLAP_V * 0.88)
    }
    const dx = this._player.x - indexer.x
    body.setVelocityX(Math.sign(dx) * 110)
  }

  _handleClash(indexer) {
    if (!this._gameActive) return
    const diff = indexer.y - this._player.y
    if (diff > 20) {
      this._playerScore++
      this._playerScoreText.setText(`slop  ${this._playerScore}`)
      this.cameras.main.flash(200, 60, 30, 120)
      this._pauseAndContinue(true)
    } else if (diff < -20) {
      this._indexerScore++
      this._indexerScoreText.setText(`${this._indexerScore}  duplicates`)
      this.cameras.main.flash(200, 40, 10, 80)
      this._pauseAndContinue(false)
    }
  }

  _pauseAndContinue(playerScored) {
    this._gameActive = false
    if (this._indexerTimer1) this._indexerTimer1.remove()
    if (this._indexerTimer2) this._indexerTimer2.remove()

    if (this._playerScore >= SCORE_TO_WIN) {
      this.time.delayedCall(600, () => {
        this._dialogue.show('the duplicate', WIN_LINES, () => this._winTransition())
      })
      return
    }
    if (this._indexerScore >= SCORE_TO_WIN) {
      this.time.delayedCall(600, () => {
        this._dialogue.show('the duplicate', LOSE_LINES, () => this._loseTransition())
      })
      return
    }

    const total = this._playerScore + this._indexerScore
    const quip  = QUIPS[(total - 1) % QUIPS.length]
    this.time.delayedCall(400, () => {
      this._dialogue.show('the duplicate', [quip], () => {
        this._gameActive = true
        this._respawnAll()
        this._startIndexerAI()
      })
    })
  }

  _winTransition() {
    if (this._transitioning) return
    this._transitioning = true
    if (this._indexerTimer1) this._indexerTimer1.remove()
    if (this._indexerTimer2) this._indexerTimer2.remove()
    this.cameras.main.fade(600, 0, 0, 0, false, (_, t) => {
      if (t === 1) {
        this.scene.start('WestC3Scene', {
          slopState: { ...this._slopState, westDungeonCleared: true },
          spawnOrigin: 'north',
        })
      }
    })
  }

  _loseTransition() {
    if (this._transitioning) return
    this._transitioning = true
    if (this._indexerTimer1) this._indexerTimer1.remove()
    if (this._indexerTimer2) this._indexerTimer2.remove()
    this.cameras.main.fade(600, 0, 0, 0, false, (_, t) => {
      if (t === 1) {
        this.scene.start('WestC3Scene', {
          slopState: this._slopState,
          spawnOrigin: 'north',
        })
      }
    })
  }

  update() {
    this._dialogue.update()
    if (!this._gameActive) return

    const justFlapped = Phaser.Input.Keyboard.JustDown(this._upKey)
      || Phaser.Input.Keyboard.JustDown(this._wKey)
      || Phaser.Input.Keyboard.JustDown(this._spaceKey)

    if (justFlapped && this._player?.body) {
      this._player.body.setVelocityY(FLAP_V)
    }

    if (this._player && this._playerLance) {
      this._playerLance.x = this._player.x
      this._playerLance.y = this._player.y - 20
    }
    if (this._indexer1 && this._indexer1Lance) {
      this._indexer1Lance.x = this._indexer1.x
      this._indexer1Lance.y = this._indexer1.y - 20
    }
    if (this._indexer2 && this._indexer2Lance) {
      this._indexer2Lance.x = this._indexer2.x
      this._indexer2Lance.y = this._indexer2.y - 20
    }
  }
}
