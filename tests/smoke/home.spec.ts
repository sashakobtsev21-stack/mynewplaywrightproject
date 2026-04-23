import { test, expect } from '../../src/fixtures/playwright-fixtures';

test.describe('@smoke home page', () => {
  test('loads with the hotel hero visible', async ({ homePage }) => {
    await homePage.open();
    await homePage.assertLoaded();
  });

  test('shows at least one bookable room', async ({ homePage }) => {
    await homePage.open();
    await expect(homePage.bookRoomButtons.first()).toBeVisible();
  });

  test('contact section is reachable by scrolling', async ({ homePage }) => {
    await homePage.open();
    await homePage.scrollToContact();
    await expect(homePage.contactName).toBeVisible();
  });
});
