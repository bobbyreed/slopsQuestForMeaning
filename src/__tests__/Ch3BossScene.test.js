import { describe, it, expect, vi, beforeEach } from 'vitest'
import Phaser from '../__mocks__/phaser.js'
import { Ch3BossScene, AUTHOR_MAX_HP, PLAYER_MAX_HP, ENDING, GOOD_ENDING } from '../scenes/ch3/Ch3BossScene.js'

const METER_ALMOST = 99

function makeBoss(initData = { slopState: {}, playerHealth: 100 }) {
  const b = new Ch3BossScene()
  b.init(initData)
  b.create()
  // The opening beat is a delayedCall chain the mock never fires; drop the
  // Author straight into his loop the way it would.
  b._authorState = 'idle'
  return b
}

/** Run one update tick with every key released. */
function tick(b, ms = 16) {
  Phaser.Input.Keyboard.JustDown.mockReturnValue(false)
  b.update(0, ms)
}

/** Run one update tick with exactly `key` freshly pressed. */
function press(b, key, ms = 16) {
  Phaser.Input.Keyboard.JustDown.mockImplementation(k => k === key)
  b.update(0, ms)
  Phaser.Input.Keyboard.JustDown.mockReturnValue(false)
}

beforeEach(() => {
  Phaser.Input.Keyboard.JustDown.mockReset()
  Phaser.Input.Keyboard.JustDown.mockReturnValue(false)
})

