export interface Category {
  id: string
  name: string
  slug: string
  description: string | null
  icon: string | null
  sort_order: number
  is_active: boolean
  created_at: string
  updated_at: string
  link_count?: number
}

export interface Tag {
  id: string
  name: string
  slug: string
  color: string | null
  created_at: string
  updated_at: string
}

export type BusinessStatus = 'active' | 'suspended' | 'expired'
export type HealthStatus = 'online' | 'offline' | 'unknown'
export type AnnouncementType = 'info' | 'maintenance' | 'warning' | 'critical'

export interface Link {
  id: string
  category_id: string | null
  name: string
  slug: string
  url: string
  description: string | null
  detail_description: string | null
  icon_url: string | null
  business_status: BusinessStatus
  health_status: HealthStatus
  is_featured: boolean
  is_frequent: boolean
  is_quick_access: boolean
  quick_access_order: number
  is_active: boolean
  is_internal: boolean
  health_check_exempt: boolean
  health_check_exempt_reason: string | null
  login_username: string | null
  login_password: string | null
  expires_at: string | null
  click_count: number
  last_clicked_at: string | null
  last_checked_at: string | null
  last_http_status: number | null
  created_at: string
  updated_at: string
  category?: Category | null
  tags?: Tag[]
  references?: LinkReference[]
}

export interface Announcement {
  id: string
  title: string
  content: string
  type: AnnouncementType
  is_active: boolean
  starts_at: string | null
  ends_at: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface Profile {
  id: string
  full_name: string | null
  role: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface LinkReference {
  id: string
  link_id: string
  title: string | null
  url: string
  sort_order: number
  created_at: string
}

export interface DashboardStats {
  total_links: number
  total_categories: number
  total_clicks: number
  internal_links: number
  online_links: number
  offline_links: number
  unknown_links: number
  suspended_links: number
  top_links: Array<{
    id: string
    name: string
    slug: string
    click_count: number
    category_name: string | null
  }>
  recent_errors: Link[]
  recently_updated: Link[]
}

export interface LinkFilters {
  search?: string
  category_id?: string
  no_category?: boolean
  business_status?: BusinessStatus | 'all'
  health_status?: HealthStatus | 'all'
  is_featured?: boolean
  is_frequent?: boolean
  is_quick_access?: boolean
  is_internal?: boolean
  is_active?: boolean
  no_attributes?: boolean
  sort?: 'name_asc' | 'name_desc' | 'click_count_asc' | 'click_count_desc' | 'updated_asc' | 'updated_desc' | 'frequent'
}

export interface ImportRow {
  name: string
  url: string
  description?: string
  detail_description?: string
  category?: string
  tags?: string
  is_featured?: string | boolean
  is_frequent?: string | boolean
  is_active?: string | boolean
  is_quick_access?: string | boolean
  is_internal?: string | boolean
  business_status?: string
  slug?: string
}

export interface ImportResult {
  success: number
  inserted: number
  updated: number
  failed: number
  errors: Array<{ row: number; message: string; data: ImportRow }>
}
