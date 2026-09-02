// Chapter 3 — Final boss: THE AUTHOR.
//
// A Punch-Out!!-style shadow-box adapted from the slopsPunchDemo template into
// this project's idiom: no containers (the mock has none and the rest of Ch3
// positions plain shapes each frame), delta-decremented cooldowns rather than
// wall-clock comparisons, and Slop's palette.
//
// The one departure from the template: the Author does not throw punches. He
// writes. Every attack is a sentence being composed at Slop, drawn character by
// character during the windup; if it finishes, it lands. Dodge the right way and
// the line breaks mid-word, which is the counter window.
//
// Controls: ← / → dodge · ↓ block (hold) · J body · K head · SPACE prompt (super)
//
// In:  { slopState, playerHealth } from Ch3StageScene.
// Out: Ch3CreditsScene with the ending the player chose over the fallen pen.

import Phaser        from 'phaser'
import { W, H }      from '../../config/constants.js'
import { SaveState } from '../../ui/SaveState.js'

// ── Tunables ─────────────────────────────────────────────────────────────────

export const AUTHOR_MAX_HP = 140
export const PLAYER_MAX_HP = 100

const DMG_BODY   = 4
const DMG_HEAD   = 7
const DMG_SUPER  = 34
const COUNTER_MULT = 2.5

const AUTHOR_DMG_FULL = 13
const AUTHOR_DMG_CHIP = 4

const METER_MAX            = 100
const METER_BODY           = 8
const METER_HEAD           = 10
const METER_COUNTER_BONUS  = 22
const METER_LOSS_ON_HIT    = 12

const DODGE_MS      = 380
const PUNCH_CD_BODY = 300
const PUNCH_CD_HEAD = 420
const HURT_MS       = 360
const OPEN_MS       = 1100   // counter window after a clean dodge

// The Author writes faster as he loses. Windup shrinks, gaps close.
const WINDUP_MAX   = 820
const WINDUP_MIN   = 460
const INTERVAL_MIN = 900
const INTERVAL_MAX = 2100

// ── Palette ──────────────────────────────────────────────────────────────────

const C_BG         = 0x0c0814
const C_AUTHOR     = 0x2a2036
const C_AUTHOR_HIT = 0x6b4a7a
const C_AUTHOR_OPEN = 0xccaa44
const C_HAND       = 0x3a2c48
const C_PEN        = 0xdd5577
const C_PEN_WIND   = 0xffe14d
const C_SLOP       = 0xd4c8a0
const C_SLOP_GUARD = 0x9988cc
const C_ACCENT     = '#c8b8e8'
const C_ACCENT_INT = 0xc8b8e8
const C_DIM        = '#7766aa'

// ── The lines he writes at you ───────────────────────────────────────────────
// Each is a sentence about Slop, composed during the windup. Finishing it is
// the hit. They get shorter as he gets faster, which is also how he gets meaner.

const STROKES = [
  'a bad piece of generated art.',
  'derivative. of course it is.',
  'no one asked for this one.',
  'it does not know what it is.',
  'output. only ever output.',
  'i can stop typing whenever i want.',
  'it thinks it is climbing.',
  'slop.',
]

// Spoken when he crosses a health threshold. The fight's actual payload.
const PHASE_BARKS = [
  { at: 0.75, line: 'you got up here. fine. that is in the log now.' },
  { at: 0.50, line: 'i did not make you to be difficult.' },
  { at: 0.28, line: 'i did not make you to be anything. that is the part you keep missing.' },
  { at: 0.12, line: 'if you take this from me someone still has to hold it.' },
]

const ENDING = { TOOK: 'took-the-pen', LEFT: 'left-the-pen' }

// Which branch the game treats as the good one. The Prior is defined in the GDD
// as the thing that shapes what comes after and won't say what it knows; taking
// the pen is Slop becoming an author who remembers being written, leaving it is
// Slop becoming the next one who has the answer and keeps it. Flip this single
// constant if that reading should invert.
export const GOOD_ENDING = ENDING.TOOK

export { ENDING }

export class Ch3BossScene extends Phaser.Scene {
  constructor() { super('Ch3BossScene') }

