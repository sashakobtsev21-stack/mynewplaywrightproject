import { test, expect } from '../../../src/fixtures/playwright-fixtures';
import { env } from '../../../src/config/env';

const creds = () => ({ username: env.ADMIN_USERNAME, password: env.ADMIN_PASSWORD });

/**
 * Token validation edges that the happy-path auth.spec doesn't cover.
 */
test.describe('auth session lifecycle', () => {
  test('validate rejects an empty token', async ({ authClient }) => {
    expect(await authClient.validate('')).toBe(false);
  });

  test('two sequential logins each issue an independently valid token', async ({ authClient }) => {
    const first = await authClient.login(creds());
    const second = await authClient.login(creds());

    expect(first.token).toBeTruthy();
    expect(second.token).toBeTruthy();
    await expect.poll(async () => authClient.validate(first.token)).toBe(true);
    await expect.poll(async () => authClient.validate(second.token)).toBe(true);
  });

  // The Restful-Booker Platform demo never invalidates a token on logout — a
  // logged-out token keeps validating true indefinitely (confirmed against the
  // live API). Documented as a known platform limitation; re-enable if the demo
  // starts honouring logout.
  test.fixme('logout invalidates the token', async ({ authClient }) => {
    const { token } = await authClient.login(creds());
    await authClient.logout(token);
    await expect.poll(async () => authClient.validate(token)).toBe(false);
  });
});
