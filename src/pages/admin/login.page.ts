import { expect, type Page, type Locator } from '@playwright/test';
import { BasePage } from '../base.page';
import { ROUTES } from '../../config/constants';
import { env } from '../../config/env';

export class AdminLoginPage extends BasePage {
  readonly path = ROUTES.admin;

  readonly usernameInput: Locator;
  readonly passwordInput: Locator;
  readonly submitButton: Locator;
  readonly errorMessage: Locator;

  constructor(page: Page) {
    super(page);

    this.usernameInput = page.getByLabel(/username/i).or(page.locator('#username'));
    this.passwordInput = page.getByLabel(/password/i).or(page.locator('#password'));
    this.submitButton = page.getByRole('button', { name: /login/i });
    this.errorMessage = page.locator('.alert-danger, [role="alert"]').first();
  }

  // The admin SPA is slow to reach 'load' on the public demo (it was timing out
  // the 20s navigation budget). domcontentloaded + an explicit wait for the form
  // is a faster, more reliable readiness signal.
  override async open(): Promise<void> {
    await this.page.goto(this.path, { waitUntil: 'domcontentloaded' });
    await this.waitForReady();
  }

  // The form renders a beat after the route loads; wait for it so callers that
  // immediately fill fields don't race the render.
  protected override async waitForReady(): Promise<void> {
    await this.usernameInput.waitFor({ state: 'visible' });
  }

  async login(username: string, password: string): Promise<void> {
    await this.usernameInput.fill(username);
    await this.passwordInput.fill(password);
    await this.submitButton.click();
  }

  // Convenience for the 90% case — admin creds straight from env.
  // Not pure (page object touching env), but the alternative was repeating
  // env.* in every admin test which felt worse.
  async loginAsAdmin(): Promise<void> {
    await this.login(env.ADMIN_USERNAME, env.ADMIN_PASSWORD);
  }

  async expectInvalidCredentials(): Promise<void> {
    await expect(this.errorMessage).toBeVisible();
  }

  async expectLoggedIn(): Promise<void> {
    // A successful login navigates to the admin landing. Assert the route, not a
    // nav element: on mobile widths the Logout button collapses into a toggler
    // and isn't "visible" even though login succeeded. The URL is viewport-proof.
    await expect(this.page).toHaveURL(/\/admin\/rooms/, { timeout: 10_000 });
  }
}
