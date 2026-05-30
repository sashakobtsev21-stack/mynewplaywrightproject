import { test, expect } from '../../../src/fixtures/playwright-fixtures';
import { AdminMessagesPage } from '../../../src/pages/admin/messages.page';
import { messageFactory } from '../../../src/fixtures/data-factory';

test.describe('admin message inbox', () => {
  test.beforeEach(async ({ adminLoginPage, page }) => {
    // eslint-disable-next-line playwright/no-skipped-test
    test.skip(
      test.info().project.name.startsWith('mobile'),
      'the Messages nav link collapses behind a toggler on mobile widths',
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

  test('the inbox lists messages', async ({ page }) => {
    const inbox = new AdminMessagesPage(page);
    await inbox.openFromNav();
    await inbox.expectInboxLoaded();
  });

  test('a message sent via the contact API shows up in the inbox', async ({
    page,
    messageClient,
    adminToken,
  }) => {
    const payload = messageFactory();
    await messageClient.create(payload);

    const inbox = new AdminMessagesPage(page);
    await inbox.openFromNav();
    await expect(inbox.rowBySubject(payload.subject)).toBeVisible({ timeout: 10_000 });

    // Tidy up the message we created through the API.
    const id = await messageClient.idBySubject(payload.subject);
    await messageClient.delete(id, adminToken);
  });
});
