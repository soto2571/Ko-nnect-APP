import type { Page, Locator } from '@playwright/test';

export class DashboardPage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto('/dashboard');
    await this.page.waitForLoadState('networkidle');
    // Wait for skeleton to disappear
    await this.page.waitForFunction(
      () => document.querySelectorAll('.sk-card').length === 0 ||
            document.querySelector('[class*="sk-card"]') === null,
      { timeout: 10_000 }
    ).catch(() => {});
  }

  // ── View toggle ────────────────────────────────────────────────────────────
  get weekBtn()  { return this.page.getByRole('button', { name: 'Semana' }).first(); }
  get monthBtn() { return this.page.getByRole('button', { name: 'Mes' }).first(); }

  async switchToWeek()  { await this.weekBtn.click();  await this.page.waitForTimeout(500); }
  async switchToMonth() {
    await this.monthBtn.click();
    // Wait for month data to reload from API
    await this.page.waitForTimeout(1_500);
  }

  // ── Navigation ─────────────────────────────────────────────────────────────
  get prevBtn() { return this.page.getByLabel('Semana anterior'); }
  get nextBtn() { return this.page.getByLabel('Semana siguiente'); }

  async navigatePrev() { await this.prevBtn.click(); }

  get periodLabel() { return this.page.locator('text=/ene|feb|mar|abr|may|jun|jul|ago|sep|oct|nov|dic/i').first(); }
  get goToTodayBtn() { return this.page.getByText('Ir a hoy'); }

  // ── FAB / shift creation ───────────────────────────────────────────────────
  get fabBtn() { return this.page.getByText('Nuevo turno').last(); }

  async openCreateShift() {
    await this.fabBtn.click();
    await this.page.waitForSelector('text=Paso 1 de 3', { state: 'visible', timeout: 5_000 });
  }

  // ── Shift cards ────────────────────────────────────────────────────────────
  async getShiftCards(): Promise<Locator[]> {
    // Shift cards are buttons with a left border accent and AM/PM time text.
    // React renders borderLeft as border-left in the DOM attribute.
    const cards = this.page.locator('button[style*="border-left"]').filter({ hasText: /AM|PM/ });
    return cards.all();
  }

  async getShiftCount(): Promise<number> {
    return (await this.getShiftCards()).length;
  }

  // ── Shift modal helpers ────────────────────────────────────────────────────
  get modal() { return this.page.locator('[style*="borderRadius: 24px"], [style*="border-radius: 24px"]').last(); }

  async closeModal() {
    const closeBtn = this.page.getByRole('button', { name: /cerrar|×|close/i }).last();
    if (await closeBtn.isVisible().catch(() => false)) await closeBtn.click();
  }

  // Calendar picker in step 1 of create modal
  async selectNextAvailableDate() {
    // Calendar date buttons: future dates have cursor:pointer + aspect-ratio (not shift cards or nav buttons)
    const selector = 'button[style*="cursor: pointer"][style*="aspect-ratio"]';
    await this.page.waitForSelector(selector, { state: 'visible', timeout: 10_000 });
    // The FAB pre-selects today (index 0). Click the SECOND future date to ADD a selection
    // without accidentally deselecting the already-selected today.
    const dateBtns = this.page.locator(selector);
    const second = dateBtns.nth(1);
    const useSecond = await second.isVisible().catch(() => false);
    await (useSecond ? second : dateBtns.first()).click();
  }

  async clickContinue() {
    await this.page.getByRole('button', { name: /continuar|siguiente|crear/i }).last().click();
  }

  // Break pill selector
  async selectBreak(label: '15 min' | '30 min' | '45 min' | '1 hora' | 'Sin descanso') {
    await this.page.getByText(label, { exact: true }).click();
  }

  // Employee selector in step 3
  // Buttons in step 3 are prefixed with initials (e.g., "AG Ana García email@..."),
  // which makes them distinct from shift card buttons ("Ana García 7.5h TIME - TIME").
  async selectEmployee(name: string) {
    const initials = name.split(' ').map(w => w[0]).join('').toUpperCase();
    await this.page.getByRole('button', { name: new RegExp(`${initials}.*${name}`) }).click();
  }

  // ── Filters ────────────────────────────────────────────────────────────────
  async filterByEmployeeName(name: string) {
    const empFilterBtn = this.page.getByText('Empleado', { exact: true });
    await empFilterBtn.click();
    await this.page.waitForTimeout(200);
    await this.page.getByText(name).click();
    await this.page.keyboard.press('Escape');
  }

  async clearFilters() {
    const clearBtn = this.page.getByText('Limpiar filtros');
    if (await clearBtn.isVisible().catch(() => false)) await clearBtn.click();
  }

  // ── Stats ─────────────────────────────────────────────────────────────────
  async getShiftCountBadge(): Promise<string> {
    const badge = this.page.locator('text=/\\d+ turno/i').first();
    return badge.innerText().catch(() => '');
  }

  async getClockedInBadge(): Promise<string> {
    const badge = this.page.locator('text=/en turno/i').first();
    return badge.innerText().catch(() => '');
  }

  // ── Delete shift (from edit modal) ────────────────────────────────────────
  async clickFirstShiftCard() {
    const cards = await this.getShiftCards();
    if (cards.length > 0) await cards[0].click();
  }

  async confirmDeleteShift() {
    // In edit mode, click "Eliminar" then "Confirmar"
    const deleteBtn = this.page.getByRole('button', { name: /eliminar/i }).first();
    await deleteBtn.click();
    await this.page.waitForTimeout(300);
    const confirmBtn = this.page.getByRole('button', { name: /confirmar/i }).first();
    if (await confirmBtn.isVisible().catch(() => false)) await confirmBtn.click();
  }
}
