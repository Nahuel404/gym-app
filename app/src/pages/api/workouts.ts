import type { APIRoute } from 'astro';
import { supabase } from '../../lib/supabase';

export const POST: APIRoute = async ({ request, locals }) => {
  try {
    const user = locals.user;
    if (!user) {
      return new Response(JSON.stringify({ message: 'No autorizado' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const body = await request.json();
    const { workout_date, exercises } = body;

    if (!exercises || exercises.length === 0) {
      return new Response(JSON.stringify({ message: 'No hay ejercicios para guardar' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 1. Crear el workout
    const { data: workout, error: workoutError } = await supabase
      .from('workouts')
      .insert({
        user_id: user.id,
        workout_date: workout_date || new Date().toISOString().split('T')[0],
        notes: null
      })
      .select()
      .single();

    if (workoutError) {
      console.error('Error creando workout:', workoutError);
      return new Response(JSON.stringify({ message: 'Error al crear el entrenamiento', error: workoutError.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 2. Crear las series asociadas al workout
    let totalVolume = 0;
    const historyRecords = [];

    for (const exercise of exercises) {
      for (let setIndex = 0; setIndex < exercise.sets.length; setIndex++) {
        const set = exercise.sets[setIndex];
        const volume = set.weight * set.reps;
        totalVolume += volume;

        historyRecords.push({
          workout_id: workout.id,
          user_id: user.id,
          exercise_id: exercise.exercise_id,
          sets: setIndex + 1, // Número de serie (1, 2, 3...)
          weight: set.weight,
          reps: set.reps,
          variant_equipment: exercise.equipment || null,
          variant_grip: exercise.grip || null,
          variant_position: exercise.position || null,
          notes: null
        });
      }
    }

    // 3. Insertar todas las series
    const { data: sets, error: setsError } = await supabase
      .from('exercise_history')
      .insert(historyRecords)
      .select();

    if (setsError) {
      console.error('Error guardando series:', setsError);
      // Eliminar el workout si falla
      await supabase.from('workouts').delete().eq('id', workout.id);
      return new Response(JSON.stringify({ message: 'Error al guardar las series', error: setsError.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({
      message: 'Entrenamiento guardado',
      workout_id: workout.id,
      totalVolume,
      setsCount: historyRecords.length
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (err) {
    console.error('Error en API workouts:', err);
    return new Response(JSON.stringify({ message: 'Error interno del servidor', error: String(err) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

export const GET: APIRoute = async ({ locals }) => {
  try {
    const user = locals.user;
    if (!user) {
      return new Response(JSON.stringify({ message: 'No autorizado' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Obtener workouts del usuario con sus ejercicios
    const { data, error } = await supabase
      .from('workouts')
      .select(`
        id,
        workout_date,
        notes,
        created_at,
        exercise_history (
          id,
          weight,
          reps,
          variant_equipment,
          variant_grip,
          variant_position,
          exercises (
            id,
            name,
            muscle_group
          )
        )
      `)
      .eq('user_id', user.id)
      .order('workout_date', { ascending: false })
      .limit(50);

    if (error) {
      console.error('Error obteniendo workouts:', error);
      return new Response(JSON.stringify({ message: 'Error al obtener workouts' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (err) {
    console.error('Error en API workouts GET:', err);
    return new Response(JSON.stringify({ message: 'Error interno del servidor' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

export const DELETE: APIRoute = async ({ request, locals }) => {
  try {
    const user = locals.user;
    if (!user) {
      return new Response(JSON.stringify({ message: 'No autorizado' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const url = new URL(request.url);
    const id = url.searchParams.get('id');

    if (!id) {
      return new Response(JSON.stringify({ message: 'id es requerido' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Verificar que el workout pertenece al usuario y eliminarlo
    const { error } = await supabase
      .from('workouts')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) {
      console.error('Error eliminando workout:', error);
      return new Response(JSON.stringify({ message: 'Error al eliminar el entrenamiento' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ message: 'Entrenamiento eliminado correctamente' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (err) {
    console.error('Error en API workouts DELETE:', err);
    return new Response(JSON.stringify({ message: 'Error interno del servidor' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

export const PUT: APIRoute = async ({ request, locals }) => {
  try {
    const user = locals.user;
    if (!user) {
      return new Response(JSON.stringify({ message: 'No autorizado' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const url = new URL(request.url);
    const id = url.searchParams.get('id');

    if (!id) {
      return new Response(JSON.stringify({ message: 'id es requerido' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const body = await request.json();
    const { workout_date, exercises } = body;

    if (!exercises || exercises.length === 0) {
      return new Response(JSON.stringify({ message: 'No hay ejercicios para guardar' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 1. Verificar que el workout pertenece al usuario
    const { data: existingWorkout, error: verifyError } = await supabase
      .from('workouts')
      .select('id')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (verifyError || !existingWorkout) {
      return new Response(JSON.stringify({ message: 'Entrenamiento no encontrado' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 2. Actualizar fecha del workout si cambió
    if (workout_date) {
      const { error: updateError } = await supabase
        .from('workouts')
        .update({ workout_date })
        .eq('id', id);

      if (updateError) {
        console.error('Error actualizando fecha:', updateError);
      }
    }

    // 3. Eliminar todas las series existentes
    const { error: deleteError } = await supabase
      .from('exercise_history')
      .delete()
      .eq('workout_id', id);

    if (deleteError) {
      console.error('Error eliminando series:', deleteError);
      return new Response(JSON.stringify({ message: 'Error al eliminar series existentes' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 4. Crear las nuevas series
    const historyRecords = [];
    for (const exercise of exercises) {
      for (let setIndex = 0; setIndex < exercise.sets.length; setIndex++) {
        const set = exercise.sets[setIndex];
        historyRecords.push({
          workout_id: id,
          user_id: user.id,
          exercise_id: exercise.exercise_id,
          sets: setIndex + 1,
          weight: set.weight,
          reps: set.reps,
          variant_equipment: exercise.equipment || null,
          variant_grip: exercise.grip || null,
          variant_position: exercise.position || null,
          notes: null
        });
      }
    }

    const { error: insertError } = await supabase
      .from('exercise_history')
      .insert(historyRecords);

    if (insertError) {
      console.error('Error guardando nuevas series:', insertError);
      return new Response(JSON.stringify({ message: 'Error al guardar las series', error: insertError.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({
      message: 'Entrenamiento actualizado correctamente',
      workout_id: id
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (err) {
    console.error('Error en API workouts PUT:', err);
    return new Response(JSON.stringify({ message: 'Error interno del servidor', error: String(err) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
