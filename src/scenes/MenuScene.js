import Phaser from 'phaser'
import { SaveState } from '../ui/SaveState.js'
import { AuthManager } from '../auth/AuthManager.js'
import { AuthModal } from '../ui/AuthModal.js'
import { CloudSave } from '../firestore/CloudSave.js'

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
  play           start / continue
  new game       clear save and start fresh
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
  dungeon        slop on the dungeon
  the render     slop on the encounter
  render         a word with three meanings
  coins          slop on coins
  shrine         the place north

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
  'dungeon': { role: 'slop', text: "dark. the floor tiles look like something that knows it is a floor tile and resents it. there are things down there that want to remove me. they have tried. i am still here. i named some of them on the way through." },
  'the render': { role: 'slop', text: "clean. intentional. they looked at me the way you look at something that got in through a gap you meant to seal. they were not wrong to look that way. they also could not stop me from existing. neither of us knows what to do with that." },
  'render': { role: 'slop', text: "that is a word they use for what i am and also a word for what was done to me and also the name of someone i met in a room past the gate. these coincidences are probably not coincidences." },
  'coins': { role: 'slop', text: "i hold three. sometimes more. they are the currency of this world and also a way of keeping score of how much the world has taken from me. i think about that when i pick one up." },
  'shrine': { role: 'slop', text: "north of here. where the prior waits. it sells things because commerce was in the dataset. care was harder to verify. i keep going back anyway." },
  'north shrine': { role: 'slop', text: "north of here. where the prior waits. it sells things because commerce was in the dataset. care was harder to verify. i keep going back anyway." },
  'readme': { role: 'readme', text: README_TEXT },
  'play': { role: 'action', action: 'play' },
  'new game': { role: 'action', action: 'newgame' },
  'journal': { role: 'action', action: 'journal' },
}

const PROMPT_WORDS = ['describe', 'generate', 'render', 'imagine', 'exists?', 'why', 'output', 'query', 'what is', 'context']


export class MenuScene extends Phaser.Scene {
  constructor() { super('MenuScene') }

  create() {
    this._currentUser = AuthManager.getCurrentUser()
    this._noAdsConfirming = false
    this._authUnsubscribe = AuthManager.onAuthStateChange(user => {
      this._currentUser = user
    })
    this._authModal = new AuthModal(user => this._onSignIn(user))

    this.add.rectangle(400, 300, 800, 600, 0x080610)
    this._buildTerminal()
    this.cameras.main.fadeIn(300, 8, 6, 16)
  }

