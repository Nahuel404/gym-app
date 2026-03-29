# Plan: Sistema de Entrenadores

## Resumen

Agregar un sistema completo de entrenadores (coaches) a la app. Los usuarios pueden marcarse como entrenadores, otros usuarios pueden buscarlos y enviar solicitudes para ser sus alumnos, y los entrenadores pueden ver los datos de entrenamiento de sus alumnos.

---

## 1. Base de Datos

### 1.1 Modificar tabla `users`

```sql
ALTER TABLE users
ADD COLUMN is_trainer BOOLEAN NOT NULL DEFAULT false;
```

Un booleano simple. No cambia el `role` (admin/user), es ortogonal: un admin puede ser entrenador, un user también.

### 1.2 Nueva tabla `trainer_requests`

Solicitudes pendientes de alumno a entrenador.

```sql
CREATE TABLE trainer_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  trainer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status VARCHAR(20) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'accepted', 'rejected')),
  message TEXT,              -- mensaje opcional del alumno al solicitar
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(student_id, trainer_id)  -- un alumno no puede enviar 2 solicitudes al mismo entrenador
);

CREATE INDEX idx_trainer_requests_trainer ON trainer_requests(trainer_id);
CREATE INDEX idx_trainer_requests_student ON trainer_requests(student_id);
CREATE INDEX idx_trainer_requests_status ON trainer_requests(status);
```

### 1.3 Nueva tabla `trainer_students`

Relaciones activas entrenador-alumno (se crea cuando el entrenador acepta).

```sql
CREATE TABLE trainer_students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(trainer_id, student_id)
);

CREATE INDEX idx_trainer_students_trainer ON trainer_students(trainer_id);
CREATE INDEX idx_trainer_students_student ON trainer_students(student_id);
```

**Flujo:**
1. Alumno envía solicitud -> se crea fila en `trainer_requests` con status `pending`
2. Entrenador acepta -> status cambia a `accepted` + se crea fila en `trainer_students`
3. Entrenador rechaza -> status cambia a `rejected`
4. Cualquiera de los dos puede terminar la relación -> se borra de `trainer_students`

---

## 2. API Endpoints

### 2.1 Entrenadores (búsqueda pública para usuarios logueados)

| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET` | `/api/trainers?q=nombre` | Buscar entrenadores por nombre/username. Devuelve lista de entrenadores con `id`, `name`, `username`, `avatar_url`. Excluye al usuario actual. |

### 2.2 Solicitudes

| Método | Ruta | Descripción |
|--------|------|-------------|
| `POST` | `/api/trainer-requests` | Enviar solicitud. Body: `{ trainer_id, message? }` |
| `GET` | `/api/trainer-requests` | Obtener solicitudes. Query: `role=trainer` (solicitudes recibidas) o `role=student` (solicitudes enviadas) |
| `PUT` | `/api/trainer-requests?id=xxx` | Aceptar/rechazar. Body: `{ status: 'accepted' \| 'rejected' }`. Solo el entrenador puede cambiar el status. Al aceptar, se inserta automáticamente en `trainer_students`. |
| `DELETE` | `/api/trainer-requests?id=xxx` | Cancelar solicitud pendiente (solo el alumno puede cancelar las suyas). |

### 2.3 Relación entrenador-alumno

| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET` | `/api/trainer-students` | Si soy entrenador: lista de mis alumnos. Si soy usuario: lista de mis entrenadores. |
| `DELETE` | `/api/trainer-students?id=xxx` | Terminar relación (ambas partes pueden). |
| `GET` | `/api/trainer-students/[studentId]/workouts` | Entrenador consulta los workouts de un alumno específico. Devuelve los mismos datos que `/api/workouts` pero del alumno. Solo accesible si existe la relación en `trainer_students`. |

### 2.4 Perfil de entrenador

| Método | Ruta | Descripción |
|--------|------|-------------|
| `PUT` | `/api/user/trainer-status` | Activar/desactivar modo entrenador. Body: `{ is_trainer: boolean }` |

---

## 3. Páginas y Navegación

### 3.1 Cambios en el Header

El header actual tiene: **Favoritos** | **Historial** | (Admin: **Usuarios**) | **User Menu**

**Nuevo header:**

```
[Logo]   Favoritos   Historial   Entrenadores   [User Menu ▾]
                                                  ├─ Configuración
                                                  ├─ Mis Alumnos (si is_trainer)
                                                  └─ Cerrar sesión
```

