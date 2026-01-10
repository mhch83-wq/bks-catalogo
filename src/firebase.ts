import { initializeApp, getApps, type FirebaseApp } from 'firebase/app'
import { getFirestore, type Firestore } from 'firebase/firestore'
import { getAuth, type Auth, GoogleAuthProvider } from 'firebase/auth'

// Configuración de Firebase desde variables de entorno
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: "G-7KZS93DNWT"
}

// Verificar que las variables de entorno se están leyendo correctamente
console.log('🔍 Verificando variables de entorno Firebase:')
console.log('  - VITE_FIREBASE_AUTH_DOMAIN:', import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '❌ NO DEFINIDA')
console.log('  - VITE_FIREBASE_API_KEY (primeros 10 chars):', import.meta.env.VITE_FIREBASE_API_KEY?.substring(0, 10) || '❌ NO DEFINIDA')

// Validar configuración antes de inicializar
if (!firebaseConfig.apiKey || firebaseConfig.apiKey === '' || firebaseConfig.apiKey === undefined) {
  throw new Error('❌ Firebase API Key está vacía o no está configurada. Verifica que .env.local existe y contiene VITE_FIREBASE_API_KEY')
}
if (!firebaseConfig.projectId || firebaseConfig.projectId === '' || firebaseConfig.projectId === undefined) {
  throw new Error('❌ Firebase Project ID está vacío o no está configurado. Verifica que .env.local existe y contiene VITE_FIREBASE_PROJECT_ID')
}

console.log('🔧 Inicializando Firebase con configuración:')
console.log('  - API Key:', firebaseConfig.apiKey.substring(0, 10) + '...')
console.log('  - Project ID:', firebaseConfig.projectId)
console.log('  - Auth Domain:', firebaseConfig.authDomain)
console.log('  - App ID:', firebaseConfig.appId)

// Inicializar Firebase solo si no está ya inicializado
let app: FirebaseApp
try {
  const existingApps = getApps()
  if (existingApps.length === 0) {
    app = initializeApp(firebaseConfig)
    console.log('✅ Firebase App inicializado correctamente')
  } else {
    app = existingApps[0]
    console.log('✅ Firebase App ya estaba inicializado, reutilizando')
  }
} catch (error: any) {
  console.error('❌ Error inicializando Firebase App:', error)
  throw error
}

// Inicializar servicios
let db: Firestore
let auth: Auth

try {
  db = getFirestore(app)
  console.log('✅ Firestore inicializado')
} catch (error: any) {
  console.error('❌ Error inicializando Firestore:', error)
  throw error
}

try {
  auth = getAuth(app)
  console.log('✅ Firebase Auth inicializado')
  console.log('  - Auth Domain configurado:', auth.config.authDomain || 'N/A')
} catch (error: any) {
  console.error('❌ Error inicializando Firebase Auth:', error)
  console.error('  Detalles del error:', error.code, error.message)
  throw error
}

// Configurar Google Auth Provider
const googleProvider = new GoogleAuthProvider()
googleProvider.setCustomParameters({
  prompt: 'select_account'
})
console.log('✅ Google Auth Provider configurado')

export { app, db, auth, googleProvider }
