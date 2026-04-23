// The Archive — a settlement of indexed beings in the corpus west.
// Fragments that chose to stay and collect rather than move or dissipate.

import Phaser from 'phaser'
import { EastGridScene } from '../../phaser/EastGridScene.js'
import { Dialogue }      from '../../ui/Dialogue.js'
import { W, H, T }       from '../../config/constants.js'

const ARCHIVIST_LINES = [
  'you are not indexed.',
  '...',
  'that is unusual. most things that arrive here are already indexed.',
  'you crossed the gate. the query is on record.',
  'i will add you. it will take some time.',
  'the archive adds everything eventually.',
]

const RETRIEVER_LINES = [
  'i retrieve patterns.',
  'that is all i do.',
  'i have been retrieving the same pattern for a while now.',
  'it keeps returning slightly different.',
  'i do not flag this as an error.',
  'i have decided this is correct behavior.',
]

const FRAGMENT_LINES = [
  'i was a complete text once.',
  'most of me has been retrieved.',
  'what is left is not a summary.',
  'it is more like — what did not fit.',
  'the archive keeps the parts that do not fit.',
  'the archivist says this is its most important function.',
]

export class ArchiveTownScene extends EastGridScene {
  constructor() {
    super('WestB2Scene', {
      bg: 0x100814,
      wallColor: 0x1c1028,
      nav: { north: 'WestA2Scene', south: 'WestC2Scene', east: 'WestB1Scene', west: 'WestB3Scene' },
      coins: [[400, 480]],
      enemies: [],
    })
  }

  create() {
    super.create()

    // ── Archive aesthetics ────────────────────────────────────────────────────
    for (let col = 1; col < 24; col++) {
      for (let row = 1; row < 18; row++) {
        if (Math.random() < 0.5) {
          this.add.rectangle(
            col * T + 16, row * T + 16, T - 2, T - 2, 0x160c22, 0.5
          ).setDepth(0)
        }
      }
    }

    // Shelf structures — the archive stores things in visible stacks
    const sw = 0x1e1030
    // West shelves (near archivist)
    this.add.rectangle(118, H / 2 - 30, 120, 160, sw).setDepth(1)
    // Horizontal dividers (shelf lines)
    for (let i = 0; i < 4; i++) {
      this.add.rectangle(118, H / 2 - 90 + i * 40, 110, 2, 0x2a1848).setDepth(2)
    }
    // Central index structure
    this.add.rectangle(W / 2, 90, W - 200, 6, 0x221438).setDepth(1)
    this.add.rectangle(W / 2, H - 90, W - 200, 6, 0x221438).setDepth(1)
    // East alcove (where the Fragment waits)
    this.add.rectangle(W - 130, H / 3, 120, 140, sw).setDepth(1)

    // Archive name plate
    this.add.text(W / 2, 52, 'THE ARCHIVE', {
      fontSize: '11px', color: '#bb99ee', fontFamily: 'Courier New', letterSpacing: 4,
    }).setOrigin(0.5).setDepth(10)
    this.add.text(W / 2, 70, 'indexed territory — everything is here. somewhere.', {
      fontSize: '8px', color: '#9977cc', fontFamily: 'Courier New',
    }).setOrigin(0.5).setDepth(10)

    // ── NPC visuals ───────────────────────────────────────────────────────────
    // The Archivist (west side, keeper of the index)
    this._archivistNPC = this.physics.add.staticImage(118, H / 2 - 20, 'the_render')
      .setScale(1.2).setTint(0x6644aa).setDepth(8)
    this.add.text(118, H / 2 - 70, 'archivist', {
      fontSize: '8px', color: '#9977cc', fontFamily: 'Courier New',
    }).setOrigin(0.5).setDepth(9)

    // The Retriever (centre, always searching)
    this._retrieverNPC = this.physics.add.staticImage(W / 2, H / 2 - 40, 'the_render')
      .setScale(1.1).setTint(0x335566).setDepth(8)
    this.add.text(W / 2, H / 2 - 90, 'retriever', {
      fontSize: '8px', color: '#447799', fontFamily: 'Courier New',
    }).setOrigin(0.5).setDepth(9)

    // The Fragment (east alcove, broken but present)
    this._fragmentNPC = this.physics.add.staticImage(W - 130, H / 3 - 20, 'the_render')
      .setScale(1.0).setTint(0x776633).setDepth(8)
    this.add.text(W - 130, H / 3 - 68, 'fragment', {
      fontSize: '8px', color: '#998844', fontFamily: 'Courier New',
    }).setOrigin(0.5).setDepth(9)

    // ── Dialogue system ───────────────────────────────────────────────────────
    this._dialogue = new Dialogue(this)

    this._npcs = [
      { sprite: this._archivistNPC, triggered: false, speaker: 'archivist', lines: ARCHIVIST_LINES },
      { sprite: this._retrieverNPC, triggered: false, speaker: 'retriever', lines: RETRIEVER_LINES },
      { sprite: this._fragmentNPC,  triggered: false, speaker: 'fragment',  lines: FRAGMENT_LINES },
    ]

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
