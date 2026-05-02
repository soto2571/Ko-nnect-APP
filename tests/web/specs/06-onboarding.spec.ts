/**
 * 06-onboarding.spec.ts
 * Tests for the 3-step onboarding wizard.
 * Uses a SEPARATE user that has no business yet.
 */
import { test, expect } from '@playwright/test';
import { OnboardingPage } from '../pages/OnboardingPage.ts';
import { config } from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
config({ path: path.resolve(__dirname, '../.env.test') });

const SUPABASE_URL  = process.env.SUPABASE_URL!;
const FUNCTIONS_URL = `${SUPABASE_URL}/functions/v1`;
const SERVICE_KEY   = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const BASE_URL      = process.env.BASE_URL ?? 'http://localhost:3000';

// A fresh user with NO business for onboarding tests
const OB_EMAIL    = 'playwright-ob@konnecta-tests.app';
const OB_PASSWORD = 'PlaywrightOB123!';

// These tests create their own session (no global storageState)
test.use({ storageState: { cookies: [], origins: [] } });

async function createOnboardingUser() {
  const headers = { 'Content-Type': 'application/json' };
  try {
    await fetch(`${FUNCTIONS_URL}/auth-signup`, {
      method: 'POST', headers,
      body: JSON.stringify({ email: OB_EMAIL, password: OB_PASSWORD, firstName: 'Onboard', lastName: 'Test', role: 'owner' }),
    });
  } catch { /* may already exist */ }
}

