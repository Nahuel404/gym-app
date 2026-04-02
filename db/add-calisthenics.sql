-- =============================================================================
-- MIGRACIÓN: Ejercicios de Calistenia
-- =============================================================================
-- Agrega ejercicios de peso corporal que representan movimientos distintos.
-- Se usa ON CONFLICT para evitar duplicados.
-- =============================================================================

INSERT INTO exercises (name, muscle_group, description) VALUES

-- =====================
-- PECHO (3 nuevos)
-- =====================
('Flexiones', 'Pecho', 'Ejercicio básico de empuje horizontal a peso corporal'),
('Flexión Diamante', 'Pecho', 'Flexión con manos juntas, mayor énfasis en tríceps y pecho interno'),
('Flexión Declinada', 'Pecho', 'Flexión con pies elevados para pecho superior'),

-- =====================
-- DORSALES (3 nuevos)
-- =====================
('Australian', 'Dorsales', 'Remo invertido en barra baja a peso corporal'),
('Dominada Supina', 'Dorsales', 'Dominada con agarre supino, mayor activación de bíceps'),
('Muscle-up', 'Dorsales', 'Movimiento avanzado: dominada explosiva con transición a fondo'),

-- =====================
-- DELTOIDES (2 nuevos)
-- =====================
('Pike Push-up', 'Deltoides', 'Flexión en V invertida para deltoides'),
('Handstand Push-up', 'Deltoides', 'Flexión en vertical, press militar a peso corporal'),

-- =====================
-- TRÍCEPS (1 nuevo)
-- =====================
('Fondos en Banco', 'Tríceps', 'Fondos con apoyo trasero en banco para tríceps'),

-- =====================
-- BÍCEPS (1 nuevo)
-- =====================
('Curl en Barra Fija', 'Bíceps', 'Curl a peso corporal colgado de barra fija'),

-- =====================
-- CUÁDRICEPS (3 nuevos)
-- =====================
('Pistol Squat', 'Cuádriceps', 'Sentadilla a una pierna, requiere fuerza y equilibrio'),
('Wall Sit', 'Cuádriceps', 'Sentadilla isométrica contra la pared'),
('Step-up', 'Cuádriceps', 'Subida a cajón o banco, unilateral'),

-- =====================
-- ISQUIOTIBIALES (1 nuevo)
-- =====================
('Nordic Curl', 'Isquiotibiales', 'Curl nórdico, excéntrico intenso para isquiotibiales'),

-- =====================
-- GLÚTEOS (1 nuevo)
-- =====================
('Puente de Glúteos', 'Glúteos', 'Hip thrust a peso corporal en suelo'),

-- =====================
-- PANTORRILLAS (1 nuevo)
-- =====================
('Pantorrilla a 1 Pierna', 'Pantorrillas', 'Elevación de pantorrilla unilateral a peso corporal'),

-- =====================
-- ABDOMINALES (7 nuevos)
-- =====================
('Mountain Climbers', 'Abdominales', 'Ejercicio dinámico de core con movimiento de rodillas al pecho'),
('Dragon Flag', 'Abdominales', 'Ejercicio avanzado de core en banco, popularizado por Bruce Lee'),
('L-Sit', 'Abdominales', 'Isométrico de core con piernas extendidas en paralelas o suelo'),
('Hollow Hold', 'Abdominales', 'Isométrico de core en posición cóncava'),
('Elevación de Rodillas', 'Abdominales', 'Elevación de rodillas colgado en barra fija'),
('Windshield Wipers', 'Abdominales', 'Rotación de piernas colgado, oblicuos y core'),
('Burpees', 'Abdominales', 'Ejercicio full-body explosivo con flexión y salto'),
('Bear Crawl', 'Abdominales', 'Desplazamiento en cuadrupedia para core y estabilidad')

ON CONFLICT (name, muscle_group) DO NOTHING;

-- =============================================================================
-- VERIFICACIÓN
-- =============================================================================
-- SELECT muscle_group, COUNT(*) as total, STRING_AGG(name, ', ' ORDER BY name)
-- FROM exercises
-- GROUP BY muscle_group
-- ORDER BY muscle_group;
--
-- Total esperado: ~65 ejercicios (40 existentes + 25 calistenia)
-- =============================================================================
