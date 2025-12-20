"use client"

import { FormSection } from "@/components/ui/form-section"
import { CheckboxList } from "@/components/ui/checkbox-list"
import { NotebookResponse } from "@/lib/types/api"

interface NotebooksStepProps {
  notebooks: NotebookResponse[]
  selectedNotebooks: string[]
  onToggleNotebook: (notebookId: string) => void
  loading?: boolean
}

export function NotebooksStep({
  notebooks,
  selectedNotebooks,
  onToggleNotebook,
  loading = false
}: NotebooksStepProps) {
  const notebookItems = notebooks.map((notebook) => ({
    id: notebook.id,
    title: notebook.name,
    description: notebook.description || undefined
  }))

  return (
    <div className="space-y-6">
      <FormSection
        title="选择笔记本（可选）"
        description="选择哪些笔记本应包含此来源。您可以选择多个笔记本或将其留空。"
      >
        <CheckboxList
          items={notebookItems}
          selectedIds={selectedNotebooks}
          onToggle={onToggleNotebook}
          loading={loading}
          emptyMessage="未找到笔记本。"
        />
      </FormSection>
    </div>
  )
}