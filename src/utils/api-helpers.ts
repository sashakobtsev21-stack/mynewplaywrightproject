/**
 * Tiny helpers for shaping HTTP details. Not a real "framework" — just things
 * that started repeating across API specs and weren't worth a library.
 */

export const cookieHeader = (token: string): Record<string, string> => ({
  cookie: `token=${token}`,
});

export const basicAuthHeader = (user: string, pass: string): Record<string, string> => ({
  authorization: `Basic ${Buffer.from(`${user}:${pass}`).toString('base64')}`,
});
