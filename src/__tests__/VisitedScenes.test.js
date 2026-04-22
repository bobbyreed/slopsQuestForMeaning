import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const VISITED_KEY = 'slop_visited'

describe('VisitedScenes — no localStorage (default test env)', () => {
  let VisitedScenes

  beforeEach(async () => {
    vi.resetModules()
    ;({ VisitedScenes } = await import('../ui/VisitedScenes.js'))
  })

  it('mark does not throw', () => {
    expect(() => VisitedScenes.mark('WorldScene')).not.toThrow()
  })

  it('has returns false', () => {
    expect(VisitedScenes.has('WorldScene')).toBe(false)
  })

  it('all returns empty array', () => {
    expect(VisitedScenes.all()).toEqual([])
  })

  it('clear does not throw', () => {
    expect(() => VisitedScenes.clear()).not.toThrow()
  })
})

describe('VisitedScenes — with mocked localStorage', () => {
  let VisitedScenes
  let store

  beforeEach(async () => {
    store = {}
    const mockStorage = {
      getItem:    vi.fn(k => store[k] ?? null),
      setItem:    vi.fn((k, v) => { store[k] = v }),
      removeItem: vi.fn(k => { delete store[k] }),
    }
    vi.stubGlobal('localStorage', mockStorage)
    vi.resetModules()
    ;({ VisitedScenes } = await import('../ui/VisitedScenes.js'))
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('mark writes a key to storage', () => {
    VisitedScenes.mark('WorldScene')
    const stored = JSON.parse(store[VISITED_KEY])
    expect(stored.WorldScene).toBe(true)
  })

  it('has returns true after mark', () => {
    store[VISITED_KEY] = JSON.stringify({ DungeonScene: true })
    expect(VisitedScenes.has('DungeonScene')).toBe(true)
  })

  it('has returns false for unmarked key', () => {
    store[VISITED_KEY] = JSON.stringify({ DungeonScene: true })
    expect(VisitedScenes.has('WorldScene')).toBe(false)
  })

  it('all returns array of visited keys', () => {
    store[VISITED_KEY] = JSON.stringify({ A: true, B: true })
    const result = VisitedScenes.all()
    expect(result).toContain('A')
    expect(result).toContain('B')
  })

  it('clear removes the storage key', () => {
    store[VISITED_KEY] = JSON.stringify({ X: true })
    VisitedScenes.clear()
    expect(store[VISITED_KEY]).toBeUndefined()
  })

  it('handles corrupt JSON gracefully', () => {
    store[VISITED_KEY] = '{bad json}}}'
    expect(() => VisitedScenes.all()).not.toThrow()
    expect(VisitedScenes.all()).toEqual([])
  })

  it('mark accumulates multiple keys', () => {
    VisitedScenes.mark('EastScene')
    VisitedScenes.mark('WestScene')
    const result = VisitedScenes.all()
    expect(result).toContain('EastScene')
    expect(result).toContain('WestScene')
  })
})