- Se agrega **"Entrenadores"** como link principal en el header, visible para todos.
- Se agrega **"Mis Alumnos"** en el dropdown del usuario, solo visible si `is_trainer === true`.

### 3.2 Página: Entrenadores (`/trainers`)

**Propósito:** Buscar entrenadores y gestionar relaciones.

**Layout:**

```
┌──────────────────────────────────────────────────────────┐
│  ENTRENADORES                                            │
│                                                          │
│  ┌────────────────────────────────────────────────────┐  │
│  │  🔍 Buscar entrenador...                           │  │
│  └────────────────────────────────────────────────────┘  │
│                                                          │
│  ── MIS ENTRENADORES ──────────────────────────────────  │
│                                                          │
│  ┌─────────────────────┐  ┌─────────────────────┐       │
│  │  Juan Pérez          │  │  María García        │       │
│  │  @juancoach          │  │  @mariafit           │       │
│  │  Desde: 15 Ene 2026  │  │  Desde: 03 Mar 2026  │       │
│  │  [Dejar entrenador]  │  │  [Dejar entrenador]  │       │
│  └─────────────────────┘  └─────────────────────┘       │
│                                                          │
│  ── SOLICITUDES PENDIENTES ────────────────────────────  │
│                                                          │
│  ┌──────────────────────────────────────────────────┐   │
│  │  → Carlos Coach (@carlos) · Enviada hace 2 días  │   │
│  │    "Hola, me gustaría entrenar contigo"           │   │
│  │    [Cancelar solicitud]                           │   │
│  └──────────────────────────────────────────────────┘   │
│                                                          │
│  ── RESULTADOS DE BÚSQUEDA ────────────────────────────  │
│  (aparece solo al escribir en el buscador)               │
│                                                          │
│  ┌──────────────────────────────────────────────────┐   │
│  │  Pedro Trainer  · @pedrofit                       │   │
│  │  [Enviar solicitud]                               │   │
│  ├──────────────────────────────────────────────────┤   │
│  │  Ana Coach  · @anacoach                           │   │
│  │  [Ya eres alumno ✓]                               │   │
│  ├──────────────────────────────────────────────────┤   │
│  │  Luis PT  · @luispt                               │   │
│  │  [Solicitud pendiente...]                         │   │
│  └──────────────────────────────────────────────────┘   │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

**Comportamiento:**

1. Al entrar, se muestra inmediatamente la sección "Mis entrenadores" (los actuales) y "Solicitudes pendientes".
2. El buscador es tipo **search-as-you-type** con debounce de 300ms. Solo busca con 2+ caracteres.
3. Los resultados muestran el estado de la relación con cada entrenador:
   - Sin relación -> botón "Enviar solicitud"
   - Solicitud pendiente -> texto "Solicitud pendiente..." (gris, no clickeable)
   - Ya es alumno -> texto "Ya eres alumno" (verde)
4. Al hacer click en "Enviar solicitud" aparece un modal mínimo con un textarea opcional para mensaje y botón de confirmar.
5. "Cancelar solicitud" elimina la request pendiente.
6. "Dejar entrenador" pide confirmación y elimina la relación.

**UX clave:**
- Todo en una sola página, sin navegación extra.
- Búsqueda instantánea, no hay que ir a otra pantalla.
- Estados claros en cada resultado de búsqueda para que el usuario sepa qué acción tomar.

### 3.3 Página: Mis Alumnos (`/my-students`)

**Propósito:** El entrenador ve y gestiona sus alumnos y puede consultar sus entrenamientos.

**Solo accesible si `is_trainer === true`.** Si no es entrenador, redirige al dashboard.

**Layout:**

```
┌──────────────────────────────────────────────────────────┐
│  MIS ALUMNOS                                             │
│                                                          │
│  ── SOLICITUDES RECIBIDAS (2) ─────────────────────────  │
│                                                          │
│  ┌──────────────────────────────────────────────────┐   │
│  │  Pablo Ruiz · @pabloruiz                          │   │
│  │  "Quiero mejorar mi fuerza en press banca"        │   │
│  │  Hace 3 horas                                     │   │
│  │  [✓ Aceptar]  [✗ Rechazar]                        │   │
│  ├──────────────────────────────────────────────────┤   │
│  │  Laura Sánchez · @lauras                          │   │
│  │  Hace 1 día                                       │   │
│  │  [✓ Aceptar]  [✗ Rechazar]                        │   │
│  └──────────────────────────────────────────────────┘   │
│                                                          │
│  ── ALUMNOS ACTIVOS (3) ──────────────────────────────  │
│                                                          │
│  ┌─────────────────────────────────────────────────────┐│
│  │ 🔍 Filtrar alumno...                                ││
│  └─────────────────────────────────────────────────────┘│
│                                                          │
│  ┌─────────────────────────────────────────────────────┐│
│  │  ▸ Marcos López · @marcos                           ││
│  │    Desde: 10 Ene 2026 · Último entreno: Hace 1 día ││
│  │    12 entrenamientos · 14,500 kg volumen total      ││
│  ├─────────────────────────────────────────────────────┤│
│  │  ▸ Sofía Torres · @sofia                            ││
│  │    Desde: 20 Feb 2026 · Último entreno: Hace 3 días││
│  │    8 entrenamientos · 9,200 kg volumen total        ││
│  ├─────────────────────────────────────────────────────┤│
│  │  ▸ Diego Martín · @diego                            ││
│  │    Desde: 01 Mar 2026 · Último entreno: Hoy        ││
│  │    4 entrenamientos · 3,800 kg volumen total        ││
│  └─────────────────────────────────────────────────────┘│
│                                                          │
└──────────────────────────────────────────────────────────┘
```

**Al hacer click en un alumno (expandir `▸`):**

```
┌─────────────────────────────────────────────────────────┐
│  ▾ Marcos López · @marcos                  [Remover ✗]  │
│    Desde: 10 Ene 2026 · Último entreno: Hace 1 día     │
│    12 entrenamientos · 14,500 kg volumen total          │
│                                                         │
│  ┌───────────────────────────────────────────────────┐  │
│  │  Últimos entrenamientos                           │  │
│  │                                                   │  │
│  │  28 Mar 2026 - Viernes                            │  │
│  │    Press de Banca (Barra, Plano)                  │  │
│  │      80kg × 10  ·  85kg × 8  ·  85kg × 7         │  │
│  │    Sentadilla (Barra, De Pie)                     │  │
│  │      100kg × 8  ·  105kg × 6  ·  105kg × 5       │  │
│  │    Volumen: 3,245 kg                              │  │
│  │                                                   │  │
│  │  26 Mar 2026 - Miércoles                          │  │
│  │    Peso Muerto (Barra, De Pie)                    │  │
│  │      120kg × 5  ·  130kg × 3  ·  130kg × 3       │  │
│  │    Remo con Barra (Barra, Prono)                  │  │
│  │      70kg × 10  ·  75kg × 8                       │  │
│  │    Volumen: 2,890 kg                              │  │
│  │                                                   │  │
│  │  [Ver historial completo →]                       │  │
│  └───────────────────────────────────────────────────┘  │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

