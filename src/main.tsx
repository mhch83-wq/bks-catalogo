import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import AuthGate from './AuthGate'

// Error boundary simple
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('❌ Error capturado por ErrorBoundary:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100vh',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          background: '#f5f5f7',
          padding: '20px',
          textAlign: 'center'
        }}>
          <h1 style={{ color: '#d70015', marginBottom: '16px' }}>Error de configuración</h1>
          <p style={{ color: '#666', marginBottom: '8px' }}>
            {this.state.error?.message || 'Error desconocido'}
          </p>
          <p style={{ color: '#888', fontSize: '14px', marginTop: '16px' }}>
            Verifica que las variables de entorno estén configuradas en Cloudflare Pages.
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{
              marginTop: '20px',
              padding: '10px 20px',
              background: '#0071e3',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            Recargar página
          </button>
        </div>
      )
    }

    return this.props.children
  }
}

try {
  createRoot(document.getElementById('root')!).render(
    <ErrorBoundary>
      <AuthGate>
        {(onLogout) => <App onLogout={onLogout} />}
      </AuthGate>
    </ErrorBoundary>
  )
} catch (error: any) {
  console.error('❌ Error al renderizar la aplicación:', error)
  document.getElementById('root')!.innerHTML = `
    <div style="display: flex; flex-direction: column; justify-content: center; align-items: center; height: 100vh; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f5f5f7; padding: 20px; text-align: center;">
      <h1 style="color: #d70015; margin-bottom: 16px;">Error de inicialización</h1>
      <p style="color: #666; margin-bottom: 8px;">${error?.message || 'Error desconocido'}</p>
      <p style="color: #888; font-size: 14px; margin-top: 16px;">
        Verifica la consola del navegador para más detalles.
      </p>
      <button onclick="window.location.reload()" style="margin-top: 20px; padding: 10px 20px; background: #0071e3; color: white; border: none; border-radius: 8px; cursor: pointer; font-size: 14px;">
        Recargar página
      </button>
    </div>
  `
}
