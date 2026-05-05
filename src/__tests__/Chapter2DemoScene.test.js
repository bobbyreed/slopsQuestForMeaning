import { describe, it, expect, vi } from 'vitest'
import { makeScene } from '../__mocks__/phaser.js'
import { Chapter2DemoScene } from '../scenes/Chapter2DemoScene.js'
import Phaser from '../__mocks__/phaser.js'

function makeDemo(slopState = {}) {
  const s = new Chapter2DemoScene()
  Object.assign(s, makeScene())
  s.init({ slopState })
  s.create()
  return s
}

// ── init ──────────────────────────────────────────────────────────────────────

describe('Chapter2DemoScene — init', () => {
  it('stores slopState', () => {
    const s = makeDemo({ coinCount: 7 })
    expect(s._slopState.coinCount).toBe(7)
  })

  it('defaults missing slopState', () => {
    const s = new Chapter2DemoScene()
    s.init(undefined)
    expect(s._slopState).toEqual({})
  })

  it('initialises facing right', () => {
    const s = makeDemo()
    expect(s._facing).toBe(1)
  })

  it('initialises all cooldowns at 0', () => {
    const s = makeDemo()
    expect(s._meleeCooldown).toBe(0)
    expect(s._corruptCD).toBe(0)
    expect(s._hitImmunity).toBe(0)
  })

  it('starts with no enemies in list', () => {
    // After create() enemies are spawned, but before create() the array is empty
    const s = new Chapter2DemoScene()
    s.init({})
    expect(s._enemies).toHaveLength(0)
  })
})

// ── create ────────────────────────────────────────────────────────────────────

describe('Chapter2DemoScene — create', () => {
  it('does not throw', () => {
    expect(() => makeDemo()).not.toThrow()
  })

  it('spawns enemies from ENEMY_DEFS', () => {
    const s = makeDemo()
    expect(s._enemies.length).toBeGreaterThan(0)
  })

  it('creates a player rectangle', () => {
    const s = makeDemo()
    expect(s._player).toBeDefined()
  })
})

// ── _spawnPlayer ──────────────────────────────────────────────────────────────

describe('Chapter2DemoScene — _spawnPlayer', () => {
  it('creates player, head, arm, and label', () => {
    const s = makeDemo()
    expect(s._player).toBeDefined()
    expect(s._head).toBeDefined()
    expect(s._arm).toBeDefined()
    expect(s._playerLabel).toBeDefined()
  })
})

// ── _spawnEnemy ───────────────────────────────────────────────────────────────

describe('Chapter2DemoScene — _spawnEnemy', () => {
  it('gives walker 1 hp', () => {
    const s = makeDemo()
    const walker = s._enemies.find(e => e._type === 'walker')
    expect(walker?._hp).toBe(1)
  })

  it('gives armored 2 hp', () => {
    const s = makeDemo()
    const armored = s._enemies.find(e => e._type === 'armored')
    expect(armored?._hp).toBe(2)
  })

  it('armored enemies have a hpBar', () => {
    const s = makeDemo()
    const armored = s._enemies.find(e => e._type === 'armored')
    expect(armored?._hpBar).toBeDefined()
  })

  it('walker enemies do not have a hpBar', () => {
    const s = makeDemo()
    const walker = s._enemies.find(e => e._type === 'walker')
    expect(walker?._hpBar).toBeUndefined()
  })
})

// ── _doMeleeAttack ────────────────────────────────────────────────────────────

