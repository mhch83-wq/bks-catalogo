import React, { useEffect, useState } from 'react'
import { User, signInWithPopup, signOut, onAuthStateChanged, setPersistence, browserLocalPersistence } from 'firebase/auth'
import { doc, getDoc } from 'firebase/firestore'
import { auth, googleProvider, db } from './firebase'

export type UserRole = 'admin' | 'viewer'

interface AuthGateProps {
  children: React.ReactNode | ((logoutHandler: () => Promise<void>, userRole: UserRole) => React.ReactNode)
}

export default function AuthGate({ children }: AuthGateProps) {
  // Estado basado ÚNICAMENTE en onAuthStateChanged
  const [user, setUser] = useState<User | null>(null)
  const [userRole, setUserRole] = useState<UserRole>('viewer')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isLoggingIn, setIsLoggingIn] = useState(false)

  // Listener único de onAuthStateChanged - fuente de verdad
  useEffect(() => {
    if (!auth) {
      console.error('❌ Firebase Auth no está disponible. Verifica las variables de entorno en Cloudflare Pages.')
      setError('Firebase no está configurado. Verifica las variables de entorno en Cloudflare Pages.')
      setLoading(false)
      return
    }
    
    console.log('🔧 Configurando onAuthStateChanged listener...')
    
    let isFirstAuthCheck = true
    
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      console.log('🔔 AUTH STATE CHANGED:', currentUser?.email || 'null')
      
      // SIEMPRE marcar loading como false después del primer cambio
      setLoading(false)
      
      if (currentUser) {
        // Verificar que el usuario tenga email
        const userEmail = currentUser.email
        
        if (!userEmail) {
          console.error('❌ Usuario sin email, bloqueando acceso')
          setError('Tu email no está autorizado. Pide acceso.')
          setUser(null)
          setUserRole('viewer')
          setIsLoggingIn(false)
          signOut(auth).then(() => {
            console.log('🚪 Usuario sin email, cerrando sesión...')
          }).catch(console.error)
          return
        }
        
        console.log('🔍 Verificando autorización para:', userEmail)
        console.log('   Buscando documento en Firestore: /users/' + userEmail)
        
        // Verificar si existe documento en Firestore
        if (!db) {
          console.error('❌ Firestore no está disponible')
          setError('Error de configuración: Firestore no está disponible.')
          setUser(null)
          setUserRole('viewer')
          setIsLoggingIn(false)
          return
        }
        
        try {
          const userDocRef = doc(db, 'users', userEmail)
          const userDoc = await getDoc(userDocRef)
          
          if (!userDoc.exists()) {
            console.error('❌ Usuario NO autorizado:', userEmail)
            console.error('   Razón: No existe documento en /users/' + userEmail)
            console.error('   Solución: Crea un documento en Firestore con:')
            console.error('     - Colección: users')
            console.error('     - ID del documento: ' + userEmail)
            console.error('     - Campo: role = "admin" o "viewer"')
            setError('Tu email no está autorizado. Pide acceso.')
            setUser(null)
            setUserRole('viewer')
            setIsLoggingIn(false)
            signOut(auth).then(() => {
              console.log('🚪 Usuario no autorizado, cerrando sesión...')
            }).catch(console.error)
            return
          }
          
          // Usuario autorizado - obtener rol
          const userData = userDoc.data()
          let role = userData.role as UserRole
          
          console.log('✅ Usuario autorizado:', userEmail)
          console.log('   Documento encontrado en /users/' + userEmail)
          console.log('   Rol obtenido del documento:', role)
          
          // Asegurar que mhch83@gmail.com sea admin (sobrescribir cualquier otro rol)
          if (userEmail === 'mhch83@gmail.com') {
            if (role !== 'admin') {
              console.warn('⚠️ mhch83@gmail.com debe ser admin, pero tiene rol:', role)
              console.warn('   Forzando rol a admin...')
            }
            role = 'admin'
          }
          
          // Validar rol
          if (role !== 'admin' && role !== 'viewer') {
            console.warn('⚠️ Rol inválido en documento:', role)
            console.warn('   Usando "viewer" por defecto')
            role = 'viewer'
          }
          
          // Actualizar estado con el rol final
          setUserRole(role)
          setUser(currentUser)
          setError(null)
          setIsLoggingIn(false)
          
          console.log('✅ Usuario autenticado correctamente')
          console.log('   Email:', userEmail)
          console.log('   Rol final:', role)
          
        } catch (error: any) {
          console.error('❌ Error verificando autorización:', error)
          console.error('   Detalles:', error.code, error.message)
          setError('Error al verificar autorización. Intenta de nuevo.')
          setUser(null)
          setUserRole('viewer')
          setIsLoggingIn(false)
          signOut(auth).catch(console.error)
        }
      } else {
        console.log('👤 No hay usuario autenticado')
        setUser(null)
        setIsLoggingIn(false)
        // Limpiar error si no es de autorización
        setError((prevError) => {
          if (prevError && prevError.includes('no está autorizado')) {
            return prevError // Mantener error de autorización
          }
          return null
        })
      }
    })

    return () => {
      console.log('🧹 Limpiando onAuthStateChanged listener')
      unsubscribe()
    }
  }, []) // Sin dependencias - solo se ejecuta una vez al montar

  const handleLogin = async () => {
    try {
      setError(null)
      setIsLoggingIn(true)
      
      if (!auth || !googleProvider) {
        setError('Firebase Auth no está configurado. Verifica las variables de entorno en Cloudflare Pages.')
        console.error('❌ Auth o GoogleProvider no están disponibles')
        console.error('   Asegúrate de que las variables de entorno VITE_FIREBASE_* estén configuradas en Cloudflare Pages')
        setIsLoggingIn(false)
        return
      }

      // Forzar persistencia antes de hacer login
      console.log('🔐 Configurando persistencia local...')
      await setPersistence(auth, browserLocalPersistence)
      console.log('✅ Persistencia configurada')

      // Hacer login - onAuthStateChanged se disparará automáticamente
      console.log('🔑 Iniciando login con Google...')
      const result = await signInWithPopup(auth, googleProvider)
      console.log('✅ Login exitoso:', result.user.email)
      console.log('⏳ Esperando onAuthStateChanged para actualizar estado...')
      // NO actualizar user manualmente aquí - dejar que onAuthStateChanged lo haga
      
    } catch (err: any) {
      console.error('❌ Error en login:', err)
      console.error('  - Error code:', err.code)
      console.error('  - Error message:', err.message)
      
      // Detectar error de dominio no autorizado
      if (err.code === 'auth/unauthorized-domain' || err.message?.includes('unauthorized-domain')) {
        const currentHost = window.location.host
        const errorMessage = `Dominio no autorizado: ${currentHost}. Agrega este dominio en Firebase Console > Authentication > Settings > Authorized domains`
        setError(errorMessage)
        console.error('🔒 DOMINIO NO AUTORIZADO')
        console.error(`   Dominio actual: ${currentHost}`)
        console.error('   Solución: Ve a Firebase Console > Authentication > Settings > Authorized domains')
        console.error('   Agrega:', currentHost)
      } else if (err.code === 'auth/popup-blocked') {
        setError('Popup bloqueado. Permite ventanas emergentes para este sitio.')
      } else if (err.code === 'auth/popup-closed-by-user') {
        setError('Ventana de login cerrada. Intenta de nuevo.')
      } else {
        const errorMessage = err.code 
          ? `Error ${err.code}: ${err.message || 'Error desconocido'}`
          : err.message || 'Error al iniciar sesión'
        setError(errorMessage)
      }
      setIsLoggingIn(false)
    }
  }

  const handleForceLogout = async () => {
    try {
      await signOut(auth)
      setError(null)
    } catch (err) {
      console.error('Error al cerrar sesión:', err)
    }
  }

  const handleLogout = async () => {
    try {
      await signOut(auth)
    } catch (err) {
      console.error('Error al cerrar sesión:', err)
    }
  }

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
        background: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 50%, #0f0f0f 100%)'
      }}>
        <div style={{
          color: '#888',
          fontSize: '12px',
          fontWeight: '400',
          letterSpacing: '2px'
        }}>CARGANDO...</div>
      </div>
    )
  }

  if (!user) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
        background: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 50%, #0f0f0f 100%)',
        position: 'relative'
      }}>
        {/* Botón LOGIN minimalista */}
        <button
          onClick={handleLogin}
          disabled={isLoggingIn}
          style={{
            background: 'none',
            border: 'none',
            color: isLoggingIn ? '#444' : '#ccc',
            fontSize: '12px',
            fontWeight: '400',
            letterSpacing: '4px',
            cursor: isLoggingIn ? 'not-allowed' : 'pointer',
            padding: '12px 16px',
            transition: 'all 0.2s ease',
            opacity: isLoggingIn ? 0.5 : 1,
            textTransform: 'uppercase',
            outline: 'none'
          }}
          onMouseEnter={(e) => {
            if (!isLoggingIn) {
              e.currentTarget.style.color = '#fff'
              e.currentTarget.style.letterSpacing = '5px'
            }
          }}
          onMouseLeave={(e) => {
            if (!isLoggingIn) {
              e.currentTarget.style.color = '#ccc'
              e.currentTarget.style.letterSpacing = '4px'
            }
          }}
        >
          {isLoggingIn ? '...' : 'LOGIN'}
        </button>

        {/* Mensaje de error minimalista (solo si hay error) */}
        {error && (
          <div style={{
            position: 'absolute',
            bottom: '40px',
            left: '50%',
            transform: 'translateX(-50%)',
            color: '#888',
            fontSize: '10px',
            letterSpacing: '2px',
            textAlign: 'center',
            maxWidth: '600px',
            padding: '0 20px',
            lineHeight: '1.6'
          }}>
            {error.includes('no está autorizado')
              ? 'TU EMAIL NO ESTÁ AUTORIZADO - PIDE ACCESO'
              : error.includes('Dominio no autorizado')
              ? 'DOMINIO NO AUTORIZADO - Ver consola para detalles'
              : error.includes('Popup bloqueado')
              ? 'PERMITE VENTANAS EMERGENTES'
              : error.includes('cerrada')
              ? 'VENTANA CERRADA - INTENTA DE NUEVO'
              : 'ERROR'}
          </div>
        )}
      </div>
    )
  }

  // Si hay usuario autorizado, mostrar la app y pasar el handler de logout y el rol
  if (user) {
    console.log('✅ Renderizando app con usuario:', user.email, 'Rol:', userRole)
    if (typeof children === 'function') {
      return <>{children(handleLogout, userRole)}</>
    }
    return <>{children}</>
  }
  
  // Fallback - no debería llegar aquí, pero por si acaso
  console.log('⚠️ No hay usuario, mostrando pantalla de login')
  return null
}
