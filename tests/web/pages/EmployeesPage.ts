import type { Page } from '@playwright/test';

export class EmployeesPage {
  constructor(public page: Page) {}

  async goto() {
    await this.page.goto('/employees');
    await this.page.waitForLoadState('networkidle');
    await this.waitForCards();
  }

  async waitForCards() {
    await this.page.waitForFunction(
      () => document.querySelectorAll('.sk-card').length === 0,
      { timeout: 10_000 }
    ).catch(() => {});
    await this.page.waitForTimeout(300);
  }

  // ── Page elements ──────────────────────────────────────────────────────────
  get addBtn()     { return this.page.getByRole('button', { name: /agregar empleado/i }).first(); }
  get heading()    { return this.page.getByText('Empleados').first(); }
  get empCount()   { return this.page.locator('text=/\\d+ empleado/i').first(); }

  // ── Employee cards grid ────────────────────────────────────────────────────
  async getEmployeeCards() {
    return this.page.locator('[style*="borderRadius: 20px"], [style*="border-radius: 20px"]')
      .filter({ hasText: /@/ }).all();
  }

  async getEmployeeCount(): Promise<number> {
    return (await this.getEmployeeCards()).length;
  }

  async openEmployeeByName(name: string) {
    await this.page.getByText(name, { exact: false }).first().click();
    await this.page.waitForTimeout(400);
  }

  // ── Add modal ─────────────────────────────────────────────────────────────
  get firstNameInput() { return this.page.locator('input[placeholder="Nombre"]'); }
  get lastNameInput()  { return this.page.locator('input[placeholder="Apellido"]'); }
  get createBtn()      { return this.page.getByRole('button', { name: /crear empleado/i }); }
  get addError()       { return this.page.locator('[style*="B91C1C"], [style*="FEF2F2"]').first(); }

  async openAddModal() {
    await this.addBtn.click();
    await this.page.waitForTimeout(300);
  }

  async fillAndCreate(firstName: string, lastName: string) {
    await this.firstNameInput.fill(firstName);
    await this.lastNameInput.fill(lastName);
    await this.createBtn.click();
    await this.page.waitForTimeout(600);
  }

  // ── Detail modal ──────────────────────────────────────────────────────────
  get detailCloseBtn()  { return this.page.getByRole('button', { name: /cerrar|×/i }).last(); }
  get editNameBtn()     { return this.page.getByRole('button', { name: /editar/i }).first(); }
  get saveEditBtn()     { return this.page.getByRole('button', { name: /guardar/i }).first(); }
  get cancelEditBtn()   { return this.page.getByRole('button', { name: /cancelar/i }).first(); }
  get resetPwBtn()      { return this.page.getByText('Resetear Contraseña'); }
  get deleteEmpBtn()    { return this.page.locator('[aria-label*="eliminar" i], button').filter({ has: this.page.locator('svg[stroke="currentColor"]') }).first(); }
  get confirmDeleteBtn(){ return this.page.getByRole('button', { name: /^eliminar$/i }).last(); }
  get cancelDeleteBtn() { return this.page.getByRole('button', { name: /cancelar/i }).last(); }

  async getCredentials(): Promise<{ email: string; password: string }> {
    const rows = await this.page.locator('p').filter({ hasText: /@/ }).all();
    const email = rows.length > 0 ? await rows[0].innerText() : '';
    // password row
    const pwRows = await this.page.locator('p').filter({ hasText: /[a-z]+\d{4}/i }).all();
    const password = pwRows.length > 0 ? await pwRows[0].innerText() : '';
    return { email, password };
  }

  async editEmployeeName(newFirst: string, newLast: string) {
    await this.editNameBtn.click();
    await this.page.waitForTimeout(200);
    const inputs = this.page.locator('input[placeholder="Nombre"], input[placeholder="Apellido"]');
    await inputs.nth(0).fill(newFirst);
    await inputs.nth(1).fill(newLast);
    await this.saveEditBtn.click();
    await this.page.waitForTimeout(600);
  }

  async resetPassword(): Promise<string> {
    await this.resetPwBtn.click();
    await this.page.waitForTimeout(800);
    const { password } = await this.getCredentials();
    return password;
  }

  async deleteEmployee() {
    // Click the red trash icon in detail modal header
    const trashBtn = this.page.locator('button').filter({ has: this.page.locator('svg') })
      .filter({ hasText: '' }).nth(0);
    // The delete icon button is the first button in the header action group
    const headerBtns = this.page.locator('[style*="display: flex"][style*="gap"]').last()
      .locator('button');
    const cnt = await headerBtns.count();
    if (cnt > 0) await headerBtns.first().click();
    await this.page.waitForTimeout(300);
    await this.confirmDeleteBtn.click();
    await this.page.waitForTimeout(600);
  }
}
