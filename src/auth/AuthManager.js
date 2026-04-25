import {
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as fbSignOut,
  onAuthStateChanged,
  GoogleAuthProvider,
} from 'firebase/auth'
import { auth } from '../firebase.js'

const googleProvider = new GoogleAuthProvider()

export const AuthManager = {
  signInWithGoogle() {
    return signInWithPopup(auth, googleProvider)
  },

  signInWithEmail(email, password) {
    return signInWithEmailAndPassword(auth, email, password)
  },

  createAccount(email, password) {
    return createUserWithEmailAndPassword(auth, email, password)
  },

  signOut() {
    return fbSignOut(auth)
  },

  getCurrentUser() {
    return auth.currentUser
  },

  onAuthStateChange(cb) {
    return onAuthStateChanged(auth, cb)
  },
}
