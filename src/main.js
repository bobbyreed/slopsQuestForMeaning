import Phaser from 'phaser'
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
import {
  EastA0Scene, EastA1Scene, EastA2Scene, EastA3Scene,
  EastB0Scene, EastB1Scene, EastB3Scene,
  EastC0Scene, EastC1Scene, EastC2Scene, EastC3Scene,
} from './scenes/east/EastGridScenes.js'
import { CastTownScene }      from './scenes/east/CastTownScene.js'

new Phaser.Game({
  type: Phaser.AUTO,
  width: 800,
  height: 600,
  backgroundColor: '#e8dfc8',
  physics: {
    default: 'arcade',
    arcade: { gravity: { y: 0 }, debug: false }
  },
  scene: [
    BootScene, TitleScene, MenuScene,
    WorldScene, NorthShrineScene, DungeonScene, TypingMinigameScene,
    FirstNPCScene, RenderBossScene,
    EastScene, WestScene,
    EastA0Scene, EastA1Scene, EastA2Scene, EastA3Scene,
    EastB0Scene, EastB1Scene, CastTownScene, EastB3Scene,
    EastC0Scene, EastC1Scene, EastC2Scene, EastC3Scene,
  ],
})