describe('Chapter2DemoScene — _doMeleeAttack', () => {
  function makeAttack() {
    const s = makeDemo()
    s._player = { x: 300, y: 400, body: { setVelocityX: vi.fn(), setVelocityY: vi.fn(), velocity: { x: 0, y: 0 }, blocked: { down: true } }, active: true, setAlpha: vi.fn(), setFillStyle: vi.fn() }
    s._arm    = { setAlpha: vi.fn(), x: 0, y: 0 }
    s._facing = 1
    s._enemies = []
    return s
  }

  it('does nothing when on cooldown', () => {
    const s = makeAttack()
    s._meleeCooldown = 200
    s._doMeleeAttack()
    expect(s._arm.setAlpha).not.toHaveBeenCalled()
  })

  it('sets meleeCooldown after attack', () => {
    const s = makeAttack()
    s._doMeleeAttack()
    expect(s._meleeCooldown).toBeGreaterThan(0)
  })

  it('sets meleeFlash after attack', () => {
    const s = makeAttack()
    s._doMeleeAttack()
    expect(s._meleeFlash).toBeGreaterThan(0)
  })

  it('shows the arm', () => {
    const s = makeAttack()
    s._doMeleeAttack()
    expect(s._arm.setAlpha).toHaveBeenCalledWith(expect.any(Number))
  })

  it('hits enemy in facing direction within range', () => {
    const s = makeAttack()
    s._facing = 1
    const enemy = {
      x: 330, y: 400, active: true,
      _hp: 1, _maxHp: 1, _type: 'walker', _defIdx: 0,
      _hpBar: null,
      setAlpha: vi.fn(),
      destroy: vi.fn(),
    }
    s._enemies = [enemy]
    s._hitEnemy = vi.fn()
    s._doMeleeAttack()
    expect(s._hitEnemy).toHaveBeenCalledWith(enemy, 1)
  })

  it('does not hit enemy in wrong direction', () => {
    const s = makeAttack()
    s._facing = 1   // facing right
    const enemy = {
      x: 250, y: 400, active: true,   // enemy is to the LEFT
      _hp: 1, _maxHp: 1, _type: 'walker', _defIdx: 0,
      _hpBar: null,
      setAlpha: vi.fn(),
    }
    s._enemies = [enemy]
    s._hitEnemy = vi.fn()
    s._doMeleeAttack()
    expect(s._hitEnemy).not.toHaveBeenCalled()
  })

  it('does not hit enemy too far away', () => {
    const s = makeAttack()
    s._facing = 1
    const enemy = {
      x: 500, y: 400, active: true,   // too far
      _hp: 1, _maxHp: 1, _type: 'walker', _defIdx: 0,
      _hpBar: null,
      setAlpha: vi.fn(),
    }
    s._enemies = [enemy]
    s._hitEnemy = vi.fn()
    s._doMeleeAttack()
    expect(s._hitEnemy).not.toHaveBeenCalled()
  })
})

// ── _doCorruptAoE ─────────────────────────────────────────────────────────────

describe('Chapter2DemoScene — _doCorruptAoE', () => {
  function makeAoE() {
    const s = makeDemo()
    s._player  = { x: 400, y: 300, active: true, setFillStyle: vi.fn() }
    s._enemies = []
    return s
  }

  it('does nothing when on cooldown', () => {
    const s = makeAoE()
    s._corruptCD = 1000
    const before = s.tweens.add.mock.calls.length
    s._doCorruptAoE()
    expect(s.tweens.add.mock.calls.length).toBe(before)
  })

  it('sets corruptCD after use', () => {
    const s = makeAoE()
    s._doCorruptAoE()
    expect(s._corruptCD).toBeGreaterThan(0)
  })

  it('creates expanding ring visual', () => {
    const s = makeAoE()
    s._doCorruptAoE()
    expect(s.tweens.add).toHaveBeenCalled()
  })

  it('hits enemy within radius', () => {
    const s = makeAoE()
    const enemy = {
      x: 450, y: 310, active: true,
      _hp: 2, _maxHp: 2, _type: 'armored', _defIdx: 0,
      _hpBar: { scaleX: 1, setFillStyle: vi.fn(), destroy: vi.fn() },
      setAlpha: vi.fn(),
      destroy: vi.fn(),
    }
    s._enemies = [enemy]
    s._hitEnemy = vi.fn()
    s._doCorruptAoE()
    expect(s._hitEnemy).toHaveBeenCalledWith(enemy, 1)
  })

  it('does not hit enemy outside radius', () => {
    const s = makeAoE()
    const enemy = {
      x: 600, y: 300, active: true,   // > 88px away
      _hp: 1, _maxHp: 1, _type: 'walker', _defIdx: 0,
      setAlpha: vi.fn(),
    }
    s._enemies = [enemy]
    s._hitEnemy = vi.fn()
    s._doCorruptAoE()
    expect(s._hitEnemy).not.toHaveBeenCalled()
  })
})

