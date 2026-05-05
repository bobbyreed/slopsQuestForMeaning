// Ch2FramePickerScene — interactive sprite frame picker.
// Click and drag on the sheet to define frame rectangles, then save to Firestore.
//
// ← →    cycle sheets
// Z      undo last frame
// X      clear all frames on current sheet
// S      open save dialog (writes config to Firestore)
// ESC    close dialog / return to hub

import Phaser from 'phaser'
import { W, H } from '../config/constants.js'
import { AnimConfig } from '../firestore/AnimConfig.js'
import { AuthManager } from '../auth/AuthManager.js'

const ASSET_PATH = 'media/generated/'

const SHEETS = [
  { key: 'ch2-slop-movement-sheet-chatgpt', label: 'slop · movement (chatgpt)', w: 1536, h: 1024 },
  { key: 'ch2-slop-movement-sheet',         label: 'slop · movement (gemini)',  w: 1376, h: 768  },
  { key: 'ch2-overview-sheet-v1',           label: 'overview v1',               w: 1376, h: 768  },
  { key: 'ch2-overview-sheet-v2',           label: 'overview v2',               w: 1376, h: 768  },
  { key: 'ch2-enemy-bestiary-sheet',        label: 'enemy bestiary',            w: 1376, h: 768  },
  { key: 'ch2-env-tileset-sheet',           label: 'environmental tilesets',    w: 1376, h: 768  },
]

const TOP = 44   // top bar height
const BOT = 28   // bottom bar height

export class Ch2FramePickerScene extends Phaser.Scene {
  constructor() { super('Ch2FramePickerScene') }

  // ── Lifecycle ──────────────────────────────────────────────────────────────

  preload() {
    const barX = W / 2 - 150
    const barY = H / 2 + 28
    this.add.rectangle(barX, barY, 300, 5, 0x1a1a1a).setOrigin(0, 0.5)
    const bar  = this.add.rectangle(barX, barY, 0, 5, 0x554433).setOrigin(0, 0.5)
    const lTxt = this.add.text(W / 2, H / 2, 'loading sheets…', {
      fontSize: '12px', color: '#554433', fontFamily: 'Courier New',
    }).setOrigin(0.5)

    this.load.on('progress', v => { bar.width = v * 300; lTxt.setText(`loading… ${Math.round(v * 100)}%`) })
    this.load.on('complete', () => { bar.destroy(); lTxt.destroy() })

    SHEETS.forEach(s => {
      if (!this.textures.exists(s.key)) {
        this.load.image(s.key, `${ASSET_PATH}${s.key}.png`)
      }
    })
  }

  create() {
    this._sheetIdx  = 0
    this._dragging  = false
    this._dragStart = null
    this._outputEl  = null
    this._numLabels = []

    // Per-sheet frame storage
    this._frames = {}
    SHEETS.forEach(s => { this._frames[s.key] = [] })

    // Background
    this.add.rectangle(W / 2, H / 2, W, H, 0x0a0a14).setDepth(0)

    // Sheet image (positioned and scaled in _updateSheet)
    this._imgObj = this.add.image(0, 0, SHEETS[0].key).setOrigin(0, 0).setDepth(2)

    // Graphics layers
    this._frameGfx = this.add.graphics().setDepth(5)
    this._dragGfx  = this.add.graphics().setDepth(6)

    this._buildTopBar()
    this._buildBottomBar()
    this._updateSheet()
    this._setupInput()
    this._setupKeys()

    this.events.on('shutdown', () => this._closeDialog())

    this.cameras.main.fadeIn(350, 10, 10, 20)
  }

  // ── Top bar ────────────────────────────────────────────────────────────────

