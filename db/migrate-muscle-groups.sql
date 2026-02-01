-- =============================================================================
-- MIGRACIÓN: Granularidad de Grupos Musculares
-- =============================================================================
-- Esta migración actualiza los grupos musculares para tener mayor granularidad
-- y actualiza todos los ejercicios existentes para usar los nuevos grupos.
-- =============================================================================

-- Primero, actualizamos los ejercicios existentes del catálogo base
-- basándonos en el músculo PRINCIPAL que trabaja cada ejercicio

-- BRAZOS → Separar en Bíceps y Tríceps
UPDATE exercises SET muscle_group = 'Bíceps'
WHERE name ILIKE '%curl%'
   OR name ILIKE '%bicep%';

UPDATE exercises SET muscle_group = 'Tríceps'
WHERE name ILIKE '%tricep%'
   OR name ILIKE '%extensión de tríceps%'
   OR name ILIKE '%extension de triceps%'
   OR name ILIKE '%press francés%'
   OR name ILIKE '%patada de tríceps%';

-- PIERNAS → Separar en Cuádriceps, Isquiotibiales, Glúteos, Pantorrillas
UPDATE exercises SET muscle_group = 'Cuádriceps'
WHERE name ILIKE '%sentadilla%'
   OR name ILIKE '%squat%'
   OR name ILIKE '%zancada%'
   OR name ILIKE '%lunge%'
   OR name ILIKE '%prensa%'
   OR name ILIKE '%extensión de pierna%'
   OR name ILIKE '%leg extension%';

UPDATE exercises SET muscle_group = 'Isquiotibiales'
WHERE name ILIKE '%curl de pierna%'
   OR name ILIKE '%leg curl%'
   OR name ILIKE '%femoral%'
   OR name ILIKE '%peso muerto rumano%'
   OR name ILIKE '%romanian deadlift%'
   OR name ILIKE '%buenos días%'
   OR name ILIKE '%good morning%';

UPDATE exercises SET muscle_group = 'Glúteos'
WHERE name ILIKE '%hip thrust%'
   OR name ILIKE '%glute%'
   OR name ILIKE '%patada de glúteo%'
   OR name ILIKE '%puente de glúteo%';

UPDATE exercises SET muscle_group = 'Pantorrillas'
WHERE name ILIKE '%pantorrilla%'
   OR name ILIKE '%gemelo%'
   OR name ILIKE '%calf%'
   OR name ILIKE '%soleo%';

-- ESPALDA → Separar en Dorsales, Espalda Baja, Trapecios
UPDATE exercises SET muscle_group = 'Dorsales'
WHERE name ILIKE '%dominada%'
   OR name ILIKE '%pull up%'
   OR name ILIKE '%pullup%'
   OR name ILIKE '%jalón%'
   OR name ILIKE '%lat pulldown%'
   OR name ILIKE '%remo%'
   OR name ILIKE '%row%'
   OR name ILIKE '%pullover%';

UPDATE exercises SET muscle_group = 'Espalda Baja'
WHERE name ILIKE '%peso muerto%' AND NOT name ILIKE '%rumano%'
   OR name ILIKE '%deadlift%' AND NOT name ILIKE '%romanian%'
   OR name ILIKE '%hiperextensión%'
   OR name ILIKE '%hyperextension%'
   OR name ILIKE '%espalda baja%';

UPDATE exercises SET muscle_group = 'Trapecios'
WHERE name ILIKE '%encogimiento%'
   OR name ILIKE '%shrug%'
   OR name ILIKE '%trapecio%';

-- HOMBROS → Renombrar a Deltoides (más preciso)
UPDATE exercises SET muscle_group = 'Deltoides'
WHERE muscle_group = 'Hombros'
   OR name ILIKE '%press militar%'
   OR name ILIKE '%shoulder press%'
   OR name ILIKE '%elevación lateral%'
   OR name ILIKE '%lateral raise%'
   OR name ILIKE '%elevación frontal%'
   OR name ILIKE '%front raise%'
   OR name ILIKE '%face pull%'
   OR name ILIKE '%pájaro%'
   OR name ILIKE '%rear delt%';

-- CORE → Renombrar a Abdominales
UPDATE exercises SET muscle_group = 'Abdominales'
WHERE muscle_group = 'Core'
   OR name ILIKE '%plancha%'
   OR name ILIKE '%plank%'
   OR name ILIKE '%crunch%'
   OR name ILIKE '%abdominal%'
   OR name ILIKE '%sit up%'
   OR name ILIKE '%leg raise%' AND name ILIKE '%abdom%';

-- Cualquier ejercicio que quedó como "Brazos" genérico, asignar según contexto
-- Si no matcheó arriba, probablemente es bíceps (curl es más común)
UPDATE exercises SET muscle_group = 'Bíceps'
WHERE muscle_group = 'Brazos';

-- Cualquier ejercicio que quedó como "Piernas" genérico → Cuádriceps
UPDATE exercises SET muscle_group = 'Cuádriceps'
WHERE muscle_group = 'Piernas';

-- Cualquier ejercicio que quedó como "Espalda" genérico → Dorsales
UPDATE exercises SET muscle_group = 'Dorsales'
WHERE muscle_group = 'Espalda';

-- =============================================================================
-- VERIFICACIÓN: Lista de grupos musculares finales
-- =============================================================================
-- Ejecuta esta consulta para verificar los grupos musculares resultantes:
--
-- SELECT DISTINCT muscle_group, COUNT(*) as exercises_count
-- FROM exercises
-- GROUP BY muscle_group
-- ORDER BY muscle_group;
--
-- Grupos esperados:
-- - Pecho
-- - Dorsales
-- - Espalda Baja
-- - Trapecios
-- - Deltoides
-- - Bíceps
-- - Tríceps
-- - Antebrazos (si hay ejercicios)
-- - Cuádriceps
-- - Isquiotibiales
-- - Glúteos
-- - Pantorrillas
-- - Abdominales
-- =============================================================================
