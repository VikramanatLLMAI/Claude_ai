import * as React from "react"
import { ArrowDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface ScrollButtonProps extends Omit<React.ComponentProps<typeof Button>, 'containerRef' | 'scrollRef'> {
    containerRef?: React.RefObject<HTMLElement | null>
    scrollRef?: React.RefObject<HTMLElement | null>
}

const ScrollButton = React.forwardRef<HTMLButtonElement, ScrollButtonProps>(
    ({ className, containerRef, scrollRef, ...props }, ref) => {
        const [isVisible, setIsVisible] = React.useState(false)

        React.useEffect(() => {
            const container = containerRef?.current
            if (!container) return

            const handleScroll = () => {
                const { scrollTop, scrollHeight, clientHeight } = container
                const isNearBottom = scrollHeight - scrollTop - clientHeight < 100
                setIsVisible(!isNearBottom)
            }

            container.addEventListener("scroll", handleScroll)
            handleScroll()

            return () => container.removeEventListener("scroll", handleScroll)
        }, [containerRef])

        const handleClick = () => {
            scrollRef?.current?.scrollIntoView({ behavior: "smooth" })
        }

        if (!isVisible) return null

        return (
            <Button
                ref={ref}
                variant="outline"
                size="icon"
                className={cn("rounded-full bg-background", className)}
                onClick={handleClick}
                {...props}
            >
                <ArrowDown className="size-4" />
            </Button>
        )
    }
)
ScrollButton.displayName = "ScrollButton"

export { ScrollButton }
