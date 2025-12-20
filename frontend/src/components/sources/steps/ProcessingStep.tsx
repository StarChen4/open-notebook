"use client"

import { Control, Controller } from "react-hook-form"
import { FormSection } from "@/components/ui/form-section"
import { CheckboxList } from "@/components/ui/checkbox-list"
import { Checkbox } from "@/components/ui/checkbox"
import { Transformation } from "@/lib/types/transformations"
import { SettingsResponse } from "@/lib/types/api"

interface CreateSourceFormData {
  type: 'link' | 'upload' | 'text'
  title?: string
  url?: string
  content?: string
  file?: FileList | File
  notebooks?: string[]
  transformations?: string[]
  embed: boolean
  async_processing: boolean
}

interface ProcessingStepProps {
  control: Control<CreateSourceFormData>
  transformations: Transformation[]
  selectedTransformations: string[]
  onToggleTransformation: (transformationId: string) => void
  loading?: boolean
  settings?: SettingsResponse
}

export function ProcessingStep({
  control,
  transformations,
  selectedTransformations,
  onToggleTransformation,
  loading = false,
  settings
}: ProcessingStepProps) {
  const transformationItems = transformations.map((transformation) => ({
    id: transformation.id,
    title: transformation.title,
    description: transformation.description
  }))

  return (
    <div className="space-y-8">
      <FormSection
        title="转换（可选）"
        description="应用AI转换来分析和提取内容中的洞察。"
      >
        <CheckboxList
          items={transformationItems}
          selectedIds={selectedTransformations}
          onToggle={onToggleTransformation}
          loading={loading}
          emptyMessage="未找到转换。"
        />
      </FormSection>

      <FormSection
        title="处理设置"
        description="配置来源的处理和存储方式。"
      >
        <div className="space-y-4">
          {settings?.default_embedding_option === 'ask' && (
            <Controller
              control={control}
              name="embed"
              render={({ field }) => (
                <label className="flex items-start gap-3 cursor-pointer p-3 rounded-md hover:bg-muted">
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    className="mt-0.5"
                  />
                  <div className="flex-1">
                    <span className="text-sm font-medium block">启用搜索嵌入</span>
                    <p className="text-xs text-muted-foreground mt-1">
                      允许在向量搜索和AI查询中找到此来源
                    </p>
                  </div>
                </label>
              )}
            />
          )}

          {settings?.default_embedding_option === 'always' && (
            <div className="p-3 rounded-md bg-primary/10 border border-primary/30">
              <div className="flex items-start gap-3">
                <div className="w-4 h-4 bg-primary rounded-full mt-0.5 flex-shrink-0"></div>
                <div className="flex-1">
                  <span className="text-sm font-medium block text-primary">自动启用嵌入</span>
                  <p className="text-xs text-primary mt-1">
                    您的设置已配置为始终嵌入内容以进行向量搜索。
                    您可以在<span className="font-medium">设置</span>中更改此选项。
                  </p>
                </div>
              </div>
            </div>
          )}

          {settings?.default_embedding_option === 'never' && (
            <div className="p-3 rounded-md bg-muted border border-border">
              <div className="flex items-start gap-3">
                <div className="w-4 h-4 bg-muted-foreground rounded-full mt-0.5 flex-shrink-0"></div>
                <div className="flex-1">
                  <span className="text-sm font-medium block text-foreground">嵌入已禁用</span>
                  <p className="text-xs text-muted-foreground mt-1">
                    您的设置已配置为跳过嵌入。此来源将无法使用向量搜索。
                    您可以在<span className="font-medium">设置</span>中更改此选项。
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </FormSection>
    </div>
  )
}
