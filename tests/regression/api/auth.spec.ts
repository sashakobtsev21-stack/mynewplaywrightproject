import { test, expect } from '../../../src/fixtures/playwright-fixtures';
import { env } from '../../../src/config/env';

test.describe('auth API', () => {
  test('valid credentials return a non-empty token', async ({ authClient }) => {
    const { token } = await authClient.login({
      username: env.ADMIN_USERNAME,
      password: env.ADMIN_PASSWORD,
    });
    expect(token).toBeTruthy();
  });

  test('validate confirms a freshly issued token', async ({ authClient }) => {
    const { token } = await authClient.login({
      username: env.ADMIN_USERNAME,
      password: env.ADMIN_PASSWORD,
    });
    await expect.poll(async () => authClient.validate(token)).toBe(true);
  });

  test('validate rejects an obviously broken token', async ({ authClient }) => {
    const ok = await authClient.validate('not-a-real-token');
    expect(ok).toBe(false);
  });

  test('logout does not throw on a valid token', async ({ authClient }) => {
    const { token } = await authClient.login({
      username: env.ADMIN_USERNAME,
      password: env.ADMIN_PASSWORD,
    });
    await authClient.logout(token);
  });
});
