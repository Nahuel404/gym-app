/**
 * Script de migración - Ejecutar UNA SOLA VEZ
 *
 * Uso: pnpm db:migrate
 *
 * Requiere DATABASE_URL en el archivo .env
 * La encuentras en: Supabase Dashboard > Settings > Database > Connection string
 */

import 'dotenv/config'
import { readFileSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'
import pg from 'pg'

const __dirname = dirname(fileURLToPath(import.meta.url))

async function migrate() {
  const databaseUrl = process.env.DATABASE_URL

  if (!databaseUrl) {
    console.error('❌ Error: DATABASE_URL no está definida en .env')
    console.log('')
    console.log('Para obtenerla:')
    console.log('1. Ve a tu Supabase Dashboard')
    console.log('2. Settings > Database')
    console.log('3. Copia "Connection string" (URI)')
    console.log('4. Agrégala a tu .env como DATABASE_URL=postgres://...')
    process.exit(1)
  }

  const client = new pg.Client({
    connectionString: databaseUrl,
    ssl: { rejectUnauthorized: false }
  })

  try {
    console.log('🔌 Conectando a la base de datos...')
    await client.connect()

    console.log('📄 Leyendo schema.sql...')
    const schemaPath = join(__dirname, 'schema.sql')
    const schema = readFileSync(schemaPath, 'utf-8')

    console.log('🚀 Ejecutando migración...')
    await client.query(schema)

    console.log('')
    console.log('✅ ¡Migración completada con éxito!')
    console.log('')
    console.log('Tablas creadas:')
    console.log('  - users (usuarios)')
    console.log('  - exercises (catálogo de ejercicios)')
    console.log('  - exercise_history (historial para estadísticas)')
    console.log('')
    console.log('Se insertaron 14 ejercicios básicos de ejemplo.')

  } catch (error) {
    console.error('❌ Error en la migración:', error)
    process.exit(1)
  } finally {
    await client.end()
  }
}

migrate()
