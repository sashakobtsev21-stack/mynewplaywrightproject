import { test, expect } from '../../../src/fixtures/playwright-fixtures';
import reportSchema from '../../../src/api/schemas/report.schema.json';

test.describe('contract: /report', () => {
  test('GET /report matches the Report schema', async ({ reportClient, adminToken }) => {
    const report = await reportClient.get(adminToken);
    expect(report).toMatchSchema(reportSchema);
  });

  test('GET /report/room/{id} matches the Report schema', async ({
    reportClient,
    roomClient,
    adminToken,
  }) => {
    const { rooms } = await roomClient.list();
    expect(rooms.length).toBeGreaterThan(0);
    const report = await reportClient.getByRoom(rooms[0].roomid, adminToken);
    expect(report).toMatchSchema(reportSchema);
  });
});
