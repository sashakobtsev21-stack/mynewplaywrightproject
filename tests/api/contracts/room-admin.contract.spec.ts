import { test, expect } from '../../../src/fixtures/playwright-fixtures';
import { roomFactory } from '../../../src/fixtures/data-factory';
import roomSchema from '../../../src/api/schemas/room.schema.json';

test.describe('contract: created room', () => {
  test('a room created via POST round-trips and matches the Room schema', async ({
    roomClient,
    adminToken,
  }) => {
    const payload = roomFactory();
    await roomClient.create(payload, adminToken);
    const roomId = await roomClient.idByName(payload.roomName);

    const fetched = await roomClient.getById(roomId);
    expect(fetched).toMatchSchema(roomSchema);

    // Keep the demo tidy: remove the room we created for this check.
    await roomClient.delete(roomId, adminToken);
  });
});
