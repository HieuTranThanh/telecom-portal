# Portal Kỹ thuật Viễn thông — AI Context

**Dir:** `d:\My Drive\MobiFone\Sang kien\2026\Telecom Portal\` | Build: PASS | **Trả lời: Tiếng Việt**  
**Ref:** `docs/PROJECT_TODO.md` · `SETUP.md`

## Stack
Vite5 · React18 · TypeScript strict · Tailwind+shadcn/ui · React Router v6 · TanStack Query v5 · RHF+Zod · Supabase JS (Auth+Storage+PostgREST) · Framer Motion · Recharts · xlsx-js-style (lazy) · Sonner · Cloudflare Pages

```
VITE_SUPABASE_URL=       # anon key only — no service role at frontend
VITE_SUPABASE_ANON_KEY=
VITE_APP_NAME=Portal Phòng Viễn thông
```

## Routes
| Scope | Paths |
|---|---|
| Public | `/` `/category/:slug` `/search` `/links/:slug` `/login` |
| Admin (ProtectedRoute + React.lazy) | `/admin` `…/links` `…/categories` `…/tags` `…/announcements` `…/health-check` `…/import` `…/export` `…/settings` `…/quick-access` |
| Missing | `/admin/audit` |

## Source Structure
```
src/app/                  App.tsx, router.tsx
src/components/ui/        shadcn/ui (button card dialog table select badge dropdown input textarea label separator skeleton checkbox switch tabs scroll-area tooltip progress popover avatar)
src/components/layout/    PublicLayout · AdminLayout (mobile sidebar ✓) · Header · Footer
src/components/common/    ProtectedRoute · CommandPalette(Ctrl+K,debounce200ms) · AnnouncementBanner · ConfirmDialog · EmptyState · LoadingSkeleton
src/components/links/     LinkCard · LinkGrid · LinkStatusBadge · InternalBadge(Lock,blue)
src/components/admin/     LinkForm (sections: Basic/Category/Display/Advanced)
src/features/auth/        AuthContext → session,profile,isAdmin,signIn,signOut; SESSION_KEY/SESSION_DURATION_MS=24h
src/features/categories/  useCategories(activeOnly) · CRUD · mutation→invalidate linkKeys
src/features/links/       useLinks(filters,page) · useAllLinksAdmin · useLink(slug) · useFeaturedLinks · useFrequentLinks
                          useRecentlyUpdatedLinks · CRUD · useIncrementClick(fire&forget) · useUploadLinkIcon(file,oldIconUrl?)
                          useQuickAccessLinks · useReorderQuickAccess · extractStoragePath() · mapLinkWithTags()
src/features/tags/        useTags · CRUD · mutation→invalidate linkKeys.all+adminLinkKeys.all
src/features/announcements/ useAnnouncements(activeOnly) · CRUD
src/features/statistics/  useDashboardStats() — 6 parallel queries, limit(10000)
src/features/health-check/ useCheckSingleLink · useBulkHealthCheck · useLinkHealthHistory
src/features/settings/    usePortalSettings · PortalSettings · DEFAULT_SETTINGS
src/hooks/                useLocalStorage · useFavorites · useRecentLinks(max5)
src/lib/                  supabase.ts · query-client.ts(staleTime5min,gcTime30min)
                          utils.ts(cn,slugify,formatNumber,formatDate,formatDateTime,timeAgo,getDomain,getContrastTextColor)
                          validators.ts(linkSchema,categorySchema,announcementSchema,loginSchema,tagSchema)
src/types/index.ts        Category,Tag,Link,Announcement,Profile,SystemSetting,DashboardStats,
                          PaginationState,LinkFilters,ImportRow,ImportResult
