import { neon } from '@neondatabase/serverless'

// Single shared sql client
export const sql = neon(process.env.DATABASE_URL!)

// Auto-migration: creates the table and index on first call
export async function ensureSchema() {
  await sql`
    CREATE TABLE IF NOT EXISTS page_views (
      id         SERIAL PRIMARY KEY,
      path       VARCHAR(200) NOT NULL DEFAULT '',
      module     VARCHAR(100),
      country    VARCHAR(10)  NOT NULL DEFAULT 'unknown',
      device     VARCHAR(20)  NOT NULL DEFAULT 'desktop',
      lang       VARCHAR(10)  NOT NULL DEFAULT 'en',
      session_id VARCHAR(40)  NOT NULL DEFAULT '',
      created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
    )
  `
  await sql`ALTER TABLE page_views ADD COLUMN IF NOT EXISTS session_id VARCHAR(40) NOT NULL DEFAULT ''`
  await sql`CREATE INDEX IF NOT EXISTS idx_pv_created_at ON page_views(created_at)`
  await sql`CREATE INDEX IF NOT EXISTS idx_pv_session    ON page_views(session_id)`
}
