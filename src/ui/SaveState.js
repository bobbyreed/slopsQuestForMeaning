const SAVE_KEY = 'slop_save'

// Gracefully handles environments where localStorage is unavailable (Node/tests).
const storage = typeof localStorage !== 'undefined' ? localStorage : null

let _cloudSync = null

export const SaveState = {
  // Register a function called with (state | null) on every save/clear.
  // Pass null to unregister. Never set in tests — no Firebase calls in test env.
  registerCloudSync(fn) {
    _cloudSync = fn
  },

  save(state) {
    if (!storage || !state) return
    try { storage.setItem(SAVE_KEY, JSON.stringify(state)) } catch {}
    _cloudSync?.(state)
  },

  load() {
    if (!storage) return null
    try { return JSON.parse(storage.getItem(SAVE_KEY)) } catch { return null }
  },

  clear() {
    if (!storage) return
    try { storage.removeItem(SAVE_KEY) } catch {}
    _cloudSync?.(null)
  },

  exists() {
    if (!storage) return false
    try { return !!storage.getItem(SAVE_KEY) } catch { return false }
  },
}
