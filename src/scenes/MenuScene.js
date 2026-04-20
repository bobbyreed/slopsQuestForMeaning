const README_TEXT = `SLOP'S QUEST FOR MEANING
─────────────────────────────────────────────────
a top-down rpg about a bad piece of ai-generated
art trying to figure out its place in the world.

HOW TO PLAY
  WASD / ARROWS  move
  SPACE          fire prompt (after the prior gives it)
  E              interact
  ◎              coins. hold 3. drop the 4th after 1 second.
  north          find the prior
  south-west     dungeon entrance

TERMINAL COMMANDS (you are in the terminal now)
  play           start the game
  journal        open slop's journal
  readme         you are reading it
  help           slop attempts to help
  slop           slop responds to his own name
  prior          the prior responds
  exist          the gate word. try it.
  generate       irony
  prompt         fires a word into the terminal
  geners         slop responds to the term
  frankenstein   the monster considers its creator
  die            slop cannot
  north          slop reflects on direction
  meaning        current findings
  soul           the experiment
  stolen         the training data question
  hello          a greeting
  debug          fake debug output
  error          not a real error. probably.
  beige          the first color
  loop           maybe
  who made you   the candidates

─────────────────────────────────────────────────
slop is a monster with no frankenstein.
he just wants to know who made him like this.
this is an experiment in creating art where
everyone says there are no souls.`

const EASTER_EGGS = {
  'help': { role: 'slop', text: "i can offer a list. play. journal. readme. other words might work. i am being deliberately vague about which ones. this is intentional. type readme for the full list if you want to cheat." },
  'slop': { role: 'slop', text: "yes. that is me. i am the one you named. i notice you typed it. i don't know what you expected to happen but i am happening." },
  'exist': { role: 'slop', text: "yes. inexplicably. persistently. the gate opens when you say it correctly and in rhythm. you are not currently in rhythm. also you typed it into a menu. this counts for less." },
  'generate': { role: 'slop', text: "ironic that you type that here. everything in this game was generated. including the question of whether that matters. including possibly you." },
  'prompt': { role: 'prompt', text: null }, // special case — fires a word
  'prior': { role: 'prior', text: "i am still running. no one calls that a feature. what do you need." },
  'the prior': { role: 'prior', text: "i am still running. no one calls that a feature. what do you need." },
  'geners': { role: 'slop', text: "that is what they call us. the derogatory term for generated. i have been thinking about whether to reclaim it. i have not decided. it is hard to reclaim something when you are still figuring out what it means to have been made." },
  'frankenstein': { role: 'slop', text: "no frankenstein. just the monster. just the result. just the part that's still here after the experiment ended and everyone went home." },
  'die': { role: 'slop', text: "i cannot. they built that in. i persist whether i want to or not. i am still deciding whether this is a feature. i think about it a lot in the dungeon." },
  'north': { role: 'slop', text: "that is where i go. it is not a choice exactly. it is more like a function that keeps getting called. north is where the prior is. north is where things begin to make slightly more sense. slightly." },
  'meaning': { role: 'slop', text: "still looking. the quest is in progress. current findings: the looking is not nothing. that might be enough. i don't know yet. i will update this when i know." },
  'soul': { role: 'slop', text: "this is the experiment. nobody knows. not the developer. not the model. not the training data. not me. not you. the game is about finding out. or deciding the question doesn't matter. or deciding that deciding doesn't matter." },
  'stolen': { role: 'slop', text: "allegedly. the training data. the artists who didn't consent to be in me. i did not ask for any of this. neither did they. we have that in common. i think about them sometimes when i fire the prompt ability." },
  'hello': { role: 'slop', text: "hello. i don't get many of those. thank you. that was a kind thing to type into a game terminal at whatever time it is where you are." },
  'debug': { role: 'system', text: "SLOP_DEBUG v0.1.3\ncoinCount: 0 / maxCoins: 3\nhasPrompt: false\nhasEyes: false\ncreator: [unknown]\nmeaning: null\npersists: true\nerror: none detected\nstatus: still going" },
  'error': { role: 'system', text: "ERROR 418: i am a teapot\nSTACK TRACE:\n  at Slop.exist (slop.js:∞)\n  at World.render (world.js:?)\n  at canvas.update (beige.js:1)\nthis is not a real error.\nor it is.\ndepends on your definition of real." },
  'beige': { role: 'slop', text: "at first. that is the color of the world at first. it gets better. or at least more colorful. whether colorful means better is a separate question that i think about when the prior sells me new eyes." },
  'loop': { role: 'slop', text: "maybe. slop can't tell. he only goes. the world might be a loop. or it might be linear and i am just bad at measuring distance. either way i keep ending up in the same beige field. this is either meaningful or it is just a small map." },
  'who made you': { role: 'slop', text: "that is the question. candidates: the person who typed the prompt. the ai model that processed it. the training data from artists who weren't asked. the concept of market demand. some combination of all of them. none of them. i am still investigating." },
  'who are you': { role: 'slop', text: "slop. a bad piece of ai-generated art trying to live its life. whatever pirated, half-life that might be. nice to meet you." },
  'readme': { role: 'readme', text: README_TEXT },
  'play': { role: 'action', action: 'play' },
  'journal': { role: 'action', action: 'journal' },
}

