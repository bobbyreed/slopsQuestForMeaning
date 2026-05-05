// Ch2SpriteAnimScene — animated sprite viewer with Firestore config loading.
// Loads all known sheets, color-keys them, plays any saved animation config.
//
// ← →   cycle animations
// ↑ ↓   adjust fps
// D      toggle debug overlay (raw sheet + frame bounds)
// L      toggle animation list picker
// ESC    return to hub

import Phaser from 'phaser'
import { W, H } from '../config/constants.js'
import { AnimConfig } from '../firestore/AnimConfig.js'

const ASSET_PATH = 'media/generated/'

const SHEET_META = {
  'ch2-slop-movement-sheet-chatgpt': { w: 1536, h: 1024 },
  'ch2-slop-movement-sheet':         { w: 1376, h: 768  },
  'ch2-overview-sheet-v1':           { w: 1376, h: 768  },
  'ch2-overview-sheet-v2':           { w: 1376, h: 768  },
  'ch2-enemy-bestiary-sheet':        { w: 1376, h: 768  },
  'ch2-env-tileset-sheet':           { w: 1376, h: 768  },
}

// Color-key: remove pixels where max(r,g,b) < BRIGHT and saturation < SAT.
// Preserves grey-blue limbs while stripping the near-black background.
const CK_BRIGHT = 50
const CK_SAT    = 0.20

function row(n, x0, y, w, h, stride) {
  return Array.from({ length: n }, (_, i) => ({ x: x0 + i * stride, y, w, h }))
}

// Built-in entries — approximate coords, use D overlay to tune
const BUILTIN = [
  {
    key:       'builtin-walk-rough',
    label:     'walk  ·  rough (built-in)',
    frameRate: 8,
    sheetKey:  'ch2-slop-movement-sheet-chatgpt',
    frames:    row(12, 5, 28, 55, 110, 68),
  },
  {
    key:       'builtin-walk-hifi',
    label:     'walk  ·  hi-fi (built-in)',
    frameRate: 8,
    sheetKey:  'ch2-slop-movement-sheet-chatgpt',
    frames:    row(12, 822, 28, 52, 110, 60),
  },
]

const TOP = 40

export class Ch2SpriteAnimScene extends Phaser.Scene {
  constructor() { super('Ch2SpriteAnimScene') }

  // ── Lifecycle ──────────────────────────────────────────────────────────────

  preload() {
    const toLoad = Object.keys(SHEET_META).filter(k => !this.textures.exists(k))
    if (!toLoad.length) return

    const barX = W / 2 - 150
    const barY = H / 2 + 28
    this.add.rectangle(barX, barY, 300, 5, 0x1a1a1a).setOrigin(0, 0.5)
    const bar  = this.add.rectangle(barX, barY, 0, 5, 0x554433).setOrigin(0, 0.5)
    const lTxt = this.add.text(W / 2, H / 2, 'loading sheets…', {
      fontSize: '12px', color: '#554433', fontFamily: 'Courier New',
    }).setOrigin(0.5)

    this.load.on('progress', v => {
      bar.width = v * 300
      lTxt.setText(`loading… ${Math.round(v * 100)}%`)
    })
    this.load.on('complete', () => { bar.destroy(); lTxt.destroy() })

    toLoad.forEach(k => this.load.image(k, `${ASSET_PATH}${k}.png`))
  }

