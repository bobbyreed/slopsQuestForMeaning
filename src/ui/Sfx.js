export const Sfx = {
  _ctx(scene) {
    try { return scene.sound.context } catch (_) { return null }
  },

  coin(scene) {
    const ctx = this._ctx(scene)
    if (!ctx) return
    const t = ctx.currentTime
    const freqs = [660, 880]
    freqs.forEach((freq, i) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain); gain.connect(ctx.destination)
      osc.type = 'sine'
      osc.frequency.value = freq
      gain.gain.setValueAtTime(0.08, t + i * 0.06)
      gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.06 + 0.12)
      osc.start(t + i * 0.06)
      osc.stop(t + i * 0.06 + 0.14)
    })
  },

  enemyDeath(scene) {
    const ctx = this._ctx(scene)
    if (!ctx) return
    const t = ctx.currentTime
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain); gain.connect(ctx.destination)
    osc.type = 'sawtooth'
    osc.frequency.setValueAtTime(220, t)
    osc.frequency.exponentialRampToValueAtTime(55, t + 0.22)
    gain.gain.setValueAtTime(0.06, t)
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25)
    osc.start(t); osc.stop(t + 0.26)
  },

  slopHit(scene) {
    const ctx = this._ctx(scene)
    if (!ctx) return
    const t = ctx.currentTime
    ;[180, 270, 360].forEach((freq, i) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain); gain.connect(ctx.destination)
      osc.type = 'square'
      osc.frequency.value = freq
      gain.gain.setValueAtTime(0.04, t + i * 0.015)
      gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.015 + 0.1)
      osc.start(t + i * 0.015); osc.stop(t + i * 0.015 + 0.12)
    })
  },

  promptFire(scene) {
    const ctx = this._ctx(scene)
    if (!ctx) return
    const t = ctx.currentTime
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain); gain.connect(ctx.destination)
    osc.type = 'sine'
    osc.frequency.setValueAtTime(440, t)
    osc.frequency.exponentialRampToValueAtTime(880, t + 0.08)
    gain.gain.setValueAtTime(0.05, t)
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.1)
    osc.start(t); osc.stop(t + 0.12)
  },
}