**Comportamiento:**

1. Las solicitudes pendientes aparecen siempre arriba, con un badge de conteo.
2. Aceptar una solicitud mueve al alumno directamente a la lista de "Alumnos activos" (sin recargar).
3. Rechazar elimina la solicitud con confirmación.
4. El filtro de alumnos funciona instantáneamente por nombre o username.
5. Cada alumno es un acordeón expandible. Al expandir, carga los últimos 5 entrenamientos.
6. La carga de entrenamientos del alumno es **lazy**: solo se pide al server cuando se expande el acordeón.
7. "Ver historial completo" lleva a una subpágina `/my-students/[id]` con el historial completo estilo la página `/history` pero del alumno.
8. "Remover" desvincula al alumno con confirmación.

**UX clave:**
- Solicitudes siempre visibles arriba para que el entrenador no se pierda nada.
- Resumen de stats por alumno (entrenamientos, volumen, último entreno) sin necesidad de expandir.
- Expandir muestra los últimos entrenamientos inline, sin cambiar de página.
- Solo si necesita más detalle hace click en "Ver historial completo".

### 3.4 Página: Historial de Alumno (`/my-students/[id]`)

**Solo accesible si** el usuario actual es entrenador Y tiene al alumno en `trainer_students`.

Muestra el mismo contenido que la página `/history` pero con los datos del alumno. Incluye un header con el nombre del alumno y un botón de volver a "Mis Alumnos".