  create() {
    // Deep-copy built-ins so per-session fps changes don't mutate the constant
    this._pool      = BUILTIN.map(b => ({ ...b, frames: [...b.frames] }))
    this._animIdx   = 0
    this._showDebug = false
    this._pickerEl  = null

    this.add.rectangle(W / 2, H / 2, W, H, 0x0a0a0a).setDepth(0)

    // Process all loaded sheets up-front
    Object.keys(SHEET_META).forEach(sk => {
      if (this.textures.exists(sk)) this._buildProcessedTexture(sk)
    })

    // Register built-in animations
    this._pool.forEach(b => this._registerEntry(b))

    // Sprite — starts on first built-in
    const firstProc = 'proc-' + BUILTIN[0].sheetKey
    this._sprite = this.add.sprite(W / 2, H / 2 + 20, firstProc, `${BUILTIN[0].key}-0`)
      .setScale(3).setDepth(10)

    // Debug overlay (initially hidden)
    this._dbgImg = this.add.image(0, 0, BUILTIN[0].sheetKey)
      .setOrigin(0, 0).setAlpha(0).setDepth(5)
    this._dbgGfx = this.add.graphics().setDepth(6).setAlpha(0)
    this._dbgSc  = H / SHEET_META[BUILTIN[0].sheetKey].h

    this._buildTopBar()

    this.add.text(W / 2, H - 14, '← → cycle  ·  ↑ ↓ fps  ·  D debug  ·  L list  ·  ESC hub', {
      fontSize: '10px', color: '#665544', fontFamily: 'Courier New',
    }).setOrigin(0.5, 1).setDepth(20)

    this._setupKeys()
    this._playAnim(0)
    this.cameras.main.fadeIn(400, 10, 10, 10)

    // Load Firestore configs non-blocking — pool grows when they arrive
    this._loadFirestoreConfigs()
  }

  // ── Top bar ────────────────────────────────────────────────────────────────

  _buildTopBar() {
    this.add.rectangle(W / 2, TOP / 2, W, TOP, 0x000000, 0.75).setDepth(20)
    this._makeBtn(40, TOP / 2, '◀ sudo', () => this._goSudo()).setDepth(21)
    this._makeBtn(W - 40, TOP / 2, 'hub ▶', () => this._goHub()).setDepth(21)

    this._animLabel = this.add.text(W / 2, TOP / 2, '', {
      fontSize: '13px', color: '#ccbbaa', fontFamily: 'Courier New',
    }).setOrigin(0.5).setDepth(21)

    this._fpsLabel = this.add.text(W / 2 + 170, TOP / 2, '', {
      fontSize: '11px', color: '#887766', fontFamily: 'Courier New',
    }).setOrigin(0, 0.5).setDepth(21)
  }

  // ── Texture processing ─────────────────────────────────────────────────────

  _buildProcessedTexture(sheetKey) {
    const procKey = 'proc-' + sheetKey
    if (this.textures.exists(procKey)) return

    try {
      const meta   = SHEET_META[sheetKey]
      const img    = this.textures.get(sheetKey).source[0].image
      const canvas = document.createElement('canvas')
      canvas.width  = img.naturalWidth  || meta.w
      canvas.height = img.naturalHeight || meta.h

      const ctx  = canvas.getContext('2d', { willReadFrequently: true })
      ctx.drawImage(img, 0, 0)
      const id   = ctx.getImageData(0, 0, canvas.width, canvas.height)
      const data = id.data

      for (let i = 0; i < data.length; i += 4) {
        const r = data[i], g = data[i + 1], b = data[i + 2]
        const max = Math.max(r, g, b)
        const sat = max === 0 ? 0 : (max - Math.min(r, g, b)) / max
        if (max < CK_BRIGHT && sat < CK_SAT) data[i + 3] = 0
      }

      ctx.putImageData(id, 0, 0)
      this.textures.addCanvas(procKey, canvas)
    } catch (e) {
      console.warn(`[AnimScene] color-key failed for ${sheetKey}:`, e.message)
    }
  }

  // ── Animation registration ─────────────────────────────────────────────────

  _registerEntry(entry) {
    const procKey = 'proc-' + entry.sheetKey
    if (!this.textures.exists(procKey)) return

    const tex = this.textures.get(procKey)
    entry.frames.forEach((f, i) => {
      const name = `${entry.key}-${i}`
      if (!tex.has(name)) tex.add(name, 0, f.x, f.y, f.w, f.h)
    })

    if (!this.anims.exists(entry.key)) {
      this.anims.create({
        key:       entry.key,
        frames:    entry.frames.map((_, i) => ({ key: procKey, frame: `${entry.key}-${i}` })),
        frameRate: entry.frameRate,
        repeat:    -1,
      })
    }
  }

