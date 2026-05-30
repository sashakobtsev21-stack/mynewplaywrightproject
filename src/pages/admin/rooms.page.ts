import { expect, type Page, type Locator } from '@playwright/test';
import { BasePage } from '../base.page';
import type { RoomType } from '../../api/types/room.types';

/**
 * Admin rooms management page (/admin/rooms). Assumes the caller has already
 * logged in via AdminLoginPage — the SPA redirects here on success.
 */
export class AdminRoomsPage extends BasePage {
  readonly path = '/admin/rooms';

  readonly roomRows: Locator;
  readonly roomNameInput: Locator;
  readonly typeSelect: Locator;
  readonly accessibleSelect: Locator;
  readonly roomPriceInput: Locator;
  readonly createButton: Locator;

  constructor(page: Page) {
    super(page);
    this.roomRows = page.locator('[data-testid="roomlisting"]');
    this.roomNameInput = page.locator('#roomName');
    this.typeSelect = page.locator('#type');
    this.accessibleSelect = page.locator('#accessible');
    this.roomPriceInput = page.locator('#roomPrice');
    this.createButton = page.locator('#createRoom');
  }

  protected override async waitForReady(): Promise<void> {
    await this.roomRows.first().waitFor({ state: 'visible' });
  }

  /** A created room renders as <p id="roomName{name}"> inside its row. */
  roomName(name: string): Locator {
    return this.page.locator(`#roomName${name}`);
  }

  async createRoom(opts: { name: string; type: RoomType; price: number }): Promise<void> {
    await this.roomNameInput.fill(opts.name);
    await this.typeSelect.selectOption(opts.type);
    await this.roomPriceInput.fill(String(opts.price));
    await this.createButton.click();
  }

  async expectListed(): Promise<void> {
    await expect(this.roomRows.first()).toBeVisible();
  }
}
