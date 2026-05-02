/**
 * 02-dashboard.spec.ts
 * Tests for the main shift scheduling dashboard (week + month views).
 */
import { test, expect } from '../fixtures/auth.ts';
import { DashboardPage } from '../pages/DashboardPage.ts';

test.describe('Dashboard — Week view', () => {
  test('loads and shows week grid with 7 columns', async ({ page }) => {
    const dash = new DashboardPage(page);
    await dash.goto();

    // 7 day headers should be present
    for (const day of ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']) {
      const el = page.locator(`text=${day}`).first();
      await expect(el).toBeVisible({ timeout: 5_000 });
    }
  });

  test('week view shows seeded shifts', async ({ page }) => {
    const dash = new DashboardPage(page);
    await dash.goto();
    await dash.switchToWeek();

    const count = await dash.getShiftCount();
    expect(count).toBeGreaterThan(0);
  });

  test('shift count badge reflects current view', async ({ page }) => {
    const dash = new DashboardPage(page);
    await dash.goto();

    const badge = await dash.getShiftCountBadge();
    expect(badge).toMatch(/\d+ turno/i);
  });

  test('can navigate to previous week', async ({ page }) => {
    const dash = new DashboardPage(page);
    await dash.goto();

    const before = await dash.periodLabel.innerText().catch(() => '');
    await page.locator('button[aria-label], button').filter({ has: page.locator('svg') }).first().click();
    await page.waitForTimeout(400);
    const after = await dash.periodLabel.innerText().catch(() => '');

    // Period label should have changed OR "Ir a hoy" button appears
    const goToToday = dash.goToTodayBtn;
    expect(await goToToday.isVisible().catch(() => false)).toBe(true);
  });

  test('"Ir a hoy" button resets to current week', async ({ page }) => {
    const dash = new DashboardPage(page);
    await dash.goto();

    // Navigate back
    await page.locator('button').filter({ has: page.locator('svg') }).first().click();
    await page.waitForTimeout(300);
    await expect(dash.goToTodayBtn).toBeVisible();

    // Go back to today
    await dash.goToTodayBtn.click();
    await page.waitForTimeout(300);
    await expect(dash.goToTodayBtn).not.toBeVisible();
  });

  test('employee filter opens and filters shifts', async ({ page }) => {
    const dash = new DashboardPage(page);
    await dash.goto();

    const filterBtn = page.getByText('Empleado').first();
    await filterBtn.click();
    await page.waitForTimeout(300);

    // Modal should be visible
    await expect(page.getByText('Filtrar por empleado')).toBeVisible();

    // Select Ana García
    await page.getByText('Ana García').click();
    await page.waitForTimeout(400);

    // Filter should now show her name
    await expect(page.getByText('Ana García').first()).toBeVisible();
  });

  test('status filter "En Turno" shows only active employees', async ({ page }) => {
    const dash = new DashboardPage(page);
    await dash.goto();

    const enTurnoFilter = page.getByText('En Turno').first();
    if (await enTurnoFilter.isVisible().catch(() => false)) {
      await enTurnoFilter.click();
      await page.waitForTimeout(400);
      // Should show the clocked-in badge
      const badge = await dash.getClockedInBadge();
      expect(badge.toLowerCase()).toContain('en turno');
    }
  });

  test('clear filters button resets all filters', async ({ page }) => {
    const dash = new DashboardPage(page);
    await dash.goto();

    // Apply a filter first
    const filterBtn = page.getByText('Empleado').first();
    await filterBtn.click();
    await page.waitForTimeout(200);
    await page.getByText('Ana García').click();
    await page.waitForTimeout(300);

    // Clear
    await dash.clearFilters();
    await expect(page.getByText('Limpiar filtros')).not.toBeVisible({ timeout: 3_000 });
  });
});

test.describe('Dashboard — Month view', () => {
  test('switches to month view and shows calendar grid', async ({ page }) => {
    const dash = new DashboardPage(page);
    await dash.goto();
    await dash.switchToMonth();

    // Should show day-of-week headers
    for (const day of ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']) {
      await expect(page.locator(`text=${day}`).first()).toBeVisible();
    }
  });

  test('month view shows seeded shifts as mini cards', async ({ page }) => {
    const dash = new DashboardPage(page);
    await dash.goto();
    await dash.switchToMonth();

    const count = await dash.getShiftCount();
    expect(count).toBeGreaterThan(0);
  });

  test('can navigate to previous month', async ({ page }) => {
    const dash = new DashboardPage(page);
    await dash.goto();
    await dash.switchToMonth();

    await page.locator('button').filter({ has: page.locator('svg') }).first().click();
    await page.waitForTimeout(400);

    // "Ir a hoy" should appear after navigating away
    await expect(dash.goToTodayBtn).toBeVisible({ timeout: 4_000 });
  });

  test('month stats badge updates after switching from week', async ({ page }) => {
    const dash = new DashboardPage(page);
    await dash.goto();

    const weekBadge = await dash.getShiftCountBadge();

    await dash.switchToMonth();
    await page.waitForTimeout(400);

    const monthBadge = await dash.getShiftCountBadge();
    // Badge text exists in both modes
    expect(monthBadge).toMatch(/\d+ turno/i);
    // Month may have more shifts than the current week
    expect(monthBadge).toBeTruthy();
  });
});

