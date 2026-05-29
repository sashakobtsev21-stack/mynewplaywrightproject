import { defineConfig, devices } from '@playwright/test';
import { env, isCi } from './src/config/env';

export default defineConfig({
  testDir: './tests',
  timeout: 30_000,
  expect: {
    timeout: 5_000,
  },
  fullyParallel: true,
  forbidOnly: isCi,
  retries: isCi ? 2 : 0,
  workers: isCi ? 2 : undefined,

  reporter: isCi
    ? [
        ['list'],
        ['html', { open: 'never' }],
        ['junit', { outputFile: 'test-results/junit.xml' }],
        ['allure-playwright', { detail: false, outputFolder: 'allure-results', suiteTitle: false }],
      ]
    : [
        ['list'],
        ['html', { open: 'never' }],
        ['allure-playwright', { detail: true, outputFolder: 'allure-results' }],
      ],

  use: {
    baseURL: env.BASE_URL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 10_000,
    navigationTimeout: 20_000,
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
      testIgnore: ['**/api/**', '**/unit/**'],
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
      testIgnore: ['**/api/**', '**/unit/**'],
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
      testIgnore: ['**/api/**', '**/unit/**'],
    },
    {
      name: 'mobile-chrome',
      use: { ...devices['Pixel 5'] },
      testIgnore: ['**/api/**', '**/visual/**', '**/unit/**'],
    },
    {
      name: 'mobile-safari',
      use: { ...devices['iPhone 13'] },
      testIgnore: ['**/api/**', '**/visual/**', '**/unit/**'],
    },
    {
      // pure API tests, no browser
      name: 'api',
      testMatch: ['**/api/**/*.spec.ts', '**/regression/api/**/*.spec.ts'],
      use: {
        baseURL: env.BASE_URL,
      },
    },
    {
      // pure unit tests for the src/ and ai/ helpers, no browser, no network
      name: 'unit',
      testMatch: ['**/unit/**/*.spec.ts'],
    },
  ],
});
