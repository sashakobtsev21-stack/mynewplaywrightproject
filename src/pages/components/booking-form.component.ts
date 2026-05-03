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
    // Page and Locator both implement getByPlaceholder, so this is type-safe enough.
    const s = scope as Locator;
    this.firstName = s.getByPlaceholder(/firstname/i);
    this.lastName = s.getByPlaceholder(/lastname/i);
    this.email = s.getByPlaceholder(/email/i);
    this.phone = s.getByPlaceholder(/phone/i);
  }

  async fill(g: GuestDetails): Promise<void> {
    await this.firstName.fill(g.firstName);
    await this.lastName.fill(g.lastName);
    await this.email.fill(g.email);
    await this.phone.fill(g.phone);
  }
}
