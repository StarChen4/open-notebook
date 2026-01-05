'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { useCreateDialogs } from '@/lib/hooks/use-create-dialogs'
import { useNotebooks } from '@/lib/hooks/use-notebooks'
import { useTheme } from '@/lib/stores/theme-store'
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandGroup,
  CommandItem,
  CommandSeparator,
} from '@/components/ui/command'
import {
  Book,
  Search,
  Mic,
  Bot,
  Shuffle,
  Settings,
  FileText,
  Wrench,
  MessageCircleQuestion,
  Plus,
  Sun,
  Moon,
  Monitor,
  Loader2,
} from 'lucide-react'

export function CommandPalette() {
  const t = useTranslations('commandPalette')
  const tNav = useTranslations('navigation')
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const router = useRouter()
  const { openSourceDialog, openNotebookDialog, openPodcastDialog } = useCreateDialogs()
  const { setTheme } = useTheme()
  const { data: notebooks, isLoading: notebooksLoading } = useNotebooks(false)

  const navigationItems = useMemo(() => [
    { name: tNav('sources'), href: '/sources', icon: FileText, keywords: ['files', 'documents', 'upload'] },
    { name: tNav('notebooks'), href: '/notebooks', icon: Book, keywords: ['notes', 'research', 'projects'] },
    { name: tNav('askAndSearch'), href: '/search', icon: Search, keywords: ['find', 'query'] },
    { name: tNav('podcasts'), href: '/podcasts', icon: Mic, keywords: ['audio', 'episodes', 'generate'] },
    { name: tNav('models'), href: '/models', icon: Bot, keywords: ['ai', 'llm', 'providers', 'openai', 'anthropic'] },
    { name: tNav('transformations'), href: '/transformations', icon: Shuffle, keywords: ['prompts', 'templates', 'actions'] },
    { name: tNav('settings'), href: '/settings', icon: Settings, keywords: ['preferences', 'config', 'options'] },
    { name: tNav('advanced'), href: '/advanced', icon: Wrench, keywords: ['debug', 'system', 'tools'] },
  ], [tNav])

  const createItems = useMemo(() => [
    { name: t('createSource'), action: 'source', icon: FileText },
    { name: t('createNotebook'), action: 'notebook', icon: Book },
    { name: t('createPodcast'), action: 'podcast', icon: Mic },
  ], [t])

  const themeItems = useMemo(() => [
    { name: t('lightTheme'), value: 'light' as const, icon: Sun, keywords: ['bright', 'day'] },
    { name: t('darkTheme'), value: 'dark' as const, icon: Moon, keywords: ['night'] },
    { name: t('systemTheme'), value: 'system' as const, icon: Monitor, keywords: ['auto', 'default'] },
  ], [t])

  // Global keyboard listener for ⌘K / Ctrl+K
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      // Skip if focus is inside editable elements
      const target = e.target as HTMLElement | null
      if (
        target &&
        (target.isContentEditable ||
          ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName))
      ) {
        return
      }

      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        e.stopPropagation()
        setOpen((open) => !open)
      }
    }

    // Use capture phase to intercept before other handlers
    document.addEventListener('keydown', down, true)
    return () => document.removeEventListener('keydown', down, true)
  }, [])

  // Reset query when dialog closes
  useEffect(() => {
    if (!open) {
      setQuery('')
    }
  }, [open])

  const handleSelect = useCallback((callback: () => void) => {
    setOpen(false)
    setQuery('')
    // Use setTimeout to ensure dialog closes before action
    setTimeout(callback, 0)
  }, [])

  const handleNavigate = useCallback((href: string) => {
    handleSelect(() => router.push(href))
  }, [handleSelect, router])

  const handleSearch = useCallback(() => {
    if (!query.trim()) return
    handleSelect(() => router.push(`/search?q=${encodeURIComponent(query)}&mode=search`))
  }, [handleSelect, router, query])

  const handleAsk = useCallback(() => {
    if (!query.trim()) return
    handleSelect(() => router.push(`/search?q=${encodeURIComponent(query)}&mode=ask`))
  }, [handleSelect, router, query])

  const handleCreate = useCallback((action: string) => {
    handleSelect(() => {
      if (action === 'source') openSourceDialog()
      else if (action === 'notebook') openNotebookDialog()
      else if (action === 'podcast') openPodcastDialog()
    })
  }, [handleSelect, openSourceDialog, openNotebookDialog, openPodcastDialog])

  const handleTheme = useCallback((theme: 'light' | 'dark' | 'system') => {
    handleSelect(() => setTheme(theme))
  }, [handleSelect, setTheme])

  // Check if query matches any command (navigation, create, theme, or notebook)
  const queryLower = query.toLowerCase().trim()
  const hasCommandMatch = useMemo(() => {
    if (!queryLower) return false
    return (
      navigationItems.some(item =>
        item.name.toLowerCase().includes(queryLower) ||
        item.keywords.some(k => k.includes(queryLower))
      ) ||
      createItems.some(item =>
        item.name.toLowerCase().includes(queryLower)
      ) ||
      themeItems.some(item =>
        item.name.toLowerCase().includes(queryLower) ||
        item.keywords.some(k => k.includes(queryLower))
      ) ||
      (notebooks?.some(nb =>
        nb.name.toLowerCase().includes(queryLower) ||
        (nb.description && nb.description.toLowerCase().includes(queryLower))
      ) ?? false)
    )
  }, [queryLower, notebooks])

  // Determine if we should show the Search/Ask section at the top
  const showSearchFirst = query.trim() && !hasCommandMatch

  return (
    <CommandDialog
      open={open}
      onOpenChange={setOpen}
      title={t('title')}
      description={t('description')}
      className="sm:max-w-lg"
    >
      <CommandInput
        placeholder={t('placeholder')}
        value={query}
        onValueChange={setQuery}
      />
      <CommandList>
        {/* Search/Ask - show FIRST when there's a query with no command match */}
        {showSearchFirst && (
          <CommandGroup heading={t('searchAndAsk')} forceMount>
            <CommandItem
              value={`__search__ ${query}`}
              onSelect={handleSearch}
              forceMount
            >
              <Search className="h-4 w-4" />
              <span>{t('searchFor', { query })}</span>
            </CommandItem>
            <CommandItem
              value={`__ask__ ${query}`}
              onSelect={handleAsk}
              forceMount
            >
              <MessageCircleQuestion className="h-4 w-4" />
              <span>{t('askAbout', { query })}</span>
            </CommandItem>
          </CommandGroup>
        )}

        {/* Navigation */}
        <CommandGroup heading={tNav('heading')}>
          {navigationItems.map((item) => (
            <CommandItem
              key={item.href}
              value={`${item.name} ${item.keywords.join(' ')}`}
              onSelect={() => handleNavigate(item.href)}
            >
              <item.icon className="h-4 w-4" />
              <span>{item.name}</span>
            </CommandItem>
          ))}
        </CommandGroup>

        {/* Notebooks */}
        <CommandGroup heading={tNav('notebooks')}>
          {notebooksLoading ? (
            <CommandItem disabled>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>{t('loadingNotebooks')}</span>
            </CommandItem>
          ) : notebooks && notebooks.length > 0 ? (
            notebooks.map((notebook) => (
              <CommandItem
                key={notebook.id}
                value={`notebook ${notebook.name} ${notebook.description || ''}`}
                onSelect={() => handleNavigate(`/notebooks/${notebook.id}`)}
              >
                <Book className="h-4 w-4" />
                <span>{notebook.name}</span>
              </CommandItem>
            ))
          ) : null}
        </CommandGroup>

        {/* Create */}
        <CommandGroup heading={t('create')}>
          {createItems.map((item) => (
            <CommandItem
              key={item.action}
              value={`create ${item.name}`}
              onSelect={() => handleCreate(item.action)}
            >
              <Plus className="h-4 w-4" />
              <span>{item.name}</span>
            </CommandItem>
          ))}
        </CommandGroup>

        {/* Theme */}
        <CommandGroup heading={t('theme')}>
          {themeItems.map((item) => (
            <CommandItem
              key={item.value}
              value={`theme ${item.name} ${item.keywords.join(' ')}`}
              onSelect={() => handleTheme(item.value)}
            >
              <item.icon className="h-4 w-4" />
              <span>{item.name}</span>
            </CommandItem>
          ))}
        </CommandGroup>

        {/* Search/Ask - show at bottom when there IS a command match */}
        {query.trim() && hasCommandMatch && (
          <>
            <CommandSeparator />
            <CommandGroup heading={t('orSearchKnowledgeBase')} forceMount>
              <CommandItem
                value={`__search__ ${query}`}
                onSelect={handleSearch}
                forceMount
              >
                <Search className="h-4 w-4" />
                <span>{t('searchFor', { query })}</span>
              </CommandItem>
              <CommandItem
                value={`__ask__ ${query}`}
                onSelect={handleAsk}
                forceMount
              >
                <MessageCircleQuestion className="h-4 w-4" />
                <span>{t('askAbout', { query })}</span>
              </CommandItem>
            </CommandGroup>
          </>
        )}
      </CommandList>
    </CommandDialog>
  )
}
