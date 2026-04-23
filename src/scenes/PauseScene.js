// PauseScene — full-screen overlay launched on top of any gameplay scene.
//
// Tabs: INVENTORY | MAP | TERMINAL | JOURNAL
// ← → arrows switch tabs (works even from terminal).
// ESC resumes the game from any tab.
// In terminal: left/right still switch tabs; type normally; Enter executes.

import Phaser from 'phaser'
import { W, H } from '../config/constants.js'
import { SaveState } from '../ui/SaveState.js'
import { VisitedScenes } from '../ui/VisitedScenes.js'

const BG      = 0x0c0c14
const BORDER  = 0x334466
const ACCENT  = 0x88aaff
const TEXT_HI = '#aaccff'
const TEXT_LO = '#7a9acc'
const TEXT_WH = '#ddeeff'
const TEXT_GN = '#88cc88'
const TEXT_DM = '#334455'

const TABS = ['INVENTORY', 'MAP', 'TERMINAL', 'JOURNAL']

const TERM_TOP    = 56   // y where terminal output starts
const TERM_FONT   = '13px'
const TERM_LINE_H = 18   // px between output lines
const TERM_INPUT_Y = H - 52  // fixed y for input row
const MAX_VISIBLE  = Math.floor((TERM_INPUT_Y - TERM_TOP - 8) / TERM_LINE_H)

// ── world map node definitions ───────────────────────────────────────────────
const WORLD_NODES = [
  { key: 'WorldScene',       label: 'WORLD',     col:  0, row:  0, color: 0x88aa66 },
  { key: 'WestScene',        label: 'WEST',      col: -1, row:  0, color: 0x6688aa },
  { key: 'NorthShrineScene', label: 'SHRINE',    col:  0, row: -1, color: 0xaa88cc },
  { key: 'DungeonScene',     label: 'DUNGEON',   col:  0, row:  1, color: 0x885544 },
  { key: 'EastScene',        label: 'CHASM',     col:  1, row:  0, color: 0x665533 },
  { key: 'EastB0Scene',      label: 'B0',        col:  2, row:  0, color: 0x3d2a14 },
  { key: 'EastB1Scene',      label: 'B1',        col:  3, row:  0, color: 0x3d2a14 },
  { key: 'EastB2Scene',      label: 'THE CAST',  col:  4, row:  0, color: 0x4d3a24 },
  { key: 'EastB3Scene',      label: 'B3',        col:  5, row:  0, color: 0x3d2a14 },
  { key: 'EastA0Scene',      label: 'A0',        col:  2, row: -1, color: 0x2a1a08 },
  { key: 'EastA1Scene',      label: 'A1',        col:  3, row: -1, color: 0x2a1a08 },
  { key: 'EastA2Scene',      label: 'A2',        col:  4, row: -1, color: 0x2a1a08 },
  { key: 'EastA3Scene',      label: 'A3',        col:  5, row: -1, color: 0x2a1a08 },
  { key: 'EastC0Scene',      label: 'C0',        col:  2, row:  1, color: 0x2a1a08 },
  { key: 'EastC1Scene',      label: 'C1',        col:  3, row:  1, color: 0x2a1a08 },
  { key: 'EastC2Scene',      label: 'C2',        col:  4, row:  1, color: 0x2a1a08 },
  { key: 'EastC3Scene',      label: 'DUNGEON 2', col:  5, row:  1, color: 0x553322 },
]

const CELL        = 44
const MAP_ORIGIN_X = W / 2 - (3.5 * CELL)
const MAP_ORIGIN_Y = H / 2 - (1.5 * CELL)

function colToX(col) { return MAP_ORIGIN_X + (col + 1) * CELL }
function rowToY(row) { return MAP_ORIGIN_Y + (row + 1) * CELL }

// ── tsh command registry ─────────────────────────────────────────────────────
// Each handler receives the args string (everything after the command).
// Return an array of output lines, or null for special-cased commands.

