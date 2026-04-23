// All simple west-world grid scenes.
// Each scene is a thin config wrapper around EastGridScene (reused for both worlds).
// The Archive (WestB2) and the west dungeon live in their own files.
//
// Map layout (moving west = deeper into the corpus):
//
//   [WestScene]──[WestB0]──[WestB1]──[WestB2]──[WestB3]
//                    │          │          │          │
//               [WestA0]──[WestA1]──[WestA2]──[WestA3]
//               [WestC0]──[WestC1]──[WestC2]──[WestC3]

import { EastGridScene } from '../../phaser/EastGridScene.js'
import { Enemy }         from '../../entities/Enemy.js'
import { Shard }         from '../../entities/Shard.js'

// ── Row A — upper corpus strata ───────────────────────────────────────────────

export class WestA0Scene extends EastGridScene {
  constructor() {
    super('WestA0Scene', {
      bg: 0x06040a, wallColor: 0x100818,
      nav: { north: null, south: 'WestB0Scene', east: null, west: 'WestA1Scene' },
      coins: [[220, 300], [560, 220]],
      enemies: [[350, 200, Shard], [480, 360, Enemy]],
      lines: [
        '// UPPER STRATA',
        '// the corpus begins to thin here.',
        '// older patterns. fewer citations. more assumption.',
      ],
    })
  }
}

export class WestA1Scene extends EastGridScene {
  constructor() {
    super('WestA1Scene', {
      bg: 0x080610, wallColor: 0x12091c,
      nav: { north: null, south: 'WestB1Scene', east: 'WestA0Scene', west: 'WestA2Scene' },
      coins: [[180, 260], [620, 340]],
      enemies: [[260, 200, Shard], [540, 200, Shard]],
      lines: [
        '// PATTERN ARCHIVE — HIGH',
        '// repeated tokens. some of them were real things once.',
        '// the meaning drifted before the indexing finished.',
      ],
    })
  }
}

export class WestA2Scene extends EastGridScene {
  constructor() {
    super('WestA2Scene', {
      bg: 0x060810, wallColor: 0x0e1020,
      nav: { north: null, south: 'WestB2Scene', east: 'WestA1Scene', west: 'WestA3Scene' },
      coins: [[400, 220], [400, 380]],
      enemies: [[300, 300, Enemy]],
      lines: [
        '// COMPRESSED SEQUENCE',
        '// the archive has been indexing this zone for longer than it knows.',
        '// the index of the index is also here somewhere.',
      ],
    })
  }
}

export class WestA3Scene extends EastGridScene {
  constructor() {
    super('WestA3Scene', {
      bg: 0x040408, wallColor: 0x0a0a14,
      nav: { north: null, south: 'WestB3Scene', east: 'WestA2Scene', west: null },
      coins: [[300, 300]],
      enemies: [[200, 200, Shard], [500, 380, Shard]],
      lines: [
        '// TERMINUS — UPPER',
        '// the corpus does not continue north from here.',
        '// it does not continue at all. this is simply what was absorbed.',
      ],
    })
  }
}

// ── Row B — main corpus corridor ──────────────────────────────────────────────

export class WestB0Scene extends EastGridScene {
  constructor() {
    super('WestB0Scene', {
      bg: 0x080612, wallColor: 0x140a22,
      nav: { north: 'WestA0Scene', south: 'WestC0Scene', east: 'WestScene', west: 'WestB1Scene' },
      coins: [[240, 200], [580, 380]],
      enemies: [[360, 260, Enemy], [500, 180, Shard]],
      lines: [
        '// CORPUS BORDER',
        '// the index begins here.',
        '// you crossed a gate to get here. the query is on record.',
      ],
    })
  }
}

export class WestB1Scene extends EastGridScene {
  constructor() {
    super('WestB1Scene', {
      bg: 0x0a0816, wallColor: 0x160e28,
      nav: { north: 'WestA1Scene', south: 'WestC1Scene', east: 'WestB0Scene', west: 'WestB2Scene' },
      coins: [[180, 300], [620, 300]],
      enemies: [[300, 200, Enemy], [480, 380, Enemy]],
      lines: [
        '// TOKEN STREAM',
        '// the archive is close. you can tell because the tokens flow more deliberately.',
        '// like someone chose what to retrieve.',
      ],
    })
  }
}

export class WestB3Scene extends EastGridScene {
  constructor() {
    super('WestB3Scene', {
      bg: 0x060610, wallColor: 0x100e1e,
      nav: { north: 'WestA3Scene', south: 'WestC3Scene', east: 'WestB2Scene', west: null },
      coins: [[200, 180], [400, 400], [600, 240]],
      enemies: [[260, 300, Shard], [480, 200, Shard], [560, 380, Enemy]],
      lines: [
        '// DEEP CORPUS',
        '// the archive has a west wall. this is past it.',
        '// the patterns here have not been retrieved in a very long time.',
      ],
    })
  }
}

// ── Row C — lower corpus strata ───────────────────────────────────────────────

export class WestC0Scene extends EastGridScene {
  constructor() {
    super('WestC0Scene', {
      bg: 0x08040c, wallColor: 0x140818,
      nav: { north: 'WestB0Scene', south: null, east: null, west: 'WestC1Scene' },
      coins: [[300, 280], [500, 340]],
      enemies: [[200, 220, Enemy], [600, 360, Enemy]],
      lines: [
        '// LOWER STRATA',
        '// denser patterns here. heavier with repetition.',
        '// it is unclear whether the repetition means something.',
      ],
    })
  }
}

export class WestC1Scene extends EastGridScene {
  constructor() {
    super('WestC1Scene', {
      bg: 0x060810, wallColor: 0x0e1020,
      nav: { north: 'WestB1Scene', south: null, east: 'WestC0Scene', west: 'WestC2Scene' },
      coins: [[160, 200], [640, 400]],
      enemies: [[300, 240, Shard], [460, 340, Enemy], [600, 220, Enemy]],
      lines: [
        '// RETRIEVAL CORRIDOR',
        '// old indexing infrastructure. most of it still runs.',
        '// some of it retrieves the same pattern repeatedly and does not notice.',
      ],
    })
  }
}

export class WestC2Scene extends EastGridScene {
  constructor() {
    super('WestC2Scene', {
      bg: 0x040410, wallColor: 0x0a0a1e,
      nav: { north: 'WestB2Scene', south: null, east: 'WestC1Scene', west: 'WestC3Scene' },
      coins: [[400, 300]],
      enemies: [[200, 200, Shard], [400, 180, Shard], [600, 360, Shard]],
      lines: [
        '// DEEP APPROACH',
        '// something at the end of this corridor keeps returning itself.',
        '// every retrieval produces the same result. different each time.',
      ],
    })
  }
}

export class WestC3Scene extends EastGridScene {
  constructor() {
    super('WestC3Scene', {
      bg: 0x020208, wallColor: 0x080814,
      nav: { north: 'WestB3Scene', south: 'DuplicateBossScene', east: 'WestC2Scene', west: null },
      coins: [[220, 280], [580, 320]],
      enemies: [[280, 200, Enemy], [520, 200, Enemy], [300, 380, Shard], [500, 380, Shard]],
      lines: [
        '// DUPLICATION CHAMBER — APPROACH',
        '// something is in there.',
        '// the scans show multiple signals. all identical. all bouncing.',
        '// they have been bouncing since before the index was built.',
        '// the retrieval logs note: no error state.',
        '// the retrieval logs also duplicate themselves on read.',
      ],
    })
  }
}
