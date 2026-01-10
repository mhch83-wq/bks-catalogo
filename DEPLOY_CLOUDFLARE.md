# Despliegue en Cloudflare Pages

## Paso 1: Subir los cambios a GitHub

**El código ya está preparado y commiteado**. Solo necesitas hacer push manualmente:

```bash
cd "/Users/manuchalud/Desktop/Web Catalogo Bks/catalogo-bks-web-v10.1"
git push origin main
```

Si tienes problemas de certificados, prueba:
```bash
git config --global http.sslVerify false
git push origin main
```

O sube los cambios desde GitHub Desktop o desde el terminal.

## Paso 2: Conectar GitHub con Cloudflare Pages

1. **Ve a Cloudflare Dashboard**:
   - Entra en https://dash.cloudflare.com/
   - Ve a **Pages** en el menú lateral

2. **Conectar repositorio**:
   - Clic en **"Create a project"**
   - Selecciona **"Connect to Git"**
   - Autoriza Cloudflare Pages a acceder a tu GitHub
   - Selecciona el repositorio: `mhch83-wq/bks-catalogo`

3. **Configurar el build**:
   - **Framework preset**: `Vite` (o None)
   - **Build command**: `npm run build`
   - **Build output directory**: `dist`
   - **Root directory**: `/` (o deja vacío)
   - **Node version**: `18` o `20`

4. **Variables de entorno (IMPORTANTE)**:
   - En la configuración del proyecto, ve a **Settings** → **Environment variables**
   - Añade estas variables:
     ```
     VITE_FIREBASE_API_KEY = AIzaSyCNycUlTWKc1hESMEcjl3oCZUQFQS8_bVc
     VITE_FIREBASE_AUTH_DOMAIN = bks-catalogo.firebaseapp.com
     VITE_FIREBASE_PROJECT_ID = bks-catalogo
     VITE_FIREBASE_APP_ID = 1:538660649196:web:2304716dd2cc0945a4dc9
     VITE_FIREBASE_STORAGE_BUCKET = bks-catalogo.firebasestorage.app
     VITE_FIREBASE_MESSAGING_SENDER_ID = 538660649196
     ```
   - **IMPORTANTE**: Añade estas variables tanto en **Production** como en **Preview**

5. **Guardar y desplegar**:
   - Clic en **"Save and Deploy"**
   - Cloudflare empezará a construir automáticamente

## Paso 3: Verificar el despliegue

- Una vez completado el build, verás un enlace tipo: `https://tu-proyecto.pages.dev`
- Prueba el login con Google
- Verifica que los datos se sincronizan con Firebase

## Paso 4: Configurar dominio personalizado (opcional)

1. En tu proyecto de Pages, ve a **Custom domains**
2. Añade tu dominio (ej: `catalogo.bks-music.com`)
3. Sigue las instrucciones de DNS que te da Cloudflare

## Verificación

Una vez desplegado:
- ✅ Tus datos estarán sincronizados desde Firebase
- ✅ Todas las funciones funcionarán igual que en local
- ✅ Los cambios se sincronizarán automáticamente entre dispositivos
- ✅ Podrás acceder desde cualquier dispositivo con login de Google
- ✅ Los cambios en GitHub se desplegarán automáticamente

## Funciones incluidas

- ✅ Autenticación con Google
- ✅ Sincronización en tiempo real con Firebase
- ✅ Buscar canciones
- ✅ Crear/Editar/Eliminar canciones
- ✅ Prioridad (Alta, Media Alta, Media, Baja)
- ✅ Estilo y Género (edición inline)
- ✅ Importar/Exportar Excel
- ✅ Reproductor de audio
- ✅ Backups
- ✅ Tabs Libres/Colocadas

## Nota importante

El archivo `.env.local` NO está en el repositorio (está en `.gitignore`) para proteger tus credenciales.
Las variables de entorno deben configurarse directamente en Cloudflare Pages como se indica arriba.
