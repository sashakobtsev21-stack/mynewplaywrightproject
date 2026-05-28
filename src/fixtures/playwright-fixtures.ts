import { test as base, expect } from '@playwright/test';
import type { Logger } from 'pino';

// Side-effect: registers custom matchers like toMatchSchema
import '../utils/custom-matchers';

import { HomePage } from '../pages/home.page';
import { BookingPage } from '../pages/booking.page';
import { AdminLoginPage } from '../pages/admin/login.page';

import { AuthClient } from '../api/clients/auth.client';
import { BookingClient } from '../api/clients/booking.client';
import { RoomClient } from '../api/clients/room.client';

import { childLogger } from '../utils/logger';
import { env } from '../config/env';

type PageFixtures = {
  homePage: HomePage;
  bookingPage: BookingPage;
  adminLoginPage: AdminLoginPage;
};

type ApiFixtures = {
  authClient: AuthClient;
  bookingClient: BookingClient;
  roomClient: RoomClient;
};

type WorkerFixtures = {
  /**
   * Admin token fetched once per worker. Avoids spamming /auth/login from every
   * test. If the demo ever starts rotating tokens we'll need to drop this.
   */
  adminToken: string;
};

type UtilFixtures = {
  log: Logger;
};

export const test = base.extend<PageFixtures & ApiFixtures & UtilFixtures, WorkerFixtures>({
  homePage: async ({ page }, use) => {
    await use(new HomePage(page));
  },
  bookingPage: async ({ page }, use) => {
    await use(new BookingPage(page));
  },
  adminLoginPage: async ({ page }, use) => {
    await use(new AdminLoginPage(page));
  },

  authClient: async ({ request }, use) => {
    await use(new AuthClient(request));
  },
  bookingClient: async ({ request, adminToken }, use) => {
    await use(new BookingClient(request, adminToken));
  },
  roomClient: async ({ request }, use) => {
    await use(new RoomClient(request));
  },

  adminToken: [
    async ({ playwright }, use) => {
      const ctx = await playwright.request.newContext({ baseURL: env.BASE_URL });
      const client = new AuthClient(ctx);
      const { token } = await client.login({
        username: env.ADMIN_USERNAME,
        password: env.ADMIN_PASSWORD,
      });
      await use(token);
      await ctx.dispose();
    },
    { scope: 'worker' },
  ],

  // eslint-disable-next-line no-empty-pattern
  log: async ({}, use, testInfo) => {
    const log = childLogger(testInfo.title);
    log.info({ project: testInfo.project.name }, 'test starting');
    await use(log);
    log.info({ status: testInfo.status, durationMs: testInfo.duration }, 'test finished');
  },
});

export { expect };