  _buildTopBar() {
    this.add.rectangle(W / 2, TOP / 2, W, TOP, 0x000000, 0.75).setDepth(10)

    // Nav: sudo far-left, hub far-right
    this._makeBtn(40, TOP / 2, '◀ sudo', () => this._goSudo()).setDepth(11)
    this._makeBtn(W - 40, TOP / 2, 'hub ▶', () => this._goHub()).setDepth(11)

    // Sheet cycle: inset from nav buttons
    this._makeBtn(110, TOP / 2, '◀', () => this._switchSheet(-1)).setDepth(11)
    this._makeBtn(W - 110, TOP / 2, '▶', () => this._switchSheet(1)).setDepth(11)

    this._sheetLabel = this.add.text(W / 2, TOP / 2, '', {
      fontSize: '13px', color: '#ccbbaa', fontFamily: 'Courier New',
    }).setOrigin(0.5).setDepth(11)
  }

  // ── Bottom bar ─────────────────────────────────────────────────────────────

  _buildBottomBar() {
    const y = H - BOT / 2
    this.add.rectangle(W / 2, H - BOT / 2, W, BOT, 0x000000, 0.75).setDepth(10)

    this.add.text(10, y, 'Z undo  ·  X clear  ·  S save  ·  ← → sheets  ·  ESC hub', {
      fontSize: '10px', color: '#665544', fontFamily: 'Courier New',
    }).setOrigin(0, 0.5).setDepth(11)

    this._frameCount = this.add.text(W - 10, y, '0 frames', {
      fontSize: '10px', color: '#998877', fontFamily: 'Courier New',
    }).setOrigin(1, 0.5).setDepth(11)
  }

  // ── Navigation ─────────────────────────────────────────────────────────────

  _goSudo() {
    if (this._outputEl) this._closeDialog()
    this.cameras.main.fade(300, 10, 10, 20, false, (_, t) => {
      if (t === 1) this.scene.start('MenuScene', { openDev: true })
    })
  }

  _goHub() {
    if (this._outputEl) this._closeDialog()
    this.cameras.main.fade(300, 10, 10, 20, false, (_, t) => {
      if (t === 1) this.scene.start('Ch2HubScene')
    })
  }

  // ── Sheet management ───────────────────────────────────────────────────────

  _updateSheet() {
    const s        = SHEETS[this._sheetIdx]
    const usableH  = H - TOP - BOT
    const scale    = Math.min(W / s.w, usableH / s.h)
    const imgW     = s.w * scale
    const imgH     = s.h * scale
    const imgX     = (W - imgW) / 2
    const imgY     = TOP + (usableH - imgH) / 2

    this._imgObj.setTexture(s.key).setPosition(imgX, imgY).setScale(scale)
    this._imgScale = scale
    this._imgX     = imgX
    this._imgY     = imgY

    this._sheetLabel.setText(`${this._sheetIdx + 1} / ${SHEETS.length}  ·  ${s.label}`)
    this._updateFrameCount()
    this._redrawFrames()
  }

  _switchSheet(dir) {
    if (this._outputEl) { this._outputEl.remove(); this._outputEl = null }
    this._sheetIdx = (this._sheetIdx + SHEETS.length + dir) % SHEETS.length
    this._updateSheet()
  }

  // ── Coordinate conversion ──────────────────────────────────────────────────

  _toSheet(sx, sy) {
    return {
      x: Math.round((sx - this._imgX) / this._imgScale),
      y: Math.round((sy - this._imgY) / this._imgScale),
    }
  }

  // ── Input ──────────────────────────────────────────────────────────────────

  _setupInput() {
    this.input.on('pointerdown', (p) => {
      if (p.y < TOP || p.y > H - BOT) return
      this._dragging  = true
      this._dragStart = { x: p.x, y: p.y }
    })

    this.input.on('pointermove', (p) => {
      if (!this._dragging) return
      const { x: x1, y: y1 } = this._dragStart
      const rx = Math.min(x1, p.x), ry = Math.min(y1, p.y)
      const rw = Math.abs(p.x - x1), rh = Math.abs(p.y - y1)
      this._dragGfx.clear()
        .lineStyle(1, 0xffee00, 1).strokeRect(rx, ry, rw, rh)
        .fillStyle(0xffee00, 0.07).fillRect(rx, ry, rw, rh)
    })

    this.input.on('pointerup', (p) => {
      if (!this._dragging) return
      this._dragging = false
      this._dragGfx.clear()

      const { x: x1, y: y1 } = this._dragStart
      if (Math.abs(p.x - x1) < 5 || Math.abs(p.y - y1) < 5) return

      const a = this._toSheet(Math.min(x1, p.x), Math.min(y1, p.y))
      const b = this._toSheet(Math.max(x1, p.x), Math.max(y1, p.y))

      this._frames[SHEETS[this._sheetIdx].key].push({ x: a.x, y: a.y, w: b.x - a.x, h: b.y - a.y })
      this._updateFrameCount()
      this._redrawFrames()
    })
  }

