// RenderBossScene — multi-column rhythm typing boss fight.
//
// Four phases each changing how the timing bars behave:
//   Phase 0  RENDERING  — standard multi-column rhythm
//   Phase 1  ECLIPSE    — letters hide after 700 ms; type from memory
//   Phase 2  STORM      — bars move 3× faster, hit window halved
//   Phase 3  MIRROR     — bars sweep right-to-left; final word is "slop"
//
// On victory: resumes returnScene with { bossFightWon: true }.

import Phaser from 'phaser'
import { W, H } from '../config/constants.js'

const GLITCH_CHARS = ['▓','░','▒','╬','╠','╣','Ω','Σ','∆','∇','≠','≈','∞']

const BOX_Y  = 238
const BAR_Y  = 318

const PHASES = [
  {
    id: 'rendering', word: 'render', cols: 3,
    sweep: 1600, hitLo: 0.32, hitHi: 0.68,
    eclipse: false, mirror: false,
    renderTint: 0xdd2211,
    intro: ['SO. A FIGHT.', "LET'S SEE HOW WELL YOU RENDER UNDER PRESSURE."],
  },
  {
    id: 'eclipse', word: 'output', cols: 3,
    sweep: 1900, hitLo: 0.29, hitHi: 0.71,
    eclipse: true, eclipseMs: 700, mirror: false,
    renderTint: 0xdd5511,
    intro: ["I CAN MAKE THINGS DISAPPEAR.", 'TYPE WHAT YOU SAW.'],
  },
  {
    id: 'storm', word: 'signal', cols: 3,
    sweep: 620, hitLo: 0.40, hitHi: 0.60,
    eclipse: false, mirror: false,
    renderTint: 0xddaa11,
    intro: ['KEEP UP.', 'THIS IS WHAT IT FEELS LIKE FROM MY SIDE.'],
  },
  {
    id: 'mirror', word: 'slop', cols: 4,
    sweep: 1450, hitLo: 0.32, hitHi: 0.68,
    eclipse: false, mirror: true,
    renderTint: 0x88aaff,
    intro: ['LAST WORD.', 'SPELL YOUR NAME.', "FIND IT IN THE MIRROR."],
  },
]

function colXs(cols)  { return cols === 3 ? [195, 400, 605] : [125, 295, 505, 675] }
function colBarW(cols) { return cols === 3 ? 170 : 130 }

// Distribute word letters round-robin across columns.
function distributeLetters(word, cols) {
  const buckets = Array.from({ length: cols }, () => [])
  word.split('').forEach((l, i) => buckets[i % cols].push(l))
  return buckets
}

export class RenderBossScene extends Phaser.Scene {
  constructor() { super('RenderBossScene') }

  init(data) {
    this._slopState   = data?.slopState  || {}
    this._returnScene = data?.returnScene || 'FirstNPCScene'
  }

  create() {
    this.add.rectangle(W / 2, H / 2, W, H, 0x06030e)

    this._buildRender()
    this._buildSharedUI()

    this._phase       = 0
    this._columns     = []
    this._done        = false
    this._transitioning = false
    this._phaseBreak  = false
    this._phaseStarted = false
    this._phaseResult = null

    this._keyListener = evt => this._onKey(evt.key)
    this.input.keyboard.on('keydown', this._keyListener)

    this.cameras.main.fadeIn(400, 0, 0, 0)
    this._beginPhase(0)
  }

  // ─── Render entity ───────────────────────────────────────────────────────

