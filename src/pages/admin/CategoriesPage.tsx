import { useState, useEffect } from 'react'
import { Plus, Edit, Trash2, MoreHorizontal } from 'lucide-react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useCategories, useCreateCategory, useUpdateCategory, useDeleteCategory } from '@/features/categories/useCategories'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { EmptyState } from '@/components/common/EmptyState'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { categorySchema, CategoryFormValues } from '@/lib/validators'
import { Category } from '@/types'
import { slugify } from '@/lib/utils'

function CategoryForm({ defaultValues, onSubmit, isLoading }: {
  defaultValues?: Partial<Category>
  onSubmit: (v: CategoryFormValues) => void
  isLoading?: boolean
}) {
  const { register, handleSubmit, control, setValue, watch, formState: { errors } } = useForm<CategoryFormValues>({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      name: defaultValues?.name ?? '',
      slug: defaultValues?.slug ?? '',
      description: defaultValues?.description ?? '',
      icon: defaultValues?.icon ?? '',
      sort_order: defaultValues?.sort_order ?? 0,
      is_active: defaultValues?.is_active ?? true,
    },
  })

  const name = watch('name')
  useEffect(() => {
    if (!defaultValues?.slug && name) {
      setValue('slug', slugify(name))
    }
  }, [name, defaultValues?.slug, setValue])

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Tên danh mục *</Label>
          <Input {...register('name')} placeholder="VD: Vận hành kỹ thuật" />
          {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
        </div>
        <div className="space-y-2">
          <Label>Icon (emoji)</Label>
          <Input {...register('icon')} placeholder="📡" maxLength={4} />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Slug *</Label>
        <Input {...register('slug')} placeholder="van-hanh-ky-thuat" />
        {errors.slug && <p className="text-xs text-destructive">{errors.slug.message}</p>}
      </div>

      <div className="space-y-2">
        <Label>Mô tả</Label>
        <Input {...register('description')} placeholder="Mô tả danh mục..." />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Thứ tự hiển thị</Label>
          <Input type="number" {...register('sort_order', { valueAsNumber: true })} />
        </div>
        <div className="flex items-center gap-2 pt-7">
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

      <div className="flex justify-end pt-2">
        <Button type="submit" disabled={isLoading}>
          {isLoading ? 'Đang lưu...' : 'Lưu'}
        </Button>
      </div>
    </form>
  )
}

export function CategoriesPage() {
  const { data: categories, isLoading } = useCategories()
  const { mutate: createCategory, isPending: isCreating } = useCreateCategory()
  const { mutate: updateCategory, isPending: isUpdating } = useUpdateCategory()
  const { mutate: deleteCategory } = useDeleteCategory()
  const [formOpen, setFormOpen] = useState(false)
  const [editCat, setEditCat] = useState<Category | null>(null)
  const [newSortOrder, setNewSortOrder] = useState(0)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const handleEdit = (cat: Category) => {
    setEditCat(cat)
    setFormOpen(true)
  }

  const handleAddNew = () => {
    const maxOrder = categories?.length
      ? Math.max(...categories.map(c => c.sort_order))
      : -1
    setNewSortOrder(maxOrder + 1)
    setEditCat(null)
    setFormOpen(true)
  }

  const handleClose = () => {
    setFormOpen(false)
    setEditCat(null)
  }

  const handleSubmit = (values: CategoryFormValues) => {
    if (editCat) {
      updateCategory({ id: editCat.id, values }, { onSuccess: handleClose })
    } else {
      createCategory(values, { onSuccess: handleClose })
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Quản lý Danh mục</h1>
          <p className="text-muted-foreground text-sm">{categories?.length ?? 0} danh mục</p>
        </div>
        <Button onClick={handleAddNew}>
          <Plus className="h-4 w-4 mr-2" />
          Thêm danh mục
        </Button>
      </div>

      <div className="rounded-xl border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Danh mục</TableHead>
              <TableHead className="hidden md:table-cell">Slug</TableHead>
              <TableHead className="hidden md:table-cell">Số link</TableHead>
              <TableHead>Thứ tự</TableHead>
              <TableHead>Trạng thái</TableHead>
              <TableHead className="w-10"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 6 }).map((_, j) => (
                    <TableCell key={j}><Skeleton className="h-5 w-full" /></TableCell>
                  ))}
                </TableRow>
              ))
            ) : categories?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6}>
                  <EmptyState
                    title="Chưa có danh mục"
                    description='Bấm "Thêm danh mục" để tạo danh mục đầu tiên.'
                  />
                </TableCell>
              </TableRow>
            ) : (
              categories?.map(cat => (
                <TableRow key={cat.id}>
                  <TableCell>
                    <div className="flex items-center gap-2.5">
                      <span className="text-xl">{cat.icon || '📁'}</span>
                      <div>
                        <p className="font-medium text-sm">{cat.name}</p>
                        {cat.description && (
                          <p className="text-xs text-muted-foreground">{cat.description}</p>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{cat.slug}</code>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <span className="text-sm text-muted-foreground">{cat.link_count ?? 0}</span>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm">{cat.sort_order}</span>
                  </TableCell>
                  <TableCell>
                    <Badge variant={cat.is_active ? 'default' : 'secondary'}>
                      {cat.is_active ? 'Hoạt động' : 'Ẩn'}
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
                        <DropdownMenuItem onClick={() => handleEdit(cat)}>
                          <Edit className="h-4 w-4 mr-2" />Sửa
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => setDeleteId(cat.id)}
                          className="text-destructive focus:text-destructive"
                        >
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
            <DialogTitle>{editCat ? 'Sửa danh mục' : 'Thêm danh mục mới'}</DialogTitle>
          </DialogHeader>
          <CategoryForm
            defaultValues={editCat ?? { sort_order: newSortOrder }}
            onSubmit={handleSubmit}
            isLoading={isCreating || isUpdating}
          />
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={open => !open && setDeleteId(null)}
        title="Xóa danh mục này?"
        description="Các link trong danh mục sẽ không bị xóa nhưng sẽ không có danh mục."
        confirmText="Xóa"
        onConfirm={() => {
          if (deleteId) deleteCategory(deleteId, { onSuccess: () => setDeleteId(null) })
        }}
      />
    </div>
  )
}