src/constants/index.ts    APP_NAME,DEFAULT_PAGE_SIZE,STORAGE_KEYS,SORT_OPTIONS,IMPORT_TEMPLATE_HEADERS
supabase/migrations/      001_initial_schema.sql  (file duy nhất — chứa toàn bộ schema)
supabase/                 seed.sql · reset_to_production.sql
supabase/functions/       check-all-links/ (cron bulk) · check-link-health/ (single, CORS)
```

## DB Schema
```
profiles(id→auth.users, full_name, role text='admin', is_active bool)
categories(id, name, slug, description, icon, sort_order, is_active)
tags(id, name, slug, color #hex|null)
links(id, category_id, name, slug, url, description, detail_description, icon_url,
      business_status[active|suspended|expired], health_status[online|offline|unknown],
      is_featured, is_frequent, is_active, is_internal, is_quick_access, quick_access_order int,
      login_username text|null, login_password text|null,
      expires_at, click_count, last_clicked_at, last_checked_at, last_http_status, created_at, updated_at)
link_tags(link_id, tag_id)  -- composite PK
link_health_checks(id, link_id, status, http_status, response_time_ms, error_message, checked_at)
announcements(id, title, content, type[info|maintenance|warning|critical], is_active, starts_at, ends_at)
system_settings(id, key unique, value jsonb, description, updated_at)
```
RPCs: `is_admin()` · `increment_link_click(id)` · Trigger: `handle_new_user()` (auto-create profile on signup)

## Auth & Security
- RLS on all tables. Public = SELECT(is_active=true). Click tracking via RPC `increment_link_click(id)` (SECURITY DEFINER, callable by anon). Admin = CRUD via `is_admin()`.
- `is_admin()`: `profiles WHERE id=auth.uid() AND role='admin' AND is_active=true`
- **Create admin:** Auth→Add user → `UPDATE profiles SET role='admin' WHERE id='<uuid>'`
- Session 24h: `localStorage[SESSION_KEY]` timestamp, checked every 60s in AdminLayout, toast+signOut when expired

## Storage — Upload Pattern (NEVER upsert:true — bucket INSERT-only policy)
```
extractStoragePath(url)  →  relative path inside bucket (null if external URL)
1. remove([extractStoragePath(oldUrl)])   // ignore error
2. upload(`${id}-${Date.now()}.${ext}`, file)  // timestamp = cache bust
```
Buckets: `link-icons` (public)

## PortalSettings (stored in system_settings)
`{ portal_name, logo_url, support_email, support_phone, default_page_size, section_page_size, health_check_timeout, quick_access_limit }`

## Key Patterns & Conventions
- `cn()` className merge · `@/` path alias
- Mutations → `qc.invalidateQueries()` after. Tags/categories → also invalidate `linkKeys.all` + `adminLinkKeys.all`
- Date fields: `z.preprocess(toIsoOrNull, z.string().nullable().optional())` — empty string→null for Supabase
- Date picker: `DateSelect`/`DateTimeSelect` from `src/components/ui/date-select.tsx` (NOT native input — bad UX on Windows Chrome)
- Img error fallback (logo, icons):
  ```tsx
  const [err, setErr] = useState(false)
  useEffect(() => { setErr(false) }, [url])
  {url && !err ? <img onError={() => setErr(true)} /> : <FallbackIcon />}
  ```
- xlsx (Import/Export): **dynamic import only** — `await import('xlsx-js-style')` inside handlers; `await import('xlsx')` in reader.onload
- Health check: `is_internal=true` → skip entirely, return 'unknown'. External only via fetch+AbortController+no-cors
- `is_active=false` → hidden from all public views. `business_status` → visible but badge changes
- Tags color: hex → luminance contrast formula for text; null color → gray default
- Quick Access: HTML5 drag-and-drop + ↑↓ buttons, order saved immediately to DB via `useReorderQuickAccess`
- LinksPage admin: "Thuộc tính" column = 4 icon badges: ⭐is_featured · ⚡is_frequent · ⏻is_active · ⊞is_quick_access

## Edge Functions & Cron
- `check-all-links`: query `is_internal=false`, limit 5000, `Promise.allSettled` for DB writes, delete records >30 days
- `check-link-health`: single link, CORS headers, `Promise.allSettled`
- Cron: `0 */3 * * *` via pg_cron+pg_net (xem SETUP.md §8)

## Bundle (vite.config.ts manualChunks)
vendor-react · vendor-query · vendor-supabase · vendor-ui · vendor-charts · vendor-motion · vendor-xlsx (lazy — only loaded when Export/Import action triggered)
