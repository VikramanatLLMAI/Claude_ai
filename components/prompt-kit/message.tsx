import * as React from "react"
import { cn } from "@/lib/utils"
import { Markdown, type MarkdownProps } from "@/components/prompt-kit/markdown"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from "@/components/ui/tooltip"

interface MessageProps extends React.HTMLAttributes<HTMLDivElement> {
  role?: "user" | "assistant" | "system"
}

const Message = React.forwardRef<HTMLDivElement, MessageProps>(
  ({ className, role, ...props }, ref) => (
    <div
      ref={ref}
      data-role={role}
      className={cn("flex w-full items-start gap-3", className)}
      {...props}
    />
  )
)
Message.displayName = "Message"

interface MessageAvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  src?: string
  alt?: string
  fallback?: string
}

const MessageAvatar = React.forwardRef<HTMLDivElement, MessageAvatarProps>(
  ({ className, src, alt, fallback, children, ...props }, ref) => {
    const fallbackText =
      fallback ?? (typeof alt === "string" && alt.trim().length > 0 ? alt.trim()[0]?.toUpperCase() : "?")
    const hasCustomChildren = React.Children.count(children) > 0

    return (
      <div
        ref={ref}
        className={cn(
          "flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted text-xs font-medium text-muted-foreground",
          className
        )}
        {...props}
      >
        {hasCustomChildren ? (
          children
        ) : src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={src} alt={alt ?? "Avatar"} className="size-full object-cover" />
        ) : (
          <span>{fallbackText}</span>
        )}
      </div>
    )
  }
)
MessageAvatar.displayName = "MessageAvatar"

type MarkdownComponentProps = Omit<MarkdownProps, "children">

const MessageContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> &
    MarkdownComponentProps & { markdown?: boolean }
>(({ className, markdown, children, ...props }, ref) => {
  const isMarkdown = markdown === true && typeof children === "string"
  const baseClassName =
    "min-w-0 rounded-lg bg-secondary p-2 text-foreground break-words whitespace-normal"

  if (isMarkdown) {
    return (
      <Markdown
        ref={ref}
        className={cn(baseClassName, className)}
        {...props}
      >
        {children}
      </Markdown>
    )
  }

  return (
    <div ref={ref} className={cn(baseClassName, className)} {...props}>
      {children}
    </div>
  )
})
MessageContent.displayName = "MessageContent"

const MessageActions = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("flex items-center", className)} {...props} />
))
MessageActions.displayName = "MessageActions"

const MessageAction = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    tooltip?: string
    delayDuration?: number
  }
>(({ className, tooltip, delayDuration, children, ...props }, ref) => {
  if (tooltip) {
    return (
      <TooltipProvider>
        <Tooltip delayDuration={delayDuration}>
          <TooltipTrigger asChild>
            <div ref={ref} className={cn("", className)} {...props}>
              {children}
            </div>
          </TooltipTrigger>
          <TooltipContent>{tooltip}</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }
  return (
    <div ref={ref} className={cn("", className)} {...props}>
      {children}
    </div>
  )
})
MessageAction.displayName = "MessageAction"

export { Message, MessageAvatar, MessageContent, MessageActions, MessageAction }