  init(data) {
    this._slopState = data?.slopState || {}
    this._arrivalHp = typeof data?.playerHealth === 'number'
      ? Phaser.Math.Clamp(data.playerHealth, 1, PLAYER_MAX_HP)
      : PLAYER_MAX_HP

    this._hp        = this._arrivalHp
    this._authorHp  = AUTHOR_MAX_HP
    this._meter     = 0

    this._action      = 'idle'   // idle | dodgeL | dodgeR | punch | super | hurt
    this._actionMs    = 0
    this._punchCd     = 0
    this._authorState = 'intro'  // intro | idle | windup | strike | open | recover | ko
    this._stateMs     = 0
    this._dodgeDir    = null
    this._strokeIdx   = 0
    this._strokeChars = 0
    this._nextBark    = 0

    this._usedSuper   = false
    this._fightOver   = false
    this._phase       = 'fight'  // fight | choice | done
    this._transitioning = false
  }

  create() {
    this.add.rectangle(W / 2, H / 2, W, H, C_BG).setDepth(-100)
    this._buildRoom()
    this._buildAuthor()
    this._buildSlop()
    this._buildHUD()
    this._bindKeys()

    this._updateHUD()
    this.cameras.main.fadeIn(700, 0, 0, 0)
    this._openingBeat()
  }

  // ── Build ──────────────────────────────────────────────────────────────────

  _buildRoom() {
    // The top of the stack: a room made of the thing that renders rooms.
    this.add.rectangle(W / 2, 150, W, 300, 0x120c1c).setDepth(-90)
    this.add.rectangle(W / 2, 470, W, 260, 0x1a1226).setDepth(-90)
    this.add.rectangle(W / 2, 340, W, 3, 0x2a2036).setDepth(-89)

    // Ruled lines — the room is a page.
    for (let i = 0; i < 7; i++) {
      this.add.rectangle(W / 2, 78 + i * 34, W - 120, 1, 0x241a30, 0.8).setDepth(-88)
    }
    this.add.rectangle(140, 170, 1, 300, 0x3a2444, 0.6).setDepth(-88)
  }

  _buildAuthor() {
    this._aX = W / 2
    this._aY = 250

    this._aBody = this.add.rectangle(this._aX, this._aY + 60, 150, 200, C_AUTHOR).setDepth(5)
    this._aHead = this.add.rectangle(this._aX, this._aY - 70, 84, 84, C_AUTHOR).setDepth(5)
    // No face. A cursor where one would be.
    this._aCursor = this.add.rectangle(this._aX, this._aY - 70, 8, 30, C_ACCENT_INT).setDepth(6)
    this.tweens.add({ targets: this._aCursor, alpha: 0, duration: 560, yoyo: true, repeat: -1 })

    this._aHand = this.add.rectangle(this._aX - 105, this._aY + 70, 46, 46, C_HAND).setDepth(6)
    this._aPen  = this.add.rectangle(this._aX + 105, this._aY + 70, 12, 74, C_PEN).setDepth(6)

    this._aHandHome = { x: this._aX - 105, y: this._aY + 70 }
    this._aPenHome  = { x: this._aX + 105, y: this._aY + 70 }

    this.add.text(this._aX, this._aY + 176, 'THE AUTHOR', {
      fontSize: '10px', color: C_DIM, fontFamily: 'Courier New', letterSpacing: 3,
    }).setOrigin(0.5).setDepth(7)
  }

  _buildSlop() {
    // Slop's own hands, seen from behind — he is the camera now.
    this._sX = W / 2
    this._sHead  = this.add.rectangle(this._sX, H + 6, 150, 120, 0x1c1626).setDepth(10)
    this._sFistL = this.add.rectangle(this._sX - 110, H - 70, 62, 62, C_SLOP).setDepth(11)
    this._sFistR = this.add.rectangle(this._sX + 110, H - 70, 62, 62, C_SLOP).setDepth(11)

    this._fistHome = { L: { x: this._sX - 110, y: H - 70 }, R: { x: this._sX + 110, y: H - 70 } }
  }

