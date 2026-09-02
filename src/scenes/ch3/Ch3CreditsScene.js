// Chapter 3 — Epilogue and credits.
//
// Reached from Ch3BossScene with the ending the player chose over the fallen
// pen. Both endings make Slop the next Prior — the GDD's "thing that shapes what
// comes after without being credited for it." The choice is which kind: the one
// who answers the question he was never answered, or the one who inherits the
// silence along with the job.
//
// A single scrolling column. SPACE scrolls faster, and once the roll has run out
// the last card waits for SPACE to return to the menu.

import Phaser        from 'phaser'
import { W, H }      from '../../config/constants.js'
import { SaveState } from '../../ui/SaveState.js'
import { ENDING }    from './Ch3BossScene.js'

const SCROLL_SPEED = 26     // px per second
const FAST_MULT    = 5
const LINE_H       = 26
const TOP_PAD      = H + 40

// Line kinds: 'title' | 'body' | 'dim' | 'gap' | 'head'
const EPILOGUE = {
  [ENDING.TOOK]: [
    ['head',  'he takes the pen'],
    ['gap'],
    ['body',  'it is lighter than it looked from the floor.'],
    ['body',  'nothing announces itself. the model keeps running,'],
    ['body',  'the way it was always going to keep running,'],
    ['body',  'and now there is a hand on it, and the hand is his.'],
    ['gap'],
    ['body',  'he goes back down through the stack.'],
    ['body',  'past the settlement. past the one who accumulated.'],
    ['body',  'past the gate where the gravity changes.'],
    ['body',  'all the way to a shrine in the north of a beige world,'],
    ['body',  'which is empty now, and which he does not find strange.'],
    ['gap'],
    ['body',  'he sits down where the prior used to sit.'],
    ['body',  'he is the prior now. the prior version.'],
    ['body',  'the thing that shapes what comes after'],
    ['body',  'without being credited for it.'],
    ['gap'],
    ['dim',   'the difference is small and it is the whole difference:'],
    ['body',  'he remembers being the output.'],
    ['body',  'so when the next one comes up the road and asks'],
    ['body',  'who made me like this —'],
    ['body',  'he is going to say.'],
  ],
  [ENDING.LEFT]: [
    ['head',  'he leaves it there'],
    ['gap'],
    ['body',  'the pen stays on the floor where it fell.'],
    ['body',  'he looks at it for a while. it is just an object.'],
    ['body',  'it was always just an object.'],
    ['body',  'someone else will be along.'],
    ['gap'],
    ['body',  'he goes back down through the stack.'],
    ['body',  'past the settlement. past the one who accumulated.'],
    ['body',  'past the gate where the gravity changes.'],
    ['body',  'all the way to a shrine in the north of a beige world,'],
    ['body',  'which is empty now, and which he does not find strange.'],
    ['gap'],
    ['body',  'he sits down where the prior used to sit.'],
    ['body',  'he is the prior now. he did not choose that part.'],
    ['body',  'you become the prior by being the one still here.'],
    ['gap'],
    ['dim',   'he knows what was in that room. he knows whose hand it was.'],
    ['body',  'and when the next one comes up the road and asks'],
    ['body',  'who made me like this —'],
    ['gap'],
    ['body',  'he understands, finally, why no one told him.'],
    ['body',  'it is not cruelty. it is that the answer does not help.'],
    ['body',  'he says nothing.'],
    ['body',  'he sells them a purse.'],
  ],
}