```
┌──────────────────────────────────────────────────────────┐
│  ← Mis Alumnos                                          │
│                                                          │
│  HISTORIAL DE MARCOS LÓPEZ                               │
│  @marcos · 12 entrenamientos                             │
│                                                          │
│  (mismo layout que /history con los datos del alumno)    │
└──────────────────────────────────────────────────────────┘
```

### 3.5 Configuración (`/settings`)

Agregar un toggle en la página de configuración existente:

```
┌──────────────────────────────────────────────────────────┐
│  CONFIGURACIÓN                                           │
│                                                          │
│  ── PERFIL ────────────────────────────────────────────  │
│  Nombre: Nahuel Admin                                    │
│  Usuario: @Nahueladm                                     │
│  Rol: Administrador                                      │
│                                                          │
│  ── ENTRENADOR ────────────────────────────────────────  │
│  ┌──────────────────────────────────────────────────┐   │
│  │  Modo entrenador                    [  ●───  ON ] │   │
│  │  Otros usuarios podrán buscarte como entrenador   │   │
│  │  y enviarte solicitudes.                          │   │
│  └──────────────────────────────────────────────────┘   │
│                                                          │
│  ── CLAVE API MCP ─────────────────────────────────────  │
│  ...                                                     │
└──────────────────────────────────────────────────────────┘
```

---

## 4. Notificaciones (Badge en header)

Cuando el entrenador tiene solicitudes pendientes, mostrar un badge numérico en el dropdown del usuario o junto a "Mis Alumnos":

```
[User Menu ▾]
  ├─ Configuración
  ├─ Mis Alumnos (2)    ← badge con solicitudes pendientes
  └─ Cerrar sesión
```

Esto se carga en el server-side al renderizar el layout. No requiere WebSockets, simplemente se consulta en cada page load.

---

## 5. Flujos de Usuario

### 5.1 Activar modo entrenador
1. Ir a **Configuración**
2. Activar toggle "Modo entrenador"
3. Ahora aparece "Mis Alumnos" en el dropdown y otros pueden encontrarte en la búsqueda.

### 5.2 Buscar y solicitar entrenador
1. Click en **Entrenadores** en el header
2. Escribir nombre en el buscador
3. Click en "Enviar solicitud" junto al entrenador deseado
4. (Opcional) escribir un mensaje corto
5. Confirmar -> solicitud enviada

### 5.3 Aceptar alumno (como entrenador)
1. Entrar a **Mis Alumnos** (o ver badge de notificación)
2. Ver solicitudes pendientes arriba
3. Click en "Aceptar" -> alumno aparece en la lista de activos

### 5.4 Ver entrenamientos de alumno
1. En **Mis Alumnos**, click en el nombre del alumno para expandir
2. Ver últimos 5 entrenamientos inline
3. Si necesita más: click "Ver historial completo" -> página dedicada

### 5.5 Dejar entrenador (como alumno)
1. Ir a **Entrenadores**
2. En "Mis entrenadores", click "Dejar entrenador"
3. Confirmar -> relación terminada

---

## 6. Seguridad

- Un entrenador **solo** puede ver workouts de sus alumnos activos (verificar `trainer_students`).
- Un alumno **no** puede ver datos de otros alumnos del mismo entrenador.
- Solo el propio usuario puede activar/desactivar su modo entrenador.
- Solo el entrenador puede aceptar/rechazar solicitudes dirigidas a él.
- Solo el alumno puede cancelar sus solicitudes pendientes.
- Eliminar la relación (de cualquier lado) no borra los datos de entrenamiento.

---

## 7. Orden de Implementación

### Fase 1: Base de datos y API
1. Migración SQL: campo `is_trainer` + tablas `trainer_requests` y `trainer_students`
2. API endpoint `PUT /api/user/trainer-status`
3. API endpoint `GET /api/trainers?q=`
4. API endpoints CRUD de `trainer-requests`
5. API endpoints de `trainer-students` + consulta de workouts de alumno

### Fase 2: UI del alumno
6. Toggle de entrenador en `/settings`
7. Página `/trainers` con buscador, mis entrenadores, solicitudes pendientes
8. Link "Entrenadores" en el header

### Fase 3: UI del entrenador
9. Página `/my-students` con solicitudes + lista de alumnos expandibles
10. Página `/my-students/[id]` con historial completo del alumno
11. Link "Mis Alumnos" en dropdown del usuario (condicional a `is_trainer`)
12. Badge de solicitudes pendientes en el header