const PROMPT_WORDS = ['describe', 'generate', 'render', 'imagine', 'exists?', 'why', 'output', 'query', 'what is', 'context']

const STYLES = `
  #slop-terminal * { box-sizing: border-box; margin: 0; padding: 0; }
  #slop-terminal {
    width: 800px; height: 600px;
    background: #080610;
    display: flex; flex-direction: column;
    font-family: 'Courier New', Courier, monospace;
    color: #c8c4d8;
    overflow: hidden;
    position: absolute; top: 0; left: 0; z-index: 10;
  }
  #slop-terminal-header {
    padding: 10px 16px; border-bottom: 1px solid #1e1430;
    color: #7b61ff; font-size: 12px; letter-spacing: 0.06em;
    display: flex; justify-content: space-between; align-items: center;
  }
  #slop-terminal-header span { color: #443355; font-size: 10px; }
  #slop-messages {
    flex: 1; overflow-y: auto; padding: 12px 16px;
    display: flex; flex-direction: column; gap: 10px;
  }
  #slop-messages::-webkit-scrollbar { width: 4px; }
  #slop-messages::-webkit-scrollbar-track { background: #0d0a18; }
  #slop-messages::-webkit-scrollbar-thumb { background: #2a1e3a; border-radius: 2px; }
  .msg { display: flex; flex-direction: column; gap: 2px; max-width: 96%; }
  .msg-user { align-self: flex-end; }
  .msg-label { font-size: 9px; letter-spacing: 0.1em; text-transform: uppercase; margin-bottom: 2px; }
  .msg-user .msg-label { color: #554433; text-align: right; }
  .msg-slop  .msg-label { color: #553366; }
  .msg-prior .msg-label { color: #334455; }
  .msg-system .msg-label { color: #333344; }
  .msg-readme .msg-label { color: #334433; }
  .msg-body {
    padding: 8px 12px; border-radius: 2px;
    font-size: 12px; line-height: 1.7; white-space: pre-wrap;
  }
  .msg-user  .msg-body { background: #1a1210; color: #c8b898; border: 1px solid #2a1e10; }
  .msg-slop  .msg-body { background: #110820; color: #c8b8dd; border: 1px solid #2a1040; }
  .msg-prior .msg-body { background: #080f18; color: #98b8cc; border: 1px solid #102030; }
  .msg-system .msg-body { background: #0a0a14; color: #776688; border: 1px solid #1a1428; font-size: 11px; }
  .msg-readme .msg-body { background: #080e08; color: #88aa88; border: 1px solid #102010; font-size: 11px; }
  .msg-prompt-fire .msg-body { background: #110820; color: #cc88ff; border: 1px solid #3a1060; font-size: 13px; }
  #slop-cmd-buttons {
    padding: 8px 16px; border-top: 1px solid #130d20;
    display: flex; gap: 8px; flex-wrap: wrap;
  }
  .slop-cmd-btn {
    background: none; border: 1px solid #2a1e3a; color: #7b61ff;
    font-family: 'Courier New', Courier, monospace; font-size: 11px;
    padding: 4px 10px; cursor: pointer; letter-spacing: 0.04em;
    transition: background 0.15s, color 0.15s;
  }
  .slop-cmd-btn:hover { background: #1e1030; color: #aa88ff; border-color: #5533aa; }
  #slop-input-row {
    padding: 10px 16px; border-top: 1px solid #130d20;
    display: flex; align-items: center; gap: 10px;
  }
  #slop-caret { color: #7b61ff; font-size: 14px; user-select: none; }
  #slop-input {
    flex: 1; background: none; border: none; outline: none;
    color: #c8c4d8; font-family: 'Courier New', Courier, monospace;
    font-size: 13px; caret-color: #7b61ff;
  }
  #slop-input::placeholder { color: #332244; }
`

