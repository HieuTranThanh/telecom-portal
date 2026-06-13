import { useState } from 'react'
import { Activity, PlayCircle, Play, Wifi, WifiOff, HelpCircle, Loader2, Lock, Pin } from 'lucide-react'
import { useAllLinksAdmin } from '@/features/links/useLinks'
import { useCheckSingleLink, useBulkHealthCheck } from '@/features/health-check/useHealthCheck'
import { HealthStatusBadge, InternalBadge } from '@/components/links/LinkStatusBadge'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { Link } from '@/types'
import { formatDateTime } from '@/lib/utils'

export function HealthCheckPage() {
  const { data, isLoading } = useAllLinksAdmin({}, 1, 500)
  const { mutate: checkSingle, isPending: isCheckingSingle, variables: checkingLink } = useCheckSingleLink()
  const { mutate: bulkCheck, isPending: isBulkChecking } = useBulkHealthCheck()
  const [checkedCount, setCheckedCount] = useState(0)

  const links = data?.links || []
  const checkableLinks = links.filter(l => !l.is_internal)
  const internalLinks = links.filter(l => l.is_internal)
  const lockedLinks = links.filter(l => l.health_check_exempt)
  const recheckableLinks = checkableLinks.filter(l => !l.health_check_exempt)
  const onlineCount = checkableLinks.filter(l => l.health_status === 'online').length
  const offlineCount = checkableLinks.filter(l => l.health_status === 'offline').length
  const unknownCount = checkableLinks.filter(l => l.health_status === 'unknown').length

  const handleBulkCheck = () => {
    setCheckedCount(0)
    bulkCheck(
      { links: recheckableLinks, onProgress: count => setCheckedCount(count) },
      { onSuccess: results => setCheckedCount(results.length) }
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Kiểm tra Link</h1>
          <p className="text-muted-foreground text-sm">Kiểm tra trạng thái sống/chết của các link</p>
        </div>
        <Button onClick={handleBulkCheck} disabled={isBulkChecking || isLoading}>
          {isBulkChecking ? (
            <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Đang kiểm tra...</>
          ) : (
            <><PlayCircle className="h-4 w-4 mr-2" />Kiểm tra tất cả</>
          )}
        </Button>
      </div>

      {internalLinks.length > 0 && (
        <div className="flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-4 py-2.5 text-sm text-blue-700">
          <Lock className="h-4 w-4 flex-shrink-0" />
          <span>
            <strong>{internalLinks.length} link nội bộ</strong> sẽ không được kiểm tra tự động vì không truy cập được từ internet.
          </span>
        </div>
      )}

      {lockedLinks.length > 0 && (
        <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-700">
          <Pin className="h-4 w-4 flex-shrink-0" />
          <span>
            <strong>{lockedLinks.length} link</strong> đã khóa trạng thái thủ công, sẽ không được kiểm tra tự động.
          </span>
        </div>
      )}

      {isBulkChecking && (
        <div className="space-y-2">
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>Đang kiểm tra {recheckableLinks.length} link...</span>
            <span>{checkedCount}/{recheckableLinks.length}</span>
          </div>
          <Progress value={recheckableLinks.length > 0 ? (checkedCount / recheckableLinks.length) * 100 : 0} />
        </div>
      )}

      <div className="grid grid-cols-4 gap-4">
        <div className="rounded-xl border bg-card p-4 flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-green-100 flex items-center justify-center">
            <Wifi className="h-5 w-5 text-green-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-green-600">{onlineCount}</p>
            <p className="text-xs text-muted-foreground">Online</p>
          </div>
        </div>
        <div className="rounded-xl border bg-card p-4 flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-red-100 flex items-center justify-center">
            <WifiOff className="h-5 w-5 text-red-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-red-600">{offlineCount}</p>
            <p className="text-xs text-muted-foreground">Offline</p>
          </div>
        </div>
        <div className="rounded-xl border bg-card p-4 flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-amber-100 flex items-center justify-center">
            <HelpCircle className="h-5 w-5 text-amber-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-amber-600">{unknownCount}</p>
            <p className="text-xs text-muted-foreground">Không rõ</p>
          </div>
        </div>
        <div className="rounded-xl border bg-card p-4 flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-blue-100 flex items-center justify-center">
            <Lock className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-blue-600">{internalLinks.length}</p>
            <p className="text-xs text-muted-foreground">VPN</p>
          </div>
        </div>
      </div>

      <div className="rounded-xl border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Tên hệ thống</TableHead>
              <TableHead>Health Status</TableHead>
              <TableHead className="hidden md:table-cell">HTTP Status</TableHead>
              <TableHead className="hidden md:table-cell">Lần kiểm tra cuối</TableHead>
              <TableHead className="w-28">Kiểm tra</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 5 }).map((_, j) => (
                    <TableCell key={j}><Skeleton className="h-5 w-full" /></TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              links.map(link => {
                const isChecking = isCheckingSingle && checkingLink?.id === link.id
                return (
                  <TableRow key={link.id} className={link.is_internal ? 'bg-blue-50/30' : link.health_check_exempt ? 'bg-amber-50/30' : undefined}>
                    <TableCell>
                      <div>
                        <p className="font-medium text-sm">{link.name}</p>
                        <p className="text-xs text-muted-foreground truncate max-w-[180px]">{link.url}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      {link.is_internal ? (
                        <InternalBadge />
                      ) : (
                        <div className="flex items-center gap-1.5">
                          <HealthStatusBadge status={link.health_status} />
                          {link.health_check_exempt && (
                            <Pin
                              className="h-3 w-3 text-amber-500 flex-shrink-0"
                              aria-label="Đã khóa thủ công"
                            >
                              <title>{link.health_check_exempt_reason || 'Trạng thái đã khóa thủ công'}</title>
                            </Pin>
                          )}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <span className="text-sm text-muted-foreground">
                        {link.is_internal || link.health_check_exempt ? '—' : (link.last_http_status ?? '—')}
                      </span>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <span className="text-xs text-muted-foreground">
                        {link.is_internal
                          ? 'Không kiểm tra'
                          : link.health_check_exempt
                            ? 'Khóa thủ công'
                            : (link.last_checked_at ? formatDateTime(link.last_checked_at) : 'Chưa kiểm tra')}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => checkSingle(link)}
                        disabled={link.is_internal || link.health_check_exempt || isChecking || isBulkChecking}
                        title={
                          link.is_internal
                            ? 'Link nội bộ — không kiểm tra được từ internet'
                            : link.health_check_exempt
                              ? (link.health_check_exempt_reason || 'Trạng thái đã khóa thủ công')
                              : undefined
                        }
                      >
                        {isChecking ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <><Play className="h-3 w-3 mr-1" />Kiểm tra</>
                        )}
                      </Button>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
