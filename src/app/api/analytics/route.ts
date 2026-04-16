import { NextResponse } from 'next/server'
import { sql, ensureSchema } from '@/lib/db'

export async function GET() {
  try {
    await ensureSchema()

    // ── Run all queries in parallel ──────────────────────────────────────────
    const [total, daily, monthly, modules, countries, devices, langs] =
      await Promise.all([

        // Total pageviews
        sql`SELECT COUNT(*) AS count FROM page_views`,

        // Daily views — last 30 days
        sql`
          SELECT
            TO_CHAR(DATE_TRUNC('day', created_at AT TIME ZONE 'UTC'), 'YYYY-MM-DD') AS date,
            COUNT(*) AS count
          FROM page_views
          WHERE created_at >= NOW() - INTERVAL '30 days'
          GROUP BY 1
          ORDER BY 1
        `,

        // Monthly views — last 12 months
        sql`
          SELECT
            TO_CHAR(DATE_TRUNC('month', created_at AT TIME ZONE 'UTC'), 'YYYY-MM') AS month,
            COUNT(*) AS count
          FROM page_views
          WHERE created_at >= NOW() - INTERVAL '12 months'
          GROUP BY 1
          ORDER BY 1
        `,

        // Top modules (exclude homepage nulls)
        sql`
          SELECT module, COUNT(*) AS count
          FROM page_views
          WHERE module IS NOT NULL
          GROUP BY module
          ORDER BY count DESC
          LIMIT 12
        `,

        // Top countries
        sql`
          SELECT country, COUNT(*) AS count
          FROM page_views
          WHERE country != 'unknown'
          GROUP BY country
          ORDER BY count DESC
          LIMIT 15
        `,

        // Device breakdown
        sql`
          SELECT device, COUNT(*) AS count
          FROM page_views
          GROUP BY device
          ORDER BY count DESC
        `,

        // Language breakdown
        sql`
          SELECT lang, COUNT(*) AS count
          FROM page_views
          GROUP BY lang
          ORDER BY count DESC
        `,
      ])

    return NextResponse.json({
      total:     Number((total[0] as { count: string }).count),
      daily:     daily.map((r: Record<string,string>) => ({ date: r.date,  count: Number(r.count) })),
      monthly:   monthly.map((r: Record<string,string>) => ({ month: r.month, count: Number(r.count) })),
      modules:   modules.map((r: Record<string,string>) => ({ module: r.module, count: Number(r.count) })),
      countries: countries.map((r: Record<string,string>) => ({ country: r.country, count: Number(r.count) })),
      devices:   devices.map((r: Record<string,string>) => ({ device: r.device, count: Number(r.count) })),
      langs:     langs.map((r: Record<string,string>) => ({ lang: r.lang, count: Number(r.count) })),
    })
  } catch (err) {
    console.error('[analytics]', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
