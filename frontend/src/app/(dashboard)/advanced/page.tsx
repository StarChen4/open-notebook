'use client'

import { AppShell } from '@/components/layout/AppShell'
import { RebuildEmbeddings } from './components/RebuildEmbeddings'
import { SystemInfo } from './components/SystemInfo'

export default function AdvancedPage() {
  return (
    <AppShell>
      <div className="flex-1 overflow-y-auto">
        <div className="p-6">
          <div className="max-w-4xl mx-auto space-y-6">
            <div>
              <h1 className="text-3xl font-bold">高级</h1>
              <p className="text-muted-foreground mt-2">
                高级用户的工具和实用程序
              </p>
            </div>

            <SystemInfo />
            <RebuildEmbeddings />
          </div>
        </div>
      </div>
    </AppShell>
  )
}
