// colorKey.js — background removal for AI-generated sprite sheets.
//
// Two-pass algorithm:
//   1. Flood fill from all four sheet edges, seeded with the background color
//      sampled from the four corner pixels. Only removes pixels that are
//      background-colored AND connected to the edge — dark parts of the
//      character that don't touch the background are left untouched.
//   2. Threshold fallback: removes isolated dark, unsaturated pixels that
//      the flood fill couldn't reach (trapped interior background patches).
//
// Options:
//   tolerance  — max Euclidean color distance from bg color for flood fill (default 35)
//   bright     — brightness ceiling for threshold fallback (default 45)
//   sat        — saturation ceiling for threshold fallback (default 0.20)

export const DEFAULT_KEY_OPTIONS = { tolerance: 35, bright: 45, sat: 0.20 }

// Apply color key to an existing canvas in-place.
export function colorKeyCanvas(canvas, options = {}) {
  const { tolerance = 35, bright = 45, sat = 0.20 } = options
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  const w = canvas.width
  const h = canvas.height
  const id   = ctx.getImageData(0, 0, w, h)
  const data = id.data

  // Sample the four corners to derive the background color
  const n = w * h
  const corners = [0, w - 1, (h - 1) * w, (h - 1) * w + (w - 1)]
  let bgR = 0, bgG = 0, bgB = 0
  for (const c of corners) {
    bgR += data[c * 4]; bgG += data[c * 4 + 1]; bgB += data[c * 4 + 2]
  }
  bgR = bgR / 4 | 0; bgG = bgG / 4 | 0; bgB = bgB / 4 | 0

  // Pass 1 — flood fill from all four edges
  _floodFill(data, w, h, n, bgR, bgG, bgB, tolerance)

  // Pass 2 — threshold fallback for isolated interior background pixels
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] === 0) continue          // already transparent
    const r = data[i], g = data[i + 1], b = data[i + 2]
    const max = Math.max(r, g, b)
    const s   = max === 0 ? 0 : (max - Math.min(r, g, b)) / max
    if (max < bright && s < sat) data[i + 3] = 0
  }

  ctx.putImageData(id, 0, 0)
}

// Build and register a color-keyed texture in Phaser's texture manager.
// procKey = 'proc-' + sheetKey.
// Returns procKey on success, null on failure.
// No-ops if the proc texture already exists (Phaser caches across scene restarts).
export function buildProcessedTexture(textures, sheetKey, sheetMeta, options = {}) {
  const procKey = 'proc-' + sheetKey
  if (textures.exists(procKey)) return procKey

  try {
    const meta   = sheetMeta[sheetKey]
    const img    = textures.get(sheetKey).source[0].image
    const canvas = document.createElement('canvas')
    canvas.width  = img.naturalWidth  || meta.w
    canvas.height = img.naturalHeight || meta.h

    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    ctx.drawImage(img, 0, 0)
    colorKeyCanvas(canvas, options)
    textures.addCanvas(procKey, canvas)
    return procKey
  } catch (e) {
    console.warn(`[colorKey] failed for ${sheetKey}:`, e.message)
    return null
  }
}

// ── Internal ───────────────────────────────────────────────────────────────────

function _floodFill(data, w, h, n, bgR, bgG, bgB, tolerance) {
  const tol2    = tolerance * tolerance   // compare squared distance — avoids sqrt
  const visited = new Uint8Array(n)
  const queue   = new Int32Array(n)       // pre-allocated; avoids GC churn
  let qHead = 0, qTail = 0

  function seed(idx) {
    if (!visited[idx]) { visited[idx] = 1; queue[qTail++] = idx }
  }

  // Seed every pixel on all four edges
  for (let x = 0; x < w; x++) { seed(x); seed((h - 1) * w + x) }
  for (let y = 1; y < h - 1; y++) { seed(y * w); seed(y * w + w - 1) }

  while (qHead < qTail) {
    const idx = queue[qHead++]
    const pi  = idx << 2
    const dr  = data[pi] - bgR
    const dg  = data[pi + 1] - bgG
    const db  = data[pi + 2] - bgB

    // If this pixel isn't close enough to the background color, don't expand
    if (dr * dr + dg * dg + db * db > tol2) continue

    data[pi + 3] = 0   // transparent

    const x = idx % w
    if (x > 0     && !visited[idx - 1]) { visited[idx - 1] = 1; queue[qTail++] = idx - 1 }
    if (x < w - 1 && !visited[idx + 1]) { visited[idx + 1] = 1; queue[qTail++] = idx + 1 }
    if (idx >= w   && !visited[idx - w]) { visited[idx - w] = 1; queue[qTail++] = idx - w }
    if (idx < n - w && !visited[idx + w]) { visited[idx + w] = 1; queue[qTail++] = idx + w }
  }
}
