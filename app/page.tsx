import { FindMyOrg } from "@/components/find-my-org"

/**
 * Bare domain entry point.
 *
 * Route: / (llmatscale.ai or localhost:3000)
 *
 * Renders the "Find My Organization" flow instead of a direct login.
 * Users enter their email -> system finds their org -> redirects to org login page.
 * If session exists: auto-redirects to the user's org chat or admin panel.
 *
 * The existing /chat route at app/chat/page.tsx still works for backward
 * compatibility during development, but the canonical path is /org/{slug}/chat.
 */
export default function Page() {
  return <FindMyOrg />
}
