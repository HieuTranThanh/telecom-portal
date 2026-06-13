import { useEffect, useState } from 'react'
import { useForm, Controller, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2, Globe, Upload, LayoutGrid, Check, Lock, Plus, Trash2, BookOpen, KeyRound, Pin } from 'lucide-react'
import { linkSchema, LinkFormValues } from '@/lib/validators'
import { Link } from '@/types'
import { useCategories } from '@/features/categories/useCategories'
import { useTags } from '@/features/tags/useTags'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { DateSelect } from '@/components/ui/date-select'
import { toast } from 'sonner'
import { cn, getContrastTextColor } from '@/lib/utils'

const MAX_ICON_SIZE = 1024 * 1024 // 1 MB — keep in sync with the hint shown below the upload button

function toLocalDateInput(iso: string | null | undefined): string {
  if (!iso) return ''
  const d = new Date(iso)
  return isNaN(d.getTime()) ? '' :
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

interface LinkFormProps {
  defaultValues?: Partial<Link>
  onSubmit: (values: LinkFormValues, iconFile?: File) => void
  isLoading?: boolean
}

export function LinkForm({ defaultValues, onSubmit, isLoading }: LinkFormProps) {
  const { data: categories } = useCategories(true)
  const { data: tags } = useTags()
  const [pendingIconFile, setPendingIconFile] = useState<File | null>(null)
  const [iconPreviewUrl, setIconPreviewUrl] = useState<string>('')

  const { register, handleSubmit, control, setValue, watch, formState: { errors } } = useForm<LinkFormValues>({
    resolver: zodResolver(linkSchema),
    defaultValues: {
      name: defaultValues?.name ?? '',
      url: defaultValues?.url ?? '',
      description: defaultValues?.description ?? '',
      detail_description: defaultValues?.detail_description ?? '',
      category_id: defaultValues?.category_id ?? null,
      tags: defaultValues?.tags?.map(t => t.id) ?? [],
      references: defaultValues?.references?.map(r => ({ title: r.title ?? '', url: r.url })) ?? [],
      business_status: defaultValues?.business_status ?? 'active',
      is_featured: defaultValues?.is_featured ?? false,
      is_frequent: defaultValues?.is_frequent ?? false,
      is_quick_access: defaultValues?.is_quick_access ?? false,
      quick_access_order: defaultValues?.quick_access_order ?? 0,
      is_active: defaultValues?.is_active ?? true,
      is_internal: defaultValues?.is_internal ?? false,
      health_check_exempt: defaultValues?.health_check_exempt ?? false,
      health_check_exempt_reason: defaultValues?.health_check_exempt_reason ?? '',
      health_status_override: defaultValues?.health_status ?? 'unknown',
      login_username: defaultValues?.login_username ?? '',
      login_password: defaultValues?.login_password ?? '',
      expires_at: toLocalDateInput(defaultValues?.expires_at),
      icon_url: defaultValues?.icon_url ?? '',
    },
  })

  const { fields: refFields, append: appendRef, remove: removeRef } = useFieldArray({ control, name: 'references' })

  const selectedTagIds = watch('tags') || []
  const iconUrlValue = watch('icon_url')
  const isQuickAccess = watch('is_quick_access')
  const healthCheckExempt = watch('health_check_exempt')

  const [iconImgErr, setIconImgErr] = useState(false)

  // Clean up object URL when file changes or component unmounts
  useEffect(() => {
    return () => {
      if (iconPreviewUrl) URL.revokeObjectURL(iconPreviewUrl)
    }
  }, [iconPreviewUrl])

  // Reset icon error when displayed URL changes (new file or new URL typed)
  const displayIconUrl = iconPreviewUrl || iconUrlValue
  useEffect(() => { setIconImgErr(false) }, [displayIconUrl])

  const toggleTag = (tagId: string) => {
    const current = selectedTagIds
    const newTags = current.includes(tagId)
      ? current.filter(id => id !== tagId)
      : [...current, tagId]
    setValue('tags', newTags)
  }

  const handleIconFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > MAX_ICON_SIZE) {
      toast.error('File icon vượt quá 1 MB. Vui lòng chọn file nhỏ hơn.')
      e.target.value = ''
      return
    }
    // Revoke old preview URL
    if (iconPreviewUrl) URL.revokeObjectURL(iconPreviewUrl)
    const objectUrl = URL.createObjectURL(file)
    setPendingIconFile(file)
    setIconPreviewUrl(objectUrl)
    e.target.value = ''
  }

  const handleFormSubmit = (values: LinkFormValues) => {
    onSubmit(values, pendingIconFile ?? undefined)
  }

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Thông tin cơ bản</h3>

        <div className="space-y-2">
          <Label htmlFor="name">Tên hệ thống <span className="text-destructive">*</span></Label>
          <Input id="name" {...register('name')} placeholder="VD: KPI Dashboard" />
          {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="url">URL <span className="text-destructive">*</span></Label>
          <Input id="url" {...register('url')} placeholder="https://..." />
          {errors.url && <p className="text-xs text-destructive">{errors.url.message}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Mô tả ngắn</Label>
          <Input id="description" {...register('description')} placeholder="Mô tả ngắn gọn..." />
        </div>

        <div className="space-y-2">
          <Label htmlFor="detail_description">Mô tả chi tiết</Label>
          <Textarea id="detail_description" {...register('detail_description')} rows={3} placeholder="Mô tả chi tiết..." />
        </div>
      </div>

      <Separator />

      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Icon / Logo</h3>
        <div className="flex items-start gap-4">
          {/* Preview */}
          <div className="h-14 w-14 rounded-xl bg-muted border flex items-center justify-center overflow-hidden flex-shrink-0">
            {displayIconUrl && !iconImgErr ? (
              <img src={displayIconUrl} alt="" className="h-12 w-12 object-contain" onError={() => setIconImgErr(true)} />
            ) : (
              <Globe className="h-6 w-6 text-muted-foreground" />
            )}
          </div>

          <div className="flex-1 space-y-2">
            <div className="space-y-1">
              <Label htmlFor="icon_url" className="text-xs text-muted-foreground">URL icon (dán link favicon hoặc logo)</Label>
              <Input
                id="icon_url"
                {...register('icon_url')}
                placeholder="https://example.com/favicon.ico"
                className="text-sm"
              />
              {errors.icon_url && <p className="text-xs text-destructive">{errors.icon_url.message}</p>}
            </div>

            {/* File upload — available in both create and edit mode */}
            <div className="flex items-center gap-2">
              <input
                type="file"
                accept="image/*,.ico,.svg"
                id="icon-upload"
                className="hidden"
                onChange={handleIconFileSelect}
              />
              <label
                htmlFor="icon-upload"
                className="inline-flex items-center gap-1.5 rounded-md border border-input bg-background px-3 h-8 text-xs font-medium cursor-pointer hover:bg-accent hover:text-accent-foreground transition-colors select-none"
              >
                <Upload className="h-3.5 w-3.5" />
                {pendingIconFile ? pendingIconFile.name.substring(0, 20) + (pendingIconFile.name.length > 20 ? '…' : '') : 'Tải file lên'}
              </label>
              <span className="text-xs text-muted-foreground">PNG, JPG, SVG, ICO · tối đa 1 MB</span>
            </div>
            {pendingIconFile && (
              <p className="text-xs text-green-600">File đã chọn — sẽ được tải lên khi lưu</p>
            )}
          </div>
        </div>
      </div>

      <Separator />

      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Phân loại</h3>

        <div className="space-y-2">
          <Label>Danh mục</Label>
          <Controller
            name="category_id"
            control={control}
            render={({ field }) => (
              <Select value={field.value || 'none'} onValueChange={v => field.onChange(v === 'none' ? null : v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Chọn danh mục" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Không có danh mục</SelectItem>
                  {categories?.map(cat => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.icon} {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </div>

        {tags && tags.length > 0 && (
          <div className="space-y-2">
            <Label>Tags</Label>
            <div className="flex flex-wrap gap-2">
              {tags.map(tag => {
                const selected = selectedTagIds.includes(tag.id)
                const hasColor = !!tag.color && /^#[0-9A-Fa-f]{6}$/.test(tag.color)
                return (
                  <button
                    key={tag.id}
                    type="button"
                    onClick={() => toggleTag(tag.id)}
                    className={cn(
                      'inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium transition-all border-2',
                      selected && !hasColor && 'bg-primary text-primary-foreground border-primary',
                      !selected && !hasColor && 'bg-background text-muted-foreground border-input hover:bg-accent',
                      selected && hasColor && 'opacity-100',
                      !selected && hasColor && 'bg-transparent opacity-40 hover:opacity-75',
                    )}
                    style={hasColor ? {
                      ...(selected
                        ? { backgroundColor: tag.color!, color: getContrastTextColor(tag.color!) }
                        : { color: tag.color! }),
                      borderColor: tag.color!,
                    } : undefined}
                  >
                    {selected && <Check className="h-3 w-3 shrink-0" />}
                    #{tag.name}
                  </button>
                )
              })}
            </div>
          </div>
        )}
      </div>

      <Separator />

      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Hiển thị</h3>

        <div className="space-y-2">
          <Label>Trạng thái nghiệp vụ</Label>
          <Controller
            name="business_status"
            control={control}
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Hoạt động</SelectItem>
                  <SelectItem value="suspended">Tạm ngưng</SelectItem>
                  <SelectItem value="expired">Hết hạn</SelectItem>
                </SelectContent>
              </Select>
            )}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Controller
            name="is_featured"
            control={control}
            render={({ field }) => (
              <label className="flex items-center gap-2.5 cursor-pointer">
                <Switch checked={field.value} onCheckedChange={field.onChange} />
                <span className="text-sm">Link nổi bật</span>
              </label>
            )}
          />
          <Controller
            name="is_frequent"
            control={control}
            render={({ field }) => (
              <label className="flex items-center gap-2.5 cursor-pointer">
                <Switch checked={field.value} onCheckedChange={field.onChange} />
                <span className="text-sm">Thường dùng</span>
              </label>
            )}
          />
          <Controller
            name="is_active"
            control={control}
            render={({ field }) => (
              <label className="flex items-center gap-2.5 cursor-pointer">
                <Switch checked={field.value} onCheckedChange={field.onChange} />
                <span className="text-sm">Kích hoạt</span>
              </label>
            )}
          />
        </div>

        <div className="rounded-lg border border-blue-200 bg-blue-50/50 p-4 space-y-1.5">
          <div className="flex items-center gap-2 mb-1">
            <Lock className="h-4 w-4 text-blue-600" />
            <span className="text-sm font-medium text-blue-700">Link nội bộ</span>
          </div>
          <Controller
            name="is_internal"
            control={control}
            render={({ field }) => (
              <label className="flex items-center gap-2.5 cursor-pointer">
                <Switch checked={field.value} onCheckedChange={field.onChange} />
                <span className="text-sm">Chỉ truy cập được trong mạng nội bộ</span>
              </label>
            )}
          />
          <p className="text-xs text-blue-600/80 pl-1">
            Khi bật: bỏ qua kiểm tra online/offline tự động. Hiển thị badge "VPN" trên portal.
          </p>
        </div>

        <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 space-y-3">
          <div className="flex items-center gap-2 mb-1">
            <LayoutGrid className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium text-primary">Quick Access</span>
          </div>
          <Controller
            name="is_quick_access"
            control={control}
            render={({ field }) => (
              <label className="flex items-center gap-2.5 cursor-pointer">
                <Switch checked={field.value} onCheckedChange={field.onChange} />
                <span className="text-sm">Hiển thị trong khu vực Truy cập nhanh</span>
              </label>
            )}
          />
          {isQuickAccess && (
            <p className="text-xs text-muted-foreground pl-1">
              Để sắp xếp vị trí hiển thị, vào menu <span className="font-medium text-foreground">Quản lý Quick Access</span>.
            </p>
          )}
        </div>

        <div className="rounded-lg border border-amber-200 bg-amber-50/50 p-4 space-y-3">
          <div className="flex items-center gap-2 mb-1">
            <Pin className="h-4 w-4 text-amber-600" />
            <span className="text-sm font-medium text-amber-700">Khóa trạng thái thủ công</span>
          </div>
          <Controller
            name="health_check_exempt"
            control={control}
            render={({ field }) => (
              <label className="flex items-center gap-2.5 cursor-pointer">
                <Switch checked={field.value} onCheckedChange={field.onChange} />
                <span className="text-sm">Bỏ qua kiểm tra tự động, dùng trạng thái cố định</span>
              </label>
            )}
          />
          {healthCheckExempt && (
            <div className="space-y-3 pl-1">
              <div className="space-y-2">
                <Label>Trạng thái cố định</Label>
                <Controller
                  name="health_status_override"
                  control={control}
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="online">Online</SelectItem>
                        <SelectItem value="offline">Offline</SelectItem>
                        <SelectItem value="unknown">Không rõ</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="health_check_exempt_reason">Lý do (không bắt buộc)</Label>
                <Input
                  id="health_check_exempt_reason"
                  {...register('health_check_exempt_reason')}
                  placeholder="VD: Server kiểm tra bị WAF chặn, link vẫn truy cập bình thường"
                />
              </div>
            </div>
          )}
          <p className="text-xs text-amber-600/80 pl-1">
            Khi bật: bỏ qua kiểm tra online/offline tự động, trạng thái hiển thị sẽ luôn cố định theo lựa chọn ở trên.
          </p>
        </div>
      </div>

      <Separator />

      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <BookOpen className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Tài liệu / Link tham khảo</h3>
        </div>

        {refFields.length > 0 && (
          <div className="space-y-3">
            {refFields.map((field, index) => (
              <div key={field.id} className="flex items-start gap-2 rounded-lg border bg-muted/30 p-3">
                <div className="flex-1 space-y-2">
                  <Input
                    {...register(`references.${index}.title`)}
                    placeholder="Tiêu đề (không bắt buộc)"
                    className="text-sm"
                  />
                  <Input
                    {...register(`references.${index}.url`)}
                    placeholder="https://..."
                    className="text-sm font-mono"
                  />
                  {errors.references?.[index]?.url && (
                    <p className="text-xs text-destructive">{errors.references[index].url?.message}</p>
                  )}
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="mt-0.5 h-8 w-8 text-muted-foreground hover:text-destructive"
                  onClick={() => removeRef(index)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}

        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-1.5"
          onClick={() => appendRef({ title: '', url: '' })}
        >
          <Plus className="h-3.5 w-3.5" />
          Thêm tài liệu
        </Button>
        <p className="text-xs text-muted-foreground">Thêm link tài liệu, hướng dẫn sử dụng, hoặc link tham khảo liên quan.</p>
      </div>

      <Separator />

      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <KeyRound className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Thông tin đăng nhập</h3>
        </div>
        <p className="text-xs text-muted-foreground -mt-2">Tuỳ chọn — hiển thị nút 🔑 trên card để xem nhanh. Để trống nếu không có.</p>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="login_username">Tên đăng nhập</Label>
            <Input id="login_username" {...register('login_username')} placeholder="admin" autoComplete="off" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="login_password">Mật khẩu</Label>
            <Input
              id="login_password"
              type="text"
              {...register('login_password')}
              placeholder="Nhập mật khẩu"
              autoComplete="off"
            />
          </div>
        </div>
      </div>

      <Separator />

      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Nâng cao</h3>
        <div className="space-y-2">
          <Label>Ngày hết hạn (không bắt buộc)</Label>
          <Controller
            name="expires_at"
            control={control}
            render={({ field }) => (
              <DateSelect value={field.value} onChange={field.onChange} />
            )}
          />
          <p className="text-xs text-muted-foreground">Ngày link/hệ thống hết hạn. Để trống nếu dùng vĩnh viễn.</p>
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-2">
        <Button type="submit" disabled={isLoading}>
          {isLoading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Đang lưu...</> : 'Lưu'}
        </Button>
      </div>
    </form>
  )
}
