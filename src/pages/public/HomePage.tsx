import React, { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { Star, Clock, Zap, TrendingUp, RefreshCw, Search, LayoutGrid, Pin, ArrowRight, ChevronUp } from 'lucide-react'
import { Link as RouterLink } from 'react-router-dom'
import { AnnouncementBanner } from '@/components/common/AnnouncementBanner'
import { LinkGrid } from '@/components/links/LinkGrid'
import { QuickAccessGrid } from '@/components/links/QuickAccessGrid'
import { LinkCardGridSkeleton, QuickAccessGridSkeleton } from '@/components/common/LoadingSkeleton'
import {
  useFeaturedLinks,
  useFrequentLinks,
  useRecentlyUpdatedLinks,
  useLinks,
  useQuickAccessLinks,
  useLinksByIds,
} from '@/features/links/useLinks'
import { usePortalSettings, DEFAULT_SETTINGS } from '@/features/settings/useSettings'
import { usePublicStats } from '@/features/statistics/useStatistics'
import { useFavorites } from '@/hooks/useFavorites'
import { useRecentLinks } from '@/hooks/useRecentLinks'
import { useQuickAccessPins } from '@/hooks/useQuickAccessPins'
import { Button } from '@/components/ui/button'
import { Link } from '@/types'

// Fetch limit when a section is fully expanded (effectively unlimited)
const EXPAND_LIMIT = 500

function SectionHeader({ icon: Icon, title, count, action }: { icon: typeof Star; title: string; count?: number; action?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-2">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10">
          <Icon className="h-4 w-4 text-primary" />
        </div>
        <h2 className="font-semibold text-base text-foreground">{title}</h2>
        {count !== undefined && (
          <span className="ml-1 text-xs text-muted-foreground">({count})</span>
        )}
      </div>
      {action}
    </div>
  )
}

function ExpandButton({ expanded, onToggle }: { expanded: boolean; onToggle: () => void }) {
  return (
    <Button variant="ghost" size="sm" onClick={onToggle} className="text-xs text-muted-foreground">
      {expanded
        ? <><ChevronUp className="h-3 w-3 mr-1" />Thu gọn</>
        : <>Xem tất cả <ArrowRight className="h-3 w-3 ml-1" /></>
      }
    </Button>
  )
}

export function HomePage() {
  const { data: settings } = usePortalSettings()
  const pageSize = settings?.default_page_size ?? DEFAULT_SETTINGS.default_page_size
  const sectionLimit = settings?.section_page_size ?? DEFAULT_SETTINGS.section_page_size
  const qaLimit = settings?.quick_access_limit ?? DEFAULT_SETTINGS.quick_access_limit

  // Expand state per section
  const [qaExpanded, setQaExpanded] = useState(false)
  const [favoritesExpanded, setFavoritesExpanded] = useState(false)
  const [frequentExpanded, setFrequentExpanded] = useState(false)
  const [featuredExpanded, setFeaturedExpanded] = useState(false)
  const [recentExpanded, setRecentExpanded] = useState(false)

  // When expanded, fetch EXPAND_LIMIT+1 (effectively all). When collapsed, fetch limit+1 (peek).
  const { data: quickAccessLinks, isLoading: quickAccessLoading } = useQuickAccessLinks(qaExpanded ? EXPAND_LIMIT : qaLimit)
  const { data: featured, isLoading: featuredLoading } = useFeaturedLinks(featuredExpanded ? EXPAND_LIMIT : sectionLimit)
  const { data: frequent, isLoading: frequentLoading } = useFrequentLinks(frequentExpanded ? EXPAND_LIMIT : sectionLimit)
  const { data: recent, isLoading: recentLoading } = useRecentlyUpdatedLinks(recentExpanded ? EXPAND_LIMIT : sectionLimit)
  const { data: allData, isLoading: allLoading } = useLinks({}, 1, pageSize)
  const { data: publicStats } = usePublicStats()

  const { favorites } = useFavorites()
  const { recent: recentIds, clearRecent, removeRecent } = useRecentLinks()
  const { pins } = useQuickAccessPins()

  const localIds = useMemo(
    () => [...new Set([...favorites, ...pins, ...recentIds])],
    [favorites, pins, recentIds]
  )
  const { data: localLinksData = [] } = useLinksByIds(localIds)

  const favoriteLinks = favorites
    .map(id => localLinksData.find(l => l.id === id))
    .filter((l): l is Link => !!l)
  const pinnedLinks = pins
    .map(id => localLinksData.find(l => l.id === id))
    .filter((l): l is Link => !!l)
  const recentVisitedLinks = recentIds
    .map(id => localLinksData.find(l => l.id === id))
    .filter((l): l is Link => !!l)

  // hasMore: only meaningful when NOT expanded (hooks fetch limit+1 as peek)
  const quickAccessHasMore = !qaExpanded && (quickAccessLinks?.length ?? 0) > qaLimit
  const favoritesHasMore = !favoritesExpanded && favoriteLinks.length > sectionLimit
  const frequentHasMore = !frequentExpanded && (frequent?.length ?? 0) > sectionLimit
  const featuredHasMore = !featuredExpanded && (featured?.length ?? 0) > sectionLimit
  const recentHasMore = !recentExpanded && (recent?.length ?? 0) > sectionLimit

  // Slice to limit when collapsed and hasMore; show all when expanded
  const quickAccessToShow = quickAccessHasMore ? (quickAccessLinks ?? []).slice(0, qaLimit) : (quickAccessLinks ?? [])
  const favoritesToShow = favoritesHasMore ? favoriteLinks.slice(0, sectionLimit) : favoriteLinks
  const frequentToShow = frequentHasMore ? (frequent ?? []).slice(0, sectionLimit) : (frequent ?? [])
  const featuredToShow = featuredHasMore ? (featured ?? []).slice(0, sectionLimit) : (featured ?? [])
  const recentToShow = recentHasMore ? (recent ?? []).slice(0, sectionLimit) : (recent ?? [])

  const hasQuickAccess = quickAccessLoading || (quickAccessLinks && quickAccessLinks.length > 0)

  return (
    <div className="space-y-4 sm:space-y-6">
      <AnnouncementBanner />

      {/* Status bar */}
      {publicStats && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground px-1 select-none">
          <span className="font-medium text-foreground/70">{publicStats.total} link</span>
          <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
            <span className="h-1.5 w-1.5 rounded-full bg-current" />
            {publicStats.online} online
          </span>
          <span className="flex items-center gap-1.5 text-red-500 dark:text-red-400">
            <span className="h-1.5 w-1.5 rounded-full bg-current" />
            {publicStats.offline} offline
          </span>
          <span className="flex items-center gap-1.5 text-amber-500 dark:text-amber-400">
            <span className="h-1.5 w-1.5 rounded-full bg-current" />
            {publicStats.unknown} không rõ
          </span>
          <span className="flex items-center gap-1.5 text-blue-500 dark:text-blue-400">
            <span className="h-1.5 w-1.5 rounded-full bg-current" />
            {publicStats.vpn} VPN
          </span>
        </div>
      )}

      {/* 1. Quick Access (Admin-defined) */}
      {hasQuickAccess && (
        <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          className="rounded-xl border bg-card p-4 sm:p-5 shadow-sm"
        >
          <SectionHeader icon={LayoutGrid} title="Truy cập nhanh"
            action={(quickAccessHasMore || qaExpanded) ? (
              <ExpandButton expanded={qaExpanded} onToggle={() => setQaExpanded(v => !v)} />
            ) : undefined}
          />
          {quickAccessLoading
            ? <QuickAccessGridSkeleton count={Math.min(qaLimit, 6)} />
            : <QuickAccessGrid links={quickAccessToShow} showPin />
          }
        </motion.section>
      )}

      {/* 2. Truy cập nhanh của tôi (Personal pins via localStorage) */}
      {pinnedLinks.length > 0 && (
        <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
          className="rounded-xl border bg-card p-4 sm:p-5 shadow-sm"
        >
          <SectionHeader icon={Pin} title="Truy cập nhanh của tôi" count={pinnedLinks.length} />
          <QuickAccessGrid links={pinnedLinks} showPin />
        </motion.section>
      )}

      {/* 3. Link yêu thích */}
      {favoriteLinks.length > 0 && (
        <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}
          className="rounded-xl border bg-card p-4 sm:p-5 shadow-sm"
        >
          <SectionHeader icon={Star} title="Link yêu thích" count={favoriteLinks.length}
            action={(favoritesHasMore || favoritesExpanded) ? (
              <ExpandButton expanded={favoritesExpanded} onToggle={() => setFavoritesExpanded(v => !v)} />
            ) : undefined}
          />
          <LinkGrid links={favoritesToShow} compact />
        </motion.section>
      )}

      {/* 4. Truy cập gần đây */}
      {recentVisitedLinks.length > 0 && (
        <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="rounded-xl border bg-card p-4 sm:p-5 shadow-sm"
        >
          <SectionHeader
            icon={Clock}
            title="Truy cập gần đây"
            count={recentVisitedLinks.length}
            action={
              <Button variant="ghost" size="sm" onClick={clearRecent} className="text-xs text-muted-foreground">
                <RefreshCw className="h-3 w-3 mr-1" />
                Xóa lịch sử
              </Button>
            }
          />
          <LinkGrid links={recentVisitedLinks} compact onRemove={removeRecent} />
        </motion.section>
      )}

      {/* 5. Thường dùng */}
      {(frequentLoading || (frequent && frequent.length > 0)) && (
        <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }}
          className="rounded-xl border bg-card p-4 sm:p-5 shadow-sm"
        >
          <SectionHeader icon={Zap} title="Thường dùng"
            action={(frequentHasMore || frequentExpanded) ? (
              <ExpandButton expanded={frequentExpanded} onToggle={() => setFrequentExpanded(v => !v)} />
            ) : undefined}
          />
          {frequentLoading ? <LinkCardGridSkeleton count={4} /> : <LinkGrid links={frequentToShow} compact />}
        </motion.section>
      )}

      {/* 6. Nổi bật */}
      {(featuredLoading || (featured && featured.length > 0)) && (
        <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
          className="rounded-xl border bg-card p-4 sm:p-5 shadow-sm"
        >
          <SectionHeader icon={TrendingUp} title="Nổi bật"
            action={(featuredHasMore || featuredExpanded) ? (
              <ExpandButton expanded={featuredExpanded} onToggle={() => setFeaturedExpanded(v => !v)} />
            ) : undefined}
          />
          {featuredLoading ? <LinkCardGridSkeleton count={4} /> : <LinkGrid links={featuredToShow} />}
        </motion.section>
      )}

      {/* 7. Mới cập nhật */}
      {(recentLoading || (recent && recent.length > 0)) && (
        <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.18 }}
          className="rounded-xl border bg-card p-4 sm:p-5 shadow-sm"
        >
          <SectionHeader icon={RefreshCw} title="Mới cập nhật"
            action={(recentHasMore || recentExpanded) ? (
              <ExpandButton expanded={recentExpanded} onToggle={() => setRecentExpanded(v => !v)} />
            ) : undefined}
          />
          {recentLoading ? <LinkCardGridSkeleton count={4} /> : <LinkGrid links={recentToShow} compact />}
        </motion.section>
      )}

      {/* 8. Tất cả hệ thống */}
      <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.22 }}
        className="rounded-xl border bg-card p-4 sm:p-5 shadow-sm"
      >
        <SectionHeader
          icon={Search}
          title="Tất cả hệ thống"
          count={allData?.total}
          action={
            (allData?.total ?? 0) > (allData?.links?.length ?? 0) ? (
              <Button variant="ghost" size="sm" asChild className="text-xs text-muted-foreground">
                <RouterLink to="/search">
                  Xem tất cả <ArrowRight className="h-3 w-3 ml-1" />
                </RouterLink>
              </Button>
            ) : undefined
          }
        />
        {allLoading ? (
          <LinkCardGridSkeleton count={6} />
        ) : (
          <LinkGrid
            links={allData?.links || []}
            emptyTitle="Chưa có link nào"
            emptyDescription="Hãy liên hệ quản trị viên để thêm dữ liệu."
          />
        )}
      </motion.section>
    </div>
  )
}
