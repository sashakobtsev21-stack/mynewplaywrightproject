import { expect, type Page, type Locator } from '@playwright/test';
import { BasePage } from '../base.page';

/**
 * Admin branding page (/admin/branding). Read-only assertions only — editing
 * branding on the shared demo would change state other tests and users rely on.
 * Reached from the "Branding" nav link (in-app navigation; a direct page.goto is
 * interrupted by the SPA's auth redirect on WebKit).
 */
export class AdminBrandingPage extends BasePage {
  readonly path = '/admin/branding';

  readonly navLink: Locator;
  readonly heading: Locator;

  constructor(page: Page) {
    super(page);
    this.navLink = page.locator('#brandingLink');
    this.heading = page.getByText(/B&B details/i);
  }

  protected override async waitForReady(): Promise<void> {
    await this.heading.waitFor({ state: 'visible' });
  }

  async openFromNav(): Promise<void> {
    await this.navLink.click();
    await this.waitForReady();
  }

  async expectLoaded(): Promise<void> {
    await expect(this.heading).toBeVisible();
  }
}
