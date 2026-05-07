import { test, expect } from '../../src/fixtures/playwright-fixtures';
import { uiGuestFactory } from '../../src/fixtures/data-factory';

test.describe('visual: booking form', () => {
  test('empty form layout', async ({ homePage, page }) => {
    await homePage.open();
    await homePage.openFirstRoomBooking();

    await expect(page).toHaveScreenshot('booking-form-empty.png', {
      fullPage: false,
      maxDiffPixelRatio: 0.03,
      mask: [
        page.locator('img'),
        page.locator('.room-price, [data-testid="price"]'),
      ],
    });
  });

  test('filled form layout', async ({ homePage, bookingPage, page }) => {
    await homePage.open();
    await homePage.openFirstRoomBooking();
    await bookingPage.fillGuestDetails(uiGuestFactory());

    await expect(page).toHaveScreenshot('booking-form-filled.png', {
      fullPage: false,
      maxDiffPixelRatio: 0.03,
      mask: [page.locator('img'), page.locator('.room-price')],
    });
  });
});
