"use client"

import { Toaster as SonnerToaster, toast } from "sonner"

/**
 * Toast notification system using sonner.
 *
 * Usage:
 *   import { Toaster } from "@/components/ui/toast"      // Add to layout
 *   import { toast } from "@/components/ui/toast"          // Call from anywhere
 *
 *   toast.success("Saved!")
 *   toast.error("Something went wrong")
 *   toast("Neutral notification")
 */

function Toaster() {
  return (
    <SonnerToaster
      position="bottom-right"
      richColors
      closeButton
      duration={4000}
      toastOptions={{
        className: "font-sans",
      }}
    />
  )
}

export { Toaster, toast }
