import Phaser from 'phaser'
import { BootScene } from './scenes/BootScene.js'
import { WorldScene } from './scenes/WorldScene.js'
import { NorthShrineScene } from './scenes/NorthShrineScene.js'

new Phaser.Game({
  type: Phaser.AUTO,
  width: 800,
  height: 600,
  backgroundColor: '#e8dfc8',
  physics: {
    default: 'arcade',
    arcade: { gravity: { y: 0 }, debug: false }
  },
  scene: [BootScene, WorldScene, NorthShrineScene]
})