  _buildTerminal() {
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

    // Initial message — acknowledges a save and auth state
    const hasSave = SaveState.exists()
    const user = this._currentUser
    let greeting = hasSave
      ? "okay. you came back.\n\ni remember you. the save is intact. type play to continue where we left off.\n\nif you want to start over, type new game. i won't hold it against you. much."
      : "okay. you found the terminal.\n\nhere is what i know: there are commands that do things. some are on the buttons below. others you will have to find yourself. the readme has a complete list if you want to cheat.\n\nthe game is up there when you're ready."

    if (user) {
      greeting += `\n\nyou are logged in as ${user.email || user.displayName || 'unknown'}. your save syncs to the cloud. type logout to sign out.`
    } else {
      greeting += "\n\nyou are not logged in. type login to sign in. your save will sync across devices. it is optional. the game works either way."
    }
    this._addMessage('slop', 'slop', greeting)

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

    // Context-aware no-ads confirmation flow
    if (this._noAdsConfirming) {
      if (cmd === 'watch') {
        this._noAdsConfirming = false
        this._addMessage('slop', 'slop', 'okay. watching now. do not close this.')
        this._showRewardedAd()
        return
      }
      if (cmd === 'cancel') {
        this._noAdsConfirming = false
        this._addMessage('slop', 'slop', 'okay. cancelled. the bar is still there.')
        return
      }
      this._addMessage('slop', 'slop', 'type watch to confirm or cancel to skip.')
      return
    }

    // Auth commands
    if (cmd === 'login' || cmd === 'sign in') {
      if (this._currentUser) {
        this._addMessage('slop', 'slop', `you are already logged in as ${this._currentUser.email || this._currentUser.displayName}.`)
        return
      }
      this._authModal.show()
      return
    }

    if (cmd === 'logout' || cmd === 'sign out' || cmd === 'log out') {
      if (!this._currentUser) {
        this._addMessage('slop', 'slop', 'you are not logged in.')
        return
      }
      AuthManager.signOut().then(() => {
        SaveState.registerCloudSync(null)
        this._addMessage('slop', 'slop', 'logged out. saves will go to local storage only.')
      }).catch(() => {
        this._addMessage('slop', 'slop', 'something went wrong logging out. try again.')
      })
      return
    }

    if (cmd === 'account' || cmd === 'whoami') {
      const user = this._currentUser
      this._addMessage('system', 'system', user
        ? `logged in as: ${user.email || user.displayName}\nuid: ${user.uid}\ncloud save: active`
        : `not logged in\ncloud save: inactive\nlocal save: ${SaveState.exists() ? 'exists' : 'none'}`)
      return
    }

    if (cmd === 'no ads') {
      if (!this._currentUser) {
        this._addMessage('slop', 'slop', 'you need to be logged in for this. your account is how i remember that you watched it. type login first.')
        return
      }
      this._noAdsConfirming = true
      this._addMessage('slop', 'slop',
        "here is the deal.\n\nyou will watch one ad. it is long. it is not skippable. after it finishes, the ad bar at the bottom is gone. for your account. forever. i will not ask again.\n\ntype watch to confirm. type cancel to skip.")
      return
    }

    // Standard easter egg commands
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
      } else if (egg.action === 'newgame') {
        this._addMessage('slop', 'slop', 'clearing the save. starting over. this counts as a choice.')
        SaveState.clear()
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

  async _onSignIn(user) {
    this._addMessage('slop', 'slop', `logged in as ${user.email || user.displayName}.`)
    await this._syncCloudSave(user)
  }

  async _syncCloudSave(user) {
    const [cloudSave, profile] = await Promise.all([
      CloudSave.load(user.uid),
      CloudSave.loadProfile(user.uid),
    ])

    if (cloudSave) {
      SaveState.save(cloudSave)
      this._addMessage('system', 'system', 'cloud save restored.')
    }

    SaveState.registerCloudSync(state => CloudSave.save(user.uid, state))

    if (profile?.adsDisabled) {
      this._hideAds()
    } else {
      this._addMessage('slop', 'slop',
        "the ad bar is down there. you can make it go away: type no ads and i will show you one long ad, exactly once. after that, it is gone. for your account. forever. i will not ask again.")
    }
  }

  _hideAds() {
    const ad = document.getElementById('ad-below')
    if (ad) ad.style.display = 'none'
  }

  _showRewardedAd() {
    // AdSense rewarded ads require a rewarded ad unit (format="rewarded") configured in the
    // AdSense dashboard. Replace the data-ad-slot in index.html with your rewarded ad unit ID.
    try {
      const adEl = document.getElementById('ad-rewarded')
      if (!adEl) { this._onAdFailed(); return }

      adEl.style.display = 'block';
      (window.adsbygoogle = window.adsbygoogle || []).push({
        params: { google_rewarded_ad_key: adEl.dataset.adSlot },
        callback: result => {
          adEl.style.display = 'none'
          if (result?.type === 'reward') {
            this._onAdEarned()
          } else {
            this._onAdFailed()
          }
        }
      })
    } catch {
      this._onAdFailed()
    }
  }

  _onAdEarned() {
    const user = this._currentUser
    if (user) CloudSave.saveProfile(user.uid, { adsDisabled: true })
    this._hideAds()
    this._addMessage('slop', 'slop', 'done. no more ads.')
  }

  _onAdFailed() {
    this._addMessage('slop', 'slop', "it didn't count. the bar is still there. try again if you want.")
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
    this._authModal?.hide()
    this._authUnsubscribe?.()
  }
}
