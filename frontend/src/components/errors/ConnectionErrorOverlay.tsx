'use client'

import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { Database, Server, ChevronDown, ExternalLink } from 'lucide-react'
import { ConnectionError } from '@/lib/types/config'

interface ConnectionErrorOverlayProps {
  error: ConnectionError
  onRetry: () => void
}

export function ConnectionErrorOverlay({
  error,
  onRetry,
}: ConnectionErrorOverlayProps) {
  const [showDetails, setShowDetails] = useState(false)
  const isApiError = error.type === 'api-unreachable'

  return (
    <div
      className="fixed inset-0 bg-background z-50 flex items-center justify-center p-4"
      role="alert"
      aria-live="assertive"
      aria-atomic="true"
    >
      <Card className="max-w-2xl w-full p-8 space-y-6">
        {/* Error icon and title */}
        <div className="flex items-center gap-4">
          {isApiError ? (
            <Server className="w-12 h-12 text-destructive" aria-hidden="true" />
          ) : (
            <Database className="w-12 h-12 text-destructive" aria-hidden="true" />
          )}
          <div>
            <h1 className="text-2xl font-bold" id="error-title">
              {isApiError
                ? '无法连接到API服务器'
                : '数据库连接失败'}
            </h1>
            <p className="text-muted-foreground">
              {isApiError
                ? '无法访问Open Notebook API服务器'
                : 'API服务器正在运行，但数据库不可访问'}
            </p>
          </div>
        </div>

        {/* Troubleshooting instructions */}
        <div className="space-y-4 border-l-4 border-primary pl-4">
          <h2 className="font-semibold">这通常意味着：</h2>
          <ul className="list-disc list-inside space-y-2 text-sm">
            {isApiError ? (
              <>
                <li>API服务器未运行</li>
                <li>API服务器在不同的地址上运行</li>
                <li>网络连接问题</li>
              </>
            ) : (
              <>
                <li>SurrealDB未运行</li>
                <li>数据库连接设置不正确</li>
                <li>API和数据库之间的网络问题</li>
              </>
            )}
          </ul>

          <h2 className="font-semibold mt-4">快速修复：</h2>
          {isApiError ? (
            <div className="space-y-2 text-sm bg-muted p-4 rounded">
              <p className="font-medium">设置API_URL环境变量：</p>
              <code className="block bg-background p-2 rounded text-xs">
                # For Docker:
                <br />
                docker run -e API_URL=http://your-host:5055 ...
                <br />
                <br />
                # For local development (.env file):
                <br />
                API_URL=http://localhost:5055
              </code>
            </div>
          ) : (
            <div className="space-y-2 text-sm bg-muted p-4 rounded">
              <p className="font-medium">检查SurrealDB是否正在运行：</p>
              <code className="block bg-background p-2 rounded text-xs">
                # For Docker:
                <br />
                docker compose ps | grep surrealdb
                <br />
                docker compose logs surrealdb
              </code>
            </div>
          )}
        </div>

        {/* Documentation link */}
        <div className="text-sm">
          <p>详细设置说明，请参阅：</p>
          <a
            href="https://github.com/lfnovo/open-notebook"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline inline-flex items-center gap-1"
          >
            Open Notebook文档
            <ExternalLink className="w-4 h-4" />
          </a>
        </div>

        {/* Collapsible technical details */}
        {error.details && (
          <Collapsible open={showDetails} onOpenChange={setShowDetails}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="w-full justify-between">
                <span>显示技术详情</span>
                <ChevronDown
                  className={`w-4 h-4 transition-transform ${
                    showDetails ? 'rotate-180' : ''
                  }`}
                />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-4">
              <div className="space-y-2 text-sm bg-muted p-4 rounded font-mono">
                {error.details.attemptedUrl && (
                  <div>
                    <strong>尝试的URL：</strong> {error.details.attemptedUrl}
                  </div>
                )}
                {error.details.message && (
                  <div>
                    <strong>消息：</strong> {error.details.message}
                  </div>
                )}
                {error.details.technicalMessage && (
                  <div>
                    <strong>技术详情：</strong>{' '}
                    {error.details.technicalMessage}
                  </div>
                )}
                {error.details.stack && (
                  <div>
                    <strong>堆栈跟踪：</strong>
                    <pre className="mt-2 overflow-x-auto text-xs">
                      {error.details.stack}
                    </pre>
                  </div>
                )}
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}

        {/* Retry button */}
        <div className="pt-4 border-t">
          <Button onClick={onRetry} className="w-full" size="lg">
            重试连接
          </Button>
          <p className="text-xs text-muted-foreground text-center mt-2">
            按R键或点击按钮重试
          </p>
        </div>
      </Card>
    </div>
  )
}
