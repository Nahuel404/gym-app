import type { APIRoute } from 'astro'
import { supabase } from '../../../lib/supabase'
import { verifyPassword, createSession, getSessionCookie } from '../../../lib/auth'

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json()
    const { username, password } = body

    if (!username || !password) {
      return new Response(
        JSON.stringify({ error: 'Usuario y contraseña son requeridos' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Buscar usuario por username
    const { data: user, error } = await supabase
      .from('users')
      .select('id, username, name, password_hash, role')
      .eq('username', username)
      .single()

    if (error || !user) {
      return new Response(
        JSON.stringify({ error: 'Credenciales inválidas' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Verificar contraseña
    const isValid = await verifyPassword(password, user.password_hash)

    if (!isValid) {
      return new Response(
        JSON.stringify({ error: 'Credenciales inválidas' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Crear sesión JWT
    const token = await createSession({
      id: user.id,
      username: user.username,
      name: user.name,
      role: user.role
    })

    // Responder con cookie de sesión
    return new Response(
      JSON.stringify({ success: true, user: { name: user.name, role: user.role } }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Set-Cookie': getSessionCookie(token)
        }
      }
    )
  } catch (err) {
    console.error('Login error:', err)
    return new Response(
      JSON.stringify({ error: 'Error interno del servidor' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}
