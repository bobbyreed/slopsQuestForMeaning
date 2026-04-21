const SAVE_KEY = 'slop_save'

// Gracefully handles environments where localStorage is unavailable (Node/tests).
const storage = typeof localStorage !== 'undefined' ? localStorage : null

export const SaveState = {
  save(state) {
    if (!storage || !state) return
    try { storage.setItem(SAVE_KEY, JSON.stringify(state)) } catch {}
  },

  load() {
    if (!storage) return null
    try { return JSON.parse(storage.getItem(SAVE_KEY)) } catch { return null }
  },

  clear() {
    if (!storage) return
    try { storage.removeItem(SAVE_KEY) } catch {}
  },

  exists() {
    if (!storage) return false
    try { return !!storage.getItem(SAVE_KEY) } catch { return false }
  },
}
