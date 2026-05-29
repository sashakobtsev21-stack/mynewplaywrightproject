import { test, expect } from '../../../src/fixtures/playwright-fixtures';
import { faker } from '@faker-js/faker';

test.describe('contact form', () => {
  // The demo shows no confirmation locator after submit (tracked in issue #5),
  // so these two only check that submitting doesn't throw or break the page.
  // eslint-disable-next-line playwright/expect-expect
  test('user can submit a valid contact message', async ({ homePage }) => {
    await homePage.open();
    await homePage.submitContactForm({
      name: faker.person.fullName(),
      email: faker.internet.email(),
      phone: faker.string.numeric(11),
      subject: 'Question about availability',
      message: 'Hi, do you have availability for next weekend?',
    });
    // No confirmation locator yet — see #5 in repo issues. Just check no JS error.
  });

  // eslint-disable-next-line playwright/expect-expect
  test('message field accepts long text', async ({ homePage }) => {
    await homePage.open();
    const longMessage = faker.lorem.paragraphs(3).slice(0, 800);
    await homePage.submitContactForm({
      name: faker.person.fullName(),
      email: faker.internet.email(),
      phone: faker.string.numeric(11),
      subject: 'Long subject test',
      message: longMessage,
    });
  });

  test('contact section becomes visible after scrolling', async ({ homePage }) => {
    await homePage.open();
    await homePage.scrollToContact();
    await expect(homePage.contactName).toBeVisible();
  });
});
