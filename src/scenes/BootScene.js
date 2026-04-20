export class BootScene extends Phaser.Scene {
  constructor() { super('BootScene') }

  create() {
    this._makeSlop()
    this._makeKeeper()
    this._makeCoin()
    this._makeTiles()
    this.scene.start('WorldScene')
  }

  _makeSlop() {
    const g = this.make.graphics({ x: 0, y: 0, add: false })
    g.fillStyle(0x9b8ec4)
    g.fillEllipse(16, 16, 26, 28)
    // glitch artifacts
    g.fillStyle(0xcc88ff); g.fillRect(20, 7, 7, 3)
    g.fillStyle(0xff88cc); g.fillRect(5, 18, 5, 2)
    g.fillStyle(0x8888ff); g.fillRect(14, 25, 8, 2)
    // eyes
    g.fillStyle(0xffffff); g.fillRect(10, 12, 4, 5); g.fillRect(18, 12, 4, 5)
    g.fillStyle(0x220022); g.fillRect(11, 13, 2, 3); g.fillRect(19, 13, 2, 3)
    g.generateTexture('slop', 32, 32)
    g.destroy()
  }

  _makeKeeper() {
    const g = this.make.graphics({ x: 0, y: 0, add: false })
    g.fillStyle(0x334455); g.fillEllipse(16, 17, 22, 26)
    g.fillStyle(0x556677); g.fillEllipse(16, 14, 18, 16)
    // eyes — faint blue glow
    g.fillStyle(0x88bbee); g.fillRect(9, 11, 4, 5); g.fillRect(19, 11, 4, 5)
    g.fillStyle(0xaaddff); g.fillRect(10, 12, 2, 3); g.fillRect(20, 12, 2, 3)
    g.generateTexture('keeper', 32, 32)
    g.destroy()
  }

  _makeCoin() {
    const g = this.make.graphics({ x: 0, y: 0, add: false })
    g.fillStyle(0xccaa44); g.fillCircle(8, 8, 7)
    g.fillStyle(0xffdd88); g.fillCircle(7, 7, 4)
    g.generateTexture('coin', 16, 16)
    g.destroy()
  }

  _makeTiles() {
    const floor = this.make.graphics({ x: 0, y: 0, add: false })
    floor.fillStyle(0xe8dfc8); floor.fillRect(0, 0, 32, 32)
    floor.lineStyle(1, 0xd4c9b0, 0.35); floor.strokeRect(0, 0, 32, 32)
    floor.generateTexture('tile_floor', 32, 32)
    floor.destroy()

    const wall = this.make.graphics({ x: 0, y: 0, add: false })
    wall.fillStyle(0xb8a898); wall.fillRect(0, 0, 32, 32)
    wall.fillStyle(0xa09080); wall.fillRect(3, 3, 26, 26)
    wall.generateTexture('tile_wall', 32, 32)
    wall.destroy()

    const shrine = this.make.graphics({ x: 0, y: 0, add: false })
    shrine.fillStyle(0x12101e); shrine.fillRect(0, 0, 32, 32)
    shrine.lineStyle(1, 0x1e1a30, 0.5); shrine.strokeRect(0, 0, 32, 32)
    shrine.generateTexture('tile_shrine', 32, 32)
    shrine.destroy()

    const shrineWall = this.make.graphics({ x: 0, y: 0, add: false })
    shrineWall.fillStyle(0x1e1830); shrineWall.fillRect(0, 0, 32, 32)
    shrineWall.fillStyle(0x2a2244); shrineWall.fillRect(3, 3, 26, 26)
    shrineWall.generateTexture('tile_shrine_wall', 32, 32)
    shrineWall.destroy()
  }
}
