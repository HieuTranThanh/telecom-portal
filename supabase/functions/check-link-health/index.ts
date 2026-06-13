// Supabase Edge Function — server-side health check
// Deploy: supabase functions deploy check-link-health
import { serve } from 'https://deno.land/std@0.208.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const BATCH_SIZE = 10  // concurrent requests per batch

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface LinkInput {
  id: string
  url: string
}

type HealthStatus = 'online' | 'offline' | 'unknown'

// 2xx/3xx/4xx → online (server responded = server is up)
//               4xx includes SSO systems that return 404 instead of 401
// 5xx          → offline (actual server error)
// No response (timeout, network error) → offline
function classifyStatus(code: number): HealthStatus {
  if (code >= 200 && code < 500) return 'online'
  return 'offline'
}

async function checkOne(link: LinkInput, timeoutMs: number): Promise<{
  link_id: string
  status: HealthStatus
  http_status: number | null
  response_time_ms: number
  error_message: string | null
}> {
  const start = Date.now()
  let status: HealthStatus = 'offline'
  let http_status: number | null = null
  let error_message: string | null = null

  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs)
    const res = await fetch(link.url, { method: 'HEAD', signal: controller.signal, redirect: 'follow' })
    clearTimeout(timer)
    http_status = res.status
    status = classifyStatus(http_status)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    error_message = msg.includes('abort') || msg.includes('timed out') || msg.includes('timeout')
      ? 'Timeout'
      : msg
  }

  return { link_id: link.id, status, http_status, response_time_ms: Date.now() - start, error_message }
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { links, timeout_ms = 10000 } = await req.json() as {
      links: LinkInput[]
      timeout_ms?: number
    }

    if (!links?.length) {
      return new Response(JSON.stringify({ results: [] }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const now = new Date().toISOString()
    const allResults: Awaited<ReturnType<typeof checkOne>>[] = []

    // Process in parallel batches to avoid overwhelming targets
    for (let i = 0; i < links.length; i += BATCH_SIZE) {
      const batch = links.slice(i, i + BATCH_SIZE)
      const batchResults = await Promise.all(batch.map(link => checkOne(link, timeout_ms)))
      allResults.push(...batchResults)

      // Persist batch results — allSettled so a single DB hiccup doesn't abort the rest
      await Promise.allSettled(batchResults.flatMap(r => [
        supabase.from('link_health_checks').insert({
          link_id: r.link_id,
          status: r.status,
          http_status: r.http_status,
          response_time_ms: r.response_time_ms,
          error_message: r.error_message,
          checked_at: now,
        }),
        supabase.from('links').update({
          health_status: r.status,
          last_checked_at: now,
          last_http_status: r.http_status,
        }).eq('id', r.link_id),
      ]))
    }

    return new Response(JSON.stringify({ results: allResults }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : String(err) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
