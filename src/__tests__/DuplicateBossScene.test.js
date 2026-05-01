import { describe, it, expect, vi } from 'vitest'
import { makeScene } from '../__mocks__/phaser.js'
import { DuplicateBossScene } from '../scenes/west/DuplicateBossScene.js'
import Phaser from '../__mocks__/phaser.js'

function makeDuplicate(slopState = {}) {
  const s = new DuplicateBossScene()
  Object.assign(s, makeScene())
  s.init({ slopState })
  s.create()
  return s
}

describe('DuplicateBossScene — init', () => {
  it('initialises scores to 0', () => {
    const s = makeDuplicate()
    expect(s._playerScore).toBe(0)
    expect(s._indexerScore).toBe(0)
  })

  it('stores slopState', () => {
    const s = makeDuplicate({ coinCount: 5 })
    expect(s._slopState.coinCount).toBe(5)
  })

  it('starts with game not active', () => {
    const s = makeDuplicate()
    expect(s._gameActive).toBe(false)
  })

  it('defaults missing data', () => {
    const s = new DuplicateBossScene()
    s.init(undefined)
    expect(s._slopState).toEqual({})
  })
})

describe('DuplicateBossScene — _respawn', () => {
  it('resets object position and velocity', () => {
    const s = makeDuplicate()
    const obj = { x: 999, y: 999, body: { setVelocity: vi.fn() } }
    s._respawn(obj, { x: 100, y: 200 })
    expect(obj.x).toBe(100)
    expect(obj.y).toBe(200)
    expect(obj.body.setVelocity).toHaveBeenCalledWith(0, 0)
  })

  it('handles missing body gracefully', () => {
    const s = makeDuplicate()
    const obj = { x: 0, y: 0 }
    expect(() => s._respawn(obj, { x: 50, y: 50 })).not.toThrow()
  })
})

describe('DuplicateBossScene — _respawnAll', () => {
  it('resets player and both indexers to spawn positions', () => {
    const s = makeDuplicate()
    s._player   = { x: 999, y: 999, body: { setVelocity: vi.fn() } }
    s._indexer1 = { x: 999, y: 999, body: { setVelocity: vi.fn() } }
    s._indexer2 = { x: 999, y: 999, body: { setVelocity: vi.fn() } }
    s._playerSpawn   = { x: 400, y: 400 }
    s._indexer1Spawn = { x: 160, y: 400 }
    s._indexer2Spawn = { x: 640, y: 400 }
    s._respawnAll()
    expect(s._player.x).toBe(400)
    expect(s._indexer1.x).toBe(160)
    expect(s._indexer2.x).toBe(640)
  })
})

describe('DuplicateBossScene — _startGame', () => {
  it('sets _gameActive to true', () => {
    const s = makeDuplicate()
    s._player   = { x: 0, y: 0, body: { setVelocity: vi.fn() } }
    s._indexer1 = { x: 0, y: 0, body: { setVelocity: vi.fn(), setVelocityX: vi.fn(), setVelocityY: vi.fn() } }
    s._indexer2 = { x: 0, y: 0, body: { setVelocity: vi.fn(), setVelocityX: vi.fn(), setVelocityY: vi.fn() } }
    s._startGame()
    expect(s._gameActive).toBe(true)
  })

  it('starts two indexer AI timers', () => {
    const s = makeDuplicate()
    s._player   = { x: 0, y: 0, body: { setVelocity: vi.fn() } }
    s._indexer1 = { x: 0, y: 0, body: { setVelocity: vi.fn(), setVelocityX: vi.fn(), setVelocityY: vi.fn() } }
    s._indexer2 = { x: 0, y: 0, body: { setVelocity: vi.fn(), setVelocityX: vi.fn(), setVelocityY: vi.fn() } }
    s._startGame()
    expect(s.time.addEvent).toHaveBeenCalledTimes(2)
  })
})

