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
    this.roomCards = page.locator('.room-card, [data-testid="room-card"], .hotel-room-info');
    // Scope to real reservation links — the page also has a hero CTA "Book Now"
    // with href="#booking" that just scrolls to a section; we'd land on the
    // home anchor instead of /reservation/{id} if we matched by text alone.
    this.bookRoomButtons = page.locator('a[href^="/reservation"]');

    this.contactSection = page.locator('#contact');
    this.contactName = page.getByTestId('ContactName');
    this.contactEmail = page.getByTestId('ContactEmail');
    this.contactPhone = page.getByTestId('ContactPhone');
    this.contactSubject = page.getByTestId('ContactSubject');
    this.contactMessage = page.getByTestId('ContactDescription');
    this.contactSubmit = this.contactSection.getByRole('button', { name: /submit/i });
  }

  // Override so `open()` doesn't return until rooms (and their book buttons)
  // have rendered — otherwise tests that immediately count() book buttons race
  // the async render and get zero.
  protected override async waitForReady(): Promise<void> {
    await this.page.waitForLoadState('domcontentloaded');
    await this.roomCards.first().waitFor({ state: 'visible' });
    await this.bookRoomButtons.first().waitFor({ state: 'visible' });
  }

  async assertLoaded(): Promise<void> {
    await expect(this.page).toHaveTitle(/Restful[- ]Booker|hotel/i);
    await this.roomCards.first().waitFor({ state: 'visible' });
    await this.bookRoomButtons.first().waitFor({ state: 'visible' });
  }

  async openFirstRoomBooking(): Promise<void> {
    await this.bookRoomButtons.first().scrollIntoViewIfNeeded();
    await this.bookRoomButtons.first().click();
  }

  async scrollToContact(): Promise<void> {
    await this.scrollTo(this.contactSection);
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