// ── _hitEnemy ────────────────────────────────────────────────────────────────

describe('Chapter2DemoScene — _hitEnemy', () => {
  function makeEnemy(hp = 1, type = 'walker') {
    return {
      x: 400, y: 300, active: true,
      _hp: hp, _maxHp: hp, _type: type, _defIdx: 0,
      _hpBar: type === 'armored' ? { scaleX: 1, setFillStyle: vi.fn(), destroy: vi.fn() } : undefined,
      setAlpha: vi.fn(),
      destroy: vi.fn(),
    }
  }

  it('reduces hp by dmg', () => {
    const s = makeDemo()
    const e = makeEnemy(2, 'armored')
    s._hitEnemy(e, 1)
    expect(e._hp).toBe(1)
  })

  it('schedules kill when hp reaches 0', () => {
    const s = makeDemo()
    const e = makeEnemy(1, 'walker')
    s._hitEnemy(e, 1)
    expect(s.time.delayedCall).toHaveBeenCalled()
  })

  it('does nothing for inactive enemies', () => {
    const s = makeDemo()
    const e = makeEnemy(1)
    e.active = false
    s._hitEnemy(e, 1)
    expect(e._hp).toBe(1)
  })

  it('updates hpBar scaleX for armored', () => {
    const s = makeDemo()
    const e = makeEnemy(2, 'armored')
    s._hitEnemy(e, 1)
    expect(e._hpBar.scaleX).toBe(0.5)
  })
})

// ── _killEnemy ───────────────────────────────────────────────────────────────

describe('Chapter2DemoScene — _killEnemy', () => {
  function makeKillEnemy(s, type = 'walker') {
    const e = {
      x: 400, y: 300, active: true,
      _hp: 0, _maxHp: 1, _type: type, _defIdx: 0,
      _hpBar: type === 'armored' ? { destroy: vi.fn() } : undefined,
      setAlpha: vi.fn(),
      destroy: vi.fn(),
    }
    s._enemies = [e]
    return e
  }

  it('removes enemy from _enemies array', () => {
    const s = makeDemo()
    const e = makeKillEnemy(s)
    s._killEnemy(e)
    expect(s._enemies).not.toContain(e)
  })

  it('destroys the enemy', () => {
    const s = makeDemo()
    const e = makeKillEnemy(s)
    s._killEnemy(e)
    expect(e.destroy).toHaveBeenCalled()
  })

  it('schedules respawn', () => {
    const s = makeDemo()
    const e = makeKillEnemy(s)
    s._killEnemy(e)
    expect(s.time.delayedCall).toHaveBeenCalled()
  })

  it('destroys hpBar for armored enemies', () => {
    const s = makeDemo()
    const e = makeKillEnemy(s, 'armored')
    s._killEnemy(e)
    expect(e._hpBar.destroy).toHaveBeenCalled()
  })

  it('does nothing for already-inactive enemy', () => {
    const s = makeDemo()
    const e = makeKillEnemy(s)
    e.active = false
    const before = s.time.delayedCall.mock.calls.length
    s._killEnemy(e)
    expect(s.time.delayedCall.mock.calls.length).toBe(before)
  })

  it('respawn callback re-spawns the enemy at its original position', () => {
    const s = makeDemo()
    s._spawnEnemy = vi.fn()
    const e = makeKillEnemy(s)
    s._killEnemy(e)
    const respawnCb = s.time.delayedCall.mock.calls.at(-1)?.[1]
    respawnCb?.()
    expect(s._spawnEnemy).toHaveBeenCalled()
  })
})

// ── _onPlayerEnemyContact ────────────────────────────────────────────────────

