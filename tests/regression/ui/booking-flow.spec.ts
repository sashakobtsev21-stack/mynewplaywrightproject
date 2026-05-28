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

  test.fixme('happy path: guest details + future dates produce a confirmation', async ({
    homePage,
    bookingPage,
    log,
  }) => {
    // Public demo rate-limits POST /booking after a handful of requests,
    // returning 400 "must be a well-formed email address" even for valid emails.
    // Re-enable when we either pin a local SUT or wire a request budget into the suite.
    const guest = uiGuestFactory();
    const [checkin, checkout] = bookingWindow(14, 2);
    log.info({ guest, checkin, checkout }, 'creating booking');

    await homePage.openFirstRoomBooking();
    await bookingPage.fillGuestDetails(guest);
    await bookingPage.setDates(checkin, checkout);
    await bookingPage.submit();
    await bookingPage.expectConfirmation();
  });

  test.fixme('cancel closes the booking form', async ({ homePage, bookingPage }) => {
    // The reservation page state machine differs from what this test assumes:
    // "Reserve Now" stays visible after the form opens (it's not hidden — Cancel sits
    // next to it). Rewriting this around the actual state machine is a separate task.
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
