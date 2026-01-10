import React, { useEffect, useState } from 'react'
import { User, signInWithPopup, signOut, onAuthStateChanged, setPersistence, browserLocalPersistence } from 'firebase/auth'
import { auth, googleProvider } from './firebase'

interface AuthGateProps {
  children: React.ReactNode | ((logoutHandler: () => Promise<void>) => React.ReactNode)
}

const ALLOWED_EMAILS = ["mchalud@bks-music.com", "mhch83@gmail.com"]

export default function AuthGate({ children }: AuthGateProps) {
  // Estado basado ÚNICAMENTE en onAuthStateChanged
  const [user, setUser] = useState<User | null>(null)
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
    
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      console.log('🔔 AUTH STATE CHANGED:', currentUser?.email || 'null')
      
      // SIEMPRE marcar loading como false después del primer cambio
      setLoading(false)
      
      if (currentUser) {
        // Verificar email permitido
        const userEmail = currentUser.email
        if (!userEmail) {
          console.log('❌ Usuario sin email, bloqueando acceso')
          setError(`No autorizado: usuario sin email. Solo se permite: ${ALLOWED_EMAILS.join(', ')}`)
          setUser(null) // Asegurar que user es null
          signOut(auth).then(() => {
            console.log('🚪 Usuario sin email, cerrando sesión...')
          }).catch(console.error)
        } else if (ALLOWED_EMAILS.includes(userEmail)) {
          console.log('✅ Usuario autorizado:', userEmail)
          setUser(currentUser)
          setError(null)
          setIsLoggingIn(false)
        } else {
          console.log('❌ Usuario no autorizado:', userEmail)
          setError(`No autorizado: ${userEmail}. Solo se permite: ${ALLOWED_EMAILS.join(', ')}`)
          setUser(null) // Asegurar que user es null
          signOut(auth).then(() => {
            console.log('🚪 Usuario no autorizado, cerrando sesión...')
          }).catch(console.error)
        }
      } else {
        console.log('👤 No hay usuario autenticado')
        setUser(null)
        setIsLoggingIn(false)
        // Limpiar error si no es de autorización
        setError((prevError) => {
          if (prevError && prevError.includes('No autorizado')) {
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
      const errorMessage = err.code 
        ? `Error ${err.code}: ${err.message || 'Error desconocido'}`
        : err.message || 'Error al iniciar sesión'
      setError(errorMessage)
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
            maxWidth: '400px',
            padding: '0 20px'
          }}>
            {error.includes('No autorizado') ? 'ACCESO DENEGADO' : 'ERROR'}
          </div>
        )}
      </div>
    )
  }

  // Si hay usuario autorizado, mostrar la app y pasar el handler de logout
  if (user) {
    console.log('✅ Renderizando app con usuario:', user.email)
    if (typeof children === 'function') {
      return <>{children(handleLogout)}</>
    }
    return <>{children}</>
  }
  
  // Fallback - no debería llegar aquí, pero por si acaso
  console.log('⚠️ No hay usuario, mostrando pantalla de login')
  return null
}