  // ── Firestore ──────────────────────────────────────────────────────────────

  async _loadFirestoreConfigs() {
    try {
      const configs = await AnimConfig.loadAll()
      if (!configs.length) return

      configs.forEach(cfg => {
        if (!cfg.frames?.length)        return
        if (!SHEET_META[cfg.sheetKey])  return  // unknown sheet key

        if (this.textures.exists(cfg.sheetKey)) {
          this._buildProcessedTexture(cfg.sheetKey)
        }

        const entry = {
          key:       `fs-${cfg.id}`,
          label:     cfg.label || cfg.sheetKey,
          frameRate: cfg.frameRate || 8,
          sheetKey:  cfg.sheetKey,
          frames:    cfg.frames.map(f => ({ ...f })),
          source:    'firestore',
        }
        this._registerEntry(entry)
        this._pool.push(entry)
      })

      // Rebuild picker in-place if open so new entries appear
      if (this._pickerEl) {
        this._closePicker()
        this._showPicker()
      }
    } catch (e) {
      console.warn('[AnimScene] Firestore configs failed to load:', e.message)
    }
  }

  // ── Playback ───────────────────────────────────────────────────────────────

  _playAnim(idx) {
    if (idx < 0)                  idx = this._pool.length - 1
    if (idx >= this._pool.length) idx = 0
    this._animIdx = idx
    const entry = this._pool[idx]

    // Update debug overlay for this sheet's dimensions
    const meta = SHEET_META[entry.sheetKey] || { h: 768 }
    this._dbgSc = H / meta.h
    this._dbgImg.setTexture(entry.sheetKey).setScale(this._dbgSc)

    this._sprite.play(entry.key)
    this._animLabel.setText(entry.label)
    this._fpsLabel.setText(`${entry.frameRate} fps`)

    if (this._showDebug) this._renderDebug()
    this._refreshPickerHighlight()
  }

  _adjustFps(delta) {
    const entry = this._pool[this._animIdx]
    entry.frameRate = Math.max(1, Math.min(60, entry.frameRate + delta))
    this._fpsLabel.setText(`${entry.frameRate} fps`)
    this._sprite.anims.msPerFrame = 1000 / entry.frameRate
  }

  // ── Debug overlay ──────────────────────────────────────────────────────────

  _toggleDebug() {
    this._showDebug = !this._showDebug
    const on = this._showDebug
    this._dbgImg.setAlpha(on ? 0.9 : 0)
    this._dbgGfx.setAlpha(on ? 1   : 0)
    this._sprite.setAlpha(on ? 0   : 1)
    if (on) this._renderDebug()
  }

  _renderDebug() {
    const g       = this._dbgGfx
    const sc      = this._dbgSc
    const current = this._pool[this._animIdx]
    g.clear()

    // Current animation — bright green
    g.lineStyle(1, 0x00ff88, 1.0)
    current.frames.forEach(f => g.strokeRect(f.x * sc, f.y * sc, f.w * sc, f.h * sc))

    // Other animations on the same sheet — dim yellow
    g.lineStyle(1, 0xdddd00, 0.35)
    this._pool.forEach((entry, i) => {
      if (i === this._animIdx || entry.sheetKey !== current.sheetKey) return
      entry.frames.forEach(f => g.strokeRect(f.x * sc, f.y * sc, f.w * sc, f.h * sc))
    })
  }

  // ── Animation list picker (DOM) ────────────────────────────────────────────

