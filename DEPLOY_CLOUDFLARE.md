# Despliegue en Cloudflare Pages

## Paso 1: Subir los archivos

Tienes dos opciones:

### Opción A: Desde Git (Recomendado)

1. Crea un repositorio en GitHub/GitLab con tu código
2. Ve a Cloudflare Dashboard → Pages → Create a project
3. Conecta tu repositorio
4. Configuración:
   - **Build command**: `npm run build`
   - **Build output directory**: `dist`
   - **Node version**: `18` o `20`
5. Haz clic en "Save and Deploy"

### Opción B: Subir manualmente

1. Ve a Cloudflare Dashboard → Pages → Create a project
2. Selecciona "Upload assets"
3. Comprime la carpeta `dist/` en un archivo ZIP
4. Sube el ZIP
5. ¡Listo!

## Paso 2: Configurar dominio (opcional)

1. En tu proyecto de Pages, ve a "Custom domains"
2. Agrega tu dominio (ej: `catalogo.bks-music.com`)
3. Configura los DNS según las instrucciones

## Verificación

Una vez desplegado:
- ✅ Tus datos estarán sincronizados desde Firebase
- ✅ Todas las funciones funcionarán igual que en local
- ✅ Los cambios se sincronizarán automáticamente
- ✅ Podrás acceder desde cualquier dispositivo

## Funciones incluidas

- ✅ Buscar canciones
- ✅ Crear/Editar/Eliminar canciones
- ✅ Prioridad (Alta, Media Alta, Media, Baja)
- ✅ Estilo y Género (edición inline)
- ✅ Importar/Exportar Excel
- ✅ Reproductor de audio
- ✅ Backups
- ✅ Tabs Libres/Colocadas
- ✅ Sincronización en tiempo real con Firebase

