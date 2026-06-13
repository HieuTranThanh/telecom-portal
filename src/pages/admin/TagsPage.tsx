import { useState, useEffect } from 'react'
import { Plus, Trash2, Hash, Edit, Palette } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useTags, useCreateTag, useUpdateTag, useDeleteTag } from '@/features/tags/useTags'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { EmptyState } from '@/components/common/EmptyState'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { tagSchema, TagFormValues } from '@/lib/validators'
import { Tag } from '@/types'
import { slugify, getContrastTextColor } from '@/lib/utils'

function TagForm({
  defaultValues,
  onSubmit,
  isLoading,
}: {
  defaultValues?: Partial<Tag>
  onSubmit: (v: TagFormValues) => void
  isLoading?: boolean
}) {
  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<TagFormValues>({
    resolver: zodResolver(tagSchema),
    defaultValues: {
      name: defaultValues?.name ?? '',
      slug: defaultValues?.slug ?? '',
      color: defaultValues?.color ?? null,
    },
  })

  const nameValue = watch('name')
  const colorValue = watch('color')
  const isValidHex = /^#[0-9A-Fa-f]{6}$/.test(colorValue ?? '')
  useEffect(() => {
    if (!defaultValues?.slug && nameValue) setValue('slug', slugify(nameValue))
  }, [nameValue, defaultValues?.slug, setValue])

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-1.5">
        <Label>Tên tag <span className="text-destructive">*</span></Label>
        <Input {...register('name')} placeholder="VD: Phần mềm nội bộ" />
        {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
      </div>
      <div className="space-y-1.5">
        <Label>Slug <span className="text-destructive">*</span></Label>
        <Input {...register('slug')} placeholder="phan-mem-noi-bo" />
        {errors.slug && <p className="text-xs text-destructive">{errors.slug.message}</p>}
      </div>
      <div className="space-y-1.5">
        <Label>Màu (hex)</Label>
        <div className="flex gap-2 items-center">
          <Input {...register('color')} placeholder="#2563EB" className="flex-1" />
          <label
            className="h-9 w-9 rounded cursor-pointer border border-input flex items-center justify-center flex-shrink-0 overflow-hidden"
            style={isValidHex ? { backgroundColor: colorValue! } : undefined}
            title="Chọn màu"
          >
            <input
              type="color"
              value={isValidHex ? colorValue! : '#3B82F6'}
              className="sr-only"
              onChange={e => setValue('color', e.target.value)}
            />
            {!isValidHex && <Palette className="h-4 w-4 text-muted-foreground" />}
          </label>
        </div>
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={() => reset()}>Đặt lại</Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading ? 'Đang lưu...' : 'Lưu'}
        </Button>
      </div>
    </form>
  )
}

export function TagsPage() {
  const { data: tags, isLoading } = useTags()
  const { mutate: createTag, isPending: isCreating } = useCreateTag()
  const { mutate: updateTag, isPending: isUpdating } = useUpdateTag()
  const { mutate: deleteTag } = useDeleteTag()

  const [editTag, setEditTag] = useState<Tag | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<TagFormValues>({
    resolver: zodResolver(tagSchema),
    defaultValues: { name: '', slug: '', color: null },
  })

  const nameValue = watch('name')
  const createColorValue = watch('color')
  const isValidCreateHex = /^#[0-9A-Fa-f]{6}$/.test(createColorValue ?? '')
  useEffect(() => {
    if (nameValue) setValue('slug', slugify(nameValue))
  }, [nameValue, setValue])

  const onSubmitCreate = (values: TagFormValues) => {
    createTag(
      { name: values.name, slug: values.slug, color: values.color || undefined },
      { onSuccess: () => reset() }
    )
  }

  const onSubmitEdit = (values: TagFormValues) => {
    if (!editTag) return
    updateTag(
      { id: editTag.id, name: values.name, slug: values.slug, color: values.color },
      { onSuccess: () => setEditTag(null) }
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Quản lý Tags</h1>
        <p className="text-muted-foreground text-sm">{tags?.length ?? 0} tags trong hệ thống</p>
      </div>

      <div className="rounded-xl border bg-card p-5">
        <h3 className="text-sm font-semibold mb-4">Thêm tag mới</h3>
        <form onSubmit={handleSubmit(onSubmitCreate)} className="flex flex-wrap gap-3 items-end">
          <div className="space-y-1.5 flex-1 min-w-36">
            <Label>Tên tag <span className="text-destructive">*</span></Label>
            <Input {...register('name')} placeholder="VD: Phần mềm nội bộ" />
            {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
          </div>
          <div className="space-y-1.5 flex-1 min-w-36">
            <Label>Slug <span className="text-destructive">*</span></Label>
            <Input {...register('slug')} placeholder="phan-mem-noi-bo" />
            {errors.slug && <p className="text-xs text-destructive">{errors.slug.message}</p>}
          </div>
          <div className="space-y-1.5 w-40">
            <Label>Màu (hex)</Label>
            <div className="flex gap-2 items-center">
              <Input {...register('color')} placeholder="#2563EB" className="flex-1" />
              <label
                className="h-9 w-9 rounded cursor-pointer border border-input flex items-center justify-center flex-shrink-0 overflow-hidden"
                style={isValidCreateHex ? { backgroundColor: createColorValue! } : undefined}
                title="Chọn màu"
              >
                <input
                  type="color"
                  value={isValidCreateHex ? createColorValue! : '#3B82F6'}
                  className="sr-only"
                  onChange={e => setValue('color', e.target.value)}
                />
                {!isValidCreateHex && <Palette className="h-4 w-4 text-muted-foreground" />}
              </label>
            </div>
          </div>
          <Button type="submit" disabled={isCreating} className="self-end">
            <Plus className="h-4 w-4 mr-1.5" />
            Thêm
          </Button>
        </form>
      </div>

      <div className="rounded-xl border bg-card overflow-hidden">
        {isLoading ? (
          <div className="p-4 space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : !tags || tags.length === 0 ? (
          <EmptyState
            icon={Hash}
            title="Chưa có tag nào"
            description='Sử dụng form bên trên để tạo tag đầu tiên.'
          />
        ) : (
          <div className="divide-y">
            {tags.map(tag => (
              <div key={tag.id} className="flex items-center justify-between px-5 py-3.5">
                <div className="flex items-center gap-4">
                  <Badge
                    style={tag.color ? { backgroundColor: tag.color, color: getContrastTextColor(tag.color), border: 'none' } : undefined}
                  >
                    #{tag.name}
                  </Badge>
                  <code className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                    {tag.slug}
                  </code>
                  {tag.color && (
                    <span
                      className="inline-block h-4 w-4 rounded-full border"
                      style={{ backgroundColor: tag.color }}
                    />
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-foreground"
                    onClick={() => setEditTag(tag)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    onClick={() => setDeleteId(tag.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Dialog open={!!editTag} onOpenChange={open => !open && setEditTag(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Sửa tag</DialogTitle>
          </DialogHeader>
          {editTag && (
            <TagForm
              defaultValues={editTag}
              onSubmit={onSubmitEdit}
              isLoading={isUpdating}
            />
          )}
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={open => !open && setDeleteId(null)}
        title="Xóa tag này?"
        description="Tag sẽ bị gỡ khỏi tất cả các link đang sử dụng."
        confirmText="Xóa"
        onConfirm={() => {
          if (deleteId) deleteTag(deleteId, { onSuccess: () => setDeleteId(null) })
        }}
      />
    </div>
  )
}