describe('DuplicateBossScene — _indexerTick', () => {
  it('does nothing when game is not active', () => {
    const s = makeDuplicate()
    s._gameActive = false
    const idx = { y: 400, body: { velocity: { y: 0 }, setVelocityY: vi.fn(), setVelocityX: vi.fn() } }
    s._player = { x: 400, y: 100 }
    s._indexerTick(idx)
    expect(idx.body.setVelocityY).not.toHaveBeenCalled()
  })

  it('flaps when indexer is below player', () => {
    const s = makeDuplicate()
    s._gameActive = true
    const idx = { x: 300, y: 400, body: { velocity: { y: 0 }, setVelocityY: vi.fn(), setVelocityX: vi.fn() } }
    s._player = { x: 300, y: 100 }
    s._indexerTick(idx)
    expect(idx.body.setVelocityY).toHaveBeenCalled()
    expect(idx.body.setVelocityY.mock.calls[0][0]).toBeLessThan(0)
  })

  it('does not flap when velocity is already very negative', () => {
    const s = makeDuplicate()
    s._gameActive = true
    const idx = { x: 300, y: 400, body: { velocity: { y: -200 }, setVelocityY: vi.fn(), setVelocityX: vi.fn() } }
    s._player = { x: 300, y: 100 }
    s._indexerTick(idx)
    expect(idx.body.setVelocityY).not.toHaveBeenCalled()
  })

  it('chases player horizontally', () => {
    const s = makeDuplicate()
    s._gameActive = true
    const idx = { x: 200, y: 100, body: { velocity: { y: 0 }, setVelocityY: vi.fn(), setVelocityX: vi.fn() } }
    s._player = { x: 400, y: 100 }
    s._indexerTick(idx)
    expect(idx.body.setVelocityX).toHaveBeenCalledWith(expect.any(Number))
  })
})

describe('DuplicateBossScene — _handleClash', () => {
  function makeClash(playerY, indexerY) {
    const s = makeDuplicate()
    s._gameActive = true
    s._player = { x: 300, y: playerY, body: { setVelocity: vi.fn() } }
    const idx  = { x: 310, y: indexerY, body: { setVelocity: vi.fn() } }
    s._playerScoreText  = { setText: vi.fn() }
    s._indexerScoreText = { setText: vi.fn() }
    s._indexerTimer1 = { remove: vi.fn() }
    s._indexerTimer2 = { remove: vi.fn() }
    return { s, idx }
  }

  it('increments player score when player is higher (lower y)', () => {
    const { s, idx } = makeClash(200, 260)   // diff = 60 > 20
    s._handleClash(idx)
    expect(s._playerScore).toBe(1)
  })

  it('increments indexer score when indexer is higher', () => {
    const { s, idx } = makeClash(260, 200)   // diff = -60 < -20
    s._handleClash(idx)
    expect(s._indexerScore).toBe(1)
  })

  it('scores nothing when within 20px of each other', () => {
    const { s, idx } = makeClash(300, 310)   // diff = 10, within range
    s._handleClash(idx)
    expect(s._playerScore).toBe(0)
    expect(s._indexerScore).toBe(0)
  })

  it('ignores clash when game is not active', () => {
    const { s, idx } = makeClash(200, 260)
    s._gameActive = false
    s._handleClash(idx)
    expect(s._playerScore).toBe(0)
  })
})

