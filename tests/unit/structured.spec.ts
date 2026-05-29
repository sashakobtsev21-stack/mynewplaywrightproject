import { test, expect } from '@playwright/test';
import { parseRecords, recoverJsonArray, stripFences } from '../../src/ai/structured';
import { guestRecordStrict, guestRecordLoose } from '../../src/ai/schemas';

const guest = (email: string) =>
  `{"firstname":"Ada","lastname":"Lovelace","email":"${email}","phone":"12345678"}`;

test.describe('structured parsing', () => {
  test('strips code fences', () => {
    expect(stripFences('```json\n[1,2]\n```')).toBe('[1,2]');
  });

  test('parses a clean array against the strict schema', () => {
    const { records, usedLoose } = parseRecords(
      `[${guest('ada@example.com')}]`,
      guestRecordStrict,
      guestRecordLoose,
    );
    expect(records).toHaveLength(1);
    expect(usedLoose).toBe(false);
  });

  test('falls back to the loose schema on imperfect data', () => {
    const { records, usedLoose } = parseRecords(
      `[${guest('not-an-email')}]`,
      guestRecordStrict,
      guestRecordLoose,
    );
    expect(records).toHaveLength(1);
    expect(usedLoose).toBe(true);
  });

  test('recovers a truncated array to its last complete element', () => {
    const truncated = `[${guest('ada@example.com')},{"firstname":"Grace","lastname":"Hop`;
    const recovered = recoverJsonArray(truncated);
    expect(JSON.parse(recovered)).toHaveLength(1);
  });

  test('throws when neither schema matches', () => {
    expect(() => parseRecords('[{"nope":1}]', guestRecordStrict, guestRecordLoose)).toThrow(
      /failed strict and loose/,
    );
  });
});
