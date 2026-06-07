import { test, expect } from '@playwright/test';
import { tokenize, rankBm25 } from '../../src/ai/retrieval/bm25';

const docs = [
  { id: 'rooms', text: 'admin room create rooms management listing page' },
  { id: 'booking', text: 'booking cancel reservation guest checkout dates' },
  { id: 'message', text: 'contact message inbox mark read delete' },
];

test.describe('tokenize', () => {
  test('splits camelCase identifiers and lowercases', () => {
    expect(tokenize('bookingClient.createRoom')).toEqual(['booking', 'client', 'create', 'room']);
  });

  test('drops stopwords and short tokens', () => {
    expect(tokenize('the AND a to of')).toEqual([]);
    expect(tokenize('Admin')).toEqual(['admin']);
  });
});

test.describe('rankBm25', () => {
  test('ranks the most relevant doc first', () => {
    const top = rankBm25('cancel booking reservation', docs, 3);
    expect(top[0].doc.id).toBe('booking');
    expect(top[0].score).toBeGreaterThan(0);
  });

  test('matches by content for a different query', () => {
    expect(rankBm25('room create management', docs, 3)[0].doc.id).toBe('rooms');
    expect(rankBm25('inbox message read', docs, 3)[0].doc.id).toBe('message');
  });

  test('returns nothing for an empty or unmatched query', () => {
    expect(rankBm25('', docs, 3)).toEqual([]);
    expect(rankBm25('xylophone quantum nonsense', docs, 3)).toEqual([]);
  });

  test('respects topK', () => {
    // "admin" hits the rooms doc, "guest" hits the booking doc.
    expect(rankBm25('admin guest', docs, 1)).toHaveLength(1);
    expect(rankBm25('admin guest', docs, 5)).toHaveLength(2);
  });
});
