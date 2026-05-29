import { test, expect } from '../../../src/fixtures/playwright-fixtures';
import { bookingFactory } from '../../../src/fixtures/data-factory';
import bookingSchema from '../../../src/api/schemas/booking.schema.json';
import bookingListSchema from '../../../src/api/schemas/booking-list.schema.json';

test.describe('contract: /booking', () => {
  test('POST /booking response matches Booking schema', async ({ bookingClient }) => {
    const created = await bookingClient.create(bookingFactory());
    expect(created).toMatchSchema(bookingSchema);
  });

  test('GET /booking response matches BookingList schema', async ({ bookingClient }) => {
    const list = await bookingClient.list();
    expect(list).toMatchSchema(bookingListSchema);
  });

  test('GET /booking/{id} response matches Booking schema', async ({ bookingClient }) => {
    const { bookings } = await bookingClient.list();
    // Runtime guard: nothing to validate against an empty list, not a disabled test.
    // eslint-disable-next-line playwright/no-skipped-test
    test.skip(bookings.length === 0, 'no bookings available to validate');
    const sample = await bookingClient.getById(bookings[0].bookingid);
    expect(sample).toMatchSchema(bookingSchema);
  });
});
