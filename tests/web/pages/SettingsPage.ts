import type { Page } from '@playwright/test';

export class SettingsPage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto('/settings');
    await this.page.waitForLoadState('networkidle');
    await this.page.waitForTimeout(400);
  }

  // ── Business name ─────────────────────────────────────────────────────────
  get bizNameInput() { return this.page.locator('input[placeholder*="negocio" i]').first(); }

  async editBusinessName(name: string) {
    await this.bizNameInput.clear();
    await this.bizNameInput.fill(name);
  }

  async getCurrentBusinessName(): Promise<string> {
    return this.bizNameInput.inputValue();
  }

  // ── Color picker ──────────────────────────────────────────────────────────
  async selectColor(hex: string) {
    // Color buttons are circular with inline backgroundColor
    const btns = await this.page.locator('button').filter({ hasText: '' }).all();
    for (const btn of btns) {
      const style = await btn.getAttribute('style') ?? '';
      if (style.toLowerCase().includes(hex.toLowerCase())) {
        await btn.click();
        await this.page.waitForTimeout(200);
        return;
      }
    }
    throw new Error(`Color button for ${hex} not found`);
  }

  async getSelectedColorHex(): Promise<string> {
    // The hex is displayed as text in the preview section
    const hexText = this.page.locator('text=/#[0-9A-Fa-f]{6}/').first();
    return hexText.innerText().catch(() => '');
  }

  // ── Pay period type ────────────────────────────────────────────────────────
  async selectPayPeriodType(type: 'Semanal' | 'Bisemanal' | 'Quincenal') {
    await this.page.getByText(type, { exact: true }).first().click();
    await this.page.waitForTimeout(200);
  }

  async selectStartDay(day: 'Do' | 'Lu' | 'Ma' | 'Mi' | 'Ju' | 'Vi' | 'Sá') {
    await this.page.getByText(day, { exact: true }).click();
    await this.page.waitForTimeout(200);
  }

  // ── Schedule rules ────────────────────────────────────────────────────────
  async incrementMaxHours() {
    const plusBtn = this.page.locator('button').filter({ hasText: '+' }).first();
    await plusBtn.click();
  }

  async decrementMaxHours() {
    const minusBtn = this.page.locator('button').filter({ hasText: '−' }).first();
    await minusBtn.click();
  }

  async toggleAutoClockOut() {
    const toggle = this.page.locator('button').filter({ hasText: /activada|desactivada/i }).first();
    await toggle.click();
    await this.page.waitForTimeout(200);
  }

  // ── Save bar ──────────────────────────────────────────────────────────────
  get saveBtn()    { return this.page.getByRole('button', { name: /guardar cambios|guardando|creando/i }).last(); }
  get saveMsg()    { return this.page.locator('[style*="059669"], [style*="DC2626"]').filter({ hasText: /.+/ }).last(); }

  async saveChanges() {
    await this.saveBtn.click();
    await this.page.waitForTimeout(1_500);
  }

  async getSaveMessage(): Promise<string> {
    return this.saveMsg.innerText().catch(() => '');
  }

  // ── Change password ───────────────────────────────────────────────────────
  async changePassword(current: string, newPw: string, confirm: string) {
    const pwInputs = this.page.locator('input[type="password"]');
    await pwInputs.nth(0).fill(current);
    await pwInputs.nth(1).fill(newPw);
    await pwInputs.nth(2).fill(confirm);
    await this.page.getByRole('button', { name: /actualizar/i }).click();
    await this.page.waitForTimeout(1_000);
  }

  async getPasswordMessage(): Promise<string> {
    const msg = this.page.locator('[style*="059669"], [style*="DC2626"]').last();
    return msg.innerText().catch(() => '');
  }

  // ── Logout ────────────────────────────────────────────────────────────────
  async logout() {
    await this.page.getByText('Cerrar sesión').click();
    await this.page.waitForURL(/login/, { timeout: 10_000 });
  }

  // ── Danger zone ───────────────────────────────────────────────────────────
  get deleteBusinessBtn() { return this.page.getByText('Eliminar negocio'); }
  get deleteConfirmInput(){ return this.page.locator('input[placeholder*="BORRAR"]'); }
  get finalDeleteBtn()    { return this.page.getByRole('button', { name: /eliminar/i }).last(); }
  get cancelDeleteBtn()   { return this.page.getByRole('button', { name: /cancelar/i }).last(); }

  async openDeleteModal() {
    await this.deleteBusinessBtn.click();
    await this.page.waitForTimeout(400);
  }

  async typeDeleteConfirmation(text: string) {
    await this.deleteConfirmInput.fill(text);
  }

  async isDeleteButtonEnabled(): Promise<boolean> {
    const btn = this.finalDeleteBtn;
    const disabled = await btn.getAttribute('disabled');
    return disabled === null;
  }
}
