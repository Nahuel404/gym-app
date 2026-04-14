import type { APIRoute } from 'astro';
import { supabase } from '../../lib/supabase';

export const GET: APIRoute = async ({ url, locals }) => {
  try {
    const user = locals.user;
    if (!user) {
      return new Response(JSON.stringify({ message: 'No autorizado' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const exerciseId = url.searchParams.get('exercise_id');
    if (!exerciseId) {
      return new Response(JSON.stringify({ message: 'exercise_id requerido' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Get the most recent workout that includes this exercise
    const { data, error } = await supabase
      .from('exercise_history')
      .select('sets, weight, reps, date, variant_equipment, variant_grip, variant_position')
      .eq('user_id', user.id)
      .eq('exercise_id', exerciseId)
      .order('date', { ascending: false })
      .order('sets', { ascending: true })
      .limit(20);

    if (error) {
      console.error('Error obteniendo historial:', error);
      return new Response(JSON.stringify({ message: 'Error al obtener historial' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (!data || data.length === 0) {
      return new Response(JSON.stringify(null), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Group by date and take only the most recent date
    const lastDate = data[0].date;
    const lastWorkoutSets = data.filter(row => row.date === lastDate);

    return new Response(JSON.stringify({
      date: lastDate,
      sets: lastWorkoutSets.map(row => ({
        set: row.sets,
        weight: row.weight,
        reps: row.reps,
        equipment: row.variant_equipment,
        grip: row.variant_grip,
        position: row.variant_position
      }))
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (err) {
    console.error('Error en API exercise-history GET:', err);
    return new Response(JSON.stringify({ message: 'Error interno del servidor' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
