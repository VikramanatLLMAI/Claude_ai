"use client"

import { PageLoadingSkeleton } from "@/components/ui/skeleton-loaders"
import { Bot, Sparkles } from "lucide-react"
import { motion } from "motion/react"

/**
 * Delightful loading state with animated branding
 */
function DelightfulLoader() {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background">
      {/* Animated Logo */}
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 20 }}
        className="relative"
      >
        <motion.div
          className="relative flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/20 to-primary/10"
          animate={{
            boxShadow: [
              "0 0 0 0 rgba(var(--primary), 0.2)",
              "0 0 40px 10px rgba(var(--primary), 0.1)",
              "0 0 0 0 rgba(var(--primary), 0.2)",
            ],
          }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <Bot className="h-10 w-10 text-primary" />
        </motion.div>
        {/* Floating sparkles */}
        <motion.div
          className="absolute -top-2 -right-2"
          animate={{
            y: [0, -5, 0],
            rotate: [0, 10, 0],
          }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        >
          <Sparkles className="h-5 w-5 text-primary/70" />
        </motion.div>
        <motion.div
          className="absolute -bottom-1 -left-2"
          animate={{
            y: [0, -3, 0],
            rotate: [0, -10, 0],
          }}
          transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut", delay: 0.3 }}
        >
          <Sparkles className="h-4 w-4 text-primary/50" />
        </motion.div>
      </motion.div>

      {/* Text */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="mt-6 text-center"
      >
        <h2 className="text-xl font-semibold text-foreground">Athena</h2>
        <motion.p
          className="mt-1 text-sm text-muted-foreground"
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        >
          Getting things ready...
        </motion.p>
      </motion.div>

      {/* Progress dots */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="mt-8 flex items-center gap-2"
      >
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className="h-2 w-2 rounded-full bg-primary"
            animate={{
              scale: [1, 1.3, 1],
              opacity: [0.4, 1, 0.4],
            }}
            transition={{
              duration: 0.8,
              repeat: Infinity,
              delay: i * 0.15,
            }}
          />
        ))}
      </motion.div>
    </div>
  )
}

/**
 * Global loading state shown during page transitions
 * Shows a delightful branded loader for quick loads
 * Falls back to skeleton for longer loads
 */
export default function Loading() {
  return <DelightfulLoader />
}
