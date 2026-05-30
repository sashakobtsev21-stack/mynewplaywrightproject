import { test, expect } from '../../../src/fixtures/playwright-fixtures';
import { bookingFactory } from '../../../src/fixtures/data-factory';

/**
 * Edge cases for the booking list filters. The plain list flow is already
 * covered in booking-list.spec; this file pins the filter boundaries
 * (unknown room, room-scoped, name-scoped).
 */
test.describe('booking filter edges', () => {
  test('an unknown roomid yields an empty booking list', async ({ bookingClient }) => {
    const { bookings } = await bookingClient.list({ roomid: 99_999_999 });
    expect(bookings).toEqual([]);
  });

  test('filtering by firstname surfaces a freshly-created booking', async ({ bookingClient }) => {
    // firstname is capped at 18 chars by the API, so keep the unique marker short.
    const payload = bookingFactory({ firstname: `Filt${Date.now() % 1_000_000}` });
    const created = await bookingClient.create(payload);

    const found = await bookingClient.list({ firstname: payload.firstname });
    expect(found.bookings.some((b) => b.bookingid === created.bookingid)).toBe(true);
  });

  test('a booking created on room 1 is returned when scoping to room 1', async ({
    bookingClient,
  }) => {
    const created = await bookingClient.create(bookingFactory({ roomid: 1 }));

    const scoped = await bookingClient.list({ roomid: 1 });
    expect(scoped.bookings.some((b) => b.bookingid === created.bookingid)).toBe(true);
  });
});
