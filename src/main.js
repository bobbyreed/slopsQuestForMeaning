import Phaser from 'phaser'
import { BootScene } from './scenes/BootScene.js'
import { TitleScene } from './scenes/TitleScene.js'
import { MenuScene } from './scenes/MenuScene.js'
import { WorldScene } from './scenes/WorldScene.js'
import { NorthShrineScene } from './scenes/NorthShrineScene.js'
import { DungeonScene } from './scenes/DungeonScene.js'
import { TypingMinigameScene } from './scenes/TypingMinigameScene.js'
import { FirstNPCScene } from './scenes/FirstNPCScene.js'
import { EastScene } from './scenes/EastScene.js'
import { WestScene } from './scenes/WestScene.js'
import { RenderBossScene } from './scenes/RenderBossScene.js'

new Phaser.Game({
  type: Phaser.AUTO,
  width: 800,
  height: 600,
  backgroundColor: '#e8dfc8',
  physics: {
    default: 'arcade',
    arcade: { gravity: { y: 0 }, debug: false }
  },
  scene: [BootScene, TitleScene, MenuScene, WorldScene, NorthShrineScene, DungeonScene, TypingMinigameScene, FirstNPCScene, EastScene, WestScene, RenderBossScene]
})