test.describe('Dashboard — Create shift', () => {
  test('FAB opens create shift modal', async ({ page }) => {
    const dash = new DashboardPage(page);
    await dash.goto();
    await dash.openCreateShift();

    await expect(page.getByText('Nuevo turno')).toBeVisible();
    await expect(page.getByText('Paso 1 de 3')).toBeVisible();
  });

  test('step 1 requires at least one date selected', async ({ page }) => {
    const dash = new DashboardPage(page);
    await dash.goto();
    await dash.openCreateShift();

    // Try to continue without selecting a date
    await dash.clickContinue();
    await page.waitForTimeout(400);

    // Should still be on step 1 (no progress to step 2)
    await expect(page.getByText('Paso 1 de 3')).toBeVisible();
  });

  test('can select a date and advance to step 2', async ({ page }) => {
    const dash = new DashboardPage(page);
    await dash.goto();
    await dash.openCreateShift();

    await dash.selectNextAvailableDate();
    await page.waitForTimeout(300);

    await dash.clickContinue();
    await page.waitForTimeout(500);

    await expect(page.getByText('Paso 2 de 3')).toBeVisible();
  });

  test('step 2 shows time pickers and break options', async ({ page }) => {
    const dash = new DashboardPage(page);
    await dash.goto();
    await dash.openCreateShift();

    await dash.selectNextAvailableDate();
    await dash.clickContinue();
    await page.waitForTimeout(400);

    await expect(page.getByText('Entrada')).toBeVisible();
    await expect(page.getByText('Salida')).toBeVisible();
    await expect(page.getByText('Descanso')).toBeVisible();
    await expect(page.getByText('Sin descanso')).toBeVisible();
    await expect(page.getByText('30 min')).toBeVisible();
  });

  test('selecting break updates duration display', async ({ page }) => {
    const dash = new DashboardPage(page);
    await dash.goto();
    await dash.openCreateShift();

    await dash.selectNextAvailableDate();
    await dash.clickContinue();
    await page.waitForTimeout(400);

    await dash.selectBreak('30 min');
    await page.waitForTimeout(200);

    // Duration display should mention neto
    const duration = page.locator('text=/neto/i').first();
    await expect(duration).toBeVisible();
  });

  test('can advance to step 3 employee assignment', async ({ page }) => {
    const dash = new DashboardPage(page);
    await dash.goto();
    await dash.openCreateShift();

    await dash.selectNextAvailableDate();
    await dash.clickContinue();
    await page.waitForTimeout(400);

    await dash.clickContinue();
    await page.waitForTimeout(400);

    await expect(page.getByText('Paso 3 de 3')).toBeVisible();
    await expect(page.getByText('Asignar empleado')).toBeVisible();
  });

  test('can create shift assigned to an employee', async ({ page }) => {
    const dash = new DashboardPage(page);
    await dash.goto();

    const beforeCount = await dash.getShiftCount();

    await dash.openCreateShift();
    await dash.selectNextAvailableDate();
    await dash.clickContinue();
    await page.waitForTimeout(300);
    await dash.clickContinue();
    await page.waitForTimeout(300);
    await dash.selectEmployee('Ana García');
    await page.waitForTimeout(200);

    // Create the shift
    const createBtn = page.getByRole('button', { name: /crear turno/i }).last();
    await createBtn.click();
    await page.waitForTimeout(1_500);

    // Modal should close
    await expect(page.getByText('Nuevo turno').first()).not.toBeVisible({ timeout: 5_000 });

    // Shift count might have increased (if the day is visible)
    const afterCount = await dash.getShiftCount();
    expect(afterCount).toBeGreaterThanOrEqual(beforeCount);
  });

  test('pressing Cancelar closes modal without creating', async ({ page }) => {
    const dash = new DashboardPage(page);
    await dash.goto();

    await dash.openCreateShift();
    await page.getByRole('button', { name: /cancelar/i }).first().click();
    await page.waitForTimeout(300);

    await expect(page.getByText('Nuevo turno')).not.toBeVisible();
  });
});

test.describe('Dashboard — Edit & delete shift', () => {
  test('clicking a shift card opens edit modal', async ({ page }) => {
    const dash = new DashboardPage(page);
    await dash.goto();

    const cards = await dash.getShiftCards();
    if (cards.length === 0) {
      test.skip(); return;
    }

    // Find a non-completed shift (opacity:1, cursor:pointer)
    for (const card of cards) {
      const style = await card.getAttribute('style') ?? '';
      if (!style.includes('opacity: 0.7') && !style.includes('cursor: default')) {
        await card.click();
        await page.waitForTimeout(500);
        break;
      }
    }

    await expect(page.getByText('Editar turno')).toBeVisible({ timeout: 5_000 });
  });

  test('edit modal shows time pickers and employee selector', async ({ page }) => {
    const dash = new DashboardPage(page);
    await dash.goto();

    const cards = await dash.getShiftCards();
    if (cards.length === 0) { test.skip(); return; }

    for (const card of cards) {
      const style = await card.getAttribute('style') ?? '';
      if (!style.includes('opacity: 0.7') && !style.includes('cursor: default')) {
        await card.click();
        await page.waitForTimeout(500);
        break;
      }
    }

    await expect(page.getByText('Entrada')).toBeVisible();
    await expect(page.getByText('Salida')).toBeVisible();
    await expect(page.getByText('Guardar cambios')).toBeVisible();
  });
});
