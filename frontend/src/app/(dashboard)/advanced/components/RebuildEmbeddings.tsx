'use client'

import { useState, useEffect, useCallback } from 'react'
import { useMutation } from '@tanstack/react-query'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'
import { Loader2, AlertCircle, CheckCircle2, XCircle, Clock } from 'lucide-react'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { embeddingApi } from '@/lib/api/embedding'
import type { RebuildEmbeddingsRequest, RebuildStatusResponse } from '@/lib/api/embedding'

export function RebuildEmbeddings() {
  const [mode, setMode] = useState<'existing' | 'all'>('existing')
  const [includeSources, setIncludeSources] = useState(true)
  const [includeNotes, setIncludeNotes] = useState(true)
  const [includeInsights, setIncludeInsights] = useState(true)
  const [commandId, setCommandId] = useState<string | null>(null)
  const [status, setStatus] = useState<RebuildStatusResponse | null>(null)
  const [pollingInterval, setPollingInterval] = useState<NodeJS.Timeout | null>(null)

  // Rebuild mutation
  const rebuildMutation = useMutation({
    mutationFn: async (request: RebuildEmbeddingsRequest) => {
      return embeddingApi.rebuildEmbeddings(request)
    },
    onSuccess: (data) => {
      setCommandId(data.command_id)
      // Start polling for status
      startPolling(data.command_id)
    }
  })

  // Start polling for rebuild status
  const startPolling = (cmdId: string) => {
    if (pollingInterval) {
      clearInterval(pollingInterval)
    }

    const interval = setInterval(async () => {
      try {
        const statusData = await embeddingApi.getRebuildStatus(cmdId)
        setStatus(statusData)

        // Stop polling if completed or failed
        if (statusData.status === 'completed' || statusData.status === 'failed') {
          stopPolling()
        }
      } catch (error) {
        console.error('Failed to fetch rebuild status:', error)
      }
    }, 5000) // Poll every 5 seconds

    setPollingInterval(interval)
  }

  // Stop polling
  const stopPolling = useCallback(() => {
    if (pollingInterval) {
      clearInterval(pollingInterval)
      setPollingInterval(null)
    }
  }, [pollingInterval])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopPolling()
    }
  }, [stopPolling])

  const handleStartRebuild = () => {
    const request: RebuildEmbeddingsRequest = {
      mode,
      include_sources: includeSources,
      include_notes: includeNotes,
      include_insights: includeInsights
    }

    rebuildMutation.mutate(request)
  }

  const handleReset = () => {
    stopPolling()
    setCommandId(null)
    setStatus(null)
    rebuildMutation.reset()
  }

  const isAnyTypeSelected = includeSources || includeNotes || includeInsights
  const isRebuildActive = commandId && status && (status.status === 'queued' || status.status === 'running')

  const progressData = status?.progress
  const stats = status?.stats

  const totalItems = progressData?.total_items ?? progressData?.total ?? 0
  const processedItems = progressData?.processed_items ?? progressData?.processed ?? 0
  const derivedProgressPercent = progressData?.percentage ?? (totalItems > 0 ? (processedItems / totalItems) * 100 : 0)
  const progressPercent = Number.isFinite(derivedProgressPercent) ? derivedProgressPercent : 0

  const sourcesProcessed = stats?.sources_processed ?? stats?.sources ?? 0
  const notesProcessed = stats?.notes_processed ?? stats?.notes ?? 0
  const insightsProcessed = stats?.insights_processed ?? stats?.insights ?? 0
  const failedItems = stats?.failed_items ?? stats?.failed ?? 0

  const computedDuration = status?.started_at && status?.completed_at
    ? (new Date(status.completed_at).getTime() - new Date(status.started_at).getTime()) / 1000
    : undefined
  const processingTimeSeconds = stats?.processing_time ?? computedDuration

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          🔄 重建嵌入
        </CardTitle>
        <CardDescription>
          为您的内容重建向量嵌入。在切换嵌入模型或修复损坏的嵌入时使用此功能。
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Configuration Form */}
        {!isRebuildActive && (
          <div className="space-y-6">
            <div className="space-y-3">
              <Label htmlFor="mode">重建模式</Label>
              <Select value={mode} onValueChange={(value) => setMode(value as 'existing' | 'all')}>
                <SelectTrigger id="mode">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="existing">仅现有</SelectItem>
                  <SelectItem value="all">全部</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground">
                {mode === 'existing'
                  ? '仅重新嵌入已有嵌入的项目（更快，适用于切换模型）'
                  : '重新嵌入现有项目 + 为没有嵌入的项目创建嵌入（较慢，全面）'}
              </p>
            </div>

            <div className="space-y-3">
              <Label>包含在重建中</Label>
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="sources"
                    checked={includeSources}
                    onCheckedChange={(checked) => setIncludeSources(checked === true)}
                  />
                  <Label htmlFor="sources" className="font-normal cursor-pointer">
                    来源
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="notes"
                    checked={includeNotes}
                    onCheckedChange={(checked) => setIncludeNotes(checked === true)}
                  />
                  <Label htmlFor="notes" className="font-normal cursor-pointer">
                    笔记
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="insights"
                    checked={includeInsights}
                    onCheckedChange={(checked) => setIncludeInsights(checked === true)}
                  />
                  <Label htmlFor="insights" className="font-normal cursor-pointer">
                    见解
                  </Label>
                </div>
              </div>
              {!isAnyTypeSelected && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    请至少选择一种项目类型进行重建
                  </AlertDescription>
                </Alert>
              )}
            </div>

            <Button
              onClick={handleStartRebuild}
              disabled={!isAnyTypeSelected || rebuildMutation.isPending}
              className="w-full"
            >
              {rebuildMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  正在启动重建...
                </>
              ) : (
                '🚀 开始重建'
              )}
            </Button>

            {rebuildMutation.isError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  启动重建失败：{(rebuildMutation.error as Error)?.message || '未知错误'}
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}

        {/* Status Display */}
        {status && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {status.status === 'queued' && <Clock className="h-5 w-5 text-yellow-500" />}
                {status.status === 'running' && <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />}
                {status.status === 'completed' && <CheckCircle2 className="h-5 w-5 text-green-500" />}
                {status.status === 'failed' && <XCircle className="h-5 w-5 text-red-500" />}
                <div className="flex flex-col">
                  <span className="font-medium">
                    {status.status === 'queued' && '排队中'}
                    {status.status === 'running' && '运行中...'}
                    {status.status === 'completed' && '已完成！'}
                    {status.status === 'failed' && '失败'}
                  </span>
                  {status.status === 'running' && (
                    <span className="text-sm text-muted-foreground">
                      您可以离开此页面，这将在后台运行
                    </span>
                  )}
                </div>
              </div>
              {(status.status === 'completed' || status.status === 'failed') && (
                <Button variant="outline" size="sm" onClick={handleReset}>
                  开始新的重建
                </Button>
              )}
            </div>

            {progressData && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>进度</span>
                  <span className="font-medium">
                    {processedItems}/{totalItems} 项 ({progressPercent.toFixed(1)}%)
                  </span>
                </div>
                <Progress value={progressPercent} className="h-2" />
                {failedItems > 0 && (
                  <p className="text-sm text-yellow-600">
                    ⚠️ {failedItems} 项处理失败
                  </p>
                )}
              </div>
            )}

            {stats && (
              <div className="grid grid-cols-4 gap-4">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">来源</p>
                  <p className="text-2xl font-bold">{sourcesProcessed}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">笔记</p>
                  <p className="text-2xl font-bold">{notesProcessed}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">见解</p>
                  <p className="text-2xl font-bold">{insightsProcessed}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">时间</p>
                  <p className="text-2xl font-bold">
                    {processingTimeSeconds !== undefined ? `${processingTimeSeconds.toFixed(1)}秒` : '—'}
                  </p>
                </div>
              </div>
            )}

            {status.error_message && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{status.error_message}</AlertDescription>
              </Alert>
            )}

            {status.started_at && (
              <div className="text-sm text-muted-foreground space-y-1">
                <p>开始时间：{new Date(status.started_at).toLocaleString()}</p>
                {status.completed_at && (
                  <p>完成时间：{new Date(status.completed_at).toLocaleString()}</p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Help Section */}
        <Accordion type="single" collapsible className="w-full">
          <AccordionItem value="when">
            <AccordionTrigger>何时应该重建嵌入？</AccordionTrigger>
            <AccordionContent className="space-y-2 text-sm">
              <p><strong>您应该在以下情况下重建嵌入：</strong></p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li><strong>切换嵌入模型：</strong>如果您从一个嵌入模型切换到另一个，需要重建所有嵌入以确保一致性。</li>
                <li><strong>升级模型版本：</strong>当更新到嵌入模型的新版本时，重建以利用改进功能。</li>
                <li><strong>修复损坏的嵌入：</strong>如果您怀疑某些嵌入已损坏或丢失，重建可以恢复它们。</li>
                <li><strong>批量导入后：</strong>如果您导入的内容没有嵌入，请使用"全部"模式嵌入所有内容。</li>
              </ul>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="time">
            <AccordionTrigger>重建需要多长时间？</AccordionTrigger>
            <AccordionContent className="space-y-2 text-sm">
              <p><strong>处理时间取决于：</strong></p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>要处理的项目数量</li>
                <li>嵌入模型速度</li>
                <li>API 速率限制（对于云提供商）</li>
                <li>系统资源</li>
              </ul>
              <p className="mt-2"><strong>典型速率：</strong></p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li><strong>本地模型</strong>（Ollama）：非常快，仅受硬件限制</li>
                <li><strong>云 API</strong>（OpenAI、Google）：速度适中，处理大型数据集时可能会达到速率限制</li>
                <li><strong>来源：</strong>比笔记/见解慢（每个来源创建多个分块）</li>
              </ul>
              <p className="mt-2"><em>示例：使用云 API 重建 200 项可能需要 2-5 分钟，使用本地模型则不到 1 分钟。</em></p>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="safe">
            <AccordionTrigger>在使用应用时重建是否安全？</AccordionTrigger>
            <AccordionContent className="space-y-2 text-sm">
              <p><strong>是的，重建是安全的！</strong>重建过程：</p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>✅ <strong>是幂等的：</strong>多次运行产生相同的结果</li>
                <li>✅ <strong>不删除内容：</strong>仅替换嵌入</li>
                <li>✅ <strong>可以随时运行：</strong>无需停止其他操作</li>
                <li>✅ <strong>优雅地处理错误：</strong>失败的项目会被记录并跳过</li>
              </ul>
              <p className="mt-2">⚠️ <strong>但是：</strong>非常大的重建（数千个项目）在处理时可能会暂时减慢搜索速度。</p>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </CardContent>
    </Card>
  )
}