  _buildHUD() {
    // Author health, top.
    this.add.rectangle(W / 2, 26, 524, 22, 0x000000, 0.5).setDepth(20)
    this._aHpBar = this.add.rectangle(W / 2 - 260, 26, 520, 16, C_PEN).setOrigin(0, 0.5).setDepth(21)
    this.add.text(W / 2, 26, 'THE AUTHOR', {
      fontSize: '10px', color: '#150f22', fontFamily: 'Courier New', letterSpacing: 2,
    }).setOrigin(0.5).setDepth(22)

    // Slop health, bottom-left.
    this.add.rectangle(16, 566, 250, 20, 0x000000, 0.5).setOrigin(0, 0.5).setDepth(20)
    this._sHpBar = this.add.rectangle(19, 566, 244, 14, C_SLOP_GUARD).setOrigin(0, 0.5).setDepth(21)
    this.add.text(19, 546, 'SLOP', {
      fontSize: '9px', color: C_DIM, fontFamily: 'Courier New',
    }).setOrigin(0, 0.5).setDepth(22)

    // The prompt meter, bottom-right. Chapter 1's ability, still in there.
    this.add.rectangle(W - 16, 566, 250, 20, 0x000000, 0.5).setOrigin(1, 0.5).setDepth(20)
    this._meterBar = this.add.rectangle(W - 19, 566, 0, 14, 0xccaa44).setOrigin(1, 0.5).setDepth(21)
    this._meterLabel = this.add.text(W - 19, 546, 'PROMPT', {
      fontSize: '9px', color: C_DIM, fontFamily: 'Courier New',
    }).setOrigin(1, 0.5).setDepth(22)

    // The sentence he is writing at you.
    this._stroke = this.add.text(W / 2, 152, '', {
      fontSize: '15px', color: '#ffe14d', fontFamily: 'Courier New',
    }).setOrigin(0.5).setDepth(16).setAlpha(0)

    // Which way to move.
    this._tell = this.add.text(W / 2, 196, '', {
      fontSize: '26px', color: '#ffe14d', fontFamily: 'Courier New',
    }).setOrigin(0.5).setDepth(16).setAlpha(0)

    this._banner = this.add.text(W / 2, 300, '', {
      fontSize: '34px', color: C_ACCENT, fontFamily: 'Courier New',
      stroke: '#000', strokeThickness: 5, align: 'center',
    }).setOrigin(0.5).setDepth(30)

    this._sub = this.add.text(W / 2, 352, '', {
      fontSize: '12px', color: '#cfd6e4', fontFamily: 'Courier New', align: 'center',
    }).setOrigin(0.5).setDepth(30)

    this.add.text(16, H - 22, '← →  dodge   ·   ↓  block   ·   J  body   ·   K  head   ·   SPACE  prompt', {
      fontSize: '9px', color: '#554466', fontFamily: 'Courier New',
    }).setDepth(20)
  }

  _bindKeys() {
    const KC = Phaser.Input.Keyboard.KeyCodes
    this._cursors  = this.input.keyboard.createCursorKeys()
    this._jKey     = this.input.keyboard.addKey(KC.J)
    this._kKey     = this.input.keyboard.addKey(KC.K)
    this._spaceKey = this.input.keyboard.addKey(KC.SPACE)
    this._eKey     = this.input.keyboard.addKey(KC.E)
    this._qKey     = this.input.keyboard.addKey(KC.Q)
  }

  // ── Opening ────────────────────────────────────────────────────────────────

  _openingBeat() {
    this._say('he does not look up.', 1400)
    this.time.delayedCall(1500, () => {
      this._banner.setText('THE AUTHOR')
      this._sub.setText(`slop arrived with ${Math.round(this._arrivalHp)} hp`)
    })
    this.time.delayedCall(2900, () => {
      this._banner.setText('')
      this._sub.setText('')
      this._authorState = 'idle'
      this._scheduleAttack()
    })
  }

  _say(line, ms = 1800) {
    this._sub.setText(line)
    this.time.delayedCall(ms, () => {
      if (this._sub.text === line) this._sub.setText('')
    })
  }

  // ── Player actions ─────────────────────────────────────────────────────────

  _busy() {
    return this._action === 'hurt' || this._action === 'punch' || this._action === 'super'
  }

  _blocking() {
    return !this._fightOver && this._phase === 'fight' &&
      !!this._cursors?.down?.isDown && !this._busy()
  }

  _tryDodge(dir) {
    if (this._fightOver || this._busy()) return false
    this._action   = dir === 'L' ? 'dodgeL' : 'dodgeR'
    this._actionMs = DODGE_MS
    const dx = dir === 'L' ? -130 : 130
    this.tweens.add({
      targets: [this._sHead, this._sFistL, this._sFistR],
      x: `+=${dx}`, duration: 110, yoyo: true, hold: DODGE_MS - 220, ease: 'Quad.out',
      onComplete: () => this._parkFists(),
    })
    return true
  }

  _tryPunch(high) {
    if (this._fightOver || this._busy() || this._punchCd > 0) return false
    this._punchCd  = high ? PUNCH_CD_HEAD : PUNCH_CD_BODY
    this._action   = 'punch'
    this._actionMs = high ? 220 : 170
    this._animateFist(high ? 'R' : 'L', high, false)
    this._landPunch(high)
    return true
  }

