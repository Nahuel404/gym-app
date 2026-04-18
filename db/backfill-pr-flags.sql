-- Backfill is_pr flags in existing exercise_history rows.
-- Marks ONE best set per (user, exercise, variant) combo.
-- Safe to re-run: resets all flags first.

-- Reset
UPDATE exercise_history SET is_pr = false, pr_type = NULL;

-- Best weight set per combo (non-bodyweight)
UPDATE exercise_history
SET is_pr = true, pr_type = 'weight'
WHERE id IN (
  SELECT DISTINCT ON (
    user_id, exercise_id,
    COALESCE(variant_equipment, ''),
    COALESCE(variant_grip, ''),
    COALESCE(variant_position, '')
  ) id
  FROM exercise_history
  WHERE weight > 0
  ORDER BY
    user_id, exercise_id,
    COALESCE(variant_equipment, ''),
    COALESCE(variant_grip, ''),
    COALESCE(variant_position, ''),
    weight DESC,
    reps DESC
);

-- Best reps set per combo (bodyweight)
UPDATE exercise_history
SET is_pr = true, pr_type = 'reps'
WHERE id IN (
  SELECT DISTINCT ON (
    user_id, exercise_id,
    COALESCE(variant_equipment, ''),
    COALESCE(variant_grip, ''),
    COALESCE(variant_position, '')
  ) id
  FROM exercise_history
  WHERE weight = 0
  ORDER BY
    user_id, exercise_id,
    COALESCE(variant_equipment, ''),
    COALESCE(variant_grip, ''),
    COALESCE(variant_position, ''),
    reps DESC
);
