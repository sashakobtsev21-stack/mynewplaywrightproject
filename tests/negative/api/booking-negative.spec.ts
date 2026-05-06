import { test, expect } from '../../../src/fixtures/playwright-fixtures';
import { bookingFactory } from '../../../src/fixtures/data-factory';
import { cookieHeader } from '../../../src/utils/api-helpers';
import { API } from '../../../src/config/constants';

test.describe('negative: /booking', () => {
  test('POST with empty body fails', async ({ request }) => {
    const res = await request.post(API.booking, { data: {} });
    expect(res.ok()).toBe(false);
  });

  test('POST with wrong types fails', async ({ request }) => {
    const res = await request.post(API.booking, {
      data: {
        roomid: 'not-a-number',
        firstname: 12345,
        depositpaid: 'yes',
        bookingdates: 'not-an-object',
      },
    });
    expect(res.ok()).toBe(false);
  });

  test('POST missing required fields fails', async ({ request }) => {
    const partial = bookingFactory();
    const broken = { ...partial } as Partial<typeof partial>;
    delete broken.bookingdates;
    const res = await request.post(API.booking, { data: broken });
    expect(res.ok()).toBe(false);
  });

  test('GET non-existent booking returns 404', async ({ request }) => {
    const res = await request.get(`${API.booking}/99999999`);
    expect(res.status()).toBe(404);
  });

  test('PUT without auth cookie is rejected (401/403)', async ({ bookingClient, request }) => {
    const created = await bookingClient.create(bookingFactory());
    const res = await request.put(`${API.booking}/${created.bookingid}`, {
      data: bookingFactory(),
    });
    expect([401, 403]).toContain(res.status());
  });

  test('DELETE with invalid token is rejected', async ({ bookingClient, request }) => {
    const created = await bookingClient.create(bookingFactory());
    const res = await request.delete(`${API.booking}/${created.bookingid}`, {
      headers: cookieHeader('definitely-not-a-token'),
    });
    expect(res.ok()).toBe(false);
  });

  test.skip('POST with payload >1MB returns 413', async ({ request }) => {
    // The demo doesn't surface 413 consistently — sometimes 500, sometimes truncates silently.
    // Re-enable when we can pin down behaviour locally with docker.
    const huge = 'x'.repeat(1_100_000);
    const res = await request.post(API.booking, {
      data: { ...bookingFactory(), firstname: huge },
    });
    expect(res.status()).toBe(413);
  });
});
