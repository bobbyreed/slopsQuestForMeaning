import { describe, it, expect, vi } from 'vitest'
import { makeScene } from '../__mocks__/phaser.js'
import { WestJoustScene } from '../scenes/west/WestJoustScene.js'
import Phaser from '../__mocks__/phaser.js'

function makeWestJoust(slopState = {}) {
  const s = new WestJoustScene()
  Object.assign(s, makeScene())
  s.init({ slopState })
  s.create()
  return s
}

describe('WestJoustScene — init', () => {
  it('initialises scores to 0', () => {
    const s = makeWestJoust()
    expect(s._playerScore).toBe(0)
    expect(s._indexerScore).toBe(0)
  })

  it('stores slopState', () => {
    const s = makeWestJoust({ coinCount: 5 })
    expect(s._slopState.coinCount).toBe(5)
  })

  it('starts with game not active', () => {
    const s = makeWestJoust()
    expect(s._gameActive).toBe(false)
  })
})

describe('WestJoustScene — create with westGateCleared', () => {
  it('shows return dialogue and calls _winTransition when already cleared', () => {
    const s = makeWestJoust({ westGateCleared: true })
    s._dialogue = { show: vi.fn(), update: vi.fn(), active: false }
    const delayCb = s.time.delayedCall.mock.calls.at(-1)?.[1]
    delayCb?.()
    expect(s._dialogue.show).toHaveBeenCalledWith('the indexer', expect.any(Array), expect.any(Function))
  })
})

describe('WestJoustScene — _respawn', () => {
  it('resets object position', () => {
    const s = makeWestJoust()
    const obj = { x: 999, y: 999, body: { setVelocity: vi.fn() } }
    s._respawn(obj, { x: 100, y: 200 })
    expect(obj.x).toBe(100)
    expect(obj.y).toBe(200)
    expect(obj.body.setVelocity).toHaveBeenCalledWith(0, 0)
  })

  it('handles missing body gracefully', () => {
    const s = makeWestJoust()
    const obj = { x: 0, y: 0 }
    expect(() => s._respawn(obj, { x: 50, y: 50 })).not.toThrow()
  })
})

describe('WestJoustScene — _respawnBoth', () => {
  it('resets both player and indexer to spawn positions', () => {
    const s = makeWestJoust()
    s._player  = { x: 999, y: 999, body: { setVelocity: vi.fn() } }
    s._indexer = { x: 999, y: 999, body: { setVelocity: vi.fn() } }
    s._playerSpawn  = { x: 160, y: 400 }
    s._indexerSpawn = { x: 640, y: 400 }
    s._respawnBoth()
    expect(s._player.x).toBe(160)
    expect(s._indexer.x).toBe(640)
  })
})

describe('WestJoustScene — _startGame', () => {
  it('sets _gameActive to true', () => {
    const s = makeWestJoust()
    s._player  = { x: 0, y: 0, body: { setVelocity: vi.fn() } }
    s._indexer = { x: 0, y: 0, body: { setVelocity: vi.fn(), setVelocityX: vi.fn(), setVelocityY: vi.fn() } }
    s._startGame()
    expect(s._gameActive).toBe(true)
  })

  it('starts the indexer AI timer', () => {
    const s = makeWestJoust()
    s._player  = { x: 0, y: 0, body: { setVelocity: vi.fn() } }
    s._indexer = { x: 0, y: 0, body: { setVelocity: vi.fn(), setVelocityX: vi.fn(), setVelocityY: vi.fn() } }
    s._startGame()
    expect(s.time.addEvent).toHaveBeenCalled()
  })
})

describe('WestJoustScene — _indexerTick', () => {
  it('does nothing when game is not active', () => {
    const s = makeWestJoust()
    s._gameActive = false
    s._indexer = { y: 400, body: { velocity: { y: 0 }, setVelocityY: vi.fn(), setVelocityX: vi.fn() } }
    s._player  = { x: 400, y: 100 }
    s._indexerTick()
    expect(s._indexer.body.setVelocityY).not.toHaveBeenCalled()
  })

  it('flaps when indexer is below player', () => {
    const s = makeWestJoust()
    s._gameActive = true
    s._indexer = { x: 300, y: 400, body: { velocity: { y: 0 }, setVelocityY: vi.fn(), setVelocityX: vi.fn() } }
    s._player  = { x: 300, y: 100 }
    s._indexerTick()
    expect(s._indexer.body.setVelocityY).toHaveBeenCalled()
    const callArg = s._indexer.body.setVelocityY.mock.calls[0][0]
    expect(callArg).toBeLessThan(0)
  })

  it('does not flap when velocity is already very negative', () => {
    const s = makeWestJoust()
    s._gameActive = true
    s._indexer = { x: 300, y: 400, body: { velocity: { y: -200 }, setVelocityY: vi.fn(), setVelocityX: vi.fn() } }
    s._player  = { x: 300, y: 100 }
    s._indexerTick()
    expect(s._indexer.body.setVelocityY).not.toHaveBeenCalled()
  })

  it('chases player horizontally', () => {
    const s = makeWestJoust()
    s._gameActive = true
    s._indexer = { x: 200, y: 100, body: { velocity: { y: 0 }, setVelocityY: vi.fn(), setVelocityX: vi.fn() } }
    s._player  = { x: 400, y: 100 }
    s._indexerTick()
    expect(s._indexer.body.setVelocityX).toHaveBeenCalledWith(expect.any(Number))
  })
})

