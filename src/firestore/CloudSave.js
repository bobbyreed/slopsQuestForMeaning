import { doc, getDoc, setDoc, deleteDoc } from 'firebase/firestore'
import { db } from '../firebase.js'

export const CloudSave = {
  async load(uid) {
    try {
      const snap = await getDoc(doc(db, 'users', uid, 'data', 'save'))
      return snap.exists() ? snap.data() : null
    } catch { return null }
  },

  save(uid, state) {
    if (state === null) {
      deleteDoc(doc(db, 'users', uid, 'data', 'save')).catch(() => {})
      return
    }
    setDoc(doc(db, 'users', uid, 'data', 'save'), state).catch(() => {})
  },

  async loadProfile(uid) {
    try {
      const snap = await getDoc(doc(db, 'users', uid, 'data', 'profile'))
      return snap.exists() ? snap.data() : null
    } catch { return null }
  },

  saveProfile(uid, data) {
    setDoc(doc(db, 'users', uid, 'data', 'profile'), data, { merge: true }).catch(() => {})
  },
}
