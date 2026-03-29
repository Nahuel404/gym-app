-- ============================================
-- Sistema de Entrenadores
-- Ejecutar UNA SOLA VEZ
-- ============================================

-- 1. Agregar campo is_trainer a users
ALTER TABLE users
ADD COLUMN IF NOT EXISTS is_trainer BOOLEAN NOT NULL DEFAULT false;

-- 2. Tabla de solicitudes entrenador-alumno
CREATE TABLE IF NOT EXISTS trainer_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  trainer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status VARCHAR(20) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'accepted', 'rejected')),
  message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(student_id, trainer_id)
);

CREATE INDEX IF NOT EXISTS idx_trainer_requests_trainer ON trainer_requests(trainer_id);
CREATE INDEX IF NOT EXISTS idx_trainer_requests_student ON trainer_requests(student_id);
CREATE INDEX IF NOT EXISTS idx_trainer_requests_status ON trainer_requests(status);

-- 3. Tabla de relaciones activas entrenador-alumno
CREATE TABLE IF NOT EXISTS trainer_students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(trainer_id, student_id)
);

CREATE INDEX IF NOT EXISTS idx_trainer_students_trainer ON trainer_students(trainer_id);
CREATE INDEX IF NOT EXISTS idx_trainer_students_student ON trainer_students(student_id);