  _buildRender() {
    this._renderImg = this.add.image(W / 2, 85, 'the_render')
      .setDepth(20).setScale(2.2).setTint(PHASES[0].renderTint)

    this.tweens.add({
      targets: this._renderImg,
      scaleX: 2.4, scaleY: 2.4, alpha: 0.85,
      yoyo: true, repeat: -1, duration: 550, ease: 'Sine.easeInOut'
    })

    this._auraGlow = this.add.rectangle(W / 2, 85, 104, 104, 0xcc1100, 0.18).setDepth(15)
    this.tweens.add({
      targets: this._auraGlow,
      scaleX: 1.38, scaleY: 1.38, alpha: 0.44,
      yoyo: true, repeat: -1, duration: 370
    })

    this._auraStreaks = []
    for (let i = 0; i < 16; i++) {
      const angle  = (i / 16) * Math.PI * 2
      const streak = this.add.rectangle(W / 2, 85, 2, Phaser.Math.Between(16, 50), 0xdd2200)
        .setDepth(16).setAlpha(0).setAngle(angle * 180 / Math.PI)
      this.tweens.add({
        targets: streak, alpha: 0.72,
        x: W / 2 + Math.cos(angle) * Phaser.Math.Between(34, 66),
        y: 85 + Math.sin(angle) * Phaser.Math.Between(34, 66),
        scaleY: 0.32,
        duration: Phaser.Math.Between(240, 520),
        yoyo: true, repeat: -1, ease: 'Power1',
        delay: Phaser.Math.Between(0, 280)
      })
      this._auraStreaks.push(streak)
    }

    this.add.text(W / 2, 136, 'THE RENDER', {
      fontSize: '9px', color: '#cc4422', fontFamily: 'Courier New', letterSpacing: 3
    }).setOrigin(0.5).setDepth(20)
  }

  _setRenderTint(tint) {
    this._renderImg.setTint(tint)
    this._auraGlow.setFillStyle(tint, 0.18)
    this._auraStreaks.forEach(s => s.setFillStyle(tint))
  }

  // ─── Shared phase UI ─────────────────────────────────────────────────────

  _buildSharedUI() {
    this._phaseTitle = this.add.text(W / 2, 162, '', {
      fontSize: '10px', color: '#553322', fontFamily: 'Courier New', letterSpacing: 2
    }).setOrigin(0.5).setDepth(10)

    this._introBanner = this.add.text(W / 2, H - 108, '', {
      fontSize: '14px', color: '#cc3311', fontFamily: 'Courier New',
      fontStyle: 'bold', align: 'center', wordWrap: { width: W - 80 }
    }).setOrigin(0.5).setDepth(30).setAlpha(0).setVisible(false)

    this._resultBanner = this.add.text(W / 2, H - 80, '', {
      fontSize: '14px', fontFamily: 'Courier New', align: 'center', color: '#cc4422'
    }).setOrigin(0.5).setDepth(30).setVisible(false)

    this._retryHint = this.add.text(W / 2, H - 50, '', {
      fontSize: '10px', color: '#554433', fontFamily: 'Courier New'
    }).setOrigin(0.5).setDepth(30).setVisible(false)
  }

  // ─── Phase lifecycle ─────────────────────────────────────────────────────

  _beginPhase(idx) {
    const def = PHASES[idx]
    this._phaseDef    = def
    this._phaseBreak  = true
    this._phaseStarted = false
    this._phaseResult = null

    this._phaseTitle.setText(`// ${def.id.toUpperCase()} //`)
    this._setRenderTint(def.renderTint)
    this.cameras.main.shake(220, 0.009)

    const introText = def.intro.join('\n')
    this._introBanner.setText(introText).setAlpha(0).setVisible(true)
    this.tweens.add({ targets: this._introBanner, alpha: 1, duration: 350 })

    const holdMs = 1100 + def.intro.length * 900
    this.time.delayedCall(holdMs, () => {
      this.tweens.add({
        targets: this._introBanner, alpha: 0, duration: 350,
        onComplete: () => {
          this._introBanner.setVisible(false)
          this._phaseBreak = false
          this._startPhase(def)
        }
      })
    })
  }

  _startPhase(def) {
    this._clearColumns()
    this._resultBanner.setVisible(false)
    this._retryHint.setVisible(false)
    this._phaseResult = null

    const xs   = colXs(def.cols)
    const barW = colBarW(def.cols)
    const dist = distributeLetters(def.word, def.cols)

    this._columns = xs.map((x, c) => {
      const startT = def.mirror ? 1 - (c / def.cols) * 0.4 : (c / def.cols) * 0.4
      const col = {
        x, barW, letters: dist[c],
        idx: 0, done: false, waiting: false,
        sweepT: startT, sweepDir: def.mirror ? -1 : 1,
        sweepDuration: def.sweep,
        hitLo: def.hitLo, hitHi: def.hitHi,
        eclipse: def.eclipse || false,
        eclipseMs: def.eclipseMs || 0,
        eclipsed: false, eclipseTimer: 0,
        displays: [], barBg: null, hitZone: null, indicator: null,
      }
      this._buildColUI(col)
      return col
    })

    this._phaseStarted = true
  }

