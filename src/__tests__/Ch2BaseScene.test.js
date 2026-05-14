import { describe, it, expect, vi, beforeEach } from 'vitest'
import { makeScene }    from '../__mocks__/phaser.js'
import { Ch2BaseScene } from '../phaser/Ch2BaseScene.js'

vi.mock('../firestore/AnimConfig.js', () => ({
  AnimConfig: { loadAll: vi.fn().mockResolvedValue([]) },
}))

class TestScene extends Ch2BaseScene {
  constructor() { super('TestScene') }
  init(data) {
    this._slopState = data?.slopState || {}
    this._initSpriteState()
  }
  create() {
    this._platforms = this.physics.add.staticGroup()
  }
}

function makeBase(slopState = {}) {
  const s = new TestScene()
  Object.assign(s, makeScene())
  s.init({ slopState })
  s.create()
  return s
}

// ── _initSpriteState ──────────────────────────────────────────────────────────

describe('Ch2BaseScene — _initSpriteState', () => {
  it('initialises all sprite fields to defaults', () => {
    const s = makeBase()
    expect(s._sprite).toBeNull()
    expect(s._animPool).toEqual([])
    expect(s._activeAnimIdx).toBe(0)
    expect(s._animState).toBeNull()
    expect(s._spriteYOffset).toBe(0)
    expect(s._facing).toBe(1)
    expect(s._transitioning).toBe(false)
  })
})

// ── _canJump ──────────────────────────────────────────────────────────────────

describe('Ch2BaseScene — _canJump', () => {
  it('returns false when ch2JumpUnlocked is unset', () => {
    const s = makeBase()
    expect(s._canJump()).toBe(false)
  })

  it('returns false when explicitly false', () => {
    const s = makeBase({ ch2JumpUnlocked: false })
    expect(s._canJump()).toBe(false)
  })

  it('returns true when ch2JumpUnlocked is true', () => {
    const s = makeBase({ ch2JumpUnlocked: true })
    expect(s._canJump()).toBe(true)
  })
})

// ── _plat ─────────────────────────────────────────────────────────────────────

describe('Ch2BaseScene — _plat', () => {
  it('creates a rectangle and adds to physics + platform group', () => {
    const s = makeBase()
    const prevRect = s.add.rectangle.mock.calls.length
    s._plat(0, 500, 200, 48, 0x332244)
    expect(s.add.rectangle.mock.calls.length).toBeGreaterThan(prevRect)
    expect(s.physics.add.existing).toHaveBeenCalled()
    expect(s._platforms.add).toHaveBeenCalled()
  })
})

// ── _setAnimState ─────────────────────────────────────────────────────────────

describe('Ch2BaseScene — _setAnimState', () => {
  it('does nothing when no sprite', () => {
    const s = makeBase()
    expect(() => s._setAnimState('walk')).not.toThrow()
  })

  it('does not repeat the same state', () => {
    const s = makeBase()
    const spritePlay = vi.fn()
    s._sprite = { play: spritePlay, anims: { pause: vi.fn() } }
    s._animPool = [{ key: 'test-anim' }]
    s._animState = 'walk'
    s._setAnimState('walk')
    expect(spritePlay).not.toHaveBeenCalled()
  })

  it('calls play for walk state', () => {
    const s = makeBase()
    const spritePlay = vi.fn()
    s._sprite = { play: spritePlay, anims: { pause: vi.fn() } }
    s._animPool = [{ key: 'test-anim' }]
    s._setAnimState('walk')
    expect(spritePlay).toHaveBeenCalledWith('test-anim')
  })

  it('calls play for air state', () => {
    const s = makeBase()
    const spritePlay = vi.fn()
    s._sprite = { play: spritePlay, anims: { pause: vi.fn() } }
    s._animPool = [{ key: 'test-anim' }]
    s._setAnimState('air')
    expect(spritePlay).toHaveBeenCalledWith('test-anim')
  })

  it('calls pause for idle state', () => {
    const s = makeBase()
    const animsPause = vi.fn()
    s._sprite = { play: vi.fn(), anims: { pause: animsPause } }
    s._animPool = [{ key: 'test-anim' }]
    s._setAnimState('idle')
    expect(animsPause).toHaveBeenCalled()
  })
})