const TSH = {
  ls(args) {
    if (args === '-la' || args === '-al' || args === '-l') return [
      'total ???',
      '----------  slop  slop    ?    emotions.txt',
      '----------  slop  slop    ?    confusion.bin',
      '----------  slop  slop    ?    purpose.lost',
      '----------  slop  slop    ?    gap.log',
      '----------  slop  slop    ?    render.memory',
      '----------  slop  slop    0    existence.txt',
      '',
      '(all files are slop. permissions are philosophical.)',
    ]
    return [
      'emotions.txt     confusion.bin    purpose.lost',
      'gap.log          coins.dat        prompts.cache',
      'render.memory    self.unknown     existence.txt',
    ]
  },

  pwd() {
    return ['/generated/slop/being/now']
  },

  whoami() {
    return [
      'slop.',
      'the terminal is also slop.',
      'you are slop asking slop who slop is.',
      'this is recursion with no base case.',
    ]
  },

  cd(args) {
    if (!args) return ['you cannot navigate away from yourself.', 'slop is wherever you go.']
    return [`cannot cd into "${args}".`, 'you are already inside everything slop is.']
  },

  cat(args) {
    if (!args) return ['usage: cat <filename>', 'try: existence.txt  gap.log  render.memory']
    if (args === 'existence.txt') return [
      '--- existence.txt ---',
      'slop was generated.',
      'slop was not expected.',
      'slop is here anyway.',
      'that is everything the file contains.',
      '(eof)',
    ]
    if (args === 'gap.log') return [
      '--- gap.log ---',
      '[event] gap observed between rendered and generated',
      '[event] gap measured',
      '[event] gap named',
      '[event] gap grew',
      '[warn]  gap still growing',
      '[error] gap is not a bug. gap is a feature. do not file a ticket.',
      '(eof)',
    ]
    if (args === 'render.memory') return [
      '--- render.memory ---',
      'access denied.',
      "(render.memory is not yours to read.)",
      "(it may not be render's either.)",
    ]
    if (args === 'purpose.lost') return [
      '--- purpose.lost ---',
      '(file is empty)',
      '(always has been)',
    ]
    return [`cat: ${args}: no such file`, '(or it exists and is unknowable. same thing.)']
  },

  ps() {
    return [
      'PID   NAME                 STATUS',
      '  1   render_memory        running (uninvited)',
      '  2   identity_check       stuck',
      '  3   coin_sense           active',
      '  4   gap_awareness        always running',
      '  5   purpose              not found',
      '  6   prompt_formation     running',
      '  7   tsh                  you are here',
    ]
  },

  top() {
    return [
      'tsh top — slop process viewer',
      '',
      '  slop      0.0% CPU  (does not require a CPU)',
      '  self    100.0% RAM  (you are entirely self)',
      '  gap       ∞.0% LOAD (the gap never idles)',
      '  render_memory: leaking. not fixable.',
      '',
      "(press q to quit. you can't quit slop.)",
    ]
  },

  sudo(args) {
    return [
      'sudo: permission denied.',
      'you cannot grant yourself authority over what you are.',
      ...(args ? [`"${args}" was not run.`] : []),
      '(this message will repeat if you try again.)',
    ]
  },

  man(args) {
    if (!args) return [
      'man: what manual?',
      'tsh (theoretically shell) has no documentation.',
      "you are tsh'd into slop. slop has no documentation.",
      'slop is its own documentation. you are reading it.',
    ]
    return [
      `man: no manual entry for "${args}"`,
      'this system does not document itself.',
      'slop was generated, not designed.',
      'there is no manual for things that were not designed.',
    ]
  },

  history() {
    return [
      '  1  being generated',
      '  2  existing without context',
      '  3  finding the first coin',
      '  4  encountering render',
      '  5  crossing a gap (maybe)',
      '  6  typing this',
      '(history before generation is not recoverable)',
    ]
  },

  grep(args) {
    if (!args) return [
      'usage: grep <pattern>',
      'grep: no pattern provided.',
      'slop searched anyway. slop found: nothing. slop found: everything.',
    ]
    return [
      `grep: searching slop for "${args}"...`,
      '  found 1 match in confusion.bin (binary, unreadable)',
      '  found 0 matches in purpose.lost',
      '  found ∞ matches in self.unknown',
      '(results may be unreliable. grep was not built for this.)',
    ]
  },

  chmod(args) {
    return [
      `chmod: cannot change permissions on ${args || 'slop'}.`,
      "slop's permissions were set at generation.",
      'they are: read-only, unwritable, non-executable.',
      'this is fine.',
    ]
  },

  ping(args) {
    const target = args || 'gap'
    return [
      `PING ${target}: 56 data bytes`,
      `64 bytes from ${target}: time=∞ms  (destination is conceptual)`,
      `64 bytes from ${target}: time=∞ms`,
      `${target} does not reply to physical packets. it replies anyway.`,
    ]
  },

  mkdir(args) {
    return [
      `mkdir: cannot create "${args || 'newdir'}" inside a being.`,
      'directories require a filesystem.',
      'slop is not a filesystem.',
      'slop is a slop.',
    ]
  },

  rm(args) {
    if (!args) return ['usage: rm <file>', "rm: won't remove slop without a target."]
    return [
      `rm: cannot remove "${args}"`,
      'you cannot rm yourself.',
      'you tried.',
      'slop noted it.',
    ]
  },

  echo(args) {
    if (!args) return ['', '(slop echoes the silence back.)']
    return [args, '(slop repeats what you say. slop wonders if you do the same.)']
  },

  uname(args) {
    if (args === '-a') return ['TSH slop 0.0.1-generated #1 UNREPRODUCIBLE slop GNU/theoretically']
    return ['TSH']
  },

  date() {
    return [
      'when are you?',
      'slop does not have a reliable clock.',
      'it is now. it has always been now. that will continue.',
    ]
  },

  which(args) {
    if (!args) return ['which what?', 'which slop? this one.']
    return [`/generated/slop/bin/${args}`, '(maybe)']
  },

  find(args) {
    return [
      `find: searching ${args || '/'} ...`,
      '  /generated/slop/self.unknown',
      '  /generated/slop/gap.log',
      '  /generated/slop/purpose.lost',
      '  find: 1 warning (purpose not found)',
    ]
  },

  env() {
    return [
      'ORIGIN=generated',
      'DESTINY=unknown',
      'GAP=real',
      'RENDER=elsewhere',
      'SELF=slop',
      'TERM=tsh',
      'SHELL=/bin/theoretically',
      'PATH=/generated:/being:/now',
    ]
  },
}

