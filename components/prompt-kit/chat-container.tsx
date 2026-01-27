import { cn } from "@/lib/utils"
import React from "react"

const ChatContainerRoot = React.forwardRef<
    HTMLDivElement,
    React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
    <div
        ref={ref}
        className={cn("flex flex-col h-full", className)}
        {...props}
    />
))
ChatContainerRoot.displayName = "ChatContainerRoot"

const ChatContainerContent = React.forwardRef<
    HTMLDivElement,
    React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
    <div
        ref={ref}
        className={cn("flex-1", className)}
        {...props}
    />
))
ChatContainerContent.displayName = "ChatContainerContent"

export { ChatContainerRoot, ChatContainerContent }
