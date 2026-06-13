export const APP_NAME = import.meta.env.VITE_APP_NAME || 'Portal Nội bộ'

export const DEFAULT_PAGE_SIZE = 20

export const ANNOUNCEMENT_TYPE_LABELS: Record<string, string> = {
  info: 'Thông tin',
  maintenance: 'Bảo trì',
  warning: 'Cảnh báo',
  critical: 'Khẩn cấp',
}

export const SORT_OPTIONS = [
  { value: 'updated_desc', label: 'Mới cập nhật' },
  { value: 'click_count_desc', label: 'Nhiều lượt truy cập' },
  { value: 'name_asc', label: 'A → Z' },
  { value: 'name_desc', label: 'Z → A' },
  { value: 'frequent', label: 'Thường dùng' },
]

export const STORAGE_KEYS = {
  FAVORITES: 'portal_favorites',
  RECENT: 'portal_recent',
  QUICK_ACCESS_PINS: 'portal_quick_access_pins',
  DISMISSED_ANNOUNCEMENTS: 'portal_dismissed',
} as const

export const MAX_RECENT_ITEMS = 5

export const HEALTH_CHECK_TIMEOUT_MS = 10000

// Writable columns — used for import and the editable part of export
export const IMPORT_TEMPLATE_HEADERS = [
  'name',
  'url',
  'description',
  'detail_description',
  'category',
  'tags',
  'is_featured',
  'is_frequent',
  'is_active',
  'is_quick_access',
  'is_internal',
  'business_status',
  'slug',
]