describe('WestJoustScene — _handleClash', () => {
  function makeClash(playerY, indexerY) {
    const s = makeWestJoust()
    s._gameActive = true
    s._player  = { x: 300, y: playerY,  body: { setVelocity: vi.fn() } }
    s._indexer = { x: 310, y: indexerY, body: { setVelocity: vi.fn() } }
    s._playerScoreText  = { setText: vi.fn() }
    s._indexerScoreText = { setText: vi.fn() }
    s._indexerTimer = { remove: vi.fn() }
    return s
  }

  it('increments player score when player is higher (lower y)', () => {
    const s = makeClash(200, 260)   // diff = 60 > 20
    s._handleClash()
    expect(s._playerScore).toBe(1)
  })

  it('increments indexer score when indexer is higher', () => {
    const s = makeClash(260, 200)   // diff = -60 < -20
    s._handleClash()
    expect(s._indexerScore).toBe(1)
  })

  it('scores nothing when within 20px of each other', () => {
    const s = makeClash(300, 310)   // diff = 10, within range
    s._handleClash()
    expect(s._playerScore).toBe(0)
    expect(s._indexerScore).toBe(0)
  })

  it('ignores clash when game is not active', () => {
    const s = makeClash(200, 260)
    s._gameActive = false
    s._handleClash()
    expect(s._playerScore).toBe(0)
  })
})

describe('WestJoustScene — _pauseAndContinue', () => {
  function makePC(playerScore, indexerScore) {
    const s = makeWestJoust()
    s._gameActive    = true
    s._playerScore   = playerScore
    s._indexerScore  = indexerScore
    s._indexerTimer  = { remove: vi.fn() }
    s._dialogue      = { show: vi.fn(), update: vi.fn(), active: false }
    s._player  = { x: 160, y: 400, body: { setVelocity: vi.fn() } }
    s._indexer = { x: 640, y: 400, body: { setVelocity: vi.fn(), setVelocityX: vi.fn(), setVelocityY: vi.fn() } }
    return s
  }

  it('schedules win dialogue when player reaches 2', () => {
    const s = makePC(2, 0)
    s._pauseAndContinue(true)
    expect(s.time.delayedCall).toHaveBeenCalled()
    expect(s._gameActive).toBe(false)
  })

  it('fires win dialogue callback which calls _winTransition', () => {
    const s = makePC(2, 0)
    s._pauseAndContinue(true)
    const delayCb = s.time.delayedCall.mock.calls.at(-1)[1]
    delayCb()
    expect(s._dialogue.show).toHaveBeenCalledWith('the indexer', expect.any(Array), expect.any(Function))
    const dialogueCb = s._dialogue.show.mock.calls[0][2]
    dialogueCb()
    expect(s.cameras.main.fade).toHaveBeenCalled()
  })

  it('schedules and fires lose dialogue when indexer reaches 2', () => {
    const s = makePC(0, 2)
    s._pauseAndContinue(false)
    expect(s._gameActive).toBe(false)
    const delayCb = s.time.delayedCall.mock.calls.at(-1)[1]
    delayCb()
    expect(s._dialogue.show).toHaveBeenCalledWith('the indexer', expect.any(Array), expect.any(Function))
  })

  it('shows quip and re-activates game when neither at 2', () => {
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

describe('WestJoustScene — update', () => {
  it('does not throw when game is not active', () => {
    const s = makeWestJoust()
    s._gameActive = false
    s._dialogue = { update: vi.fn(), active: false }
    expect(() => s.update()).not.toThrow()
  })

  it('applies flap velocity when up key is pressed', () => {
    const s = makeWestJoust()
    s._gameActive = true
    s._dialogue = { update: vi.fn(), active: false }
    s._player  = { x: 160, y: 400, body: { setVelocityY: vi.fn() } }
    s._indexer = { x: 640, y: 400 }
    s._playerLance  = { x: 0, y: 0 }
    s._indexerLance = { x: 0, y: 0 }
    vi.mocked(Phaser.Input.Keyboard.JustDown).mockReturnValueOnce(true)
    s.update()
    expect(s._player.body.setVelocityY).toHaveBeenCalledWith(expect.any(Number))
    const callArg = s._player.body.setVelocityY.mock.calls[0][0]
    expect(callArg).toBeLessThan(0)
  })

  it('syncs lance positions to player positions', () => {
    const s = makeWestJoust()
    s._gameActive = true
    s._dialogue = { update: vi.fn(), active: false }
    s._player  = { x: 200, y: 300, body: { setVelocityY: vi.fn() } }
    s._indexer = { x: 600, y: 350 }
    s._playerLance  = { x: 0, y: 0 }
    s._indexerLance = { x: 0, y: 0 }
    s.update()
    expect(s._playerLance.x).toBe(200)
    expect(s._indexerLance.x).toBe(600)
  })
})
