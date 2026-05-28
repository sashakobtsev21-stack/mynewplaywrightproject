import { test, expect } from '../../src/fixtures/playwright-fixtures';

// First time: run with `npx playwright test --update-snapshots` to create baselines.
// Visual tests are flaky across OSes; CI runs them on Linux only (configured in nightly workflow).

test.describe('visual: home page', () => {
  test('above the fold', async ({ homePage, page }) => {
    await homePage.open();
    await homePage.assertLoaded();

    await expect(page).toHaveScreenshot('home-hero.png', {
      fullPage: false,
      maxDiffPixelRatio: 0.02,
      mask: [
        // images and prices may change between runs / random promos
        page.locator('img'),
        page.locator('.room-price, [data-testid="price"]'),
      ],
    });
  });

test('full page', async ({ homePage, page }) => {
    await homePage.open();
    // eslint-disable-next-line playwright/no-networkidle -- visual snapshot needs the page fully settled
    await page.waitForLoadState('networkidle');
    // give carousels/animations a beat to settle
    // eslint-disable-next-line playwright/no-wait-for-timeout -- waiting out CSS animations before snapshot
    await page.waitForTimeout(500);

    await expect(page).toHaveScreenshot('home-full.png', {
      fullPage: true,
      maxDiffPixelRatio: 0.03,
      mask: [
        page.locator('img'),
        page.locator('.room-price, [data-testid="price"]'),
      ],
    });
  });

  test('contact section', async ({ homePage }) => {
    await homePage.open();
    await homePage.scrollToContact();

    await expect(homePage.contactSection).toHaveScreenshot('home-contact.png', {
      maxDiffPixelRatio: 0.02,
    });
  });
});