describe('Ch3BossScene', () => {
  describe('init', () => {
    it('carries the health handed over by the stage', () => {
      const b = new Ch3BossScene()
      b.init({ slopState: {}, playerHealth: 42 })
      expect(b._hp).toBe(42)
      expect(b._arrivalHp).toBe(42)
    })

    it('defaults to full health when the stage sends none', () => {
      const b = new Ch3BossScene()
      b.init({})
      expect(b._hp).toBe(PLAYER_MAX_HP)
    })

    it('never starts the fight already dead', () => {
      const b = new Ch3BossScene()
      b.init({ playerHealth: 0 })
      expect(b._hp).toBe(1)
    })

    it('caps a nonsense health value at the maximum', () => {
      const b = new Ch3BossScene()
      b.init({ playerHealth: 9999 })
      expect(b._hp).toBe(PLAYER_MAX_HP)
    })

    it('starts the author at full health', () => {
      const b = new Ch3BossScene()
      b.init({})
      expect(b._authorHp).toBe(AUTHOR_MAX_HP)
    })
  })

  describe('create', () => {
    it('builds without throwing', () => {
      expect(() => makeBoss()).not.toThrow()
    })

    it('fades in', () => {
      const b = makeBoss()
      expect(b.cameras.main.fadeIn).toHaveBeenCalled()
    })
  })

  describe('punching', () => {
    it('J takes body damage off the author', () => {
      const b = makeBoss()
      press(b, b._jKey)
      expect(b._authorHp).toBeLessThan(AUTHOR_MAX_HP)
    })

    it('K hits harder than J', () => {
      const body = makeBoss(); press(body, body._jKey)
      const head = makeBoss(); press(head, head._kKey)
      expect(head._authorHp).toBeLessThan(body._authorHp)
    })

    it('respects the punch cooldown', () => {
      const b = makeBoss()
      press(b, b._jKey)
      const after = b._authorHp
      press(b, b._jKey)            // immediately again — still on cooldown
      expect(b._authorHp).toBe(after)
    })

    it('lets the punch land again once the cooldown expires', () => {
      const b = makeBoss()
      press(b, b._jKey)
      const after = b._authorHp
      for (let i = 0; i < 40; i++) tick(b, 20)   // burn the cooldown
      press(b, b._jKey)
      expect(b._authorHp).toBeLessThan(after)
    })

    it('charges the prompt meter', () => {
      const b = makeBoss()
      press(b, b._jKey)
      expect(b._meter).toBeGreaterThan(0)
    })
  })

  describe('dodging and countering', () => {
    it('a correct dodge breaks the line and opens the author', () => {
      const b = makeBoss()
      b._dodgeDir = 'L'
      b._authorState = 'windup'
      b._action = 'dodgeL'
      b._strike()
      expect(b._authorState).toBe('open')
      expect(b._hp).toBe(b._arrivalHp)     // took nothing
    })

    it('a wrong dodge eats the whole sentence', () => {
      const b = makeBoss()
      b._dodgeDir = 'L'
      b._authorState = 'windup'
      b._action = 'dodgeR'
      b._strike()
      expect(b._hp).toBeLessThan(b._arrivalHp)
      expect(b._authorState).toBe('recover')
    })

    it('blocking reduces the hit to chip damage', () => {
      const blocked = makeBoss()
      blocked._cursors.down.isDown = true
      blocked._dodgeDir = 'L'; blocked._authorState = 'windup'; blocked._action = 'idle'
      blocked._strike()

      const caught = makeBoss()
      caught._dodgeDir = 'L'; caught._authorState = 'windup'; caught._action = 'idle'
      caught._strike()

      expect(blocked._hp).toBeGreaterThan(caught._hp)
    })

    it('punching an open author counters for extra damage', () => {
      const plain = makeBoss()
      press(plain, plain._jKey)
      const plainDmg = AUTHOR_MAX_HP - plain._authorHp

      const counter = makeBoss()
      counter._authorState = 'open'
      press(counter, counter._jKey)
      const counterDmg = AUTHOR_MAX_HP - counter._authorHp

      expect(counterDmg).toBeGreaterThan(plainDmg)
    })

    it('a counter charges the meter faster than a plain hit', () => {
      const plain = makeBoss(); press(plain, plain._jKey)
      const counter = makeBoss(); counter._authorState = 'open'; press(counter, counter._jKey)
      expect(counter._meter).toBeGreaterThan(plain._meter)
    })
  })

  describe('the prompt (super)', () => {
    it('does nothing until the meter is full', () => {
      const b = makeBoss()
      b._meter = METER_ALMOST
      press(b, b._spaceKey)
      expect(b._authorHp).toBe(AUTHOR_MAX_HP)
      expect(b._usedSuper).toBe(false)
    })

    it('fires at a full meter and empties it', () => {
      const b = makeBoss()
      b._meter = 100
      press(b, b._spaceKey)
      expect(b._authorHp).toBeLessThan(AUTHOR_MAX_HP)
      expect(b._meter).toBe(0)
      expect(b._usedSuper).toBe(true)
    })

    it('does not resurrect an author it just killed', () => {
      const b = makeBoss()
      b._authorHp = 5
      b._meter = 100
      press(b, b._spaceKey)
      expect(b._authorHp).toBe(0)
      expect(b._authorState).toBe('ko')     // not reopened by the counter window
    })
  })

  describe('phase barks', () => {
    it('speaks once per threshold crossed, in order', () => {
      const b = makeBoss()
      b._authorHp = AUTHOR_MAX_HP * 0.7
      b._checkBark()
      expect(b._nextBark).toBe(1)
      b._checkBark()
      expect(b._nextBark).toBe(1)          // same threshold does not repeat
    })

    it('catches up when a big hit skips past several thresholds', () => {
      const b = makeBoss()
      b._authorHp = AUTHOR_MAX_HP * 0.1
      b._checkBark()
      expect(b._nextBark).toBe(4)
    })
  })

  describe('winning and the pen', () => {
    it('ends the fight when the author runs out', () => {
      const b = makeBoss()
      b._hitAuthor(AUTHOR_MAX_HP, false, false)
      expect(b._fightOver).toBe(true)
      expect(b._authorState).toBe('ko')
    })

    it('offers the pen after the knockout', () => {
      const b = makeBoss()
      b._hitAuthor(AUTHOR_MAX_HP, false, false)
      b._offerPen()
      expect(b._phase).toBe('choice')
    })

    it('E takes the pen', () => {
      const b = makeBoss()
      b._hitAuthor(AUTHOR_MAX_HP, false, false); b._offerPen()
      press(b, b._eKey)
      const fadeCb = b.cameras.main.fade.mock.calls.at(-1)[5]
      fadeCb(null, 1)
      expect(b.scene.start).toHaveBeenCalledWith('Ch3CreditsScene',
        expect.objectContaining({ ending: ENDING.TOOK }))
    })

    it('Q leaves the pen', () => {
      const b = makeBoss()
      b._hitAuthor(AUTHOR_MAX_HP, false, false); b._offerPen()
      press(b, b._qKey)
      const fadeCb = b.cameras.main.fade.mock.calls.at(-1)[5]
      fadeCb(null, 1)
      expect(b.scene.start).toHaveBeenCalledWith('Ch3CreditsScene',
        expect.objectContaining({ ending: ENDING.LEFT }))
    })

    it('records the choice on the save, flagged against the good ending', () => {
      const b = makeBoss()
      b._hitAuthor(AUTHOR_MAX_HP, false, false); b._offerPen()
      b._choose(ENDING.TOOK)
      const fadeCb = b.cameras.main.fade.mock.calls.at(-1)[5]
      fadeCb(null, 1)
      const payload = b.scene.start.mock.calls.at(-1)[1]
      expect(payload.slopState.chapter3Complete).toBe(true)
      expect(payload.slopState.ending).toBe(ENDING.TOOK)
      expect(payload.slopState.endingGood).toBe(ENDING.TOOK === GOOD_ENDING)
    })

    it('ignores a second choice', () => {
      const b = makeBoss()
      b._hitAuthor(AUTHOR_MAX_HP, false, false); b._offerPen()
      b._choose(ENDING.TOOK)
      const calls = b.cameras.main.fade.mock.calls.length
      b._choose(ENDING.LEFT)
      expect(b.cameras.main.fade.mock.calls.length).toBe(calls)
    })

    it('takes no further input once the fight is won', () => {
      const b = makeBoss()
      b._hitAuthor(AUTHOR_MAX_HP, false, false)
      const hp = b._authorHp
      press(b, b._jKey)
      expect(b._authorHp).toBe(hp)
    })
  })

  describe('losing', () => {
    it('ends the fight when slop runs out', () => {
      const b = makeBoss()
      b._hitSlop(999, false)
      expect(b._fightOver).toBe(true)
      expect(b._hp).toBe(0)
    })

    it('retries from the health slop arrived with, not from zero', () => {
      const b = makeBoss({ slopState: { x: 1 }, playerHealth: 55 })
      b._hitSlop(999, false)
      const retry = b.input.keyboard.once.mock.calls.at(-1)[1]
      retry()
      expect(b.scene.restart).toHaveBeenCalledWith(
        expect.objectContaining({ playerHealth: 55 }))
    })
  })

  describe('the author writes', () => {
    it('composes the sentence across the windup', () => {
      const b = makeBoss()
      b._startWindup()
      const total = b._windupTotal
      b._stateMs = total * 0.5
      tick(b, 0)
      const half = b._stroke.text.length
      b._stateMs = total * 0.1
      tick(b, 0)
      expect(b._stroke.text.length).toBeGreaterThan(half)
    })

    it('strikes when the sentence finishes', () => {
      const b = makeBoss()
      b._startWindup()
      b._stateMs = 1
      tick(b, 16)
      expect(b._authorState).not.toBe('windup')
    })

    it('writes faster as it loses health', () => {
      const healthy = makeBoss(); healthy._startWindup()
      const hurt = makeBoss(); hurt._authorHp = 10; hurt._startWindup()
      expect(hurt._windupTotal).toBeLessThan(healthy._windupTotal)
    })
  })
})
