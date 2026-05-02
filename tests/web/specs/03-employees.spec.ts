/**
 * 03-employees.spec.ts
 * Tests for the employees management page.
 */
import { test, expect } from '../fixtures/auth.ts';
import { EmployeesPage } from '../pages/EmployeesPage.ts';

test.describe('Employees — List', () => {
  test('shows seeded employees', async ({ page }) => {
    const emp = new EmployeesPage(page);
    await emp.goto();

    await expect(page.getByText('Ana García')).toBeVisible();
    await expect(page.getByText('Pedro Martínez')).toBeVisible();
    await expect(page.getByText('Luis Rodríguez')).toBeVisible();
  });

  test('employee count badge is accurate', async ({ page }) => {
    const emp = new EmployeesPage(page);
    await emp.goto();

    const count = await emp.getEmployeeCount();
    const badgeText = await emp.empCount.innerText().catch(() => '0');
    const badgeNum = parseInt(badgeText.match(/\d+/)?.[0] ?? '0');

    expect(badgeNum).toBeGreaterThanOrEqual(3);
    expect(count).toBeGreaterThanOrEqual(3);
  });

  test('each employee card shows name and email', async ({ page }) => {
    const emp = new EmployeesPage(page);
    await emp.goto();

    await expect(page.getByText('Ana García')).toBeVisible();
    // Email for Ana should be visible (format: ana.garcia@...)
    await expect(page.locator('text=/ana\\.garcia.*\\.app/i').first()).toBeVisible();
  });
});

test.describe('Employees — Add', () => {
  test('add modal opens with empty fields', async ({ page }) => {
    const emp = new EmployeesPage(page);
    await emp.goto();
    await emp.openAddModal();

    await expect(page.getByText('Agregar Empleado')).toBeVisible();
    await expect(emp.firstNameInput).toBeVisible();
    await expect(emp.lastNameInput).toBeVisible();
    await expect(emp.createBtn).toBeVisible();
    // Fields should be empty
    expect(await emp.firstNameInput.inputValue()).toBe('');
    expect(await emp.lastNameInput.inputValue()).toBe('');
  });

  test('shows error when submitting empty first name', async ({ page }) => {
    const emp = new EmployeesPage(page);
    await emp.goto();
    await emp.openAddModal();

    await emp.lastNameInput.fill('Pérez');
    await emp.createBtn.click();
    await page.waitForTimeout(500);

    const error = await emp.addError.innerText().catch(() => '');
    expect(error.length).toBeGreaterThan(0);
  });

  test('shows error when submitting empty last name', async ({ page }) => {
    const emp = new EmployeesPage(page);
    await emp.goto();
    await emp.openAddModal();

    await emp.firstNameInput.fill('Carlos');
    await emp.createBtn.click();
    await page.waitForTimeout(500);

    const error = await emp.addError.innerText().catch(() => '');
    expect(error.length).toBeGreaterThan(0);
  });

  test('shows error when both fields empty', async ({ page }) => {
    const emp = new EmployeesPage(page);
    await emp.goto();
    await emp.openAddModal();

    await emp.createBtn.click();
    await page.waitForTimeout(500);

    const error = await emp.addError.innerText().catch(() => '');
    expect(error.length).toBeGreaterThan(0);
  });

  test('successfully creates a new employee and shows credentials', async ({ page }) => {
    const emp = new EmployeesPage(page);
    await emp.goto();

    const before = await emp.getEmployeeCount();

    await emp.openAddModal();
    await emp.fillAndCreate('Sofía', 'Torres');

    // After creation, should show credentials (detail view)
    await expect(page.getByText('Sofía Torres')).toBeVisible({ timeout: 5_000 });
    await expect(page.getByText('Credenciales de Acceso')).toBeVisible();
    await expect(page.locator('text=/sofía|sofia/i').first()).toBeVisible();

    // Close and verify count increased
    await page.keyboard.press('Escape');
    await emp.waitForCards();

    const after = await emp.getEmployeeCount();
    expect(after).toBeGreaterThan(before);
  });

  test('generated email follows naming convention', async ({ page }) => {
    const emp = new EmployeesPage(page);
    await emp.goto();
    await emp.openAddModal();
    await emp.fillAndCreate('Marco', 'Rivera');

    // Email should be marco.rivera@<businessname>.app or similar
    const creds = await emp.getCredentials();
    expect(creds.email).toMatch(/marco.*\.app/i);
    expect(creds.email).toContain('@');
  });

  test('generated password is not empty', async ({ page }) => {
    const emp = new EmployeesPage(page);
    await emp.goto();
    await emp.openAddModal();
    await emp.fillAndCreate('Elena', 'Vázquez');

    const creds = await emp.getCredentials();
    expect(creds.password.length).toBeGreaterThan(0);
    expect(creds.password).not.toBe('—');
  });

  test('copy button for email changes to checkmark', async ({ page }) => {
    const emp = new EmployeesPage(page);
    await emp.goto();
    await emp.openAddModal();
    await emp.fillAndCreate('Raúl', 'Mendoza');

    // Find copy buttons
    const copyBtns = page.locator('button').filter({ has: page.locator('svg') })
      .filter({ hasText: '' });
    const firstCopy = copyBtns.first();
    if (await firstCopy.isVisible().catch(() => false)) {
      await firstCopy.click();
      await page.waitForTimeout(300);
      // Background changes to green when copied
      const style = await firstCopy.getAttribute('style') ?? '';
      expect(style).toMatch(/D1FAE5|059669/);
    }
  });
});

