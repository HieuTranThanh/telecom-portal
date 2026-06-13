import { useState, useEffect } from 'react'
import { Save, Loader2, Upload, Radio } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { PortalSettings, DEFAULT_SETTINGS } from '@/features/settings/useSettings'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'

const MAX_LOGO_SIZE = 1024 * 1024 // 1 MB — keep in sync with the hint shown next to the upload button

interface DbSetting {
  key: string
  value: unknown
  description: string | null
}

export function SettingsPage() {
  const qc = useQueryClient()
  const [settings, setSettings] = useState<PortalSettings>(DEFAULT_SETTINGS)
  const [descriptions, setDescriptions] = useState<Record<string, string | null>>({})
  const [isSaving, setIsSaving] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [pendingLogoFile, setPendingLogoFile] = useState<File | null>(null)
  const [logoPreviewUrl, setLogoPreviewUrl] = useState<string>('')
  const [logoImgError, setLogoImgError] = useState(false)

  useEffect(() => {
    loadSettings()
  }, [])

  // Revoke blob URL when it changes or on unmount to prevent memory leaks
  useEffect(() => {
    return () => {
      if (logoPreviewUrl) URL.revokeObjectURL(logoPreviewUrl)
    }
  }, [logoPreviewUrl])

  const loadSettings = async () => {
    try {
      const { data } = await supabase.from('system_settings').select('key, value, description')
      if (data) {
        const rows = data as DbSetting[]
        const valueMap = Object.fromEntries(rows.map(s => [s.key, s.value]))
        const descMap = Object.fromEntries(rows.map(s => [s.key, s.description]))
        setSettings(prev => ({ ...prev, ...valueMap }))
        setDescriptions(descMap)
      }
    } catch {
      // Use defaults silently
    } finally {
      setIsLoading(false)
    }
  }

  const handleLogoFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > MAX_LOGO_SIZE) {
      toast.error('File logo vượt quá 1 MB. Vui lòng chọn file nhỏ hơn.')
      e.target.value = ''
      return
    }
    if (logoPreviewUrl) URL.revokeObjectURL(logoPreviewUrl)
    setLogoPreviewUrl(URL.createObjectURL(file))
    setPendingLogoFile(file)
    setLogoImgError(false)
    e.target.value = ''
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      let currentSettings = { ...settings }

      if (pendingLogoFile) {
        // Delete old logo file from storage to avoid accumulation
        if (currentSettings.logo_url) {
          try {
            const urlObj = new URL(currentSettings.logo_url)
            if (urlObj.pathname.includes('/storage/v1/object/public/link-icons/')) {
              const oldPath = decodeURIComponent(urlObj.pathname.split('/link-icons/').pop() ?? '')
              if (oldPath) await supabase.storage.from('link-icons').remove([oldPath])
            }
          } catch { /* ignore */ }
        }

        const ext = pendingLogoFile.name.split('.').pop()
        const path = `portal/logo-${Date.now()}.${ext}`
        const { error: uploadError } = await supabase.storage
          .from('link-icons')
          .upload(path, pendingLogoFile)
        if (uploadError) throw uploadError
        const { data: urlData } = supabase.storage.from('link-icons').getPublicUrl(path)
        currentSettings = { ...currentSettings, logo_url: urlData.publicUrl }
        setSettings(currentSettings)
        setPendingLogoFile(null)
        URL.revokeObjectURL(logoPreviewUrl)
        setLogoPreviewUrl('')
      }

      const entries = Object.entries(currentSettings).map(([key, value]) => ({
        key,
        value,
        description: descriptions[key] ?? null,
        updated_at: new Date().toISOString(),
      }))

      const { error } = await supabase
        .from('system_settings')
        .upsert(entries, { onConflict: 'key' })
      if (error) throw error

      qc.invalidateQueries({ queryKey: ['portal_settings'] })
      toast.success('Đã lưu cài đặt')
    } catch (err) {
      toast.error(`Lỗi lưu cài đặt: ${(err as Error).message}`)
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold">Cài đặt hệ thống</h1>
        <p className="text-muted-foreground text-sm">Cấu hình chung cho Portal</p>
      </div>

      <div className="rounded-xl border bg-card p-6 space-y-6">
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Thông tin Portal</h3>

          <div className="space-y-2">
            <Label>Tên Portal</Label>
            <Input
              value={settings.portal_name}
              onChange={e => setSettings(s => ({ ...s, portal_name: e.target.value }))}
              placeholder="Portal Phòng Viễn thông"
            />
          </div>
        </div>

        <Separator />

        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Logo Portal</h3>

          <div className="flex items-start gap-4">
            {(logoPreviewUrl || settings.logo_url) && !logoImgError ? (
              <img
                src={logoPreviewUrl || settings.logo_url}
                alt=""
                className="h-14 w-14 object-contain rounded-xl flex-shrink-0"
                onError={() => setLogoImgError(true)}
              />
            ) : (
              <div className="h-14 w-14 rounded-xl bg-primary flex items-center justify-center flex-shrink-0">
                <Radio className="h-6 w-6 text-primary-foreground" />
              </div>
            )}

            <div className="flex-1 space-y-2">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">URL logo (dán link ảnh)</Label>
                <Input
                  value={settings.logo_url}
                  onChange={e => { setSettings(s => ({ ...s, logo_url: e.target.value })); setLogoImgError(false) }}
                  placeholder="https://example.com/logo.png"
                  className="text-sm"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="file"
                  accept="image/*,.svg"
                  id="logo-upload"
                  className="hidden"
                  onChange={handleLogoFileSelect}
                />
                <label
                  htmlFor="logo-upload"
                  className="inline-flex items-center gap-1.5 rounded-md border border-input bg-background px-3 h-8 text-xs font-medium cursor-pointer hover:bg-accent hover:text-accent-foreground transition-colors select-none"
                >
                  <Upload className="h-3.5 w-3.5" />
                  {pendingLogoFile
                    ? pendingLogoFile.name.substring(0, 24) + (pendingLogoFile.name.length > 24 ? '…' : '')
                    : 'Tải file lên'}
                </label>
                <span className="text-xs text-muted-foreground">PNG, JPG, SVG · tối đa 1 MB</span>
              </div>

              {pendingLogoFile && (
                <p className="text-xs text-green-600">File đã chọn — sẽ được tải lên khi nhấn Lưu cài đặt</p>
              )}

              <p className="text-xs text-muted-foreground">
                Logo hiển thị ở góc trái header. Để trống để dùng icon mặc định.
              </p>
            </div>
          </div>
        </div>

        <Separator />

        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Thông tin hỗ trợ</h3>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Email hỗ trợ</Label>
              <Input
                type="email"
                value={settings.support_email}
                onChange={e => setSettings(s => ({ ...s, support_email: e.target.value }))}
                placeholder="kythuat@company.vn"
              />
            </div>
            <div className="space-y-2">
              <Label>Số điện thoại</Label>
              <Input
                value={settings.support_phone}
                onChange={e => setSettings(s => ({ ...s, support_phone: e.target.value }))}
                placeholder="18001234"
              />
            </div>
          </div>
        </div>

        <Separator />

        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Hiệu suất</h3>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Số link mỗi trang (Tất cả hệ thống)</Label>
              <Input
                type="number"
                value={settings.default_page_size}
                onChange={e => setSettings(s => ({ ...s, default_page_size: parseInt(e.target.value) || 20 }))}
                min={5}
                max={100}
              />
              <p className="text-xs text-muted-foreground">Số link hiển thị trong mục Tất cả hệ thống (5–100)</p>
            </div>
            <div className="space-y-2">
              <Label>Số link mỗi mục highlight</Label>
              <Input
                type="number"
                value={settings.section_page_size}
                onChange={e => setSettings(s => ({ ...s, section_page_size: parseInt(e.target.value) || 8 }))}
                min={3}
                max={24}
              />
              <p className="text-xs text-muted-foreground">Giới hạn hiển thị cho Thường dùng / Nổi bật / Mới cập nhật / Yêu thích (3–24)</p>
            </div>
            <div className="space-y-2">
              <Label>Health Check Timeout (ms)</Label>
              <Input
                type="number"
                value={settings.health_check_timeout}
                onChange={e => setSettings(s => ({ ...s, health_check_timeout: parseInt(e.target.value) || 10000 }))}
                min={1000}
                max={60000}
                step={1000}
              />
            </div>
            <div className="space-y-2">
              <Label>Số link Quick Access tối đa</Label>
              <Input
                type="number"
                value={settings.quick_access_limit}
                onChange={e => setSettings(s => ({ ...s, quick_access_limit: parseInt(e.target.value) || 12 }))}
                min={1}
                max={20}
              />
              <p className="text-xs text-muted-foreground">Số link hiển thị trong khu vực Truy cập nhanh (1–20)</p>
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Đang lưu...</> : <><Save className="h-4 w-4 mr-2" />Lưu cài đặt</>}
          </Button>
        </div>
      </div>
    </div>
  )
}
