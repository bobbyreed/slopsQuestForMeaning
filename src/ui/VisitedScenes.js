const VISITED_KEY = 'slop_visited'

const storage = typeof localStorage !== 'undefined' ? localStorage : null

function load() {
  if (!storage) return {}
  try { return JSON.parse(storage.getItem(VISITED_KEY)) ?? {} } catch { return {} }
}

export const VisitedScenes = {
  mark(key) {
    if (!storage) return
    const data = load()
    data[key] = true
    try { storage.setItem(VISITED_KEY, JSON.stringify(data)) } catch {}
  },

  has(key) {
    return !!load()[key]
  },

  all() {
    return Object.keys(load())
  },

  clear() {
    if (!storage) return
    try { storage.removeItem(VISITED_KEY) } catch {}
  },
}
