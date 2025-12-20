'use client'

import { useState } from 'react'
import { NotebookResponse } from '@/lib/types/api'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Archive, ArchiveRestore, Trash2 } from 'lucide-react'
import { useUpdateNotebook, useDeleteNotebook } from '@/lib/hooks/use-notebooks'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { formatDistanceToNow } from 'date-fns'
import { InlineEdit } from '@/components/common/InlineEdit'

interface NotebookHeaderProps {
  notebook: NotebookResponse
}

export function NotebookHeader({ notebook }: NotebookHeaderProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  
  const updateNotebook = useUpdateNotebook()
  const deleteNotebook = useDeleteNotebook()

  const handleUpdateName = async (name: string) => {
    if (!name || name === notebook.name) return
    
    await updateNotebook.mutateAsync({
      id: notebook.id,
      data: { name }
    })
  }

  const handleUpdateDescription = async (description: string) => {
    if (description === notebook.description) return
    
    await updateNotebook.mutateAsync({
      id: notebook.id,
      data: { description: description || undefined }
    })
  }

  const handleArchiveToggle = () => {
    updateNotebook.mutate({
      id: notebook.id,
      data: { archived: !notebook.archived }
    })
  }

  const handleDelete = () => {
    deleteNotebook.mutate(notebook.id)
    setShowDeleteDialog(false)
  }

  return (
    <>
      <div className="border-b pb-6">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 flex-1">
              <InlineEdit
                value={notebook.name}
                onSave={handleUpdateName}
                className="text-2xl font-bold"
                inputClassName="text-2xl font-bold"
                placeholder="笔记本名称"
              />
              {notebook.archived && (
                <Badge variant="secondary">已归档</Badge>
              )}
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleArchiveToggle}
              >
                {notebook.archived ? (
                  <>
                    <ArchiveRestore className="h-4 w-4 mr-2" />
                    取消归档
                  </>
                ) : (
                  <>
                    <Archive className="h-4 w-4 mr-2" />
                    归档
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowDeleteDialog(true)}
                className="text-red-600 hover:text-red-700"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                删除
              </Button>
            </div>
          </div>
          
          <InlineEdit
            value={notebook.description || ''}
            onSave={handleUpdateDescription}
            className="text-muted-foreground"
            inputClassName="text-muted-foreground"
            placeholder="添加描述..."
            multiline
            emptyText="添加描述..."
          />

          <div className="text-sm text-muted-foreground">
            创建于 {formatDistanceToNow(new Date(notebook.created), { addSuffix: true })} •
            更新于 {formatDistanceToNow(new Date(notebook.updated), { addSuffix: true })}
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        title="删除笔记本"
        description={`您确定要删除"${notebook.name}"吗？此操作无法撤销，将删除所有来源、笔记和聊天会话。`}
        confirmText="永久删除"
        confirmVariant="destructive"
        onConfirm={handleDelete}
      />
    </>
  )
}