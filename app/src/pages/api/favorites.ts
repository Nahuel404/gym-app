import type { APIRoute } from 'astro';
import { supabase } from '../../lib/supabase';

// GET - Obtener favoritos del usuario
export const GET: APIRoute = async ({ locals }) => {
  try {
    const user = locals.user;
    if (!user) {
      return new Response(JSON.stringify({ message: 'No autorizado' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const { data, error } = await supabase
      .from('user_favorite_exercises')
      .select(`
        id,
        exercise_id,
        variant_equipment,
        variant_grip,
        variant_position,
        exercises (
          id,
          name,
          muscle_group
        )
      `)
      .eq('user_id', user.id);

    if (error) {
      console.error('Error obteniendo favoritos:', error);
      return new Response(JSON.stringify({ message: 'Error al obtener favoritos' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err) {
    console.error('Error en API favorites GET:', err);
    return new Response(JSON.stringify({ message: 'Error interno del servidor' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

// POST - Agregar favorito
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
    const { exercise_id, variant_equipment, variant_grip, variant_position } = body;

    if (!exercise_id) {
      return new Response(JSON.stringify({ message: 'exercise_id es requerido' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const { data, error } = await supabase
      .from('user_favorite_exercises')
      .insert({
        user_id: user.id,
        exercise_id,
        variant_equipment: variant_equipment || null,
        variant_grip: variant_grip || null,
        variant_position: variant_position || null
      })
      .select()
      .single();

    if (error) {
      console.error('Error agregando favorito:', error);
      return new Response(JSON.stringify({ message: 'Error al agregar favorito', error: error.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err) {
    console.error('Error en API favorites POST:', err);
    return new Response(JSON.stringify({ message: 'Error interno del servidor' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

// DELETE - Eliminar favorito
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

    const { error } = await supabase
      .from('user_favorite_exercises')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) {
      console.error('Error eliminando favorito:', error);
      return new Response(JSON.stringify({ message: 'Error al eliminar favorito' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ message: 'Favorito eliminado' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err) {
    console.error('Error en API favorites DELETE:', err);
    return new Response(JSON.stringify({ message: 'Error interno del servidor' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
