import { describe, it, expect, vi } from 'vitest'
import { makeScene }     from '../__mocks__/phaser.js'
import Phaser            from '../__mocks__/phaser.js'
import { Ch3BossScene }  from '../scenes/ch3/Ch3BossScene.js'

function makeBoss(data = {}) {
  const s = new Ch3BossScene()
  Object.assign(s, makeScene())
  s.init(data)
  s.create()
  return s
}

describe('Ch3BossScene (placeholder)', () => {
  it('carries the player health from the stage', () => {
    const s = new Ch3BossScene()
    s.init({ playerHealth: 73 })
    expect(s._playerHealth).toBe(73)
  })

  it('defaults health when none is carried', () => {
    const s = new Ch3BossScene()
    s.init({})
    expect(s._playerHealth).toBe(100)
  })

  it('creates without throwing', () => {
    expect(() => makeBoss({ playerHealth: 50 })).not.toThrow()
  })

  it('leaves on SPACE', () => {
    const s = makeBoss()
    const spy = vi.spyOn(Phaser.Input.Keyboard, 'JustDown').mockReturnValue(true)
    s.cameras.main.fade.mockImplementation((_, r, g, b, _fromBlack, cb) => cb(null, 1))
    s.update()
    expect(s.scene.start).toHaveBeenCalledWith('MenuScene')
    spy.mockRestore()
  })
})
