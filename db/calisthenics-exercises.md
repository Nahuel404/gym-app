# Ejercicios de Calistenia

Ejercicios de peso corporal agregados al catálogo. Archivo SQL: `add-calisthenics.sql`

## Resumen

| Grupo Muscular | Ejercicios nuevos | Total |
|---|---|---|
| Pecho | 3 | 3 |
| Dorsales | 3 | 3 |
| Deltoides | 2 | 2 |
| Tríceps | 1 | 1 |
| Bíceps | 1 | 1 |
| Cuádriceps | 3 | 3 |
| Isquiotibiales | 1 | 1 |
| Glúteos | 1 | 1 |
| Pantorrillas | 1 | 1 |
| Abdominales | 8 | 8 |
| **Total** | **25** | |

## Lista completa

### Pecho

| Ejercicio | Nivel | Descripción |
|---|---|---|
| Flexiones | Principiante | Empuje horizontal básico a peso corporal |
| Flexión Diamante | Intermedio | Manos juntas, énfasis tríceps y pecho interno |
| Flexión Declinada | Intermedio | Pies elevados, pecho superior |

### Dorsales

| Ejercicio | Nivel | Descripción |
|---|---|---|
| Australian | Principiante | Remo invertido en barra baja |
| Dominada Supina | Intermedio | Agarre supino, mayor activación de bíceps |
| Muscle-up | Avanzado | Dominada explosiva con transición a fondo |

### Deltoides

| Ejercicio | Nivel | Descripción |
|---|---|---|
| Pike Push-up | Intermedio | Flexión en V invertida |
| Handstand Push-up | Avanzado | Press militar en vertical |

### Tríceps

| Ejercicio | Nivel | Descripción |
|---|---|---|
| Fondos en Banco | Principiante | Fondos con apoyo trasero en banco |

### Bíceps

| Ejercicio | Nivel | Descripción |
|---|---|---|
| Curl en Barra Fija | Avanzado | Curl colgado de barra fija |

### Cuádriceps

| Ejercicio | Nivel | Descripción |
|---|---|---|
| Pistol Squat | Avanzado | Sentadilla a una pierna |
| Wall Sit | Principiante | Sentadilla isométrica contra pared |
| Step-up | Principiante | Subida a cajón, unilateral |

### Isquiotibiales

| Ejercicio | Nivel | Descripción |
|---|---|---|
| Nordic Curl | Avanzado | Curl nórdico, excéntrico intenso |

### Glúteos

| Ejercicio | Nivel | Descripción |
|---|---|---|
| Puente de Glúteos | Principiante | Hip thrust en suelo sin peso |

### Pantorrillas

| Ejercicio | Nivel | Descripción |
|---|---|---|
| Pantorrilla a 1 Pierna | Principiante | Elevación unilateral |

### Abdominales

| Ejercicio | Nivel | Descripción |
|---|---|---|
| Mountain Climbers | Principiante | Core dinámico, rodillas al pecho |
| Dragon Flag | Avanzado | Core en banco, estilo Bruce Lee |
| L-Sit | Avanzado | Isométrico con piernas extendidas |
| Hollow Hold | Intermedio | Isométrico en posición cóncava |
| Elevación de Rodillas | Intermedio | Colgado en barra fija |
| Windshield Wipers | Avanzado | Rotación de piernas colgado |
| Burpees | Intermedio | Full-body explosivo con flexión y salto |
| Bear Crawl | Intermedio | Desplazamiento en cuadrupedia |

## Notas

- Todos usan `ON CONFLICT DO NOTHING` para evitar duplicados
- Los ejercicios se combinan con el sistema de variantes existente (equipo, agarre, posición)
- Variante de equipo recomendada para calistenia: **Peso Corporal** o **Banda**
