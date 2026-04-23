// WCAG 2.1 contrast and colorblind safety checks for all game-critical text pairs.
//
// Pass criteria:
//   Small text (< 14px bold / < 18px normal): contrast ratio ≥ 4.5:1
//   Large text (≥ 18px, or ≥ 14px bold):     contrast ratio ≥ 3.0:1
//   Colorblind: no pair that passes only via hue should be listed here;
//               deuteranopia/protanopia simulations are spot-checked for pairs
//               that carry meaning through color alone.

import { describe, it, expect } from 'vitest'

// ─── WCAG helpers ────────────────────────────────────────────────────────────

function sRGBToLinear(c) {
  const s = c / 255
  return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4)
}

function relativeLuminance(hex) {
  const n = parseInt(hex.replace('#', ''), 16)
  const r = sRGBToLinear((n >> 16) & 0xff)
  const g = sRGBToLinear((n >> 8) & 0xff)
  const b = sRGBToLinear(n & 0xff)
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

function hexFromInt(n) {
  return '#' + n.toString(16).padStart(6, '0')
}

function contrastRatio(fg, bg) {
  const fgL = relativeLuminance(fg.startsWith('#') ? fg : hexFromInt(fg))
  const bgL = relativeLuminance(bg.startsWith('#') ? bg : hexFromInt(bg))
  const lighter = Math.max(fgL, bgL)
  const darker  = Math.min(fgL, bgL)
  return (lighter + 0.05) / (darker + 0.05)
}

// ─── Colorblind simulation ────────────────────────────────────────────────────
// Matrices from Machado et al. (2009), severity=1.0 (complete).

const DEUTERANOPIA_M = [
  [0.367, 0.861, -0.228],
  [0.280, 0.673,  0.047],
  [-0.012, 0.043, 0.969],
]

const PROTANOPIA_M = [
  [0.153, 1.053, -0.205],
  [0.115, 0.786,  0.099],
  [-0.004, -0.048, 1.052],
]

function simulateColorblind(hex, matrix) {
  const n = parseInt(hex.replace('#', ''), 16)
  const r = (n >> 16) & 0xff
  const g = (n >> 8) & 0xff
  const b = n & 0xff
  const rr = Math.round(Math.min(255, Math.max(0, matrix[0][0] * r + matrix[0][1] * g + matrix[0][2] * b)))
  const rg = Math.round(Math.min(255, Math.max(0, matrix[1][0] * r + matrix[1][1] * g + matrix[1][2] * b)))
  const rb = Math.round(Math.min(255, Math.max(0, matrix[2][0] * r + matrix[2][1] * g + matrix[2][2] * b)))
  return '#' + ((rr << 16) | (rg << 8) | rb).toString(16).padStart(6, '0')
}

function colorblindContrast(fg, bg, matrix) {
  return contrastRatio(simulateColorblind(fg, matrix), simulateColorblind(bg, matrix))
}

// ─── Game color pairs ─────────────────────────────────────────────────────────
//
// Each entry: { label, fg, bg, minRatio, large? }
// large: true means the text qualifies as "large" (≥ 18px or ≥ 14px bold)
// minRatio defaults to 4.5 (small text AA), 3.0 for large text

const PAIRS = [
  // EastGridScene — lore lines on dark mosaic floor
  { label: 'EastGridScene lore text',       fg: '#9a8060', bg: '#080808' },
  // EastScene — direction hint labels
  { label: 'EastScene west label',          fg: '#9a8060', bg: '#100a06' },
  { label: 'EastScene east label',          fg: '#9a8060', bg: '#100a06' },
  // WestScene — lore lines and direction label
  { label: 'WestScene lore lines',          fg: '#9977bb', bg: '#040308' },
  { label: 'WestScene east label',          fg: '#9977bb', bg: '#040308' },
  // CastTownScene — town nameplate
  { label: 'CastTownScene name',            fg: '#c8a96e', bg: '#1a1614' },
  { label: 'CastTownScene subtitle',        fg: '#b09060', bg: '#1a1614' },
  // NorthShrineScene — separator line (large/decorative — 3:1 threshold)
  { label: 'NorthShrineScene separator',    fg: '#8a7aaa', bg: '#0d0b16', minRatio: 3.0, large: true },
  // RenderBossScene — retry hint
  { label: 'RenderBossScene retry hint',    fg: '#aa8866', bg: '#000000' },
  // FirstNPCScene — light blue-grey room, dark label text
  { label: 'FirstNPCScene "THE RENDER"',    fg: '#334466', bg: '#d8dce8' },
  // PauseScene HUD / panel backgrounds (dark overlays)
  { label: 'PauseScene tab label active',   fg: '#aaccff', bg: '#0a0e1a' },
  { label: 'PauseScene tab label inactive', fg: '#7a9acc', bg: '#0a0e1a' },
  // PauseScene map — visited node labels (6px, large threshold)
  { label: 'PauseScene map visited label',  fg: '#7a9acc', bg: '#0a0e1a', minRatio: 3.0, large: true },
  // WorldScene / dungeon coin labels
  { label: 'Coin HUD text amber',           fg: '#ccaa44', bg: '#0a0a0a' },
  // Dialogue box text
  { label: 'Dialogue body text',            fg: '#cce8cc', bg: '#0d1a0d' },
  { label: 'Dialogue speaker name',         fg: '#88cc88', bg: '#0d1a0d' },
]

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('WCAG color contrast — game-critical text pairs', () => {
  PAIRS.forEach(({ label, fg, bg, minRatio = 4.5, large = false }) => {
    it(`${label} meets WCAG AA (≥${minRatio}:1)`, () => {
      const ratio = contrastRatio(fg, bg)
      expect(ratio).toBeGreaterThanOrEqual(minRatio)
    })
  })
})

describe('Colorblind safety — deuteranopia simulation', () => {
  // Only pairs where hue carries meaning (e.g., green vs red) need this check.
  // All game pairs listed here should still meet 3:1 when desaturated by deuteranopia.
  const MEANINGFUL_PAIRS = PAIRS.filter(p =>
    // skip pairs where color is purely decorative (separator)
    !p.large
  )

  MEANINGFUL_PAIRS.forEach(({ label, fg, bg, minRatio = 3.0 }) => {
    it(`${label} — deuteranopia ≥${minRatio}:1`, () => {
      const ratio = colorblindContrast(fg, bg, DEUTERANOPIA_M)
      expect(ratio).toBeGreaterThanOrEqual(minRatio)
    })
  })
})

describe('Colorblind safety — protanopia simulation', () => {
  const MEANINGFUL_PAIRS = PAIRS.filter(p => !p.large)

  MEANINGFUL_PAIRS.forEach(({ label, fg, bg, minRatio = 3.0 }) => {
    it(`${label} — protanopia ≥${minRatio}:1`, () => {
      const ratio = colorblindContrast(fg, bg, PROTANOPIA_M)
      expect(ratio).toBeGreaterThanOrEqual(minRatio)
    })
  })
})

// ─── Utility function unit tests ─────────────────────────────────────────────

describe('WCAG utility functions', () => {
  it('sRGBToLinear: black → 0', () => {
    expect(sRGBToLinear(0)).toBe(0)
  })

  it('sRGBToLinear: white → 1', () => {
    expect(sRGBToLinear(255)).toBeCloseTo(1, 2)
  })

  it('sRGBToLinear: mid-grey uses power curve not linear', () => {
    // 128/255 = 0.502, well above 0.04045 threshold, uses power curve
    const v = sRGBToLinear(128)
    expect(v).toBeGreaterThan(0.2)
    expect(v).toBeLessThan(0.22)
  })

  it('relativeLuminance: black → 0', () => {
    expect(relativeLuminance('#000000')).toBe(0)
  })

  it('relativeLuminance: white → 1', () => {
    expect(relativeLuminance('#ffffff')).toBeCloseTo(1, 2)
  })

  it('contrastRatio: black on white → 21:1', () => {
    expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 0)
  })

  it('contrastRatio: identical colors → 1:1', () => {
    expect(contrastRatio('#884422', '#884422')).toBeCloseTo(1, 5)
  })

  it('contrastRatio: symmetric (fg/bg order does not matter)', () => {
    const a = contrastRatio('#9a8060', '#080808')
    const b = contrastRatio('#080808', '#9a8060')
    expect(a).toBeCloseTo(b, 5)
  })

  it('simulateColorblind: white stays near-white under deuteranopia', () => {
    const sim = simulateColorblind('#ffffff', DEUTERANOPIA_M)
    const n = parseInt(sim.replace('#', ''), 16)
    const r = (n >> 16) & 0xff
    const g = (n >> 8) & 0xff
    const b = n & 0xff
    expect(r).toBeGreaterThan(220)
    expect(g).toBeGreaterThan(220)
    expect(b).toBeGreaterThan(220)
  })

  it('simulateColorblind: black stays black under protanopia', () => {
    expect(simulateColorblind('#000000', PROTANOPIA_M)).toBe('#000000')
  })
})
