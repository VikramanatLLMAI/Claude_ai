import { notFound } from "next/navigation";
import { validateInvitationToken } from "@/lib/services/registration-service";
import { RegisterPage } from "@/components/register-page";
import { AlertTriangle } from "lucide-react";

/**
 * Registration page - server component that validates invitation token and renders registration form.
 *
 * Route: /org/[slug]/register?token=xxx (dev) or {slug}.llmatscale.ai/register?token=xxx (prod)
 *
 * This server component:
 * - Extracts slug from params and token from searchParams
 * - Validates the invitation token directly (server-side, no API call needed)
 * - If invalid: renders an error page with the appropriate message
 * - If valid and slug matches: renders the RegisterPage client component with invitation data
 * - If slug doesn't match: triggers 404
 */

interface RegisterRouteProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ token?: string }>;
}

export default async function RegisterRoute({
  params,
  searchParams,
}: RegisterRouteProps) {
  const { slug } = await params;
  const { token } = await searchParams;

  // Token is required
  if (!token) {
    return <InvalidInvitation reason="no_token" />;
  }

  // Validate the invitation token
  const result = await validateInvitationToken(token);

  if (!result.valid) {
    return <InvalidInvitation reason={result.reason} />;
  }

  // Verify the token belongs to this org (slug matches)
  if (result.invitation.orgSlug !== slug) {
    return notFound();
  }

  // Render registration form
  return (
    <RegisterPage
      token={token}
      email={result.invitation.email}
      orgName={result.invitation.orgName}
      orgSlug={result.invitation.orgSlug}
      orgLogo={result.invitation.orgLogo}
      orgLogoDisplayMode={result.invitation.orgLogoDisplayMode}
      roleName={result.invitation.roleName}
      passwordRequirements={result.passwordRequirements}
    />
  );
}

/**
 * Error component for invalid invitations.
 * Displays a centered card with the appropriate error message and suggestion.
 */
function InvalidInvitation({ reason }: { reason: string }) {
  const messages: Record<string, { title: string; description: string }> = {
    no_token: {
      title: "Invalid Invitation Link",
      description:
        "This invitation link is missing a token. Please check the link in your email.",
    },
    not_found: {
      title: "Invitation Not Found",
      description:
        "This invitation link is invalid. Please contact your organization admin for a new invitation.",
    },
    expired: {
      title: "Invitation Expired",
      description:
        "This invitation has expired. Please contact your organization admin to resend the invitation.",
    },
    revoked: {
      title: "Invitation Revoked",
      description:
        "This invitation has been revoked. Please contact your organization admin if you believe this is an error.",
    },
    already_accepted: {
      title: "Already Accepted",
      description:
        "This invitation has already been accepted. Try logging in instead.",
    },
    org_unavailable: {
      title: "Organization Unavailable",
      description:
        "This organization is no longer available. Please contact your organization admin.",
    },
  };

  const msg = messages[reason] || messages.not_found;

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-6 text-center">
        <div className="rounded-xl border border-border bg-card p-8 shadow-sm">
          <div className="mb-4 flex justify-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10">
              <AlertTriangle className="h-7 w-7 text-destructive" />
            </div>
          </div>
          <h1 className="text-xl font-semibold text-foreground mb-2">
            {msg.title}
          </h1>
          <p className="text-sm text-muted-foreground">{msg.description}</p>
        </div>
      </div>
    </div>
  );
}
