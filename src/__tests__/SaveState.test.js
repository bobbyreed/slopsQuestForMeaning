import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

// SaveState gracefully degrades when localStorage is absent.
// We test both the "storage available" path (by providing a mock)
// and the "no storage" path (covered by the module default in test env).

const SAVE_KEY = 'slop_save'

describe('SaveState — no localStorage (default test env)', () => {
  // In Node/vitest localStorage is undefined, so SaveState.storage is null.
  // All methods should be safe no-ops.

  let SaveState
  beforeEach(async () => {
    vi.resetModules()
    ;({ SaveState } = await import('../ui/SaveState.js'))
  })

  it('save does not throw', () => {
    expect(() => SaveState.save({ coinCount: 1 })).not.toThrow()
  })

  it('load returns null', () => {
    expect(SaveState.load()).toBeNull()
  })

  it('clear does not throw', () => {
    expect(() => SaveState.clear()).not.toThrow()
  })

  it('exists returns false', () => {
    expect(SaveState.exists()).toBe(false)
  })

  it('save with no state does not throw', () => {
    expect(() => SaveState.save(null)).not.toThrow()
  })
})

describe('SaveState — with mocked localStorage', () => {
  let SaveState
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
    ;({ SaveState } = await import('../ui/SaveState.js'))
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('save stores JSON in localStorage', () => {
    SaveState.save({ coinCount: 5 })
    expect(JSON.parse(store[SAVE_KEY])).toMatchObject({ coinCount: 5 })
  })

  it('load retrieves stored state', () => {
    store[SAVE_KEY] = JSON.stringify({ coinCount: 3, hasEyes: true })
    expect(SaveState.load()).toMatchObject({ coinCount: 3, hasEyes: true })
  })

  it('load returns null when nothing saved', () => {
    expect(SaveState.load()).toBeNull()
  })

  it('clear removes the stored key', () => {
    store[SAVE_KEY] = JSON.stringify({ coinCount: 1 })
    SaveState.clear()
    expect(store[SAVE_KEY]).toBeUndefined()
  })

  it('exists returns true when data is present', () => {
    store[SAVE_KEY] = JSON.stringify({ coinCount: 1 })
    expect(SaveState.exists()).toBe(true)
  })

  it('exists returns false when nothing is stored', () => {
    expect(SaveState.exists()).toBe(false)
  })
})
