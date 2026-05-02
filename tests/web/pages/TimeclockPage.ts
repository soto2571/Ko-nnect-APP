import type { Page, Locator } from '@playwright/test';

export class TimeclockPage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto('/timeclock');
    await this.page.waitForLoadState('networkidle');
    await this.waitForLoad();
  }

  async waitForLoad() {
    // Wait for skeletons to disappear
    await this.page.waitForFunction(
      () => document.querySelectorAll('.sk-card').length === 0,
      { timeout: 12_000 }
    ).catch(() => {});
    await this.page.waitForTimeout(400);
  }

  // ── Page header ───────────────────────────────────────────────────────────
  get heading()     { return this.page.getByText('Reportes').first(); }
  get exportPdfBtn(){ return this.page.getByText('Exportar PDF'); }

  // ── Period navigation ─────────────────────────────────────────────────────
  get prevPeriodBtn() {
    // Left chevron button in period nav card
    return this.page.locator('button').filter({ has: this.page.locator('svg') })
      .filter({ hasText: '' }).first();
  }
  get nextPeriodBtn() {
    return this.page.locator('button').filter({ has: this.page.locator('svg') })
      .filter({ hasText: '' }).nth(1);
  }
  get periodLabel()       { return this.page.locator('text=/período actual|período anterior|hace \\d+/i').first(); }
  get periodDateRange()   { return this.page.locator('text=/ene|feb|mar|abr|may|jun|jul|ago|sep|oct|nov|dic/i').first(); }
  get backToCurrentBtn()  { return this.page.getByText('Ver período actual'); }

  async navigateToPreviousPeriod() {
    await this.prevPeriodBtn.click();
    await this.waitForLoad();
  }

  async navigateToNextPeriod() {
    const btn = this.nextPeriodBtn;
    const disabled = await btn.getAttribute('disabled');
    if (disabled === null) {
      await btn.click();
      await this.waitForLoad();
    }
  }

  async goBackToCurrentPeriod() {
    await this.backToCurrentBtn.click();
    await this.waitForLoad();
  }

  // ── Summary stats ─────────────────────────────────────────────────────────
  async getTotalHours(): Promise<string> {
    // The large bold number in "Horas totales" card
    const el = this.page.locator('text=/\\d+h(?: \\d+m)?/').first();
    return el.innerText().catch(() => '0h');
  }

  async getPersonCount(): Promise<string> {
    const el = this.page.locator('text=/^\\d+$/').nth(1);
    return el.innerText().catch(() => '0');
  }

  async getCompletedLogsText(): Promise<string> {
    const el = this.page.locator('text=/registro(s)? completado/i').first();
    return el.innerText().catch(() => '');
  }

  // ── Empty state ───────────────────────────────────────────────────────────
  get emptyHeading()  { return this.page.getByText('Sin registros este período'); }
  get emptyMessage()  { return this.page.getByText(/aún no han marcado/i); }

  async isEmpty(): Promise<boolean> {
    return this.emptyHeading.isVisible().catch(() => false);
  }

  // ── Employee cards ────────────────────────────────────────────────────────
  async getEmployeeCards(): Promise<Locator[]> {
    // Employee cards have a chevron and employee name+initials
    return this.page.locator('[style*="cursor: pointer"]')
      .filter({ hasText: /García|Martínez|Rodríguez/i }).all();
  }

  async getEmployeeCardByName(name: string): Promise<Locator> {
    return this.page.locator('[style*="cursor: pointer"]')
      .filter({ hasText: name }).first();
  }

  async expandEmployee(name: string) {
    const card = await this.getEmployeeCardByName(name);
    await card.click();
    await this.page.waitForTimeout(400);
  }

  async isEmployeeExpanded(name: string): Promise<boolean> {
    // When expanded, log rows become visible
    const rows = await this.getLogRowsForEmployee(name);
    return rows.length > 0;
  }

  // ── Log rows (inside expanded employee) ──────────────────────────────────
  async getLogRowsForEmployee(name: string): Promise<Locator[]> {
    // Find the container after the header card for this employee
    const logRows = this.page.locator('[style*="clockIn"], [style*="clock-in"]')
      .or(this.page.locator('text=/AM|PM/').filter({ hasText: /→/ }));
    return logRows.all();
  }

  async getAllLogRows(): Promise<Locator[]> {
    return this.page.locator('text=/→/').filter({ hasText: /AM|PM/ }).all();
  }

  async getActiveEmployeeText(): Promise<string[]> {
    const active = await this.page.locator('text=/En turno/i').all();
    return Promise.all(active.map(a => a.innerText()));
  }

  // ── Edit log modal ────────────────────────────────────────────────────────
  async openEditForFirstLog() {
    // Edit buttons are pencil icons next to log rows
    const editBtns = this.page.locator('button').filter({ has: this.page.locator('svg') })
      .filter({ hasText: '' });
    // Find the first visible edit button (not delete - delete is red)
    const btns = await editBtns.all();
    for (const btn of btns) {
      const box = await btn.boundingBox();
      if (!box) continue;
      const style = await btn.getAttribute('style') ?? '';
      if (!style.includes('EF4444') && !style.includes('red') && await btn.isVisible()) {
        await btn.click();
        await this.page.waitForTimeout(400);
        return;
      }
    }
  }

  get editModal()       { return this.page.locator('text=Editar Registro').first(); }
  get editModalTitle()  { return this.page.getByText('Editar Registro'); }
  get hasOutCheckbox()  { return this.page.getByText('Registrar salida'); }
  get editSaveBtn()     { return this.page.getByRole('button', { name: /guardar cambios/i }); }
  get editCancelBtn()   { return this.page.getByRole('button', { name: /cancelar/i }).last(); }
  get editError()       { return this.page.locator('[style*="FEF2F2"]').filter({ hasText: /salida|entrada|error/i }).first(); }

  async isEditModalOpen(): Promise<boolean> {
    return this.editModalTitle.isVisible().catch(() => false);
  }

  async toggleHasOut() {
    await this.hasOutCheckbox.click();
    await this.page.waitForTimeout(200);
  }

  async saveEdit() {
    await this.editSaveBtn.click();
    await this.page.waitForTimeout(800);
  }

  async closeEditModal() {
    await this.editCancelBtn.click();
    await this.page.waitForTimeout(300);
  }

  // ── Delete log confirmation ────────────────────────────────────────────────
  async openDeleteForFirstLog() {
    // Delete buttons have red border/color
    const allBtns = await this.page.locator('button').filter({ has: this.page.locator('svg') }).all();
    for (const btn of allBtns) {
      const style = await btn.getAttribute('style') ?? '';
      if ((style.includes('EF4444') || style.includes('fee2e2') || style.includes('FEE2E2')) && await btn.isVisible()) {
        await btn.click();
        await this.page.waitForTimeout(400);
        return;
      }
    }
  }

  get deleteModal()       { return this.page.getByText('Eliminar Registro'); }
  get confirmDeleteBtn()  { return this.page.getByRole('button', { name: /^eliminar$/i }).last(); }
  get cancelDeleteBtn()   { return this.page.getByRole('button', { name: /cancelar/i }).last(); }

  async isDeleteModalOpen(): Promise<boolean> {
    return this.deleteModal.isVisible().catch(() => false);
  }

  async confirmDelete() {
    await this.confirmDeleteBtn.click();
    await this.waitForLoad();
  }

  async cancelDelete() {
    await this.cancelDeleteBtn.click();
    await this.page.waitForTimeout(300);
  }

  // ── Error state ───────────────────────────────────────────────────────────
  async getError(): Promise<string> {
    const err = this.page.locator('[style*="DC2626"], [style*="FEF2F2"]').first();
    return err.isVisible().then(v => v ? err.innerText() : '').catch(() => '');
  }
}
