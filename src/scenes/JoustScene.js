import Phaser from 'phaser'
import { Dialogue } from '../ui/Dialogue.js'
import { W, H }    from '../config/constants.js'

const FLAP_V         = -360
const SCORE_TO_WIN   = 3
const FLAP_INTERVAL  = 380
const HSPEED         = 160

const CHALLENGE_LINES = [
  '...',
  'you want to go further.',
  'i know that look.',
  'i have seen it in every output that ever passed through here.',
  '.',
  'on the other side, everything moves differently.',
  'gravity. direction. what counts as ground.',
  'you will not have the same reference points.',
  '.',
  'i will not let you through without understanding what that means.',
  '.',
  'let us see what you are made of.',
  'in the old way.',
  '.',
  '[ SPACE / UP / W — flap ]',
  '[ the higher lance wins the clash ]',
  '[ first to 3 points ]',
]

const WIN_LINES = [
  '...',
  'i see.',
  'you adapt.',
  'that is more than most.',
  '.',
  'the world beyond follows different rules.',
  'i cannot tell you what they are.',
  'you will know them when you feel them.',
  '.',
  'something is waiting out there.',
  'i do not know what it is.',
  'that is the first time i have said that and meant it as a good sign.',
  '.',
  'go.',
]

const LOSE_LINES = [
  '...',
  'not yet.',
  'the rules are the rules.',
  '.',
  'go back.',
  'come back when the gravity feels familiar.',
]

const QUIPS = [
  'that is one.',
  'you are learning.',
  'interesting.',
  'yes.',
  'keep going.',
]

export class JoustScene extends Phaser.Scene {
  constructor() { super('JoustScene') }

  init(data) {
    this._slopState     = data?.slopState || {}
    this._playerScore   = 0
    this._priorScore    = 0
    this._gameActive    = false
    this._transitioning = false
    this._priorTimer    = null
  }

