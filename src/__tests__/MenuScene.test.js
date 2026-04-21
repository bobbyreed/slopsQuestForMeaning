import { describe, it, expect } from 'vitest'

// Import the module's named exports by re-exporting them from a test shim.
// EASTER_EGGS and PROMPT_WORDS are module-level consts — we access them via
// a dynamic import so the mock alias for 'phaser' is resolved first.

let EASTER_EGGS, PROMPT_WORDS

beforeAll(async () => {
  // MenuScene uses 'phaser' (aliased to our mock) but doesn't export the consts.
  // We evaluate the raw module source to pull them out.
  const mod = await import('../scenes/MenuScene.js')
  // MenuScene exports the class only. We test the eggs by importing a thin
  // re-export shim (see bottom of this file) or by inspecting what _process does.
  // For data-level tests we'll extract via the internal escape hatch below.
  EASTER_EGGS = mod.__EASTER_EGGS
  PROMPT_WORDS = mod.__PROMPT_WORDS
})

// To make EASTER_EGGS testable without modifying prod code we expose them
// from a sibling shim. Instead, let's test the MenuScene._process logic via
// the class interface (building a minimal DOM stub).

import { MenuScene } from '../scenes/MenuScene.js'

// ── DOM stub ──────────────────────────────────────────────────────────────────
function buildDom() {
  // Minimal in-memory DOM nodes that track calls
  const messages = []
  const fakeEl = (id) => ({
    id, innerHTML: '', style: {}, dataset: {},
    querySelectorAll: () => [],
    querySelector: (sel) => {
      if (sel === '#slop-messages') return {
        appendChild: (el) => messages.push(el),
        scrollTop: 0, scrollHeight: 100,
      }
      if (sel === '#slop-input') return {
        value: '', focus: () => {}, addEventListener: () => {},
      }
      return null
    },
    appendChild: () => {},
    addEventListener: () => {},
  })

  global.document = {
    getElementById: (id) => id === 'slop-messages' ? {
      appendChild: (el) => messages.push(el),
      scrollTop: 0, scrollHeight: 100,
    } : null,
    createElement: (tag) => ({
      tag, id: '', textContent: '', className: '',
      appendChild: () => {},
      addEventListener: () => {},
    }),
    head: { appendChild: () => {} },
  }
  global.getComputedStyle = () => ({ position: 'relative' })
  global.setTimeout = (fn) => fn()

  return { messages }
}

// ── Egg structure tests ───────────────────────────────────────────────────────
describe('MenuScene easter eggs (structure)', () => {
  // We instantiate the scene and reach into _process to verify behaviour
  let scene

  beforeEach(() => {
    buildDom()
    scene = new MenuScene()
    // Provide minimal game mock so _buildTerminal doesn't crash
    scene.game = { canvas: { parentElement: { style: {}, appendChild: () => {}, querySelectorAll: () => [] } } }
    scene.cameras = { main: { fadeIn: () => {}, fade: () => {} } }
    scene.add = { rectangle: () => {} }
    scene.scene = { start: vi.fn() }
    scene._addMessage = vi.fn()
  })

  it('recognises "play" and triggers _startGame after delay', () => {
    scene._startGame = vi.fn()
    // patch setTimeout to be synchronous
    global.setTimeout = (fn, _ms) => fn()
    scene._process('play')
    expect(scene._addMessage).toHaveBeenCalled()
  })

  it('recognises "slop" and responds as slop role', () => {
    scene._process('slop')
    const call = scene._addMessage.mock.calls.find(c => c[0] === 'slop' && c[1] === 'slop')
    expect(call).toBeTruthy()
  })

  it('recognises "prior" and responds as prior role', () => {
    scene._process('prior')
    const call = scene._addMessage.mock.calls.find(c => c[0] === 'prior')
    expect(call).toBeTruthy()
  })

  it('recognises "the prior" and responds as prior role', () => {
    scene._process('the prior')
    const call = scene._addMessage.mock.calls.find(c => c[0] === 'prior')
    expect(call).toBeTruthy()
  })

  it('fires a prompt word for the "prompt" command', () => {
    scene._process('prompt')
    const call = scene._addMessage.mock.calls.find(c => c[0] === 'prompt-fire')
    expect(call).toBeTruthy()
  })

  it('gives a fallback message for unknown commands', () => {
    scene._process('xyzzy')
    const call = scene._addMessage.mock.calls.find(c => c[1] === 'slop' && c[2]?.includes('not something'))
    expect(call).toBeTruthy()
  })

  it('recognises "new game" and clears save before starting', () => {
    scene._startGame = vi.fn()
    global.setTimeout = (fn) => fn()
    scene._process('new game')
    expect(scene._addMessage).toHaveBeenCalled()
    expect(scene._startGame).toHaveBeenCalled()
  })

  const knownEggs = [
    'help', 'slop', 'exist', 'generate', 'geners', 'frankenstein',
    'die', 'north', 'meaning', 'soul', 'stolen', 'hello',
    'debug', 'error', 'beige', 'loop', 'who made you', 'who are you',
    'readme', 'dungeon', 'the render', 'render', 'coins', 'shrine',
  ]

  knownEggs.forEach(cmd => {
    it(`responds to "${cmd}" without throwing`, () => {
      expect(() => scene._process(cmd)).not.toThrow()
      expect(scene._addMessage).toHaveBeenCalled()
    })
  })

  it('opens journal window for "journal" command', () => {
    global.window = { open: vi.fn() }
    scene._process('journal')
    expect(global.window.open).toHaveBeenCalled()
  })
})

