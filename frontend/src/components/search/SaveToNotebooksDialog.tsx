'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { CheckboxList } from '@/components/ui/checkbox-list'
import { useNotebooks } from '@/lib/hooks/use-notebooks'
import { useCreateNote } from '@/lib/hooks/use-notes'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { toast } from 'sonner'

interface SaveToNotebooksDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  question: string
  answer: string
}

export function SaveToNotebooksDialog({
  open,
  onOpenChange,
  question,
  answer
}: SaveToNotebooksDialogProps) {
  const [selectedNotebooks, setSelectedNotebooks] = useState<string[]>([])
  const { data: notebooks, isLoading } = useNotebooks(false) // false = not archived
  const createNote = useCreateNote()

  const handleToggle = (notebookId: string) => {
    setSelectedNotebooks(prev =>
      prev.includes(notebookId)
        ? prev.filter(id => id !== notebookId)
        : [...prev, notebookId]
    )
  }

  const handleSave = async () => {
    if (selectedNotebooks.length === 0) {
      toast.error('请至少选择一个笔记本')
      return
    }

    try {
      // Create note in each selected notebook
      for (const notebookId of selectedNotebooks) {
        await createNote.mutateAsync({
          title: question,
          content: answer,
          note_type: 'ai',
          notebook_id: notebookId
        })
      }

      toast.success(`回答已保存到 ${selectedNotebooks.length} 个笔记本`)
      setSelectedNotebooks([])
      onOpenChange(false)
    } catch {
      toast.error('保存回答失败')
    }
  }

  const notebookItems = notebooks?.map(nb => ({
    id: nb.id,
    title: nb.name,
    description: nb.description || undefined
  })) || []

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>保存到笔记本</DialogTitle>
          <DialogDescription>
            选择一个或多个笔记本来保存此回答
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <LoadingSpinner />
            </div>
          ) : (
            <CheckboxList
              items={notebookItems}
              selectedIds={selectedNotebooks}
              onToggle={handleToggle}
              emptyMessage="未找到笔记本。请先创建笔记本。"
            />
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button
            onClick={handleSave}
            disabled={selectedNotebooks.length === 0 || createNote.isPending}
          >
            {createNote.isPending ? (
              <>
                <LoadingSpinner size="sm" className="mr-2" />
                保存中...
              </>
            ) : (
              `保存到 ${selectedNotebooks.length || ''} 个笔记本`
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
