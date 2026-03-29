import "dotenv/config";
import express, { type Request, type Response, type NextFunction } from "express";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

// =============================================================================
// CONFIG
// =============================================================================

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const PORT = Number(process.env.PORT) || 3000;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error("Missing required env vars: SUPABASE_URL, SUPABASE_ANON_KEY");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// =============================================================================
// AUTH — Validación por API key (generada desde la web app)
// =============================================================================

interface AuthenticatedUser {
  id: string;
  username: string;
  name: string;
  is_trainer: boolean;
}

async function validateApiKey(
  req: express.Request
): Promise<AuthenticatedUser | null> {
  const authHeader = req.headers.authorization || "";
  if (!authHeader.startsWith("Bearer ")) return null;
  const apiKey = authHeader.slice(7).trim();
  if (!apiKey || !apiKey.startsWith("gym_")) return null;

  const { data: user, error } = await supabase
    .from("users")
    .select("id, username, name")
    .eq("mcp_api_key", apiKey)
    .single();

  if (error || !user) return null;

  let isTrainer = false;
  try {
    const { data: trainerData } = await supabase
      .from("users")
      .select("is_trainer")
      .eq("id", user.id)
      .single();
    if (trainerData) isTrainer = trainerData.is_trainer ?? false;
  } catch {
    // Column may not exist yet — default to false
  }

  return { ...user, is_trainer: isTrainer };
}


// =============================================================================
// HELPERS
// =============================================================================

function daysAgoDate(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().split("T")[0];
}

function formatVariant(
  equipment: string | null,
  grip: string | null,
  position: string | null
): string | null {
  const parts = [equipment, grip, position].filter(Boolean);
  return parts.length > 0 ? parts.join(" / ") : null;
}

// =============================================================================
// TOOL REGISTRATION
// =============================================================================

