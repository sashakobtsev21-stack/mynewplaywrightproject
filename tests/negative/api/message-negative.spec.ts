import { test, expect } from '../../../src/fixtures/playwright-fixtures';
import { API } from '../../../src/config/constants';

test.describe('negative: /message', () => {
  test('POST with an empty body returns 400', async ({ request }) => {
    const res = await request.post(API.message, { data: {} });
    expect(res.status()).toBe(400);
  });

  test('DELETE without auth is rejected', async ({ request, messageClient }) => {
    const { messages } = await messageClient.list();
    expect(messages.length).toBeGreaterThan(0);
    const res = await request.delete(`${API.message}/${messages[0].id}`);
    expect([401, 403]).toContain(res.status());
  });

  test('GET an unknown message id fails', async ({ request }) => {
    const res = await request.get(`${API.message}/99999999`);
    expect(res.ok()).toBe(false);
  });
});
