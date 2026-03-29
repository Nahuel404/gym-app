import type { APIRoute } from 'astro';
import { supabase } from '../../../lib/supabase';

export const PUT: APIRoute = async ({ request, locals }) => {
  const user = locals.user;
  if (!user) {
    return new Response(JSON.stringify({ error: 'No autorizado' }), {
      status: 401, headers: { 'Content-Type': 'application/json' }
    });
  }

  const { is_trainer } = await request.json();
  if (typeof is_trainer !== 'boolean') {
    return new Response(JSON.stringify({ error: 'is_trainer debe ser booleano' }), {
      status: 400, headers: { 'Content-Type': 'application/json' }
    });
  }

  const { error } = await supabase
    .from('users')
    .update({ is_trainer })
    .eq('id', user.id);

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { 'Content-Type': 'application/json' }
    });
  }

  return new Response(JSON.stringify({ success: true, is_trainer }), {
    headers: { 'Content-Type': 'application/json' }
  });
};
