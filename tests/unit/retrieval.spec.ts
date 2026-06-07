import { test, expect } from '@playwright/test';
import {
  tokenize,
  rankBm25,
  cosineSim,
  EmbeddingsRetriever,
  getRetriever,
} from '../../src/ai/retrieval';

const embRes = (vectors: number[][]): Response =>
  ({
    ok: true,
    status: 200,
    json: async () => ({ data: vectors.map((embedding) => ({ embedding })) }),
  }) as unknown as Response;

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

test.describe('cosineSim', () => {
  test('1 for identical vectors, 0 for orthogonal or zero', () => {
    expect(cosineSim([1, 2, 3], [1, 2, 3])).toBeCloseTo(1, 6);
    expect(cosineSim([1, 0], [0, 1])).toBe(0);
    expect(cosineSim([0, 0], [1, 1])).toBe(0);
  });
});

test.describe('EmbeddingsRetriever', () => {
  test('ranks docs by cosine similarity to the query', async () => {
    // query -> [1,0]; doc a -> [1,0] (match); doc b -> [0.6,0.8] (weaker).
    const fetchFake = (async () =>
      embRes([
        [1, 0],
        [1, 0],
        [0.6, 0.8],
      ])) as unknown as typeof fetch;
    const r = new EmbeddingsRetriever({ baseUrl: 'http://x', apiKey: 'k', model: 'm' }, fetchFake);
    const ranked = await r.rank(
      'q',
      [
        { id: 'a', text: 'a' },
        { id: 'b', text: 'b' },
      ],
      2,
    );
    expect(ranked[0].doc.id).toBe('a');
    expect(ranked[0].score).toBeGreaterThan(ranked[1].score);
  });
});

test.describe('getRetriever', () => {
  test('defaults to lexical BM25', () => {
    expect(getRetriever().name).toBe('bm25');
  });
});
