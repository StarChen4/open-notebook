'use client'

import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { ModelDefaults, Model } from '@/lib/types/models'
import { useUpdateModelDefaults } from '@/lib/hooks/use-models'
import { AlertCircle, X } from 'lucide-react'
import { EmbeddingModelChangeDialog } from './EmbeddingModelChangeDialog'

interface DefaultModelsSectionProps {
  models: Model[]
  defaults: ModelDefaults
}

interface DefaultConfig {
  key: keyof ModelDefaults
  label: string
  description: string
  modelType: 'language' | 'embedding' | 'text_to_speech' | 'speech_to_text'
  required?: boolean
}

const defaultConfigs: DefaultConfig[] = [
  {
    key: 'default_chat_model',
    label: '聊天模型',
    description: '用于聊天对话',
    modelType: 'language',
    required: true
  },
  {
    key: 'default_transformation_model',
    label: '转换模型',
    description: '用于摘要、洞察和转换',
    modelType: 'language',
    required: true
  },
  {
    key: 'default_tools_model',
    label: '工具模型',
    description: '用于函数调用 - 推荐 OpenAI 或 Anthropic',
    modelType: 'language'
  },
  {
    key: 'large_context_model',
    label: '大上下文模型',
    description: '用于处理大型文档 - 推荐 Gemini',
    modelType: 'language'
  },
  {
    key: 'default_embedding_model',
    label: '嵌入模型',
    description: '用于语义搜索和向量嵌入',
    modelType: 'embedding',
    required: true
  },
  {
    key: 'default_text_to_speech_model',
    label: '文本转语音模型',
    description: '用于播客生成',
    modelType: 'text_to_speech'
  },
  {
    key: 'default_speech_to_text_model',
    label: '语音转文本模型',
    description: '用于音频转录',
    modelType: 'speech_to_text'
  }
]

export function DefaultModelsSection({ models, defaults }: DefaultModelsSectionProps) {
  const updateDefaults = useUpdateModelDefaults()
  const { setValue, watch } = useForm<ModelDefaults>({
    defaultValues: defaults
  })

  // State for embedding model change dialog
  const [showEmbeddingDialog, setShowEmbeddingDialog] = useState(false)
  const [pendingEmbeddingChange, setPendingEmbeddingChange] = useState<{
    key: keyof ModelDefaults
    value: string
    oldModelId?: string
    newModelId?: string
  } | null>(null)

  // Update form when defaults change
  useEffect(() => {
    if (defaults) {
      Object.entries(defaults).forEach(([key, value]) => {
        setValue(key as keyof ModelDefaults, value)
      })
    }
  }, [defaults, setValue])

  const handleChange = (key: keyof ModelDefaults, value: string) => {
    // Special handling for embedding model changes
    if (key === 'default_embedding_model') {
      const currentEmbeddingModel = defaults[key]

      // Only show dialog if there's an existing embedding model and it's changing
      if (currentEmbeddingModel && currentEmbeddingModel !== value) {
        setPendingEmbeddingChange({
          key,
          value,
          oldModelId: currentEmbeddingModel,
          newModelId: value
        })
        setShowEmbeddingDialog(true)
        return
      }
    }

    // For all other changes or new embedding model assignment
    const newDefaults = { [key]: value || null }
    updateDefaults.mutate(newDefaults)
  }

  const handleConfirmEmbeddingChange = () => {
    if (pendingEmbeddingChange) {
      const newDefaults = {
        [pendingEmbeddingChange.key]: pendingEmbeddingChange.value || null
      }
      updateDefaults.mutate(newDefaults)
      setPendingEmbeddingChange(null)
    }
  }

  const handleCancelEmbeddingChange = () => {
    setPendingEmbeddingChange(null)
    setShowEmbeddingDialog(false)
  }

  const getModelsForType = (type: 'language' | 'embedding' | 'text_to_speech' | 'speech_to_text') => {
    return models.filter(model => model.type === type)
  }

  const missingRequired = defaultConfigs
    .filter(config => {
      if (!config.required) return false
      const value = defaults[config.key]
      if (!value) return true
      // Check if the model still exists
      const modelsOfType = models.filter(m => m.type === config.modelType)
      return !modelsOfType.some(m => m.id === value)
    })
    .map(config => config.label)

  return (
    <Card>
      <CardHeader>
        <CardTitle>默认模型分配</CardTitle>
        <CardDescription>
          配置 Open Notebook 在不同用途下使用的模型
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {missingRequired.length > 0 && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              缺少必需的模型：{missingRequired.join('、')}。
              没有这些模型，Open Notebook 可能无法正常工作。
            </AlertDescription>
          </Alert>
        )}

        <div className="grid gap-6 md:grid-cols-2">
          {defaultConfigs.map((config) => {
            const availableModels = getModelsForType(config.modelType)
            const currentValue = watch(config.key) || undefined
            
            // Check if the current value exists in available models
            const isValidModel = currentValue && availableModels.some(m => m.id === currentValue)

            return (
              <div key={config.key} className="space-y-2">
                <Label>
                  {config.label}
                  {config.required && <span className="text-destructive ml-1">*</span>}
                </Label>
                <div className="flex gap-2">
                  <Select
                    value={currentValue || ""}
                    onValueChange={(value) => handleChange(config.key, value)}
                  >
                    <SelectTrigger className={
                      config.required && !isValidModel && availableModels.length > 0
                        ? 'border-destructive'
                        : ''
                    }>
                      <SelectValue placeholder={
                        config.required && !isValidModel && availableModels.length > 0
                          ? "⚠️ 必需 - 选择模型"
                          : "选择模型"
                      } />
                    </SelectTrigger>
                    <SelectContent>
                      {availableModels.sort((a, b) => a.name.localeCompare(b.name)).map((model) => (
                        <SelectItem key={model.id} value={model.id}>
                          <div className="flex items-center justify-between w-full">
                            <span>{model.name}</span>
                            <span className="text-xs text-muted-foreground ml-2">
                              {model.provider}
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {!config.required && currentValue && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleChange(config.key, "")}
                      className="h-10 w-10"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">{config.description}</p>
              </div>
            )
          })}
        </div>

        <div className="pt-4 border-t">
          <a
            href="https://github.com/lfnovo/open-notebook/blob/main/docs/features/ai-models.md"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-primary hover:underline"
          >
            我应该选择哪个模型？ →
          </a>
        </div>
      </CardContent>

      {/* Embedding Model Change Dialog */}
      <EmbeddingModelChangeDialog
        open={showEmbeddingDialog}
        onOpenChange={(open) => {
          if (!open) {
            handleCancelEmbeddingChange()
          }
        }}
        onConfirm={handleConfirmEmbeddingChange}
        oldModelName={
          pendingEmbeddingChange?.oldModelId
            ? models.find(m => m.id === pendingEmbeddingChange.oldModelId)?.name
            : undefined
        }
        newModelName={
          pendingEmbeddingChange?.newModelId
            ? models.find(m => m.id === pendingEmbeddingChange.newModelId)?.name
            : undefined
        }
      />
    </Card>
  )
}