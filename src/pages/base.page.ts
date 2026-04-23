import type { Page, Locator } from '@playwright/test';

/**
 * Shared base for all Page Objects. Keep it tiny — only things that are
 * actually reused across pages live here. If you find yourself adding a
 * method that fits exactly one page, put it on the page instead.
 */
export abstract class BasePage {
  constructor(protected readonly page: Page) {}

  abstract readonly path: string;

  async open(): Promise<void> {
    await this.page.goto(this.path);
    await this.waitForReady();
  }

  /** Override in subclasses with a real "loaded" indicator. */
  protected async waitForReady(): Promise<void> {
    await this.page.waitForLoadState('domcontentloaded');
  }

  url(): string {
    return this.page.url();
  }

  async title(): Promise<string> {
    return this.page.title();
  }

  protected async scrollTo(locator: Locator): Promise<void> {
    await locator.scrollIntoViewIfNeeded();
  }
}