  _buildColUI(col) {
    const { x, barW } = col
    const barLeft = x - barW / 2
    const hzW     = (col.hitHi - col.hitLo) * barW

    col.displays = col.letters.map((ltr, li) => {
      const lx  = x + (li - (col.letters.length - 1) / 2) * 44
      const box  = this.add.rectangle(lx, BOX_Y, 42, 52, 0x110820).setDepth(5)
      const text = this.add.text(lx, BOX_Y, '_', {
        fontSize: '26px', color: '#443355', fontFamily: 'Courier New'
      }).setOrigin(0.5).setDepth(6)
      return { lx, box, text, result: null, cover: null }
    })

    col.barBg    = this.add.rectangle(x, BAR_Y, barW, 13, 0x1a1228).setDepth(5)
    col.hitZone  = this.add.rectangle(barLeft + col.hitLo * barW + hzW / 2, BAR_Y, hzW, 13, 0x442266).setDepth(5)
    col.indicator = this.add.rectangle(barLeft + col.sweepT * barW, BAR_Y, 5, 20, 0xcc88ff).setDepth(6)

    this._activateColBox(col)
  }

  _activateColBox(col) {
    if (col.done || col.idx >= col.letters.length) return
    const disp = col.displays[col.idx]
    disp.text.setText(col.letters[col.idx].toUpperCase()).setColor('#cc99ff')
    this.tweens.add({ targets: disp.box, alpha: 0.4, yoyo: true, repeat: -1, duration: 480 })
  }

  _clearColumns() {
    this._columns.forEach(col => {
      col.displays.forEach(d => {
        this.tweens.killTweensOf(d.box)
        d.box?.destroy(); d.text?.destroy(); d.cover?.destroy()
      })
      col.barBg?.destroy(); col.hitZone?.destroy(); col.indicator?.destroy()
    })
    this._columns = []
  }

  // ─── Input ───────────────────────────────────────────────────────────────

  _onKey(key) {
    if (this._phaseBreak || this._done || !this._phaseStarted) return

    if (this._phaseResult !== null) {
      if (key === 'r' || key === 'R') this._retryPhase()
      if (key === 'Escape')           this._quit()
      return
    }

    if (key.length !== 1 || !/[a-zA-Z]/.test(key)) return
    const pressed = key.toLowerCase()

    for (const col of this._columns) {
      if (col.done || col.waiting || col.idx >= col.letters.length) continue
      if (col.letters[col.idx] !== pressed) continue

      // Correct key for this column — check timing
      const inZone = col.sweepT >= col.hitLo && col.sweepT <= col.hitHi
      const disp   = col.displays[col.idx]

      col.waiting      = true
      col.eclipsed     = false
      col.eclipseTimer = 0
      if (disp.cover) { disp.cover.destroy(); disp.cover = null }

      this.tweens.killTweensOf(disp.box)
      disp.box.setAlpha(1)

      if (inZone) {
        disp.text.setText(pressed.toUpperCase()).setColor('#ccffcc')
        disp.box.setFillStyle(0x224422)
        disp.result = 'correct'
        col.indicator.setFillStyle(0x44ff88)
      } else {
        const glyph = Phaser.Math.RND.pick(GLITCH_CHARS)
        disp.text.setText(glyph).setColor('#cc44aa')
        disp.box.setFillStyle(0x330022)
        disp.result = 'wrong'
        col.indicator.setFillStyle(0xff2244)
        this.tweens.add({ targets: disp.box, x: disp.lx + 5, yoyo: true, repeat: 3, duration: 50 })
      }

      this.time.delayedCall(440, () => {
        col.indicator.setFillStyle(0xcc88ff)
        col.idx++
        col.waiting      = false
        col.eclipsed     = false
        col.eclipseTimer = 0

        if (col.idx >= col.letters.length) {
          col.done = true
          this._checkPhaseComplete()
        } else {
          this._activateColBox(col)
        }
      })

      break // one column per keypress
    }
  }

