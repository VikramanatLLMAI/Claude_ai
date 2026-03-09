"use client"

import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"

interface McpReadonlyCardProps {
  name: string
  serverUrl: string
  status: string
  isActive: boolean
  toolCount: number
  source: 'ORG' | 'ROLE'
}

export function McpReadonlyCard({ name, serverUrl, status, isActive, toolCount, source }: McpReadonlyCardProps) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
      <div className="flex items-center gap-2 min-w-0">
        <span className={cn("size-2 shrink-0 rounded-full", {
          "bg-green-500": status === 'connected' && isActive,
          "bg-red-500": status === 'error',
          "bg-gray-400": status === 'disconnected' || !isActive,
        })} />
        <span className="text-sm font-medium truncate">{name}</span>
        <Badge variant="outline" className="text-xs shrink-0">{source === 'ORG' ? 'Org' : 'Role'}</Badge>
      </div>
      <div className="flex items-center gap-2 text-xs text-muted-foreground shrink-0 ml-2">
        <span>{toolCount} tool{toolCount !== 1 ? 's' : ''}</span>
        <span className="hidden sm:inline truncate max-w-[180px]">{serverUrl}</span>
      </div>
    </div>
  )
}
