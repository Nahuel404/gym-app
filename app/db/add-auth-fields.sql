-- ============================================
-- Actualizar tabla users para autenticacion
-- Ejecutar UNA SOLA VEZ despues de schema.sql
-- ============================================

-- Agregar columnas de autenticacion
ALTER TABLE users
ADD COLUMN IF NOT EXISTS username VARCHAR(50) UNIQUE,
ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255),
ADD COLUMN IF NOT EXISTS role VARCHAR(20) DEFAULT 'user' CHECK (role IN ('admin', 'user'));

-- Crear indice para busquedas por username
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);

-- Insertar usuario administrador
-- Usuario: Nahueladm
-- Password: The_luxem@n2.0 (hasheada con bcrypt)
INSERT INTO users (email, name, username, password_hash, role)
VALUES (
    'admin@gymapp.local',
    'Nahuel Admin',
    'Nahueladm',
    '$2b$12$Idcavw3eyrO98Z1enZ1TpuL5whBKNNFHXwvzvddTgY2HH3YeugjnO',
    'admin'
)
ON CONFLICT (email) DO UPDATE SET
    username = EXCLUDED.username,
    password_hash = EXCLUDED.password_hash,
    role = EXCLUDED.role;
