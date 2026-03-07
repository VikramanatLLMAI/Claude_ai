"use client"

import * as React from "react"
import { Pencil, Trash2, Cpu, MessageSquare, Plug, Clock } from "lucide-react"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

/**
 * Fallback descriptions for system roles when database description is null.
 * Per STATE.md decision [03-12]: hardcoded map for Technical/Business/Basic roles.
 * Per STATE.md decision [03-15]: SYSTEM_ROLE_DESCRIPTIONS is a display-only fallback.
 */
const SYSTEM_ROLE_DESCRIPTIONS: Record<string, string> = {
  Technical: "Full access to all AI capabilities and development tools. For developers, engineers, and technical power users.",
  Business: "Balanced access with Sonnet and Haiku models. For business users, analysts, and project managers.",
  Basic: "Essential AI chat access with lightweight models. For general users with standard needs.",
}

/**
 * Role data from the GET /api/org/[slug]/admin/roles endpoint.
 */
export interface RoleData {
  id: string
  name: string
  description: string | null
  isSystemRole: boolean
  permissions: string[]
  allowedModels: string[]
  systemInstructions: string | null
  customInstructionsEnabled: boolean
  customInstructionsMaxLength: number
  personalMcpEnabled: boolean
  personalMcpMaxCount: number
  dailyRequestLimit: number | null
  dailyTokenLimit: number | null
  promptSuggestions?: unknown[]
  createdAt: string
  updatedAt: string
  _count: { members: number }
}

interface RoleCardProps {
  role: RoleData
  onEdit: (role: RoleData) => void
  onDelete: (role: RoleData) => void
}

/**
 * RoleCard -- Read-only summary card for each role.
 * Shows role name, member count badge, system role badge,
 * description, and a compact summary of models, limits,
 * custom instructions, and personal MCP settings.
 * Edit button opens modal. Delete button only for custom roles.
 */
export function RoleCard({ role, onEdit, onDelete }: RoleCardProps) {
  const description = role.description || (role.isSystemRole ? SYSTEM_ROLE_DESCRIPTIONS[role.name] : null)
  const modelCount = Array.isArray(role.allowedModels) ? role.allowedModels.length : 0
  const hasRequestLimit = role.dailyRequestLimit !== null
  const hasTokenLimit = role.dailyTokenLimit !== null
  const isDeleteDisabled = role._count.members > 0

  return (
    <Card className="flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <CardTitle className="text-base">{role.name}</CardTitle>
            {role.isSystemRole && (
              <Badge variant="secondary" className="text-[10px]">
                System
              </Badge>
            )}
          </div>
          <Badge variant="outline" className="shrink-0 text-xs font-normal text-muted-foreground">
            {role._count.members} {role._count.members === 1 ? "user" : "users"}
          </Badge>
        </div>
        {description && (
          <p className="text-sm text-muted-foreground leading-relaxed mt-1">
            {description}
          </p>
        )}
      </CardHeader>

      <CardContent className="flex-1 pb-3">
        <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
          {/* Models */}
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Cpu className="h-3.5 w-3.5 shrink-0" />
            <span>{modelCount > 0 ? `${modelCount} model${modelCount !== 1 ? "s" : ""}` : "No models"}</span>
          </div>

          {/* Limits */}
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Clock className="h-3.5 w-3.5 shrink-0" />
            <span>
              {hasRequestLimit || hasTokenLimit
                ? [
                    hasRequestLimit ? `${role.dailyRequestLimit} req/day` : null,
                    hasTokenLimit ? `${role.dailyTokenLimit} tok/day` : null,
                  ].filter(Boolean).join(", ")
                : "Unlimited"}
            </span>
          </div>

          {/* Custom Instructions */}
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <MessageSquare className="h-3.5 w-3.5 shrink-0" />
            <span>Instructions: {role.customInstructionsEnabled ? "Enabled" : "Disabled"}</span>
          </div>

          {/* Personal MCP */}
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Plug className="h-3.5 w-3.5 shrink-0" />
            <span>
              MCP: {role.personalMcpEnabled ? `Enabled (max ${role.personalMcpMaxCount})` : "Disabled"}
            </span>
          </div>
        </div>
      </CardContent>

      <CardFooter className="border-t border-border pt-3">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => onEdit(role)}>
            <Pencil className="mr-1.5 h-3.5 w-3.5" />
            Edit
          </Button>
          {!role.isSystemRole && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => onDelete(role)}
                      disabled={isDeleteDisabled}
                    >
                      <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                      Delete
                    </Button>
                  </span>
                </TooltipTrigger>
                {isDeleteDisabled && (
                  <TooltipContent>
                    <p>Reassign {role._count.members} member{role._count.members !== 1 ? "s" : ""} before deleting</p>
                  </TooltipContent>
                )}
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
      </CardFooter>
    </Card>
  )
}
