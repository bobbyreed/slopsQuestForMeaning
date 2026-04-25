import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'

// Fill in values from Firebase console → Project Settings → Your apps → Web app
const firebaseConfig = {
  apiKey: "REPLACE_ME",
  authDomain: "slopsquest.firebaseapp.com",
  projectId: "slopsquest",
  storageBucket: "slopsquest.appspot.com",
  messagingSenderId: "REPLACE_ME",
  appId: "REPLACE_ME",
}

export const app = initializeApp(firebaseConfig)
export const auth = getAuth(app)
export const db = getFirestore(app)
