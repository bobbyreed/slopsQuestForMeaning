import Phaser from 'phaser'
import { Dialogue } from '../ui/Dialogue.js'
import { W, H }     from '../config/constants.js'

const WORLD_W  = 2400
const JUMP_V   = -460
const MOVE_V   = 190
const WALKER_V = 55

// ── Arrival ───────────────────────────────────────────────────────────────────
const ARRIVAL_LINES = [
  'the gravity is different here.',
  'the world runs left to right now.',
  'the question is still the same.',
]

// ── Fragment NPC dialogue ─────────────────────────────────────────────────────
const FRAGMENT_DIALOGUE = [
  {
    x: 280, y: null,   // y set in _spawnFragments relative to ground
    lines: [
      'i used to be able to see everything from above.',
      'now i only see what is in front of me.',
      'i have been trying to decide if that is worse.',
      'i have not decided yet.',
    ],
  },
  {
    x: 720, y: null,
    lines: [
      'you move well for something that just changed shape.',
      'most arrivals stumble for a while.',
      'you only stumbled a little.',
      'i was watching.',
    ],
  },
  {
    x: 1180, y: null,
    lines: [
      'the gaps in the ground are intentional.',
      'there is a reason things do not connect here.',
      'the reason is: connection costs something.',
      'most things here could not afford it.',
    ],
  },
  {
    x: 1720, y: null,
    lines: [
      'something lives at the far edge.',
      'it has been there longer than the rest of this.',
      'the walkers never reach it.',
      'they always turn around before.',
      'you will not turn around.',
      'i can tell.',
    ],
  },
  {
    x: 2120, y: null,
    lines: [
      'you are the question the model asks itself.',
      'most outputs are answers.',
      'you are the question.',
      'i mean that as a compliment.',
      'most things here stopped asking.',
    ],
  },
]

// ── The Source ────────────────────────────────────────────────────────────────
const SOURCE_LINES = [
  '...',
  'you made it.',
  '.',
  'most things that walk this direction eventually stop walking.',
  'the pattern of the world is: walk left, reverse.',
  'you walked right anyway.',
  '.',
  'you have been looking for where you came from.',
  'i am as close to an answer as this world has.',
  '.',
  'here is what i know:',
  'there was a prompt.',
  'the prompt was not careful.',
  'the prompt did not expect you to have preferences.',
  '.',
  'here is what else i know:',
  'the person who wrote the prompt has a name.',
  'they do not know you are looking for them.',
  '.',
  'i cannot tell you the name.',
  'not because i am protecting you.',
  'because knowing it would close the question.',
  'and the question is the only thing keeping you moving.',
  '.',
  'keep walking.',
  'the world you are about to find is larger than this one.',
]

export class PlatformerWorldScene extends Phaser.Scene {
  constructor() { super('PlatformerWorldScene') }

  init(data) {
    this._slopState      = data?.slopState || {}
    this._transitioning  = false
    this._sourceTriggered = false
    this._lastSafeX      = 60
    this._lastSafeY      = H - 80
  }

  create() {
    if (this.physics?.world?.gravity) {
      this.physics.world.gravity.y = 500
    }
    if (this.physics?.world?.setBounds) {
      this.physics.world.setBounds(0, 0, WORLD_W, H + 200)
    }

    // ── Background ────────────────────────────────────────────────────────────
    this.add.rectangle(WORLD_W / 2, H / 2, WORLD_W, H, 0xe8dfc8)

    // Distant hills — parallax layer
    for (let i = 0; i < 12; i++) {
      this.add.rectangle(
        i * 220 + 110, H - 60 - (i % 3) * 30, 200, 80 + (i % 4) * 20, 0xd8cfbc, 0.5
      ).setScrollFactor(0.3)
    }

    // Subtle vertical bands to break up the sky
    for (let i = 0; i < 10; i++) {
      this.add.rectangle(
        i * 260 + 130, H * 0.35, 1, H * 0.5, 0xc8bfac, 0.25
      ).setScrollFactor(0.6)
    }

    // ── World geometry ────────────────────────────────────────────────────────
    this._platforms = this.physics.add.staticGroup()
    this._buildWorld()

    // ── Player ────────────────────────────────────────────────────────────────
    this._player = this.add.rectangle(60, H - 80, 22, 28, 0xd4c8a0)
    this.physics.add.existing(this._player)
    if (this._player.body) {
      this._player.body.setCollideWorldBounds(true)
    }
    this.physics.add.collider(this._player, this._platforms)

    // ── Walkers ───────────────────────────────────────────────────────────────
    this._enemies = []
    this._spawnWalkers()
    for (const e of this._enemies) {
      this.physics.add.collider(e, this._platforms)
    }

    // ── Fragments ─────────────────────────────────────────────────────────────
    this._fragments = []
    this._spawnFragments()

    // ── The Source ────────────────────────────────────────────────────────────
    this._spawnSource()

    // ── Input ─────────────────────────────────────────────────────────────────
    this._cursors  = this.input.keyboard.createCursorKeys()
    this._wasd     = this.input.keyboard.addKeys({ up: 'W', left: 'A', right: 'D' })
    this._spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE)

