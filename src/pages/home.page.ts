import { expect, type Page, type Locator } from '@playwright/test';
import { BasePage } from './base.page';
import { ROUTES } from '../config/constants';

// First POM I wrote — selectors are a bit ad-hoc.
// TODO: extract room card + contact form into components/ once I have a second page reusing them
export class HomePage extends BasePage {
  readonly path = ROUTES.home;

  readonly hero: Locator;
  readonly roomCards: Locator;
  readonly bookRoomButtons: Locator;
  readonly contactSection: Locator;
  readonly contactName: Locator;
  readonly contactEmail: Locator;
  readonly contactPhone: Locator;
  readonly contactSubject: Locator;
  readonly contactMessage: Locator;
  readonly contactSubmit: Locator;

  constructor(page: Page) {
    super(page);

    this.hero = page.locator('.hotel-logoUrl, .hotel-room-info').first();
    this.roomCards = page.locator('.room-card, [data-testid="room-card"]');
    this.bookRoomButtons = page.getByRole('button', { name: /book this room/i });

    this.contactSection = page.locator('#contact');
    this.contactName = this.contactSection.getByPlaceholder(/name/i);
    this.contactEmail = this.contactSection.getByPlaceholder(/email/i);
    this.contactPhone = this.contactSection.getByPlaceholder(/phone/i);
    this.contactSubject = this.contactSection.getByPlaceholder(/subject/i);
    this.contactMessage = this.contactSection.getByPlaceholder(/message/i);
    this.contactSubmit = this.contactSection.getByRole('button', { name: /submit/i });
  }

  async assertLoaded(): Promise<void> {
    await expect(this.page).toHaveTitle(/Restful[- ]Booker|hotel/i);
    await this.roomCards.first().waitFor({ state: 'visible' });
  }

  async openFirstRoomBooking(): Promise<void> {
    await this.bookRoomButtons.first().scrollIntoViewIfNeeded();
    await this.bookRoomButtons.first().click();
  }

  async submitContactForm(data: {
    name: string;
    email: string;
    phone: string;
    subject: string;
    message: string;
  }): Promise<void> {
    await this.scrollTo(this.contactSection);
    await this.contactName.fill(data.name);
    await this.contactEmail.fill(data.email);
    await this.contactPhone.fill(data.phone);
    await this.contactSubject.fill(data.subject);
    await this.contactMessage.fill(data.message);
    await this.contactSubmit.click();
  }
}
