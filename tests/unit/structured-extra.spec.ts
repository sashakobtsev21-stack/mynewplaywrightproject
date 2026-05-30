import { test, expect } from '@playwright/test';
import { parseRecords, recoverJsonArray, stripFences } from '../../src/ai/structured';
import { bookingRecordStrict, bookingRecordLoose } from '../../src/ai/schemas';

test.describe('recoverJsonArray', () => {
  test('recovers a truncated array to its last complete nested element', () => {
    const text = '[{"a":{"b":1}},{"a":{"b":2}},{"a":{"b":';
    const recovered = recoverJsonArray(text);
    expect(JSON.parse(recovered)).toEqual([{ a: { b: 1 } }, { a: { b: 2 } }]);
  });

  test('does not miscount brackets that appear inside strings', () => {
    const text = '[{"note":"a ] and a } inside"},{"note":"second"';
    const recovered = recoverJsonArray(text);
    expect(JSON.parse(recovered)).toEqual([{ note: 'a ] and a } inside' }]);
  });

  test('returns a cleanly-closed array unchanged', () => {
    const text = '[{"x":1},{"x":2}]';
    expect(JSON.parse(recoverJsonArray(text))).toHaveLength(2);
  });

  test('throws when there is no array start', () => {
    expect(() => recoverJsonArray('just text, no array')).toThrow(/no JSON array start/);
  });

  test('throws when not even one element is complete', () => {
    expect(() => recoverJsonArray('[{"x":')).toThrow(/no complete element/);
  });
});

test.describe('stripFences', () => {
  test('leaves un-fenced text untouched', () => {
    expect(stripFences('[1,2,3]')).toBe('[1,2,3]');
  });

  test('strips a bare fence without a language tag', () => {
    expect(stripFences('```\n[1]\n```')).toBe('[1]');
  });
});

test.describe('parseRecords with booking schema', () => {
  const booking = (over: Record<string, unknown> = {}) =>
    JSON.stringify({
      roomid: 1,
      firstname: 'Ada',
      lastname: 'Lovelace',
      email: 'ada@example.com',
      phone: '0123456789',
      depositpaid: true,
      bookingdates: { checkin: '2027-01-01', checkout: '2027-01-03' },
      ...over,
    });

  test('recovers a truncated booking array to its complete elements', () => {
    const truncated = `[${booking()},${booking({ firstname: 'Grace' })},{"roomid":1,"firstname":"Cut`;
    const { records } = parseRecords(truncated, bookingRecordStrict, bookingRecordLoose);
    expect(records).toHaveLength(2);
  });

  test('falls back to the loose schema for a coercible roomid', () => {
    const { usedLoose } = parseRecords(
      `[${booking({ roomid: '2' })}]`,
      bookingRecordStrict,
      bookingRecordLoose,
    );
    expect(usedLoose).toBe(true);
  });
});