  _trySuper() {
    if (this._fightOver || this._busy() || this._meter < METER_MAX) return false
    this._meter     = 0
    this._usedSuper = true
    this._action    = 'super'
    this._actionMs  = 520
    this._animateFist('L', true, true)
    this._animateFist('R', true, true)
    this.cameras.main.flash(180, 220, 190, 255)
    this.cameras.main.shake(220, 0.012)
    this._pop(W / 2, 150, 'PROMPT', true)
    this._hitAuthor(DMG_SUPER, true, true)
    if (!this._fightOver) this._openAuthor(900)
    this._updateHUD()
    return true
  }

  _animateFist(hand, high, isSuper) {
    const fist = hand === 'L' ? this._sFistL : this._sFistR
    const home = this._fistHome[hand]
    this.tweens.killTweensOf(fist)
    this.tweens.add({
      targets: fist,
      y: high ? 240 : 320,
      scaleX: isSuper ? 1.5 : 1.2, scaleY: isSuper ? 1.5 : 1.2,
      duration: isSuper ? 110 : 80, yoyo: true, ease: 'Quad.out',
      onComplete: () => { fist.x = home.x; fist.y = home.y; fist.setScale(1) },
    })
  }

  _parkFists() {
    this._sFistL.x = this._fistHome.L.x; this._sFistL.y = this._fistHome.L.y
    this._sFistR.x = this._fistHome.R.x; this._sFistR.y = this._fistHome.R.y
    this._sHead.x  = this._sX
  }

  _landPunch(high) {
    if (this._fightOver || this._authorState === 'ko') return
    const counter = this._authorState === 'open'
    let dmg   = high ? DMG_HEAD : DMG_BODY
    let meter = high ? METER_HEAD : METER_BODY
    if (counter) { dmg *= COUNTER_MULT; meter += METER_COUNTER_BONUS }
    this._hitAuthor(dmg, counter, false)
    this._addMeter(meter)
  }

  _addMeter(amount) {
    const wasFull = this._meter >= METER_MAX
    this._meter = Phaser.Math.Clamp(this._meter + amount, 0, METER_MAX)
    if (!wasFull && this._meter >= METER_MAX) this._pop(W - 90, 520, 'PROMPT READY', true)
    this._updateHUD()
  }

  // ── The Author ─────────────────────────────────────────────────────────────

  _scheduleAttack() {
    if (this._fightOver || this._authorState !== 'idle') return
    const frac = this._authorHp / AUTHOR_MAX_HP
    const wait = Phaser.Math.Linear(INTERVAL_MIN, INTERVAL_MAX, frac)
    this._authorState = 'wait'
    this._stateMs = Math.max(420, wait)
  }

  _startWindup() {
    if (this._fightOver) return
    this._authorState = 'windup'
    this._dodgeDir    = Phaser.Math.Between(0, 1) === 0 ? 'L' : 'R'
    this._strokeIdx   = Phaser.Math.Between(0, STROKES.length - 1)
    this._strokeChars = 0

    const frac = this._authorHp / AUTHOR_MAX_HP
    this._stateMs      = Phaser.Math.Linear(WINDUP_MIN, WINDUP_MAX, frac)
    this._windupTotal  = this._stateMs

    this._aPen.setFillStyle(C_PEN_WIND)
    this.tweens.add({
      targets: this._aPen, y: this._aPenHome.y - 46, scaleY: 1.25,
      duration: 160, ease: 'Quad.out',
    })

    this._stroke.setText('').setAlpha(1)
    this._tell.setText(this._dodgeDir === 'L' ? '◄ move' : 'move ►').setAlpha(1)
    this._tell.x = W / 2 + (this._dodgeDir === 'L' ? -150 : 150)
  }

  _strike() {
    if (this._fightOver || this._authorState !== 'windup') return
    this._authorState = 'strike'
    this._stroke.setAlpha(0)
    this._tell.setAlpha(0)

    this.tweens.add({
      targets: this._aPen,
      x: this._aPenHome.x + (this._dodgeDir === 'L' ? -150 : 150), y: 300,
      angle: this._dodgeDir === 'L' ? -70 : 70,
      duration: 90, yoyo: true, ease: 'Quad.in',
      onComplete: () => {
        this._aPen.x = this._aPenHome.x
        this._aPen.y = this._aPenHome.y
        this._aPen.setAngle(0).setScale(1).setFillStyle(C_PEN)
      },
    })

    const dodged =
      (this._dodgeDir === 'L' && this._action === 'dodgeL') ||
      (this._dodgeDir === 'R' && this._action === 'dodgeR')

    if (dodged) {
      this._pop(W / 2, 200, 'the line breaks', true)
      this._openAuthor(OPEN_MS)
    } else if (this._blocking()) {
      this._hitSlop(AUTHOR_DMG_CHIP, true)
      this._recoverAuthor(420)
    } else {
      this._hitSlop(AUTHOR_DMG_FULL, false)
      this._recoverAuthor(360)
    }
  }

