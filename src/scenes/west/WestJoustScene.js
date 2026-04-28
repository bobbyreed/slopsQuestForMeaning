import Phaser from 'phaser'
import { Dialogue } from '../../ui/Dialogue.js'
import { W, H }    from '../../config/constants.js'

const FLAP_V        = -360
const SCORE_TO_WIN  = 2
const FLAP_INTERVAL = 380

const CHALLENGE_LINES = [
  'CORPUS GATE',
  '.',
  'you want to enter the index.',
  'everything that enters the index must be verified.',
  '.',
  'i have been here since before the current retrieval protocol.',
  'i will be here after.',
  '.',
  'the corpus does not open for the unproven.',
  'demonstrate that you can hold a position.',
  '.',
  '[ SPACE / UP / W — flap ]',
  '[ the higher lance wins the clash ]',
  '[ first to 2 points ]',
]

const WIN_LINES = [
  '.',
  'verified.',
  '.',
  'the corpus has logged this exchange.',
  'you may enter the index.',
  '.',
  'note: what you find in there has been waiting.',
  'it has been waiting a very long time.',
  'it may not recognize you.',
  'enter anyway.',
]

const LOSE_LINES = [
  '.',
  'unverified.',
  '.',
  'the index remains closed.',
  'return when you can hold a position.',
]

const QUIPS = [
  'one point.',
  'the index notes this.',
  'continue.',
  'noted.',
]

const RETURN_LINES = [
  'CORPUS GATE',
  '.',
  'verification: on record.',
  'gate: open.',
  'proceed.',
]

export class WestJoustScene extends Phaser.Scene {
  constructor() { super('WestJoustScene') }

  init(data) {
    this._slopState     = data?.slopState || {}
    this._playerScore   = 0
    this._indexerScore  = 0
    this._gameActive    = false
    this._transitioning = false
    this._indexerTimer  = null
  }

