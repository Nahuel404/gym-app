ALTER TABLE exercise_history
  ADD COLUMN IF NOT EXISTS is_pr BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS pr_type TEXT CHECK (pr_type IN ('weight', '1rm', 'reps'));

CREATE INDEX IF NOT EXISTS idx_exercise_history_pr
  ON exercise_history(user_id, exercise_id, is_pr)
  WHERE is_pr = true;
