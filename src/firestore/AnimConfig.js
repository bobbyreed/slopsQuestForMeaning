import {
  collection, doc,
  getDoc, getDocs,
  addDoc, updateDoc, deleteDoc,
  serverTimestamp,
} from 'firebase/firestore'
import { db } from '../firebase.js'

const CONFIGS = 'animConfigs'
const ADMINS  = 'admins'

export const AnimConfig = {
  async isAdmin(uid) {
    if (!uid) return false
    try {
      const snap = await getDoc(doc(db, ADMINS, uid))
      return snap.exists()
    } catch { return false }
  },

  async save({ sheetKey, sheetW, sheetH, label, frameRate, frames }) {
    const ref = await addDoc(collection(db, CONFIGS), {
      sheetKey, sheetW, sheetH, label, frameRate, frames,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
    return ref.id
  },

  async loadAll() {
    const snap = await getDocs(collection(db, CONFIGS))
    return snap.docs.map(d => ({ id: d.id, ...d.data() }))
  },

  async update(id, updates) {
    await updateDoc(doc(db, CONFIGS, id), {
      ...updates,
      updatedAt: serverTimestamp(),
    })
  },

  async delete(id) {
    await deleteDoc(doc(db, CONFIGS, id))
  },
}
