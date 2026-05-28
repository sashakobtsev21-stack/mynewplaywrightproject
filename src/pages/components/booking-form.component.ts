import type { Locator, Page } from '@playwright/test';

export interface GuestDetails {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
}

/**
 * The guest-details part of the booking form. Lives separately because the
 * exact same fields show up both inline on a room card and (presumably) on a
 * dedicated room page if we ever model one.
 */
export class BookingFormComponent {
  readonly firstName: Locator;
  readonly lastName: Locator;
  readonly email: Locator;
  readonly phone: Locator;

  constructor(scope: Locator | Page) {
    // Reservation form inputs only have `name` attributes (no id/data-testid).
    // Page and Locator both implement locator(), so this is type-safe enough.
    const s = scope as Locator;
    this.firstName = s.locator('input[name="firstname"]');
    this.lastName = s.locator('input[name="lastname"]');
    this.email = s.locator('input[name="email"]');
    this.phone = s.locator('input[name="phone"]');
  }

  async fill(g: GuestDetails): Promise<void> {
    await this.firstName.fill(g.firstName);
    await this.lastName.fill(g.lastName);
    await this.email.fill(g.email);
    await this.phone.fill(g.phone);
  }
}
