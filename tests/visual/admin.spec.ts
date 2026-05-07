import { test, expect } from '../../src/fixtures/playwright-fixtures';

test.describe('visual: admin', () => {
  test('login page', async ({ adminLoginPage, page }) => {
    await adminLoginPage.open();
    await expect(adminLoginPage.submitButton).toBeVisible();
    await expect(page).toHaveScreenshot('admin-login.png', {
      maxDiffPixelRatio: 0.02,
    });
  });

  test('login error state', async ({ adminLoginPage, page }) => {
    await adminLoginPage.open();
    await adminLoginPage.login('admin', 'wrong-password');
    await adminLoginPage.expectInvalidCredentials();

    await expect(page).toHaveScreenshot('admin-login-error.png', {
      maxDiffPixelRatio: 0.03,
      mask: [adminLoginPage.errorMessage], // error text may differ slightly
    });
  });
});
