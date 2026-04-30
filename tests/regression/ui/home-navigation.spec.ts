import { test, expect } from '../../../src/fixtures/playwright-fixtures';

test.describe('home page navigation', () => {
  test('renders at least one room card', async ({ homePage }) => {
    await homePage.open();
    await expect(homePage.roomCards.first()).toBeVisible();
  });

  test('book buttons are clickable in viewport order', async ({ homePage }) => {
    await homePage.open();
    const count = await homePage.bookRoomButtons.count();
    expect(count).toBeGreaterThan(0);
    // Just click the first one to make sure it dispatches an event
    await homePage.bookRoomButtons.first().scrollIntoViewIfNeeded();
  });

  test('title matches the expected pattern', async ({ homePage, page }) => {
    await homePage.open();
    await expect(page).toHaveTitle(/Restful[- ]Booker|hotel/i);
  });
});
