import { NextRequest, NextResponse } from 'next/server'
import { sql, ensureSchema } from '@/lib/db'

function parseDevice(ua: string): 'mobile' | 'tablet' | 'desktop' {
  if (/tablet|ipad/i.test(ua))            return 'tablet'
  if (/mobile|android|iphone|ipod/i.test(ua)) return 'mobile'
  return 'desktop'
}

export async function POST(req: NextRequest) {
  try {
    const { path, module, lang } = await req.json() as {
      path?:   string
      module?: string | null
      lang?:   string
    }

    const country = req.headers.get('x-vercel-ip-country') ?? 'unknown'
    const ua      = req.headers.get('user-agent') ?? ''
    const device  = parseDevice(ua)

    await ensureSchema()
    await sql`
      INSERT INTO page_views (path, module, country, device, lang)
      VALUES (
        ${path   ?? ''},
        ${module ?? null},
        ${country},
        ${device},
        ${lang   ?? 'en'}
      )
    `
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[track]', err)
    return NextResponse.json({ ok: false }, { status: 500 })
  }
}