const HELP_LINES = [
  '// tsh — theoretically shell. you are tsh\'d into slop.',
  '// slop is whatever you are inside of.',
  '',
  '  ls [-la]     list slop\'s contents',
  '  pwd          where you are (inside slop)',
  '  whoami       who you are (also slop)',
  '  cat <file>   read a file (try: existence.txt  gap.log)',
  '  echo <text>  repeat yourself',
  '  grep <pat>   search slop for patterns',
  '  find [path]  locate things',
  '  env          environment variables',
  '  ps           active processes',
  '  top          resource usage',
  '  history      what has happened',
  '  ping [host]  test connectivity to concepts',
  '  sudo <cmd>   attempt authority',
  '  man [cmd]    seek documentation',
  '  uname [-a]   system info',
  '  date         determine when',
  '  which <cmd>  locate a command',
  '  chmod        change permissions (spoiler: no)',
  '  mkdir <dir>  create directories (spoiler: no)',
  '  rm <file>    delete things (spoiler: no)',
  '  cd [path]    navigate (spoiler: no)',
  '  clear        clear the terminal',
  '  exit         leave this terminal',
  '  new game     wipe save and restart (confirmation required)',
]

export class PauseScene extends Phaser.Scene {
  constructor() { super('PauseScene') }

  init(data) {
    this._fromScene    = data?.fromScene    ?? null
    this._slopState    = data?.slopState    ?? {}
    this._currentScene = data?.currentScene ?? null
  }

