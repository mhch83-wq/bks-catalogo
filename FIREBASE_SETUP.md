# Configuración de Firebase para Sincronización en la Nube

Para que las canciones se sincronicen en la nube y estén disponibles desde cualquier dispositivo, necesitas configurar Firebase.

## Pasos para configurar Firebase:

### 1. Crear un proyecto en Firebase

1. Ve a [Firebase Console](https://console.firebase.google.com/)
2. Haz clic en "Add project" (Agregar proyecto)
3. Ingresa un nombre para tu proyecto (ej: "bks-catalogo")
4. Sigue los pasos del asistente
5. Cuando te pregunte sobre Google Analytics, puedes desactivarlo si no lo necesitas

### 2. Habilitar Firestore Database

1. En el panel de Firebase, ve a "Firestore Database" en el menú lateral
2. Haz clic en "Create database"
3. Elige "Start in test mode" (para empezar)
4. Selecciona una ubicación (elige la más cercana a ti, ej: `europe-west`)
5. Haz clic en "Enable"

**IMPORTANTE: Después de probar que funciona, deberías configurar reglas de seguridad. Por ahora con test mode funcionará.**

### 3. Obtener las credenciales

1. En Firebase Console, haz clic en el ícono de engranaje ⚙️ junto a "Project Overview"
2. Selecciona "Project settings"
3. Ve a la pestaña "General"
4. Baja hasta "Your apps" y haz clic en el ícono `</>` (Web)
5. Si no tienes una app web registrada:
   - Ingresa un nombre (ej: "BKS Catálogo Web")
   - Haz clic en "Register app"
6. Copia los valores de configuración que aparecen

### 4. Configurar en tu proyecto

Tienes **dos opciones**:

#### Opción A: Variables de entorno (Recomendado para producción)

1. Crea un archivo `.env` en la raíz del proyecto (junto a `package.json`):

```env
VITE_FIREBASE_API_KEY=tu_api_key_aqui
VITE_FIREBASE_AUTH_DOMAIN=tu_project_id.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=tu_project_id
VITE_FIREBASE_STORAGE_BUCKET=tu_project_id.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=tu_messaging_sender_id
VITE_FIREBASE_APP_ID=tu_app_id
```

2. Reemplaza los valores con los que obtuviste de Firebase Console

**⚠️ IMPORTANTE:** Si usas Git, asegúrate de que `.env` esté en tu `.gitignore` para no subir tus credenciales.

#### Opción B: Editar directamente firebase.ts

1. Abre `src/firebase.ts`
2. Reemplaza los valores en `firebaseConfig` con tus credenciales:

```typescript
const firebaseConfig = {
  apiKey: "tu_api_key_real",
  authDomain: "tu-project-id.firebaseapp.com",
  projectId: "tu-project-id",
  storageBucket: "tu-project-id.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef"
}
```

### 5. Configurar reglas de seguridad (IMPORTANTE)

Después de probar que funciona, deberías configurar reglas de seguridad en Firestore:

1. Ve a Firestore Database → Rules
2. Reemplaza las reglas con:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /catalogo/{document} {
      allow read, write: if true; // Por ahora permite todo
      // TODO: En producción, implementar autenticación
    }
  }
}
```

3. Haz clic en "Publish"

**Nota:** Las reglas actuales permiten que cualquiera lea y escriba. Para producción, deberías implementar autenticación.

### 6. Verificar que funciona

1. Ejecuta `npm run dev`
2. Abre la aplicación en tu navegador
3. Agrega o modifica una canción
4. Abre la misma URL en otro dispositivo/navegador
5. Deberías ver los cambios sincronizados automáticamente

## Fallback a LocalStorage

Si Firebase no está configurado o falla, la aplicación usará automáticamente `localStorage` como respaldo. Esto significa que la aplicación funcionará incluso sin Firebase, pero los datos solo estarán disponibles en el navegador local.

## Soporte

Si tienes problemas:
1. Verifica que todas las credenciales estén correctas
2. Asegúrate de que Firestore esté habilitado
3. Revisa la consola del navegador para errores
4. Verifica que las reglas de Firestore permitan lectura/escritura


