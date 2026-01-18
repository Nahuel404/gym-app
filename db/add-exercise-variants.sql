-- Agregar campo de variante a exercise_history
ALTER TABLE exercise_history
ADD COLUMN variant_equipment TEXT,
ADD COLUMN variant_grip TEXT,
ADD COLUMN variant_position TEXT;

-- Comentarios para documentación
COMMENT ON COLUMN exercise_history.variant_equipment IS 'Equipo usado: Barra, Mancuernas, Máquina, Polea, Peso Corporal, Kettlebell, Banda Elástica';
COMMENT ON COLUMN exercise_history.variant_grip IS 'Tipo de agarre: Prono, Supino, Neutro, Ancho, Cerrado, Mixto';
COMMENT ON COLUMN exercise_history.variant_position IS 'Posición: Sentado, De Pie, Inclinado, Declinado, Acostado';

-- Ejemplos de variantes comunes:
-- Press Banca:
--   equipment: Barra | Mancuernas | Máquina
--   grip: Ancho | Cerrado | Neutro
--   position: Plano | Inclinado | Declinado
--
-- Remo:
--   equipment: Barra | Mancuernas | Polea | Máquina
--   grip: Prono | Supino | Neutro
--   position: Sentado | De Pie | Inclinado
--
-- Curl Bíceps:
--   equipment: Barra | Mancuernas | Polea
--   grip: Supino | Neutro | Prono (reverse)
--   position: De Pie | Sentado | Banco Scott