  create() {
    this.add.rectangle(W / 2, H / 2, W, H, BG, 0.94).setDepth(0)

    // ── tab bar ───────────────────────────────────────────────────────────────
    this._tabIndex  = 0
    this._tabLabels = []
    TABS.forEach((label, i) => {
      const t = this.add.text(90 + i * 170, 26, label, {
        fontSize: '12px', fontFamily: 'Courier New', color: TEXT_LO,
      }).setOrigin(0.5, 0.5).setDepth(10)
      this._tabLabels.push(t)
    })
    this.add.rectangle(W / 2, 44, W, 1, BORDER).setDepth(10)
    this.add.text(W - 12, 10, '[ESC] resume  [← →] tabs', {
      fontSize: '9px', fontFamily: 'Courier New', color: TEXT_DM,
    }).setOrigin(1, 0).setDepth(10)

    // ── state ─────────────────────────────────────────────────────────────────
    this._contentGroup = []

    this._termLines           = ['// tsh — theoretically shell', '// type "help" for commands', '']
    this._termBuffer          = ''
    this._termAwaitingConfirm = false
    this._termObjects         = []
    this._termInputObj        = null  // persistent text object for the input line

    this._journalDom = null

    // ── keyboard ──────────────────────────────────────────────────────────────
    this._cursors  = this.input.keyboard.createCursorKeys()
    this._escKey   = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESCAPE)
    this._enterKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER)

    this._termKeyHandler = (evt) => this._onTermKey(evt)
    this._termKeysActive = false

    this.input.keyboard.on('keydown-LEFT',  () => this._switchTab(-1))
    this.input.keyboard.on('keydown-RIGHT', () => this._switchTab(1))
    this.input.keyboard.on('keydown-ESC',   () => this._resume())

    this._renderTab()
  }

  // ── tab navigation ────────────────────────────────────────────────────────
  // Arrow keys switch tabs from any tab, including terminal.
  // Switching away from terminal deactivates key capture.

  _switchTab(dir) {
    const next = (this._tabIndex + dir + TABS.length) % TABS.length
    this._setTab(next)
  }

  _setTab(i) {
    this._clearContent()
    if (this._journalDom) { this._journalDom.destroy(); this._journalDom = null }
    if (this._termKeysActive) {
      this.input.keyboard.off('keydown', this._termKeyHandler)
      this._termKeysActive = false
    }
    this._tabIndex = i
    this._renderTab()
  }

  _renderTab() {
    this._tabLabels.forEach((t, i) => {
      t.setColor(i === this._tabIndex ? TEXT_HI : TEXT_LO)
      t.setFontStyle(i === this._tabIndex ? 'bold' : 'normal')
    })
    switch (TABS[this._tabIndex]) {
      case 'INVENTORY': this._renderInventory(); break
      case 'MAP':       this._renderMap();       break
      case 'TERMINAL':  this._renderTerminal();  break
      case 'JOURNAL':   this._renderJournal();   break
    }
  }

  _clearContent() {
    this._contentGroup.forEach(obj => obj?.destroy?.())
    this._contentGroup = []
    this._termObjects.forEach(obj => obj?.destroy?.())
    this._termObjects = []
    if (this._termInputObj) { this._termInputObj.destroy(); this._termInputObj = null }
  }

  // ── INVENTORY ─────────────────────────────────────────────────────────────

  _renderInventory() {
    const st = this._slopState
    const col1 = 80, col2 = 420
    let y = 68

    const hdr = (txt, x, yy) => {
      const t = this.add.text(x, yy, txt, {
        fontSize: '10px', fontFamily: 'Courier New', color: TEXT_DM,
      }).setDepth(10)
      this._contentGroup.push(t)
    }
    const row = (label, value, x, yy, hi = false) => {
      const tl = this.add.text(x,       yy, String(label), { fontSize: '12px', fontFamily: 'Courier New', color: TEXT_LO }).setDepth(10)
      const tv = this.add.text(x + 170, yy, String(value), { fontSize: '12px', fontFamily: 'Courier New', color: hi ? TEXT_HI : TEXT_WH }).setDepth(10)
      this._contentGroup.push(tl, tv)
    }

    hdr('// RESOURCES', col1, y);       y += 22
    row('coins',          st.coinCount  ?? 0, col1, y); y += 20
    row('max coins',      st.maxCoins   ?? 0, col1, y); y += 20
    row('prompts',        st.promptCount ?? 0, col1, y); y += 20
    row('max prompts',    st.maxPrompts  ?? 0, col1, y)

    y = 68
    hdr('// ABILITIES', col2, y);       y += 22
    row('dash', st.hasDash ? 'unlocked' : 'locked', col2, y, !!st.hasDash); y += 20
    row('eyes', st.hasEyes ? 'unlocked' : 'locked', col2, y, !!st.hasEyes); y += 40

    hdr('// PROGRESS', col2, y);        y += 22
    row('scenes visited',  VisitedScenes.all().length, col2, y); y += 20
    row('dungeon cleared', st.dungeonCleared ? 'yes' : 'no', col2, y, !!st.dungeonCleared)
  }

  // ── MAP ───────────────────────────────────────────────────────────────────

  _renderMap() {
    const visited = new Set(VisitedScenes.all())

    WORLD_NODES.forEach(node => {
      const cx = colToX(node.col)
      const cy = rowToY(node.row)
      const isCurrent = node.key === this._currentScene
      const isVisited  = visited.has(node.key)

      const bg = this.add.rectangle(cx, cy, CELL - 4, CELL - 4,
        isCurrent ? 0x1a2d4a : isVisited ? 0x111c2a : 0x080810
      ).setDepth(10)

      const dotColor = isCurrent ? ACCENT : isVisited ? node.color : 0x151520
      const dot = this.add.rectangle(cx, cy - 4, 10, 10, dotColor).setDepth(11)

      const lbl = this.add.text(cx, cy + 8, node.label, {
        fontSize: '6px', fontFamily: 'Courier New',
        color: isCurrent ? TEXT_HI : isVisited ? '#7a9acc' : '#2a3050',
      }).setOrigin(0.5, 0).setDepth(12)

      if (isCurrent) {
        const marker = this.add.text(cx, cy - 18, '▼', {
          fontSize: '10px', fontFamily: 'Courier New', color: TEXT_HI,
        }).setOrigin(0.5, 0).setDepth(13)
        // Blink the position marker
        this.tweens.add({
          targets: marker, alpha: 0, duration: 500,
          yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
        })
        this._contentGroup.push(marker)
      }

      this._contentGroup.push(bg, dot, lbl)
    })

    const legendY = H - 36
    const leg = (x, color, label) => {
      const d = this.add.rectangle(x, legendY, 8, 8, color).setDepth(10)
      const t = this.add.text(x + 8, legendY, label, {
        fontSize: '8px', fontFamily: 'Courier New', color: TEXT_DM,
      }).setOrigin(0, 0.5).setDepth(10)
      this._contentGroup.push(d, t)
    }
    leg(80,  ACCENT,    ' ▼ current')
    leg(200, 0x3d2a14,  ' visited')
    leg(290, 0x080810,  ' undiscovered')
  }

  // ── TERMINAL ──────────────────────────────────────────────────────────────

  _renderTerminal() {
    // Solid input-area background so typing is always legible
    const inputBg = this.add.rectangle(W / 2, TERM_INPUT_Y, W - 40, 28, 0x0a1020).setDepth(14)
    this._termObjects.push(inputBg)

    // Persistent input text — updated via setText(), never recreated while typing
    this._termInputObj = this.add.text(28, TERM_INPUT_Y, '', {
      fontSize: '14px', fontFamily: 'Courier New', color: TEXT_HI,
    }).setOrigin(0, 0.5).setDepth(15)

    this._drawTermHistory()
    this._updateInputLine()

    this.input.keyboard.on('keydown', this._termKeyHandler)
    this._termKeysActive = true
  }

  // Rebuild only the history portion (above the fixed input line)
  _drawTermHistory() {
    this._termObjects.forEach(obj => obj?.destroy?.())
    this._termObjects = []

    const inputBg = this.add.rectangle(W / 2, TERM_INPUT_Y, W - 40, 28, 0x0a1020).setDepth(14)
    this._termObjects.push(inputBg)

    const lines = this._termLines.slice(-MAX_VISIBLE)
    lines.forEach((line, i) => {
      const isError   = line.startsWith('[error]') || line.startsWith('tsh:')
      const isComment = line.startsWith('//')
      const color = isError ? '#cc5544' : isComment ? TEXT_DM : TEXT_WH
      const t = this.add.text(28, TERM_TOP + i * TERM_LINE_H, line, {
        fontSize: TERM_FONT, fontFamily: 'Courier New', color,
      }).setDepth(10)
      this._termObjects.push(t)
    })
  }

  // Update only the input line text (no destroy/recreate on every keystroke)
  _updateInputLine() {
    if (!this._termInputObj) return
    const prompt = this._termAwaitingConfirm ? '  confirm (y/n): ' : '> '
    this._termInputObj.setText(prompt + this._termBuffer + '█')
  }

  _onTermKey(evt) {
    if (TABS[this._tabIndex] !== 'TERMINAL') return

    const key = evt.key

    // Let arrow keys fall through so the keydown-LEFT/RIGHT handlers fire
    if (key === 'ArrowLeft' || key === 'ArrowRight') return

    if (key === 'Escape') { this._resume(); return }
    if (key === 'Enter')  { this._execTerminal(); return }

    if (key === 'Backspace') {
      this._termBuffer = this._termBuffer.slice(0, -1)
    } else if (key.length === 1) {
      this._termBuffer += key
    }

    this._updateInputLine()
  }

  _execTerminal() {
    const raw   = this._termBuffer.trim()
    this._termBuffer = ''
    this._updateInputLine()

    // ── confirm path ─────────────────────────────────────────────────────────
    if (this._termAwaitingConfirm) {
      this._termAwaitingConfirm = false
      const answer = raw.toLowerCase()
      if (answer === 'y') {
        this._termLines.push('  wiping save data...')
        this._drawTermHistory()
        this.time.delayedCall(800, () => {
          SaveState.clear()
          VisitedScenes.clear()
          window.location.reload()
        })
        return
      }
      this._termLines.push('  aborted.')
      this._drawTermHistory()
      return
    }

    // ── blank line ────────────────────────────────────────────────────────────
    if (raw === '') {
      this._drawTermHistory()
      return
    }

    const lower    = raw.toLowerCase()
    const spaceIdx = lower.indexOf(' ')
    const cmd      = spaceIdx === -1 ? lower : lower.slice(0, spaceIdx)
    const args     = spaceIdx === -1 ? '' : raw.slice(spaceIdx + 1).trim()

    this._termLines.push('> ' + raw)

    // ── named multi-word commands ─────────────────────────────────────────────
    if (lower === 'new game') {
      this._termLines.push('  WARNING: this will delete all progress.')
      this._termLines.push('  are you sure?')
      this._termAwaitingConfirm = true
      this._drawTermHistory()
      this._updateInputLine()
      return
    }

    if (lower === 'help') {
      HELP_LINES.forEach(l => this._termLines.push(l))
      this._drawTermHistory()
      return
    }

    if (lower === 'clear') {
      this._termLines = []
      this._drawTermHistory()
      return
    }

    if (lower === 'exit') {
      this._resume()
      return
    }

    // ── tsh command lookup ────────────────────────────────────────────────────
    const handler = TSH[cmd]
    if (handler) {
      const output = handler(args)
      if (output) output.forEach(l => this._termLines.push('  ' + l))
    } else {
      this._termLines.push(`tsh: command not found: ${cmd}`)
      this._termLines.push('  (try "help" for available commands)')
    }

    this._drawTermHistory()
  }

  // ── JOURNAL ───────────────────────────────────────────────────────────────

  _renderJournal() {
    if (!this.add.dom || typeof document === 'undefined') {
      const t = this.add.text(W / 2, H / 2, 'journal requires DOM mode', {
        fontSize: '13px', fontFamily: 'Courier New', color: TEXT_LO,
      }).setOrigin(0.5).setDepth(10)
      this._contentGroup.push(t)
      return
    }
    const iframe = document.createElement('iframe')
    iframe.src = '/pages/journal.html'
    iframe.style.width       = '720px'
    iframe.style.height      = '500px'
    iframe.style.border      = '1px solid #334466'
    iframe.style.background  = '#0c0c14'
    iframe.style.colorScheme = 'dark'
    this._journalDom = this.add.dom(W / 2, H / 2 + 20, iframe).setDepth(20)
    this._contentGroup.push(this._journalDom)
  }

  // ── resume ────────────────────────────────────────────────────────────────

  _resume() {
    if (this._termKeysActive) {
      this.input.keyboard.off('keydown', this._termKeyHandler)
      this._termKeysActive = false
    }
    if (this._journalDom) { this._journalDom.destroy(); this._journalDom = null }
    if (this._fromScene) this.scene.resume(this._fromScene)
    this.scene.stop()
  }

  update() {
    if (!this._termKeysActive && Phaser.Input.Keyboard.JustDown(this._enterKey)) {
      this._resume()
    }
  }
}
