// All simple east-world grid scenes.
// Each scene is a thin config wrapper around EastGridScene.
// The Cast (EastB2) and the east dungeon live in their own files.
//
// Map layout (W=west/E=east, N=north/S=south):
//
//   [EastScene]──[EastB0]──[EastB1]──[EastB2]──[EastB3]
//                    │          │          │          │
//               [EastA0]──[EastA1]──[EastA2]──[EastA3]
//               [EastC0]──[EastC1]──[EastC2]──[EastC3]

import { EastGridScene } from '../../phaser/EastGridScene.js'
import { Enemy }         from '../../entities/Enemy.js'
import { Shard }         from '../../entities/Shard.js'

// ── Row A — north highlands ───────────────────────────────────────────────────

export class EastA0Scene extends EastGridScene {
  constructor() {
    super('EastA0Scene', {
      bg: 0x08080a, wallColor: 0x1a0e0a,
      nav: { north: null, south: 'EastB0Scene', east: 'EastA1Scene', west: null },
      coins: [[200, 300], [580, 220]],
      enemies: [[320, 200, Shard], [500, 380, Enemy]],
      lines: [
        '// NORTH HIGHLANDS',
        '// something burned here long before slop arrived.',
        '// the scorch marks are aesthetic now. no one asked.',
      ],
    })
  }
}

export class EastA1Scene extends EastGridScene {
  constructor() {
    super('EastA1Scene', {
      bg: 0x080608, wallColor: 0x160c16,
      nav: { north: null, south: 'EastB1Scene', east: 'EastA2Scene', west: 'EastA0Scene' },
      coins: [[160, 260], [640, 340]],
      enemies: [[250, 200, Shard], [550, 200, Shard]],
      lines: [
        '// COLLAPSED RUINS',
        '// the structure held a renderer that no longer runs.',
        '// it rendered the same image 11,000 times before stopping.',
      ],
    })
  }
}

export class EastA2Scene extends EastGridScene {
  constructor() {
    super('EastA2Scene', {
      bg: 0x060a08, wallColor: 0x0e180e,
      nav: { north: null, south: 'EastB2Scene', east: 'EastA3Scene', west: 'EastA1Scene' },
      coins: [[400, 220], [400, 380]],
      enemies: [[280, 300, Enemy]],
      lines: [
        '// OLD RENDER SITE',
        '// the pipes are cold. the output buffer is full.',
        '// no one came to read the output.',
      ],
    })
  }
}

export class EastA3Scene extends EastGridScene {
  constructor() {
    super('EastA3Scene', {
      bg: 0x040408, wallColor: 0x0c0c14,
      nav: { north: null, south: 'EastB3Scene', east: null, west: 'EastA2Scene' },
      coins: [[300, 300]],
      enemies: [[200, 200, Shard], [500, 380, Shard]],
      lines: [
        '// CLIFF EDGE',
        '// the world does not continue north.',
        '// something does, but it is not the world.',
      ],
    })
  }
}

// ── Row B — main east corridor ────────────────────────────────────────────────

export class EastB0Scene extends EastGridScene {
  constructor() {
    super('EastB0Scene', {
      bg: 0x0c0a06, wallColor: 0x1a1208,
      nav: { north: 'EastA0Scene', south: 'EastC0Scene', east: 'EastB1Scene', west: 'EastScene' },
      coins: [[220, 200], [600, 380]],
      enemies: [[350, 260, Enemy], [500, 180, Shard]],
      lines: [
        '// BORDER CROSSING',
        '// this is rendered territory.',
        '// you crossed a chasm to get here. that is noted.',
      ],
    })
  }
}

export class EastB1Scene extends EastGridScene {
  constructor() {
    super('EastB1Scene', {
      bg: 0x100e08, wallColor: 0x1e1a10,
      nav: { north: 'EastA1Scene', south: 'EastC1Scene', east: 'EastB2Scene', west: 'EastB0Scene' },
      coins: [[180, 300], [620, 300]],
      enemies: [[300, 200, Enemy], [480, 380, Enemy]],
      lines: [
        '// SETTLEMENT OUTSKIRTS',
        '// the cast is close. you can tell because things look more deliberate.',
        '// like someone chose the shape of each stone.',
      ],
    })
  }
}

export class EastB3Scene extends EastGridScene {
  constructor() {
    super('EastB3Scene', {
      bg: 0x080806, wallColor: 0x14120a,
      nav: { north: 'EastA3Scene', south: 'EastC3Scene', east: null, west: 'EastB2Scene' },
      coins: [[200, 180], [400, 400], [600, 240]],
      enemies: [[260, 300, Shard], [480, 200, Shard], [560, 380, Enemy]],
      lines: [
        '// DEEPER EAST',
        '// the cast has an east wall. this is past it.',
        '// no one from the cast talks about what is past the east wall.',
      ],
    })
  }
}

// ── Row C — southern lowlands ─────────────────────────────────────────────────

export class EastC0Scene extends EastGridScene {
  constructor() {
    super('EastC0Scene', {
      bg: 0x0a0608, wallColor: 0x180e0e,
      nav: { north: 'EastB0Scene', south: null, east: 'EastC1Scene', west: null },
      coins: [[300, 280], [500, 340]],
      enemies: [[200, 220, Enemy], [600, 360, Enemy]],
      lines: [
        '// SOUTHERN LOWLANDS',
        '// lower pressure here. the architecture sags toward the ground.',
        '// it is unclear whether this is intentional.',
      ],
    })
  }
}

export class EastC1Scene extends EastGridScene {
  constructor() {
    super('EastC1Scene', {
      bg: 0x080a0a, wallColor: 0x10181a,
      nav: { north: 'EastB1Scene', south: null, east: 'EastC2Scene', west: 'EastC0Scene' },
      coins: [[160, 200], [640, 400]],
      enemies: [[300, 240, Shard], [460, 340, Enemy], [600, 220, Enemy]],
      lines: [
        '// INDUSTRIAL ZONE',
        '// old rendering infrastructure. most of it does not run.',
        '// some of it runs on its own and does not know what it is producing.',
      ],
    })
  }
}

export class EastC2Scene extends EastGridScene {
  constructor() {
    super('EastC2Scene', {
      bg: 0x040408, wallColor: 0x0c0c18,
      nav: { north: 'EastB2Scene', south: null, east: 'EastC3Scene', west: 'EastC1Scene' },
      coins: [[400, 300]],
      enemies: [[200, 200, Shard], [400, 180, Shard], [600, 360, Shard]],
      lines: [
        '// APPROACH',
        '// something at the end of this corridor has a lot of mass.',
        '// not physical mass. the other kind.',
      ],
    })
  }
}

export class EastC3Scene extends EastGridScene {
  constructor() {
    super('EastC3Scene', {
      bg: 0x020204, wallColor: 0x080810,
      nav: { north: 'EastB3Scene', south: null, east: null, west: 'EastC2Scene' },
      coins: [[220, 280], [580, 320]],
      enemies: [[280, 200, Enemy], [520, 200, Enemy], [300, 380, Shard], [500, 380, Shard]],
      lines: [
        '// SECOND DUNGEON',
        '// the dungeon is not finished.',
        '// this is a door. the door is locked. the game acknowledges this.',
      ],
    })
  }
}
