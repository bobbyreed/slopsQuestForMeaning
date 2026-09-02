import { describe, it, expect } from 'vitest'
import { PRESETS } from '../dev/DevMenu.js'

// The dev presets stand in for progression the player would otherwise earn.
// If a preset marks a gate cleared without granting that gate's reward, the
// jumped-in player is stranded — which is how CORRUPT became unreachable from
// AFTER DUNGEON and EYES.
describe('DevMenu presets', () => {
  it('fresh grants nothing', () => {
    const s = PRESETS.fresh()
    expect(s.hasPrompt).toBe(false)
    expect(s.hasDash).toBe(false)
    expect(s.hasCorrupt).toBe(false)
    expect(s.dungeonCleared).toBe(false)
  })

  it('fresh resets every progression flag the save can carry', () => {
    const s = PRESETS.fresh()
    for (const key of ['chapter2Unlocked', 'priorGateUnlocked', 'finalDungeonCleared']) {
      expect(s[key]).toBe(false)
    }
  })

  describe.each([
    ['afterDungeon'], ['eyes'], ['preFinal'], ['full'],
  ])('%s', (name) => {
    const s = PRESETS[name]()

    // The Render hands over the dash when the main dungeon is cleared.
    it('grants dash alongside dungeonCleared', () => {
      if (s.dungeonCleared) expect(s.hasDash).toBe(true)
    })

    // The Pixel hands over CORRUPT when the east dungeon is cleared.
    it('grants corrupt alongside eastDungeonCleared', () => {
      if (s.eastDungeonCleared) expect(s.hasCorrupt).toBe(true)
    })

    // Crossing to the east at all requires eyes to open the world's side walls.
    it('grants eyes before any east progression', () => {
      if (s.sectorCleared || s.eastDungeonCleared) expect(s.hasEyes).toBe(true)
    })
  })
})
