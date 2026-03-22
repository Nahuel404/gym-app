import type { APIRoute } from 'astro'
import { supabase } from '../../../lib/supabase'
import { randomBytes } from 'node:crypto'

function generateApiKey(): string {
  return 'gym_' + randomBytes(24).toString('hex')
}

// POST - Generar o regenerar API key
export const POST: APIRoute = async ({ locals }) => {
  const user = locals.user
  if (!user) {
    return new Response(JSON.stringify({ error: 'No autorizado' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const apiKey = generateApiKey()

  const { error } = await supabase
    .from('users')
    .update({ mcp_api_key: apiKey })
    .eq('id', user.id)

  if (error) {
    return new Response(
      JSON.stringify({ error: 'Error al generar la API key' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }

  return new Response(JSON.stringify({ api_key: apiKey }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
}

// GET - Verificar si el usuario tiene API key (no devuelve la key completa)
export const GET: APIRoute = async ({ locals }) => {
  const user = locals.user
  if (!user) {
    return new Response(JSON.stringify({ error: 'No autorizado' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const { data, error } = await supabase
    .from('users')
    .select('mcp_api_key')
    .eq('id', user.id)
    .single()

  if (error) {
    return new Response(
      JSON.stringify({ error: 'Error al consultar la API key' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }

  const hasKey = !!data?.mcp_api_key
  const maskedKey = hasKey
    ? data.mcp_api_key.slice(0, 8) + '••••••••' + data.mcp_api_key.slice(-4)
    : null

  return new Response(JSON.stringify({ has_key: hasKey, masked_key: maskedKey }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
}

// DELETE - Revocar API key
export const DELETE: APIRoute = async ({ locals }) => {
  const user = locals.user
  if (!user) {
    return new Response(JSON.stringify({ error: 'No autorizado' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const { error } = await supabase
    .from('users')
    .update({ mcp_api_key: null })
    .eq('id', user.id)

  if (error) {
    return new Response(
      JSON.stringify({ error: 'Error al revocar la API key' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }

  return new Response(JSON.stringify({ message: 'API key revocada' }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
}
