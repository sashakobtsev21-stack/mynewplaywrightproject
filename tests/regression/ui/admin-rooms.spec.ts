import { test, expect } from '../../../src/fixtures/playwright-fixtures';
import { AdminRoomsPage } from '../../../src/pages/admin/rooms.page';

test.describe('admin room management', () => {
  test.beforeEach(async ({ adminLoginPage }) => {
    await adminLoginPage.open();
    await adminLoginPage.loginAsAdmin();
    await adminLoginPage.expectLoggedIn();
  });

  test('the rooms table renders after login', async ({ page }) => {
    const rooms = new AdminRoomsPage(page);
    await rooms.expectListed();
  });

  test('the create-room form exposes the room fields', async ({ page }) => {
    const rooms = new AdminRoomsPage(page);
    await expect(rooms.roomNameInput).toBeVisible();
    await expect(rooms.typeSelect).toBeVisible();
    await expect(rooms.roomPriceInput).toBeVisible();
    await expect(rooms.createButton).toBeVisible();
  });

  test('admin can create a room and see it listed', async ({ page, roomClient, adminToken }) => {
    const rooms = new AdminRoomsPage(page);
    const name = String(Date.now()).slice(-6);

    await rooms.createRoom({ name, type: 'Double', price: 175 });
    await expect(rooms.roomName(name)).toBeVisible({ timeout: 10_000 });

    // Clean up through the API so the shared demo doesn't accumulate test rooms.
    const id = await roomClient.idByName(name);
    await roomClient.delete(id, adminToken);
  });
});
