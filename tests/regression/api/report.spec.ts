import { test, expect } from '../../../src/fixtures/playwright-fixtures';

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

test.describe('occupancy report API', () => {
  test('GET /report returns dated occupancy entries', async ({ reportClient, adminToken }) => {
    const { report } = await reportClient.get(adminToken);
    expect(Array.isArray(report)).toBe(true);
    for (const entry of report.slice(0, 5)) {
      expect(entry.start).toMatch(ISO_DATE);
      expect(entry.end).toMatch(ISO_DATE);
      expect(typeof entry.title).toBe('string');
    }
  });

  test('GET /report/room/{id} returns entries for a single room', async ({
    reportClient,
    roomClient,
    adminToken,
  }) => {
    const { rooms } = await roomClient.list();
    expect(rooms.length).toBeGreaterThan(0);

    const { report } = await reportClient.getByRoom(rooms[0].roomid, adminToken);
    expect(Array.isArray(report)).toBe(true);
    for (const entry of report.slice(0, 5)) {
      expect(entry.start).toMatch(ISO_DATE);
      expect(entry.end).toMatch(ISO_DATE);
    }
  });
});
