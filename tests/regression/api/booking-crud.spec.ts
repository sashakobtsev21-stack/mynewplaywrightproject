import { test, expect } from '../../../src/fixtures/playwright-fixtures';
import { bookingFactory } from '../../../src/fixtures/data-factory';
import type { Booking } from '../../../src/api/types/booking.types';

/**
 * Serial mode is intentional — these tests reuse the same booking id across
 * the CRUD sequence (create -> read -> update -> patch -> delete). Running in
 * parallel would either race against itself or require N times more bookings,
 * which feels wasteful against the public demo.
 */
test.describe.serial('booking CRUD', () => {
  let created: Booking;

  test('POST creates a booking and returns the persisted entity', async ({ bookingClient }) => {
    const payload = bookingFactory();
    created = await bookingClient.create(payload);

    expect(created.bookingid).toBeGreaterThan(0);
    expect(created.firstname).toBe(payload.firstname);
    expect(created.lastname).toBe(payload.lastname);
  });

  test('GET /booking/{id} returns the same booking', async ({ bookingClient }) => {
    const got = await bookingClient.getById(created.bookingid);
    expect(got).toMatchObject({
      bookingid: created.bookingid,
      firstname: created.firstname,
      lastname: created.lastname,
    });
  });

  test('PUT fully updates the booking', async ({ bookingClient, adminToken }) => {
    // Reuse the factory's far-future random window so PUT doesn't collide with
    // existing bookings (a hard-coded `bookingWindow(30, 5)` was 409-prone).
    const { bookingdates: { checkin, checkout } } = bookingFactory();
    const updated = await bookingClient.update(
      created.bookingid,
      {
        ...created,
        firstname: 'Updated',
        lastname: 'Name',
        bookingdates: { checkin, checkout },
      },
      adminToken,
    );
    expect(updated.firstname).toBe('Updated');
    expect(updated.bookingdates.checkin).toBe(checkin);
  });

  test.fixme('PATCH partially updates the booking', async ({ bookingClient, adminToken }) => {
    // Platform now responds 405 Method Not Allowed on PATCH /booking/{id} —
    // partial updates aren't supported anymore. Re-enable when (and if) the
    // endpoint comes back, or rewrite as a PUT-based merge update.
    const patched = await bookingClient.partialUpdate(
      created.bookingid,
      { email: '[email protected]' },
      adminToken,
    );
    expect(patched.email).toBe('[email protected]');
  });

  test('DELETE removes the booking', async ({ bookingClient, adminToken }) => {
    await bookingClient.delete(created.bookingid, adminToken);
    await expect(bookingClient.getById(created.bookingid)).rejects.toThrow();
  });
});
