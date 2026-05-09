import type { Page } from '@playwright/test';

export class LoginPage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto('/login');
    await this.page.waitForLoadState('networkidle');
  }

  get emailInput()    { return this.page.locator('input[type="email"]').first(); }
  get passwordInput() { return this.page.locator('input[type="password"]').first(); }
  get submitBtn()     { return this.page.locator('button[type="submit"]').first(); }
  get googleBtn()     { return this.page.getByText('Continuar con Google'); }
  get errorMsg()      { return this.page.locator('text=/credenciales|incorrecto|error|requerido/i').first(); }

  async login(email: string, password: string) {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.submitBtn.click();
  }

  async loginAndWait(email: string, password: string) {
    await this.login(email, password);
    await this.page.waitForURL(/dashboard|onboarding/, { timeout: 15_000 });
  }

  async getErrorText(): Promise<string> {
    // Browsers normalize hex → rgb so match by text content instead of inline color.
    await this.page.waitForTimeout(400);
    const el = this.page.locator('div').filter({
      hasText: /ingresa|credencial|incorrect|contraseña|requerido|obligatorio|inválid/i,
    }).last();
    if (await el.isVisible({ timeout: 2_000 }).catch(() => false)) return el.innerText();
    return '';
  }
}
