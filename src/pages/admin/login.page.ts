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
    // After successful login the admin landing replaces the login form
    await expect(this.submitButton).toBeHidden({ timeout: 5_000 });
  }
}
