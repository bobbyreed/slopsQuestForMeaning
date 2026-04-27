import { describe, it, expect, vi, beforeEach } from 'vitest'
import { makeScene } from '../__mocks__/phaser.js'
import { JoustScene } from '../scenes/JoustScene.js'
import Phaser from '../__mocks__/phaser.js'

function makeJoust(slopState = {}) {
  const s = new JoustScene()
  Object.assign(s, makeScene())
  s.init({ slopState })
  s.create()
  return s
}

describe('JoustScene — init', () => {
  it('initialises scores to 0', () => {
    const s = makeJoust()
    expect(s._playerScore).toBe(0)
    expect(s._priorScore).toBe(0)
  })

  it('stores slopState', () => {
    const s = makeJoust({ coinCount: 5 })
    expect(s._slopState.coinCount).toBe(5)
  })

  it('starts with game not active', () => {
    const s = makeJoust()
    expect(s._gameActive).toBe(false)
  })
})

describe('JoustScene — _respawn', () => {
  it('resets object position', () => {
    const s = makeJoust()
    const obj = { x: 999, y: 999, body: { setVelocity: vi.fn() } }
    s._respawn(obj, { x: 100, y: 200 })
    expect(obj.x).toBe(100)
    expect(obj.y).toBe(200)
    expect(obj.body.setVelocity).toHaveBeenCalledWith(0, 0)
  })

  it('handles missing body gracefully', () => {
    const s = makeJoust()
    const obj = { x: 0, y: 0 }
    expect(() => s._respawn(obj, { x: 50, y: 50 })).not.toThrow()
  })
})

describe('JoustScene — _respawnBoth', () => {
  it('resets both player and prior to spawn positions', () => {
    const s = makeJoust()
    s._player = { x: 999, y: 999, body: { setVelocity: vi.fn() } }
    s._prior  = { x: 999, y: 999, body: { setVelocity: vi.fn() } }
    s._playerSpawn = { x: 160, y: 400 }
    s._priorSpawn  = { x: 640, y: 400 }
    s._respawnBoth()
    expect(s._player.x).toBe(160)
    expect(s._prior.x).toBe(640)
  })
})

describe('JoustScene — _startGame', () => {
  it('sets _gameActive to true', () => {
    const s = makeJoust()
    s._player = { x: 0, y: 0, body: { setVelocity: vi.fn() } }
    s._prior  = { x: 0, y: 0, body: { setVelocity: vi.fn(), setVelocityX: vi.fn(), setVelocityY: vi.fn() } }
    s._startGame()
    expect(s._gameActive).toBe(true)
  })

  it('starts the prior AI timer', () => {
    const s = makeJoust()
    s._player = { x: 0, y: 0, body: { setVelocity: vi.fn() } }
    s._prior  = { x: 0, y: 0, body: { setVelocity: vi.fn(), setVelocityX: vi.fn(), setVelocityY: vi.fn() } }
    s._startGame()
    expect(s.time.addEvent).toHaveBeenCalled()
  })
})

describe('JoustScene — _priorTick', () => {
  it('does nothing when game is not active', () => {
    const s = makeJoust()
    s._gameActive = false
    s._prior = { y: 400, body: { velocity: { y: 0 }, setVelocityY: vi.fn(), setVelocityX: vi.fn() } }
    s._player = { x: 400, y: 100 }
    s._priorTick()
    expect(s._prior.body.setVelocityY).not.toHaveBeenCalled()
  })

  it('flaps when prior is below player', () => {
    const s = makeJoust()
    s._gameActive = true
    s._prior  = { x: 300, y: 400, body: { velocity: { y: 0 }, setVelocityY: vi.fn(), setVelocityX: vi.fn() } }
    s._player = { x: 300, y: 100 }
    s._priorTick()
    expect(s._prior.body.setVelocityY).toHaveBeenCalled()
    const callArg = s._prior.body.setVelocityY.mock.calls[0][0]
    expect(callArg).toBeLessThan(0)
  })

  it('does not flap when velocity is already very negative', () => {
    const s = makeJoust()
    s._gameActive = true
    s._prior  = { x: 300, y: 400, body: { velocity: { y: -200 }, setVelocityY: vi.fn(), setVelocityX: vi.fn() } }
    s._player = { x: 300, y: 100 }
    s._priorTick()
    expect(s._prior.body.setVelocityY).not.toHaveBeenCalled()
  })

  it('chases player horizontally', () => {
    const s = makeJoust()
    s._gameActive = true
    s._prior  = { x: 200, y: 100, body: { velocity: { y: 0 }, setVelocityY: vi.fn(), setVelocityX: vi.fn() } }
    s._player = { x: 400, y: 100 }
    s._priorTick()
    expect(s._prior.body.setVelocityX).toHaveBeenCalledWith(expect.any(Number))
  })
})