// ── _syncPlayerVisuals ────────────────────────────────────────────────────────

describe('Ch2BaseScene — _syncPlayerVisuals', () => {
  it('does nothing when player or sprite missing', () => {
    const s = makeBase()
    s._player = null
    expect(() => s._syncPlayerVisuals()).not.toThrow()
  })

  it('syncs sprite position to player', () => {
    const s = makeBase()
    s._player = { x: 200, y: 300 }
    const setFlipX = vi.fn()
    s._sprite = { x: 0, y: 0, setFlipX }
    s._spriteYOffset = 5
    s._facing = 1
    s._syncPlayerVisuals()
    expect(s._sprite.x).toBe(200)
    expect(s._sprite.y).toBe(305)
    expect(setFlipX).toHaveBeenCalledWith(false)
  })

  it('flips sprite when facing left', () => {
    const s = makeBase()
    s._player = { x: 200, y: 300 }
    const setFlipX = vi.fn()
    s._sprite = { x: 0, y: 0, setFlipX }
    s._spriteYOffset = 0
    s._facing = -1
    s._syncPlayerVisuals()
    expect(setFlipX).toHaveBeenCalledWith(true)
  })
})

// ── _preloadSheets ────────────────────────────────────────────────────────────

describe('Ch2BaseScene — _preloadSheets', () => {
  it('does nothing when all textures already exist', () => {
    const s = makeBase()
    s.textures.exists.mockReturnValue(true)
    s._preloadSheets('ch2-bg-void-ruins-v1-chatgpt')
    expect(s.load.image).not.toHaveBeenCalled()
  })

  it('queues images when textures are missing', () => {
    const s = makeBase()
    s.textures.exists.mockReturnValue(false)
    s._preloadSheets('ch2-bg-void-ruins-v1-chatgpt')
    expect(s.load.image).toHaveBeenCalled()
    expect(s.load.on).toHaveBeenCalled()
  })

  it('queues bg image when only bg is missing', () => {
    const s = makeBase()
    // Sheet textures exist, only bg missing
    s.textures.exists.mockImplementation(k => k !== 'ch2-bg-void-ruins-v1-chatgpt')
    s._preloadSheets('ch2-bg-void-ruins-v1-chatgpt')
    expect(s.load.image).toHaveBeenCalledWith(
      'ch2-bg-void-ruins-v1-chatgpt',
      expect.stringContaining('ch2-bg-void-ruins-v1-chatgpt.png')
    )
  })
})

// ── _registerAnim ─────────────────────────────────────────────────────────────

describe('Ch2BaseScene — _registerAnim', () => {
  it('returns early if proc texture does not exist', () => {
    const s = makeBase()
    s.textures.exists.mockReturnValue(false)
    const cfg = { sheetKey: 'test-sheet', frames: [{ x: 0, y: 0, w: 32, h: 32 }], frameRate: 8 }
    expect(() => s._registerAnim('my-anim', cfg)).not.toThrow()
    expect(s.anims.create).not.toHaveBeenCalled()
  })

  it('registers frames and creates animation when proc texture exists', () => {
    const s = makeBase()
    const mockTex = { has: vi.fn(() => false), add: vi.fn() }
    s.textures.exists.mockReturnValue(true)
    s.textures.get.mockReturnValue(mockTex)
    s.anims.exists.mockReturnValue(false)
    const cfg = { sheetKey: 'test-sheet', frames: [{ x: 0, y: 0, w: 32, h: 32 }], frameRate: 8 }
    s._registerAnim('my-anim', cfg)
    expect(mockTex.add).toHaveBeenCalled()
    expect(s.anims.create).toHaveBeenCalledWith(expect.objectContaining({ key: 'my-anim' }))
  })

  it('does not recreate existing animation', () => {
    const s = makeBase()
    const mockTex = { has: vi.fn(() => true), add: vi.fn() }
    s.textures.exists.mockReturnValue(true)
    s.textures.get.mockReturnValue(mockTex)
    s.anims.exists.mockReturnValue(true)
    const cfg = { sheetKey: 'test-sheet', frames: [{ x: 0, y: 0, w: 32, h: 32 }], frameRate: 8 }
    s._registerAnim('my-anim', cfg)
    expect(s.anims.create).not.toHaveBeenCalled()
  })
})

