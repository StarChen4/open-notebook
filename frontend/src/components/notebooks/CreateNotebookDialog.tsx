'use client'

import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { useCreateNotebook } from '@/lib/hooks/use-notebooks'

const createNotebookSchema = z.object({
  name: z.string().min(1, '名称为必填项'),
  description: z.string().optional(),
})

type CreateNotebookFormData = z.infer<typeof createNotebookSchema>

interface CreateNotebookDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CreateNotebookDialog({ open, onOpenChange }: CreateNotebookDialogProps) {
  const createNotebook = useCreateNotebook()
  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
    reset,
  } = useForm<CreateNotebookFormData>({
    resolver: zodResolver(createNotebookSchema),
    mode: 'onChange',
    defaultValues: {
      name: '',
      description: '',
    },
  })

  const closeDialog = () => onOpenChange(false)

  const onSubmit = async (data: CreateNotebookFormData) => {
    await createNotebook.mutateAsync(data)
    closeDialog()
    reset()
  }

  useEffect(() => {
    if (!open) {
      reset()
    }
  }, [open, reset])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>创建新笔记本</DialogTitle>
          <DialogDescription>
            创建一个专用空间来组织相关来源和笔记，开始整理您的研究。
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="notebook-name">名称 *</Label>
            <Input
              id="notebook-name"
              {...register('name')}
              placeholder="输入笔记本名称"
              autoFocus
            />
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="notebook-description">描述</Label>
            <Textarea
              id="notebook-description"
              {...register('description')}
              placeholder="描述此笔记本的用途和范围..."
              rows={4}
            />
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={closeDialog}>
              取消
            </Button>
            <Button type="submit" disabled={!isValid || createNotebook.isPending}>
              {createNotebook.isPending ? '创建中…' : '创建笔记本'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
