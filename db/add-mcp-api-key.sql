-- =============================================================================
-- MIGRACIÓN: API Key para MCP
-- =============================================================================
-- Agrega un campo de API key único a cada usuario para autenticarse
-- contra el MCP server remoto. La key se genera desde la web app.
-- =============================================================================

ALTER TABLE users
ADD COLUMN IF NOT EXISTS mcp_api_key VARCHAR(64) UNIQUE;

COMMENT ON COLUMN users.mcp_api_key IS 'API key para conectar Claude u otros clientes MCP. Generada desde la web app.';

CREATE INDEX IF NOT EXISTS idx_users_mcp_api_key ON users(mcp_api_key)
WHERE mcp_api_key IS NOT NULL;