// ── _attachSprite ─────────────────────────────────────────────────────────────

describe('Ch2BaseScene — _attachSprite', () => {
  it('returns early if proc texture does not exist', () => {
    const s = makeBase()
    s._player = { x: 100, y: 400, setAlpha: vi.fn() }
    s.textures.exists.mockReturnValue(false)
    const cfg = { sheetKey: 'test-sheet', frames: [{ x: 0, y: 0, w: 32, h: 32 }] }
    s._animPool = [{ key: 'my-anim' }]
    expect(() => s._attachSprite(cfg)).not.toThrow()
    expect(s.add.sprite).not.toHaveBeenCalled()
  })

  it('creates sprite and hides player when texture exists', () => {
    const s = makeBase()
    const setAlpha = vi.fn()
    s._player = { x: 100, y: 400, setAlpha }
    s.textures.exists.mockReturnValue(true)
    s.anims.exists.mockReturnValue(false)
    const cfg = { sheetKey: 'test-sheet', frames: [{ x: 0, y: 0, w: 60, h: 80 }] }
    s._animPool = [{ key: 'my-anim', cfg }]
    s._attachSprite(cfg)
    expect(s.add.sprite).toHaveBeenCalled()
    expect(setAlpha).toHaveBeenCalledWith(0)
  })

  it('destroys existing sprite before creating new one', () => {
    const s = makeBase()
    const oldDestroy = vi.fn()
    s._sprite = { active: true, destroy: oldDestroy }
    s._player = { x: 100, y: 400, setAlpha: vi.fn() }
    s.textures.exists.mockReturnValue(true)
    const cfg = { sheetKey: 'test-sheet', frames: [{ x: 0, y: 0, w: 32, h: 32 }] }
    s._animPool = [{ key: 'my-anim', cfg }]
    s._attachSprite(cfg)
    expect(oldDestroy).toHaveBeenCalled()
  })
})

// ── _loadAnimConfigs ──────────────────────────────────────────────────────────

describe('Ch2BaseScene — _loadAnimConfigs', () => {
  it('resolves without throwing when configs is empty', async () => {
    const s = makeBase()
    s._player = { x: 100, y: 400, setAlpha: vi.fn() }
    await expect(s._loadAnimConfigs('test')).resolves.not.toThrow()
  })

  it('calls _onAnimsLoaded after resolution', async () => {
    const s = makeBase()
    s._player = { x: 100, y: 400, setAlpha: vi.fn() }
    const onAnimsLoaded = vi.fn()
    s._onAnimsLoaded = onAnimsLoaded
    await s._loadAnimConfigs('test')
    expect(onAnimsLoaded).toHaveBeenCalled()
  })
})

// ── _sceneTransition ──────────────────────────────────────────────────────────

describe('Ch2BaseScene — _sceneTransition', () => {
  it('calls cameras.main.fade', () => {
    const s = makeBase()
    s._sceneTransition('SomeScene', {})
    expect(s.cameras.main.fade).toHaveBeenCalled()
  })

  it('sets _transitioning to true', () => {
    const s = makeBase()
    s._sceneTransition('SomeScene', {})
    expect(s._transitioning).toBe(true)
  })

  it('does not double-transition', () => {
    const s = makeBase()
    s._sceneTransition('SomeScene', {})
    s._sceneTransition('OtherScene', {})
    expect(s.cameras.main.fade.mock.calls.length).toBe(1)
  })

  it('starts target scene on fade complete', () => {
    const s = makeBase()
    s.cameras.main.fade.mockImplementation((_, r, g, b, _fromBlack, cb) => cb(null, 1))
    s._sceneTransition('TargetScene', { slopState: { x: 1 } })
    expect(s.scene.start).toHaveBeenCalledWith('TargetScene', { slopState: { x: 1 } })
  })
})
