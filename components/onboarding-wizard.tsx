"use client"

/**
 * Onboarding Wizard - Multi-step wizard for new user compliance acknowledgment.
 *
 * Shown on first login to an org. Blocks access to chat until accepted.
 * 3 steps: Welcome -> Org Terms -> Confirmation
 *
 * Props:
 *   orgName - Organization display name
 *   orgSlug - Organization slug for API calls
 *   onboardingText - Org-specific terms text (or null for generic)
 *   conversationVisibility - Whether org has conversation visibility enabled
 *   onComplete - Callback when onboarding accepted successfully
 */

import * as React from "react"
import { motion, AnimatePresence } from "motion/react"
import { Button } from "@/components/ui/button"
import { ArrowRight, ArrowLeft, Check, Sparkles, FileText, CheckCircle2 } from "lucide-react"

const AUTH_TOKEN_KEY = "llmatscale_auth_token"

interface OnboardingWizardProps {
  orgName: string
  orgSlug: string
  onboardingText: string | null
  conversationVisibility: boolean
  onComplete: () => void
}

const STEPS = ["Welcome", "Terms", "Confirm"] as const

export function OnboardingWizard({
  orgName,
  orgSlug,
  onboardingText,
  conversationVisibility,
  onComplete,
}: OnboardingWizardProps) {
  const [currentStep, setCurrentStep] = React.useState(0)
  const [agreed, setAgreed] = React.useState(false)
  const [submitting, setSubmitting] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [direction, setDirection] = React.useState(1) // 1 = forward, -1 = back

  const goNext = () => {
    if (currentStep < STEPS.length - 1) {
      setDirection(1)
      setCurrentStep((s) => s + 1)
    }
  }

  const goBack = () => {
    if (currentStep > 0) {
      setDirection(-1)
      setCurrentStep((s) => s - 1)
    }
  }

  const handleAccept = async () => {
    setSubmitting(true)
    setError(null)

    try {
      const token = typeof window !== "undefined"
        ? localStorage.getItem(AUTH_TOKEN_KEY) || ""
        : ""

      const res = await fetch(`/api/org/${orgSlug}/onboarding`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || "Failed to record acceptance")
      }

      onComplete()
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
      setSubmitting(false)
    }
  }

  const termsText = onboardingText
    || "Your organization uses LLMatscale.ai for AI-powered chat. Please review and accept to continue."

  const slideVariants = {
    enter: (dir: number) => ({
      x: dir > 0 ? 60 : -60,
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
    },
    exit: (dir: number) => ({
      x: dir > 0 ? -60 : 60,
      opacity: 0,
    }),
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-8">
      <div className="w-full max-w-lg">
        {/* Progress indicator */}
        <div className="mb-8 flex items-center justify-center gap-3">
          {STEPS.map((step, i) => (
            <div key={step} className="flex items-center gap-3">
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold transition-colors ${
                  i < currentStep
                    ? "bg-primary text-primary-foreground"
                    : i === currentStep
                    ? "bg-primary text-primary-foreground ring-2 ring-primary/30 ring-offset-2 ring-offset-background"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {i < currentStep ? (
                  <Check className="h-3.5 w-3.5" />
                ) : (
                  i + 1
                )}
              </div>
              {i < STEPS.length - 1 && (
                <div
                  className={`h-px w-8 transition-colors ${
                    i < currentStep ? "bg-primary" : "bg-border"
                  }`}
                />
              )}
            </div>
          ))}
        </div>

        {/* Step content */}
        <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-lg">
          <div className="min-h-[360px] p-8">
            <AnimatePresence mode="wait" custom={direction}>
              {currentStep === 0 && (
                <motion.div
                  key="welcome"
                  custom={direction}
                  variants={slideVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{ duration: 0.25, ease: "easeInOut" }}
                  className="flex flex-col items-center text-center"
                >
                  <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                    <Sparkles className="h-8 w-8 text-primary" />
                  </div>
                  <h2 className="mb-2 text-xl font-bold text-foreground">
                    Welcome to {orgName}
                  </h2>
                  <p className="mb-1 text-sm text-muted-foreground">
                    on LLMatscale.ai
                  </p>
                  <p className="mt-4 max-w-sm text-sm text-muted-foreground leading-relaxed">
                    LLMatscale.ai is an AI-powered chat platform that helps teams
                    collaborate with Claude models. Your organization has set up a
                    workspace for you.
                  </p>
                  <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
                    Before you get started, please review and accept your
                    organization&apos;s terms of use.
                  </p>
                </motion.div>
              )}

              {currentStep === 1 && (
                <motion.div
                  key="terms"
                  custom={direction}
                  variants={slideVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{ duration: 0.25, ease: "easeInOut" }}
                >
                  <div className="mb-4 flex items-center gap-2">
                    <FileText className="h-5 w-5 text-primary" />
                    <h2 className="text-lg font-bold text-foreground">
                      Organization Terms
                    </h2>
                  </div>

                  <div className="mb-4 max-h-[220px] overflow-y-auto rounded-lg border border-border bg-muted/30 p-4">
                    <p className="whitespace-pre-wrap text-sm text-foreground leading-relaxed">
                      {termsText}
                    </p>
                  </div>

                  {/* Conversation visibility notice */}
                  {conversationVisibility && (
                    <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-800 dark:bg-amber-900/20">
                      <p className="text-sm text-amber-800 dark:text-amber-300">
                        Your conversations may be reviewed by your organization
                        administrator for compliance purposes.
                      </p>
                    </div>
                  )}
                </motion.div>
              )}

              {currentStep === 2 && (
                <motion.div
                  key="confirm"
                  custom={direction}
                  variants={slideVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{ duration: 0.25, ease: "easeInOut" }}
                  className="flex flex-col items-center text-center"
                >
                  <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                    <CheckCircle2 className="h-8 w-8 text-primary" />
                  </div>
                  <h2 className="mb-4 text-lg font-bold text-foreground">
                    Confirm Agreement
                  </h2>

                  <div className="mb-6 w-full rounded-lg border border-border bg-muted/30 p-4 text-left text-sm text-muted-foreground space-y-2">
                    <p>By accepting, you agree to:</p>
                    <ul className="list-disc pl-5 space-y-1">
                      <li>The organization terms of use shown in the previous step</li>
                      {conversationVisibility && (
                        <li>Your conversations may be reviewed by your organization administrator</li>
                      )}
                      <li>The LLMatscale.ai platform terms of service</li>
                    </ul>
                  </div>

                  {/* Checkbox */}
                  <label className="flex cursor-pointer items-start gap-3 text-left">
                    <input
                      type="checkbox"
                      checked={agreed}
                      onChange={(e) => setAgreed(e.target.checked)}
                      className="mt-0.5 h-4 w-4 rounded border-border accent-primary"
                    />
                    <span className="text-sm text-foreground">
                      I have read and agree to the above terms
                    </span>
                  </label>

                  {/* Error */}
                  {error && (
                    <p className="mt-3 text-sm text-destructive">{error}</p>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Navigation footer */}
          <div className="flex items-center justify-between border-t border-border bg-muted/20 px-8 py-4">
            <div>
              {currentStep > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={goBack}
                  disabled={submitting}
                >
                  <ArrowLeft className="mr-1.5 h-4 w-4" />
                  Back
                </Button>
              )}
            </div>
            <div>
              {currentStep < 2 ? (
                <Button size="sm" onClick={goNext}>
                  Next
                  <ArrowRight className="ml-1.5 h-4 w-4" />
                </Button>
              ) : (
                <Button
                  size="sm"
                  onClick={handleAccept}
                  disabled={!agreed || submitting}
                >
                  {submitting ? (
                    "Accepting..."
                  ) : (
                    <>
                      <Check className="mr-1.5 h-4 w-4" />
                      I Agree
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
