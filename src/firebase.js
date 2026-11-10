import { initializeApp } from 'firebase/app'
import { getAuth, connectAuthEmulator } from 'firebase/auth'
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore'

// Serveur de dev (`make up`) : toujours les émulateurs Auth + Firestore, jamais la base de production.
// Projet « demo-* » : le SDK n'a besoin d'aucune vraie clé, et ne peut rien joindre en ligne.
// (`mode` vaut « test » sous vitest et « production » au build : seuls les vrais réglages y servent.)
const useEmulator = import.meta.env.MODE === 'development'

const firebaseConfig = useEmulator
  ? { apiKey: 'demo', authDomain: 'localhost', projectId: 'demo-jilu' }
  : {
      apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
      authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
      projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
      storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
      appId: import.meta.env.VITE_FIREBASE_APP_ID
    }

const app = initializeApp(firebaseConfig)
export const auth = getAuth(app)
export const db = getFirestore(app)

if (useEmulator) {
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true })
  connectFirestoreEmulator(db, '127.0.0.1', 8080)
}