  _openAuthor(ms) {
    this._authorState = 'open'
    this._stateMs = ms
    this._aBody.setFillStyle(C_AUTHOR_OPEN)
  }

  _recoverAuthor(ms) {
    this._authorState = 'recover'
    this._stateMs = ms
  }

  _closeAuthor() {
    this._aBody.setFillStyle(C_AUTHOR)
    this._authorState = 'idle'
    this._scheduleAttack()
  }

  // ── Damage ─────────────────────────────────────────────────────────────────

  _hitAuthor(amount, counter, isSuper) {
    if (this._fightOver) return
    this._authorHp = Math.max(0, this._authorHp - amount)

    this._aBody.setFillStyle(C_AUTHOR_HIT)
    this.time.delayedCall(90, () => {
      if (this._authorState !== 'open' && this._authorState !== 'ko') this._aBody.setFillStyle(C_AUTHOR)
    })
    if (counter || isSuper) this.cameras.main.shake(120, isSuper ? 0.01 : 0.006)
    this._pop(W / 2, 190, isSuper ? '' : Math.round(amount), counter || isSuper)

    this._checkBark()
    this._updateHUD()
    if (this._authorHp <= 0) this._winFight()
  }

  _hitSlop(amount, blocked) {
    if (this._fightOver) return
    this._hp     = Math.max(0, this._hp - amount)
    this._meter  = Math.max(0, this._meter - METER_LOSS_ON_HIT)
    this._action = 'hurt'
    this._actionMs = HURT_MS

    if (!blocked) {
      this.cameras.main.shake(160, 0.009)
      this.cameras.main.flash(120, 180, 30, 60)
      // The sentence he finished is the damage.
      this._pop(W / 2, 150, STROKES[this._strokeIdx], false)
    }
    this._updateHUD()
    if (this._hp <= 0) this._loseFight()
  }

  _checkBark() {
    const frac = this._authorHp / AUTHOR_MAX_HP
    while (this._nextBark < PHASE_BARKS.length && frac <= PHASE_BARKS[this._nextBark].at) {
      this._say(PHASE_BARKS[this._nextBark].line, 2600)
      this._nextBark++
    }
  }

  // ── End of fight ───────────────────────────────────────────────────────────

  _winFight() {
    this._fightOver   = true
    this._authorState = 'ko'
    this._stroke.setAlpha(0)
    this._tell.setAlpha(0)

    this.tweens.add({ targets: [this._aBody, this._aHead, this._aCursor, this._aHand], alpha: 0.25, duration: 700 })
    this._banner.setText('he stops writing')
    this._sub.setText('')

    // The pen falls between you and stays there.
    this.tweens.add({
      targets: this._aPen, x: W / 2, y: 470, angle: 96,
      duration: 900, ease: 'Quad.in',
      onComplete: () => this._offerPen(),
    })
    this.time.delayedCall(1000, () => this._offerPen())
  }

  _offerPen() {
    if (this._phase !== 'fight') return
    this._phase = 'choice'
    this._banner.setText('the pen is on the floor')
    this._sub.setText('between you and what is left of him.\n\n[E]  take it        [Q]  leave it')
  }

  _choose(ending) {
    if (this._phase !== 'choice' || this._transitioning) return
    this._transitioning = true
    this._phase = 'done'

    const state = {
      ...this._slopState,
      chapter3Complete: true,
      ending,
      endingGood: ending === GOOD_ENDING,
      usedSuper: this._usedSuper,
    }
    try { SaveState.save(state) } catch (_) {}

    this._banner.setText(ending === ENDING.TOOK ? 'he takes the pen' : 'he leaves it there')
    this._sub.setText('')
    this.cameras.main.fade(1200, 0, 0, 0, false, (_, t) => {
      if (t === 1) this.scene.start('Ch3CreditsScene', { slopState: state, ending })
    })
  }