### Fase 4: Pulido
13. Estados vacíos (sin entrenadores, sin alumnos, sin solicitudes)
14. Confirmaciones de acciones destructivas (dejar entrenador, remover alumno)
15. Animaciones de acordeón y transiciones
16. Mobile responsive

---

## 8. Archivos a Crear/Modificar

### Nuevos archivos
| Archivo | Descripción |
|---------|-------------|
| `db/add-trainer-system.sql` | Migración SQL |
| `app/src/pages/trainers.astro` | Página de búsqueda de entrenadores |
| `app/src/pages/my-students.astro` | Panel del entrenador |
| `app/src/pages/my-students/[id].astro` | Historial de un alumno |
| `app/src/pages/api/trainers.ts` | API búsqueda de entrenadores |
| `app/src/pages/api/trainer-requests.ts` | API solicitudes |
| `app/src/pages/api/trainer-students.ts` | API relaciones |
| `app/src/pages/api/user/trainer-status.ts` | API toggle entrenador |

### Archivos a modificar
| Archivo | Cambio |
|---------|--------|
| `app/src/pages/settings.astro` | Agregar toggle "Modo entrenador" |
| `app/src/pages/index.astro` | Agregar link "Entrenadores" en header + "Mis Alumnos" en dropdown |
| `app/src/pages/history.astro` | Agregar link "Entrenadores" en header (misma nav) |
| `app/src/pages/favorites.astro` | Agregar link "Entrenadores" en header |
| `app/src/pages/workout/new.astro` | Agregar link "Entrenadores" en header |
| `app/src/pages/admin/users.astro` | Agregar link "Entrenadores" en header |
| `app/src/lib/auth.ts` | Agregar `is_trainer` al tipo User y al payload JWT |
| `app/src/middleware.ts` | Pasar `is_trainer` al context |
| `mcp/src/index.ts` | Agregar `is_trainer` a AuthenticatedUser, nuevas tools de entrenador |

---

## 9. MCP Server — Tools para Entrenadores

El MCP server actual (`mcp/src/index.ts`) expone 5 tools que operan siempre sobre los datos del usuario autenticado (vía API key). Para entrenadores, se agregan tools que permiten consultar datos de sus alumnos desde Claude.

### 9.1 Cambios en autenticación MCP

Agregar `is_trainer` al query de validación de API key:

```typescript
interface AuthenticatedUser {
  id: string;
  username: string;
  name: string;
  is_trainer: boolean;  // NUEVO
}

// En validateApiKey:
const { data: user } = await supabase
  .from("users")
  .select("id, username, name, is_trainer")  // agregar is_trainer
  .eq("mcp_api_key", apiKey)
  .single();
```

### 9.2 Helper de verificación de relación

Antes de devolver datos de un alumno, verificar que la relación existe:

```typescript
async function isMyStudent(trainerId: string, studentId: string): Promise<boolean> {
  const { data } = await supabase
    .from("trainer_students")
    .select("id")
    .eq("trainer_id", trainerId)
    .eq("student_id", studentId)
    .single();
  return !!data;
}
```

### 9.3 Nuevas Tools (solo registradas si `is_trainer === true`)

Se agregan dentro de `registerTools()` condicionalmente. Si el usuario no es entrenador, estas tools no aparecen en el catálogo MCP.

```typescript
function registerTools(server: McpServer, userId: string, isTrainer: boolean) {
  // ... tools existentes (sin cambios) ...

  if (isTrainer) {
    registerTrainerTools(server, userId);
  }
}
```

#### Tool 6: `list_students`

```
Nombre: list_students
Descripción: Lista todos los alumnos activos del entrenador con estadísticas resumidas.
Parámetros: (ninguno)
```

**Retorna** para cada alumno:
- `id`, `name`, `username`
- `started_at` (fecha de inicio de la relación)
- `total_workouts` (cantidad de entrenamientos totales)
- `last_workout_date` (fecha del último entrenamiento)
- `total_volume_kg` (volumen total acumulado)

**Uso típico en Claude:** "¿Cómo van mis alumnos?" → Claude llama `list_students` para obtener un resumen general.

#### Tool 7: `get_student_workouts`

```
Nombre: get_student_workouts
Descripción: Obtiene los entrenamientos recientes de un alumno específico.
Parámetros:
  - student_id (string, requerido): ID del alumno
  - days (number, default 30): Días hacia atrás
```

**Validación:** Verifica que `student_id` esté en `trainer_students` del entrenador. Si no, retorna error "No es tu alumno".

