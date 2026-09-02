import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// "new game" has to wipe both stores. The save holds progression flags; the
// visited map is a separate localStorage key, and leaving it behind made a
// fresh run's pause map show every room from the previous playthrough.
vi.mock('../ui/SaveState.js', () => ({
  SaveState: { clear: vi.fn(), save: vi.fn(), load: vi.fn(() => null), exists: vi.fn(() => false), registerCloudSync: vi.fn() },
}))
vi.mock('../ui/VisitedScenes.js', () => ({
  VisitedScenes: { clear: vi.fn(), mark: vi.fn(), all: vi.fn(() => []), has: vi.fn(() => false) },
}))

const { SaveState }     = await import('../ui/SaveState.js')
const { VisitedScenes } = await import('../ui/VisitedScenes.js')
const { MenuScene }     = await import('../scenes/MenuScene.js')

function makeMenu() {
  const scene = new MenuScene()
  scene._addMessage = vi.fn()
  scene._startGame  = vi.fn()
  return scene
}

describe('MenuScene — new game', () => {
  const realSetTimeout = global.setTimeout

  beforeEach(() => {
    vi.clearAllMocks()
    global.setTimeout = (fn) => fn()
  })
  afterEach(() => { global.setTimeout = realSetTimeout })

  it('clears the save', () => {
    makeMenu()._process('new game')
    expect(SaveState.clear).toHaveBeenCalled()
  })

  it('clears the visited-scene map so the pause map starts blank', () => {
    makeMenu()._process('new game')
    expect(VisitedScenes.clear).toHaveBeenCalled()
  })

  it('starts the game after wiping', () => {
    const scene = makeMenu()
    scene._process('new game')
    expect(scene._startGame).toHaveBeenCalled()
  })

  it('leaves both stores alone for a plain "play"', () => {
    makeMenu()._process('play')
    expect(SaveState.clear).not.toHaveBeenCalled()
    expect(VisitedScenes.clear).not.toHaveBeenCalled()
  })
})
