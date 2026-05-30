import { test } from '../../../src/fixtures/playwright-fixtures';
import { AdminBrandingPage } from '../../../src/pages/admin/branding.page';

test.describe('admin branding page', () => {
  test.beforeEach(async ({ adminLoginPage }) => {
    // eslint-disable-next-line playwright/no-skipped-test
    test.skip(
      test.info().project.name.startsWith('mobile'),
      'the Branding nav link collapses behind a toggler on mobile widths',
    );
    await adminLoginPage.open();
    await adminLoginPage.loginAsAdmin();
    await adminLoginPage.expectLoggedIn();
  });

  // eslint-disable-next-line playwright/expect-expect
  test('branding details load from the nav', async ({ page }) => {
    const branding = new AdminBrandingPage(page);
    await branding.openFromNav();
    await branding.expectLoaded();
  });
});
