'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import { TransformationCard } from './TransformationCard'
import { EmptyState } from '@/components/common/EmptyState'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { Wand2 } from 'lucide-react'
import { Transformation } from '@/lib/types/transformations'
import { TransformationEditorDialog } from './TransformationEditorDialog'

interface TransformationsListProps {
  transformations: Transformation[] | undefined
  isLoading: boolean
  onPlayground?: (transformation: Transformation) => void
}

export function TransformationsList({ transformations, isLoading, onPlayground }: TransformationsListProps) {
  const [editorOpen, setEditorOpen] = useState(false)
  const [editingTransformation, setEditingTransformation] = useState<Transformation | undefined>()

  const handleOpenEditor = (trans?: Transformation) => {
    setEditingTransformation(trans)
    setEditorOpen(true)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (!transformations || transformations.length === 0) {
    return (
      <EmptyState
        icon={Wand2}
        title="还没有转换"
        description="创建您的第一个转换来处理和提取内容中的洞察。"
        action={
          <Button onClick={() => handleOpenEditor()}>
            <Plus className="h-4 w-4 mr-2" />
            创建新转换
          </Button>
        }
      />
    )
  }

  return (
    <>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-semibold">您的转换</h2>
          <Button onClick={() => handleOpenEditor()}>
            <Plus className="h-4 w-4 mr-2" />
            创建新转换
          </Button>
        </div>

        <div className="space-y-4">
          {transformations.map((transformation) => (
            <TransformationCard
              key={transformation.id}
              transformation={transformation}
              onPlayground={onPlayground ? () => onPlayground(transformation) : undefined}
              onEdit={() => handleOpenEditor(transformation)}
            />
          ))}
        </div>
      </div>

      <TransformationEditorDialog
        open={editorOpen}
        onOpenChange={(open) => {
          setEditorOpen(open)
          if (!open) {
            setEditingTransformation(undefined)
          }
        }}
        transformation={editingTransformation}
      />
    </>
  )
}
