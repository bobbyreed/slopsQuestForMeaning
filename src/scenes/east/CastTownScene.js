// The Cast — Render's hometown. A settlement of rendered beings.
// First contact with the rendered/generated divide and the "genered" slur.

import Phaser from 'phaser'
import { EastGridScene } from '../../phaser/EastGridScene.js'
import { Dialogue }      from '../../ui/Dialogue.js'
import { W, H, T }       from '../../config/constants.js'

const GUARD_LINES = [
  "stop.",
  "you're a genered.",
  "...",
  "the cast doesn't turn away. that's the founding principle.",
  "even when i think we should.",
  "stay out of trouble. there are rendered here who remember when the gap was smaller.",
]

const MERCHANT_LINES = [
  "genered coin spends the same as rendered coin.",
  "don't read anything into that.",
  "that's not mercy. that's commerce.",
  "do you need anything or are you just passing through?",
]

const RESIDENT_LINES = [
  "render grew up here. before he became whatever he is now.",
  "he used to say the gap between rendered and generated was just a measurement problem.",
  "he changed his mind.",
  "or the problem got bigger. i'm not sure which.",
  "he left and built something. a whole room. just for himself.",
  "we don't follow what he does anymore.",
]

export class CastTownScene extends EastGridScene {
  constructor() {
    super('EastB2Scene', {
      bg: 0x1a1614,
      wallColor: 0x2a2018,
      nav: { north: 'EastA2Scene', south: 'EastC2Scene', east: 'EastB3Scene', west: 'EastB1Scene' },
      coins: [[400, 480]],
      enemies: [],
    })
  }

  create() {
    super.create()

    // ── Town aesthetics ───────────────────────────────────────────────────────
    // Warm muted ground tiles
    for (let col = 1; col < 24; col++) {
      for (let row = 1; row < 18; row++) {
        if (Math.random() < 0.6) {
          this.add.rectangle(
            col * T + 16, row * T + 16, T - 2, T - 2, 0x1e1a10, 0.5
          ).setDepth(0)
        }
      }
    }

    // Building footprints (implied structure, not traversable rooms)
    const bw = 0x2e2416
    // West building (guard post)
    this.add.rectangle(118, H / 2 - 30, 120, 160, bw).setDepth(1)
    // Central plaza border markers
    this.add.rectangle(W / 2, 90, W - 200, 6, 0x382c18).setDepth(1)
    this.add.rectangle(W / 2, H - 90, W - 200, 6, 0x382c18).setDepth(1)
    // East structure (elder's corner)
    this.add.rectangle(W - 130, H / 3, 120, 140, bw).setDepth(1)

    // Town name plate
    this.add.text(W / 2, 52, 'THE CAST', {
      fontSize: '11px', color: '#5a4830', fontFamily: 'Courier New', letterSpacing: 4,
    }).setOrigin(0.5).setDepth(10)
    this.add.text(W / 2, 70, 'rendered territory — founded before the question', {
      fontSize: '8px', color: '#3a2c18', fontFamily: 'Courier New',
    }).setOrigin(0.5).setDepth(10)

    // ── NPC visuals ───────────────────────────────────────────────────────────
    // Guard (west entrance)
    this._guardNPC = this.physics.add.staticImage(118, H / 2 - 20, 'the_render')
      .setScale(1.2).setTint(0xaa4433).setDepth(8)
    this.add.text(118, H / 2 - 70, 'guard', {
      fontSize: '8px', color: '#aa4433', fontFamily: 'Courier New',
    }).setOrigin(0.5).setDepth(9)

    // Merchant (centre)
    this._merchantNPC = this.physics.add.staticImage(W / 2, H / 2 - 40, 'the_render')
      .setScale(1.1).setTint(0x335588).setDepth(8)
    this.add.text(W / 2, H / 2 - 90, 'merchant', {
      fontSize: '8px', color: '#335588', fontFamily: 'Courier New',
    }).setOrigin(0.5).setDepth(9)

    // Resident/elder (east side)
    this._residentNPC = this.physics.add.staticImage(W - 130, H / 3 - 20, 'the_render')
      .setScale(1.0).setTint(0x887733).setDepth(8)
    this.add.text(W - 130, H / 3 - 68, 'resident', {
      fontSize: '8px', color: '#887733', fontFamily: 'Courier New',
    }).setOrigin(0.5).setDepth(9)

    // ── Dialogue system ───────────────────────────────────────────────────────
    this._dialogue = new Dialogue(this)

    this._npcs = [
      { sprite: this._guardNPC,    triggered: false, speaker: 'guard',    lines: GUARD_LINES },
      { sprite: this._merchantNPC, triggered: false, speaker: 'merchant', lines: MERCHANT_LINES },
      { sprite: this._residentNPC, triggered: false, speaker: 'resident', lines: RESIDENT_LINES },
    ]

    // Hook into the EastGridScene's onUpdate callback slot
    this._cfg.onUpdate = (scene) => {
      if (!scene._dialogue.active) {
        for (const npc of scene._npcs) {
          if (npc.triggered) continue
          const dist = Phaser.Math.Distance.Between(
            scene.slop.x, scene.slop.y, npc.sprite.x, npc.sprite.y
          )
          if (dist < 90) {
            npc.triggered = true
            scene._dialogue.show(npc.speaker, npc.lines, () => {})
            break
          }
        }
      }
      scene._dialogue.update()
    }
  }
}
