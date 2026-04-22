// PauseScene — full-screen overlay launched on top of any gameplay scene.
//
// Tabs: INVENTORY | MAP | TERMINAL | JOURNAL
// ← → arrows switch tabs.  ESC or ENTER (when no text is being typed) resumes.
//
// Terminal supports: help, new game

import Phaser from 'phaser'
import { W, H } from '../config/constants.js'
import { SaveState } from '../ui/SaveState.js'
import { VisitedScenes } from '../ui/VisitedScenes.js'

const BG      = 0x0c0c14
const BORDER  = 0x334466
const ACCENT  = 0x88aaff
const DIM     = 0x445566
const TEXT_HI = '#aaccff'
const TEXT_LO = '#445577'
const TEXT_WH = '#ddeeff'
const TEXT_RD = '#ff6655'

const TABS = ['INVENTORY', 'MAP', 'TERMINAL', 'JOURNAL']

// ── world map node definitions ───────────────────────────────────────────────
// col/row are visual grid positions. (0,0) = WorldScene centre.
const WORLD_NODES = [
  { key: 'WorldScene',      label: 'WORLD',     col:  0, row:  0, color: 0x88aa66 },
  { key: 'WestScene',       label: 'WEST',      col: -1, row:  0, color: 0x6688aa },
  { key: 'NorthShrineScene',label: 'SHRINE',    col:  0, row: -1, color: 0xaa88cc },
  { key: 'DungeonScene',    label: 'DUNGEON',   col:  0, row:  1, color: 0x885544 },
  { key: 'EastScene',       label: 'CHASM',     col:  1, row:  0, color: 0x665533 },
  { key: 'EastB0Scene',     label: 'B0',        col:  2, row:  0, color: 0x3d2a14 },
  { key: 'EastB1Scene',     label: 'B1',        col:  3, row:  0, color: 0x3d2a14 },
  { key: 'EastB2Scene',     label: 'THE CAST',  col:  4, row:  0, color: 0x4d3a24 },
  { key: 'EastB3Scene',     label: 'B3',        col:  5, row:  0, color: 0x3d2a14 },
  { key: 'EastA0Scene',     label: 'A0',        col:  2, row: -1, color: 0x2a1a08 },
  { key: 'EastA1Scene',     label: 'A1',        col:  3, row: -1, color: 0x2a1a08 },
  { key: 'EastA2Scene',     label: 'A2',        col:  4, row: -1, color: 0x2a1a08 },
  { key: 'EastA3Scene',     label: 'A3',        col:  5, row: -1, color: 0x2a1a08 },
  { key: 'EastC0Scene',     label: 'C0',        col:  2, row:  1, color: 0x2a1a08 },
  { key: 'EastC1Scene',     label: 'C1',        col:  3, row:  1, color: 0x2a1a08 },
  { key: 'EastC2Scene',     label: 'C2',        col:  4, row:  1, color: 0x2a1a08 },
  { key: 'EastC3Scene',     label: 'DUNGEON 2', col:  5, row:  1, color: 0x553322 },
]

const CELL = 44   // map cell size in pixels
const MAP_ORIGIN_X = W / 2 - (3.5 * CELL)  // center the -1..5 col range
const MAP_ORIGIN_Y = H / 2 - (1.5 * CELL)  // center the -1..1 row range

function colToX(col) { return MAP_ORIGIN_X + (col + 1) * CELL }
function rowToY(row) { return MAP_ORIGIN_Y + (row + 1) * CELL }

export class PauseScene extends Phaser.Scene {
  constructor() { super('PauseScene') }

  init(data) {
    this._fromScene = data?.fromScene ?? null
    this._slopState = data?.slopState ?? {}
    this._currentScene = data?.currentScene ?? null
  }