describe('Chapter2DemoScene — _onPlayerEnemyContact', () => {
  it('does nothing when immunity active', () => {
    const s = makeDemo()
    s._hitImmunity = 500
    s._player = { x: 300, y: 300, body: { setVelocityX: vi.fn(), setVelocityY: vi.fn() }, active: true, setFillStyle: vi.fn() }
    const enemy = { x: 280, y: 300, active: true }
    s._onPlayerEnemyContact(enemy)
    expect(s._player.body.setVelocityX).not.toHaveBeenCalled()
  })

  it('applies knockback and sets immunity', () => {
    const s = makeDemo()
    s._hitImmunity = 0
    s._player = { x: 300, y: 300, body: { setVelocityX: vi.fn(), setVelocityY: vi.fn() }, active: true, setFillStyle: vi.fn() }
    const enemy = { x: 280, y: 300, active: true }
    s._onPlayerEnemyContact(enemy)
    expect(s._hitImmunity).toBeGreaterThan(0)
    expect(s._player.body.setVelocityX).toHaveBeenCalled()
  })

  it('does nothing for inactive enemy', () => {
    const s = makeDemo()
    s._player = { x: 300, y: 300, body: { setVelocityX: vi.fn(), setVelocityY: vi.fn() }, active: true, setFillStyle: vi.fn() }
    const enemy = { x: 280, y: 300, active: false }
    s._onPlayerEnemyContact(enemy)
    expect(s._player.body.setVelocityX).not.toHaveBeenCalled()
  })

  it('hit flash tween fires and restores alpha on complete', () => {
    const s = makeDemo()
    s._player = { x: 300, y: 300, body: { setVelocityX: vi.fn(), setVelocityY: vi.fn() }, active: true, setAlpha: vi.fn(), alpha: 1 }
    const enemy = { x: 280, y: 300, active: true }
    s._onPlayerEnemyContact(enemy)
    const tweenCall = s.tweens.add.mock.calls.at(-1)?.[0]
    expect(tweenCall?.targets).toBe(s._player)
    tweenCall?.onComplete?.()
    expect(s._player.setAlpha).toHaveBeenCalledWith(1)
  })
})

// ── update ────────────────────────────────────────────────────────────────────

