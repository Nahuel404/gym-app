/**
 * Utilidades para manejo de fechas con zona horaria local
 *
 * El problema: Supabase almacena fechas como "2025-01-12" (sin hora).
 * Cuando JavaScript parsea esto con new Date("2025-01-12"), lo interpreta
 * como medianoche UTC. En zonas horarias negativas (ej: Argentina UTC-3),
 * esto se convierte en el día anterior (11 de enero a las 21:00).
 *
 * Solución: Parsear las fechas agregando la hora del mediodía para evitar
 * cambios de día por zona horaria.
 */

/**
 * Parsea una fecha de la base de datos a Date local
 * Evita problemas de zona horaria al agregar T12:00:00
 */
export function parseLocalDate(dateStr: string | Date): Date {
  if (dateStr instanceof Date) {
    return dateStr;
  }

  // Si ya tiene hora (ISO completo), usar directamente
  if (dateStr.includes('T')) {
    return new Date(dateStr);
  }

  // Para fechas "YYYY-MM-DD", agregar mediodía para evitar cambio de día
  return new Date(dateStr + 'T12:00:00');
}

/**
 * Formatea una fecha para mostrar (día y mes corto)
 * Ejemplo: "12 ene"
 */
export function formatShortDate(dateStr: string | Date): string {
  const date = parseLocalDate(dateStr);
  return date.toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'short'
  });
}

/**
 * Formatea una fecha completa (día de la semana, día y mes)
 * Ejemplo: "viernes, 12 de enero"
 */
export function formatFullDate(dateStr: string | Date): string {
  const date = parseLocalDate(dateStr);
  return date.toLocaleDateString('es-ES', {
    weekday: 'long',
    day: 'numeric',
    month: 'long'
  });
}

/**
 * Obtiene el lunes de la semana de una fecha
 */
export function getMonday(dateStr: string | Date): Date {
  const date = parseLocalDate(dateStr);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(date);
  monday.setDate(diff);
  monday.setHours(12, 0, 0, 0);
  return monday;
}

/**
 * Formatea una fecha para el input type="date"
 * Ejemplo: "2025-01-12"
 */
export function formatInputDate(dateStr: string | Date): string {
  const date = parseLocalDate(dateStr);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Obtiene la fecha actual formateada para input
 */
export function getTodayInputDate(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
