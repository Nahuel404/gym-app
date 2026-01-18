-- ============================================
-- GYM APP - Database Schema
-- Ejecutar UNA SOLA VEZ para crear las tablas
-- ============================================

-- Tabla de usuarios
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de ejercicios (catálogo)
CREATE TABLE IF NOT EXISTS exercises (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    muscle_group VARCHAR(50) NOT NULL,
    description TEXT,
    image_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    UNIQUE(name, muscle_group)
);

-- Tabla histórica de ejercicios (principal para estadísticas)
CREATE TABLE IF NOT EXISTS exercise_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    exercise_id UUID NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,

    -- Datos del entrenamiento
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    sets INTEGER NOT NULL CHECK (sets > 0),
    reps INTEGER NOT NULL CHECK (reps > 0),
    weight DECIMAL(6,2) NOT NULL CHECK (weight >= 0),
    weight_unit VARCHAR(5) DEFAULT 'kg' CHECK (weight_unit IN ('kg', 'lb')),

    -- Datos opcionales
    rpe DECIMAL(3,1) CHECK (rpe >= 1 AND rpe <= 10),  -- Rating of Perceived Exertion
    notes TEXT,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para optimizar consultas de estadísticas
CREATE INDEX IF NOT EXISTS idx_exercise_history_user_id ON exercise_history(user_id);
CREATE INDEX IF NOT EXISTS idx_exercise_history_exercise_id ON exercise_history(exercise_id);
CREATE INDEX IF NOT EXISTS idx_exercise_history_date ON exercise_history(date);
CREATE INDEX IF NOT EXISTS idx_exercise_history_user_date ON exercise_history(user_id, date);

-- Insertar ejercicios básicos de ejemplo
INSERT INTO exercises (name, muscle_group, description) VALUES
    ('Press de Banca', 'Pecho', 'Ejercicio compuesto para pectorales, deltoides anteriores y tríceps'),
    ('Sentadilla', 'Piernas', 'Ejercicio compuesto para cuádriceps, glúteos e isquiotibiales'),
    ('Peso Muerto', 'Espalda', 'Ejercicio compuesto para espalda baja, isquiotibiales y glúteos'),
    ('Press Militar', 'Hombros', 'Ejercicio para deltoides y tríceps'),
    ('Dominadas', 'Espalda', 'Ejercicio para dorsales, bíceps y core'),
    ('Remo con Barra', 'Espalda', 'Ejercicio compuesto para dorsales y bíceps'),
    ('Curl de Bíceps', 'Brazos', 'Ejercicio de aislamiento para bíceps'),
    ('Extensión de Tríceps', 'Brazos', 'Ejercicio de aislamiento para tríceps'),
    ('Zancadas', 'Piernas', 'Ejercicio para cuádriceps, glúteos e isquiotibiales'),
    ('Elevaciones Laterales', 'Hombros', 'Ejercicio de aislamiento para deltoides laterales'),
    ('Fondos', 'Pecho', 'Ejercicio para pectorales inferiores y tríceps'),
    ('Hip Thrust', 'Piernas', 'Ejercicio de aislamiento para glúteos'),
    ('Face Pull', 'Hombros', 'Ejercicio para deltoides posteriores y manguito rotador'),
    ('Plancha', 'Core', 'Ejercicio isométrico para abdominales y core')
ON CONFLICT (name, muscle_group) DO NOTHING;