  _showPicker() {
    const wrap = document.createElement('div')
    wrap.style.cssText = [
      'position:absolute', `top:${TOP + 4}px`, 'left:0', 'width:220px',
      `max-height:${H - TOP - 24}px`, 'overflow-y:auto',
      'background:#0b0914ee', 'font-family:Courier New,monospace',
      'font-size:11px', 'z-index:50', 'padding:10px',
      'box-sizing:border-box', 'border-right:1px solid #221133',
    ].join(';')

    const hdr = document.createElement('div')
    hdr.textContent = 'animations  ·  L to close'
    hdr.style.cssText = 'color:#554433; font-size:10px; margin-bottom:8px; padding-bottom:6px; border-bottom:1px solid #221133'
    wrap.appendChild(hdr)

    const builtin = this._pool.filter(e => !e.source)
    const saved   = this._pool.filter(e => e.source === 'firestore')

    if (builtin.length) wrap.appendChild(this._makePickerSection('built-in', builtin))
    if (saved.length)   wrap.appendChild(this._makePickerSection('saved', saved))

    if (!builtin.length && !saved.length) {
      const empty = document.createElement('div')
      empty.textContent = 'no animations loaded'
      empty.style.color = '#332244'
      wrap.appendChild(empty)
    }

    document.getElementById('game-container').appendChild(wrap)
    this._pickerEl = wrap
    this._refreshPickerHighlight()
  }

  _makePickerSection(title, entries) {
    const section = document.createElement('div')
    section.style.marginBottom = '10px'

    const lbl = document.createElement('div')
    lbl.textContent = title
    lbl.style.cssText = 'color:#443322; font-size:9px; text-transform:uppercase; letter-spacing:1px; margin-bottom:4px'
    section.appendChild(lbl)

    entries.forEach(entry => {
      const item = document.createElement('div')
      item.dataset.key = entry.key
      item.textContent = entry.label
      item.style.cssText = 'padding:5px 6px; cursor:pointer; color:#998877; line-height:1.4; border-radius:2px'
      item.onmouseenter = () => {
        if (entry.key !== this._pool[this._animIdx]?.key) item.style.background = '#1a1428'
      }
      item.onmouseleave = () => {
        if (entry.key !== this._pool[this._animIdx]?.key) item.style.background = ''
      }
      item.onclick = () => {
        const idx = this._pool.findIndex(e => e.key === entry.key)
        if (idx !== -1) this._playAnim(idx)
      }
      section.appendChild(item)
    })

    return section
  }

  _refreshPickerHighlight() {
    if (!this._pickerEl) return
    const currentKey = this._pool[this._animIdx]?.key
    this._pickerEl.querySelectorAll('[data-key]').forEach(el => {
      const active = el.dataset.key === currentKey
      el.style.color      = active ? '#00ff88' : '#998877'
      el.style.background = active ? '#0f1a14' : ''
    })
  }

  _closePicker() {
    if (this._pickerEl) { this._pickerEl.remove(); this._pickerEl = null }
  }

  _togglePicker() {
    if (this._pickerEl) this._closePicker()
    else this._showPicker()
  }

  // ── Keys ───────────────────────────────────────────────────────────────────

  _setupKeys() {
    this._kL   = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.LEFT)
    this._kR   = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.RIGHT)
    this._kU   = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.UP)
    this._kDn  = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.DOWN)
    this._kD   = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D)
    this._kLst = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.L)
    this._kEsc = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC)
  }

  update() {
    const J = Phaser.Input.Keyboard.JustDown
    if (J(this._kL))   this._playAnim(this._animIdx - 1)
    if (J(this._kR))   this._playAnim(this._animIdx + 1)
    if (J(this._kU))   this._adjustFps(+1)
    if (J(this._kDn))  this._adjustFps(-1)
    if (J(this._kD))   this._toggleDebug()
    if (J(this._kLst)) this._togglePicker()
    if (J(this._kEsc)) this._goHub()
  }

  // ── Navigation ─────────────────────────────────────────────────────────────

  _goSudo() {
    this._closePicker()
    this.cameras.main.fade(300, 10, 10, 10, false, (_, t) => {
      if (t === 1) this.scene.start('MenuScene', { openDev: true })
    })
  }

  _goHub() {
    this._closePicker()
    this.cameras.main.fade(300, 10, 10, 10, false, (_, t) => {
      if (t === 1) this.scene.start('Ch2HubScene')
    })
  }

  shutdown() { this._closePicker() }

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
