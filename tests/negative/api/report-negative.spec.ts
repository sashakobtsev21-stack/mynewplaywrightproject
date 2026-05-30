import { test, expect } from '../../../src/fixtures/playwright-fixtures';
import { API } from '../../../src/config/constants';

test.describe('negative: /report', () => {
  // Only the aggregate report is admin-gated; /report/room/{id} is public on the
  // live platform, so just the aggregate endpoint is asserted here.
  test('GET /report without auth returns 401', async ({ request }) => {
    const res = await request.get(API.report);
    expect(res.status()).toBe(401);
  });
});
