"use client"

import { useState, useEffect } from "react"
import { Plug, Settings } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import Link from "next/link"

const AUTH_TOKEN_KEY = "athena_auth_token"

function getAuthHeaders(): Record<string, string> {
  const token = typeof window !== 'undefined' ? localStorage.getItem(AUTH_TOKEN_KEY) || "" : ""
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  }
}

interface McpConnection {
  id: string
  name: string
  status: "connected" | "disconnected" | "error"
  isActive: boolean
  availableTools?: { name: string }[]
}

interface McpToggleProps {
  activeMcpIds: string[]
  onToggle: (connectionId: string, isActive: boolean) => void
  className?: string
}

export function McpToggle({ activeMcpIds, onToggle, className }: McpToggleProps) {
  const [connections, setConnections] = useState<McpConnection[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Fetch MCP connections
  useEffect(() => {
    const fetchConnections = async () => {
      try {
        const res = await fetch("/api/mcp/connections", {
          headers: getAuthHeaders(),
        })
        if (res.ok) {
          const data = await res.json()
          setConnections(data)
        }
      } catch (error) {
        console.error("Error fetching MCP connections:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchConnections()
  }, [])

  const activeCount = activeMcpIds.length
  const connectedConnections = connections.filter((c) => c.status === "connected")
  const hasConnections = connections.length > 0

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant={activeCount > 0 ? "default" : "outline"}
          size="icon"
          className={cn("size-9 rounded-full relative", className)}
        >
          <Plug size={18} />
          {activeCount > 0 && (
            <Badge
              variant="secondary"
              className="absolute -right-1 -top-1 h-4 min-w-4 items-center justify-center rounded-full p-0 text-[10px]"
            >
              {activeCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-72">
        <DropdownMenuLabel className="flex items-center justify-between">
          <span>MCP Connections</span>
          {activeCount > 0 && (
            <Badge variant="secondary" className="text-xs">
              {activeCount} active
            </Badge>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        {isLoading ? (
          <div className="px-2 py-4 text-center text-sm text-muted-foreground">
            Loading...
          </div>
        ) : !hasConnections ? (
          <div className="px-2 py-4 text-center">
            <Plug className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">No MCP connections configured</p>
            <Link href="/settings?tab=mcp">
              <Button variant="link" size="sm" className="mt-2">
                <Settings className="mr-1 h-3 w-3" />
                Add Connection
              </Button>
            </Link>
          </div>
        ) : connectedConnections.length === 0 ? (
          <div className="px-2 py-4 text-center">
            <p className="text-sm text-muted-foreground">No connected MCP servers</p>
            <Link href="/settings?tab=mcp">
              <Button variant="link" size="sm" className="mt-2">
                <Settings className="mr-1 h-3 w-3" />
                Manage Connections
              </Button>
            </Link>
          </div>
        ) : (
          <>
            {connectedConnections.map((connection) => {
              const isActive = activeMcpIds.includes(connection.id)
              const toolCount = connection.availableTools?.length || 0

              return (
                <div
                  key={connection.id}
                  className="grid grid-cols-[1fr_auto] items-center gap-2 px-2 py-2 hover:bg-accent rounded-sm"
                >
                  <div className="flex flex-col overflow-hidden">
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-2 shrink-0 rounded-full bg-green-500" />
                      <span className="text-sm font-medium truncate" title={connection.name}>
                        {connection.name}
                      </span>
                    </div>
                    <span className="text-xs text-muted-foreground ml-4 truncate">
                      {toolCount} tool{toolCount !== 1 ? "s" : ""}
                    </span>
                  </div>
                  <Switch
                    checked={isActive}
                    onCheckedChange={(checked) => onToggle(connection.id, checked)}
                  />
                </div>
              )
            })}
            <DropdownMenuSeparator />
          </>
        )}

        <Link href="/settings?tab=mcp">
          <DropdownMenuItem className="cursor-pointer">
            <Settings className="mr-2 h-4 w-4" />
            Manage Connections
          </DropdownMenuItem>
        </Link>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
