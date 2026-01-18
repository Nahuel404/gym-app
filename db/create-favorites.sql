-- Crear tabla de favoritos
CREATE TABLE IF NOT EXISTS user_favorite_exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  exercise_id UUID NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
  variant_equipment TEXT,
  variant_grip TEXT,
  variant_position TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, exercise_id, variant_equipment, variant_grip, variant_position)
);

CREATE INDEX IF NOT EXISTS idx_user_favorites_user_id ON user_favorite_exercises(user_id);

COMMENT ON TABLE user_favorite_exercises IS 'Ejercicios favoritos del usuario para trackear en el dashboard';
