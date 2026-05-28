import { expect, type Page, type Locator } from '@playwright/test';
import { BasePage } from './base.page';
import { ROUTES } from '../config/constants';
import { BookingFormComponent, type GuestDetails } from './components/booking-form.component';

export type { GuestDetails };

/**
 * Booking flow lives on /reservation/{roomId} — entered from a room card on
 * the home page. Path stays as `home` because the test entry point is the
 * home page; tests reach this page via `homePage.openFirstRoomBooking()`.
 *
 * Reservation UI state machine:
 *   landing  -> Reserve Now visible, no form
 *   form open -> Reserve Now (acts as submit) + Cancel + 4 guest inputs visible
 *   submit empty -> alert.alert-danger with validation messages
 *
 * Dates are baked into the URL (`?checkin=...&checkout=...`) — there are no
 * date inputs to fill on this page, so setDates re-navigates with new params.
 */
export class BookingPage extends BasePage {
  readonly path = ROUTES.home;

  readonly form: BookingFormComponent;
  readonly bookButton: Locator;
  readonly cancelButton: Locator;
  readonly confirmation: Locator;
  readonly errorAlert: Locator;
  // The current UI takes dates via URL params (no DOM inputs). These remain
  // for backward-compat with a `test.fixme` that referenced them; they don't
  // match anything and shouldn't be used in active tests — call setDates().
  readonly checkInInput: Locator;
  readonly checkOutInput: Locator;

  // Indicator of "form is open" — the .room-booking-form input group only
  // appears once Reserve Now is clicked, and disappears on Cancel.
  private readonly formContainer: Locator;
  private storedGuest: GuestDetails | null = null;

  constructor(page: Page) {
    super(page);

    this.form = new BookingFormComponent(page);
    this.formContainer = page.locator('.room-booking-form').first();

    this.checkInInput = page.locator('input[name="checkin"]');
    this.checkOutInput = page.locator('input[name="checkout"]');

    this.bookButton = page.getByRole('button', { name: /reserve now/i });
    this.cancelButton = page.getByRole('button', { name: /^cancel$/i });

    this.confirmation = page
      .locator('.booking-confirmation, .alert-success, [data-testid="reservation-confirmation"]')
      .first();
    this.errorAlert = page.locator('.alert-danger, [role="alert"]').first();
  }

  /**
   * Reveal the guest form. Idempotent — no-op if it's already open.
   */
  private async ensureFormOpen(): Promise<void> {
    if (await this.formContainer.isVisible()) return;
    await this.bookButton.click();
    await this.formContainer.waitFor({ state: 'visible', timeout: 5_000 });
  }

  async fillGuestDetails(g: GuestDetails): Promise<void> {
    this.storedGuest = g;
    await this.ensureFormOpen();
    await this.form.fill(g);
  }

  /**
   * The reservation page takes check-in/check-out via URL query params; there
   * are no date inputs in the DOM. We re-navigate with the desired window and
   * restore any already-filled guest details so the test order
   * (fillGuestDetails -> setDates -> submit) keeps working.
   */
  async setDates(checkIn: string, checkOut: string): Promise<void> {
    const url = new URL(this.page.url());
    url.searchParams.set('checkin', checkIn);
    url.searchParams.set('checkout', checkOut);
    await this.page.goto(url.toString(), { waitUntil: 'domcontentloaded' });
    if (this.storedGuest) {
      await this.ensureFormOpen();
      await this.form.fill(this.storedGuest);
    }
  }

  async submit(): Promise<void> {
    await this.ensureFormOpen();
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
