import { test, expect } from '../../../src/fixtures/playwright-fixtures';
import { API } from '../../../src/config/constants';
import users from '../../../src/fixtures/test-data/users.json';

test.describe('negative: /auth', () => {
  for (const bad of users.invalidLogins) {
    test(`login rejected: ${bad.case}`, async ({ request }) => {
      const res = await request.post(`${API.auth}/login`, {
        data: { username: bad.username, password: bad.password },
      });
      expect(res.ok()).toBe(false);
    });
  }

  test('validate with malformed body returns falsy', async ({ authClient }) => {
    const ok = await authClient.validate('');
    expect(ok).toBe(false);
  });
});
