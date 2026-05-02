import { test as base } from '@playwright/test';
import { AUTH_STATE } from '../playwright.config.ts';

/**
 * Extends base test with a pre-authenticated page.
 * Import `test` from this file in spec files that need auth.
 */
export const test = base.extend({
  storageState: AUTH_STATE,
});

export { expect } from '@playwright/test';
