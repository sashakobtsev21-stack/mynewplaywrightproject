import { test, expect } from '../../../src/fixtures/playwright-fixtures';
import { bookingFactory } from '../../../src/fixtures/data-factory';
import { API } from '../../../src/config/constants';

test.describe('negative: /booking overlap', () => {
  test('a booking overlapping an existing one returns 409', async ({ bookingClient, request }) => {
    // Claim a far-future window on room 1, then try to book the same nights again.
    const created = await bookingClient.create(bookingFactory({ roomid: 1 }));

    const res = await request.post(API.booking, {
      data: bookingFactory({ roomid: 1, bookingdates: created.bookingdates }),
    });
    expect(res.status()).toBe(409);
  });
});
