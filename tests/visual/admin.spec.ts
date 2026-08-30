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
      // Mask every alert, not just the first. The demo renders them in two passes
      // and masking `.first()` left the second one compared pixel by pixel.
      mask: [adminLoginPage.errorMessages],
    });
  });
});
