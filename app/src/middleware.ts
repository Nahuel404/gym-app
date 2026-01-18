import { defineMiddleware } from 'astro:middleware'
import { verifySession } from './lib/auth'

// Rutas públicas que no requieren autenticación
const PUBLIC_ROUTES = ['/login', '/api/auth/login']

export const onRequest = defineMiddleware(async (context, next) => {
  const { pathname } = context.url

  // Permitir rutas públicas
  if (PUBLIC_ROUTES.some(route => pathname.startsWith(route))) {
    return next()
  }

  // Obtener token de la cookie
  const cookies = context.request.headers.get('cookie') || ''
  const sessionMatch = cookies.match(/session=([^;]+)/)
  const token = sessionMatch ? sessionMatch[1] : null

  if (!token) {
    return context.redirect('/login')
  }

  // Verificar token
  const user = await verifySession(token)

  if (!user) {
    return context.redirect('/login')
  }

  // Añadir usuario al contexto local
  context.locals.user = user

  return next()
})