describe('DuplicateBossScene — _pauseAndContinue', () => {
  function makePC(playerScore, indexerScore) {
    const s = makeDuplicate()
    s._gameActive   = true
    s._playerScore  = playerScore
    s._indexerScore = indexerScore
    s._indexerTimer1 = { remove: vi.fn() }
    s._indexerTimer2 = { remove: vi.fn() }
    s._dialogue      = { show: vi.fn(), update: vi.fn(), active: false }
    s._player   = { x: 400, y: 400, body: { setVelocity: vi.fn() } }
    s._indexer1 = { x: 160, y: 400, body: { setVelocity: vi.fn(), setVelocityX: vi.fn(), setVelocityY: vi.fn() } }
    s._indexer2 = { x: 640, y: 400, body: { setVelocity: vi.fn(), setVelocityX: vi.fn(), setVelocityY: vi.fn() } }
    return s
  }

  it('schedules win dialogue when player reaches 3', () => {
    const s = makePC(3, 0)
    s._pauseAndContinue(true)
    expect(s.time.delayedCall).toHaveBeenCalled()
    expect(s._gameActive).toBe(false)
  })

  it('fires win dialogue callback which triggers cameras.main.fade', () => {
    const s = makePC(3, 0)
    s._pauseAndContinue(true)
    const delayCb = s.time.delayedCall.mock.calls.at(-1)[1]
    delayCb()
    expect(s._dialogue.show).toHaveBeenCalledWith('the duplicate', expect.any(Array), expect.any(Function))
    const dialogueCb = s._dialogue.show.mock.calls[0][2]
    dialogueCb()
    expect(s.cameras.main.fade).toHaveBeenCalled()
  })

  it('schedules and fires lose dialogue when indexer reaches 3', () => {
    const s = makePC(0, 3)
    s._pauseAndContinue(false)
    expect(s._gameActive).toBe(false)
    const delayCb = s.time.delayedCall.mock.calls.at(-1)[1]
    delayCb()
    expect(s._dialogue.show).toHaveBeenCalledWith('the duplicate', expect.any(Array), expect.any(Function))
  })

  it('shows quip and re-activates game when neither at 3', () => {
    const s = makePC(1, 0)
    s._pauseAndContinue(true)
    const delayCb = s.time.delayedCall.mock.calls.at(-1)[1]
    delayCb()
    expect(s._dialogue.show).toHaveBeenCalled()
    const dialogueCb = s._dialogue.show.mock.calls[0][2]
    dialogueCb()
    expect(s._gameActive).toBe(true)
  })
})

describe('DuplicateBossScene — transitions', () => {
  function makeTransition(slopState = {}) {
    const s = makeDuplicate(slopState)
    s._indexerTimer1 = { remove: vi.fn() }
    s._indexerTimer2 = { remove: vi.fn() }
    return s
  }

  it('_winTransition fades and starts WestC3Scene with westDungeonCleared', () => {
    const s = makeTransition()
    s._winTransition()
    expect(s.cameras.main.fade).toHaveBeenCalled()
    const fadeCb = s.cameras.main.fade.mock.calls[0][5]
    fadeCb(null, 1)
    expect(s.scene.start).toHaveBeenCalledWith('WestC3Scene', expect.objectContaining({
      slopState: expect.objectContaining({ westDungeonCleared: true }),
    }))
  })

  it('_loseTransition fades and starts WestC3Scene without setting westDungeonCleared', () => {
    const s = makeTransition()
    s._loseTransition()
    expect(s.cameras.main.fade).toHaveBeenCalled()
    const fadeCb = s.cameras.main.fade.mock.calls[0][5]
    fadeCb(null, 1)
    expect(s.scene.start).toHaveBeenCalledWith('WestC3Scene', expect.any(Object))
    const [, data] = s.scene.start.mock.calls[0]
    expect(data.slopState.westDungeonCleared).toBeFalsy()
  })

  it('_winTransition does not fire twice (transitioning guard)', () => {
    const s = makeTransition()
    s._winTransition()
    s._winTransition()
    expect(s.cameras.main.fade).toHaveBeenCalledTimes(1)
  })
})

