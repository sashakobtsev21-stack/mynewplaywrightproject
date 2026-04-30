import { test, expect } from '../../../src/fixtures/playwright-fixtures';
import { uiGuestFactory } from '../../../src/fixtures/data-factory';
import { bookingWindow } from '../../../src/utils/date-helpers';

test.describe('booking flow', () => {
  test.beforeEach(async ({ homePage }) => {
    await homePage.open();
  });

  test('user can open the booking form from a room card', async ({
    homePage,
    bookingPage,
  }) => {
    await homePage.openFirstRoomBooking();
    await expect(bookingPage.bookButton).toBeVisible();
  });

  test('happy path: guest details + future dates produce a confirmation', async ({
    homePage,
    bookingPage,
    log,
  }) => {
    const guest = uiGuestFactory();
    const [checkin, checkout] = bookingWindow(14, 2);
    log.info({ guest, checkin, checkout }, 'creating booking');

    await homePage.openFirstRoomBooking();
    await bookingPage.fillGuestDetails(guest);
    await bookingPage.setDates(checkin, checkout);
    await bookingPage.submit();
    await bookingPage.expectConfirmation();
  });

  test('cancel closes the booking form', async ({ homePage, bookingPage }) => {
    await homePage.openFirstRoomBooking();
    await bookingPage.cancelButton.click();
    await expect(bookingPage.bookButton).toBeHidden();
  });

  // Flaky on mobile-safari only, never reproduced locally on desktop.
  // Skipping for now, will revisit after stabilising date pickers.
  test.fixme('mobile: dates can be picked via calendar widget', async ({ bookingPage }) => {
    await bookingPage.checkInInput.click();
    // ...
    expect(true).toBe(false);
  });
});
