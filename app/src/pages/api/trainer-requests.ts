import type { APIRoute } from 'astro';
import { supabase } from '../../lib/supabase';

// GET: obtener solicitudes (role=trainer -> recibidas, role=student -> enviadas)
export const GET: APIRoute = async ({ url, locals }) => {
  const user = locals.user;
  if (!user) {
    return new Response(JSON.stringify({ error: 'No autorizado' }), {
      status: 401, headers: { 'Content-Type': 'application/json' }
    });
  }

  const role = url.searchParams.get('role') || 'student';

  if (role === 'trainer') {
    // Solicitudes recibidas como entrenador
    const { data, error } = await supabase
      .from('trainer_requests')
      .select('id, message, status, created_at, student:users!trainer_requests_student_id_fkey(id, name, username, avatar_url)')
      .eq('trainer_id', user.id)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500, headers: { 'Content-Type': 'application/json' }
      });
    }
    return new Response(JSON.stringify({ requests: data || [] }), {
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // Solicitudes enviadas como alumno
  const { data, error } = await supabase
    .from('trainer_requests')
    .select('id, message, status, created_at, trainer:users!trainer_requests_trainer_id_fkey(id, name, username, avatar_url)')
    .eq('student_id', user.id)
    .eq('status', 'pending')
    .order('created_at', { ascending: false });

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { 'Content-Type': 'application/json' }
    });
  }
  return new Response(JSON.stringify({ requests: data || [] }), {
    headers: { 'Content-Type': 'application/json' }
  });
};

// POST: enviar solicitud
export const POST: APIRoute = async ({ request, locals }) => {
  const user = locals.user;
  if (!user) {
    return new Response(JSON.stringify({ error: 'No autorizado' }), {
      status: 401, headers: { 'Content-Type': 'application/json' }
    });
  }

  const { trainer_id, message } = await request.json();
  if (!trainer_id) {
    return new Response(JSON.stringify({ error: 'trainer_id requerido' }), {
      status: 400, headers: { 'Content-Type': 'application/json' }
    });
  }

  if (trainer_id === user.id) {
    return new Response(JSON.stringify({ error: 'No podés enviarte una solicitud a vos mismo' }), {
      status: 400, headers: { 'Content-Type': 'application/json' }
    });
  }

  // Verificar que el trainer existe y es entrenador
  const { data: trainer } = await supabase
    .from('users')
    .select('id, is_trainer')
    .eq('id', trainer_id)
    .single();

  if (!trainer || !trainer.is_trainer) {
    return new Response(JSON.stringify({ error: 'Entrenador no encontrado' }), {
      status: 404, headers: { 'Content-Type': 'application/json' }
    });
  }

  // Verificar si ya existe relación activa
  const { data: existing } = await supabase
    .from('trainer_students')
    .select('id')
    .eq('trainer_id', trainer_id)
    .eq('student_id', user.id)
    .single();

  if (existing) {
    return new Response(JSON.stringify({ error: 'Ya sos alumno de este entrenador' }), {
      status: 409, headers: { 'Content-Type': 'application/json' }
    });
  }

  // Crear o actualizar solicitud (upsert para manejar re-solicitudes tras rechazo)
  const { data, error } = await supabase
    .from('trainer_requests')
    .upsert({
      student_id: user.id,
      trainer_id,
      message: message || null,
      status: 'pending',
      updated_at: new Date().toISOString()
    }, { onConflict: 'student_id,trainer_id' })
    .select()
    .single();

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { 'Content-Type': 'application/json' }
    });
  }

  return new Response(JSON.stringify({ success: true, request: data }), {
    status: 201, headers: { 'Content-Type': 'application/json' }
  });
};

// PUT: aceptar/rechazar solicitud (solo el entrenador)
export const PUT: APIRoute = async ({ url, request, locals }) => {
  const user = locals.user;
  if (!user) {
    return new Response(JSON.stringify({ error: 'No autorizado' }), {
      status: 401, headers: { 'Content-Type': 'application/json' }
    });
  }

  const id = url.searchParams.get('id');
  if (!id) {
    return new Response(JSON.stringify({ error: 'id requerido' }), {
      status: 400, headers: { 'Content-Type': 'application/json' }
    });
  }

  const { status } = await request.json();
  if (!['accepted', 'rejected'].includes(status)) {
    return new Response(JSON.stringify({ error: 'status debe ser accepted o rejected' }), {
      status: 400, headers: { 'Content-Type': 'application/json' }
    });
  }

  // Obtener la solicitud y verificar que es para este entrenador
  const { data: req, error: fetchError } = await supabase
    .from('trainer_requests')
    .select('id, student_id, trainer_id, status')
    .eq('id', id)
    .single();

  if (fetchError || !req) {
    return new Response(JSON.stringify({ error: 'Solicitud no encontrada' }), {
      status: 404, headers: { 'Content-Type': 'application/json' }
    });
  }

  if (req.trainer_id !== user.id) {
    return new Response(JSON.stringify({ error: 'No autorizado' }), {
      status: 403, headers: { 'Content-Type': 'application/json' }
    });
  }

  if (req.status !== 'pending') {
    return new Response(JSON.stringify({ error: 'Esta solicitud ya fue procesada' }), {
      status: 409, headers: { 'Content-Type': 'application/json' }
    });
  }

  // Actualizar estado
  const { error: updateError } = await supabase
    .from('trainer_requests')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', id);

  if (updateError) {
    return new Response(JSON.stringify({ error: updateError.message }), {
      status: 500, headers: { 'Content-Type': 'application/json' }
    });
  }

  // Si acepta, crear relación en trainer_students
  if (status === 'accepted') {
    const { error: insertError } = await supabase
      .from('trainer_students')
      .insert({
        trainer_id: user.id,
        student_id: req.student_id
      });

    if (insertError && !insertError.message.includes('duplicate')) {
      return new Response(JSON.stringify({ error: insertError.message }), {
        status: 500, headers: { 'Content-Type': 'application/json' }
      });
    }
  }

  return new Response(JSON.stringify({ success: true }), {
    headers: { 'Content-Type': 'application/json' }
  });
};

// DELETE: cancelar solicitud pendiente (solo el alumno)
export const DELETE: APIRoute = async ({ url, locals }) => {
  const user = locals.user;
  if (!user) {
    return new Response(JSON.stringify({ error: 'No autorizado' }), {
      status: 401, headers: { 'Content-Type': 'application/json' }
    });
  }

  const id = url.searchParams.get('id');
  if (!id) {
    return new Response(JSON.stringify({ error: 'id requerido' }), {
      status: 400, headers: { 'Content-Type': 'application/json' }
    });
  }

  const { error } = await supabase
    .from('trainer_requests')
    .delete()
    .eq('id', id)
    .eq('student_id', user.id)
    .eq('status', 'pending');

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { 'Content-Type': 'application/json' }
    });
  }

  return new Response(JSON.stringify({ success: true }), {
    headers: { 'Content-Type': 'application/json' }
  });
};
