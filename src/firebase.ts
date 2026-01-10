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
const hasValidConfig = firebaseConfig.apiKey && 
                       firebaseConfig.apiKey !== '' && 
                       firebaseConfig.apiKey !== undefined &&
                       firebaseConfig.projectId && 
                       firebaseConfig.projectId !== '' && 
                       firebaseConfig.projectId !== undefined

if (!hasValidConfig) {
  console.error('❌ Firebase: Variables de entorno no configuradas. La aplicación funcionará en modo limitado.')
  console.error('   Configura las variables de entorno en Cloudflare Pages:')
  console.error('   - VITE_FIREBASE_API_KEY')
  console.error('   - VITE_FIREBASE_AUTH_DOMAIN')
  console.error('   - VITE_FIREBASE_PROJECT_ID')
  console.error('   - VITE_FIREBASE_APP_ID')
  console.error('   - VITE_FIREBASE_STORAGE_BUCKET')
  console.error('   - VITE_FIREBASE_MESSAGING_SENDER_ID')
}

console.log('🔧 Inicializando Firebase con configuración:')
console.log('  - API Key:', firebaseConfig.apiKey.substring(0, 10) + '...')
console.log('  - Project ID:', firebaseConfig.projectId)
console.log('  - Auth Domain:', firebaseConfig.authDomain)
console.log('  - App ID:', firebaseConfig.appId)

// Inicializar Firebase solo si no está ya inicializado
let app: FirebaseApp | null = null
let db: Firestore | null = null
let auth: Auth | null = null
let googleProvider: GoogleAuthProvider | null = null

if (hasValidConfig) {
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
    app = null
  }

  // Inicializar servicios solo si app se inicializó correctamente
  if (app) {
    try {
      db = getFirestore(app)
      console.log('✅ Firestore inicializado')
    } catch (error: any) {
      console.error('❌ Error inicializando Firestore:', error)
      db = null
    }

    try {
      auth = getAuth(app)
      console.log('✅ Firebase Auth inicializado')
      console.log('  - Auth Domain configurado:', auth.config.authDomain || 'N/A')
    } catch (error: any) {
      console.error('❌ Error inicializando Firebase Auth:', error)
      console.error('  Detalles del error:', error.code, error.message)
      auth = null
    }

    // Configurar Google Auth Provider solo si auth está disponible
    if (auth) {
      try {
        googleProvider = new GoogleAuthProvider()
        googleProvider.setCustomParameters({
          prompt: 'select_account'
        })
        console.log('✅ Google Auth Provider configurado')
      } catch (error: any) {
        console.error('❌ Error configurando Google Auth Provider:', error)
        googleProvider = null
      }
    }
  }
} else {
  console.warn('⚠️ Firebase no se inicializará porque faltan variables de entorno')
}

export { app, db, auth, googleProvider }
