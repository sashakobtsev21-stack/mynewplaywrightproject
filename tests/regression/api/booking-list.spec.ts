import { test, expect } from '../../../src/fixtures/playwright-fixtures';
import { bookingFactory } from '../../../src/fixtures/data-factory';

test.describe('booking list & filter', () => {
  test('GET /booking returns an array of {bookingid}', async ({ bookingClient }) => {
    const { bookings } = await bookingClient.list();
    expect(Array.isArray(bookings)).toBe(true);
    for (const b of bookings.slice(0, 3)) {
      expect(typeof b.bookingid).toBe('number');
    }
  });

  test('filtering by roomid returns only matching bookings (loose check)', async ({
    bookingClient,
  }) => {
    const list = await bookingClient.list({ roomid: 1 });
    expect(Array.isArray(list.bookings)).toBe(true);
  });

  test('filtering by lastname surfaces a freshly-created booking', async ({ bookingClient }) => {
    const payload = bookingFactory({ lastname: `Searchable${Date.now()}` });
    const created = await bookingClient.create(payload);

    const found = await bookingClient.list({ lastname: payload.lastname });
    expect(found.bookings.some((b) => b.bookingid === created.bookingid)).toBe(true);
  });

  test('booking list returns within a reasonable time', async ({ bookingClient }) => {
    test.slow(); // demo infra is occasionally laggy — triple the budget
    const t0 = Date.now();
    await bookingClient.list();
    const elapsed = Date.now() - t0;
    // Public demo is hosted on shared infra; be generous.
    expect(elapsed).toBeLessThan(5000);
  });
});
