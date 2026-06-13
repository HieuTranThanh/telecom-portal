import { z } from 'zod'

// Preprocess datetime fields: convert '' or null/undefined → null, valid strings → ISO UTC
const toIsoOrNull = (v: unknown): string | null => {
  if (!v || v === '') return null
  try {
    const d = new Date(v as string)
    return isNaN(d.getTime()) ? null : d.toISOString()
  } catch {
    return null
  }
}

const linkReferenceItemSchema = z.object({
  title: z.string().max(200).optional().nullable(),
  url: z.string().url('URL tham khảo không hợp lệ'),
})

export const linkSchema = z.object({
  name: z.string().min(1, 'Tên hệ thống không được để trống').max(200),
  url: z.string().url('URL không hợp lệ'),
  description: z.string().max(500).optional().nullable(),
  detail_description: z.string().optional().nullable(),
  category_id: z.string().uuid().optional().nullable(),
  tags: z.array(z.string().uuid()).optional().default([]),
  references: z.array(linkReferenceItemSchema).optional().default([]),
  business_status: z.enum(['active', 'suspended', 'expired']).default('active'),
  is_featured: z.boolean().default(false),
  is_frequent: z.boolean().default(false),
  is_quick_access: z.boolean().default(false),
  quick_access_order: z.coerce.number().min(0).default(0),
  is_active: z.boolean().default(true),
  is_internal: z.boolean().default(false),
  health_check_exempt: z.boolean().default(false),
  health_check_exempt_reason: z.string().max(500).optional().nullable(),
  health_status_override: z.enum(['online', 'offline', 'unknown']).default('unknown'),
  login_username: z.string().max(200).optional().nullable(),
  login_password: z.string().max(500).optional().nullable(),
  expires_at: z.preprocess(toIsoOrNull, z.string().nullable().optional()),
  icon_url: z.preprocess(v => (v === '' ? null : v), z.string().url('URL icon không hợp lệ').nullable().optional()),
})

export type LinkFormValues = z.infer<typeof linkSchema>

export const categorySchema = z.object({
  name: z.string().min(1, 'Tên danh mục không được để trống').max(100),
  slug: z.string().min(1, 'Slug không được để trống').regex(/^[a-z0-9-]+$/, 'Slug chỉ được chứa chữ thường, số và dấu gạch ngang'),
  description: z.string().max(500).optional().nullable(),
  icon: z.string().max(10).optional().nullable(),
  sort_order: z.number().int().min(0).default(0),
  is_active: z.boolean().default(true),
})

export type CategoryFormValues = z.infer<typeof categorySchema>

export const announcementSchema = z.object({
  title: z.string().min(1, 'Tiêu đề không được để trống').max(200),
  content: z.string().min(1, 'Nội dung không được để trống'),
  type: z.enum(['info', 'maintenance', 'warning', 'critical']).default('info'),
  is_active: z.boolean().default(true),
  starts_at: z.preprocess(toIsoOrNull, z.string().nullable().optional()),
  ends_at: z.preprocess(toIsoOrNull, z.string().nullable().optional()),
})

export type AnnouncementFormValues = z.infer<typeof announcementSchema>

export const loginSchema = z.object({
  email: z.string().email('Email không hợp lệ'),
  password: z.string().min(6, 'Mật khẩu tối thiểu 6 ký tự'),
})

export type LoginFormValues = z.infer<typeof loginSchema>

export const tagSchema = z.object({
  name: z.string().min(1, 'Tên tag không được để trống').max(50),
  slug: z.string().min(1).regex(/^[a-z0-9-]+$/),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Màu phải là mã hex 6 ký tự (VD: #2563EB)').optional().nullable(),
})

export type TagFormValues = z.infer<typeof tagSchema>
