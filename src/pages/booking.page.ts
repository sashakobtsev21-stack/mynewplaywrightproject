import { expect, type Page, type Locator } from '@playwright/test';
import { BasePage } from './base.page';
import { ROUTES } from '../config/constants';
import { BookingFormComponent, type GuestDetails } from './components/booking-form.component';

export type { GuestDetails };

/**
 * Booking flow on the demo site is part of the home page (per-room form).
 * Modelling it as its own POM so when/if dedicated room pages appear,
 * swapping `path` is the only change needed.
 *
 * Guest fields moved to BookingFormComponent in the week-2 refactor — they're
 * also reused from the home page contact area.
 */
export class BookingPage extends BasePage {
  readonly path = ROUTES.home;

  readonly form: BookingFormComponent;
  readonly checkInInput: Locator;
  readonly checkOutInput: Locator;
  readonly bookButton: Locator;
  readonly cancelButton: Locator;
  readonly confirmation: Locator;
  readonly errorAlert: Locator;

  constructor(page: Page) {
    super(page);

    this.form = new BookingFormComponent(page);

    // Date inputs are masked; sometimes a calendar picker is shown instead.
    // FIXME: depending on viewport width the picker swaps text<->click — revisit when writing date tests
    this.checkInInput = page.locator('input[name="checkin"], [data-testid="checkin"]').first();
    this.checkOutInput = page.locator('input[name="checkout"], [data-testid="checkout"]').first();

    // Picks up the first "Book" button on the page. Works on a fresh load,
    // but breaks once more than one matching button is visible (per-room cards).
    this.bookButton = page.getByRole('button', { name: /book/i }).first();
    this.cancelButton = page.getByRole('button', { name: /cancel/i });

    this.confirmation = page.locator('.booking-confirmation, .alert-success').first();
    this.errorAlert = page.locator('.alert-danger, [role="alert"]').first();
  }

  async fillGuestDetails(g: GuestDetails): Promise<void> {
    await this.form.fill(g);
  }

  async setDates(checkIn: string, checkOut: string): Promise<void> {
    await this.checkInInput.fill(checkIn);
    await this.checkOutInput.fill(checkOut);
  }

  async submit(): Promise<void> {
    await this.bookButton.click();
  }

  async expectConfirmation(): Promise<void> {
    await expect(this.confirmation).toBeVisible({ timeout: 10_000 });
  }

  async expectError(match?: string | RegExp): Promise<void> {
    await expect(this.errorAlert).toBeVisible();
    if (match) {
      await expect(this.errorAlert).toContainText(match);
    }
  }
}