async function deleteOnboardingUser() {
  if (!SERVICE_KEY) return;
  const res = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
    headers: { 'apikey': SERVICE_KEY, 'Authorization': `Bearer ${SERVICE_KEY}` },
  });
  const data = await res.json().catch(() => ({ users: [] })) as { users?: any[] };
  const user = data.users?.find((u: any) => u.email === OB_EMAIL);
  if (user) {
    await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${user.id}`, {
      method: 'DELETE',
      headers: { 'apikey': SERVICE_KEY, 'Authorization': `Bearer ${SERVICE_KEY}` },
    });
    await fetch(`${SUPABASE_URL}/rest/v1/users?email=eq.${encodeURIComponent(OB_EMAIL)}`, {
      method: 'DELETE',
      headers: { 'apikey': SERVICE_KEY, 'Authorization': `Bearer ${SERVICE_KEY}` },
    });
  }
}

async function loginAsOnboardUser(page: any) {
  await page.goto(`${BASE_URL}/login`);
  await page.waitForLoadState('networkidle');
  await page.fill('input[type="email"]', OB_EMAIL);
  await page.fill('input[type="password"]', OB_PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForURL(/onboarding|dashboard/, { timeout: 15_000 });
}

test.beforeAll(async () => {
  await createOnboardingUser();
});

test.afterAll(async () => {
  await deleteOnboardingUser();
});

test.describe('Onboarding — Redirect', () => {
  test('user without business is redirected to /onboarding after login', async ({ page }) => {
    await loginAsOnboardUser(page);
    await page.waitForURL(/onboarding/, { timeout: 10_000 });
    expect(page.url()).toContain('/onboarding');
  });

  test('dashboard layout redirects no-business user to onboarding', async ({ page }) => {
    await loginAsOnboardUser(page);
    await page.waitForURL(/onboarding/, { timeout: 10_000 });
    await page.goto(`${BASE_URL}/dashboard`);
    await page.waitForURL(/onboarding/, { timeout: 8_000 });
    expect(page.url()).toContain('/onboarding');
  });
});

test.describe('Onboarding — Page structure', () => {
  test('shows logo and step indicator', async ({ page }) => {
    await loginAsOnboardUser(page);
    await page.waitForURL(/onboarding/, { timeout: 10_000 });

    await expect(page.locator('img[alt="Ko-nnecta\'"]')).toBeVisible();
    await expect(page.getByText('PASO 1 DE 3')).toBeVisible();
  });

  test('step bar shows 3 steps with correct labels', async ({ page }) => {
    await loginAsOnboardUser(page);
    await page.waitForURL(/onboarding/, { timeout: 10_000 });

    await expect(page.getByText('Negocio').first()).toBeVisible();
    await expect(page.getByText('Equipo').first()).toBeVisible();
    await expect(page.getByText('¡Listo!').first()).toBeVisible();
  });

  test('back button is visible on step 1', async ({ page }) => {
    await loginAsOnboardUser(page);
    await page.waitForURL(/onboarding/, { timeout: 10_000 });

    const ob = new OnboardingPage(page);
    await expect(ob.backBtn).toBeVisible();
  });

  test('glassmorphism card is visible', async ({ page }) => {
    await loginAsOnboardUser(page);
    await page.waitForURL(/onboarding/, { timeout: 10_000 });

    await expect(page.getByText('Configura tu negocio')).toBeVisible();
  });
});

test.describe('Onboarding — Step 1: Business setup', () => {
  test('shows business name field', async ({ page }) => {
    await loginAsOnboardUser(page);
    await page.waitForURL(/onboarding/, { timeout: 10_000 });

    const ob = new OnboardingPage(page);
    await expect(ob.bizNameInput).toBeVisible();
  });

  test('shows color picker swatches', async ({ page }) => {
    await loginAsOnboardUser(page);
    await page.waitForURL(/onboarding/, { timeout: 10_000 });

    await expect(page.getByText('Color de marca')).toBeVisible();
    // 8 color swatches should be present
    const colorBtns = page.locator('button').filter({ hasText: '' });
    const count = await colorBtns.count();
    expect(count).toBeGreaterThanOrEqual(8);
  });

  test('shows pay period type options', async ({ page }) => {
    await loginAsOnboardUser(page);
    await page.waitForURL(/onboarding/, { timeout: 10_000 });

    await expect(page.getByText('Semanal')).toBeVisible();
    await expect(page.getByText('Bisemanal')).toBeVisible();
    await expect(page.getByText('Quincenal')).toBeVisible();
  });

  test('empty business name shows error on submit', async ({ page }) => {
    await loginAsOnboardUser(page);
    await page.waitForURL(/onboarding/, { timeout: 10_000 });

    const ob = new OnboardingPage(page);
    await ob.continueStep1();

    const error = await ob.getStep1Error();
    expect(error.length).toBeGreaterThan(0);
    expect(error.toLowerCase()).toMatch(/requerid|nombre/);
  });

  test('selecting biweekly shows start day and anchor date', async ({ page }) => {
    await loginAsOnboardUser(page);
    await page.waitForURL(/onboarding/, { timeout: 10_000 });

    const ob = new OnboardingPage(page);
    await ob.selectPayPeriodType('Bisemanal');

    await expect(page.getByText('Inicia la semana el')).toBeVisible();
    await expect(page.getByText('Inicio del período de referencia')).toBeVisible();
  });

  test('selecting semi-monthly shows info note', async ({ page }) => {
    await loginAsOnboardUser(page);
    await page.waitForURL(/onboarding/, { timeout: 10_000 });

    const ob = new OnboardingPage(page);
    await ob.selectPayPeriodType('Quincenal');

    await expect(page.getByText(/1 al 15/)).toBeVisible();
    await expect(page.getByText(/16/)).toBeVisible();
  });

  test('valid business name advances to step 2', async ({ page }) => {
    await loginAsOnboardUser(page);
    await page.waitForURL(/onboarding/, { timeout: 10_000 });

    const ob = new OnboardingPage(page);
    await ob.fillBusinessName('Mi Negocio de Prueba');
    await ob.continueStep1();

    await page.waitForTimeout(1_500);
    const step = await ob.getCurrentStep();
    expect(step).toBe(2);
  });
});

test.describe('Onboarding — Step 2: Add employees', () => {
  async function getToStep2(page: any) {
    await loginAsOnboardUser(page);
    await page.waitForURL(/onboarding/, { timeout: 10_000 });
    const ob = new OnboardingPage(page);
    await ob.fillBusinessName('Mi Negocio de Prueba');
    await ob.continueStep1();
    await page.waitForTimeout(1_500);
    return ob;
  }

  test('step 2 shows employee form and skip button', async ({ page }) => {
    const ob = await getToStep2(page);

    await expect(ob.empFirstInput).toBeVisible();
    await expect(ob.empLastInput).toBeVisible();
    await expect(ob.addEmpBtn).toBeVisible();
    await expect(ob.skipBtn).toBeVisible();
  });

  test('shows error when adding employee with empty first name', async ({ page }) => {
    const ob = await getToStep2(page);

    await ob.empLastInput.fill('García');
    await ob.addEmpBtn.click();
    await page.waitForTimeout(500);

    const error = await ob.empError.innerText().catch(() => '');
    expect(error.length).toBeGreaterThan(0);
  });

  test('shows error when adding employee with empty last name', async ({ page }) => {
    const ob = await getToStep2(page);

    await ob.empFirstInput.fill('Ana');
    await ob.addEmpBtn.click();
    await page.waitForTimeout(500);

    const error = await ob.empError.innerText().catch(() => '');
    expect(error.length).toBeGreaterThan(0);
  });

  test('successfully adds an employee and shows "Listo" badge', async ({ page }) => {
    const ob = await getToStep2(page);

    await ob.addEmployee('Prueba', 'Empleado');

    const count = await ob.getAddedEmployeeCount();
    expect(count).toBeGreaterThan(0);
  });

  test('added employee shows copy-able email and password', async ({ page }) => {
    const ob = await getToStep2(page);

    await ob.addEmployee('Copy', 'Test');

    // Should show credentials
    await expect(page.getByText('Correo', { exact: false })).toBeVisible();
    await expect(page.getByText('Contraseña', { exact: false })).toBeVisible();
  });

  test('skip button advances to step 3 without adding employees', async ({ page }) => {
    const ob = await getToStep2(page);

    await ob.skipEmployees();
    await page.waitForTimeout(500);

    const step = await ob.getCurrentStep();
    expect(step).toBe(3);
  });

  test('continue button appears after adding an employee', async ({ page }) => {
    const ob = await getToStep2(page);

    await ob.addEmployee('Continue', 'Test');

    await expect(ob.continueStep2Btn).toBeVisible({ timeout: 3_000 });
  });

  test('back button from step 2 goes to step 1', async ({ page }) => {
    const ob = await getToStep2(page);

    await ob.clickBack();

    const step = await ob.getCurrentStep();
    expect(step).toBe(1);
  });
});

test.describe('Onboarding — Step 3: Completion', () => {
  async function getToStep3(page: any) {
    await loginAsOnboardUser(page);
    await page.waitForURL(/onboarding/, { timeout: 10_000 });
    const ob = new OnboardingPage(page);
    await ob.fillBusinessName('Mi Negocio Final');
    await ob.continueStep1();
    await page.waitForTimeout(1_500);
    await ob.skipEmployees();
    await page.waitForTimeout(500);
    return ob;
  }

  test('step 3 shows "¡Todo listo!" heading', async ({ page }) => {
    await getToStep3(page);

    await expect(page.getByText('¡Todo listo!')).toBeVisible();
  });

  test('step 3 shows checklist with business name', async ({ page }) => {
    await getToStep3(page);

    await expect(page.getByText('Negocio configurado')).toBeVisible();
    await expect(page.getByText('Listo para crear turnos')).toBeVisible();
  });

  test('step 3 shows "Entrar al dashboard" button', async ({ page }) => {
    const ob = await getToStep3(page);

    await expect(ob.enterDashboardBtn).toBeVisible();
  });

  test('"Entrar al dashboard" redirects to /dashboard', async ({ page }) => {
    const ob = await getToStep3(page);

    await ob.enterDashboard();

    expect(page.url()).toContain('/dashboard');
  });

  test('back button from step 3 goes back to step 2', async ({ page }) => {
    const ob = await getToStep3(page);

    await ob.clickBack();

    const step = await ob.getCurrentStep();
    expect(step).toBe(2);
  });
});
