import type { APIRoute } from 'astro'
import { supabase } from '../../../lib/supabase'
import { hashPassword, verifySession } from '../../../lib/auth'

// GET - Listar usuarios
export const GET: APIRoute = async ({ request }) => {
  const user = await getAdminUser(request)
  if (!user) {
    return new Response(JSON.stringify({ error: 'No autorizado' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' }
    })
  }

  const { data: users, error } = await supabase
    .from('users')
    .select('id, email, name, username, role, created_at')
    .order('created_at', { ascending: false })

  if (error) {
    return new Response(JSON.stringify({ error: 'Error al obtener usuarios' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }

  return new Response(JSON.stringify({ users }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  })
}

// POST - Crear usuario
export const POST: APIRoute = async ({ request }) => {
  const user = await getAdminUser(request)
  if (!user) {
    return new Response(JSON.stringify({ error: 'No autorizado' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' }
    })
  }

  try {
    const body = await request.json()
    const { email, name, username, password, role = 'user' } = body

    if (!email || !name || !username || !password) {
      return new Response(
        JSON.stringify({ error: 'Todos los campos son requeridos' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    if (role !== 'user' && role !== 'admin') {
      return new Response(
        JSON.stringify({ error: 'Rol invalido' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    const passwordHash = await hashPassword(password)

    const { data: newUser, error } = await supabase
      .from('users')
      .insert({
        email,
        name,
        username,
        password_hash: passwordHash,
        role
      })
      .select('id, email, name, username, role, created_at')
      .single()

    if (error) {
      if (error.code === '23505') {
        return new Response(
          JSON.stringify({ error: 'El email o username ya existe' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        )
      }
      throw error
    }

    return new Response(JSON.stringify({ user: newUser }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' }
    })
  } catch (err) {
    console.error('Error creating user:', err)
    return new Response(
      JSON.stringify({ error: 'Error al crear usuario' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}

// DELETE - Eliminar usuario
export const DELETE: APIRoute = async ({ request }) => {
  const user = await getAdminUser(request)
  if (!user) {
    return new Response(JSON.stringify({ error: 'No autorizado' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' }
    })
  }

  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('id')

    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'ID de usuario requerido' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // No permitir eliminarse a si mismo
    if (userId === user.id) {
      return new Response(
        JSON.stringify({ error: 'No puedes eliminarte a ti mismo' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    const { error } = await supabase
      .from('users')
      .delete()
      .eq('id', userId)

    if (error) throw error

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    })
  } catch (err) {
    console.error('Error deleting user:', err)
    return new Response(
      JSON.stringify({ error: 'Error al eliminar usuario' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}

// Helper para verificar si es admin
async function getAdminUser(request: Request) {
  const cookies = request.headers.get('cookie') || ''
  const sessionMatch = cookies.match(/session=([^;]+)/)
  const token = sessionMatch ? sessionMatch[1] : null

  if (!token) return null

  const user = await verifySession(token)
  if (!user || user.role !== 'admin') return null

  return user
}
