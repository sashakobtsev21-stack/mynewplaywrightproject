import { test, expect } from '../../../src/fixtures/playwright-fixtures';
import { uiGuestFactory } from '../../../src/fixtures/data-factory';
import { bookingWindow } from '../../../src/utils/date-helpers';

test.describe('negative: booking form', () => {
  test.beforeEach(async ({ homePage }) => {
    await homePage.open();
    await homePage.openFirstRoomBooking();
  });

  test('submitting empty form shows validation error', async ({ bookingPage }) => {
    await bookingPage.submit();
    await bookingPage.expectError();
  });

  test('only some fields filled still triggers validation', async ({ bookingPage }) => {
    await bookingPage.fillGuestDetails({
      firstName: 'John',
      lastName: '',
      email: '',
      phone: '',
    });
    await bookingPage.submit();
    await bookingPage.expectError();
  });

  test('malformed email is rejected', async ({ bookingPage }) => {
    await bookingPage.fillGuestDetails({
      ...uiGuestFactory(),
      email: 'not-an-email',
    });
    const [checkin, checkout] = bookingWindow(10, 2);
    await bookingPage.setDates(checkin, checkout);
    await bookingPage.submit();
    await bookingPage.expectError();
  });

  test('checkout before checkin is rejected', async ({ bookingPage }) => {
    await bookingPage.fillGuestDetails(uiGuestFactory());
    const [checkin, checkout] = bookingWindow(10, 2);
    // swap on purpose
    await bookingPage.setDates(checkout, checkin);
    await bookingPage.submit();
    await bookingPage.expectError();
  });

  test('extremely long firstname does not break the form', async ({ bookingPage }) => {
    const longName = 'A'.repeat(500);
    await bookingPage.fillGuestDetails({
      ...uiGuestFactory(),
      firstName: longName,
    });
    const [checkin, checkout] = bookingWindow(10, 2);
    await bookingPage.setDates(checkin, checkout);
    await bookingPage.submit();
    // Either rejected or accepted — either way the page shouldn't be broken
    await expect(bookingPage.errorAlert.or(bookingPage.confirmation)).toBeVisible({
      timeout: 10_000,
    });
  });

  test('unicode names go through without crashing the form', async ({ bookingPage }) => {
    await bookingPage.fillGuestDetails({
      firstName: 'Йоана',
      lastName: '日本語姓',
      email: '[email protected]',
      phone: '11111111111',
    });
    const [checkin, checkout] = bookingWindow(10, 2);
    await bookingPage.setDates(checkin, checkout);
    await bookingPage.submit();
    await expect(bookingPage.errorAlert.or(bookingPage.confirmation)).toBeVisible({
      timeout: 10_000,
    });
  });

  test('XSS attempt in name field does not execute script', async ({ bookingPage, page }) => {
    // NOTE: this is a sanity check on output escaping, NOT a full security test.
    // For real XSS testing use a dedicated scanner.
    const xss = '<script>window.__pwned = true</script>';
    await bookingPage.fillGuestDetails({
      firstName: xss,
      lastName: 'X',
      email: '[email protected]',
      phone: '11111111111',
    });
    const [checkin, checkout] = bookingWindow(10, 2);
    await bookingPage.setDates(checkin, checkout);
    await bookingPage.submit();
    // eslint-disable-next-line playwright/no-wait-for-timeout -- give any injected script a beat to fire before checking
    await page.waitForTimeout(500);
    const pwned = await page.evaluate(() => (window as unknown as { __pwned?: boolean }).__pwned);
    expect(pwned).toBeFalsy();
  });
});
