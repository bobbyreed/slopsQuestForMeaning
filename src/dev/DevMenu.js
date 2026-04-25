import { SaveState } from '../ui/SaveState.js'

// ── Scene jump destinations ───────────────────────────────────────────────────
const SCENES = [
  { key: 'WorldScene',         label: 'WORLD',      spawn: null },
  { key: 'NorthShrineScene',   label: 'SHRINE',     spawn: 'south' },
  { key: 'DungeonScene',       label: 'DUNGEON',    spawn: null },
  { key: 'FirstNPCScene',      label: 'RENDER',     spawn: null },
  { key: 'EastScene',          label: 'EAST',       spawn: 'east' },
  { key: 'SectorScene',        label: 'SECTOR',     spawn: 'west' },
  { key: 'PixelBossScene',     label: 'PIXEL BOSS', spawn: 'west' },
  { key: 'WestScene',          label: 'WEST',       spawn: 'west' },
  { key: 'WestGateScene',      label: 'W.GATE',     spawn: 'east' },
  { key: 'DuplicateBossScene', label: 'DUPLICATE',  spawn: 'west' },
  { key: 'ConvergenceScene',   label: 'FINAL',      spawn: 'shrine' },
]

// ── State presets ─────────────────────────────────────────────────────────────
const BLANK = {
  coinCount: 0, maxCoins: 3,
  hasPrompt: false, hasEyes: false, hasDash: false, hasCorrupt: false,
  inPriorBody: false, freakyFridayUnlocked: false,
  dungeonCleared: false, sectorCleared: false,
  eastDungeonCleared: false, westGateCleared: false,
  westDungeonCleared: false, finalDungeonCleared: false,
  purchases: { smallPurse: false, eyes: false, bigPurse: false, grandPurse: false },
  facing: { x: 0, y: -1 },
}

const PRESETS = {
  fresh: () => clone(BLANK),

  afterDungeon: () => ({
    ...clone(BLANK),
    hasPrompt: true,
    dungeonCleared: true,
  }),

  eyes: () => ({
    ...clone(BLANK),
    hasPrompt: true, hasEyes: true,
    dungeonCleared: true,
    purchases: { ...BLANK.purchases, eyes: true },
  }),

  preFinal: () => ({
    ...clone(BLANK),
    hasPrompt: true, hasEyes: true, hasDash: true, hasCorrupt: true,
    dungeonCleared: true, sectorCleared: true,
    eastDungeonCleared: true, westGateCleared: true, westDungeonCleared: true,
    purchases: { smallPurse: true, eyes: true, bigPurse: false, grandPurse: false },
  }),

  full: () => ({
    ...clone(BLANK),
    hasPrompt: true, hasEyes: true, hasDash: true, hasCorrupt: true,
    inPriorBody: false, freakyFridayUnlocked: true,
    dungeonCleared: true, sectorCleared: true,
    eastDungeonCleared: true, westGateCleared: true,
    westDungeonCleared: true, finalDungeonCleared: true,
    purchases: { smallPurse: true, eyes: true, bigPurse: false, grandPurse: false },
  }),
}

function clone(o) {
  return JSON.parse(JSON.stringify(o))
}

// ── DevMenu ───────────────────────────────────────────────────────────────────

export class DevMenu {
  constructor(jumpFn) {
    this._jumpFn = jumpFn
    this._el     = null
    this._state  = null
  }

  show() {
    if (this._el) return
    this._state = SaveState.load() ? clone(SaveState.load()) : PRESETS.fresh()
    this._render()
    document.addEventListener('keydown', this._onEsc)
  }

  hide() {
    this._el?.remove()
    this._el = null
    document.removeEventListener('keydown', this._onEsc)
  }

  _onEsc = (e) => { if (e.key === 'Escape') this.hide() }

  // ── Render ──────────────────────────────────────────────────────────────────

  _render() {
    const el = document.createElement('div')
    el.id = 'slop-dev-menu'
    el.innerHTML = this._html()
    document.body.appendChild(el)
    this._el = el
    this._bind()
  }

