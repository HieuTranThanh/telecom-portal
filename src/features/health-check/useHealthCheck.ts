import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { Link, HealthStatus } from '@/types'
import { HEALTH_CHECK_TIMEOUT_MS } from '@/constants'
import { usePortalSettings } from '@/features/settings/useSettings'
import { linkKeys, adminLinkKeys } from '@/features/links/useLinks'
import { statsKeys } from '@/features/statistics/useStatistics'

const healthKeys = {
  history: (linkId: string) => ['health', 'history', linkId] as const,
}

type HealthResult = {
  link_id?: string
  status: HealthStatus
  http_status: number | null
  response_time_ms?: number
  error_message?: string
}

// ─── Status classification ─────────────────────────────────────────────────────
// 2xx/3xx/4xx → online  (server phản hồi = server đang chạy)
//               4xx thường gặp với hệ thống SSO nội bộ trả 404 thay vì 401
// 5xx         → offline (lỗi server thực sự)
// Không có response (timeout, network error) → offline
function classifyStatus(code: number): HealthStatus {
  if (code >= 200 && code < 500) return 'online'
  return 'offline'
}

// ─── Server-side check via Edge Function (accurate, no CORS/proxy issues) ─────
async function checkViaEdgeFunction(
  links: { id: string; url: string }[],
  timeoutMs: number
): Promise<HealthResult[]> {
  const { data, error } = await supabase.functions.invoke('check-link-health', {
    body: { links, timeout_ms: timeoutMs },
  })
  if (error) throw error

  return data.results as HealthResult[]
}

// ─── Browser-side fallback (limited: cannot detect CORS-hidden status codes) ──
async function checkViaBrowser(url: string, timeoutMs: number): Promise<HealthResult> {
  const start = Date.now()
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  const elapsed = () => Date.now() - start

  try {
    try {
      const res = await fetch(url, { method: 'HEAD', signal: controller.signal, cache: 'no-store' })
      clearTimeout(timer)
      const http_status = res.status
      return { status: classifyStatus(http_status), http_status, response_time_ms: elapsed() }
    } catch (e1) {
      if (controller.signal.aborted) throw e1
      // CORS block — confirm reachability with no-cors (opaque response)
      await fetch(url, { method: 'HEAD', signal: controller.signal, mode: 'no-cors', cache: 'no-store' })
      clearTimeout(timer)
      return { status: 'online', http_status: null, response_time_ms: elapsed() }
    }
  } catch (err) {
    clearTimeout(timer)
    const response_time_ms = elapsed()
    if (controller.signal.aborted) {
      return { status: 'offline', http_status: null, error_message: 'Timeout', response_time_ms }
    }
    return { status: 'offline', http_status: null, error_message: err instanceof Error ? err.message : 'Unknown error', response_time_ms }
  }
}

async function persistHealthResult(linkId: string, result: HealthResult) {
  const now = new Date().toISOString()
  // allSettled: both writes proceed even if one fails
  const [, updateRes] = await Promise.allSettled([
    supabase.from('link_health_checks').insert({
      link_id: linkId,
      status: result.status,
      http_status: result.http_status,
      response_time_ms: result.response_time_ms ?? null,
      error_message: result.error_message ?? null,
      checked_at: now,
    }),
    supabase.from('links').update({
      health_status: result.status,
      last_checked_at: now,
      last_http_status: result.http_status,
    }).eq('id', linkId),
  ])
  // Critical: link.health_status must be updated — throw if it failed
  // (audit log insert failure is non-critical and can be silently missed)
  if (updateRes.status === 'rejected') throw updateRes.reason
  if (updateRes.status === 'fulfilled' && updateRes.value.error) throw updateRes.value.error
}

export function useCheckSingleLink() {
  const qc = useQueryClient()
  const { data: settings } = usePortalSettings()
  const timeoutMs = settings?.health_check_timeout ?? HEALTH_CHECK_TIMEOUT_MS

  return useMutation({
    mutationFn: async (link: Link) => {
      if (link.is_internal) return null         // skip — internal links not reachable from internet
      if (link.health_check_exempt) return null // skip — trạng thái đã khóa thủ công

      let result: HealthResult
      try {
        // Try Edge Function first (server-side, accurate)
        const results = await checkViaEdgeFunction([{ id: link.id, url: link.url }], timeoutMs)
        if (!results.length) throw new Error('No results from Edge Function')
        result = results[0]
        // Edge Function already persisted — just return
      } catch {
        // Edge Function not deployed or failed — fall back to browser check
        result = await checkViaBrowser(link.url, timeoutMs)
        await persistHealthResult(link.id, result)
      }
      return result
    },
    onSuccess: (_, link) => {
      qc.invalidateQueries({ queryKey: linkKeys.all })
      qc.invalidateQueries({ queryKey: adminLinkKeys.all })
      qc.invalidateQueries({ queryKey: statsKeys.all })
      qc.invalidateQueries({ queryKey: healthKeys.history(link.id) })
    },
    onError: (err: Error) => toast.error(`Lỗi kiểm tra: ${err.message}`),
  })
}

export function useBulkHealthCheck() {
  const qc = useQueryClient()
  const { data: settings } = usePortalSettings()
  const timeoutMs = settings?.health_check_timeout ?? HEALTH_CHECK_TIMEOUT_MS

  return useMutation({
    mutationFn: async ({
      links,
      onProgress,
    }: {
      links: Link[]
      onProgress?: (count: number) => void
    }) => {
      const checkable = links.filter(l => !l.is_internal && !l.health_check_exempt)
      if (!checkable.length) return []

      // Try Edge Function with all links in one batched call
      try {
        const edgeResults = await checkViaEdgeFunction(
          checkable.map(l => ({ id: l.id, url: l.url })),
          timeoutMs
        )
        if (!edgeResults.length) throw new Error('No results from Edge Function')
        edgeResults.forEach((_, i) => onProgress?.(i + 1))
        return edgeResults
      } catch {
        // Edge Function unavailable — fall back to browser checks one-by-one
      }

      const results: HealthResult[] = []
      for (const link of checkable) {
        const result = await checkViaBrowser(link.url, timeoutMs)
        await persistHealthResult(link.id, result)
        results.push(result)
        onProgress?.(results.length)
      }
      return results
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: linkKeys.all })
      qc.invalidateQueries({ queryKey: adminLinkKeys.all })
      qc.invalidateQueries({ queryKey: statsKeys.all })
      toast.success('Đã hoàn thành kiểm tra')
    },
    onError: (err: Error) => toast.error(`Lỗi: ${err.message}`),
  })
}
