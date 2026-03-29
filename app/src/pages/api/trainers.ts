import type { APIRoute } from 'astro';
import { supabase } from '../../lib/supabase';

export const GET: APIRoute = async ({ url, locals }) => {
  const user = locals.user;
  if (!user) {
    return new Response(JSON.stringify({ error: 'No autorizado' }), {
      status: 401, headers: { 'Content-Type': 'application/json' }
    });
  }

  const query = url.searchParams.get('q')?.trim() || '';
  if (query.length < 2) {
    return new Response(JSON.stringify({ trainers: [] }), {
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // Buscar entrenadores que coincidan con nombre o username
  const { data: trainers, error } = await supabase
    .from('users')
    .select('id, name, username, avatar_url')
    .eq('is_trainer', true)
    .neq('id', user.id)
    .or(`name.ilike.%${query}%,username.ilike.%${query}%`)
    .limit(20);

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { 'Content-Type': 'application/json' }
    });
  }

  // Para cada entrenador, obtener el estado de relación con el usuario actual
  const trainerIds = trainers?.map(t => t.id) || [];

  // Solicitudes pendientes del usuario hacia estos entrenadores
  const { data: pendingRequests } = await supabase
    .from('trainer_requests')
    .select('trainer_id')
    .eq('student_id', user.id)
    .eq('status', 'pending')
    .in('trainer_id', trainerIds.length > 0 ? trainerIds : ['00000000-0000-0000-0000-000000000000']);

  // Relaciones activas
  const { data: activeRelations } = await supabase
    .from('trainer_students')
    .select('trainer_id')
    .eq('student_id', user.id)
    .in('trainer_id', trainerIds.length > 0 ? trainerIds : ['00000000-0000-0000-0000-000000000000']);

  const pendingSet = new Set(pendingRequests?.map(r => r.trainer_id) || []);
  const activeSet = new Set(activeRelations?.map(r => r.trainer_id) || []);

  const result = trainers?.map(t => ({
    ...t,
    status: activeSet.has(t.id) ? 'active' : pendingSet.has(t.id) ? 'pending' : 'none'
  })) || [];

  return new Response(JSON.stringify({ trainers: result }), {
    headers: { 'Content-Type': 'application/json' }
  });
};