describe('DuplicateBossScene — update', () => {
  it('does not throw when game is not active', () => {
    const s = makeDuplicate()
    s._gameActive = false
    s._dialogue = { update: vi.fn(), active: false }
    expect(() => s.update()).not.toThrow()
  })

  it('applies flap velocity when up key is pressed', () => {
    const s = makeDuplicate()
    s._gameActive = true
    s._dialogue = { update: vi.fn(), active: false }
    s._player    = { x: 400, y: 400, body: { setVelocityY: vi.fn(), setVelocityX: vi.fn() } }
    s._indexer1  = { x: 160, y: 400 }
    s._indexer2  = { x: 640, y: 400 }
    s._playerLance   = { x: 0, y: 0 }
    s._indexer1Lance = { x: 0, y: 0 }
    s._indexer2Lance = { x: 0, y: 0 }
    vi.mocked(Phaser.Input.Keyboard.JustDown).mockReturnValueOnce(true)
    s.update()
    expect(s._player.body.setVelocityY).toHaveBeenCalledWith(expect.any(Number))
    expect(s._player.body.setVelocityY.mock.calls[0][0]).toBeLessThan(0)
  })

  it('syncs all three lance positions', () => {
    const s = makeDuplicate()
    s._gameActive = true
    s._dialogue = { update: vi.fn(), active: false }
    s._player   = { x: 200, y: 300, body: { setVelocityY: vi.fn(), setVelocityX: vi.fn() } }
    s._indexer1 = { x: 160, y: 350 }
    s._indexer2 = { x: 640, y: 360 }
    s._playerLance   = { x: 0, y: 0 }
    s._indexer1Lance = { x: 0, y: 0 }
    s._indexer2Lance = { x: 0, y: 0 }
    s.update()
    expect(s._playerLance.x).toBe(200)
    expect(s._indexer1Lance.x).toBe(160)
    expect(s._indexer2Lance.x).toBe(640)
  })

  it('moves left when left key is held', () => {
    const s = makeDuplicate()
    s._gameActive = true
    s._dialogue = { update: vi.fn(), active: false }
    s._leftKey  = { isDown: true }
    s._rightKey = { isDown: false }
    s._aKey     = { isDown: false }
    s._dKey     = { isDown: false }
    s._player   = { x: 400, y: 400, body: { setVelocityY: vi.fn(), setVelocityX: vi.fn() } }
    s._indexer1 = { x: 160, y: 400 }
    s._indexer2 = { x: 640, y: 400 }
    s._playerLance   = { x: 0, y: 0 }
    s._indexer1Lance = { x: 0, y: 0 }
    s._indexer2Lance = { x: 0, y: 0 }
    s.update()
    const vx = s._player.body.setVelocityX.mock.calls[0][0]
    expect(vx).toBeLessThan(0)
  })

  it('moves right when right key is held', () => {
    const s = makeDuplicate()
    s._gameActive = true
    s._dialogue = { update: vi.fn(), active: false }
    s._leftKey  = { isDown: false }
    s._rightKey = { isDown: true }
    s._aKey     = { isDown: false }
    s._dKey     = { isDown: false }
    s._player   = { x: 400, y: 400, body: { setVelocityY: vi.fn(), setVelocityX: vi.fn() } }
    s._indexer1 = { x: 160, y: 400 }
    s._indexer2 = { x: 640, y: 400 }
    s._playerLance   = { x: 0, y: 0 }
    s._indexer1Lance = { x: 0, y: 0 }
    s._indexer2Lance = { x: 0, y: 0 }
    s.update()
    const vx = s._player.body.setVelocityX.mock.calls[0][0]
    expect(vx).toBeGreaterThan(0)
  })

  it('zeros horizontal velocity when no movement key held', () => {
    const s = makeDuplicate()
    s._gameActive = true
    s._dialogue = { update: vi.fn(), active: false }
    s._leftKey  = { isDown: false }
    s._rightKey = { isDown: false }
    s._aKey     = { isDown: false }
    s._dKey     = { isDown: false }
    s._player   = { x: 400, y: 400, body: { setVelocityY: vi.fn(), setVelocityX: vi.fn() } }
    s._indexer1 = { x: 160, y: 400 }
    s._indexer2 = { x: 640, y: 400 }
    s._playerLance   = { x: 0, y: 0 }
    s._indexer1Lance = { x: 0, y: 0 }
    s._indexer2Lance = { x: 0, y: 0 }
    s.update()
    expect(s._player.body.setVelocityX).toHaveBeenCalledWith(0)
  })
})
