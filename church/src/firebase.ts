import { initializeApp } from 'firebase/app'
import { getFirestore, collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
}

const app = initializeApp(firebaseConfig)
const db = getFirestore(app)

export function subscribeRecentTemps(onUpdate: (docs: any[]) => void, limitCount = 100) {
  const col = collection(db, import.meta.env.VITE_FIRESTORE_COLLECTION || 'temperatures')
  const q = query(col, orderBy('timestamp', 'desc'), limit(limitCount))
  return onSnapshot(q, (snapshot) => {
    const items = snapshot.docs.map(d => ({ id: d.id, ...d.data() }))
    onUpdate(items)
  })
}

export function subscribeAlerts(onUpdate: (docs: any[]) => void, limitCount = 100) {
  const col = collection(db, import.meta.env.VITE_FIRESTORE_ALERTS_COLLECTION || 'alerts')
  const q = query(col, orderBy('timestamp', 'desc'), limit(limitCount))
  return onSnapshot(q, (snapshot) => {
    const items = snapshot.docs.map(d => ({ id: d.id, ...d.data() }))
    onUpdate(items)
  })
}

export default db
