import { test, expect } from '../../../src/fixtures/playwright-fixtures';
import { HomePage } from '../../../src/pages/home.page';

test.describe('admin navigation out of the portal', () => {
  test.beforeEach(async ({ adminLoginPage }) => {
    // eslint-disable-next-line playwright/no-skipped-test
    test.skip(
      test.info().project.name.startsWith('mobile'),
      'the admin nav (Front Page link, Logout button) collapses behind a toggler on mobile widths',
    );
    await adminLoginPage.open();
    await adminLoginPage.loginAsAdmin();
    await adminLoginPage.expectLoggedIn();
  });

  test('the Front Page link returns to the public site', async ({ page }) => {
    await page.locator('#frontPageLink').click();
    await expect(page).toHaveURL(/automationintesting\.online\/?($|\?|#)/);
    const home = new HomePage(page);
    await expect(home.roomCards.first()).toBeVisible({ timeout: 10_000 });
  });

  test('logout leaves the portal for the public site', async ({ page }) => {
    // Logout redirects to the public home page (not the login form); the nav
    // swaps the Logout button for an "Admin" link to log back in.
    await page.getByRole('button', { name: /logout/i }).click();
    await expect(page).toHaveURL(/automationintesting\.online\/?($|\?|#)/);
    await expect(page.getByRole('link', { name: /^admin$/i })).toBeVisible({ timeout: 10_000 });
  });
});
