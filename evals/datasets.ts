import type { TestKind } from '../src/ai/test-generator';
import type { AiKind } from '../src/ai/data-generator';

/**
 * Small, hand-written eval datasets. Kept tiny on purpose — these are smoke-level
 * quality gates, not a benchmark. Grow them when a regression slips through.
 */

export interface SpecCase {
  id: string;
  requirement: string;
  kind: TestKind;
}

export const specCases: SpecCase[] = [
  {
    id: 'cancel-booking-ui',
    requirement: 'User can cancel a booking from the reservation page',
    kind: 'ui',
  },
  {
    id: 'room-list-api',
    requirement: 'GET /room returns a non-empty list of rooms with an id and name',
    kind: 'api',
  },
];

export interface DataCase {
  id: string;
  kind: AiKind;
  context?: string;
  count: number;
}

export const dataCases: DataCase[] = [
  {
    id: 'business-bookings',
    kind: 'booking',
    context: 'international business guests, multi-night stays',
    count: 5,
  },
  { id: 'simple-guests', kind: 'guest', count: 5 },
];

export interface AnalysisCase {
  id: string;
  errorContext: string;
  specSource: string;
}

export const analysisCases: AnalysisCase[] = [
  {
    id: 'admin-login-hidden-button',
    errorContext: [
      '# Page snapshot at failure',
      '- button "Login" [ref=doLogin] (visible)',
      '- alert "Invalid credentials"',
      'Expected the login button to be hidden after a successful login, but it is still visible.',
    ].join('\n'),
    specSource: [
      "import { test, expect } from '../../src/fixtures/playwright-fixtures';",
      "test('admin can log in', async ({ adminLoginPage }) => {",
      '  await adminLoginPage.open();',
      "  await adminLoginPage.login('admin', 'password');",
      '  await adminLoginPage.expectLoggedIn();',
      '});',
    ].join('\n'),
  },
];
