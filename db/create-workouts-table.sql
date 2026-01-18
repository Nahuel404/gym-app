-- Crear tabla de entrenamientos
CREATE TABLE IF NOT EXISTS workouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  workout_date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices para optimizar consultas
CREATE INDEX IF NOT EXISTS idx_workouts_user_id ON workouts(user_id);
CREATE INDEX IF NOT EXISTS idx_workouts_date ON workouts(workout_date);

-- Agregar columnas de variantes a exercise_history si no existen
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name='exercise_history' AND column_name='variant_equipment') THEN
    ALTER TABLE exercise_history
    ADD COLUMN variant_equipment TEXT,
    ADD COLUMN variant_grip TEXT,
    ADD COLUMN variant_position TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name='exercise_history' AND column_name='workout_id') THEN
    ALTER TABLE exercise_history
    ADD COLUMN workout_id UUID REFERENCES workouts(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Índice para workout_id
CREATE INDEX IF NOT EXISTS idx_exercise_history_workout_id ON exercise_history(workout_id);

-- Hacer workout_id NOT NULL después de migrar datos existentes
-- (Por ahora lo dejamos nullable para datos legacy)

COMMENT ON TABLE workouts IS 'Entrenamientos del usuario';
COMMENT ON COLUMN workouts.workout_date IS 'Fecha del entrenamiento';
COMMENT ON COLUMN exercise_history.workout_id IS 'ID del entrenamiento al que pertenece esta serie';
