// AdminScene — admin-only animation config manager.
// Loads all saved AnimConfig entries from Firestore; supports edit and delete.
// Access gated via admins/{uid} Firestore collection.
//
// ESC    return to hub

import Phaser from 'phaser'
import { W, H } from '../config/constants.js'
import { AnimConfig } from '../firestore/AnimConfig.js'
import { AuthManager } from '../auth/AuthManager.js'

export class AdminScene extends Phaser.Scene {
  constructor() { super('AdminScene') }

  // ── Lifecycle ──────────────────────────────────────────────────────────────

  create() {
    this._panelEl = null

    this.add.rectangle(W / 2, H / 2, W, H, 0x080810).setDepth(0)

    this._kEsc = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC)

    this._statusTxt = this.add.text(W / 2, H / 2, 'checking auth…', {
      fontSize: '11px', color: '#554433', fontFamily: 'Courier New',
    }).setOrigin(0.5).setDepth(2)

    this._buildTopBar()
    this.cameras.main.fadeIn(350, 8, 8, 16)

    this._init()
  }

  // ── Auth + load ────────────────────────────────────────────────────────────

  async _init() {
    const user = AuthManager.getCurrentUser()
    if (!user) {
      this._statusTxt.setText('sign in required')
      return
    }

    const ok = await AnimConfig.isAdmin(user.uid)
    if (!ok) {
      this._statusTxt.setText('not authorized')
      return
    }

    this._statusTxt.setText('loading…')
    try {
      const configs = await AnimConfig.loadAll()
      this._statusTxt.destroy()
      this._showPanel(configs)
    } catch (e) {
      this._statusTxt.setText(`error: ${e.message}`)
    }
  }

  // ── Top bar ────────────────────────────────────────────────────────────────

  _buildTopBar() {
    const TOP = 36
    this.add.rectangle(W / 2, TOP / 2, W, TOP, 0x000000, 0.75).setDepth(10)
    this.add.text(W / 2, TOP / 2, 'admin  ·  animation configs', {
      fontSize: '11px', color: '#887766', fontFamily: 'Courier New',
    }).setOrigin(0.5).setDepth(11)
  }

  // ── Config panel (DOM) ─────────────────────────────────────────────────────

  _showPanel(configs) {
    if (this._panelEl) { this._panelEl.remove() }

    const wrap = document.createElement('div')
    wrap.style.cssText = [
      'position:absolute', 'top:44px', 'left:50%', 'transform:translateX(-50%)',
      'width:680px', 'max-height:calc(100% - 60px)', 'overflow-y:auto',
      'background:#0a0814', 'font-family:Courier New,monospace',
      'font-size:11px', 'color:#ccbbaa', 'z-index:50', 'padding:12px',
      'box-sizing:border-box',
    ].join(';')

    if (configs.length === 0) {
      const empty = document.createElement('div')
      empty.textContent = 'no configs saved yet'
      empty.style.cssText = 'color:#443322; padding:20px 0; text-align:center'
      wrap.appendChild(empty)
    } else {
      configs.forEach(cfg => wrap.appendChild(this._makeCard(cfg, configs)))
    }

    document.getElementById('game-container').appendChild(wrap)
    this._panelEl = wrap
  }

  _makeCard(cfg, allConfigs) {
    const card = document.createElement('div')
    card.style.cssText = [
      'border:1px solid #332244', 'margin-bottom:10px', 'padding:10px',
      'background:#0d0b18',
    ].join(';')

    const hdr = document.createElement('div')
    hdr.style.cssText = 'display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:6px'

    const title = document.createElement('div')
    title.style.cssText = 'color:#aaffcc; font-size:12px'
    title.textContent = cfg.label || cfg.sheetKey

    const meta = document.createElement('div')
    meta.style.cssText = 'color:#554433; font-size:10px; text-align:right'
    meta.innerHTML = `${cfg.sheetKey}<br>${cfg.frames?.length ?? 0} frames · ${cfg.frameRate ?? '?'} fps · ${cfg.sheetW}×${cfg.sheetH}`

    hdr.append(title, meta)

    // Expand toggle
    const toggle = document.createElement('div')
    toggle.textContent = '▶ frame data'
    toggle.style.cssText = 'color:#554433; cursor:pointer; font-size:10px; margin-bottom:6px; user-select:none'

    const frameList = document.createElement('pre')
    frameList.style.cssText = [
      'display:none', 'background:#14121e', 'color:#887766',
      'padding:8px', 'margin:0 0 8px', 'font-size:9px', 'overflow-x:auto',
    ].join(';')
    frameList.textContent = JSON.stringify(cfg.frames ?? [], null, 2)

    toggle.onclick = () => {
      const open = frameList.style.display === 'block'
      frameList.style.display = open ? 'none' : 'block'
      toggle.textContent = (open ? '▶' : '▼') + ' frame data'
    }

    // Edit row
    const editRow = document.createElement('div')
    editRow.style.cssText = 'display:flex; gap:8px; align-items:center; margin-bottom:8px'

    const labelIn = document.createElement('input')
    labelIn.type = 'text'
    labelIn.value = cfg.label || ''
    labelIn.style.cssText = 'flex:1; background:#14121e; color:#ccbbaa; border:1px solid #332244; font-family:inherit; font-size:inherit; padding:4px; outline:none'

    const fpsIn = document.createElement('input')
    fpsIn.type = 'number'
    fpsIn.value = cfg.frameRate ?? 8
    fpsIn.min = '1'
    fpsIn.max = '60'
    fpsIn.style.cssText = 'width:56px; background:#14121e; color:#ccbbaa; border:1px solid #332244; font-family:inherit; font-size:inherit; padding:4px; outline:none'

    const saveBtn = document.createElement('div')
    saveBtn.textContent = '[ update ]'
    saveBtn.style.cssText = 'color:#00ff88; cursor:pointer; white-space:nowrap'

    const delBtn = document.createElement('div')
    delBtn.textContent = '[ delete ]'
    delBtn.style.cssText = 'color:#ff4444; cursor:pointer; white-space:nowrap'

    const rowStatus = document.createElement('div')
    rowStatus.style.cssText = 'font-size:10px; min-height:14px; color:#887766'

    saveBtn.onclick = async () => {
      saveBtn.textContent = 'saving…'
      try {
        await AnimConfig.update(cfg.id, {
          label: labelIn.value.trim() || cfg.sheetKey,
          frameRate: parseInt(fpsIn.value, 10) || 8,
        })
        title.textContent = labelIn.value.trim() || cfg.sheetKey
        rowStatus.textContent = 'saved'
        rowStatus.style.color = '#00ff88'
      } catch (e) {
        rowStatus.textContent = `error: ${e.message}`
        rowStatus.style.color = '#ff4444'
      }
      saveBtn.textContent = '[ update ]'
    }

    delBtn.onclick = async () => {
      if (!confirm(`delete "${cfg.label || cfg.sheetKey}"?`)) return
      try {
        await AnimConfig.delete(cfg.id)
        card.remove()
      } catch (e) {
        rowStatus.textContent = `error: ${e.message}`
        rowStatus.style.color = '#ff4444'
      }
    }

    editRow.append(labelIn, fpsIn, saveBtn, delBtn)
    card.append(hdr, toggle, frameList, editRow, rowStatus)
    return card
  }

  // ── Update ─────────────────────────────────────────────────────────────────

  update() {
    if (Phaser.Input.Keyboard.JustDown(this._kEsc)) {
      this._panelEl?.remove()
      this.cameras.main.fade(300, 8, 8, 16, false, (_, t) => {
        if (t === 1) this.scene.start('Ch2HubScene')
      })
    }
  }

  // ── Cleanup ────────────────────────────────────────────────────────────────

  shutdown() {
    this._panelEl?.remove()
  }
}
