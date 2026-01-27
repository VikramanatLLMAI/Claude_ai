"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Check, Copy } from "lucide-react"

export type CodeBlockProps = React.HTMLAttributes<HTMLDivElement>

function CodeBlock({ className, children, ...props }: CodeBlockProps) {
  return (
    <div
      className={cn(
        "not-prose w-full overflow-hidden rounded-lg border border-border bg-card text-card-foreground",
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

export type CodeBlockCodeProps = {
  code: string
  language?: string
} & React.HTMLAttributes<HTMLPreElement>

function CodeBlockCode({
  code,
  language,
  className,
  ...props
}: CodeBlockCodeProps) {
  const [copied, setCopied] = React.useState(false)

  const handleCopy = React.useCallback(async () => {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
    } catch (error) {
      console.error("Failed to copy code:", error)
    }
  }, [code])

  React.useEffect(() => {
    if (!copied) return
    const timeoutId = window.setTimeout(() => setCopied(false), 1200)
    return () => window.clearTimeout(timeoutId)
  }, [copied])

  return (
    <div className="relative">
      <div className="absolute right-2 top-2 z-10">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={copied ? "Copied" : "Copy code"}
          onClick={handleCopy}
          className="h-8 w-8 rounded-none border-0 bg-transparent p-0 hover:bg-transparent"
        >
          {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
        </Button>
      </div>
      <pre
        className={cn(
          "w-full overflow-x-auto px-4 py-3 text-sm leading-6",
          className
        )}
        data-language={language}
        {...props}
      >
        <code className={cn("font-mono")}>{code}</code>
      </pre>
    </div>
  )
}

export { CodeBlock, CodeBlockCode }
