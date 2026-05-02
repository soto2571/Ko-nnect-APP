import type { Page } from '@playwright/test';

export class OnboardingPage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto('/onboarding');
    await this.page.waitForLoadState('networkidle');
    await this.page.waitForTimeout(300);
  }

  // ── Step indicator ────────────────────────────────────────────────────────
  async getCurrentStep(): Promise<number> {
    // Step label "PASO X DE 3" is visible in form area
    const label = this.page.locator('text=/PASO \\d DE 3/i').first();
    const text = await label.innerText().catch(() => 'PASO 1 DE 3');
    const match = text.match(/PASO (\d)/);
    return match ? parseInt(match[1]) : 1;
  }

  // ── Back button ───────────────────────────────────────────────────────────
  get backBtn() {
    return this.page.locator('button').filter({ has: this.page.locator('svg') })
      .filter({ hasText: '' }).first();
  }

  async clickBack() {
    await this.backBtn.click();
    await this.page.waitForTimeout(300);
  }

  // ── Step 1: Business setup ────────────────────────────────────────────────
  get bizNameInput() { return this.page.locator('input[placeholder*="Café" i], input[id="bizName"]').first(); }
  get continueBtn()  { return this.page.getByRole('button', { name: /continuar/i }).last(); }
  get step1Error()   { return this.page.locator('[style*="FEF2F2"], [style*="B91C1C"]').first(); }

  async fillBusinessName(name: string) {
    await this.bizNameInput.fill(name);
  }

  async selectPayPeriodType(type: 'Semanal' | 'Bisemanal' | 'Quincenal') {
    await this.page.getByText(type, { exact: true }).click();
    await this.page.waitForTimeout(200);
  }

  async selectColor(hex: string) {
    const btns = await this.page.locator('button').all();
    for (const btn of btns) {
      const style = await btn.getAttribute('style') ?? '';
      if (style.toLowerCase().includes(hex.toLowerCase()) && style.includes('backgroundColor')) {
        await btn.click();
        await this.page.waitForTimeout(200);
        return;
      }
    }
  }

  async continueStep1() {
    await this.continueBtn.click();
    await this.page.waitForTimeout(1_000);
  }

  async getStep1Error(): Promise<string> {
    return this.step1Error.innerText().catch(() => '');
  }

  // ── Step 2: Add employees ────────────────────────────────────────────────
  get empFirstInput()  { return this.page.locator('input[id="empFirst"], input[placeholder="Juan"]'); }
  get empLastInput()   { return this.page.locator('input[id="empLast"], input[placeholder="García"]'); }
  get addEmpBtn()      { return this.page.getByRole('button', { name: /agregar empleado/i }); }
  get skipBtn()        { return this.page.getByRole('button', { name: /saltar|agregar después/i }); }
  get continueStep2Btn(){ return this.page.getByRole('button', { name: /continuar/i }).last(); }
  get empError()       { return this.page.locator('p[style*="B91C1C"]').first(); }

  async addEmployee(firstName: string, lastName: string) {
    await this.empFirstInput.fill(firstName);
    await this.empLastInput.fill(lastName);
    await this.addEmpBtn.click();
    await this.page.waitForTimeout(800);
  }

  async skipEmployees() {
    await this.skipBtn.click();
    await this.page.waitForTimeout(400);
  }

  async getAddedEmployeeCount(): Promise<number> {
    const badges = await this.page.locator('text=Listo').all();
    return badges.length;
  }

  // ── Step 3: Done ──────────────────────────────────────────────────────────
  get enterDashboardBtn() { return this.page.getByRole('button', { name: /entrar al dashboard/i }); }

  async enterDashboard() {
    await this.enterDashboardBtn.click();
    await this.page.waitForURL(/dashboard/, { timeout: 15_000 });
  }

  // ── Checklist items in step 3 ─────────────────────────────────────────────
  async getChecklistItems(): Promise<string[]> {
    const items = await this.page.locator('span[style*="fontWeight: 600"]').all();
    return Promise.all(items.map(i => i.innerText()));
  }
}
