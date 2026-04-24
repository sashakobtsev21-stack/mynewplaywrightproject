import { test, expect } from '../../src/fixtures/playwright-fixtures';

test.describe('@smoke admin portal', () => {
  test('login page renders the form', async ({ adminLoginPage }) => {
    await adminLoginPage.open();
    await expect(adminLoginPage.usernameInput).toBeVisible();
    await expect(adminLoginPage.passwordInput).toBeVisible();
    await expect(adminLoginPage.submitButton).toBeEnabled();
  });

  test('admin can log in with valid credentials', async ({ adminLoginPage }) => {
    await adminLoginPage.open();
    await adminLoginPage.loginAsAdmin();
    await adminLoginPage.expectLoggedIn();
  });
});
