import { test, expect } from '../../../src/fixtures/playwright-fixtures';
import { faker } from '@faker-js/faker';

test.describe('contact form', () => {
  // The demo shows no confirmation locator after submit (issue #5), so instead
  // of asserting on the DOM we assert the form's POST to the message API
  // succeeded — a real behavioral signal that doesn't depend on a flaky toast.
  test('user can submit a valid contact message', async ({ homePage, page }) => {
    await homePage.open();
    const messagePost = page.waitForResponse(
      (r) => r.request().method() === 'POST' && /message/i.test(r.url()),
    );
    await homePage.submitContactForm({
      name: faker.person.fullName(),
      email: faker.internet.email(),
      phone: faker.string.numeric(11),
      subject: 'Question about availability',
      message: 'Hi, do you have availability for next weekend?',
    });
    expect((await messagePost).ok()).toBeTruthy();
  });

  test('message field accepts long text', async ({ homePage, page }) => {
    await homePage.open();
    const longMessage = faker.lorem.paragraphs(3).slice(0, 800);
    const messagePost = page.waitForResponse(
      (r) => r.request().method() === 'POST' && /message/i.test(r.url()),
    );
    await homePage.submitContactForm({
      name: faker.person.fullName(),
      email: faker.internet.email(),
      phone: faker.string.numeric(11),
      subject: 'Long subject test',
      message: longMessage,
    });
    expect((await messagePost).ok()).toBeTruthy();
  });

  test('contact section becomes visible after scrolling', async ({ homePage }) => {
    await homePage.open();
    await homePage.scrollToContact();
    await expect(homePage.contactName).toBeVisible();
  });
});