**Retorna** el mismo formato que `get_recent_workouts` pero con los datos del alumno. Incluye `student_name` en la respuesta para contexto.

**Uso típico:** "¿Qué entrenó Marcos esta semana?" → Claude llama `get_student_workouts` con el ID de Marcos.

#### Tool 8: `get_student_exercise_progress`

```
Nombre: get_student_exercise_progress
Descripción: Progresión histórica de un ejercicio específico de un alumno.
Parámetros:
  - student_id (string, requerido): ID del alumno
  - exercise_name (string, requerido): Nombre del ejercicio
  - days (number, default 90): Días hacia atrás
```

**Validación:** Misma verificación de relación entrenador-alumno.

**Retorna** el mismo formato que `get_exercise_progress` pero con datos del alumno. Incluye `student_name`.

**Uso típico:** "¿Cómo viene Sofía en press de banca?" → Claude llama `get_student_exercise_progress`.

#### Tool 9: `get_student_summary`

```
Nombre: get_student_summary
Descripción: Resumen de entrenamiento de un alumno: frecuencia, volumen por grupo muscular, balance.
Parámetros:
  - student_id (string, requerido): ID del alumno
  - days (number, default 30): Días hacia atrás
```

**Validación:** Misma verificación.

**Retorna** el mismo formato que `get_training_summary` pero del alumno. Incluye `student_name`.

**Uso típico:** "Haceme un análisis del entrenamiento de Diego del último mes" → Claude llama `get_student_summary`.

#### Tool 10: `compare_students`

```
Nombre: compare_students
Descripción: Compara estadísticas de entrenamiento entre dos o más alumnos.
Parámetros:
  - student_ids (array de strings, requerido, min 2): IDs de alumnos a comparar
  - days (number, default 30): Período de comparación
```

**Validación:** Verifica que TODOS los IDs sean alumnos activos.

**Retorna** por cada alumno:
- `name`, `username`
- `total_workouts`
- `avg_workouts_per_week`
- `total_volume_kg`
- `muscle_groups` (desglose por grupo muscular con volumen y sets)
- `consistency_score` (porcentaje de semanas con al menos un entrenamiento)

**Uso típico:** "Compará a Marcos y Sofía, ¿quién está entrenando más consistentemente?" → Claude llama `compare_students`.

### 9.4 Resumen de tools MCP

| # | Tool | Acceso | Descripción |
|---|------|--------|-------------|
| 1 | `get_recent_workouts` | Todos | Entrenamientos propios recientes |
| 2 | `get_exercise_progress` | Todos | Progresión propia de un ejercicio |
| 3 | `get_training_summary` | Todos | Resumen propio de entrenamiento |
| 4 | `get_personal_records` | Todos | Récords personales propios |
| 5 | `get_exercise_catalog` | Todos | Catálogo de ejercicios |
| 6 | `list_students` | Entrenadores | Lista de alumnos con stats |
| 7 | `get_student_workouts` | Entrenadores | Entrenamientos de un alumno |
| 8 | `get_student_exercise_progress` | Entrenadores | Progresión de ejercicio de un alumno |
| 9 | `get_student_summary` | Entrenadores | Resumen de entrenamiento de un alumno |
| 10 | `compare_students` | Entrenadores | Comparar estadísticas entre alumnos |

### 9.5 Patrón de implementación

Las tools 7, 8 y 9 son esencialmente las mismas que las tools 1, 2 y 3 pero con un `student_id` parametrizado en vez de usar el `userId` del entrenador. Para evitar duplicación de lógica:

```typescript
// Extraer las queries existentes a funciones reutilizables
async function queryRecentWorkouts(userId: string, days: number) { /* ... */ }
async function queryExerciseProgress(userId: string, exerciseName: string, days: number) { /* ... */ }
async function queryTrainingSummary(userId: string, days: number) { /* ... */ }

// Tools originales usan userId directamente
// Tools de entrenador validan relación y luego llaman con studentId
```

### 9.6 Orden de implementación MCP

Se implementa como parte de la **Fase 1** (backend), después de crear las tablas `trainer_students`:

1. Modificar `AuthenticatedUser` y `validateApiKey` para incluir `is_trainer`
2. Crear helper `isMyStudent()`
3. Refactorizar queries existentes en funciones reutilizables
4. Agregar `registerTrainerTools()` con las 5 tools nuevas
5. Pasar `isTrainer` a `registerTools()` y `createGymServer()`