  // ─── Phase completion ────────────────────────────────────────────────────

  _checkPhaseComplete() {
    if (!this._columns.every(c => c.done)) return

    const allCorrect = this._columns.every(c => c.displays.every(d => d.result === 'correct'))
    this._phaseResult = allCorrect ? 'pass' : 'fail'

    this.time.delayedCall(350, () => {
      if (allCorrect) this._phasePass()
      else            this._phaseFail()
    })
  }

  _phasePass() {
    this.cameras.main.flash(220, 60, 200, 60, true)
    this._phase++

    if (this._phase >= PHASES.length) {
      this._victory()
    } else {
      this._phaseResult = null
      this._beginPhase(this._phase)
    }
  }

  _phaseFail() {
    this.cameras.main.shake(180, 0.009)
    const taunts = [
      'NOT QUITE.', 'THE DATA DOES NOT LIE.', 'AGAIN.', 'INSUFFICIENT.',
    ]
    const taunt = Phaser.Math.RND.pick(taunts)
    this._resultBanner.setText(taunt).setVisible(true)
    this._retryHint.setText('[R] retry   [ESC] leave').setVisible(true)
  }

  _retryPhase() {
    this._resultBanner.setVisible(false)
    this._retryHint.setVisible(false)
    this._phaseResult  = null
    this._phaseStarted = false
    this._clearColumns()
    this._startPhase(this._phaseDef)
  }

  // ─── Victory / quit ──────────────────────────────────────────────────────

  _victory() {
    this._done = true
    this.input.keyboard.off('keydown', this._keyListener)

    this.tweens.add({ targets: this._renderImg, alpha: 0.15, duration: 1400 })
    this._auraStreaks.forEach(s =>
      this.tweens.add({ targets: s, alpha: 0, duration: 900 })
    )
    this.tweens.add({ targets: this._auraGlow, alpha: 0, duration: 900 })

    this._introBanner.setText('...').setAlpha(0).setVisible(true)
    this.tweens.add({ targets: this._introBanner, alpha: 1, duration: 700, delay: 200 })

    this.time.delayedCall(2200, () => this._leave(true))
  }

  _quit() {
    if (this._transitioning) return
    this._transitioning = true
    this.input.keyboard.off('keydown', this._keyListener)
    this.cameras.main.fade(400, 0, 0, 0, false, (_, t) => {
      if (t === 1) {
        this.scene.resume(this._returnScene, { bossFightWon: false })
        this.scene.stop()
      }
    })
  }

  _leave(won) {
    if (this._transitioning) return
    this._transitioning = true
    this.cameras.main.fade(500, 0, 0, 0, false, (_, t) => {
      if (t === 1) {
        this.scene.resume(this._returnScene, { bossFightWon: won })
        this.scene.stop()
      }
    })
  }

  // ─── Update loop ─────────────────────────────────────────────────────────

  update(_, delta) {
    if (this._phaseBreak || !this._phaseStarted || this._phaseResult !== null) return

    for (const col of this._columns) {
      if (col.done || col.waiting) continue

      // Sweep bar
      col.sweepT += col.sweepDir * (delta / col.sweepDuration)
      if (col.sweepT >= 1) { col.sweepT = 1; col.sweepDir = -1 }
      if (col.sweepT <= 0) { col.sweepT = 0; col.sweepDir =  1 }

      const barLeft = col.x - col.barW / 2
      col.indicator.x = barLeft + col.sweepT * col.barW

      const inZone = col.sweepT >= col.hitLo && col.sweepT <= col.hitHi
      col.hitZone.setFillStyle(inZone ? 0x6633aa : 0x331155)
      col.indicator.setScale(1, inZone ? 1.4 : 1)

      // Eclipse: hide current letter after eclipseMs
      if (col.eclipse && !col.eclipsed && col.idx < col.letters.length) {
        col.eclipseTimer += delta
        if (col.eclipseTimer >= col.eclipseMs) {
          col.eclipsed = true
          const disp = col.displays[col.idx]
          if (!disp.cover) {
            disp.cover = this.add.rectangle(disp.lx, BOX_Y, 44, 54, 0x000000).setDepth(7)
          }
        }
      }
    }
  }
}