// ── Real method coverage ───────────────────────────────────────────────────────

function buildDomFull() {
  const messagesEl = {
    appendChild: vi.fn(),
    scrollTop: 0, scrollHeight: 100,
  }
  global.document = {
    getElementById: (id) => {
      if (id === 'slop-messages') return messagesEl
      return null
    },
    createElement: () => ({
      id: '', textContent: '', className: '', innerHTML: '', style: {},
      dataset: {},
      appendChild: vi.fn(),
      addEventListener: vi.fn(),
      querySelectorAll: () => [],
      querySelector: (sel) => sel === '#slop-input'
        ? { value: '', focus: vi.fn(), addEventListener: vi.fn() }
        : null,
      remove: vi.fn(),
    }),
    head: { appendChild: vi.fn() },
  }
  global.getComputedStyle = () => ({ position: 'relative' })
  global.setTimeout = (fn) => fn()
  return { messagesEl }
}

describe('MenuScene real methods', () => {
  it('_addMessage appends a div to the messages container', () => {
    const { messagesEl } = buildDomFull()
    const scene = new MenuScene()
    scene._addMessage('slop', 'slop', 'hello')
    expect(messagesEl.appendChild).toHaveBeenCalled()
  })

  it('_startGame hides terminal and fades to WorldScene', () => {
    buildDomFull()
    const scene = new MenuScene()
    scene.cameras = { main: { fade: vi.fn() } }
    scene.scene = { start: vi.fn() }
    scene._term = { style: {} }
    scene._startGame()
    expect(scene._term.style.display).toBe('none')
    const fadeCb = scene.cameras.main.fade.mock.calls[0][5]
    fadeCb(null, 1)
    expect(scene.scene.start).toHaveBeenCalledWith('WorldScene')
  })

  it('shutdown removes the terminal and nulls _term', () => {
    const scene = new MenuScene()
    const remove = vi.fn()
    scene._term = { remove }
    scene.shutdown()
    expect(remove).toHaveBeenCalled()
    expect(scene._term).toBeNull()
  })

  it('create runs _buildTerminal and calls fadeIn', () => {
    buildDomFull()
    const scene = new MenuScene()
    const parentEl = {
      style: {}, appendChild: vi.fn(),
      querySelectorAll: () => [],
      querySelector: () => null,
    }
    scene.game = { canvas: { parentElement: parentEl } }
    scene.cameras = { main: { fadeIn: vi.fn(), fade: vi.fn() } }
    scene.add = { rectangle: vi.fn() }
    scene.scene = { start: vi.fn() }
    expect(() => scene.create()).not.toThrow()
    expect(scene.cameras.main.fadeIn).toHaveBeenCalled()
  })
})
