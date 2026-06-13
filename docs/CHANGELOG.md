# CHANGELOG

## [1.0.0] — 2026-05-31 (Initial + Production Audits)

**Release:** Vite5+React18+TS · shadcn/ui · TanStack Query v5 · Supabase (Auth+Storage+PostgREST+RLS) · Recharts · xlsx-js-style · Cloudflare Pages

**Features:** Public portal (search/filter/CommandPalette/favorites/recent) · Admin CRUD (links/categories/tags/announcements/health-check/import/export/settings/quick-access) · Health Check Edge Functions · Cron 3h · is_internal links · drag-and-drop quick access · lazy xlsx

**5 audit rounds (2026-05-31–06-01):** 30+ issues fixed. Final state: 0 TS errors, 0 dead code, 0 console.log, all img onError fallbacks, all DB errors surfaced. See git log for details.

**Audit round 6 (2026-06-03):** Import ordering fixes (LinksPage, CommandPalette, QuickAccessPage) · `getTagMatchingLinkIds` exported+deduped · `DISMISSED_ANNOUNCEMENTS` centralized in STORAGE_KEYS · `WRITABLE_COLS` derived from `IMPORT_TEMPLATE_HEADERS.length` · `YEARS` array dynamic · `.scrollbar-none` WebKit CSS · `@tanstack/react-query-devtools` removed · `chunkSizeWarningLimit: 1500` in vite.config.
