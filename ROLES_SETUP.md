# Configuración de Roles de Usuario

## Descripción

La aplicación ahora soporta dos tipos de roles:

- **`admin`**: Puede ver y editar todo al 100% (añadir, modificar, eliminar canciones, importar/exportar, etc.)
- **`viewer`**: Puede ver todo pero NO puede modificar, eliminar ni añadir nada (solo lectura)

## Sistema de Autorización

**IMPORTANTE**: La autorización se basa ÚNICAMENTE en Firestore. No hay lista de emails permitidos hardcodeada.

### Reglas de autorización:

1. **Si existe documento en `/users/{email}`** → Usuario autorizado
   - `role: "admin"` → Puede editar todo
   - `role: "viewer"` → Solo lectura
2. **Si NO existe documento** → Acceso denegado con mensaje: "Tu email no está autorizado. Pide acceso."
3. **Usuario especial**: `mhch83@gmail.com` siempre será `admin` (independientemente del rol en Firestore)

## Configuración en Firebase

Los roles se almacenan en Firestore en la colección `users`. Cada documento tiene como ID el email del usuario.

### Pasos para autorizar usuarios:

1. **Ve a Firebase Console**: https://console.firebase.google.com/
2. **Selecciona tu proyecto**
3. **Ve a Firestore Database**
4. **Crea la colección `users`** (si no existe)
5. **Crea documentos** con el email del usuario como ID del documento
6. **Agrega el campo `role`** con el valor:
   - `"admin"` para administradores
   - `"viewer"` para usuarios de solo lectura

### Ejemplo de estructura en Firestore:

```
Colección: users
├── Documento ID: mchalud@bks-music.com
│   └── role: "admin"
├── Documento ID: mhch83@gmail.com
│   └── role: "admin" (siempre será admin, incluso si está como viewer)
└── Documento ID: companero@bks-music.com
    └── role: "viewer"
```

### Notas importantes:

- **Si un usuario NO tiene documento en `/users/{email}`** → Acceso DENEGADO
- **Los roles se cargan automáticamente** cuando el usuario inicia sesión
- **`mhch83@gmail.com` siempre será admin** (forzado en el código)
- **No hay lista de emails permitidos** - todo se controla desde Firestore

## Funciones deshabilitadas para usuarios `viewer`:

- ❌ Añadir nuevas canciones (botón "+")
- ❌ Eliminar canciones (botón "🗑️" en detalle)
- ❌ Modificar canciones (todos los campos están deshabilitados)
- ❌ Edición inline en tabla (estilo, género, prioridad)
- ❌ Importar XLSX (botón "↑")
- ❌ Borrar todas las canciones (botón "🗑")
- ❌ Restaurar backup (botón "↺")
- ❌ Migrar a Firebase (botón "☁️")
- ✅ Exportar a Excel (botón "↓") - **SÍ permitido**
- ✅ Ver todo el contenido - **SÍ permitido**

## Funciones permitidas para usuarios `admin`:

- ✅ Todas las funciones están disponibles
- ✅ Edición completa de canciones
- ✅ Añadir, modificar y eliminar canciones
- ✅ Importar/exportar datos
- ✅ Gestionar backups
