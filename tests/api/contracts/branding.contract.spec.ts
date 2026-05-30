import { test, expect } from '../../../src/fixtures/playwright-fixtures';
import brandingSchema from '../../../src/api/schemas/branding.schema.json';

test.describe('contract: /branding', () => {
  test('GET /branding matches the Branding schema', async ({ brandingClient }) => {
    const branding = await brandingClient.get();
    expect(branding).toMatchSchema(brandingSchema);
  });
});
