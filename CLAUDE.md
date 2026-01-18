# GYM APP - Design System

## Estilo Visual
Estilo **tech/espacial/consola** inspirado en Nothing Phone. Minimalista, futurista, con elementos de interfaz tipo terminal y acentos de color estratégicos.

---

## Paleta de Colores

### Base (Fondos y Superficies)
```
--bg-primary: #0a0a0a        /* Fondo principal - negro profundo */
--bg-secondary: #121212      /* Fondo secundario - negro suave */
--bg-tertiary: #1a1a1a       /* Superficies elevadas */
--bg-card: #0f0f0f           /* Cards y contenedores */
--border: #2a2a2a            /* Bordes sutiles */
--border-light: #333333      /* Bordes hover/activos */
```

### Texto
```
--text-primary: #ffffff      /* Texto principal - blanco puro */
--text-secondary: #a0a0a0    /* Texto secundario - gris claro */
--text-muted: #606060        /* Texto deshabilitado - gris oscuro */
--text-dark: #1a1a1a         /* Texto sobre fondos claros */
```

### Acentos (Uso estratégico y moderado)
```
--accent-red: #ff3b30        /* Errores, eliminar, alertas críticas */
--accent-orange: #ff9500     /* Warnings, destacados, progreso */
--accent-green: #30d158      /* Éxito, confirmaciones, activo */
--accent-red-soft: #ff3b3020 /* Fondos con acento rojo */
--accent-orange-soft: #ff950020
--accent-green-soft: #30d15820
```

---

## Tipografía

### Fuente Principal (Legible)
```css
font-family: 'Space Grotesk', 'SF Mono', 'Roboto Mono', monospace;
```
- Usar para textos de interfaz, labels, botones

### Fuente Display/Títulos (Dot Matrix Style)
```css
font-family: 'Orbitron', 'Space Grotesk', sans-serif;
```
- Usar para títulos principales, números grandes, elementos destacados
- Alternativa: usar letter-spacing amplio para efecto tech

### Escala Tipográfica
```
--text-xs: 0.75rem    /* 12px - Labels pequeños */
--text-sm: 0.875rem   /* 14px - Texto secundario */
--text-base: 1rem     /* 16px - Texto normal */
--text-lg: 1.125rem   /* 18px - Subtítulos */
--text-xl: 1.5rem     /* 24px - Títulos de sección */
--text-2xl: 2rem      /* 32px - Títulos principales */
--text-3xl: 2.5rem    /* 40px - Hero/Display */
```

---

## Componentes

### Cards
```css
.card {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 1.5rem;
}
```

### Botones
```css
/* Primario - solo para acciones principales */
.btn-primary {
  background: var(--text-primary);
  color: var(--text-dark);
  border: none;
}

/* Secundario - acciones normales */
.btn-secondary {
  background: transparent;
  color: var(--text-primary);
  border: 1px solid var(--border-light);
}

/* Danger - eliminar/cancelar */
.btn-danger {
  background: var(--accent-red-soft);
  color: var(--accent-red);
  border: 1px solid var(--accent-red);
}
```

### Inputs
```css
input, select {
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  color: var(--text-primary);
  border-radius: 8px;
  padding: 0.75rem 1rem;
}

input:focus {
  border-color: var(--text-secondary);
  outline: none;
}
```

### Badges/Tags
```css
.badge {
  font-family: 'Space Grotesk', monospace;
  font-size: var(--text-xs);
  text-transform: uppercase;
  letter-spacing: 1px;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
}
```

---

## Efectos y Animaciones

### Transiciones
```css
--transition-fast: 150ms ease;
--transition-normal: 200ms ease;
--transition-slow: 300ms ease;
```

### Hover States
- Bordes: de `--border` a `--border-light`
- Fondos: aumentar luminosidad ligeramente
- NO usar sombras excesivas

### Glow Effects (Usar con moderación)
```css
/* Solo para elementos muy importantes */
.glow-green {
  box-shadow: 0 0 20px var(--accent-green-soft);
}
```

---

## Principios de Diseño

1. **Minimalismo**: Menos es más. Espacios amplios, pocos elementos.
2. **Contraste**: Usar acentos de color solo para información importante.
3. **Consistencia**: Mismo espaciado, mismos radios, mismas transiciones.
4. **Legibilidad**: Priorizar texto legible sobre efectos visuales.
5. **Jerarquía**: Tamaño y peso tipográfico definen importancia.

---

## Espaciado

```
--space-1: 0.25rem   /* 4px */
--space-2: 0.5rem    /* 8px */
--space-3: 0.75rem   /* 12px */
--space-4: 1rem      /* 16px */
--space-5: 1.5rem    /* 24px */
--space-6: 2rem      /* 32px */
--space-8: 3rem      /* 48px */
```

---

## Iconografía
- Usar iconos de línea (stroke), no rellenos
- Stroke width: 1.5px - 2px
- Tamaño estándar: 20px

---

## NO hacer
- No usar gradientes de color
- No usar sombras pronunciadas
- No usar bordes redondeados excesivos (max 12px)
- No usar más de un color de acento por sección
- No usar animaciones complejas o largas
