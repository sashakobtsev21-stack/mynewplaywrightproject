import { test, expect } from '../../../src/fixtures/playwright-fixtures';
import { env } from '../../../src/config/env';
import authSchema from '../../../src/api/schemas/auth.schema.json';

test('contract: POST /auth/login returns a Token', async ({ authClient }) => {
  const res = await authClient.login({
    username: env.ADMIN_USERNAME,
    password: env.ADMIN_PASSWORD,
  });
  expect(res).toMatchSchema(authSchema);
});
