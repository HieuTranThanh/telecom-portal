import { useState } from 'react'
import { Plus, Edit, Trash2, MoreHorizontal, Bell } from 'lucide-react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useAnnouncements, useCreateAnnouncement, useUpdateAnnouncement, useDeleteAnnouncement } from '@/features/announcements/useAnnouncements'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { EmptyState } from '@/components/common/EmptyState'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { DateTimeSelect } from '@/components/ui/date-select'
import { announcementSchema, AnnouncementFormValues } from '@/lib/validators'
import { Announcement, AnnouncementType } from '@/types'
import { formatDateTime } from '@/lib/utils'
import { ANNOUNCEMENT_TYPE_LABELS } from '@/constants'

function toLocalDatetimeInput(iso: string | null | undefined): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (isNaN(d.getTime())) return ''
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}T${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

const typeVariants: Record<AnnouncementType, string> = {
  info: 'text-blue-700 bg-blue-50 border-blue-200',
  maintenance: 'text-orange-700 bg-orange-50 border-orange-200',
  warning: 'text-amber-700 bg-amber-50 border-amber-200',
  critical: 'text-red-700 bg-red-50 border-red-200',
}

function AnnouncementForm({ defaultValues, onSubmit, isLoading }: {
  defaultValues?: Partial<Announcement>
  onSubmit: (v: AnnouncementFormValues) => void
  isLoading?: boolean
}) {
  const { register, handleSubmit, control, formState: { errors } } = useForm<AnnouncementFormValues>({
    resolver: zodResolver(announcementSchema),
    defaultValues: {
      title: defaultValues?.title ?? '',
      content: defaultValues?.content ?? '',
      type: (defaultValues?.type as AnnouncementType) ?? 'info',
      is_active: defaultValues?.is_active ?? true,
      starts_at: toLocalDatetimeInput(defaultValues?.starts_at),
      ends_at: toLocalDatetimeInput(defaultValues?.ends_at),
    },
  })

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label>Tiêu đề *</Label>
        <Input {...register('title')} placeholder="VD: OSS bảo trì lúc 22:00" />
        {errors.title && <p className="text-xs text-destructive">{errors.title.message}</p>}
      </div>

      <div className="space-y-2">
        <Label>Nội dung *</Label>
        <Textarea {...register('content')} rows={3} placeholder="Chi tiết thông báo..." />
        {errors.content && <p className="text-xs text-destructive">{errors.content.message}</p>}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Loại thông báo</Label>
          <Controller
            name="type"
            control={control}
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(ANNOUNCEMENT_TYPE_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </div>
        <div className="flex items-end pb-1">
          <Controller
            name="is_active"
            control={control}
            render={({ field }) => (
              <label className="flex items-center gap-2 cursor-pointer">
                <Switch checked={field.value} onCheckedChange={field.onChange} />
                <span className="text-sm">Kích hoạt</span>
              </label>
            )}
          />
        </div>
      </div>

      <div className="space-y-3">
        <div className="space-y-2">
          <Label>Ngày &amp; giờ bắt đầu hiển thị</Label>
          <Controller
            name="starts_at"
            control={control}
            render={({ field }) => (
              <DateTimeSelect value={field.value} onChange={field.onChange} />
            )}
          />
        </div>
        <div className="space-y-2">
          <Label>Ngày &amp; giờ kết thúc (tự ẩn)</Label>
          <Controller
            name="ends_at"
            control={control}
            render={({ field }) => (
              <DateTimeSelect value={field.value} onChange={field.onChange} />
            )}
          />
        </div>
        <p className="text-xs text-muted-foreground">Để trống = không giới hạn thời gian. Thông báo chỉ hiện khi đang trong khoảng bắt đầu → kết thúc.</p>
      </div>

      <div className="flex justify-end pt-2">
        <Button type="submit" disabled={isLoading}>
          {isLoading ? 'Đang lưu...' : 'Lưu'}
        </Button>
      </div>
    </form>
  )
}

export function AnnouncementsPage() {
  const { data: announcements, isLoading } = useAnnouncements()
  const { mutate: create, isPending: isCreating } = useCreateAnnouncement()
  const { mutate: update, isPending: isUpdating } = useUpdateAnnouncement()
  const { mutate: remove } = useDeleteAnnouncement()
  const [formOpen, setFormOpen] = useState(false)
  const [editItem, setEditItem] = useState<Announcement | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const handleClose = () => { setFormOpen(false); setEditItem(null) }

  const handleSubmit = (values: AnnouncementFormValues) => {
    if (editItem) update({ id: editItem.id, values }, { onSuccess: handleClose })
    else create(values, { onSuccess: handleClose })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Quản lý Thông báo</h1>
          <p className="text-muted-foreground text-sm">{announcements?.length ?? 0} thông báo</p>
        </div>
        <Button onClick={() => setFormOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />Thêm thông báo
        </Button>
      </div>

      <div className="rounded-xl border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Tiêu đề</TableHead>
              <TableHead>Loại</TableHead>
              <TableHead className="hidden md:table-cell">Thời gian</TableHead>
              <TableHead>Trạng thái</TableHead>
              <TableHead className="w-10"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 5 }).map((_, j) => (
                    <TableCell key={j}><Skeleton className="h-5 w-full" /></TableCell>
                  ))}
                </TableRow>
              ))
            ) : announcements?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5}>
                  <EmptyState icon={Bell} title="Chưa có thông báo" description="Tạo thông báo đầu tiên." />
                </TableCell>
              </TableRow>
            ) : (
              announcements?.map(item => (
                <TableRow key={item.id}>
                  <TableCell>
                    <p className="font-medium text-sm">{item.title}</p>
                    <p className="text-xs text-muted-foreground truncate max-w-xs">{item.content}</p>
                  </TableCell>
                  <TableCell>
                    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${typeVariants[item.type] || ''}`}>
                      {ANNOUNCEMENT_TYPE_LABELS[item.type]}
                    </span>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <div className="text-xs text-muted-foreground">
                      {item.starts_at && <div>Bắt đầu: {formatDateTime(item.starts_at)}</div>}
                      {item.ends_at && <div>Kết thúc: {formatDateTime(item.ends_at)}</div>}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={item.is_active ? 'default' : 'secondary'}>
                      {item.is_active ? 'Hiển thị' : 'Ẩn'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => { setEditItem(item); setFormOpen(true) }}>
                          <Edit className="h-4 w-4 mr-2" />Sửa
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => setDeleteId(item.id)} className="text-destructive">
                          <Trash2 className="h-4 w-4 mr-2" />Xóa
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={formOpen} onOpenChange={handleClose}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editItem ? 'Sửa thông báo' : 'Thêm thông báo mới'}</DialogTitle>
          </DialogHeader>
          <AnnouncementForm
            defaultValues={editItem || undefined}
            onSubmit={handleSubmit}
            isLoading={isCreating || isUpdating}
          />
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={open => !open && setDeleteId(null)}
        title="Xóa thông báo này?"
        description="Thông báo sẽ bị xóa vĩnh viễn."
        confirmText="Xóa"
        onConfirm={() => { if (deleteId) remove(deleteId, { onSuccess: () => setDeleteId(null) }) }}
      />
    </div>
  )
}
