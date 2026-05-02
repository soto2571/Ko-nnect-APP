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
    // Error messages appear inline in the form
    const selectors = [
      '[style*="B91C1C"]',
      '[style*="DC2626"]',
      '[style*="FEF2F2"]',
    ];
    for (const sel of selectors) {
      const el = this.page.locator(sel).first();
      if (await el.isVisible().catch(() => false)) return el.innerText();
    }
    return '';
  }
}
