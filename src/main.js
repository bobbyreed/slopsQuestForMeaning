import Phaser from 'phaser'
import { PauseScene }         from './scenes/PauseScene.js'
import { BootScene }          from './scenes/BootScene.js'
import { TitleScene }         from './scenes/TitleScene.js'
import { MenuScene }          from './scenes/MenuScene.js'
import { WorldScene }         from './scenes/WorldScene.js'
import { NorthShrineScene }   from './scenes/NorthShrineScene.js'
import { DungeonScene }       from './scenes/DungeonScene.js'
import { TypingMinigameScene } from './scenes/TypingMinigameScene.js'
import { FirstNPCScene }      from './scenes/FirstNPCScene.js'
import { EastScene }          from './scenes/EastScene.js'
import { WestScene }          from './scenes/WestScene.js'
import { RenderBossScene }    from './scenes/RenderBossScene.js'
import { ConvergenceScene }  from './scenes/ConvergenceScene.js'
import {
  EastA0Scene, EastA1Scene, EastA2Scene, EastA3Scene,
  EastB0Scene, EastB1Scene, EastB3Scene,
  EastC0Scene, EastC1Scene, EastC2Scene, EastC3Scene,
} from './scenes/east/EastGridScenes.js'
import { CastTownScene }      from './scenes/east/CastTownScene.js'
import { SectorScene }        from './scenes/east/SectorScene.js'
import { PixelBossScene }     from './scenes/east/PixelBossScene.js'
import {
  WestA0Scene, WestA1Scene, WestA2Scene, WestA3Scene,
  WestB0Scene, WestB1Scene, WestB3Scene,
  WestC0Scene, WestC1Scene, WestC2Scene, WestC3Scene,
} from './scenes/west/WestGridScenes.js'
import { WestGateScene }      from './scenes/west/WestGateScene.js'
import { ArchiveTownScene }   from './scenes/west/ArchiveTownScene.js'
import { DuplicateBossScene } from './scenes/west/DuplicateBossScene.js'

new Phaser.Game({
  type: Phaser.AUTO,
  width: 800,
  height: 600,
  backgroundColor: '#e8dfc8',
  dom: { createContainer: true },
  physics: {
    default: 'arcade',
    arcade: { gravity: { y: 0 }, debug: false }
  },
  scene: [
    BootScene, TitleScene, MenuScene,
    WorldScene, NorthShrineScene, DungeonScene, TypingMinigameScene,
    FirstNPCScene, RenderBossScene,
    EastScene, WestScene, SectorScene, PixelBossScene, ConvergenceScene,
    EastA0Scene, EastA1Scene, EastA2Scene, EastA3Scene,
    EastB0Scene, EastB1Scene, CastTownScene, EastB3Scene,
    EastC0Scene, EastC1Scene, EastC2Scene, EastC3Scene,
    WestGateScene, ArchiveTownScene, DuplicateBossScene,
    WestA0Scene, WestA1Scene, WestA2Scene, WestA3Scene,
    WestB0Scene, WestB1Scene, WestB3Scene,
    WestC0Scene, WestC1Scene, WestC2Scene, WestC3Scene,
    PauseScene,
  ],
})