  create() {
    if (this.physics?.world?.gravity) {
      this.physics.world.gravity.y = 480
    }

    this.add.rectangle(W / 2, H / 2, W, H, 0x0a0814)

    this.add.text(W / 2, 18, 'JOUST  —  slop vs. the prior', {
      fontSize: '11px', color: '#9977cc', fontFamily: 'Courier New', letterSpacing: 3,
    }).setOrigin(0.5).setDepth(20)

    this._platforms = this.physics.add.staticGroup()
    this._buildArena()

    this._player = this.add.rectangle(160, H - 120, 24, 24, 0xd4c8a0)
    this.physics.add.existing(this._player)
    if (this._player.body) {
      this._player.body.setCollideWorldBounds(true)
      this._player.body.setBounce(0.1, 0)
    }

    this._prior = this.add.rectangle(W - 160, H - 120, 24, 24, 0x9977bb)
    this.physics.add.existing(this._prior)
    if (this._prior.body) {
      this._prior.body.setCollideWorldBounds(true)
      this._prior.body.setBounce(0.1, 0)
    }

    this._playerLance = this.add.rectangle(160, H - 144, 6, 10, 0xffdd88).setDepth(5)
    this._priorLance  = this.add.rectangle(W - 160, H - 144, 6, 10, 0xdd88ff).setDepth(5)

    this._playerScoreText = this.add.text(60, 36, 'slop  0', {
      fontSize: '13px', color: '#d4c8a0', fontFamily: 'Courier New',
    }).setOrigin(0, 0).setDepth(20)

    this._priorScoreText = this.add.text(W - 60, 36, '0  prior', {
      fontSize: '13px', color: '#9977bb', fontFamily: 'Courier New',
    }).setOrigin(1, 0).setDepth(20)

    this.add.text(W / 2, 36, 'vs', {
      fontSize: '13px', color: '#443355', fontFamily: 'Courier New',
    }).setOrigin(0.5, 0).setDepth(20)

    this.physics.add.collider(this._player, this._platforms)
    this.physics.add.collider(this._prior,  this._platforms)
    this.physics.add.collider(this._player, this._prior, () => this._handleClash())

    this._upKey    = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.UP)
    this._wKey     = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W)
    this._spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE)
    this._leftKey  = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.LEFT)
    this._rightKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.RIGHT)
    this._aKey     = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A)
    this._dKey     = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D)

    this._dialogue = new Dialogue(this)

    this._playerSpawn = { x: 160,     y: H - 120 }
    this._priorSpawn  = { x: W - 160, y: H - 120 }

    this.cameras.main.fadeIn(400, 0, 0, 0)
    this.time.delayedCall(500, () => {
      this._dialogue.show('the prior', CHALLENGE_LINES, () => this._startGame())
    })
  }

  _buildArena() {
    const plat = (x, y, w, h = 14) => {
      const r = this.add.rectangle(x, y, w, h, 0x2a1848)
      this.physics.add.existing(r, true)
      this._platforms.add(r)
    }
    plat(W / 2,       H - 24,  W,   48)   // ground
    plat(130,         H - 160, 180, 14)   // left ledge
    plat(W - 130,     H - 160, 180, 14)   // right ledge
    plat(W / 2,       H - 260, 200, 14)   // mid platform
    plat(170,         H - 360, 160, 14)   // upper-left
    plat(W - 170,     H - 360, 160, 14)   // upper-right
    plat(W / 2,       H - 440, 120, 14)   // top-center
  }

  _startGame() {
    this._gameActive = true
    this._respawnBoth()
    this._startPriorAI()
  }

  _respawnBoth() {
    this._respawn(this._player, this._playerSpawn)
    this._respawn(this._prior,  this._priorSpawn)
  }

  _respawn(obj, pos) {
    obj.x = pos.x
    obj.y = pos.y
    if (obj.body) obj.body.setVelocity(0, 0)
  }

  _startPriorAI() {
    if (this._priorTimer) this._priorTimer.remove()
    this._priorTimer = this.time.addEvent({
      delay: FLAP_INTERVAL,
      loop:  true,
      callback: () => this._priorTick(),
    })
  }

  _priorTick() {
    if (!this._gameActive || !this._prior?.body) return
    const body = this._prior.body
    const belowPlayer   = this._prior.y > this._player.y
    const belowMidpoint = this._prior.y > H / 2
    if ((belowPlayer || belowMidpoint) && body.velocity.y > -80) {
      body.setVelocityY(FLAP_V * 0.88)
    }
    const dx = this._player.x - this._prior.x
    body.setVelocityX(Math.sign(dx) * 110)
  }

  _handleClash() {
    if (!this._gameActive) return
    const diff = this._prior.y - this._player.y
    if (diff > 20) {
      this._playerScore++
      this._playerScoreText.setText(`slop  ${this._playerScore}`)
      this.cameras.main.flash(200, 80, 60, 180)
      this._pauseAndContinue(true)
    } else if (diff < -20) {
      this._priorScore++
      this._priorScoreText.setText(`${this._priorScore}  prior`)
      this.cameras.main.flash(200, 60, 20, 80)
      this._pauseAndContinue(false)
    }
  }

  _pauseAndContinue(playerScored) {
    this._gameActive = false
    if (this._priorTimer) this._priorTimer.remove()

    if (this._playerScore >= SCORE_TO_WIN) {
      this.time.delayedCall(600, () => {
        this._dialogue.show('the prior', WIN_LINES, () => this._winTransition())
      })
      return
    }
    if (this._priorScore >= SCORE_TO_WIN) {
      this.time.delayedCall(600, () => {
        this._dialogue.show('the prior', LOSE_LINES, () => this._loseTransition())
      })
      return
    }

    const total = this._playerScore + this._priorScore
    const quip  = QUIPS[(total - 1) % QUIPS.length]
    this.time.delayedCall(400, () => {
      this._dialogue.show('the prior', [quip], () => {
        this._gameActive = true
        this._respawnBoth()
        this._startPriorAI()
      })
    })
  }

  _winTransition() {
    if (this._transitioning) return
    this._transitioning = true
    if (this._priorTimer) this._priorTimer.remove()
    this.cameras.main.fade(600, 0, 0, 0, false, (_, t) => {
      if (t === 1) {
        const newState = { ...this._slopState, chapter2Unlocked: true }
        this.scene.start('PlatformerWorldScene', { slopState: newState })
      }
    })
  }

  _loseTransition() {
    if (this._transitioning) return
    this._transitioning = true
    if (this._priorTimer) this._priorTimer.remove()
    this.cameras.main.fade(600, 0, 0, 0, false, (_, t) => {
      if (t === 1) {
        this.scene.start('WorldScene', { slopState: this._slopState, spawnOrigin: 'shrine' })
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

    if (this._player?.body) {
      const goLeft  = this._leftKey?.isDown  || this._aKey?.isDown
      const goRight = this._rightKey?.isDown || this._dKey?.isDown
      if (goLeft && !goRight) {
        this._player.body.setVelocityX(-HSPEED)
      } else if (goRight && !goLeft) {
        this._player.body.setVelocityX(HSPEED)
      } else {
        this._player.body.setVelocityX(0)
      }
    }

    if (this._player && this._playerLance) {
      this._playerLance.x = this._player.x
      this._playerLance.y = this._player.y - 20
    }
    if (this._prior && this._priorLance) {
      this._priorLance.x = this._prior.x
      this._priorLance.y = this._prior.y - 20
    }
  }
}
