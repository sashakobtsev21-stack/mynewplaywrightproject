export const ROUTES = {
  home: '/',
  admin: '/admin',
} as const;

export const TIMEOUTS = {
  short: 5_000,
  medium: 10_000,
  long: 30_000,
} as const;

// Restful-Booker exposes its REST API under these prefixes.
// Source: https://automationintesting.online/api-docs/
export const API = {
  auth: '/auth',
  booking: '/booking',
  room: '/room',
  message: '/message',
  report: '/report',
} as const;
