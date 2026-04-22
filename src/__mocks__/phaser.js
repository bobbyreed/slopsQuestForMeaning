// Phaser mock — replaces the real browser-only Phaser in all test files.
// Only the parts our game code actually calls need to be here.

class Body {
  constructor() {
    this.velocity = { x: 0, y: 0 }
    this.speed = 0
    this._allowGravity = true
    this._acceleration = { x: 0, y: 0 }
  }
  setSize()         { return this }
  setOffset()       { return this }
  setDrag()         { return this }
  setMaxVelocity()  { return this }
  setAllowGravity(v) { this._allowGravity = v; return this }
  setVelocity(x, y) {
    this.velocity.x = x; this.velocity.y = y
    this.speed = Math.sqrt(x * x + y * y)
    return this
  }
  setVelocityX(x) { this.velocity.x = x; return this }
  setVelocityY(y) { this.velocity.y = y; return this }
  setAcceleration(x, y) { this._acceleration = { x, y }; return this }
  setAccelerationX(x) { this._acceleration.x = x; return this }
  setAccelerationY(y) { this._acceleration.y = y; return this }
}

class ArcadeSprite {
  constructor(scene, x, y, key) {
    this.scene = scene
    this.x = x
    this.y = y
    this.active = true
    this._texture = key
    this._depth = 0
    this._alpha = 1
    this._tint = null
    this._scale = 1
    this._visible = true
    this.body = new Body()
  }
  setDepth(d)      { this._depth = d; return this }
  setAlpha(a)      { this._alpha = a; return this }
  setTint(t)       { this._tint = t; return this }
  clearTint()      { this._tint = null; return this }
  setTexture(k)    { this._texture = k; return this }
  setScale(s)      { this._scale = s; return this }
  setVisible(v)    { this._visible = v; return this }
  setOrigin()      { return this }
  getBounds()      { return { x: this.x, y: this.y, width: 32, height: 32 } }
  destroy()        { this.active = false }
}

function makeTextObj(txt = '') {
  const obj = {
    _text: txt, _color: '#fff', _visible: true, _alpha: 1, active: true,
    setText(t)        { this._text = t; return this },
    setColor(c)       { this._color = c; return this },
    setVisible(v)     { this._visible = v; return this },
    setAlpha(a)       { this._alpha = a; return this },
    setDepth()        { return this },
    setOrigin()       { return this },
    setScrollFactor() { return this },
    setFillStyle()    { return this },
    setScale()        { return this },
    setFontStyle()    { return this },
    setStyle()        { return this },
    get text()      { return this._text },
    destroy()       { this.active = false },
  }
  return obj
}

function makeRect() {
  return {
    x: 0, y: 0, active: true,
    setDepth()       { return this },
    setAlpha()       { return this },
    setVisible()     { return this },
    setFillStyle()   { return this },
    setScale()       { return this },
    setScrollFactor(){ return this },
    destroy()        { this.active = false },
  }
}

