import { test, expect } from '../../../src/fixtures/playwright-fixtures';

test.describe('branding API', () => {
  test('GET /branding exposes hotel name, contact and address', async ({ brandingClient }) => {
    const branding = await brandingClient.get();
    expect(branding.name.length).toBeGreaterThan(0);
    expect(branding.description.length).toBeGreaterThan(0);
    expect(branding.contact.email).toContain('@');
    expect(branding.address.postCode.length).toBeGreaterThan(0);
  });

  test('GET /branding returns numeric map coordinates', async ({ brandingClient }) => {
    const { map } = await brandingClient.get();
    expect(typeof map.latitude).toBe('number');
    expect(typeof map.longitude).toBe('number');
    expect(Number.isFinite(map.latitude)).toBe(true);
    expect(Number.isFinite(map.longitude)).toBe(true);
  });
});
