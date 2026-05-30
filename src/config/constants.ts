export const ROUTES = {
  home: '/',
  admin: '/admin',
} as const;

export const TIMEOUTS = {
  short: 5_000,
  medium: 10_000,
  long: 30_000,
} as const;

// Restful-Booker Platform mounts every REST resource under /api on both the
// public demo (https://automationintesting.online/api/...) and the local
// docker-compose stack (proxied by nginx). Anything served from the bare root
// is the Next.js frontend, which is why hitting /booking returns HTML 404.
// Keep the prefix in one place so clients/specs never reconstruct URLs.
export const API_PREFIX = '/api';

export const API = {
  auth: `${API_PREFIX}/auth`,
  booking: `${API_PREFIX}/booking`,
  room: `${API_PREFIX}/room`,
  message: `${API_PREFIX}/message`,
  report: `${API_PREFIX}/report`,
  branding: `${API_PREFIX}/branding`,
} as const;
