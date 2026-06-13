// Supabase Edge Function — bulk health check for all active links
// Designed to be called by a cron job (pg_cron or external scheduler)
// Deploy: supabase functions deploy check-all-links
import { serve } from 'https://deno.land/std@0.208.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const BATCH_SIZE = 10        // concurrent requests per batch
const TIMEOUT_MS = 10000
const RETENTION_DAYS = 30    // delete health check records older than this

type HealthStatus = 'online' | 'offline' | 'unknown'

// 2xx/3xx/4xx → online (server responded = server is up)
// 5xx          → offline (actual server error)
function classifyStatus(code: number): HealthStatus {
  if (code >= 200 && code < 500) return 'online'
  return 'offline'
}

async function checkOne(url: string): Promise<{ status: HealthStatus; httpStatus: number | null; responseMs: number; error: string | null }> {
  const start = Date.now()
  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
    const res = await fetch(url, { method: 'HEAD', signal: controller.signal, redirect: 'follow' })
    clearTimeout(timer)
    return { status: classifyStatus(res.status), httpStatus: res.status, responseMs: Date.now() - start, error: null }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return {
      status: 'offline',
      httpStatus: null,
      responseMs: Date.now() - start,
      error: msg.includes('abort') || msg.includes('timeout') ? 'Timeout' : msg,
    }
  }
}

serve(async (req: Request) => {
  // Allow cron calls with service role key only (no CORS needed)
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: { 'Access-Control-Allow-Origin': '*' } })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Fetch all active, non-internal, non-exempt links (internal = intranet-only;
    // exempt = trạng thái đã khóa thủ công, vd link bị WAF chặn server check)
    // Explicit limit prevents silent truncation at Supabase PostgREST's default max (1000 rows)
    const { data: links, error: fetchErr } = await supabase
      .from('links')
      .select('id, url')
      .eq('is_active', true)
      .eq('is_internal', false)
      .eq('health_check_exempt', false)
      .limit(5000)

    if (fetchErr) throw fetchErr
    if (!links || links.length === 0) {
      return new Response(JSON.stringify({ checked: 0, message: 'No active links' }), {
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const now = new Date().toISOString()
    const summary = { online: 0, offline: 0, total: links.length }

    // Process in batches to avoid overwhelming targets
    for (let i = 0; i < links.length; i += BATCH_SIZE) {
      const batch = links.slice(i, i + BATCH_SIZE)
      const results = await Promise.all(batch.map(link => checkOne(link.url).then(r => ({ ...r, id: link.id }))))

      for (const r of results) {
        // allSettled so a single DB hiccup doesn't abort the remaining records
        await Promise.allSettled([
          supabase.from('links').update({
            health_status: r.status,
            last_checked_at: now,
            last_http_status: r.httpStatus,
          }).eq('id', r.id),
          supabase.from('link_health_checks').insert({
            link_id: r.id,
            status: r.status,
            http_status: r.httpStatus,
            response_time_ms: r.responseMs,
            error_message: r.error,
            checked_at: now,
          }),
        ])
        if (r.status === 'online') summary.online++
        else summary.offline++
      }
    }

    // Purge old health check records to keep the table lean
    const cutoff = new Date(Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000).toISOString()
    const { count: deleted } = await supabase
      .from('link_health_checks')
      .delete({ count: 'exact' })
      .lt('checked_at', cutoff)

    return new Response(JSON.stringify({ ...summary, deleted_old_records: deleted ?? 0 }), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : String(err) }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
})
