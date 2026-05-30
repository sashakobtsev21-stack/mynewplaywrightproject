import { test, expect } from '../../../src/fixtures/playwright-fixtures';
import { messageFactory } from '../../../src/fixtures/data-factory';

test.describe('contact messages API', () => {
  test('POST /message accepts a contact message', async ({ messageClient }) => {
    const res = await messageClient.create(messageFactory());
    expect(res.success).toBe(true);
  });

  test('a created message surfaces in the inbox by subject', async ({ messageClient }) => {
    const payload = messageFactory();
    await messageClient.create(payload);

    const { messages } = await messageClient.list();
    const mine = messages.find((m) => m.subject === payload.subject);
    expect(mine, `message "${payload.subject}" should be listed`).toBeDefined();
    expect(mine?.name).toBe(payload.name);
    expect(mine?.read).toBe(false);
  });

  test('GET /message/count returns a non-negative integer', async ({ messageClient }) => {
    const { count } = await messageClient.count();
    expect(Number.isInteger(count)).toBe(true);
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test('GET /message/{id} returns the full message body', async ({ messageClient }) => {
    const payload = messageFactory();
    await messageClient.create(payload);
    const id = await messageClient.idBySubject(payload.subject);

    const detail = await messageClient.getById(id);
    expect(detail.messageid).toBe(id);
    expect(detail.email).toBe(payload.email);
    expect(detail.description).toBe(payload.description);
  });

  test('a message can be marked read and then deleted', async ({ messageClient, adminToken }) => {
    const payload = messageFactory();
    await messageClient.create(payload);
    const id = await messageClient.idBySubject(payload.subject);

    await messageClient.markRead(id, adminToken);
    await messageClient.delete(id, adminToken);

    const stillThere = (await messageClient.list()).messages.some((m) => m.id === id);
    expect(stillThere).toBe(false);
  });
});