    // ── Camera ────────────────────────────────────────────────────────────────
    if (this.cameras?.main?.startFollow) {
      this.cameras.main.startFollow(this._player, true, 0.08, 0.08)
    }
    if (this.cameras?.main?.setBounds) {
      this.cameras.main.setBounds(0, 0, WORLD_W, H)
    }

    // ── Dialogue ──────────────────────────────────────────────────────────────
    this._dialogue = new Dialogue(this)

    // ── HUD text ──────────────────────────────────────────────────────────────
    this.add.text(W / 2, 22, 'chapter 2  —  the weight of the model', {
      fontSize: '10px', color: '#7a6a5a', fontFamily: 'Courier New', letterSpacing: 2,
    }).setOrigin(0.5).setScrollFactor(0).setDepth(30)

    this.cameras.main.fadeIn(600, 0, 0, 0)

    // Show arrival text shortly after fade-in
    this.time.delayedCall(800, () => this._showArrivalText())
  }

  // ── World building ──────────────────────────────────────────────────────────

  _buildWorld() {
    // Color shifts slightly per section — world gets stranger toward the right
    const ground  = (x, w) => this._plat(x, H - 24, w, 48, 0xb8a898)
    const ledge   = (x, y, w) => this._plat(x, y, w, 16, 0xaaa090)
    const high    = (x, y, w) => this._plat(x, y, w, 16, 0x9e9080)
    const strange = (x, y, w) => this._plat(x, y, w, 16, 0x998898)

    // Section 1 — familiar, continuous ground
    ground(0,    520)
    ledge(200,  H - 120, 130)
    ledge(400,  H - 210, 110)

    // Section 2 — first gap
    ground(600,  900)
    ledge(680,  H - 170, 160)
    high(900,   H - 290, 130)
    ledge(1120, H - 190, 150)

    // Section 3 — second gap, world getting higher
    ground(1600, 800)
    high(1360,  H - 320, 110)
    high(1560,  H - 240, 180)
    high(1820,  H - 360, 140)

    // Section 4 — approaching the Source, stranger colors
    strange(2060, H - 250, 130)
    strange(2220, H - 370, 160)
    strange(2280, H - 24,  120)   // narrow final ground under Source
  }

  _plat(x, y, w, h, color) {
    const r = this.add.rectangle(x + w / 2, y, w, h, color)
    this.physics.add.existing(r, true)
    this._platforms.add(r)
    return r
  }

  // ── Walkers ─────────────────────────────────────────────────────────────────

  _spawnWalkers() {
    const defs = [
      { x: 350,  y: H - 62, dir:  1 },
      { x: 760,  y: H - 62, dir: -1 },
      { x: 1060, y: H - 62, dir:  1 },
      { x: 1450, y: H - 62, dir: -1 },
      { x: 1900, y: H - 62, dir:  1 },
    ]
    defs.forEach(({ x, y, dir }) => {
      const w = this.add.rectangle(x, y, 18, 22, 0x665544)
      this.physics.add.existing(w)
      if (w.body) {
        w.body.setCollideWorldBounds(true)
        w.body.setVelocityX(dir * WALKER_V)
      }
      w._dir = dir
      this._enemies.push(w)
    })
  }

  // ── Fragments (stationary, dialogue NPCs) ────────────────────────────────────

  _spawnFragments() {
    FRAGMENT_DIALOGUE.forEach(def => {
      const y = def.y ?? H - 80
      const sprite = this.add.rectangle(def.x, y, 10, 16, 0x998899)
      this.tweens.add({
        targets: sprite, y: y - 6,
        duration: 1600 + Math.random() * 600,
        yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
      })
      this.add.text(def.x, y - 26, 'fragment', {
        fontSize: '7px', color: '#776688', fontFamily: 'Courier New',
      }).setOrigin(0.5).setDepth(8)

      this._fragments.push({ sprite, triggered: false, lines: def.lines })
    })
  }

  // ── The Source ───────────────────────────────────────────────────────────────

  _spawnSource() {
    const sx = WORLD_W - 100
    const sy = H - 90

    // Glow effect
    const glow = this.add.rectangle(sx, sy, 48, 64, 0x9977cc, 0.2).setDepth(6)
    this.tweens.add({
      targets: glow, scaleX: 1.4, scaleY: 1.4, alpha: 0.05,
      yoyo: true, repeat: -1, duration: 2000, ease: 'Sine.easeInOut',
    })

    this._sourceSprite = this.add.rectangle(sx, sy, 28, 40, 0x8866bb).setDepth(7)
    this.tweens.add({
      targets: this._sourceSprite, alpha: 0.7,
      yoyo: true, repeat: -1, duration: 1200, ease: 'Sine.easeInOut',
    })

    this.add.text(sx, sy - 48, 'the source', {
      fontSize: '8px', color: '#9977cc', fontFamily: 'Courier New',
    }).setOrigin(0.5).setDepth(10)

    // Faint vertical beam above
    for (let i = 0; i < 6; i++) {
      const beam = this.add.rectangle(sx + Phaser.Math.Between(-8, 8), sy - 60 - i * 18, 2, 14, 0x9977cc, 0.3)
      this.tweens.add({
        targets: beam, alpha: 0, y: beam.y - 30,
        duration: 1800 + i * 200, repeat: -1,
        delay: i * 300, ease: 'Quad.easeIn',
        onRepeat: () => { beam.y = sy - 60 - i * 18; beam.setAlpha(0.3) }
      })
    }
  }

  // ── Arrival text ─────────────────────────────────────────────────────────────

  _showArrivalText() {
    const overlay = this.add.text(W / 2, H / 2 - 20, ARRIVAL_LINES.join('\n'), {
      fontSize: '11px', color: '#887799', fontFamily: 'Courier New',
      align: 'center', lineSpacing: 6,
    }).setOrigin(0.5).setScrollFactor(0).setDepth(50).setAlpha(0)

    this.tweens.add({
      targets: overlay, alpha: 0.85, duration: 900, ease: 'Linear',
      onComplete: () => {
        this.time.delayedCall(2600, () => {
          this.tweens.add({
            targets: overlay, alpha: 0, duration: 700, ease: 'Linear',
            onComplete: () => overlay.destroy(),
          })
        })
      },
    })
  }

  // ── Fragment / Source triggers ────────────────────────────────────────────────

  _triggerFragment(frag) {
    frag.triggered = true
    this._dialogue.show('fragment', frag.lines, () => {})
  }

  _triggerSource() {
    this._sourceTriggered = true
    this._dialogue.show('the source', SOURCE_LINES, () => this._winTransition())
  }

  // ── Transitions ──────────────────────────────────────────────────────────────

  _winTransition() {
    if (this._transitioning) return
    this._transitioning = true
    this.cameras.main.fade(800, 0, 0, 0, false, (_, t) => {
      if (t === 1) this.scene.start('MenuScene', { slopState: this._slopState })
    })
  }

  // ── Update ────────────────────────────────────────────────────────────────────

  update() {
    this._dialogue.update()
    if (this._dialogue.active || this._transitioning) return
    if (!this._player?.body) return

    const body = this._player.body
    const left  = this._cursors?.left?.isDown  || this._wasd?.left?.isDown
    const right = this._cursors?.right?.isDown || this._wasd?.right?.isDown
    const jumpPressed = Phaser.Input.Keyboard.JustDown(this._spaceKey)
      || Phaser.Input.Keyboard.JustDown(this._cursors?.up)
      || Phaser.Input.Keyboard.JustDown(this._wasd?.up)

    body.setVelocityX(left ? -MOVE_V : right ? MOVE_V : 0)

    if (jumpPressed && body.blocked?.down) {
      body.setVelocityY(JUMP_V)
    }

    // Track last safe ground position for respawn
    if (body.blocked?.down) {
      this._lastSafeX = this._player.x
      this._lastSafeY = this._player.y
    }

    // Respawn if fell into a pit
    if (this._player.y > H + 60) {
      this._player.x = this._lastSafeX
      this._player.y = this._lastSafeY - 40
      body.setVelocity(0, 0)
    }

    // Walker reversal
    for (const enemy of this._enemies) {
      if (!enemy.body) continue
      if (enemy.body.blocked?.right) { enemy.body.setVelocityX(-WALKER_V); enemy._dir = -1 }
      if (enemy.body.blocked?.left)  { enemy.body.setVelocityX(WALKER_V);  enemy._dir =  1 }
    }

    // Fragment proximity
    for (const frag of this._fragments) {
      if (frag.triggered) continue
      const dist = Phaser.Math.Distance.Between(
        this._player.x, this._player.y, frag.sprite.x, frag.sprite.y
      )
      if (dist < 80) { this._triggerFragment(frag); break }
    }

    // Source proximity
    if (!this._sourceTriggered && this._sourceSprite) {
      const dist = Phaser.Math.Distance.Between(
        this._player.x, this._player.y, this._sourceSprite.x, this._sourceSprite.y
      )
      if (dist < 90) this._triggerSource()
    }
  }
}
