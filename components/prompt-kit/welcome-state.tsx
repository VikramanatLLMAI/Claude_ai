"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { motion } from "motion/react"
import { Sparkles, Sun, Moon, CloudSun, Zap, MessageSquare, Lightbulb, Brain } from "lucide-react"
import { PromptSuggestion, type Suggestion } from "./prompt-suggestion"

interface WelcomeStateProps {
  className?: string
  userName?: string
  modelName?: string
  solutionType?: string | null
  suggestions?: Suggestion[]
  onSelectSuggestion?: (suggestion: Suggestion) => void
}

function getTimeBasedGreeting(): { greeting: string; icon: React.ReactNode; subGreeting: string } {
  const hour = new Date().getHours()

  if (hour >= 5 && hour < 12) {
    return {
      greeting: "Good morning",
      icon: <Sun className="size-6 text-amber-500" />,
      subGreeting: "Rise and shine! Ready to tackle the day?"
    }
  } else if (hour >= 12 && hour < 17) {
    return {
      greeting: "Good afternoon",
      icon: <CloudSun className="size-6 text-orange-500" />,
      subGreeting: "Hope your day is going well!"
    }
  } else if (hour >= 17 && hour < 21) {
    return {
      greeting: "Good evening",
      icon: <CloudSun className="size-6 text-purple-500" />,
      subGreeting: "Winding down? Let's make progress together."
    }
  } else {
    return {
      greeting: "Good evening",
      icon: <Moon className="size-6 text-indigo-400" />,
      subGreeting: "Burning the midnight oil? I'm here to help."
    }
  }
}

const WelcomeState = React.forwardRef<HTMLDivElement, WelcomeStateProps>(
  (
    {
      className,
      userName,
      modelName,
      solutionType,
      suggestions = [],
      onSelectSuggestion,
    },
    ref
  ) => {
    const { greeting, icon, subGreeting } = getTimeBasedGreeting()
    const displayName = userName ? `, ${userName}` : ""

    // Feature highlights based on solution type
    const getFeatureHighlights = () => {
      if (solutionType === "manufacturing") {
        return [
          { icon: Zap, text: "Production insights" },
          { icon: Brain, text: "Quality analysis" },
        ]
      } else if (solutionType === "maintenance") {
        return [
          { icon: Zap, text: "Predictive maintenance" },
          { icon: Brain, text: "Reliability analysis" },
        ]
      } else if (solutionType === "support") {
        return [
          { icon: MessageSquare, text: "Incident resolution" },
          { icon: Brain, text: "Root cause analysis" },
        ]
      }
      return [
        { icon: Lightbulb, text: "Creative problem solving" },
        { icon: Brain, text: "Deep analysis" },
      ]
    }

    const features = getFeatureHighlights()

    return (
      <div
        ref={ref}
        className={cn(
          "flex h-full flex-col items-center justify-center px-6",
          className
        )}
      >
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ type: "spring", stiffness: 100, damping: 20 }}
          className="w-full max-w-2xl text-center"
        >
          {/* Greeting Icon with floating animation */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1, type: "spring" }}
            className="mx-auto mb-4 relative"
          >
            <motion.div
              className="flex size-16 items-center justify-center rounded-full bg-gradient-to-br from-primary/15 to-primary/5"
              animate={{ y: [0, -4, 0] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            >
              {icon}
            </motion.div>
            {/* Sparkle decorations */}
            <motion.div
              className="absolute -top-1 -right-1"
              animate={{
                scale: [1, 1.2, 1],
                opacity: [0.5, 1, 0.5],
              }}
              transition={{ duration: 2, repeat: Infinity, delay: 0.5 }}
            >
              <Sparkles className="size-4 text-primary/60" />
            </motion.div>
          </motion.div>

          {/* Time-based Greeting */}
          <motion.h2
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mb-2 text-2xl font-semibold"
          >
            {greeting}{displayName}
          </motion.h2>

          {/* Subtitle with personality */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="mb-2 text-muted-foreground"
          >
            {subGreeting}
          </motion.p>

          {/* Model info */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.35 }}
            className="mb-6"
          >
            {modelName ? (
              <p className="text-sm text-muted-foreground">
                I&apos;m <span className="font-medium text-foreground">{modelName}</span>
                {solutionType && (
                  <>
                    {" "}specialized in{" "}
                    <span className="text-primary font-medium">
                      {solutionType.replace(/-/g, " ")}
                    </span>
                  </>
                )}
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">
                How can I help you today?
              </p>
            )}
          </motion.div>

          {/* Feature highlights */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="flex items-center justify-center gap-4 mb-8"
          >
            {features.map((feature, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.45 + i * 0.1 }}
                className="flex items-center gap-2 rounded-full bg-muted/50 px-3 py-1.5 text-sm text-muted-foreground"
              >
                <feature.icon className="size-4 text-primary/70" />
                {feature.text}
              </motion.div>
            ))}
          </motion.div>

          {/* Suggestions */}
          {suggestions.length > 0 && onSelectSuggestion && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
            >
              <p className="text-xs text-muted-foreground mb-3">Try asking about:</p>
              <PromptSuggestion
                suggestions={suggestions}
                onSelect={onSelectSuggestion}
                columns={2}
              />
            </motion.div>
          )}
        </motion.div>
      </div>
    )
  }
)

WelcomeState.displayName = "WelcomeState"

export { WelcomeState, getTimeBasedGreeting }
