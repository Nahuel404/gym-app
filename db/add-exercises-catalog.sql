-- =============================================================================
-- MIGRACIÓN: Ampliar catálogo de ejercicios
-- =============================================================================
-- Agrega ejercicios que representan PATRONES DE MOVIMIENTO DISTINTOS.
-- NO se agregan ejercicios que se cubren con el sistema de variantes existente.
--
-- Ejemplo de lo que NO se agrega:
--   - "Press de Banca Inclinado" → ya es Press de Banca + position=Inclinado
--   - "Curl Martillo" → ya es Curl de Bíceps + grip=Neutro
--   - "Remo en Máquina" → ya es Remo con Barra + equipment=Máquina
--
-- Los grupos musculares usados son los post-migración:
--   Pecho, Dorsales, Espalda Baja, Trapecios, Deltoides,
--   Bíceps, Tríceps, Cuádriceps, Isquiotibiales, Glúteos,
--   Pantorrillas, Abdominales, Antebrazos
-- =============================================================================

INSERT INTO exercises (name, muscle_group, description) VALUES

-- =====================
-- PECHO (2 nuevos)
-- =====================
-- Existentes: Press de Banca, Fondos
('Aperturas', 'Pecho', 'Movimiento de apertura para pectorales con estiramiento profundo del pecho'),
('Cruces en Polea', 'Pecho', 'Ejercicio de aislamiento para pectorales con tensión constante'),

-- =====================
-- DORSALES (2 nuevos)
-- =====================
-- Existentes: Dominadas, Remo con Barra
('Jalón al Pecho', 'Dorsales', 'Ejercicio de tirón vertical en máquina para dorsales y bíceps'),
('Pullover', 'Dorsales', 'Ejercicio para dorsales, pectorales y serrato anterior'),

-- =====================
-- ESPALDA BAJA (2 nuevos)
-- =====================
-- Existentes: Peso Muerto
('Hiperextensiones', 'Espalda Baja', 'Ejercicio para erectores espinales y espalda baja'),
('Buenos Días', 'Espalda Baja', 'Ejercicio de bisagra de cadera para espalda baja e isquiotibiales'),

-- =====================
-- TRAPECIOS (1 nuevo)
-- =====================
-- Existentes: ninguno
('Encogimientos', 'Trapecios', 'Ejercicio de aislamiento para trapecios superiores'),

-- =====================
-- DELTOIDES (2 nuevos)
-- =====================
-- Existentes: Press Militar, Elevaciones Laterales, Face Pull
('Elevación Frontal', 'Deltoides', 'Ejercicio de aislamiento para deltoides anteriores'),
('Pájaro', 'Deltoides', 'Ejercicio de aislamiento para deltoides posteriores'),

-- =====================
-- BÍCEPS (1 nuevo)
-- =====================
-- Existentes: Curl de Bíceps
('Curl Predicador', 'Bíceps', 'Ejercicio de aislamiento para bíceps en banco Scott con énfasis en la porción corta'),

-- =====================
-- TRÍCEPS (2 nuevos)
-- =====================
-- Existentes: Extensión de Tríceps
('Press Francés', 'Tríceps', 'Ejercicio de aislamiento para tríceps acostado, enfocado en la porción larga'),
('Patada de Tríceps', 'Tríceps', 'Ejercicio de aislamiento para tríceps en posición inclinada'),

-- =====================
-- CUÁDRICEPS (4 nuevos)
-- =====================
-- Existentes: Sentadilla, Zancadas
('Extensión de Pierna', 'Cuádriceps', 'Ejercicio de aislamiento en máquina para cuádriceps'),
('Prensa de Pierna', 'Cuádriceps', 'Ejercicio compuesto en máquina para cuádriceps, glúteos e isquiotibiales'),
('Sentadilla Búlgara', 'Cuádriceps', 'Ejercicio unilateral con pie trasero elevado para cuádriceps y glúteos'),
('Sentadilla Hack', 'Cuádriceps', 'Ejercicio compuesto en máquina hack con soporte de espalda'),

-- =====================
-- ISQUIOTIBIALES (2 nuevos)
-- =====================
-- Existentes: ninguno directo (Peso Muerto migró a Espalda Baja)
('Curl de Pierna', 'Isquiotibiales', 'Ejercicio de aislamiento en máquina para isquiotibiales'),
('Peso Muerto Rumano', 'Isquiotibiales', 'Ejercicio de bisagra de cadera enfocado en isquiotibiales y glúteos'),

-- =====================
-- GLÚTEOS (2 nuevos)
-- =====================
-- Existentes: Hip Thrust
('Patada de Glúteo', 'Glúteos', 'Ejercicio de aislamiento para glúteos en máquina o polea'),
('Abducción de Cadera', 'Glúteos', 'Ejercicio en máquina para glúteo medio y abductores'),

-- =====================
-- PANTORRILLAS (1 nuevo)
-- =====================
-- Existentes: ninguno
('Elevación de Pantorrillas', 'Pantorrillas', 'Ejercicio para gemelos y sóleo'),

-- =====================
-- ABDOMINALES (3 nuevos)
-- =====================
-- Existentes: Plancha
('Crunch', 'Abdominales', 'Ejercicio de flexión de tronco para recto abdominal'),
('Elevación de Piernas', 'Abdominales', 'Ejercicio para abdominales inferiores, colgado o acostado'),
('Rueda Abdominal', 'Abdominales', 'Ejercicio de anti-extensión para core completo'),

-- =====================
-- ANTEBRAZOS (1 nuevo)
-- =====================
-- Existentes: ninguno
('Curl de Muñeca', 'Antebrazos', 'Ejercicio de aislamiento para flexores y extensores del antebrazo')

ON CONFLICT (name, muscle_group) DO NOTHING;

-- =============================================================================
-- VERIFICACIÓN
-- =============================================================================
-- Ejecuta esta consulta para verificar los ejercicios resultantes:
--
-- SELECT muscle_group, COUNT(*) as total, STRING_AGG(name, ', ' ORDER BY name) as exercises
-- FROM exercises
-- GROUP BY muscle_group
-- ORDER BY muscle_group;
--
-- Total esperado: ~40 ejercicios (14 originales + 26 nuevos)
-- =============================================================================