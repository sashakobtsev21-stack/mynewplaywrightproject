import { expect } from '@playwright/test';
import { validateSchema } from './schema-validator';

/**
 * Side-effect module — importing it registers custom expect matchers.
 * Import once from playwright-fixtures.ts so every spec picks it up automatically.
 */

expect.extend({
  toMatchSchema(received: unknown, schema: object) {
    const result = validateSchema(received, schema);
    return {
      pass: result.ok,
      message: () =>
        result.ok
          ? 'expected payload NOT to match schema, but it did'
          : `expected payload to match schema. Errors:\n  ${result.errors ?? '<unknown>'}`,
    };
  },
});

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace PlaywrightTest {
    interface Matchers<R, T> {
      toMatchSchema(schema: object): R;
    }
  }
}
