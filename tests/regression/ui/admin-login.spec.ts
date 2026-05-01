import { test, expect } from '../../../src/fixtures/playwright-fixtures';
import users from '../../../src/fixtures/test-data/users.json';

test.describe('admin login', () => {
  test.beforeEach(async ({ adminLoginPage }) => {
    await adminLoginPage.open();
  });

  test('valid credentials log the admin in', async ({ adminLoginPage }) => {
    await adminLoginPage.loginAsAdmin();
    await adminLoginPage.expectLoggedIn();
  });

  for (const invalid of users.invalidLogins) {
    test(`rejects login: ${invalid.case}`, async ({ adminLoginPage }) => {
      await adminLoginPage.login(invalid.username, invalid.password);
      await adminLoginPage.expectInvalidCredentials();
    });
  }

  test('login form has username and password fields', async ({ adminLoginPage }) => {
    await expect(adminLoginPage.usernameInput).toBeVisible();
    await expect(adminLoginPage.passwordInput).toBeVisible();
  });
});
