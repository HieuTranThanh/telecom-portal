import { createBrowserRouter, Navigate } from 'react-router-dom'
import { lazy, Suspense, type ReactNode } from 'react'
import { ProtectedRoute } from '@/components/common/ProtectedRoute'
import { PublicLayout } from '@/components/layout/PublicLayout'
import { AdminLayout } from '@/components/layout/AdminLayout'

import { HomePage } from '@/pages/public/HomePage'
import { CategoryPage } from '@/pages/public/CategoryPage'
import { SearchPage } from '@/pages/public/SearchPage'
import { LinkDetailPage } from '@/pages/public/LinkDetailPage'
import { LoginPage } from '@/pages/public/LoginPage'

// Admin pages loaded lazily — excluded from initial bundle (keeps public UX fast)
const DashboardPage    = lazy(() => import('@/pages/admin/DashboardPage').then(m => ({ default: m.DashboardPage })))
const LinksPage        = lazy(() => import('@/pages/admin/LinksPage').then(m => ({ default: m.LinksPage })))
const CategoriesPage   = lazy(() => import('@/pages/admin/CategoriesPage').then(m => ({ default: m.CategoriesPage })))
const ImportPage       = lazy(() => import('@/pages/admin/ImportPage').then(m => ({ default: m.ImportPage })))
const ExportPage       = lazy(() => import('@/pages/admin/ExportPage').then(m => ({ default: m.ExportPage })))
const HealthCheckPage  = lazy(() => import('@/pages/admin/HealthCheckPage').then(m => ({ default: m.HealthCheckPage })))
const AnnouncementsPage = lazy(() => import('@/pages/admin/AnnouncementsPage').then(m => ({ default: m.AnnouncementsPage })))
const TagsPage         = lazy(() => import('@/pages/admin/TagsPage').then(m => ({ default: m.TagsPage })))
const SettingsPage     = lazy(() => import('@/pages/admin/SettingsPage').then(m => ({ default: m.SettingsPage })))
const QuickAccessPage  = lazy(() => import('@/pages/admin/QuickAccessPage').then(m => ({ default: m.QuickAccessPage })))

function AdminSuspense({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-[40vh] text-muted-foreground text-sm">Đang tải...</div>}>
      {children}
    </Suspense>
  )
}

export const router = createBrowserRouter([
  {
    path: '/',
    element: <PublicLayout />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'category/:slug', element: <CategoryPage /> },
      { path: 'search', element: <SearchPage /> },
      { path: 'links/:slug', element: <LinkDetailPage /> },
    ],
  },
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/admin',
    element: (
      <ProtectedRoute>
        <AdminLayout />
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <AdminSuspense><DashboardPage /></AdminSuspense> },
      { path: 'links', element: <AdminSuspense><LinksPage /></AdminSuspense> },
      { path: 'categories', element: <AdminSuspense><CategoriesPage /></AdminSuspense> },
      { path: 'import', element: <AdminSuspense><ImportPage /></AdminSuspense> },
      { path: 'export', element: <AdminSuspense><ExportPage /></AdminSuspense> },
      { path: 'health-check', element: <AdminSuspense><HealthCheckPage /></AdminSuspense> },
      { path: 'statistics', element: <Navigate to="/admin" replace /> },
      { path: 'announcements', element: <AdminSuspense><AnnouncementsPage /></AdminSuspense> },
      { path: 'tags', element: <AdminSuspense><TagsPage /></AdminSuspense> },
      { path: 'settings', element: <AdminSuspense><SettingsPage /></AdminSuspense> },
      { path: 'quick-access', element: <AdminSuspense><QuickAccessPage /></AdminSuspense> },
    ],
  },
  {
    path: '*',
    element: <Navigate to="/" replace />,
  },
])