describe('JoustScene — _handleClash', () => {
  function makeClash(playerY, priorY) {
    const s = makeJoust()
    s._gameActive = true
    s._player = { x: 300, y: playerY, body: { setVelocity: vi.fn() } }
    s._prior  = { x: 310, y: priorY,  body: { setVelocity: vi.fn() } }
    s._playerScoreText = { setText: vi.fn() }
    s._priorScoreText  = { setText: vi.fn() }
    s._priorTimer = { remove: vi.fn() }
    return s
  }

  it('increments player score when player is higher (lower y)', () => {
    const s = makeClash(200, 260)   // diff = 60 > 20
    s._handleClash()
    expect(s._playerScore).toBe(1)
  })

  it('increments prior score when prior is higher', () => {
    const s = makeClash(260, 200)   // diff = -60 < -20
    s._handleClash()
    expect(s._priorScore).toBe(1)
  })

  it('scores nothing when within 20px of each other', () => {
    const s = makeClash(300, 310)   // diff = 10, within range
    s._handleClash()
    expect(s._playerScore).toBe(0)
    expect(s._priorScore).toBe(0)
  })

  it('ignores clash when game is not active', () => {
    const s = makeClash(200, 260)
    s._gameActive = false
    s._handleClash()
    expect(s._playerScore).toBe(0)
  })
})

describe('JoustScene — _pauseAndContinue', () => {
  function makePC(playerScore, priorScore) {
    const s = makeJoust()
    s._gameActive   = true
    s._playerScore  = playerScore
    s._priorScore   = priorScore
    s._priorTimer   = { remove: vi.fn() }
    s._dialogue     = { show: vi.fn(), update: vi.fn(), active: false }
    s._player       = { x: 160, y: 400, body: { setVelocity: vi.fn() } }
    s._prior        = { x: 640, y: 400, body: { setVelocity: vi.fn(), setVelocityX: vi.fn(), setVelocityY: vi.fn() } }
    return s
  }

  it('schedules win dialogue when player reaches 3', () => {
    const s = makePC(3, 0)
    s._pauseAndContinue(true)
    expect(s.time.delayedCall).toHaveBeenCalled()
    expect(s._gameActive).toBe(false)
  })

  it('schedules and fires lose dialogue when prior reaches 3', () => {
    const s = makePC(0, 3)
    s._pauseAndContinue(false)
    expect(s._gameActive).toBe(false)
    // Fire the delay callback → dialogue shows
    const delayCb = s.time.delayedCall.mock.calls.at(-1)[1]
    delayCb()
    expect(s._dialogue.show).toHaveBeenCalledWith('the prior', expect.any(Array), expect.any(Function))
  })

  it('shows quip and re-activates game when neither at 3', () => {
    const s = makePC(1, 1)
    s._pauseAndContinue(true)
    // Fire the most-recent delay (the quip one, not the create() 500ms one)
    const delayCb = s.time.delayedCall.mock.calls.at(-1)[1]
    delayCb()
    expect(s._dialogue.show).toHaveBeenCalled()
    // Fire dialogue callback → re-activates game
    const dialogueCb = s._dialogue.show.mock.calls[0][2]
    dialogueCb()
    expect(s._gameActive).toBe(true)
  })
})

describe('JoustScene — update', () => {
  it('does not throw when game is not active', () => {
    const s = makeJoust()
    s._gameActive = false
    s._dialogue = { update: vi.fn(), active: false }
    expect(() => s.update()).not.toThrow()
  })

  it('applies flap velocity when up key is pressed', async () => {
    const s = makeJoust()
    s._gameActive = true
    s._dialogue = { update: vi.fn(), active: false }
    s._player = { x: 160, y: 400, body: { setVelocityY: vi.fn() } }
    s._prior  = { x: 640, y: 400 }
    s._playerLance = { x: 0, y: 0 }
    s._priorLance  = { x: 0, y: 0 }
    vi.mocked(Phaser.Input.Keyboard.JustDown).mockReturnValueOnce(true)
    s.update()
    expect(s._player.body.setVelocityY).toHaveBeenCalledWith(expect.any(Number))
    const callArg = s._player.body.setVelocityY.mock.calls[0][0]
    expect(callArg).toBeLessThan(0)
  })

  it('syncs lance positions to player positions', () => {
    const s = makeJoust()
    s._gameActive = true
    s._dialogue = { update: vi.fn(), active: false }
    s._player = { x: 200, y: 300, body: { setVelocityY: vi.fn() } }
    s._prior  = { x: 600, y: 350 }
    s._playerLance = { x: 0, y: 0 }
    s._priorLance  = { x: 0, y: 0 }
    s.update()
    expect(s._playerLance.x).toBe(200)
    expect(s._priorLance.x).toBe(600)
  })
})
