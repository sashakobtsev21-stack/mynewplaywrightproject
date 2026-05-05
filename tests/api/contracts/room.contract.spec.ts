import { test, expect } from '../../../src/fixtures/playwright-fixtures';
import { validateSchema } from '../../../src/utils/schema-validator';
import roomSchema from '../../../src/api/schemas/room.schema.json';
import roomListSchema from '../../../src/api/schemas/room-list.schema.json';

// This spec predates the custom toMatchSchema matcher — kept the original
// validateSchema-based style on purpose, it's explicit about what failed.

test.describe('contract: /room', () => {
  test('GET /room matches RoomList schema', async ({ roomClient }) => {
    const list = await roomClient.list();
    const result = validateSchema(list, roomListSchema);
    expect(result.ok, result.errors).toBe(true);
  });

  test('GET /room/{id} matches Room schema', async ({ roomClient }) => {
    const { rooms } = await roomClient.list();
    expect(rooms.length).toBeGreaterThan(0);
    const single = await roomClient.getById(rooms[0].roomid);
    const result = validateSchema(single, roomSchema);
    expect(result.ok, result.errors).toBe(true);
  });
});
