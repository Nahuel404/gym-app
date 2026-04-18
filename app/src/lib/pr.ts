import { supabase } from './supabase';

export type PrType = 'weight' | '1rm' | 'reps';

export interface PrInfo {
  exerciseName: string;
  variant: string;
  type: PrType;
  oldValue: number;
  newValue: number;
}

export interface PrAnnotation {
  is_pr: boolean;
  pr_type: PrType | null;
}

interface ExerciseInput {
  exercise_id: string;
  exerciseName: string;
  equipment?: string | null;
  grip?: string | null;
  position?: string | null;
  sets: Array<{ weight: number; reps: number }>;
}

function epley(weight: number, reps: number): number {
  return reps === 1 ? weight : weight * (1 + reps / 30);
}

// Returns per-set PR annotations (annotations[exIdx][setIdx]) and PR summaries for display.
// Only marks the single best PR set per exercise+variant combo to avoid noise.
// Skips exercises with no prior history (first time ever = not a PR notification).
export async function detectPRs(
  userId: string,
  exercises: ExerciseInput[]
): Promise<{ prs: PrInfo[]; annotations: PrAnnotation[][] }> {
  const prs: PrInfo[] = [];
  const annotations: PrAnnotation[][] = exercises.map(ex =>
    ex.sets.map(() => ({ is_pr: false, pr_type: null }))
  );

  for (let exIdx = 0; exIdx < exercises.length; exIdx++) {
    const { exercise_id, exerciseName, equipment, grip, position, sets } = exercises[exIdx];

    let q = supabase
      .from('exercise_history')
      .select('weight, reps')
      .eq('user_id', userId)
      .eq('exercise_id', exercise_id);

    if (equipment == null) q = q.is('variant_equipment', null);
    else q = q.eq('variant_equipment', equipment);

    if (grip == null) q = q.is('variant_grip', null);
    else q = q.eq('variant_grip', grip);

    if (position == null) q = q.is('variant_position', null);
    else q = q.eq('variant_position', position);

    const { data: history } = await q;
    if (!history || history.length === 0) continue;

    const variantStr = [equipment, grip, position].filter(Boolean).join(' · ');
    const isBodyweight = sets.every(s => s.weight === 0);

    if (isBodyweight) {
      const histMaxReps = Math.max(...history.map(h => h.reps));
      const bestIdx = sets.reduce((b, s, i) => (s.reps > sets[b].reps ? i : b), 0);
      if (sets[bestIdx].reps > histMaxReps) {
        annotations[exIdx][bestIdx] = { is_pr: true, pr_type: 'reps' };
        prs.push({ exerciseName, variant: variantStr, type: 'reps', oldValue: histMaxReps, newValue: sets[bestIdx].reps });
      }
    } else {
      const histMaxWeight = Math.max(...history.map(h => h.weight));
      const histMax1rm = Math.max(...history.map(h => epley(h.weight, h.reps)));

      const bestWeightIdx = sets.reduce((b, s, i) => (s.weight > sets[b].weight ? i : b), 0);
      const best1rmIdx = sets.reduce(
        (b, s, i) => (epley(s.weight, s.reps) > epley(sets[b].weight, sets[b].reps) ? i : b),
        0
      );

      if (sets[bestWeightIdx].weight > histMaxWeight) {
        annotations[exIdx][bestWeightIdx] = { is_pr: true, pr_type: 'weight' };
        prs.push({ exerciseName, variant: variantStr, type: 'weight', oldValue: histMaxWeight, newValue: sets[bestWeightIdx].weight });
      } else if (epley(sets[best1rmIdx].weight, sets[best1rmIdx].reps) > histMax1rm) {
        annotations[exIdx][best1rmIdx] = { is_pr: true, pr_type: '1rm' };
        prs.push({
          exerciseName, variant: variantStr, type: '1rm',
          oldValue: Math.round(histMax1rm * 10) / 10,
          newValue: Math.round(epley(sets[best1rmIdx].weight, sets[best1rmIdx].reps) * 10) / 10,
        });
      }
    }
  }

  return { prs, annotations };
}
