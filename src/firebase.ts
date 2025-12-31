import { initializeApp, type FirebaseApp } from 'firebase/app'
import { getFirestore, type Firestore } from 'firebase/firestore'

// Configuración de Firebase
const firebaseConfig = {
  apiKey: "AIzaSyDPS_YRvW8H3p-vBNkBqq-1O84NLZiNpEw",
  authDomain: "bks-catalogo.firebaseapp.com",
  projectId: "bks-catalogo",
  storageBucket: "bks-catalogo.firebasestorage.app",
  messagingSenderId: "538660649196",
  appId: "1:538660649196:web:2304716dd2cc0B945a4dc9",
  measurementId: "G-7KZS93DNWT"
}

// Inicializar Firebase
const isFirebaseConfigured = true

let app: FirebaseApp | null = null
let db: Firestore | null = null

if (isFirebaseConfigured) {
  try {
    app = initializeApp(firebaseConfig)
    db = getFirestore(app)
    console.log('✅ Firebase configurado correctamente')
  } catch (error) {
    console.error('❌ Error inicializando Firebase:', error)
  }
} else {
  console.log('⚠️ Firebase no configurado - usando localStorage. Configura Firebase para sincronización en la nube.')
}

export { db, isFirebaseConfigured }
