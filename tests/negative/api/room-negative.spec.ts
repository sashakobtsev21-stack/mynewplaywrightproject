import { test, expect } from '../../../src/fixtures/playwright-fixtures';
import { roomFactory } from '../../../src/fixtures/data-factory';
import { cookieHeader } from '../../../src/utils/api-helpers';
import { API } from '../../../src/config/constants';

test.describe('negative: /room', () => {
  test('POST without auth is rejected', async ({ request }) => {
    const res = await request.post(API.room, { data: roomFactory() });
    expect([401, 403]).toContain(res.status());
  });

  test('POST with an invalid payload returns 400', async ({ request, adminToken }) => {
    const res = await request.post(API.room, {
      data: { roomName: '', type: 'Single', roomPrice: -5 },
      headers: cookieHeader(adminToken),
    });
    expect(res.status()).toBe(400);
  });

  test('PUT without auth is rejected', async ({ request, roomClient }) => {
    const { rooms } = await roomClient.list();
    const res = await request.put(`${API.room}/${rooms[0].roomid}`, { data: roomFactory() });
    expect([401, 403]).toContain(res.status());
  });

  test('DELETE without auth is rejected', async ({ request, roomClient }) => {
    const { rooms } = await roomClient.list();
    const res = await request.delete(`${API.room}/${rooms[0].roomid}`);
    expect([401, 403]).toContain(res.status());
  });

  test('PUT to an unknown room id returns 404', async ({ request, adminToken }) => {
    const res = await request.put(`${API.room}/99999999`, {
      data: { roomid: 99999999, ...roomFactory() },
      headers: cookieHeader(adminToken),
    });
    expect(res.status()).toBe(404);
  });
});
