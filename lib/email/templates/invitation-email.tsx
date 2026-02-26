/**
 * Invitation Email Template
 *
 * Professional invitation email sent when an Org Admin invites a user.
 * Built with @react-email/components for cross-client compatibility.
 * Style reference: Linear/Notion invite emails.
 */

import {
  Html,
  Head,
  Preview,
  Body,
  Container,
  Section,
  Heading,
  Text,
  Button,
  Hr,
} from '@react-email/components';
import * as React from 'react';

interface InvitationEmailProps {
  orgName: string;
  inviterName: string;
  roleName: string;
  acceptUrl: string;
  expiresInDays: number;
}

// Inline styles (React Email convention)
const main: React.CSSProperties = {
  backgroundColor: '#f6f9fc',
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
};

const container: React.CSSProperties = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  padding: '40px 20px',
  maxWidth: '560px',
};

const h1: React.CSSProperties = {
  color: '#171717',
  fontSize: '24px',
  fontWeight: '600',
  margin: '0 0 24px',
};

const text: React.CSSProperties = {
  color: '#484848',
  fontSize: '16px',
  lineHeight: '26px',
};

const buttonContainer: React.CSSProperties = {
  textAlign: 'center' as const,
  margin: '32px 0',
};

const button: React.CSSProperties = {
  backgroundColor: '#171717',
  color: '#fff',
  padding: '12px 24px',
  borderRadius: '6px',
  textDecoration: 'none',
  display: 'inline-block',
  fontSize: '16px',
  fontWeight: '600',
};

const smallText: React.CSSProperties = {
  color: '#898989',
  fontSize: '13px',
  lineHeight: '22px',
};

const hr: React.CSSProperties = {
  borderColor: '#e6ebf1',
  margin: '32px 0',
};

const footer: React.CSSProperties = {
  color: '#898989',
  fontSize: '12px',
  textAlign: 'center' as const,
};

export function InvitationEmail({
  orgName,
  inviterName,
  roleName,
  acceptUrl,
  expiresInDays,
}: InvitationEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>
        {inviterName} invited you to join {orgName} on LLMatscale.ai
      </Preview>
      <Body style={main}>
        <Container style={container}>
          <Section>
            <Heading style={h1}>Join {orgName} on LLMatscale.ai</Heading>
            <Text style={text}>
              {inviterName} has invited you to join <strong>{orgName}</strong> as
              a <strong>{roleName}</strong>.
            </Text>
          </Section>

          <Section style={buttonContainer}>
            <Button style={button} href={acceptUrl}>
              Accept Invitation
            </Button>
          </Section>

          <Section>
            <Text style={smallText}>
              This invitation expires in {expiresInDays} days. If you did not
              expect this invitation, you can safely ignore this email.
            </Text>
          </Section>

          <Hr style={hr} />

          <Section>
            <Text style={footer}>
              LLMatscale.ai &mdash; AI Chat Platform
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

export default InvitationEmail;
