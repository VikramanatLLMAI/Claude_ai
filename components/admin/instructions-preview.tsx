"use client"

import * as React from "react"
import { ChevronDown, ChevronUp, Info } from "lucide-react"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { estimateTokenCount } from "@/lib/token-counter"
import { cn } from "@/lib/utils"

interface InstructionsPreviewProps {
  orgInstructions: string
  roleInstructions: string
  roleName: string
}

/**
 * Collapsible panel that shows how organization + role instructions combine
 * into the final system prompt prefix. Defaults to collapsed.
 *
 * Displays:
 * - Organization instructions section
 * - Role instructions section
 * - Combined token estimate
 * - Info note about additional prompt layers
 */
export function InstructionsPreview({
  orgInstructions,
  roleInstructions,
  roleName,
}: InstructionsPreviewProps) {
  const [isOpen, setIsOpen] = React.useState(false)

  const orgTokens = React.useMemo(
    () => estimateTokenCount(orgInstructions),
    [orgInstructions]
  )
  const roleTokens = React.useMemo(
    () => estimateTokenCount(roleInstructions),
    [roleInstructions]
  )
  const combinedTokens = orgTokens + roleTokens

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <button
          type="button"
          className="flex w-full items-center justify-between rounded-md border border-border bg-muted/30 px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
        >
          <span className="font-medium">Preview Combined Instructions</span>
          {isOpen ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </button>
      </CollapsibleTrigger>

      <CollapsibleContent className="mt-3 space-y-4">
        {/* Organization Instructions Section */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Organization Instructions
          </label>
          <div
            className={cn(
              "rounded-md bg-muted p-3 font-mono text-sm",
              !orgInstructions && "italic text-muted-foreground/60"
            )}
          >
            {orgInstructions || "(not set)"}
          </div>
        </div>

        {/* Role Instructions Section */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Role Instructions ({roleName})
          </label>
          <div
            className={cn(
              "rounded-md bg-muted p-3 font-mono text-sm",
              !roleInstructions && "italic text-muted-foreground/60"
            )}
          >
            {roleInstructions || "(not set)"}
          </div>
        </div>

        {/* Combined token count */}
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>~{combinedTokens} combined tokens</span>
        </div>

        {/* Info note */}
        <div className="flex items-start gap-2 rounded-md border border-border bg-muted/20 px-3 py-2">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          <p className="text-xs text-muted-foreground">
            This preview shows organization and role instructions. Platform
            instructions and user custom instructions are also included in the
            final prompt.
          </p>
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}
