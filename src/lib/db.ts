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
      created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
    )
  `
  await sql`
    CREATE INDEX IF NOT EXISTS idx_pv_created_at ON page_views(created_at)
  `
}
