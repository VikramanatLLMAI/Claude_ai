import { test, expect, Page } from '@playwright/test';

/**
 * E2E tests for login flows (TEST-07).
 *
 * Tests cover:
 * 1. Bare domain email-first login flow (FindMyOrg -> OrgLogin -> Chat)
 * 2. Direct org login page authentication
 * 3. Failed login with wrong password
 *
 * Seed data required:
 * - Org: acme-corp
 * - Admin user: admin@acme-corp.test / password123
 */

const TEST_EMAIL = 'admin@acme-corp.test';
const TEST_PASSWORD = 'password123';
const ORG_SLUG = 'acme-corp';

/**
 * Helper: Log in via the org login page.
 */
async function loginViaOrgPage(page: Page, email: string, password: string) {
  await page.goto(`/org/${ORG_SLUG}/login`);
  await page.getByPlaceholder('name@company.com').fill(email);
  await page.getByPlaceholder('Enter your password').fill(password);
  await page.getByRole('button', { name: /sign in/i }).click();
}

test.describe('Login Flows', () => {
  test.beforeEach(async ({ page }) => {
    // Clear any existing session data before each test
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.removeItem('llmatscale_auth_session');
      localStorage.removeItem('llmatscale_auth_token');
    });
  });

  test('bare domain email-first login flow', async ({ page }) => {
    // 1. Navigate to bare domain
    await page.goto('/');

    // 2. Find email input and fill with admin email
    await page.getByPlaceholder('name@company.com').fill(TEST_EMAIL);

    // 3. Click Continue button
    await page.getByRole('button', { name: /continue/i }).click();

    // 4. Wait for redirect to org login page
    await page.waitForURL(`**/org/${ORG_SLUG}/login**`);

    // 5. Fill password (email may or may not be pre-filled; fill it to be safe)
    const emailInput = page.getByPlaceholder('name@company.com');
    const emailValue = await emailInput.inputValue();
    if (!emailValue) {
      await emailInput.fill(TEST_EMAIL);
    }
    await page.getByPlaceholder('Enter your password').fill(TEST_PASSWORD);

    // 6. Click Sign In
    await page.getByRole('button', { name: /sign in/i }).click();

    // 7. Wait for redirect to chat page
    await page.waitForURL(`**/org/${ORG_SLUG}/chat**`, { timeout: 15000 });

    // 8. Verify chat page loaded (check URL is correct)
    await expect(page).toHaveURL(new RegExp(`/org/${ORG_SLUG}/chat`));
  });

  test('org login page direct login', async ({ page }) => {
    // 1. Navigate directly to org login page
    await page.goto(`/org/${ORG_SLUG}/login`);

    // 2. Fill email and password
    await page.getByPlaceholder('name@company.com').fill(TEST_EMAIL);
    await page.getByPlaceholder('Enter your password').fill(TEST_PASSWORD);

    // 3. Click Sign In
    await page.getByRole('button', { name: /sign in/i }).click();

    // 4. Wait for redirect to chat page
    await page.waitForURL(`**/org/${ORG_SLUG}/chat**`, { timeout: 15000 });

    // 5. Verify chat page loaded
    await expect(page).toHaveURL(new RegExp(`/org/${ORG_SLUG}/chat`));
  });

  test('login fails with wrong password', async ({ page }) => {
    // 1. Navigate to org login page
    await page.goto(`/org/${ORG_SLUG}/login`);

    // 2. Fill email with valid user
    await page.getByPlaceholder('name@company.com').fill(TEST_EMAIL);

    // 3. Fill wrong password
    await page.getByPlaceholder('Enter your password').fill('wrongpassword');

    // 4. Click Sign In
    await page.getByRole('button', { name: /sign in/i }).click();

    // 5. Verify error message appears (should stay on login page with error)
    const errorMessage = page.locator('.text-destructive');
    await expect(errorMessage).toBeVisible({ timeout: 10000 });

    // 6. Verify we're still on the login page
    await expect(page).toHaveURL(new RegExp(`/org/${ORG_SLUG}/login`));
  });
});
