import { test, expect } from '@playwright/test';

/**
 * E2E tests for admin navigation (TEST-08).
 *
 * Tests cover:
 * 1. Sidebar collapse toggles icon-only mode
 * 2. Profile section shows user info
 * 3. Back to Chat navigates correctly
 *
 * Seed data required:
 * - Org: acme-corp
 * - Admin user: admin@acme-corp.test / password123 (Org Admin role)
 */

const TEST_EMAIL = 'admin@acme-corp.test';
const TEST_PASSWORD = 'password123';
const ORG_SLUG = 'acme-corp';

test.describe('Admin Navigation', () => {
  test.beforeEach(async ({ page }) => {
    // Clear any existing session
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.removeItem('llmatscale_auth_session');
      localStorage.removeItem('llmatscale_auth_token');
    });

    // Log in as admin user via org login page
    await page.goto(`/org/${ORG_SLUG}/login`);
    await page.getByPlaceholder('name@company.com').fill(TEST_EMAIL);
    await page.getByPlaceholder('Enter your password').fill(TEST_PASSWORD);
    await page.getByRole('button', { name: /sign in/i }).click();

    // Wait for chat page to load
    await page.waitForURL(`**/org/${ORG_SLUG}/chat**`, { timeout: 15000 });

    // Navigate to admin page
    await page.goto(`/org/${ORG_SLUG}/admin`);

    // Wait for admin page to load (sidebar should be visible)
    await page.waitForURL(`**/org/${ORG_SLUG}/admin**`, { timeout: 15000 });
  });

  test('sidebar collapse toggles icon-only mode', async ({ page }) => {
    // 1. Verify sidebar is expanded - look for navigation text labels
    const sidebar = page.locator('[data-sidebar="sidebar"]');
    await expect(sidebar).toBeVisible({ timeout: 10000 });

    // Check that a navigation label is visible when expanded (e.g., "Roles")
    const rolesLink = page.getByRole('link', { name: /roles/i });
    await expect(rolesLink).toBeVisible();

    // 2. Click the sidebar collapse button (the header icon button that toggles)
    const collapseButton = page.locator(
      'button[aria-label="Collapse sidebar"], button[aria-label="Expand sidebar"]'
    );
    await collapseButton.click();

    // 3. Verify sidebar is collapsed - the sidebar element should have collapsed state
    // In collapsed mode, the sidebar wrapper gets data-state="collapsed"
    await expect(sidebar).toHaveAttribute('data-state', 'collapsed', { timeout: 5000 });

    // 4. Click collapse button again to expand
    await collapseButton.click();

    // 5. Verify sidebar is expanded again
    await expect(sidebar).toHaveAttribute('data-state', 'expanded', { timeout: 5000 });
  });

  test('profile section shows user info', async ({ page }) => {
    // 1. Wait for sidebar footer to be visible
    const sidebarFooter = page.locator('[data-sidebar="footer"]');
    await expect(sidebarFooter).toBeVisible({ timeout: 10000 });

    // 2. Look for user name or avatar initial in the footer profile section
    // The profile button shows the user's name when sidebar is expanded
    const profileButton = sidebarFooter.getByRole('button');
    await expect(profileButton).toBeVisible();

    // 3. The profile button should contain some user-identifying text
    // In expanded mode, it shows the user's name (from session)
    const profileText = sidebarFooter.locator('span.truncate');
    await expect(profileText).toBeVisible();
  });

  test('back to chat navigates correctly', async ({ page }) => {
    // 1. Wait for sidebar to load
    const sidebarFooter = page.locator('[data-sidebar="footer"]');
    await expect(sidebarFooter).toBeVisible({ timeout: 10000 });

    // 2. Open the profile expander to reveal the "Back to Chat" button
    const profileButton = sidebarFooter.getByRole('button').first();
    await profileButton.click();

    // 3. Find and click "Back to Chat" button
    const backToChatButton = page.getByRole('button', { name: /back to chat/i });
    await expect(backToChatButton).toBeVisible({ timeout: 5000 });
    await backToChatButton.click();

    // 4. Wait for URL to contain /chat
    await page.waitForURL(`**/org/${ORG_SLUG}/chat**`, { timeout: 15000 });

    // 5. Verify chat page loaded
    await expect(page).toHaveURL(new RegExp(`/org/${ORG_SLUG}/chat`));
  });
});
