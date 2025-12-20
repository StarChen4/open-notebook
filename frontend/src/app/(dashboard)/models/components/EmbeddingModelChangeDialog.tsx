'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { AlertTriangle, ExternalLink } from 'lucide-react'

interface EmbeddingModelChangeDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
  oldModelName?: string
  newModelName?: string
}

export function EmbeddingModelChangeDialog({
  open,
  onOpenChange,
  onConfirm,
  oldModelName,
  newModelName
}: EmbeddingModelChangeDialogProps) {
  const router = useRouter()
  const [isConfirming, setIsConfirming] = useState(false)

  const handleConfirmAndRebuild = () => {
    setIsConfirming(true)
    onConfirm()
    // Give a moment for the model to update, then redirect
    setTimeout(() => {
      router.push('/advanced')
      onOpenChange(false)
      setIsConfirming(false)
    }, 500)
  }

  const handleConfirmOnly = () => {
    onConfirm()
    onOpenChange(false)
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-lg">
        <AlertDialogHeader>
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="h-5 w-5 text-yellow-500" />
            <AlertDialogTitle>嵌入模型更改</AlertDialogTitle>
          </div>
          <AlertDialogDescription asChild>
            <div className="space-y-3 text-base text-muted-foreground">
              <p>
                您即将更改嵌入模型{' '}
                {oldModelName && newModelName && (
                  <>
                    从 <strong>{oldModelName}</strong> 更改为 <strong>{newModelName}</strong>
                  </>
                )}
                。
              </p>

              <div className="bg-muted p-4 rounded-md space-y-2">
                <p className="font-semibold text-foreground">⚠️ 重要：需要重建</p>
                <p className="text-sm">
                  更改嵌入模型需要重建所有现有的嵌入以保持一致性。
                  如果不重建，您的搜索可能会返回不正确或不完整的结果。
                </p>
              </div>

              <div className="space-y-2 text-sm">
                <p className="font-medium text-foreground">接下来会发生什么：</p>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li>您的默认嵌入模型将被更新</li>
                  <li>现有嵌入将保持不变，直到重建</li>
                  <li>新内容将使用新的嵌入模型</li>
                  <li>您应该尽快重建嵌入</li>
                </ul>
              </div>

              <p className="text-sm font-medium text-foreground">
                您想要前往高级页面立即开始重建吗？
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-col sm:flex-row gap-2">
          <AlertDialogCancel disabled={isConfirming}>
            取消
          </AlertDialogCancel>
          <Button
            variant="outline"
            onClick={handleConfirmOnly}
            disabled={isConfirming}
          >
            仅更改模型
          </Button>
          <AlertDialogAction
            onClick={handleConfirmAndRebuild}
            disabled={isConfirming}
            className="bg-primary"
          >
            <ExternalLink className="mr-2 h-4 w-4" />
            更改并前往重建
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