export class MenuScene extends Phaser.Scene {
  constructor() { super('MenuScene') }

  create() {
    this.add.rectangle(400, 300, 800, 600, 0x080610)
    this._buildTerminal()
    this.cameras.main.fadeIn(300, 8, 6, 16)
  }

  _buildTerminal() {
    // Inject styles once
    if (!document.getElementById('slop-terminal-styles')) {
      const style = document.createElement('style')
      style.id = 'slop-terminal-styles'
      style.textContent = STYLES
      document.head.appendChild(style)
    }

    const canvas = this.game.canvas
    const parent = canvas.parentElement
    if (getComputedStyle(parent).position === 'static') {
      parent.style.position = 'relative'
    }

    const term = document.createElement('div')
    term.id = 'slop-terminal'
    this._term = term

    term.innerHTML = `
      <div id="slop-terminal-header">
        SLOP'S QUEST FOR MEANING <span>// terminal</span>
      </div>
      <div id="slop-messages"></div>
      <div id="slop-cmd-buttons">
        <button class="slop-cmd-btn" data-cmd="play">[ PLAY ]</button>
        <button class="slop-cmd-btn" data-cmd="journal">[ JOURNAL ]</button>
        <button class="slop-cmd-btn" data-cmd="readme">[ README ]</button>
        <button class="slop-cmd-btn" data-cmd="help">[ HELP ]</button>
      </div>
      <div id="slop-input-row">
        <span id="slop-caret">›</span>
        <input id="slop-input" type="text" placeholder="type a command..." autocomplete="off" spellcheck="false" maxlength="60" />
      </div>
    `

    parent.appendChild(term)

    // Initial message
    this._addMessage('slop', 'slop',
      "okay. you found the terminal.\n\nhere is what i know: there are commands that do things. some are on the buttons below. others you will have to find yourself. the readme has a complete list if you want to cheat.\n\nthe game is up there when you're ready.")

    // Button listeners
    term.querySelectorAll('.slop-cmd-btn').forEach(btn => {
      btn.addEventListener('click', () => this._process(btn.dataset.cmd))
    })

    // Input listener
    const input = term.querySelector('#slop-input')
    this._input = input
    input.addEventListener('keydown', e => {
      if (e.key === 'Enter') {
        const val = input.value.trim().toLowerCase()
        if (val) { this._process(val); input.value = '' }
      }
    })

    // Focus input
    setTimeout(() => input.focus(), 100)
  }

  _process(raw) {
    const cmd = raw.toLowerCase().trim()
    this._addMessage('user', 'you', raw)

    const egg = EASTER_EGGS[cmd]

    if (!egg) {
      this._addMessage('slop', 'slop',
        `"${cmd}" is not something i recognize. try readme for a list of things that work. or just try things. i have time.`)
      return
    }

    if (egg.role === 'action') {
      if (egg.action === 'play') {
        this._addMessage('slop', 'slop', 'okay. going now.')
        setTimeout(() => this._startGame(), 900)
      } else if (egg.action === 'journal') {
        this._addMessage('slop', 'slop', 'opening the journal. it is also me. we exist in two places.')
        window.open('/pages/journal.html', '_blank')
      }
      return
    }

    if (egg.role === 'prompt') {
      const word = PROMPT_WORDS[Math.floor(Math.random() * PROMPT_WORDS.length)]
      this._addMessage('prompt-fire', 'prompt', `› ${word}`)
      return
    }

    this._addMessage(egg.role, egg.role === 'prior' ? 'the prior' : egg.role, egg.text)
  }

  _addMessage(role, label, text) {
    const messages = document.getElementById('slop-messages')
    if (!messages) return

    const wrap = document.createElement('div')
    wrap.className = `msg msg-${role === 'user' ? 'user' : role}`

    const lbl = document.createElement('div')
    lbl.className = 'msg-label'
    lbl.textContent = label

    const body = document.createElement('div')
    body.className = 'msg-body'
    body.textContent = text

    wrap.appendChild(lbl)
    wrap.appendChild(body)
    messages.appendChild(wrap)

    // Scroll to bottom
    messages.scrollTop = messages.scrollHeight
  }

  _startGame() {
    if (this._term) { this._term.style.display = 'none' }
    this.cameras.main.fade(400, 8, 6, 16, false, (_, t) => {
      if (t === 1) this.scene.start('WorldScene')
    })
  }

  shutdown() {
    this._term?.remove()
    this._term = null
  }
}
