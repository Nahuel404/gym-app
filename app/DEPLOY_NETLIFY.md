# Desplegar GymApp en Netlify

## Pasos previos

1. **Instalar dependencias**
   ```bash
   npm install
   ```

2. **Configurar variables de entorno en Netlify**

   Ve a tu sitio en Netlify → Site settings → Environment variables y agrega:

   - `PUBLIC_SUPABASE_URL`: La URL de tu proyecto Supabase (ejemplo: `https://xxxxx.supabase.co`)
   - `PUBLIC_SUPABASE_ANON_KEY`: Tu clave anónima de Supabase
   - `SUPABASE_SERVICE_ROLE_KEY`: Tu clave de service role de Supabase
   - `JWT_SECRET`: Una clave secreta aleatoria de al menos 32 caracteres

   **Para obtener las credenciales de Supabase:**
   - Ve a tu proyecto en [Supabase Dashboard](https://app.supabase.com)
   - Settings → API
   - Copia las claves necesarias

   **Para generar JWT_SECRET:**
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```

## Configuración automática

El proyecto ya está configurado con:
- ✅ `astro.config.mjs` - Adaptador de Netlify
- ✅ `netlify.toml` - Configuración de build
- ✅ `public/_redirects` - Redirecciones para rutas SSR

## Desplegar

### Opción 1: Desde Netlify UI (Recomendado)

1. Conecta tu repositorio de GitHub/GitLab
2. Netlify detectará automáticamente la configuración
3. Agrega las variables de entorno (ver arriba)
4. Click en "Deploy site"

### Opción 2: Netlify CLI

```bash
# Instalar Netlify CLI
npm install -g netlify-cli

# Login
netlify login

# Deploy
netlify deploy --prod
```

## Base de datos

No olvides ejecutar los scripts SQL en Supabase:
1. `db/create-workouts-table.sql` - Crea la estructura de workouts
2. `db/create-favorites.sql` - Crea la tabla de favoritos

## Seguridad de las variables

Las variables de entorno se manejan de forma segura:
- `PUBLIC_SUPABASE_URL` y `PUBLIC_SUPABASE_ANON_KEY` están diseñadas para ser públicas y se incluyen en el bundle del cliente
- `SUPABASE_SERVICE_ROLE_KEY` y `JWT_SECRET` solo se usan en funciones del servidor y NO se exponen al cliente
- El escaneo de secretos de Netlify está configurado para permitir estas variables solo en las funciones del servidor

## Verificar el despliegue

Una vez desplegado, verifica:
1. La página de login funciona
2. Puedes crear un usuario
3. El dashboard carga correctamente
4. Las variables de entorno están configuradas

## Problemas comunes

### Error 404 en todas las rutas
- Verifica que las variables de entorno estén configuradas
- Revisa los logs de build en Netlify
- Asegúrate de que `netlify.toml` y `_redirects` existen

### Error de Supabase
- Verifica que las credenciales sean correctas
- Asegúrate de que el proyecto Supabase esté activo
- Revisa las políticas de RLS en Supabase

### Error de build
- Revisa los logs en Netlify
- Asegúrate de que todas las dependencias estén instaladas
- Verifica que `@astrojs/netlify` esté en package.json