function makeScene() {
  const audioCtx = {
    currentTime: 0,
    destination: {},
    createOscillator: vi.fn(() => ({
      connect: vi.fn(), start: vi.fn(), stop: vi.fn(),
      type: 'sine',
      frequency: { value: 440, setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() },
    })),
    createGain: vi.fn(() => ({
      connect: vi.fn(),
      gain: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() },
    })),
  }

  const scene = {
    make: {
      graphics: vi.fn(() => ({
        fillStyle:       vi.fn().mockReturnThis(),
        fillRect:        vi.fn().mockReturnThis(),
        fillEllipse:     vi.fn().mockReturnThis(),
        fillCircle:      vi.fn().mockReturnThis(),
        lineStyle:       vi.fn().mockReturnThis(),
        strokeRect:      vi.fn().mockReturnThis(),
        generateTexture: vi.fn().mockReturnThis(),
        destroy:         vi.fn(),
      })),
    },
    add: {
      existing:    vi.fn((obj) => { if (obj && !obj.body) obj.body = new Body() }),
      text:        vi.fn((_x, _y, txt) => makeTextObj(txt ?? '')),
      rectangle:   vi.fn(() => makeRect()),
      image:       vi.fn(() => ({ setDepth: vi.fn().mockReturnThis(), setScale: vi.fn().mockReturnThis(), setTint: vi.fn().mockReturnThis(), clearTint: vi.fn().mockReturnThis(), y: 300 })),
      circle:      vi.fn(() => makeRect()),
      container:   vi.fn(() => ({ add: vi.fn(), getAll: vi.fn(() => []), setDepth: vi.fn().mockReturnThis() })),
      zone:        vi.fn(() => ({ body: {} })),
    },
    physics: {
      add: {
        existing:    vi.fn((obj) => { if (obj && !obj.body) obj.body = new Body() }),
        staticImage: vi.fn(() => ({ setDepth: vi.fn().mockReturnThis(), setScale: vi.fn().mockReturnThis(), x: 400, y: 300 })),
        group:       vi.fn(() => ({
          add: vi.fn(), getChildren: vi.fn(() => []),
          create: vi.fn(() => ({ refreshBody: vi.fn(), setData: vi.fn(), setDepth: vi.fn().mockReturnThis(), active: true })),
        })),
        staticGroup: vi.fn(() => ({
          add: vi.fn(), remove: vi.fn(), getChildren: vi.fn(() => []),
          create: vi.fn(() => ({ refreshBody: vi.fn(), setData: vi.fn(), active: true, getData: vi.fn(() => false) })),
        })),
        collider:  vi.fn(),
        overlap:   vi.fn(),
      },
      world: { enable: vi.fn() },
    },
    time: {
      addEvent:    vi.fn(() => ({ remove: vi.fn() })),
      delayedCall: vi.fn(),
    },
    tweens: {
      add:          vi.fn(),
      killTweensOf: vi.fn(),
    },
    cameras: {
      main: {
        fadeIn:  vi.fn(),
        fade:    vi.fn(),
        flash:   vi.fn(),
        shake:   vi.fn(),
      },
    },
    input: {
      keyboard: {
        createCursorKeys: vi.fn(() => ({
          left:  { isDown: false },
          right: { isDown: false },
          up:    { isDown: false },
          down:  { isDown: false },
        })),
        addKeys: vi.fn(map => Object.fromEntries(Object.keys(map).map(k => [k, { isDown: false }]))),
        addKey:  vi.fn(() => ({ isDown: false })),
        on:      vi.fn(),
        off:     vi.fn(),
      },
      on: vi.fn(),
    },
    sound: { context: audioCtx },
    scale: { width: 800, height: 600 },
    events: {
      on:   vi.fn(),
      off:  vi.fn(),
      emit: vi.fn(),
    },
    scene: {
      isActive: vi.fn(() => true),
      start:    vi.fn(),
      restart:  vi.fn(),
      launch:   vi.fn(),
      pause:    vi.fn(),
      resume:   vi.fn(),
      stop:     vi.fn(),
    },
    _audioCtx: audioCtx,
  }
  return scene
}

class Scene {
  constructor(key) {
    this.sys = { settings: { key: typeof key === 'string' ? key : key?.key } }
    Object.assign(this, makeScene())
  }
}

const Phaser = {
  Physics: { Arcade: { Sprite: ArcadeSprite } },
  Scene,
  Math: {
    Between:  (min, _max) => min,
    RND: { pick: arr => arr[0] },
    Distance: { Between: (x1, y1, x2, y2) => Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2) },
  },
  Input: {
    Keyboard: {
      KeyCodes: {
        A: 65, D: 68, W: 87, S: 83,
        SPACE: 32, ENTER: 13, E: 69, R: 82, ESCAPE: 27, SHIFT: 16,
      },
      JustDown: vi.fn(() => false),
    },
  },
  Geom: {
    Intersects: { RectangleToRectangle: vi.fn(() => false) },
  },
  AUTO: 'AUTO',
  Game: vi.fn(),
}

export default Phaser
export { makeScene, makeTextObj }