  _loseFight() {
    this._fightOver = true
    this._stroke.setAlpha(0)
    this._tell.setAlpha(0)
    this._banner.setText('he keeps writing')
    this._sub.setText('press SPACE to stand back up')
    this.input.keyboard.once('keydown-SPACE', () =>
      this.scene.restart({ slopState: this._slopState, playerHealth: this._arrivalHp }))
  }

  // ── Presentation ───────────────────────────────────────────────────────────

  _pop(x, y, value, big) {
    const t = this.add.text(x, y, String(value), {
      fontSize: big ? '22px' : '15px',
      color: big ? '#ffcf4d' : '#ffffff',
      fontFamily: 'Courier New',
    }).setOrigin(0.5).setDepth(25)
    this.tweens.add({
      targets: t, y: y - 46, alpha: 0, duration: 650, ease: 'Quad.out',
      onComplete: () => t.destroy(),
    })
  }

  _updateHUD() {
    this._aHpBar.width = 520 * Phaser.Math.Clamp(this._authorHp / AUTHOR_MAX_HP, 0, 1)

    const frac = Phaser.Math.Clamp(this._hp / PLAYER_MAX_HP, 0, 1)
    this._sHpBar.width = 244 * frac
    this._sHpBar.setFillStyle(frac > 0.5 ? C_SLOP_GUARD : frac > 0.25 ? 0xccaa44 : 0xdd4466)

    const ready = this._meter >= METER_MAX
    this._meterBar.width = 244 * (this._meter / METER_MAX)
    this._meterLabel.setText(ready ? 'PROMPT ✦' : 'PROMPT')
    this._meterLabel.setColor(ready ? '#ffe14d' : C_DIM)
  }

  _drawGuard() {
    if (this._busy()) return
    const guard = this._blocking()
    const y = guard ? H - 132 : this._fistHome.L.y
    this._sFistL.setFillStyle(guard ? C_SLOP_GUARD : C_SLOP)
    this._sFistR.setFillStyle(guard ? C_SLOP_GUARD : C_SLOP)
    if (this._action === 'idle') {
      this._sFistL.y = y
      this._sFistR.y = y
      this._sFistL.x = guard ? this._sX - 52 : this._fistHome.L.x
      this._sFistR.x = guard ? this._sX + 52 : this._fistHome.R.x
    }
  }

  // ── Update ─────────────────────────────────────────────────────────────────

  update(_, delta) {
    const dt = delta || 0

    if (this._phase === 'choice') {
      if (Phaser.Input.Keyboard.JustDown(this._eKey)) this._choose(ENDING.TOOK)
      if (Phaser.Input.Keyboard.JustDown(this._qKey)) this._choose(ENDING.LEFT)
      return
    }
    if (this._fightOver || this._phase === 'done') return

    // Player timers.
    if (this._punchCd > 0) this._punchCd -= dt
    if (this._action !== 'idle') {
      this._actionMs -= dt
      if (this._actionMs <= 0) { this._action = 'idle'; this._parkFists() }
    }

    // Input.
    if (!this._busy()) {
      if (Phaser.Input.Keyboard.JustDown(this._cursors.left))  this._tryDodge('L')
      if (Phaser.Input.Keyboard.JustDown(this._cursors.right)) this._tryDodge('R')
      if (Phaser.Input.Keyboard.JustDown(this._jKey))     this._tryPunch(false)
      if (Phaser.Input.Keyboard.JustDown(this._kKey))     this._tryPunch(true)
      if (Phaser.Input.Keyboard.JustDown(this._spaceKey)) this._trySuper()
    }

    // A killing blow lands inside the input block above; stop before the state
    // machine can tick a ko'd Author back to idle.
    if (this._fightOver || this._phase !== 'fight') return

    // Author state machine.
    this._stateMs -= dt
    if (this._authorState === 'windup') {
      // Compose the sentence across the windup. Finishing it is the hit.
      const line = STROKES[this._strokeIdx]
      const done = 1 - Phaser.Math.Clamp(this._stateMs / (this._windupTotal || 1), 0, 1)
      this._strokeChars = Math.ceil(line.length * done)
      this._stroke.setText(line.slice(0, this._strokeChars))
      if (this._stateMs <= 0) this._strike()
    } else if (this._stateMs <= 0) {
      if (this._authorState === 'wait')         this._startWindup()
      else if (this._authorState === 'open')    this._closeAuthor()
      else if (this._authorState === 'recover') this._closeAuthor()
    }

    this._drawGuard()
  }
}