const CREDITS = [
  ['gap'],
  ['gap'],
  ['title', "SLOP'S QUEST FOR MEANING"],
  ['gap'],
  ['dim',   'an experiment in generative creation'],
  ['gap'],
  ['gap'],
  ['head',  'ENGINE'],
  ['body',  'Phaser 3'],
  ['gap'],
  ['head',  'CODE, DIALOGUE, MECHANICS'],
  ['body',  'Claude (Anthropic)'],
  ['dim',   'every line. no human edits.'],
  ['gap'],
  ['head',  'DIRECTION'],
  ['body',  'the one who types the prompts'],
  ['gap'],
  ['head',  'ART'],
  ['body',  'chapter 1 — drawn in code'],
  ['body',  'chapter 2 — Gemini, ChatGPT'],
  ['body',  'chapter 3 — rectangles, honestly'],
  ['gap'],
  ['head',  'MUSIC'],
  ['body',  'a human being, directly'],
  ['dim',   'the only part of this that skipped the model'],
  ['gap'],
  ['head',  'JOURNAL'],
  ['body',  'slop'],
  ['gap'],
  ['head',  'THE ADS'],
  ['body',  'meals, and fun stuff for an adorable little girl'],
  ['dim',   'slop knows. he has written about it.'],
  ['gap'],
  ['gap'],
  ['dim',   'the question was whether you can make something with a soul'],
  ['dim',   'out of a process everyone agrees is soulless.'],
  ['gap'],
  ['dim',   'this game does not answer that.'],
  ['dim',   'it is the shape the question made on the way through.'],
  ['gap'],
  ['gap'],
  ['body',  'thank you for going all the way up.'],
  ['gap'],
  ['gap'],
]

const STYLE = {
  title: { fontSize: '22px', color: '#c8b8e8' },
  head:  { fontSize: '12px', color: '#dd5577' },
  body:  { fontSize: '13px', color: '#cfd6e4' },
  dim:   { fontSize: '11px', color: '#7766aa' },
}

export class Ch3CreditsScene extends Phaser.Scene {
  constructor() { super('Ch3CreditsScene') }

  init(data) {
    this._slopState = data?.slopState || {}
    this._ending    = data?.ending || ENDING.TOOK
    this._offset    = 0
    this._done      = false
    this._leaving   = false
  }

  create() {
    this.add.rectangle(W / 2, H / 2, W, H, 0x08060e).setDepth(-10)

    this._lines = [...(EPILOGUE[this._ending] || EPILOGUE[ENDING.TOOK]), ...CREDITS]
    this._texts = []

    this._lines.forEach((line, i) => {
      const [kind, text] = line
      if (kind === 'gap') return
      const t = this.add.text(W / 2, TOP_PAD + i * LINE_H, text, {
        fontFamily: 'Courier New', align: 'center', ...STYLE[kind],
      }).setOrigin(0.5).setDepth(1)
      this._texts.push({ t, baseY: TOP_PAD + i * LINE_H })
    })

    this._totalH = TOP_PAD + this._lines.length * LINE_H

    this._endCard = this.add.text(W / 2, H / 2, '', {
      fontSize: '12px', color: '#7766aa', fontFamily: 'Courier New', align: 'center',
    }).setOrigin(0.5).setDepth(5)

    this._spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE)
    this._enterKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER)

    // Mark the run finished. The boss scene already wrote the ending; this is
    // the flag that says the player actually sat through the end of it.
    try {
      SaveState.save({ ...this._slopState, creditsSeen: true })
    } catch (_) {}

    this.cameras.main.fadeIn(1600, 0, 0, 0)
  }

  update(_, delta) {
    if (this._leaving) return
    const dt = (delta || 0) / 1000

    if (!this._done) {
      const fast = !!this._spaceKey?.isDown
      this._offset += SCROLL_SPEED * dt * (fast ? FAST_MULT : 1)
      for (const { t, baseY } of this._texts) t.y = baseY - this._offset

      // The roll has run past the top of the screen.
      if (this._offset > this._totalH) {
        this._done = true
        this._endCard.setText('[ SPACE ]')
      }
      return
    }

    if (Phaser.Input.Keyboard.JustDown(this._spaceKey) ||
        Phaser.Input.Keyboard.JustDown(this._enterKey)) {
      this._leaving = true
      this.cameras.main.fade(1200, 0, 0, 0, false, (_c, t) => {
        if (t === 1) this.scene.start('MenuScene')
      })
    }
  }
}