  _setupKeys() {
    this._kL   = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.LEFT)
    this._kR   = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.RIGHT)
    this._kZ   = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.Z)
    this._kX   = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.X)
    this._kS   = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S)
    this._kEsc = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC)
  }

  // ── Frame drawing ──────────────────────────────────────────────────────────

  _redrawFrames() {
    this._frameGfx.clear()
    this._numLabels.forEach(t => t.destroy())
    this._numLabels = []

    const frames = this._frames[SHEETS[this._sheetIdx].key]
    const sc     = this._imgScale

    frames.forEach((f, i) => {
      const sx = this._imgX + f.x * sc
      const sy = this._imgY + f.y * sc
      const sw = f.w * sc
      const sh = f.h * sc

      this._frameGfx
        .lineStyle(1.5, 0x00ff88, 0.9).strokeRect(sx, sy, sw, sh)
        .fillStyle(0x00ff88, 0.07).fillRect(sx, sy, sw, sh)

      this._numLabels.push(
        this.add.text(sx + 3, sy + 2, `${i}`, {
          fontSize: '8px', color: '#00ff88', fontFamily: 'Courier New',
        }).setDepth(7)
      )
    })
  }

  _updateFrameCount() {
    const n = this._frames[SHEETS[this._sheetIdx].key].length
    this._frameCount.setText(`${n} frame${n !== 1 ? 's' : ''}`)
  }

  // ── Frame actions ──────────────────────────────────────────────────────────

  _undo() {
    const frames = this._frames[SHEETS[this._sheetIdx].key]
    if (frames.length > 0) { frames.pop(); this._updateFrameCount(); this._redrawFrames() }
  }

  _clearAll() {
    this._frames[SHEETS[this._sheetIdx].key] = []
    this._updateFrameCount()
    this._redrawFrames()
  }

  // ── Save dialog ────────────────────────────────────────────────────────────

  _closeDialog() {
    if (this._outputEl) { this._outputEl.remove(); this._outputEl = null }
    if (this._dialogEscFn) { document.removeEventListener('keydown', this._dialogEscFn); this._dialogEscFn = null }
  }

  _showSaveDialog() {
    if (this._outputEl) { this._closeDialog(); return }

    const s      = SHEETS[this._sheetIdx]
    const frames = this._frames[s.key]

    const wrap = document.createElement('div')
    wrap.style.cssText = [
      'position:absolute', 'top:50%', 'left:50%', 'transform:translate(-50%,-50%)',
      'background:#0d0b18', 'border:1px solid #554455', 'padding:16px',
      'font-family:Courier New,monospace', 'font-size:11px', 'color:#ccbbaa',
      'z-index:999', 'min-width:380px', 'max-width:500px',
    ].join(';')

    const header = document.createElement('div')
    header.textContent = `save animation config  ·  ${s.key}`
    header.style.cssText = 'margin-bottom:12px; color:#887766'

    const fieldStyle = 'display:block; width:100%; margin-bottom:8px; background:#14121e; color:#ccbbaa; border:1px solid #332244; font-family:inherit; font-size:inherit; padding:6px; box-sizing:border-box; outline:none'

    const labelInput = document.createElement('input')
    labelInput.type = 'text'
    labelInput.placeholder = 'animation label (e.g. slop · walk cycle)'
    labelInput.style.cssText = fieldStyle

    const fpsInput = document.createElement('input')
    fpsInput.type = 'number'
    fpsInput.value = '8'
    fpsInput.min = '1'
    fpsInput.max = '60'
    fpsInput.placeholder = 'frame rate (fps)'
    fpsInput.style.cssText = fieldStyle

    const info = document.createElement('div')
    info.textContent = `${frames.length} frame${frames.length !== 1 ? 's' : ''} · ${s.w}×${s.h}`
    info.style.cssText = 'color:#554433; margin-bottom:10px; font-size:10px'

    const status = document.createElement('div')
    status.style.cssText = 'margin-top:8px; font-size:10px; min-height:16px'

    const btnRow = document.createElement('div')
    btnRow.style.cssText = 'display:flex; justify-content:space-between; margin-top:10px'

    const saveBtn = document.createElement('div')
    saveBtn.textContent = '[ save to firestore ]'
    saveBtn.style.cssText = 'color:#00ff88; cursor:pointer; font-size:10px'

    const closeBtn = document.createElement('div')
    closeBtn.textContent = '[ close  ·  ESC ]'
    closeBtn.style.cssText = 'color:#554433; cursor:pointer; font-size:10px'
    closeBtn.onclick = () => this._closeDialog()

    saveBtn.onclick = async () => {
      const user = AuthManager.getCurrentUser()
      if (!user) {
        status.textContent = 'sign in required'
        status.style.color = '#ff4444'
        return
      }
      if (frames.length === 0) {
        status.textContent = 'no frames defined'
        status.style.color = '#ff4444'
        return
      }
      const label     = labelInput.value.trim() || s.label
      const frameRate = parseInt(fpsInput.value, 10) || 8
      saveBtn.textContent = 'saving…'
      saveBtn.style.color = '#887766'
      try {
        const id = await AnimConfig.save({
          sheetKey: s.key, sheetW: s.w, sheetH: s.h,
          label, frameRate, frames: [...frames],
        })
        status.textContent = `saved  ·  id: ${id}`
        status.style.color = '#00ff88'
        saveBtn.textContent = '[ saved ]'
      } catch (e) {
        status.textContent = `error: ${e.message}`
        status.style.color = '#ff4444'
        saveBtn.textContent = '[ save to firestore ]'
        saveBtn.style.color = '#00ff88'
      }
    }

    btnRow.append(saveBtn, closeBtn)
    wrap.append(header, labelInput, fpsInput, info, btnRow, status)
    document.getElementById('game-container').appendChild(wrap)

    this._dialogEscFn = (e) => { if (e.key === 'Escape') this._closeDialog() }
    document.addEventListener('keydown', this._dialogEscFn)

    labelInput.focus()
    this._outputEl = wrap
  }

  // ── Update ─────────────────────────────────────────────────────────────────

  update() {
    if (this._outputEl) return   // dialog open — keyboard handled by native DOM listener
    const J = Phaser.Input.Keyboard.JustDown
    if (J(this._kL))   this._switchSheet(-1)
    if (J(this._kR))   this._switchSheet(1)
    if (J(this._kZ))   this._undo()
    if (J(this._kX))   this._clearAll()
    if (J(this._kS))   this._showSaveDialog()
    if (J(this._kEsc)) {
      this.cameras.main.fade(300, 10, 10, 20, false, (_, t) => {
        if (t === 1) this.scene.start('Ch2HubScene')
      })
    }
  }

  // ── Helper ─────────────────────────────────────────────────────────────────

  _makeBtn(x, y, txt, cb) {
    const btn = this.add.text(x, y, txt, {
      fontSize: '11px', color: '#ccbbaa', fontFamily: 'Courier New',
      backgroundColor: '#1a1828', padding: { x: 8, y: 4 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true })
    btn.on('pointerover', () => btn.setStyle({ color: '#ffffff', backgroundColor: '#2a2040' }))
    btn.on('pointerout',  () => btn.setStyle({ color: '#ccbbaa', backgroundColor: '#1a1828' }))
    btn.on('pointerdown', cb)
    return btn
  }
}
