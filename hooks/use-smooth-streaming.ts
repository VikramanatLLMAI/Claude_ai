"use client"

import { useState, useEffect, useRef, useCallback, useMemo } from "react"

interface UseSmoothStreamingOptions {
  /** Characters to reveal per tick (default: 3) */
  charsPerTick?: number
  /** Milliseconds between ticks (default: 16 for ~60fps) */
  tickInterval?: number
  /** Whether streaming is active (default: true) */
  isStreaming?: boolean
  /** Callback when streaming completes */
  onComplete?: () => void
  /** Adaptive speed - increases when far behind (default: true) */
  adaptiveSpeed?: boolean
  /** Maximum characters to catch up per tick when behind (default: 20) */
  maxCatchUpChars?: number
}

/**
 * Hook for smooth text streaming animation
 * Buffers incoming text and reveals it gradually for a smoother reading experience
 * Optimized for performance with requestAnimationFrame
 */
export function useSmoothStreaming(
  targetText: string,
  options: UseSmoothStreamingOptions = {}
) {
  const {
    charsPerTick = 3,
    tickInterval = 16, // ~60fps
    isStreaming = true,
    onComplete,
    adaptiveSpeed = true,
    maxCatchUpChars = 20,
  } = options

  const [displayedText, setDisplayedText] = useState("")
  const displayedLengthRef = useRef(0)
  const animationFrameRef = useRef<number | null>(null)
  const lastTickRef = useRef(0)
  const completedRef = useRef(false)
  const targetTextRef = useRef(targetText)

  // Keep targetText in a ref to avoid closure issues
  targetTextRef.current = targetText

  const animate = useCallback((timestamp: number) => {
    // Throttle updates based on tickInterval
    if (timestamp - lastTickRef.current < tickInterval) {
      animationFrameRef.current = requestAnimationFrame(animate)
      return
    }
    lastTickRef.current = timestamp

    const currentLength = displayedLengthRef.current
    const targetLength = targetTextRef.current.length

    if (currentLength < targetLength) {
      // Calculate how many chars to add
      let charsToAdd = charsPerTick

      if (adaptiveSpeed) {
        const behind = targetLength - currentLength
        // Speed up proportionally when behind, but cap at maxCatchUpChars
        charsToAdd = Math.min(
          Math.max(charsPerTick, Math.ceil(behind / 8)),
          maxCatchUpChars
        )
      }

      const newLength = Math.min(currentLength + charsToAdd, targetLength)
      displayedLengthRef.current = newLength
      setDisplayedText(targetTextRef.current.slice(0, newLength))

      animationFrameRef.current = requestAnimationFrame(animate)
    } else if (!completedRef.current && !isStreaming) {
      // Streaming done and we've caught up
      completedRef.current = true
      onComplete?.()
    } else if (isStreaming) {
      // Keep animation loop running while streaming
      animationFrameRef.current = requestAnimationFrame(animate)
    }
  }, [charsPerTick, tickInterval, isStreaming, onComplete, adaptiveSpeed, maxCatchUpChars])

  useEffect(() => {
    // Reset completion state when text changes
    if (targetText.length > 0) {
      completedRef.current = false
    }

    // Start animation
    animationFrameRef.current = requestAnimationFrame(animate)

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [animate, targetText])

  // When streaming stops, smoothly catch up to the end
  useEffect(() => {
    if (!isStreaming && displayedLengthRef.current < targetText.length) {
      // Smooth catch-up with a slight delay for visual effect
      const timeout = setTimeout(() => {
        displayedLengthRef.current = targetText.length
        setDisplayedText(targetText)
        if (!completedRef.current) {
          completedRef.current = true
          onComplete?.()
        }
      }, 200)
      return () => clearTimeout(timeout)
    }
  }, [isStreaming, targetText, onComplete])

  const progress = useMemo(() =>
    targetText.length > 0 ? displayedLengthRef.current / targetText.length : 1,
    [targetText.length]
  )

  return {
    displayedText,
    isComplete: displayedLengthRef.current >= targetText.length && !isStreaming,
    progress,
    /** Number of characters displayed */
    displayedLength: displayedLengthRef.current,
    /** Total characters in target text */
    targetLength: targetText.length,
  }
}

/**
 * Typing cursor effect - blinks when typing
 */
export function useTypingCursor(isTyping: boolean, blinkSpeed: number = 530) {
  const [showCursor, setShowCursor] = useState(true)

  useEffect(() => {
    if (!isTyping) {
      setShowCursor(false)
      return
    }

    // Show cursor immediately when typing starts
    setShowCursor(true)

    const interval = setInterval(() => {
      setShowCursor((prev) => !prev)
    }, blinkSpeed)

    return () => clearInterval(interval)
  }, [isTyping, blinkSpeed])

  return showCursor && isTyping ? "|" : ""
}

/**
 * Word-by-word streaming hook
 * Reveals text word by word instead of character by character
 */
export function useWordStreaming(
  targetText: string,
  options: {
    wordsPerTick?: number
    tickInterval?: number
    isStreaming?: boolean
    onComplete?: () => void
  } = {}
) {
  const {
    wordsPerTick = 1,
    tickInterval = 50,
    isStreaming = true,
    onComplete,
  } = options

  const words = useMemo(() => targetText.split(/(\s+)/), [targetText])
  const [displayedWordCount, setDisplayedWordCount] = useState(0)
  const animationFrameRef = useRef<number | null>(null)
  const lastTickRef = useRef(0)
  const completedRef = useRef(false)

  const animate = useCallback((timestamp: number) => {
    if (timestamp - lastTickRef.current < tickInterval) {
      animationFrameRef.current = requestAnimationFrame(animate)
      return
    }
    lastTickRef.current = timestamp

    setDisplayedWordCount((prev) => {
      const next = Math.min(prev + wordsPerTick, words.length)
      if (next >= words.length && !completedRef.current && !isStreaming) {
        completedRef.current = true
        onComplete?.()
      }
      return next
    })

    if (isStreaming || displayedWordCount < words.length) {
      animationFrameRef.current = requestAnimationFrame(animate)
    }
  }, [words.length, wordsPerTick, tickInterval, isStreaming, onComplete, displayedWordCount])

  useEffect(() => {
    completedRef.current = false
    animationFrameRef.current = requestAnimationFrame(animate)

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [animate])

  useEffect(() => {
    if (!isStreaming) {
      setDisplayedWordCount(words.length)
    }
  }, [isStreaming, words.length])

  const displayedText = words.slice(0, displayedWordCount).join("")

  return {
    displayedText,
    isComplete: displayedWordCount >= words.length && !isStreaming,
    progress: words.length > 0 ? displayedWordCount / words.length : 1,
  }
}

/**
 * Smooth scroll-to-bottom hook
 * Automatically scrolls to bottom during streaming but allows user override
 */
export function useAutoScroll(
  containerRef: React.RefObject<HTMLElement | null>,
  isStreaming: boolean,
  threshold: number = 100
) {
  const userScrolledUpRef = useRef(false)
  const lastScrollTopRef = useRef(0)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container
      const distanceFromBottom = scrollHeight - scrollTop - clientHeight

      // Detect if user scrolled up
      if (scrollTop < lastScrollTopRef.current && distanceFromBottom > threshold) {
        userScrolledUpRef.current = true
      }

      // Reset if user scrolls back to bottom
      if (distanceFromBottom <= threshold) {
        userScrolledUpRef.current = false
      }

      lastScrollTopRef.current = scrollTop
    }

    container.addEventListener("scroll", handleScroll, { passive: true })
    return () => container.removeEventListener("scroll", handleScroll)
  }, [containerRef, threshold])

  // Auto-scroll during streaming (unless user scrolled up)
  useEffect(() => {
    if (!isStreaming || userScrolledUpRef.current) return

    const container = containerRef.current
    if (!container) return

    const scrollToBottom = () => {
      container.scrollTo({
        top: container.scrollHeight,
        behavior: "smooth",
      })
    }

    // Throttle scroll updates
    const interval = setInterval(scrollToBottom, 100)
    return () => clearInterval(interval)
  }, [containerRef, isStreaming])

  return {
    scrollToBottom: () => {
      userScrolledUpRef.current = false
      containerRef.current?.scrollTo({
        top: containerRef.current.scrollHeight,
        behavior: "smooth",
      })
    },
    isUserScrolledUp: userScrolledUpRef.current,
  }
}