function registerTools(server: McpServer, userId: string, isTrainer: boolean) {
  // ----- Tool 1: get_recent_workouts -----
  server.tool(
    "get_recent_workouts",
    "Obtiene los entrenamientos recientes del usuario con todos los ejercicios, series, pesos y repeticiones.",
    {
      days: z
        .number()
        .min(1)
        .max(365)
        .default(30)
        .describe("Días hacia atrás (default 30)"),
    },
    async ({ days }) => {
      const since = daysAgoDate(days);

      const { data: workouts, error } = await supabase
        .from("workouts")
        .select(
          `
          id, workout_date, notes,
          exercise_history (
            sets, weight, reps,
            variant_equipment, variant_grip, variant_position,
            exercises ( name, muscle_group )
          )
        `
        )
        .eq("user_id", userId)
        .gte("workout_date", since)
        .order("workout_date", { ascending: false });

      if (error) {
        return {
          content: [{ type: "text" as const, text: `Error: ${error.message}` }],
        };
      }

      if (!workouts || workouts.length === 0) {
        return {
          content: [
            {
              type: "text" as const,
              text: `No se encontraron entrenamientos en los últimos ${days} días.`,
            },
          ],
        };
      }

      const result = workouts.map((w: any) => {
        const exerciseMap = new Map<string, any>();
        for (const entry of w.exercise_history || []) {
          const exercise = entry.exercises;
          const variant = formatVariant(
            entry.variant_equipment,
            entry.variant_grip,
            entry.variant_position
          );
          const key = `${exercise.name}|${variant || ""}`;
          if (!exerciseMap.has(key)) {
            exerciseMap.set(key, {
              name: exercise.name,
              muscle_group: exercise.muscle_group,
              variant,
              sets: [],
            });
          }
          exerciseMap.get(key).sets.push({
            set: entry.sets,
            weight: Number(entry.weight),
            reps: entry.reps,
          });
        }
        return {
          date: w.workout_date,
          notes: w.notes,
          exercises: Array.from(exerciseMap.values()),
        };
      });

      return {
        content: [
          { type: "text" as const, text: JSON.stringify(result, null, 2) },
        ],
      };
    }
  );

  // ----- Tool 2: get_exercise_progress -----
  server.tool(
    "get_exercise_progress",
    "Progresión histórica de un ejercicio: peso máximo, volumen y series por sesión. Detecta si hay progreso, estancamiento o regresión.",
    {
      exercise_name: z
        .string()
        .describe("Nombre del ejercicio (ej: 'Press de Banca')"),
      days: z
        .number()
        .min(1)
        .max(730)
        .default(90)
        .describe("Días hacia atrás (default 90)"),
    },
    async ({ exercise_name, days }) => {
      const since = daysAgoDate(days);

      const { data: exercises } = await supabase
        .from("exercises")
        .select("id, name, muscle_group")
        .ilike("name", `%${exercise_name}%`);

      if (!exercises || exercises.length === 0) {
        return {
          content: [
            {
              type: "text" as const,
              text: `No se encontró el ejercicio "${exercise_name}".`,
            },
          ],
        };
      }

      const exercise = exercises[0];

      const { data: history, error } = await supabase
        .from("exercise_history")
        .select(
          `
          sets, weight, reps,
          variant_equipment, variant_grip, variant_position,
          workouts!inner ( workout_date )
        `
        )
        .eq("user_id", userId)
        .eq("exercise_id", exercise.id)
        .gte("workouts.workout_date", since)
        .order("created_at", { ascending: true });

      if (error) {
        return {
          content: [{ type: "text" as const, text: `Error: ${error.message}` }],
        };
      }

      if (!history || history.length === 0) {
        return {
          content: [
            {
              type: "text" as const,
              text: `No hay registros de "${exercise.name}" en los últimos ${days} días.`,
            },
          ],
        };
      }

      const byDate = new Map<string, any[]>();
      for (const entry of history) {
        const date = (entry as any).workouts.workout_date;
        if (!byDate.has(date)) byDate.set(date, []);
        byDate.get(date)!.push(entry);
      }

      const progression = Array.from(byDate.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, entries]) => {
          const weights = entries.map((e) => Number(e.weight));
          const totalVolume = entries.reduce(
            (sum, e) => sum + Number(e.weight) * e.reps,
            0
          );
          const totalReps = entries.reduce((sum, e) => sum + e.reps, 0);
          return {
            date,
            max_weight: Math.max(...weights),
            total_sets: entries.length,
            total_reps: totalReps,
            total_volume: Math.round(totalVolume),
            avg_reps_per_set: Math.round(totalReps / entries.length),
          };
        });

      const first = progression[0];
      const last = progression[progression.length - 1];
      const weightChange = last.max_weight - first.max_weight;
      const volumeChange = last.total_volume - first.total_volume;

      const result = {
        exercise: exercise.name,
        muscle_group: exercise.muscle_group,
        period: `${days} días`,
        sessions: progression.length,
        trend: {
          weight_change: weightChange,
          weight_change_pct:
            first.max_weight > 0
              ? Math.round((weightChange / first.max_weight) * 100)
              : 0,
          volume_change: volumeChange,
          volume_change_pct:
            first.total_volume > 0
              ? Math.round((volumeChange / first.total_volume) * 100)
              : 0,
        },
        data_points: progression,
      };

      return {
        content: [
          { type: "text" as const, text: JSON.stringify(result, null, 2) },
        ],
      };
    }
  );

  // ----- Tool 3: get_training_summary -----
  server.tool(
    "get_training_summary",
    "Resumen general: frecuencia semanal, volumen por grupo muscular, balance muscular. Detecta desbalances y grupos descuidados.",
    {
      days: z
        .number()
        .min(1)
        .max(365)
        .default(30)
        .describe("Días hacia atrás (default 30)"),
    },
    async ({ days }) => {
      const since = daysAgoDate(days);

      const { data: workouts, error } = await supabase
        .from("workouts")
        .select(
          `
          workout_date,
          exercise_history (
            sets, weight, reps,
            exercises ( name, muscle_group )
          )
        `
        )
        .eq("user_id", userId)
        .gte("workout_date", since)
        .order("workout_date", { ascending: false });

      if (error) {
        return {
          content: [{ type: "text" as const, text: `Error: ${error.message}` }],
        };
      }

      if (!workouts || workouts.length === 0) {
        return {
          content: [
            {
              type: "text" as const,
              text: `No hay entrenamientos en los últimos ${days} días.`,
            },
          ],
        };
      }

      const uniqueDates = new Set(workouts.map((w: any) => w.workout_date));
      const totalWorkouts = uniqueDates.size;
      const weeks = Math.max(1, days / 7);
      const avgPerWeek = Math.round((totalWorkouts / weeks) * 10) / 10;

      const muscleStats = new Map<
        string,
        {
          sessions: Set<string>;
          totalSets: number;
          totalVolume: number;
          totalReps: number;
        }
      >();

      for (const w of workouts) {
        for (const entry of (w as any).exercise_history || []) {
          const mg = entry.exercises.muscle_group;
          if (!muscleStats.has(mg)) {
            muscleStats.set(mg, {
              sessions: new Set(),
              totalSets: 0,
              totalVolume: 0,
              totalReps: 0,
            });
          }
          const stats = muscleStats.get(mg)!;
          stats.sessions.add(w.workout_date);
          stats.totalSets += 1;
          stats.totalReps += entry.reps;
          stats.totalVolume += Number(entry.weight) * entry.reps;
        }
      }

      const muscleGroups: Record<string, any> = {};
      for (const [mg, stats] of muscleStats) {
        muscleGroups[mg] = {
          sessions: stats.sessions.size,
          total_sets: stats.totalSets,
          total_reps: stats.totalReps,
          total_volume_kg: Math.round(stats.totalVolume),
          sets_per_week: Math.round((stats.totalSets / weeks) * 10) / 10,
        };
      }

      const sorted = Object.fromEntries(
        Object.entries(muscleGroups).sort(
          ([, a]: any, [, b]: any) => b.total_volume_kg - a.total_volume_kg
        )
      );

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                period: `${days} días`,
                total_workouts: totalWorkouts,
                avg_workouts_per_week: avgPerWeek,
                muscle_groups: sorted,
              },
              null,
              2
            ),
          },
        ],
      };
    }
  );

  // ----- Tool 4: get_personal_records -----
  server.tool(
    "get_personal_records",
    "Récords personales (peso máximo) de cada ejercicio o de uno específico.",
    {
      exercise_name: z
        .string()
        .optional()
        .describe(
          "Nombre del ejercicio (opcional, si no se provee muestra todos)"
        ),
    },
    async ({ exercise_name }) => {
      let query = supabase
        .from("exercise_history")
        .select(
          `
          weight, reps,
          variant_equipment, variant_grip, variant_position,
          workouts!inner ( workout_date ),
          exercises!inner ( name, muscle_group )
        `
        )
        .eq("user_id", userId)
        .order("weight", { ascending: false });

      if (exercise_name) {
        query = query.ilike("exercises.name", `%${exercise_name}%`);
      }

      const { data, error } = await query;

      if (error) {
        return {
          content: [{ type: "text" as const, text: `Error: ${error.message}` }],
        };
      }

      if (!data || data.length === 0) {
        return {
          content: [
            { type: "text" as const, text: "No se encontraron registros." },
          ],
        };
      }

      const prMap = new Map<string, any>();
      for (const entry of data) {
        const ex = (entry as any).exercises;
        const variant = formatVariant(
          entry.variant_equipment,
          entry.variant_grip,
          entry.variant_position
        );
        const key = `${ex.name}|${variant || ""}`;
        const weight = Number(entry.weight);

        if (!prMap.has(key) || weight > prMap.get(key).weight) {
          prMap.set(key, {
            exercise: ex.name,
            muscle_group: ex.muscle_group,
            variant,
            weight,
            reps: entry.reps,
            date: (entry as any).workouts.workout_date,
          });
        }
      }

      const records = Array.from(prMap.values()).sort(
        (a, b) =>
          a.muscle_group.localeCompare(b.muscle_group) ||
          a.exercise.localeCompare(b.exercise)
      );

      return {
        content: [
          { type: "text" as const, text: JSON.stringify(records, null, 2) },
        ],
      };
    }
  );

  // ----- Tool 5: get_exercise_catalog -----
  server.tool(
    "get_exercise_catalog",
    "Lista todos los ejercicios del catálogo agrupados por grupo muscular.",
    {},
    async () => {
      const { data, error } = await supabase
        .from("exercises")
        .select("name, muscle_group, description")
        .order("muscle_group")
        .order("name");

      if (error) {
        return {
          content: [{ type: "text" as const, text: `Error: ${error.message}` }],
        };
      }

      const grouped: Record<
        string,
        { name: string; description: string | null }[]
      > = {};
      for (const ex of data || []) {
        if (!grouped[ex.muscle_group]) grouped[ex.muscle_group] = [];
        grouped[ex.muscle_group].push({
          name: ex.name,
          description: ex.description,
        });
      }

      return {
        content: [
          { type: "text" as const, text: JSON.stringify(grouped, null, 2) },
        ],
      };
    }
  );

  // =========================================================================
  // TRAINER-ONLY TOOLS (solo se registran si el usuario es entrenador)
  // =========================================================================
  if (!isTrainer) return;

  async function verifyStudent(trainerId: string, studentId: string): Promise<{ name: string; username: string } | null> {
    const { data } = await supabase
      .from("trainer_students")
      .select("student:users!trainer_students_student_id_fkey(name, username)")
      .eq("trainer_id", trainerId)
      .eq("student_id", studentId)
      .single();
    if (!data) return null;
    const s = (data as any).student;
    return { name: s.name, username: s.username };
  }

  // ----- Tool 6: list_students -----
  server.tool(
    "list_students",
    "Lista todos los alumnos activos del entrenador con estadísticas resumidas (entrenamientos, volumen, último entreno).",
    {},
    async () => {
      const { data: relations, error } = await supabase
        .from("trainer_students")
        .select("student_id, started_at, student:users!trainer_students_student_id_fkey(name, username)")
        .eq("trainer_id", userId)
        .order("started_at", { ascending: false });

      if (error) {
        return { content: [{ type: "text" as const, text: `Error: ${error.message}` }] };
      }

      if (!relations || relations.length === 0) {
        return { content: [{ type: "text" as const, text: "No tienes alumnos activos." }] };
      }

      const students = [];
      for (const rel of relations) {
        const s = (rel as any).student;
        const sid = rel.student_id;

        const { data: wkDates } = await supabase
          .from("workouts")
          .select("workout_date")
          .eq("user_id", sid);
        const uniqueWorkoutCount = new Set(wkDates?.map(w => w.workout_date)).size;

        const { data: lastW } = await supabase
          .from("workouts")
          .select("workout_date")
          .eq("user_id", sid)
          .order("workout_date", { ascending: false })
          .limit(1);

        const { data: volData } = await supabase
          .from("exercise_history")
          .select("weight, reps")
          .eq("user_id", sid);

        const totalVolume = volData?.reduce((acc, h) => acc + Number(h.weight) * h.reps, 0) || 0;

        students.push({
          id: sid,
          name: s.name,
          username: s.username,
          started_at: rel.started_at,
          total_workouts: uniqueWorkoutCount,
          last_workout_date: lastW?.[0]?.workout_date || null,
          total_volume_kg: Math.round(totalVolume),
        });
      }

      return { content: [{ type: "text" as const, text: JSON.stringify(students, null, 2) }] };
    }
  );

  // ----- Tool 7: get_student_workouts -----
  server.tool(
    "get_student_workouts",
    "Obtiene los entrenamientos recientes de un alumno específico. Solo accesible si es tu alumno.",
    {
      student_id: z.string().describe("ID del alumno"),
      days: z.number().min(1).max(365).default(30).describe("Días hacia atrás (default 30)"),
    },
    async ({ student_id, days }) => {
      const student = await verifyStudent(userId, student_id);
      if (!student) {
        return { content: [{ type: "text" as const, text: "Error: no es tu alumno o no existe la relación." }] };
      }

      const since = daysAgoDate(days);
      const { data: workouts, error } = await supabase
        .from("workouts")
        .select(`
          id, workout_date, notes,
          exercise_history (
            sets, weight, reps,
            variant_equipment, variant_grip, variant_position,
            exercises ( name, muscle_group )
          )
        `)
        .eq("user_id", student_id)
        .gte("workout_date", since)
        .order("workout_date", { ascending: false });

      if (error) {
        return { content: [{ type: "text" as const, text: `Error: ${error.message}` }] };
      }

      if (!workouts || workouts.length === 0) {
        return { content: [{ type: "text" as const, text: `${student.name} no tiene entrenamientos en los últimos ${days} días.` }] };
      }

      const result = workouts.map((w: any) => {
        const exerciseMap = new Map<string, any>();
        for (const entry of w.exercise_history || []) {
          const exercise = entry.exercises;
          const variant = formatVariant(entry.variant_equipment, entry.variant_grip, entry.variant_position);
          const key = `${exercise.name}|${variant || ""}`;
          if (!exerciseMap.has(key)) {
            exerciseMap.set(key, { name: exercise.name, muscle_group: exercise.muscle_group, variant, sets: [] });
          }
          exerciseMap.get(key).sets.push({ set: entry.sets, weight: Number(entry.weight), reps: entry.reps });
        }
        return { date: w.workout_date, notes: w.notes, exercises: Array.from(exerciseMap.values()) };
      });

      return {
        content: [{ type: "text" as const, text: JSON.stringify({ student_name: student.name, workouts: result }, null, 2) }],
      };
    }
  );

  // ----- Tool 8: get_student_exercise_progress -----
  server.tool(
    "get_student_exercise_progress",
    "Progresión histórica de un ejercicio específico de un alumno: peso máximo, volumen y tendencia.",
    {
      student_id: z.string().describe("ID del alumno"),
      exercise_name: z.string().describe("Nombre del ejercicio"),
      days: z.number().min(1).max(730).default(90).describe("Días hacia atrás (default 90)"),
    },
    async ({ student_id, exercise_name, days }) => {
      const student = await verifyStudent(userId, student_id);
      if (!student) {
        return { content: [{ type: "text" as const, text: "Error: no es tu alumno o no existe la relación." }] };
      }

      const since = daysAgoDate(days);
      const { data: exercises } = await supabase
        .from("exercises")
        .select("id, name, muscle_group")
        .ilike("name", `%${exercise_name}%`);

      if (!exercises || exercises.length === 0) {
        return { content: [{ type: "text" as const, text: `No se encontró el ejercicio "${exercise_name}".` }] };
      }

      const exercise = exercises[0];
      const { data: history, error } = await supabase
        .from("exercise_history")
        .select(`sets, weight, reps, variant_equipment, variant_grip, variant_position, workouts!inner ( workout_date )`)
        .eq("user_id", student_id)
        .eq("exercise_id", exercise.id)
        .gte("workouts.workout_date", since)
        .order("created_at", { ascending: true });

      if (error) {
        return { content: [{ type: "text" as const, text: `Error: ${error.message}` }] };
      }

      if (!history || history.length === 0) {
        return { content: [{ type: "text" as const, text: `${student.name} no tiene registros de "${exercise.name}" en los últimos ${days} días.` }] };
      }

      const byDate = new Map<string, any[]>();
      for (const entry of history) {
        const date = (entry as any).workouts.workout_date;
        if (!byDate.has(date)) byDate.set(date, []);
        byDate.get(date)!.push(entry);
      }

      const progression = Array.from(byDate.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, entries]) => {
          const weights = entries.map((e) => Number(e.weight));
          const totalVolume = entries.reduce((sum, e) => sum + Number(e.weight) * e.reps, 0);
          const totalReps = entries.reduce((sum, e) => sum + e.reps, 0);
          return {
            date,
            max_weight: Math.max(...weights),
            total_sets: entries.length,
            total_reps: totalReps,
            total_volume: Math.round(totalVolume),
          };
        });

      const first = progression[0];
      const last = progression[progression.length - 1];

      return {
        content: [{
          type: "text" as const,
          text: JSON.stringify({
            student_name: student.name,
            exercise: exercise.name,
            muscle_group: exercise.muscle_group,
            period: `${days} días`,
            sessions: progression.length,
            trend: {
              weight_change: last.max_weight - first.max_weight,
              weight_change_pct: first.max_weight > 0 ? Math.round(((last.max_weight - first.max_weight) / first.max_weight) * 100) : 0,
              volume_change: last.total_volume - first.total_volume,
            },
            data_points: progression,
          }, null, 2),
        }],
      };
    }
  );

  // ----- Tool 9: get_student_summary -----
  server.tool(
    "get_student_summary",
    "Resumen de entrenamiento de un alumno: frecuencia, volumen por grupo muscular, balance. Detecta desbalances.",
    {
      student_id: z.string().describe("ID del alumno"),
      days: z.number().min(1).max(365).default(30).describe("Días hacia atrás (default 30)"),
    },
    async ({ student_id, days }) => {
      const student = await verifyStudent(userId, student_id);
      if (!student) {
        return { content: [{ type: "text" as const, text: "Error: no es tu alumno o no existe la relación." }] };
      }

      const since = daysAgoDate(days);
      const { data: workouts, error } = await supabase
        .from("workouts")
        .select(`workout_date, exercise_history ( sets, weight, reps, exercises ( name, muscle_group ) )`)
        .eq("user_id", student_id)
        .gte("workout_date", since)
        .order("workout_date", { ascending: false });

      if (error) {
        return { content: [{ type: "text" as const, text: `Error: ${error.message}` }] };
      }

      if (!workouts || workouts.length === 0) {
        return { content: [{ type: "text" as const, text: `${student.name} no tiene entrenamientos en los últimos ${days} días.` }] };
      }

      const weeks = Math.max(1, days / 7);
      const muscleStats = new Map<string, { sessions: Set<string>; totalSets: number; totalVolume: number; totalReps: number }>();

      for (const w of workouts) {
        for (const entry of (w as any).exercise_history || []) {
          const mg = entry.exercises.muscle_group;
          if (!muscleStats.has(mg)) {
            muscleStats.set(mg, { sessions: new Set(), totalSets: 0, totalVolume: 0, totalReps: 0 });
          }
          const stats = muscleStats.get(mg)!;
          stats.sessions.add(w.workout_date);
          stats.totalSets += 1;
          stats.totalReps += entry.reps;
          stats.totalVolume += Number(entry.weight) * entry.reps;
        }
      }

      const muscleGroups: Record<string, any> = {};
      for (const [mg, stats] of muscleStats) {
        muscleGroups[mg] = {
          sessions: stats.sessions.size,
          total_sets: stats.totalSets,
          total_reps: stats.totalReps,
          total_volume_kg: Math.round(stats.totalVolume),
          sets_per_week: Math.round((stats.totalSets / weeks) * 10) / 10,
        };
      }

      const sorted = Object.fromEntries(
        Object.entries(muscleGroups).sort(([, a]: any, [, b]: any) => b.total_volume_kg - a.total_volume_kg)
      );

      return {
        content: [{
          type: "text" as const,
          text: JSON.stringify({
            student_name: student.name,
            period: `${days} días`,
            total_workouts: new Set(workouts.map((w: any) => w.workout_date)).size,
            avg_workouts_per_week: Math.round((new Set(workouts.map((w: any) => w.workout_date)).size / weeks) * 10) / 10,
            muscle_groups: sorted,
          }, null, 2),
        }],
      };
    }
  );

  // ----- Tool 10: compare_students -----
  server.tool(
    "compare_students",
    "Compara estadísticas de entrenamiento entre dos o más alumnos: volumen, frecuencia, consistencia.",
    {
      student_ids: z.array(z.string()).min(2).describe("IDs de alumnos a comparar"),
      days: z.number().min(1).max(365).default(30).describe("Período de comparación (default 30)"),
    },
    async ({ student_ids, days }) => {
      const since = daysAgoDate(days);
      const weeks = Math.max(1, days / 7);
      const totalWeeks = Math.ceil(days / 7);
      const comparisons = [];

      for (const sid of student_ids) {
        const student = await verifyStudent(userId, sid);
        if (!student) {
          return { content: [{ type: "text" as const, text: `Error: alumno ${sid} no es tu alumno.` }] };
        }

        const { data: workouts } = await supabase
          .from("workouts")
          .select(`workout_date, exercise_history ( sets, weight, reps, exercises ( muscle_group ) )`)
          .eq("user_id", sid)
          .gte("workout_date", since);

        const wks = workouts || [];
        const uniqueWeeks = new Set(wks.map(w => {
          const d = new Date(w.workout_date);
          const jan1 = new Date(d.getFullYear(), 0, 1);
          return `${d.getFullYear()}-W${Math.ceil(((d.getTime() - jan1.getTime()) / 86400000 + jan1.getDay() + 1) / 7)}`;
        }));

        const muscleVolume: Record<string, number> = {};
        let totalVol = 0;
        let totalSets = 0;
        for (const w of wks) {
          for (const e of (w as any).exercise_history || []) {
            const vol = Number(e.weight) * e.reps;
            totalVol += vol;
            totalSets += 1;
            const mg = e.exercises.muscle_group;
            muscleVolume[mg] = (muscleVolume[mg] || 0) + vol;
          }
        }

        const uniqueWkDates = new Set(wks.map((w: any) => w.workout_date)).size;
        comparisons.push({
          id: sid,
          name: student.name,
          username: student.username,
          total_workouts: uniqueWkDates,
          avg_workouts_per_week: Math.round((uniqueWkDates / weeks) * 10) / 10,
          total_volume_kg: Math.round(totalVol),
          total_sets: totalSets,
          consistency_pct: Math.round((uniqueWeeks.size / totalWeeks) * 100),
          muscle_groups: Object.fromEntries(
            Object.entries(muscleVolume)
              .sort(([, a], [, b]) => b - a)
              .map(([mg, vol]) => [mg, Math.round(vol)])
          ),
        });
      }

      return {
        content: [{ type: "text" as const, text: JSON.stringify(comparisons, null, 2) }],
      };
    }
  );
}

