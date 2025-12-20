'use client'

import { useState } from 'react'

import { AppShell } from '@/components/layout/AppShell'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { EpisodesTab } from '@/components/podcasts/EpisodesTab'
import { TemplatesTab } from '@/components/podcasts/TemplatesTab'
import { Mic, LayoutTemplate } from 'lucide-react'

export default function PodcastsPage() {
  const [activeTab, setActiveTab] = useState<'episodes' | 'templates'>('episodes')

  return (
    <AppShell>
      <div className="flex-1 overflow-y-auto">
        <div className="px-6 py-6 space-y-6">
          <header className="space-y-1">
            <h1 className="text-2xl font-semibold tracking-tight">播客</h1>
            <p className="text-muted-foreground">
              跟踪已生成的剧集并管理可重复使用的模板。
            </p>
          </header>

          <Tabs
            value={activeTab}
            onValueChange={(value) => setActiveTab(value as 'episodes' | 'templates')}
            className="space-y-6"
          >
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">选择视图</p>
              <TabsList aria-label="播客视图" className="w-full max-w-md">
                <TabsTrigger value="episodes">
                  <Mic className="h-4 w-4" />
                  剧集
                </TabsTrigger>
                <TabsTrigger value="templates">
                  <LayoutTemplate className="h-4 w-4" />
                  模板
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="episodes">
              <EpisodesTab />
            </TabsContent>

            <TabsContent value="templates">
              <TemplatesTab />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </AppShell>
  )
}
