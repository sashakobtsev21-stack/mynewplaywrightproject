import { test, expect } from '../../../src/fixtures/playwright-fixtures';

test.describe('@smoke API health', () => {
  test('auth endpoint accepts admin login and returns a token', async ({ adminToken }) => {
    expect(adminToken).toBeTruthy();
    expect(adminToken.length).toBeGreaterThan(8);
  });

  test('booking list returns an array shape', async ({ bookingClient }) => {
    const list = await bookingClient.list();
    expect(Array.isArray(list.bookings)).toBe(true);
  });

  test('room list is non-empty', async ({ roomClient }) => {
    const list = await roomClient.list();
    expect(list.rooms.length).toBeGreaterThan(0);
  });
});
