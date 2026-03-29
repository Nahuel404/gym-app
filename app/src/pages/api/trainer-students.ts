import type { APIRoute } from 'astro';
import { supabase } from '../../lib/supabase';

// GET: obtener mis alumnos (si soy trainer) o mis entrenadores (si soy alumno)
export const GET: APIRoute = async ({ url, locals }) => {
  const user = locals.user;
  if (!user) {
    return new Response(JSON.stringify({ error: 'No autorizado' }), {
      status: 401, headers: { 'Content-Type': 'application/json' }
    });
  }

  const role = url.searchParams.get('role') || 'student';
  const studentId = url.searchParams.get('student_id');

  // Entrenador pide workouts de un alumno
  if (studentId) {
    // Verificar relación
    const { data: rel } = await supabase
      .from('trainer_students')
      .select('id')
      .eq('trainer_id', user.id)
      .eq('student_id', studentId)
      .single();

    if (!rel) {
      return new Response(JSON.stringify({ error: 'No es tu alumno' }), {
        status: 403, headers: { 'Content-Type': 'application/json' }
      });
    }

    const days = parseInt(url.searchParams.get('days') || '30');
    const since = new Date();
    since.setDate(since.getDate() - days);
    const sinceStr = since.toISOString().split('T')[0];

    const { data: workouts, error } = await supabase
      .from('workouts')
      .select(`
        id, workout_date, notes,
        exercise_history (
          id, weight, reps,
          variant_equipment, variant_grip, variant_position,
          exercises ( id, name, muscle_group )
        )
      `)
      .eq('user_id', studentId)
      .gte('workout_date', sinceStr)
      .order('workout_date', { ascending: false });

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500, headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ workouts: workouts || [] }), {
      headers: { 'Content-Type': 'application/json' }
    });
  }

  if (role === 'trainer') {
    // Mis alumnos (soy entrenador)
    const { data, error } = await supabase
      .from('trainer_students')
      .select('id, started_at, student:users!trainer_students_student_id_fkey(id, name, username, avatar_url)')
      .eq('trainer_id', user.id)
      .order('started_at', { ascending: false });

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500, headers: { 'Content-Type': 'application/json' }
      });
    }

    // Para cada alumno, obtener stats básicas
    const students = [];
    for (const rel of data || []) {
      const student = rel.student as any;

      const { data: workoutDates } = await supabase
        .from('workouts')
        .select('workout_date')
        .eq('user_id', student.id);
      const totalWorkouts = new Set(workoutDates?.map(w => w.workout_date)).size;

      const { data: lastWorkout } = await supabase
        .from('workouts')
        .select('workout_date')
        .eq('user_id', student.id)
        .order('workout_date', { ascending: false })
        .limit(1);

      const { data: volumeData } = await supabase
        .from('exercise_history')
        .select('weight, reps')
        .eq('user_id', student.id);

      const totalVolume = volumeData?.reduce((acc, h) => acc + (h.weight * h.reps), 0) || 0;

      students.push({
        relation_id: rel.id,
        started_at: rel.started_at,
        ...student,
        total_workouts: totalWorkouts || 0,
        last_workout_date: lastWorkout?.[0]?.workout_date || null,
        total_volume: Math.round(totalVolume)
      });
    }

    return new Response(JSON.stringify({ students }), {
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // Mis entrenadores (soy alumno)
  const { data, error } = await supabase
    .from('trainer_students')
    .select('id, started_at, trainer:users!trainer_students_trainer_id_fkey(id, name, username, avatar_url)')
    .eq('student_id', user.id)
    .order('started_at', { ascending: false });

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { 'Content-Type': 'application/json' }
    });
  }

  return new Response(JSON.stringify({ trainers: data || [] }), {
    headers: { 'Content-Type': 'application/json' }
  });
};

// DELETE: terminar relación (ambas partes pueden)
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

  // Verificar que el usuario es parte de esta relación
  const { data: rel } = await supabase
    .from('trainer_students')
    .select('id, trainer_id, student_id')
    .eq('id', id)
    .single();

  if (!rel || (rel.trainer_id !== user.id && rel.student_id !== user.id)) {
    return new Response(JSON.stringify({ error: 'No autorizado' }), {
      status: 403, headers: { 'Content-Type': 'application/json' }
    });
  }

  const { error } = await supabase
    .from('trainer_students')
    .delete()
    .eq('id', id);

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { 'Content-Type': 'application/json' }
    });
  }

  // También limpiar la request asociada
  await supabase
    .from('trainer_requests')
    .delete()
    .eq('trainer_id', rel.trainer_id)
    .eq('student_id', rel.student_id);

  return new Response(JSON.stringify({ success: true }), {
    headers: { 'Content-Type': 'application/json' }
  });
};
