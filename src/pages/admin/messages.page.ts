import { expect, type Page, type Locator } from '@playwright/test';
import { BasePage } from '../base.page';

/**
 * Admin message inbox (/admin/message). Reached from the "Messages" nav link
 * after logging in (in-app navigation; a direct page.goto is interrupted by the
 * SPA's auth redirect on WebKit). Rows are keyed data-testid="message{n}".
 */
export class AdminMessagesPage extends BasePage {
  readonly path = '/admin/message';

  readonly navLink: Locator;
  readonly firstRow: Locator;

  constructor(page: Page) {
    super(page);
    this.navLink = page.getByRole('link', { name: /messages/i });
    this.firstRow = page.getByTestId('message0');
  }

  protected override async waitForReady(): Promise<void> {
    await this.firstRow.waitFor({ state: 'visible' });
  }

  /** Navigate from elsewhere in the admin SPA via the nav link. */
  async openFromNav(): Promise<void> {
    await this.navLink.first().click();
    await this.waitForReady();
  }

  rowBySubject(subject: string): Locator {
    return this.page.getByText(subject, { exact: false });
  }

  async expectInboxLoaded(): Promise<void> {
    await expect(this.firstRow).toBeVisible();
  }
}