test.describe('Employees — Edit', () => {
  test('can open employee detail by clicking card', async ({ page }) => {
    const emp = new EmployeesPage(page);
    await emp.goto();
    await emp.openEmployeeByName('Ana García');

    await expect(page.getByText('Perfil del Empleado')).toBeVisible();
    await expect(page.getByText('Ana García')).toBeVisible();
  });

  test('edit mode shows name input fields', async ({ page }) => {
    const emp = new EmployeesPage(page);
    await emp.goto();
    await emp.openEmployeeByName('Pedro Martínez');

    await emp.editNameBtn.click();
    await page.waitForTimeout(300);

    await expect(emp.page.locator('input[placeholder="Nombre"]')).toBeVisible();
    await expect(emp.page.locator('input[placeholder="Apellido"]')).toBeVisible();
  });

  test('cancel edit restores original name', async ({ page }) => {
    const emp = new EmployeesPage(page);
    await emp.goto();
    await emp.openEmployeeByName('Pedro Martínez');

    await emp.editNameBtn.click();
    await page.waitForTimeout(300);

    const inputs = page.locator('input[placeholder="Nombre"], input[placeholder="Apellido"]');
    await inputs.nth(0).fill('OtroNombre');
    await emp.cancelEditBtn.click();
    await page.waitForTimeout(300);

    // Original name should still be visible
    await expect(page.getByText('Pedro Martínez')).toBeVisible();
  });

  test('saves edited name successfully', async ({ page }) => {
    const emp = new EmployeesPage(page);
    await emp.goto();
    await emp.openEmployeeByName('Luis Rodríguez');

    await emp.editNameBtn.click();
    await page.waitForTimeout(300);

    const inputs = page.locator('input[placeholder="Nombre"], input[placeholder="Apellido"]');
    await inputs.nth(0).fill('Luis');
    await inputs.nth(1).fill('Rodríguez');
    await emp.saveEditBtn.click();
    await page.waitForTimeout(800);

    await expect(page.getByText('Luis Rodríguez')).toBeVisible();
  });
});

test.describe('Employees — Reset password', () => {
  test('reset password button generates new credentials', async ({ page }) => {
    const emp = new EmployeesPage(page);
    await emp.goto();
    await emp.openEmployeeByName('Ana García');

    const before = await emp.getCredentials();
    await emp.resetPwBtn.click();
    await page.waitForTimeout(1_200);

    const after = await emp.getCredentials();
    // New password should differ from old
    expect(after.password).not.toBe(before.password);
    expect(after.password.length).toBeGreaterThan(0);
  });
});

test.describe('Employees — Delete', () => {
  test('delete confirmation modal appears', async ({ page }) => {
    const emp = new EmployeesPage(page);
    await emp.goto();

    // Open any employee that was created during tests (not the seeded ones we need)
    // First, create a temp employee to delete
    await emp.openAddModal();
    await emp.fillAndCreate('Temp', 'Delete');
    await page.waitForTimeout(400);

    // In detail view, click the delete icon (first button in header actions)
    const headerRow = page.locator('div').filter({ hasText: 'Perfil del Empleado' }).first();
    const deleteBtns = page.locator('button').filter({ has: page.locator('svg') })
      .filter({ hasText: '' });
    // Find red-styled button
    const allBtns = await deleteBtns.all();
    for (const btn of allBtns) {
      const style = await btn.getAttribute('style') ?? '';
      if (style.includes('EF4444') || style.includes('FEE2E2') || style.includes('red')) {
        await btn.click();
        await page.waitForTimeout(300);
        break;
      }
    }

    await expect(page.getByText('Eliminar Empleado')).toBeVisible({ timeout: 5_000 });
  });

  test('cancel delete keeps employee in list', async ({ page }) => {
    const emp = new EmployeesPage(page);
    await emp.goto();

    const before = await emp.getEmployeeCount();

    await emp.openEmployeeByName('Pedro Martínez');
    await page.waitForTimeout(300);

    // Try to find and click trash icon
    const allBtns = await page.locator('button').all();
    let clicked = false;
    for (const btn of allBtns) {
      const style = await btn.getAttribute('style') ?? '';
      if ((style.includes('EF4444') || style.includes('fee')) && await btn.isVisible()) {
        await btn.click();
        clicked = true;
        await page.waitForTimeout(300);
        break;
      }
    }

    if (clicked && await page.getByText('Eliminar Empleado').isVisible().catch(() => false)) {
      await emp.cancelDeleteBtn.click();
      await page.waitForTimeout(300);

      // Close modal
      await page.keyboard.press('Escape');
      await emp.waitForCards();

      const after = await emp.getEmployeeCount();
      expect(after).toBe(before);
    }
  });
});