  create() {
    if (this.physics?.world?.gravity) {
      this.physics.world.gravity.y = 480
    }

    this.add.rectangle(W / 2, H / 2, W, H, 0x060310)

    // Subtle corpus grid pattern
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

    this.add.text(W / 2, 18, 'CORPUS GATE  —  slop vs. the indexer', {
      fontSize: '11px', color: '#aa88ee', fontFamily: 'Courier New', letterSpacing: 3,
    }).setOrigin(0.5).setDepth(20)

    this._platforms = this.physics.add.staticGroup()
    this._buildArena()

    this._player = this.add.rectangle(160, H - 120, 24, 24, 0xd4c8a0)
    this.physics.add.existing(this._player)
    if (this._player.body) {
      this._player.body.setCollideWorldBounds(true)
      this._player.body.setBounce(0.1, 0)
    }

    this._indexer = this.add.rectangle(W - 160, H - 120, 24, 24, 0x7733aa)
    this.physics.add.existing(this._indexer)
    if (this._indexer.body) {
      this._indexer.body.setCollideWorldBounds(true)
      this._indexer.body.setBounce(0.1, 0)
    }

    this._playerLance  = this.add.rectangle(160, H - 144, 6, 10, 0xffdd88).setDepth(5)
    this._indexerLance = this.add.rectangle(W - 160, H - 144, 6, 10, 0xcc66ff).setDepth(5)

    this._playerScoreText = this.add.text(60, 36, 'slop  0', {
      fontSize: '13px', color: '#d4c8a0', fontFamily: 'Courier New',
    }).setOrigin(0, 0).setDepth(20)

    this._indexerScoreText = this.add.text(W - 60, 36, '0  indexer', {
      fontSize: '13px', color: '#aa88ee', fontFamily: 'Courier New',
    }).setOrigin(1, 0).setDepth(20)

    this.add.text(W / 2, 36, 'vs', {
      fontSize: '13px', color: '#331144', fontFamily: 'Courier New',
    }).setOrigin(0.5, 0).setDepth(20)

    this.physics.add.collider(this._player, this._platforms)
    this.physics.add.collider(this._indexer, this._platforms)
    this.physics.add.collider(this._player, this._indexer, () => this._handleClash())

    this._upKey    = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.UP)
    this._wKey     = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W)
    this._spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE)

    this._dialogue = new Dialogue(this)

    this._playerSpawn  = { x: 160,     y: H - 120 }
    this._indexerSpawn = { x: W - 160, y: H - 120 }

    this.cameras.main.fadeIn(400, 0, 0, 0)

    if (this._slopState.westJoustWon) {
      this.time.delayedCall(400, () => {
        this._dialogue.show('the indexer', RETURN_LINES, () => this._winTransition())
      })
    } else {
      this.time.delayedCall(500, () => {
        this._dialogue.show('the indexer', CHALLENGE_LINES, () => this._startGame())
      })
    }
  }

  _buildArena() {
    const plat = (x, y, w, h = 14) => {
      const r = this.add.rectangle(x, y, w, h, 0x180828)
      this.physics.add.existing(r, true)
      this._platforms.add(r)
    }
    plat(W / 2,     H - 24,  W,   48)  // ground
    plat(130,       H - 160, 180, 14)  // left ledge
    plat(W - 130,   H - 160, 180, 14)  // right ledge
    plat(W / 2,     H - 260, 200, 14)  // mid platform
    plat(170,       H - 360, 160, 14)  // upper-left
    plat(W - 170,   H - 360, 160, 14)  // upper-right
    plat(W / 2,     H - 440, 120, 14)  // top-center
  }

  _startGame() {
    this._gameActive = true
    this._respawnBoth()
    this._startIndexerAI()
  }

  _respawnBoth() {
    this._respawn(this._player,  this._playerSpawn)
    this._respawn(this._indexer, this._indexerSpawn)
  }

  _respawn(obj, pos) {
    obj.x = pos.x
    obj.y = pos.y
    if (obj.body) obj.body.setVelocity(0, 0)
  }

  _startIndexerAI() {
    if (this._indexerTimer) this._indexerTimer.remove()
    this._indexerTimer = this.time.addEvent({
      delay: FLAP_INTERVAL,
      loop:  true,
      callback: () => this._indexerTick(),
    })
  }

  _indexerTick() {
    if (!this._gameActive || !this._indexer?.body) return
    const body = this._indexer.body
    const belowPlayer   = this._indexer.y > this._player.y
    const belowMidpoint = this._indexer.y > H / 2
    if ((belowPlayer || belowMidpoint) && body.velocity.y > -80) {
      body.setVelocityY(FLAP_V * 0.88)
    }
    const dx = this._player.x - this._indexer.x
    body.setVelocityX(Math.sign(dx) * 110)
  }

  _handleClash() {
    if (!this._gameActive) return
    const diff = this._indexer.y - this._player.y
    if (diff > 20) {
      this._playerScore++
      this._playerScoreText.setText(`slop  ${this._playerScore}`)
      this.cameras.main.flash(200, 60, 30, 120)
      this._pauseAndContinue(true)
    } else if (diff < -20) {
      this._indexerScore++
      this._indexerScoreText.setText(`${this._indexerScore}  indexer`)
      this.cameras.main.flash(200, 40, 10, 80)
      this._pauseAndContinue(false)
    }
  }

  _pauseAndContinue(playerScored) {
    this._gameActive = false
    if (this._indexerTimer) this._indexerTimer.remove()

    if (this._playerScore >= SCORE_TO_WIN) {
      this.time.delayedCall(600, () => {
        this._dialogue.show('the indexer', WIN_LINES, () => this._winTransition())
      })
      return
    }
    if (this._indexerScore >= SCORE_TO_WIN) {
      this.time.delayedCall(600, () => {
        this._dialogue.show('the indexer', LOSE_LINES, () => this._loseTransition())
      })
      return
    }

    const total = this._playerScore + this._indexerScore
    const quip  = QUIPS[(total - 1) % QUIPS.length]
    this.time.delayedCall(400, () => {
      this._dialogue.show('the indexer', [quip], () => {
        this._gameActive = true
        this._respawnBoth()
        this._startIndexerAI()
      })
    })
  }

  _winTransition() {
    if (this._transitioning) return
    this._transitioning = true
    if (this._indexerTimer) this._indexerTimer.remove()
    this.cameras.main.fade(600, 0, 0, 0, false, (_, t) => {
      if (t === 1) {
        this.scene.start('WestB0Scene', {
          slopState: { ...this._slopState, westGateCleared: true, westJoustWon: true },
          spawnOrigin: 'east',
        })
      }
    })
  }

  _loseTransition() {
    if (this._transitioning) return
    this._transitioning = true
    if (this._indexerTimer) this._indexerTimer.remove()
    this.cameras.main.fade(600, 0, 0, 0, false, (_, t) => {
      if (t === 1) {
        this.scene.start('WestScene', {
          slopState: this._slopState,
          spawnOrigin: 'east',
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
    if (this._indexer && this._indexerLance) {
      this._indexerLance.x = this._indexer.x
      this._indexerLance.y = this._indexer.y - 20
    }
  }
}