describe('Chapter2DemoScene — update', () => {
  function makeUpdate() {
    const s = makeDemo()
    s._enemies = []
    s._player = {
      x: 300, y: 400, active: true,
      body: {
        velocity: { x: 0, y: 0 },
        blocked: { down: true, left: false, right: false },
        setVelocity: vi.fn(),
        setVelocityX: vi.fn(),
        setVelocityY: vi.fn(),
        setCollideWorldBounds: vi.fn(),
      },
      setAlpha: vi.fn(),
      setFillStyle: vi.fn(),
    }
    s._head  = { x: 0, y: 0 }
    s._arm   = { x: 0, y: 0, setAlpha: vi.fn() }
    s._playerLabel = { x: 0, y: 0 }
    s._meleeLabel  = { setText: vi.fn() }
    s._corruptLabel = { setText: vi.fn() }
    return s
  }

  it('moves right when right key held', () => {
    const s = makeUpdate()
    s._cursors.right.isDown = true
    s.update(null, 16)
    expect(s._player.body.setVelocityX).toHaveBeenCalledWith(expect.any(Number))
    const arg = s._player.body.setVelocityX.mock.calls[0][0]
    expect(arg).toBeGreaterThan(0)
    expect(s._facing).toBe(1)
  })

  it('moves left when left key held', () => {
    const s = makeUpdate()
    s._cursors.left.isDown = true
    s.update(null, 16)
    const arg = s._player.body.setVelocityX.mock.calls[0][0]
    expect(arg).toBeLessThan(0)
    expect(s._facing).toBe(-1)
  })

  it('jumps with SHIFT when grounded', () => {
    const s = makeUpdate()
    vi.mocked(Phaser.Input.Keyboard.JustDown).mockReturnValueOnce(true)
    s.update(null, 16)
    expect(s._player.body.setVelocityY).toHaveBeenCalledWith(expect.any(Number))
    const arg = s._player.body.setVelocityY.mock.calls[0][0]
    expect(arg).toBeLessThan(0)
  })

  it('does not jump when not grounded', () => {
    const s = makeUpdate()
    s._player.body.blocked.down = false
    vi.mocked(Phaser.Input.Keyboard.JustDown).mockReturnValueOnce(true)
    s.update(null, 16)
    expect(s._player.body.setVelocityY).not.toHaveBeenCalled()
  })

  it('triggers melee when Z pressed', () => {
    const s = makeUpdate()
    s._doMeleeAttack = vi.fn()
    vi.mocked(Phaser.Input.Keyboard.JustDown)
      .mockReturnValueOnce(false)  // shift
      .mockReturnValueOnce(true)   // Z
    s.update(null, 16)
    expect(s._doMeleeAttack).toHaveBeenCalled()
  })

  it('decrements cooldowns by delta', () => {
    const s = makeUpdate()
    s._meleeCooldown = 200
    s._corruptCD     = 1000
    s._hitImmunity   = 500
    s.update(null, 16)
    expect(s._meleeCooldown).toBe(184)
    expect(s._corruptCD).toBe(984)
    expect(s._hitImmunity).toBe(484)
  })

  it('hides arm when meleeFlash expires', () => {
    const s = makeUpdate()
    s._meleeFlash = 10
    s.update(null, 16)
    expect(s._arm.setAlpha).toHaveBeenCalledWith(0)
  })

  it('respawns player when fallen past H+80', () => {
    const s = makeUpdate()
    s._player.y = 800
    s._lastSafeX = 100
    s._lastSafeY = 500
    s.update(null, 16)
    expect(s._player.x).toBe(100)
    expect(s._player.y).toBe(450)
    expect(s._player.body.setVelocityX).toHaveBeenCalledWith(0)
  })

  it('does not throw when player body missing', () => {
    const s = makeDemo()
    s._player = null
    expect(() => s.update(null, 16)).not.toThrow()
  })

  it('walker AI reverses on right wall collision', () => {
    const s = makeUpdate()
    const enemy = {
      x: 300, y: 400, _dir: 1, _hpBar: null,
      body: { velocity: { x: 55, y: 0 }, blocked: { right: true, left: false }, setVelocityX: vi.fn() },
    }
    s._enemies = [enemy]
    s.update(null, 16)
    expect(enemy.body.setVelocityX).toHaveBeenCalledWith(-55)
    expect(enemy._dir).toBe(-1)
  })

  it('walker AI syncs hpBar position', () => {
    const s = makeUpdate()
    const hpBar = { x: 0, y: 0 }
    const enemy = {
      x: 350, y: 400, _dir: 1, _hpBar: hpBar,
      body: { velocity: { x: 0, y: 0 }, blocked: { right: false, left: false }, setVelocityX: vi.fn() },
    }
    s._enemies = [enemy]
    s.update(null, 16)
    expect(hpBar.x).toBe(350)
    expect(hpBar.y).toBe(380)
  })
})

// ── _syncPlayerVisuals ────────────────────────────────────────────────────────

describe('Chapter2DemoScene — _syncPlayerVisuals', () => {
  it('syncs head, arm, and label to player position', () => {
    const s = makeDemo()
    s._player = { x: 250, y: 350, active: true }
    s._head         = { x: 0, y: 0 }
    s._arm          = { x: 0, y: 0 }
    s._playerLabel  = { x: 0, y: 0 }
    s._syncPlayerVisuals()
    expect(s._head.x).toBe(250)
    expect(s._arm.y).toBe(346)   // py - 4
    expect(s._playerLabel.x).toBe(250)
  })
})

// ── _updateHUD ────────────────────────────────────────────────────────────────

describe('Chapter2DemoScene — _updateHUD', () => {
  it('shows "ready" when cooldowns are zero', () => {
    const s = makeDemo()
    s._meleeCooldown  = 0
    s._corruptCD      = 0
    s._meleeLabel   = { setText: vi.fn() }
    s._corruptLabel = { setText: vi.fn() }
    s._updateHUD()
    expect(s._meleeLabel.setText).toHaveBeenCalledWith('ready')
    expect(s._corruptLabel.setText).toHaveBeenCalledWith('ready')
  })

  it('shows countdown when on cooldown', () => {
    const s = makeDemo()
    s._meleeCooldown = 250
    s._corruptCD     = 1500
    s._meleeLabel   = { setText: vi.fn() }
    s._corruptLabel = { setText: vi.fn() }
    s._updateHUD()
    expect(s._meleeLabel.setText).not.toHaveBeenCalledWith('ready')
    expect(s._corruptLabel.setText).not.toHaveBeenCalledWith('ready')
  })
})
