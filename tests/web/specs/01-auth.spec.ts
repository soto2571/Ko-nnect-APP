/**
 * 01-auth.spec.ts
 * Tests for login page — runs WITHOUT pre-authenticated state.
 */
import { test, expect } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage.ts';

const EMAIL    = process.env.TEST_EMAIL    ?? 'playwright@konnecta-tests.app';
const PASSWORD = process.env.TEST_PASSWORD ?? 'PlaywrightTest123!';

// These tests manage their own auth — do NOT use storageState
test.use({ storageState: { cookies: [], origins: [] } });

test.describe('Login page', () => {
  test('renders login form with all elements', async ({ page }) => {
    const login = new LoginPage(page);
    await login.goto();

    await expect(page.getByText('Ko-nnecta\'')).toBeVisible();
    await expect(login.emailInput).toBeVisible();
    await expect(login.passwordInput).toBeVisible();
    await expect(login.submitBtn).toBeVisible();
    await expect(login.googleBtn).toBeVisible();
  });

  test('shows error on empty form submission', async ({ page }) => {
    const login = new LoginPage(page);
    await login.goto();

    await login.submitBtn.click();
    const error = await login.getErrorText();
    expect(error.length).toBeGreaterThan(0);
  });

  test('shows error with wrong password', async ({ page }) => {
    const login = new LoginPage(page);
    await login.goto();

    await login.login(EMAIL, 'wrong-password-xyz');
    await page.waitForTimeout(2_000);

    // Should still be on login page
    expect(page.url()).toContain('/login');
    const error = await login.getErrorText();
    expect(error.length).toBeGreaterThan(0);
  });

  test('shows error with non-existent email', async ({ page }) => {
    const login = new LoginPage(page);
    await login.goto();

    await login.login('no-such-user@nowhere.com', 'somepassword123');
    await page.waitForTimeout(2_000);

    expect(page.url()).toContain('/login');
    const error = await login.getErrorText();
    expect(error.length).toBeGreaterThan(0);
  });

  test('shows error with invalid email format', async ({ page }) => {
    const login = new LoginPage(page);
    await login.goto();

    await login.login('notanemail', 'somepassword');
    await page.waitForTimeout(1_000);

    // Either native browser validation or app-level error
    expect(page.url()).toContain('/login');
  });

  test('successful login redirects to dashboard', async ({ page }) => {
    const login = new LoginPage(page);
    await login.goto();

    await login.loginAndWait(EMAIL, PASSWORD);
    expect(page.url()).toContain('/dashboard');
  });

  test('unauthenticated user is redirected from dashboard to login', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForURL(/login/, { timeout: 8_000 });
    expect(page.url()).toContain('/login');
  });

  test('unauthenticated user is redirected from employees to login', async ({ page }) => {
    await page.goto('/employees');
    await page.waitForURL(/login/, { timeout: 8_000 });
    expect(page.url()).toContain('/login');
  });

  test('unauthenticated user is redirected from timeclock to login', async ({ page }) => {
    await page.goto('/timeclock');
    await page.waitForURL(/login/, { timeout: 8_000 });
    expect(page.url()).toContain('/login');
  });

  test('unauthenticated user is redirected from settings to login', async ({ page }) => {
    await page.goto('/settings');
    await page.waitForURL(/login/, { timeout: 8_000 });
    expect(page.url()).toContain('/login');
  });

  test('password field masks input', async ({ page }) => {
    const login = new LoginPage(page);
    await login.goto();

    const type = await login.passwordInput.getAttribute('type');
    expect(type).toBe('password');
  });
});
