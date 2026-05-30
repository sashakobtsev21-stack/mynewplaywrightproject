import { test, expect } from '../../../src/fixtures/playwright-fixtures';
import { messageFactory } from '../../../src/fixtures/data-factory';
import messageListSchema from '../../../src/api/schemas/message-list.schema.json';
import messageSchema from '../../../src/api/schemas/message.schema.json';

test.describe('contract: /message', () => {
  test('GET /message matches the MessageList schema', async ({ messageClient }) => {
    const list = await messageClient.list();
    expect(list).toMatchSchema(messageListSchema);
  });

  test('GET /message/{id} matches the MessageDetail schema', async ({ messageClient }) => {
    const payload = messageFactory();
    await messageClient.create(payload);
    const id = await messageClient.idBySubject(payload.subject);

    const detail = await messageClient.getById(id);
    expect(detail).toMatchSchema(messageSchema);
  });
});
