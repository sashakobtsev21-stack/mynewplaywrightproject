import { test, expect } from '../../../src/fixtures/playwright-fixtures';
import { AdminBrandingPage } from '../../../src/pages/admin/branding.page';

test.describe('admin branding page', () => {
  test.beforeEach(async ({ adminLoginPage, page }) => {
    // eslint-disable-next-line playwright/no-skipped-test
    test.skip(
      test.info().project.name.startsWith('mobile'),
      'the Branding nav link collapses behind a toggler on mobile widths',
    );
    await adminLoginPage.open();
    await adminLoginPage.loginAsAdmin();
    await adminLoginPage.expectLoggedIn();
    // Let the SPA settle on /admin/rooms before clicking a nav link; a click
    // during the post-login redirect bounce is silently dropped on WebKit.
    await expect(page.locator('[data-testid="roomlisting"]').first()).toBeVisible({
      timeout: 15_000,
    });
  });

  // eslint-disable-next-line playwright/expect-expect
  test('branding details load from the nav', async ({ page }) => {
    const branding = new AdminBrandingPage(page);
    await branding.openFromNav();
    await branding.expectLoaded();
  });
});
