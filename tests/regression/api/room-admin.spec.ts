import { test, expect } from '../../../src/fixtures/playwright-fixtures';
import { roomFactory } from '../../../src/fixtures/data-factory';
import type { Room } from '../../../src/api/types/room.types';

/**
 * Admin room management against the live platform. Serial because the suite
 * creates one room and carries its id through read -> update -> delete; the
 * create endpoint returns only { success }, so the id is resolved by name.
 */
test.describe.serial('room admin CRUD', () => {
  const payload = roomFactory();
  let roomId: number;

  test('POST /room creates a room under the admin token', async ({ roomClient, adminToken }) => {
    const res = await roomClient.create(payload, adminToken);
    expect(res.success).toBe(true);
  });

  test('created room appears in the list with the submitted fields', async ({ roomClient }) => {
    const room = await roomClient.findByName(payload.roomName);
    expect(room, `room "${payload.roomName}" should be listed`).toBeDefined();
    roomId = (room as Room).roomid;
    expect(room).toMatchObject({
      roomName: payload.roomName,
      type: payload.type,
      roomPrice: payload.roomPrice,
    });
  });

  test('GET /room/{id} returns the created room', async ({ roomClient }) => {
    const room = await roomClient.getById(roomId);
    expect(room.roomid).toBe(roomId);
    expect(room.roomName).toBe(payload.roomName);
  });

  test('PUT /room/{id} updates price and type', async ({ roomClient, adminToken }) => {
    const updated = await roomClient.update(
      roomId,
      { ...payload, type: 'Suite', roomPrice: payload.roomPrice + 25 },
      adminToken,
    );
    expect(updated.roomid).toBe(roomId);
    expect(updated.type).toBe('Suite');
    expect(updated.roomPrice).toBe(payload.roomPrice + 25);
  });

  test('DELETE /room/{id} removes the room', async ({ roomClient, adminToken }) => {
    await roomClient.delete(roomId, adminToken);
    const gone = await roomClient.findByName(payload.roomName);
    expect(gone).toBeUndefined();
  });
});
