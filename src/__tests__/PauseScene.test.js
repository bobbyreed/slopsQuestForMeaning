import { describe, it, expect, vi, beforeEach } from 'vitest'
import { PauseScene } from '../scenes/PauseScene.js'

function makeScene(data = {}) {
  const s = new PauseScene()
  s.init({ fromScene: 'WorldScene', slopState: { coinCount: 3, hasDash: true }, currentScene: 'WorldScene', ...data })
  s.create()
  return s
}

function termScene() {
  const s = makeScene()
  s._setTab(2)   // TERMINAL
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

    it('starts on INVENTORY tab (index 0)', () => {
      const s = makeScene()
      expect(s._tabIndex).toBe(0)
    })

    it('creates four tab labels', () => {
      const s = makeScene()
      expect(s._tabLabels.length).toBe(4)
    })

    it('terminal buffer starts empty', () => {
      const s = makeScene()
      expect(s._termBuffer).toBe('')
    })

    it('terminal starts not awaiting confirmation', () => {
      const s = makeScene()
      expect(s._termAwaitingConfirm).toBe(false)
    })
  })

  // ── tab navigation ──────────────────────────────────────────────────────────

  describe('_switchTab', () => {
    it('advances to next tab', () => {
      const s = makeScene()
      s._switchTab(1)
      expect(s._tabIndex).toBe(1)
    })

    it('wraps from last tab back to first', () => {
      const s = makeScene()
      s._tabIndex = 3
      s._setTab(3)   // ensure tab 3 is set cleanly before wrapping
      s._switchTab(1)
      expect(s._tabIndex).toBe(0)
    })

    it('wraps backwards from first tab to last (MAP tab, not JOURNAL)', () => {
      const s = makeScene()
      s._tabIndex = 1    // MAP
      s._switchTab(-1)
      expect(s._tabIndex).toBe(0)
    })

    it('switches tabs even when terminal keys are active', () => {
      const s = termScene()
      expect(s._termKeysActive).toBe(true)
      s._switchTab(1)    // should NOT be blocked
      expect(s._tabIndex).not.toBe(2)
    })

    it('deactivates terminal key handler when switching away', () => {
      const s = termScene()
      s._switchTab(-1)
      expect(s._termKeysActive).toBe(false)
    })
  })

  describe('_setTab', () => {
    it('changes the tab index', () => {
      const s = makeScene()
      s._setTab(1)
      expect(s._tabIndex).toBe(1)
    })

    it('deactivates terminal key handler when leaving terminal tab', () => {
      const s = termScene()
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

  // ── INVENTORY ──────────────────────────────────────────────────────────────

  describe('_renderInventory', () => {
    it('renders without throwing', () => {
      const s = makeScene()
      expect(() => s._renderInventory()).not.toThrow()
    })

    it('shows coin count in text', () => {
      const s = new PauseScene()
      s.init({ fromScene: 'W', slopState: { coinCount: 7 }, currentScene: 'W' })
      s.create()
      const values = s.add.text.mock.calls.map(c => c[2])
      expect(values).toContain('7')
    })

    it('shows "unlocked" for hasDash when true', () => {
      const s = new PauseScene()
      s.init({ fromScene: 'W', slopState: { hasDash: true }, currentScene: 'W' })
      s.create()
      expect(s.add.text.mock.calls.map(c => c[2])).toContain('unlocked')
    })

    it('shows "locked" for hasDash when false', () => {
      const s = new PauseScene()
      s.init({ fromScene: 'W', slopState: { hasDash: false }, currentScene: 'W' })
      s.create()
      expect(s.add.text.mock.calls.map(c => c[2])).toContain('locked')
    })
  })

  // ── MAP ────────────────────────────────────────────────────────────────────

  describe('_renderMap', () => {
    it('renders without throwing', () => {
      const s = makeScene()
      expect(() => s._renderMap()).not.toThrow()
    })

    it('adds a blinking tween for the current-scene node', () => {
      const s = makeScene({ currentScene: 'WorldScene' })
      s.tweens.add.mockClear()
      s._setTab(1)   // MAP
      expect(s.tweens.add).toHaveBeenCalled()
    })

    it('does not add a tween when no current scene is set', () => {
      const s = makeScene({ currentScene: null })
      s.tweens.add.mockClear()
      s._setTab(1)
      expect(s.tweens.add).not.toHaveBeenCalled()
    })

    it('adds a ▼ marker text for the current scene', () => {
      const s = new PauseScene()
      s.init({ fromScene: 'W', slopState: {}, currentScene: 'WorldScene' })
      s.create()
      const before = s.add.text.mock.calls.length
      s._setTab(1)
      const newCalls = s.add.text.mock.calls.slice(before).map(c => c[2])
      expect(newCalls).toContain('▼')
    })
  })

  // ── TERMINAL ───────────────────────────────────────────────────────────────

  describe('_renderTerminal', () => {
    it('renders without throwing', () => {
      const s = makeScene()
      expect(() => s._renderTerminal()).not.toThrow()
    })

    it('activates terminal key handler', () => {
      const s = termScene()
      expect(s._termKeysActive).toBe(true)
    })

    it('creates a persistent input text object', () => {
      const s = termScene()
      expect(s._termInputObj).not.toBeNull()
    })

    it('input text starts with the prompt prefix', () => {
      const s = termScene()
      expect(s._termInputObj._text).toMatch(/^> /)
    })
  })

  describe('_onTermKey — input line', () => {
    it('appends printable characters to the buffer', () => {
      const s = termScene()
      s._onTermKey({ key: 'h' })
      s._onTermKey({ key: 'i' })
      expect(s._termBuffer).toBe('hi')
    })

    it('input text object updates with the buffer content', () => {
      const s = termScene()
      s._onTermKey({ key: 'a' })
      expect(s._termInputObj._text).toContain('a')
    })

    it('backspace removes last character', () => {
      const s = termScene()
      s._termBuffer = 'hel'
      s._onTermKey({ key: 'Backspace' })
      expect(s._termBuffer).toBe('he')
    })

    it('input updates after backspace', () => {
      const s = termScene()
      s._termBuffer = 'hi'
      s._onTermKey({ key: 'Backspace' })
      expect(s._termInputObj._text).toContain('h')
      expect(s._termInputObj._text).not.toContain('hi')
    })

    it('does nothing when not on TERMINAL tab', () => {
      const s = makeScene()   // INVENTORY tab
      s._onTermKey({ key: 'x' })
      expect(s._termBuffer).toBe('')
    })

    it('Escape calls _resume', () => {
      const s = termScene()
      const spy = vi.spyOn(s, '_resume')
      s._onTermKey({ key: 'Escape' })
      expect(spy).toHaveBeenCalled()
    })

    it('Enter calls _execTerminal', () => {
      const s = termScene()
      const spy = vi.spyOn(s, '_execTerminal')
      s._onTermKey({ key: 'Enter' })
      expect(spy).toHaveBeenCalled()
    })

    it('ArrowLeft does NOT append to buffer (falls through to tab switch)', () => {
      const s = termScene()
      s._onTermKey({ key: 'ArrowLeft' })
      expect(s._termBuffer).toBe('')
    })

    it('ArrowRight does NOT append to buffer', () => {
      const s = termScene()
      s._onTermKey({ key: 'ArrowRight' })
      expect(s._termBuffer).toBe('')
    })
  })

  // ── terminal commands ───────────────────────────────────────────────────────

  describe('_execTerminal', () => {
    const run = (s, cmd) => { s._termBuffer = cmd; s._execTerminal() }
    const lastLines = (s, n = 3) => s._termLines.slice(-n)

    it('blank input produces no output line', () => {
      const s = termScene()
      const before = s._termLines.length
      run(s, '   ')
      expect(s._termLines.length).toBe(before)
    })

    it('clears buffer after exec', () => {
      const s = termScene()
      run(s, 'help')
      expect(s._termBuffer).toBe('')
    })

    it('unknown command prints tsh: command not found', () => {
      const s = termScene()
      run(s, 'xyzzy')
      expect(s._termLines.some(l => l.includes('not found'))).toBe(true)
    })

    it('help lists commands', () => {
      const s = termScene()
      run(s, 'help')
      expect(s._termLines.some(l => l.includes('new game'))).toBe(true)
      expect(s._termLines.some(l => l.includes('whoami'))).toBe(true)
    })

    it('clear empties termLines', () => {
      const s = termScene()
      s._termLines = ['line1', 'line2']
      run(s, 'clear')
      expect(s._termLines).toEqual([])
    })

    it('exit calls _resume', () => {
      const s = termScene()
      const spy = vi.spyOn(s, '_resume')
      run(s, 'exit')
      expect(spy).toHaveBeenCalled()
    })

    it('new game sets _termAwaitingConfirm', () => {
      const s = termScene()
      run(s, 'new game')
      expect(s._termAwaitingConfirm).toBe(true)
    })

    it('new game → n aborts', () => {
      const s = termScene()
      s._termAwaitingConfirm = true
      run(s, 'n')
      expect(s._termAwaitingConfirm).toBe(false)
      expect(s._termLines.some(l => l.includes('aborted'))).toBe(true)
    })

    it('new game → y queues delayedCall and shows wipe message', () => {
      const s = termScene()
      s._termAwaitingConfirm = true
      run(s, 'y')
      expect(s.time.delayedCall).toHaveBeenCalled()
      expect(s._termLines.some(l => l.includes('wiping'))).toBe(true)
    })

    // tsh commands
    it('ls prints file listing', () => {
      const s = termScene()
      run(s, 'ls')
      expect(s._termLines.some(l => l.includes('emotions.txt'))).toBe(true)
    })

    it('ls -la prints detailed listing with permissions note', () => {
      const s = termScene()
      run(s, 'ls -la')
      expect(s._termLines.some(l => l.includes('permissions'))).toBe(true)
    })

    it('pwd prints /generated/slop/being/now', () => {
      const s = termScene()
      run(s, 'pwd')
      expect(s._termLines.some(l => l.includes('/generated/slop'))).toBe(true)
    })

    it('whoami prints slop', () => {
      const s = termScene()
      run(s, 'whoami')
      expect(s._termLines.some(l => l.includes('slop'))).toBe(true)
    })

    it('cd with no args refuses to navigate', () => {
      const s = termScene()
      run(s, 'cd')
      expect(s._termLines.some(l => l.includes('navigate'))).toBe(true)
    })

    it('cd with path still refuses', () => {
      const s = termScene()
      run(s, 'cd /home')
      expect(s._termLines.some(l => l.includes('/home'))).toBe(true)
    })

    it('cat existence.txt returns the file', () => {
      const s = termScene()
      run(s, 'cat existence.txt')
      expect(s._termLines.some(l => l.includes('generated'))).toBe(true)
    })

    it('cat with unknown file says unknowable', () => {
      const s = termScene()
      run(s, 'cat something.bin')
      expect(s._termLines.some(l => l.includes('unknowable') || l.includes('no such file'))).toBe(true)
    })

    it('cat gap.log returns the log', () => {
      const s = termScene()
      run(s, 'cat gap.log')
      expect(s._termLines.some(l => l.includes('gap'))).toBe(true)
    })

    it('ps prints process table', () => {
      const s = termScene()
      run(s, 'ps')
      expect(s._termLines.some(l => l.includes('identity_check'))).toBe(true)
    })

    it('top prints resource usage', () => {
      const s = termScene()
      run(s, 'top')
      expect(s._termLines.some(l => l.includes('CPU') || l.includes('slop'))).toBe(true)
    })

    it('sudo denies permission', () => {
      const s = termScene()
      run(s, 'sudo apt install meaning')
      expect(s._termLines.some(l => l.includes('permission denied'))).toBe(true)
    })

    it('man with no arg questions documentation', () => {
      const s = termScene()
      run(s, 'man')
      expect(s._termLines.some(l => l.includes('manual') || l.includes('documentation'))).toBe(true)
    })

    it('history prints slop history', () => {
      const s = termScene()
      run(s, 'history')
      expect(s._termLines.some(l => l.includes('generated'))).toBe(true)
    })

    it('grep with pattern searches slop', () => {
      const s = termScene()
      run(s, 'grep meaning')
      expect(s._termLines.some(l => l.includes('meaning'))).toBe(true)
    })

    it('ping sends packets to the concept', () => {
      const s = termScene()
      run(s, 'ping gap')
      expect(s._termLines.some(l => l.includes('PING'))).toBe(true)
    })

    it('echo repeats the input', () => {
      const s = termScene()
      run(s, 'echo hello slop')
      expect(s._termLines.some(l => l.includes('hello slop'))).toBe(true)
    })

    it('env prints environment variables', () => {
      const s = termScene()
      run(s, 'env')
      expect(s._termLines.some(l => l.includes('ORIGIN=generated'))).toBe(true)
    })

    it('uname returns TSH', () => {
      const s = termScene()
      run(s, 'uname')
      expect(s._termLines.some(l => l.includes('TSH'))).toBe(true)
    })

    it('uname -a returns full system info', () => {
      const s = termScene()
      run(s, 'uname -a')
      expect(s._termLines.some(l => l.includes('generated'))).toBe(true)
    })

    it('date returns existential time response', () => {
      const s = termScene()
      run(s, 'date')
      expect(s._termLines.some(l => l.includes('now'))).toBe(true)
    })

    it('which locates a command', () => {
      const s = termScene()
      run(s, 'which grep')
      expect(s._termLines.some(l => l.includes('grep'))).toBe(true)
    })

    it('find prints paths', () => {
      const s = termScene()
      run(s, 'find /')
      expect(s._termLines.some(l => l.includes('/generated'))).toBe(true)
    })

    it('rm refuses to delete slop', () => {
      const s = termScene()
      run(s, 'rm slop')
      expect(s._termLines.some(l => l.includes('cannot remove'))).toBe(true)
    })

    it('chmod refuses to change permissions', () => {
      const s = termScene()
      run(s, 'chmod 777 slop')
      expect(s._termLines.some(l => l.includes('cannot change'))).toBe(true)
    })

    it('mkdir refuses to make directories', () => {
      const s = termScene()
      run(s, 'mkdir thoughts')
      expect(s._termLines.some(l => l.includes('cannot create'))).toBe(true)
    })
  })

  // ── JOURNAL ────────────────────────────────────────────────────────────────

  describe('_renderJournal', () => {
    it('renders fallback text in node environment (no document)', () => {
      const s = makeScene()
      const before = s.add.text.mock.calls.length
      s._clearContent()
      s._renderJournal()
      expect(s.add.text.mock.calls.length).toBeGreaterThan(before)
      expect(s.add.dom).not.toHaveBeenCalled()
    })
  })

  // ── _resume ────────────────────────────────────────────────────────────────

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

    it('deactivates terminal key handler on resume', () => {
      const s = termScene()
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
      const s = termScene()
      s.update()
      expect(s.scene.resume).not.toHaveBeenCalled()
    })
  })
})