  create() {
    // ── overlay backdrop ──────────────────────────────────────────────────────
    this.add.rectangle(W / 2, H / 2, W, H, BG, 0.92).setDepth(0)

    // ── tab bar ──────────────────────────────────────────────────────────────
    this._tabIndex = 0
    this._tabLabels = []
    TABS.forEach((label, i) => {
      const x = 80 + i * 170
      const t = this.add.text(x, 28, label, {
        fontSize: '12px', fontFamily: 'Courier New', color: TEXT_LO,
      }).setOrigin(0.5, 0.5).setDepth(10)
      this._tabLabels.push(t)
    })

    // ── border line under tabs ────────────────────────────────────────────────
    this.add.rectangle(W / 2, 44, W, 2, BORDER).setDepth(10)

    // ── ESC label ────────────────────────────────────────────────────────────
    this.add.text(W - 12, 12, '[ESC] resume', {
      fontSize: '9px', fontFamily: 'Courier New', color: TEXT_LO,
    }).setOrigin(1, 0).setDepth(10)

    // ── content area ─────────────────────────────────────────────────────────
    this._contentGroup = []

    // ── terminal state ────────────────────────────────────────────────────────
    this._termBuffer     = ''
    this._termLines      = ['// slop terminal v0.1', '// type "help" for commands', '']
    this._termAwaitingConfirm = false
    this._termObjects    = []

    // ── journal DOM ──────────────────────────────────────────────────────────
    this._journalDom = null

    // ── keyboard ─────────────────────────────────────────────────────────────
    this._cursors = this.input.keyboard.createCursorKeys()
    this._escKey  = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESCAPE)
    this._enterKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER)

    this._termKeyHandler = (evt) => this._onTermKey(evt)
    this._termKeysActive = false

    this._renderTab()

    this.input.keyboard.on('keydown-LEFT',  () => this._switchTab(-1))
    this.input.keyboard.on('keydown-RIGHT', () => this._switchTab(1))
    this.input.keyboard.on('keydown-ESC',   () => this._resume())
  }

  _switchTab(dir) {
    if (this._termKeysActive) return  // don't switch tabs while typing in terminal
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
      if (i === this._tabIndex) {
        t.setFontStyle('bold')
      } else {
        t.setFontStyle('normal')
      }
    })

    switch (TABS[this._tabIndex]) {
      case 'INVENTORY': this._renderInventory(); break
      case 'MAP':       this._renderMap();       break
      case 'TERMINAL':  this._renderTerminal();  break
      case 'JOURNAL':   this._renderJournal();   break
    }
  }

  _clearContent() {
    this._contentGroup.forEach(obj => { if (obj?.destroy) obj.destroy() })
    this._contentGroup = []
    this._termObjects.forEach(obj => { if (obj?.destroy) obj.destroy() })
    this._termObjects = []
  }

  // ── INVENTORY ─────────────────────────────────────────────────────────────

  _renderInventory() {
    const st = this._slopState
    const col1 = 80, col2 = 420
    let y = 80

    const header = (txt, x, yy) => {
      const t = this.add.text(x, yy, txt, {
        fontSize: '10px', fontFamily: 'Courier New', color: '#556677',
      }).setDepth(10)
      this._contentGroup.push(t)
    }

    const row = (label, value, x, yy, highlight = false) => {
      const t = this.add.text(x, yy, `${label}`, {
        fontSize: '11px', fontFamily: 'Courier New', color: TEXT_LO,
      }).setDepth(10)
      const v = this.add.text(x + 160, yy, `${value}`, {
        fontSize: '11px', fontFamily: 'Courier New',
        color: highlight ? TEXT_HI : TEXT_WH,
      }).setDepth(10)
      this._contentGroup.push(t, v)
    }

    header('// RESOURCES', col1, y)
    y += 22
    row('coins',       st.coinCount  ?? 0, col1, y)
    y += 18
    row('max coins',   st.maxCoins   ?? 0, col1, y)
    y += 18
    row('prompts',     st.promptCount ?? 0, col1, y)
    y += 18
    row('max prompts', st.maxPrompts  ?? 0, col1, y)

    y = 80
    header('// ABILITIES', col2, y)
    y += 22
    row('dash',  st.hasDash  ? 'unlocked' : 'locked', col2, y, !!st.hasDash)
    y += 18
    row('eyes',  st.hasEyes  ? 'unlocked' : 'locked', col2, y, !!st.hasEyes)

    const visitedCount = VisitedScenes.all().length
    y += 40
    header('// PROGRESS', col2, y)
    y += 22
    row('scenes visited', visitedCount, col2, y)
    y += 18
    row('dungeon cleared', st.dungeonCleared ? 'yes' : 'no', col2, y, !!st.dungeonCleared)
  }

  // ── MAP ───────────────────────────────────────────────────────────────────

  _renderMap() {
    const visited = new Set(VisitedScenes.all())

    WORLD_NODES.forEach(node => {
      const cx = colToX(node.col)
      const cy = rowToY(node.row)
      const isCurrent = node.key === this._currentScene
      const isVisited = visited.has(node.key)

      // cell background
      const bg = this.add.rectangle(cx, cy, CELL - 4, CELL - 4,
        isCurrent ? 0x334466 : isVisited ? 0x1a2233 : 0x0a0a0f
      ).setDepth(10)

      // colored dot
      const dot = this.add.circle ? null : null  // skip if unavailable
      const dotColor = isCurrent ? ACCENT : isVisited ? node.color : 0x1a1a2e
      const r = this.add.rectangle(cx, cy - 4, 10, 10, dotColor).setDepth(11)

      // label
      const labelColor = isCurrent ? TEXT_HI : isVisited ? '#667788' : '#222233'
      const lbl = this.add.text(cx, cy + 8, node.label, {
        fontSize: '6px', fontFamily: 'Courier New', color: labelColor,
      }).setOrigin(0.5, 0).setDepth(12)

      // current marker
      if (isCurrent) {
        const marker = this.add.text(cx, cy - 16, '▼', {
          fontSize: '8px', fontFamily: 'Courier New', color: TEXT_HI,
        }).setOrigin(0.5, 0).setDepth(12)
        this._contentGroup.push(marker)
      }

      this._contentGroup.push(bg, r, lbl)
    })

    // legend
    const legendY = H - 40
    const leg = (x, color, label) => {
      const dot = this.add.rectangle(x, legendY, 8, 8, color).setDepth(10)
      const txt = this.add.text(x + 10, legendY, label, {
        fontSize: '8px', fontFamily: 'Courier New', color: '#445566',
      }).setOrigin(0, 0.5).setDepth(10)
      this._contentGroup.push(dot, txt)
    }
    leg(80,  ACCENT,    '▼ current')
    leg(200, 0x3d2a14,  'visited')
    leg(290, 0x0a0a0f,  'undiscovered')
  }

  // ── TERMINAL ──────────────────────────────────────────────────────────────

  _renderTerminal() {
    this._drawTermLines()

    // activate key capture
    this.input.keyboard.on('keydown', this._termKeyHandler)
    this._termKeysActive = true
  }

  _drawTermLines() {
    this._termObjects.forEach(obj => { if (obj?.destroy) obj.destroy() })
    this._termObjects = []

    const maxVisible = 18
    const lines = this._termLines.slice(-maxVisible)

    lines.forEach((line, i) => {
      const t = this.add.text(60, 68 + i * 20, line, {
        fontSize: '11px', fontFamily: 'Courier New', color: TEXT_WH,
      }).setDepth(10)
      this._termObjects.push(t)
    })

    // input line
    const prompt = this._termAwaitingConfirm ? '  confirm (y/n): ' : '> '
    const cursor = this.add.text(60, 68 + lines.length * 20, prompt + this._termBuffer + '_', {
      fontSize: '11px', fontFamily: 'Courier New', color: ACCENT,
    }).setDepth(10)
    this._termObjects.push(cursor)
  }

  _onTermKey(evt) {
    if (TABS[this._tabIndex] !== 'TERMINAL') return

    const key = evt.key
    if (key === 'Escape') { this._resume(); return }
    if (key === 'Enter') { this._execTerminal(); return }
    if (key === 'Backspace') { this._termBuffer = this._termBuffer.slice(0, -1) }
    else if (key.length === 1) { this._termBuffer += key }

    this._drawTermLines()
  }

  _execTerminal() {
    const cmd = this._termBuffer.trim().toLowerCase()
    this._termBuffer = ''

    if (this._termAwaitingConfirm) {
      this._termAwaitingConfirm = false
      if (cmd === 'y') {
        this._termLines.push('  wiping save data...')
        this._drawTermLines()
        this.time.delayedCall(800, () => {
          SaveState.clear()
          VisitedScenes.clear()
          window.location.reload()
        })
        return
      } else {
        this._termLines.push('  aborted.')
        this._drawTermLines()
        return
      }
    }

    this._termLines.push('> ' + cmd)

    if (cmd === 'help') {
      this._termLines.push('  new game  — wipe save and restart')
      this._termLines.push('  help      — show this message')
    } else if (cmd === 'new game') {
      this._termLines.push('  WARNING: this will delete all progress.')
      this._termLines.push('  are you sure?')
      this._termAwaitingConfirm = true
    } else if (cmd === '') {
      // ignore blank
    } else {
      this._termLines.push(`  unknown command: ${cmd}`)
    }

    this._drawTermLines()
  }

  // ── JOURNAL ───────────────────────────────────────────────────────────────

  _renderJournal() {
    if (!this.add.dom) {
      const t = this.add.text(W / 2, H / 2, 'journal requires DOM mode', {
        fontSize: '12px', fontFamily: 'Courier New', color: TEXT_LO,
      }).setOrigin(0.5).setDepth(10)
      this._contentGroup.push(t)
      return
    }

    const iframe = document.createElement('iframe')
    iframe.src = '/pages/journal.html'
    iframe.style.width  = '720px'
    iframe.style.height = '500px'
    iframe.style.border = '1px solid #334466'
    iframe.style.background = '#0c0c14'
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
    if (this._fromScene) {
      this.scene.resume(this._fromScene)
    }
    this.scene.stop()
  }

  update() {
    if (!this._termKeysActive && Phaser.Input.Keyboard.JustDown(this._enterKey)) {
      this._resume()
    }
  }
}
