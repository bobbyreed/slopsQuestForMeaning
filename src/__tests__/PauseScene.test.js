import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { PauseScene } from '../scenes/PauseScene.js'

function makeScene(overrides = {}) {
  const s = new PauseScene()
  s.init({ fromScene: 'WorldScene', slopState: { coinCount: 3, hasDash: true }, currentScene: 'WorldScene', ...overrides })
  s.create()
  return s
}

describe('PauseScene', () => {
  describe('init', () => {
    it('stores fromScene', () => {
      const s = new PauseScene()
      s.init({ fromScene: 'DungeonScene', slopState: {} })
      expect(s._fromScene).toBe('DungeonScene')
    })

    it('defaults fromScene to null with no data', () => {
      const s = new PauseScene()
      s.init({})
      expect(s._fromScene).toBeNull()
    })

    it('stores currentScene', () => {
      const s = new PauseScene()
      s.init({ fromScene: 'EastScene', slopState: {}, currentScene: 'EastScene' })
      expect(s._currentScene).toBe('EastScene')
    })
  })

  describe('create', () => {
    it('creates without throwing', () => {
      expect(() => makeScene()).not.toThrow()
    })

    it('initialises on INVENTORY tab (index 0)', () => {
      const s = makeScene()
      expect(s._tabIndex).toBe(0)
    })

    it('creates four tab labels', () => {
      const s = makeScene()
      expect(s._tabLabels.length).toBe(4)
    })

    it('terminal starts with empty buffer', () => {
      const s = makeScene()
      expect(s._termBuffer).toBe('')
    })

    it('terminal starts not awaiting confirmation', () => {
      const s = makeScene()
      expect(s._termAwaitingConfirm).toBe(false)
    })
  })

  describe('_switchTab', () => {
    it('advances to next tab', () => {
      const s = makeScene()
      s._switchTab(1)
      expect(s._tabIndex).toBe(1)
    })

    it('wraps from last tab back to first', () => {
      const s = makeScene()
      s._tabIndex = 3
      s._switchTab(1)
      expect(s._tabIndex).toBe(0)
    })

    it('wraps backwards from second tab to first', () => {
      const s = makeScene()
      s._tabIndex = 1
      s._switchTab(-1)
      expect(s._tabIndex).toBe(0)
    })

    it('does nothing while terminal keys are active', () => {
      const s = makeScene()
      s._termKeysActive = true
      s._switchTab(1)
      expect(s._tabIndex).toBe(0)
    })
  })

  describe('_setTab', () => {
    it('changes the tab index', () => {
      const s = makeScene()
      s._setTab(2)
      expect(s._tabIndex).toBe(2)
    })

    it('deactivates terminal key handler on tab switch', () => {
      const s = makeScene()
      s._termKeysActive = true
      s._setTab(0)
      expect(s._termKeysActive).toBe(false)
    })

    it('destroys existing content objects on tab switch', () => {
      const s = makeScene()
      const obj = { destroy: vi.fn() }
      s._contentGroup = [obj]
      s._setTab(1)
      expect(obj.destroy).toHaveBeenCalled()
    })
  })

  describe('_renderInventory', () => {
    it('renders without throwing', () => {
      const s = makeScene()
      expect(() => s._renderInventory()).not.toThrow()
    })

    it('uses slopState values', () => {
      const s = makeScene({}, { coinCount: 7 })
      // The slopState is passed via init, not overrides
      const s2 = new PauseScene()
      s2.init({ fromScene: 'W', slopState: { coinCount: 7, hasDash: false }, currentScene: 'W' })
      s2.create()
      // add.text calls include the coin count as a value
      const textCalls = s2.add.text.mock.calls
      const values = textCalls.map(c => c[2])
      expect(values).toContain('7')
    })

    it('shows "unlocked" for hasDash when true', () => {
      const s = new PauseScene()
      s.init({ fromScene: 'W', slopState: { hasDash: true }, currentScene: 'W' })
      s.create()
      const values = s.add.text.mock.calls.map(c => c[2])
      expect(values).toContain('unlocked')
    })

    it('shows "locked" for hasDash when false', () => {
      const s = new PauseScene()
      s.init({ fromScene: 'W', slopState: { hasDash: false }, currentScene: 'W' })
      s.create()
      const values = s.add.text.mock.calls.map(c => c[2])
      expect(values).toContain('locked')
    })
  })

  describe('_renderMap', () => {
    it('renders without throwing', () => {
      const s = makeScene()
      expect(() => s._renderMap()).not.toThrow()
    })

    it('adds a current-scene marker for the current node', () => {
      const s = new PauseScene()
      s.init({ fromScene: 'WorldScene', slopState: {}, currentScene: 'WorldScene' })
      s.create()
      // Switch to MAP tab explicitly and count text calls during map render
      const beforeSwitch = s.add.text.mock.calls.length
      s._setTab(1)  // MAP
      const withCurrent = s.add.text.mock.calls.length - beforeSwitch

      const s2 = new PauseScene()
      s2.init({ fromScene: 'WorldScene', slopState: {}, currentScene: null })
      s2.create()
      const before2 = s2.add.text.mock.calls.length
      s2._setTab(1)
      const withoutCurrent = s2.add.text.mock.calls.length - before2

      // Current scene adds one extra marker text (▼)
      expect(withCurrent).toBeGreaterThan(withoutCurrent)
    })
  })

  describe('_renderTerminal', () => {
    it('renders without throwing', () => {
      const s = makeScene()
      expect(() => s._renderTerminal()).not.toThrow()
    })

    it('activates terminal key handler', () => {
      const s = makeScene()
      s._setTab(2)  // TERMINAL tab
      expect(s._termKeysActive).toBe(true)
    })
  })

  describe('_renderJournal', () => {
    it('renders fallback text when add.dom is not available', () => {
      const s = makeScene()
      s.add.dom = undefined
      const initialCalls = s.add.text.mock.calls.length
      s._renderJournal()
      expect(s.add.text.mock.calls.length).toBeGreaterThan(initialCalls)
    })

    it('renders fallback text when document is not available (node env)', () => {
      // In the node test environment, document is undefined, so _renderJournal
      // always falls through to the fallback text path.
      const s = makeScene()
      const initialCalls = s.add.text.mock.calls.length
      s._clearContent()
      s._renderJournal()
      expect(s.add.text.mock.calls.length).toBeGreaterThan(initialCalls)
      expect(s.add.dom).not.toHaveBeenCalled()
    })
  })

  describe('_onTermKey', () => {
    it('appends printable characters to the buffer', () => {
      const s = makeScene()
      s._tabIndex = 2  // TERMINAL
      s._onTermKey({ key: 'h' })
      s._onTermKey({ key: 'i' })
      expect(s._termBuffer).toBe('hi')
    })

    it('backspace removes last character', () => {
      const s = makeScene()
      s._tabIndex = 2
      s._termBuffer = 'hel'
      s._onTermKey({ key: 'Backspace' })
      expect(s._termBuffer).toBe('he')
    })

    it('does nothing when not on TERMINAL tab', () => {
      const s = makeScene()
      s._tabIndex = 0  // INVENTORY
      s._onTermKey({ key: 'x' })
      expect(s._termBuffer).toBe('')
    })

    it('Escape calls _resume', () => {
      const s = makeScene()
      s._tabIndex = 2
      const spy = vi.spyOn(s, '_resume')
      s._onTermKey({ key: 'Escape' })
      expect(spy).toHaveBeenCalled()
    })

    it('Enter calls _execTerminal', () => {
      const s = makeScene()
      s._tabIndex = 2
      const spy = vi.spyOn(s, '_execTerminal')
      s._onTermKey({ key: 'Enter' })
      expect(spy).toHaveBeenCalled()
    })
  })

  describe('_execTerminal — commands', () => {
    function termScene() {
      const s = makeScene()
      s._tabIndex = 2
      s._termKeysActive = true
      return s
    }

    it('help adds help lines', () => {
      const s = termScene()
      s._termBuffer = 'help'
      s._execTerminal()
      expect(s._termLines.some(l => l.includes('new game'))).toBe(true)
    })

    it('blank input is ignored (no extra lines added)', () => {
      const s = termScene()
      const before = s._termLines.length
      s._termBuffer = '  '
      s._execTerminal()
      // Only the echoed empty line is skipped — length shouldn't grow by much
      expect(s._termLines.length).toBe(before + 1)  // just the "> " echo
    })

    it('unknown command adds error line', () => {
      const s = termScene()
      s._termBuffer = 'sudo rm -rf'
      s._execTerminal()
      expect(s._termLines.some(l => l.includes('unknown command'))).toBe(true)
    })

    it('new game sets _termAwaitingConfirm', () => {
      const s = termScene()
      s._termBuffer = 'new game'
      s._execTerminal()
      expect(s._termAwaitingConfirm).toBe(true)
      expect(s._termLines.some(l => l.includes('WARNING'))).toBe(true)
    })

    it('new game → n aborts without clearing data', () => {
      const s = termScene()
      s._termAwaitingConfirm = true
      s._termBuffer = 'n'
      s._execTerminal()
      expect(s._termAwaitingConfirm).toBe(false)
      expect(s._termLines.some(l => l.includes('aborted'))).toBe(true)
    })

    it('new game → y queues a reload via delayedCall', () => {
      const s = termScene()
      s._termAwaitingConfirm = true
      s._termBuffer = 'y'
      s._execTerminal()
      expect(s.time.delayedCall).toHaveBeenCalled()
      expect(s._termLines.some(l => l.includes('wiping'))).toBe(true)
    })

    it('clears buffer after exec', () => {
      const s = termScene()
      s._termBuffer = 'help'
      s._execTerminal()
      expect(s._termBuffer).toBe('')
    })
  })

  describe('_resume', () => {
    it('calls scene.resume on fromScene', () => {
      const s = makeScene()
      s._resume()
      expect(s.scene.resume).toHaveBeenCalledWith('WorldScene')
    })

    it('calls scene.stop', () => {
      const s = makeScene()
      s._resume()
      expect(s.scene.stop).toHaveBeenCalled()
    })

    it('does not call scene.resume when fromScene is null', () => {
      const s = new PauseScene()
      s.init({})
      s.create()
      s._resume()
      expect(s.scene.resume).not.toHaveBeenCalled()
    })

    it('deactivates terminal key handler', () => {
      const s = makeScene()
      s._termKeysActive = true
      s._resume()
      expect(s._termKeysActive).toBe(false)
    })
  })

  describe('update', () => {
    it('does not throw', () => {
      const s = makeScene()
      expect(() => s.update()).not.toThrow()
    })

    it('does not resume while terminal keys are active', () => {
      const s = makeScene()
      s._termKeysActive = true
      s.update()
      expect(s.scene.resume).not.toHaveBeenCalled()
    })
  })
})