  _html() {
    const s = this._state
    const toggle = (field) =>
      `<button class="dev-toggle ${s[field] ? 'dev-on' : ''}" data-field="${field}">${s[field] ? 'ON' : 'OFF'}</button>`
    const pToggle = (key) =>
      `<button class="dev-toggle ${s.purchases[key] ? 'dev-on' : ''}" data-purchase="${key}">${s.purchases[key] ? 'ON' : 'OFF'}</button>`

    const sceneButtons = SCENES.map(sc =>
      `<button class="dev-btn dev-scene-btn" data-scene="${sc.key}" data-spawn="${sc.spawn ?? ''}">${sc.label}</button>`
    ).join('')

    return `
      <div id="dev-panel">
        <div id="dev-header">
          DEV CONSOLE <span>// slop's quest for meaning</span>
          <button id="dev-close-btn">[ ESC ]</button>
        </div>

        <div id="dev-body">
          <div class="dev-section">
            <div class="dev-label">SCENE JUMP</div>
            <div class="dev-btn-row">${sceneButtons}</div>
          </div>

          <div class="dev-section dev-flags-section">
            <div class="dev-col">
              <div class="dev-label">ABILITIES</div>
              <div class="dev-flag-row"><span>hasPrompt</span>${toggle('hasPrompt')}</div>
              <div class="dev-flag-row"><span>hasEyes</span>${toggle('hasEyes')}</div>
              <div class="dev-flag-row"><span>hasDash</span>${toggle('hasDash')}</div>
              <div class="dev-flag-row"><span>hasCorrupt</span>${toggle('hasCorrupt')}</div>
              <div class="dev-flag-row"><span>inPriorBody</span>${toggle('inPriorBody')}</div>
              <div class="dev-flag-row"><span>freakyFriday</span>${toggle('freakyFridayUnlocked')}</div>
              <div class="dev-label" style="margin-top:8px">RESOURCES</div>
              <div class="dev-flag-row"><span>coins</span><input class="dev-num" id="dev-coins" type="number" min="0" max="300" value="${s.coinCount}" /></div>
              <div class="dev-flag-row"><span>maxCoins</span><input class="dev-num" id="dev-maxcoins" type="number" min="3" max="300" value="${s.maxCoins}" /></div>
            </div>
            <div class="dev-col">
              <div class="dev-label">PROGRESSION</div>
              <div class="dev-flag-row"><span>dungeonCleared</span>${toggle('dungeonCleared')}</div>
              <div class="dev-flag-row"><span>sectorCleared</span>${toggle('sectorCleared')}</div>
              <div class="dev-flag-row"><span>eastDungeon</span>${toggle('eastDungeonCleared')}</div>
              <div class="dev-flag-row"><span>westGate</span>${toggle('westGateCleared')}</div>
              <div class="dev-flag-row"><span>westDungeon</span>${toggle('westDungeonCleared')}</div>
              <div class="dev-flag-row"><span>finalDungeon</span>${toggle('finalDungeonCleared')}</div>
              <div class="dev-label" style="margin-top:8px">PURCHASES</div>
              <div class="dev-flag-row"><span>smallPurse</span>${pToggle('smallPurse')}</div>
              <div class="dev-flag-row"><span>eyes</span>${pToggle('eyes')}</div>
              <div class="dev-flag-row"><span>bigPurse</span>${pToggle('bigPurse')}</div>
              <div class="dev-flag-row"><span>grandPurse</span>${pToggle('grandPurse')}</div>
            </div>
          </div>

          <div class="dev-section">
            <div class="dev-label">PRESETS</div>
            <div class="dev-btn-row">
              <button class="dev-btn dev-preset-btn" data-preset="fresh">FRESH</button>
              <button class="dev-btn dev-preset-btn" data-preset="afterDungeon">AFTER DUNGEON</button>
              <button class="dev-btn dev-preset-btn" data-preset="eyes">EYES</button>
              <button class="dev-btn dev-preset-btn" data-preset="preFinal">PRE-FINAL</button>
              <button class="dev-btn dev-preset-btn" data-preset="full">FULL</button>
            </div>
          </div>
        </div>
      </div>`
  }

  // ── Bind ────────────────────────────────────────────────────────────────────

  _bind() {
    const el = this._el

    el.querySelector('#dev-close-btn').addEventListener('click', () => this.hide())

    // Scene jump
    el.querySelectorAll('.dev-scene-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const sceneName   = btn.dataset.scene
        const spawnOrigin = btn.dataset.spawn || null
        this._syncInputs()
        SaveState.save(this._state)
        this.hide()
        this._jumpFn(sceneName, clone(this._state), spawnOrigin)
      })
    })

    // Flag toggles
    el.querySelectorAll('[data-field]').forEach(btn => {
      btn.addEventListener('click', () => {
        const field = btn.dataset.field
        this._state[field] = !this._state[field]
        this._rerender()
      })
    })

    // Purchase toggles
    el.querySelectorAll('[data-purchase]').forEach(btn => {
      btn.addEventListener('click', () => {
        const key = btn.dataset.purchase
        this._state.purchases[key] = !this._state.purchases[key]
        this._rerender()
      })
    })

    // Number inputs
    el.querySelector('#dev-coins').addEventListener('change', e => {
      this._state.coinCount = Math.max(0, parseInt(e.target.value) || 0)
    })
    el.querySelector('#dev-maxcoins').addEventListener('change', e => {
      this._state.maxCoins = Math.max(3, parseInt(e.target.value) || 3)
    })

    // Presets
    el.querySelectorAll('.dev-preset-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this._state = PRESETS[btn.dataset.preset]()
        this._rerender()
      })
    })
  }

  _syncInputs() {
    const coins    = this._el?.querySelector('#dev-coins')
    const maxCoins = this._el?.querySelector('#dev-maxcoins')
    if (coins)    this._state.coinCount = Math.max(0, parseInt(coins.value) || 0)
    if (maxCoins) this._state.maxCoins  = Math.max(3, parseInt(maxCoins.value) || 3)
  }

  _rerender() {
    this._syncInputs()
    this._el.innerHTML = this._html()
    this._bind()
  }
}