// =============================================================================
// MCP SERVER FACTORY
// =============================================================================

function createGymServer(userId: string, isTrainer: boolean): McpServer {
  const server = new McpServer({
    name: "gym-tracker",
    version: "1.0.0",
  });
  registerTools(server, userId, isTrainer);
  return server;
}

// =============================================================================
// EXPRESS APP
// =============================================================================

const app = express();
app.use(express.json());

// CORS — necesario para conexiones remotas desde Claude
app.use((_req: Request, res: Response, next: NextFunction) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header(
    "Access-Control-Allow-Methods",
    "GET, POST, DELETE, OPTIONS"
  );
  res.header(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, Mcp-Session-Id"
  );
  res.header("Access-Control-Expose-Headers", "Mcp-Session-Id");
  if (_req.method === "OPTIONS") {
    res.sendStatus(204);
    return;
  }
  next();
});

// =============================================================================
// MCP ENDPOINTS
// =============================================================================

// POST /mcp — mensajes del cliente al server (stateless: un server/transport por request)
app.post("/mcp", async (req: Request, res: Response) => {
  const user = await validateApiKey(req);
  if (!user) {
    res.status(401).json({
      jsonrpc: "2.0",
      error: { code: -32600, message: "No autorizado: API key inválida o faltante" },
      id: null,
    });
    return;
  }

  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
  });
  const server = createGymServer(user.id, user.is_trainer);
  await server.connect(transport);
  await transport.handleRequest(req, res, req.body);
});

// Health check
app.get("/health", (_req: Request, res: Response) => {
  res.json({ status: "ok" });
});

// =============================================================================
// START
// =============================================================================

app.listen(PORT, () => {
  console.log(`Gym MCP Server corriendo en http://localhost:${PORT}`);
  console.log(`  MCP endpoint: http://localhost:${PORT}/mcp`);
  console.log(`  Auth:         POST http://localhost:${PORT}/auth/token`);
  console.log(`  Health:       GET  http://localhost:${PORT}/health`);
});