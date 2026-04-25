import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'
import { getAnalytics } from 'firebase/analytics'

const firebaseConfig = {
  apiKey: "AIzaSyBIXL99wK46S2r9DJ01zY5FMi_MN5I87ok",
  authDomain: "slopsquest.firebaseapp.com",
  projectId: "slopsquest",
  storageBucket: "slopsquest.firebasestorage.app",
  messagingSenderId: "1013907264552",
  appId: "1:1013907264552:web:4b6e7c806e2be47462911d",
  measurementId: "G-1BZSNK8YWF",
}

export const app      = initializeApp(firebaseConfig)
export const auth     = getAuth(app)
export const db       = getFirestore(app)
export const analytics = typeof window !== 'undefined' ? getAnalytics(app) : null
