import { motion } from 'framer-motion'
import {
  Link2, FolderOpen, MousePointer, Wifi, WifiOff, PauseCircle,
  TrendingUp, AlertTriangle, RefreshCw, Lock,
} from 'lucide-react'
import { useDashboardStats } from '@/features/statistics/useStatistics'
import { usePortalSettings } from '@/features/settings/useSettings'
import { APP_NAME } from '@/constants'
import { StatCardSkeleton } from '@/components/common/LoadingSkeleton'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { formatNumber, timeAgo } from '@/lib/utils'
import { HealthStatusBadge, InternalBadge } from '@/components/links/LinkStatusBadge'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts'

function StatCard({ icon: Icon, label, value, color }: { icon: typeof Link2; label: string; value: number | string; color: string }) {
  return (
    <motion.div
      whileHover={{ y: -2 }}
      className="rounded-xl border bg-card p-5 shadow-sm"
    >
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        <div className={`p-2 rounded-lg ${color}`}>
          <Icon className="h-4 w-4 text-white" />
        </div>
      </div>
      <p className="text-2xl font-bold">{typeof value === 'number' ? formatNumber(value) : value}</p>
    </motion.div>
  )
}

export function DashboardPage() {
  const { data: stats, isLoading } = useDashboardStats()
  const { data: settings } = usePortalSettings()

  const statusData = stats ? [
    { name: 'Online',       value: stats.online_links,    color: '#16A34A' },
    { name: 'Offline',      value: stats.offline_links,   color: '#DC2626' },
    { name: 'Không rõ',     value: stats.unknown_links,   color: '#F59E0B' },
    { name: 'Nội bộ / VPN', value: stats.internal_links,  color: '#6366F1' },
  ].filter(d => d.value > 0) : []

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground text-sm">Tổng quan hệ thống {settings?.portal_name || APP_NAME}</p>
      </div>

      {/* Stat cards */}
      {isLoading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => <StatCardSkeleton key={i} />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard icon={Link2}        label="Tổng link"        value={stats?.total_links ?? 0}       color="bg-blue-500" />
          <StatCard icon={FolderOpen}   label="Danh mục"         value={stats?.total_categories ?? 0}  color="bg-purple-500" />
          <StatCard icon={MousePointer} label="Tổng lượt click"  value={stats?.total_clicks ?? 0}      color="bg-green-500" />
          <StatCard icon={Lock}         label="Nội bộ / VPN"     value={stats?.internal_links ?? 0}    color="bg-indigo-400" />
          <StatCard icon={Wifi}         label="Online"           value={stats?.online_links ?? 0}      color="bg-emerald-500" />
          <StatCard icon={WifiOff}      label="Offline"          value={stats?.offline_links ?? 0}     color="bg-red-500" />
          <StatCard icon={AlertTriangle} label="Không rõ"        value={stats?.unknown_links ?? 0}     color="bg-amber-500" />
          <StatCard icon={PauseCircle}  label="Tạm ngưng"        value={stats?.suspended_links ?? 0}   color="bg-gray-500" />
        </div>
      )}

      {/* Charts */}
      <div className="grid lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              Top link được truy cập nhiều
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-64 w-full" />
            ) : stats?.top_links && stats.top_links.length > 0 ? (
              <div style={{ height: Math.max(200, stats.top_links.length * 38) }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats.top_links} layout="vertical" margin={{ left: 8, right: 24, top: 4, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                    <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
                    <YAxis type="category" dataKey="name" width={130} tick={{ fontSize: 11 }} />
                    <Tooltip formatter={(v: number) => [formatNumber(v), 'Lượt click']} />
                    <Bar dataKey="click_count" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">Chưa có dữ liệu</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Phân bố trạng thái</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center">
            {isLoading ? (
              <Skeleton className="h-56 w-full" />
            ) : statusData.length > 0 ? (
              <div className="w-full" style={{ height: 240 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={statusData}
                      cx="50%" cy="45%"
                      innerRadius="35%" outerRadius="65%"
                      dataKey="value"
                      nameKey="name"
                      label={({ percent }) => `${(percent * 100).toFixed(0)}%`}
                      labelLine={false}
                    >
                      {statusData.map((entry, index) => (
                        <Cell key={index} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v: number) => [formatNumber(v), 'link']} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">Chưa có dữ liệu</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Errors + Recent */}
      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <WifiOff className="h-4 w-4 text-destructive" />
              Link lỗi gần đây
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="h-10 bg-muted animate-pulse rounded" />
                ))}
              </div>
            ) : stats?.recent_errors && stats.recent_errors.length > 0 ? (
              <div className="divide-y">
                {stats.recent_errors.map(link => (
                  <div key={link.id} className="flex items-center justify-between py-2.5">
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{link.name}</p>
                      <p className="text-xs text-muted-foreground">{timeAgo(link.last_checked_at)}</p>
                    </div>
                    {link.is_internal ? <InternalBadge /> : <HealthStatusBadge status={link.health_status} />}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">Không có link lỗi 🎉</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <RefreshCw className="h-4 w-4 text-primary" />
              Link mới cập nhật
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="h-10 bg-muted animate-pulse rounded" />
                ))}
              </div>
            ) : stats?.recently_updated && stats.recently_updated.length > 0 ? (
              <div className="divide-y">
                {stats.recently_updated.map(link => (
                  <div key={link.id} className="flex items-center justify-between py-2.5">
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{link.name}</p>
                      <p className="text-xs text-muted-foreground">{timeAgo(link.updated_at)}</p>
                    </div>
                    {link.is_internal ? <InternalBadge /> : <HealthStatusBadge status={link.health_status} />}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">Chưa có dữ liệu</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
