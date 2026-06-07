/**
 * Lexical retrieval (BM25) — a lightweight RAG retriever with no embeddings, no
 * vector DB, no API call. The test generator uses it to ground generation in the
 * existing specs most relevant to a requirement, instead of one static example.
 *
 * BM25 is the classic search-engine ranking. It's deterministic and unit-testable,
 * and a semantic retriever (embeddings) could replace `rankBm25` behind the same
 * shape later — the win here is the retrieve-then-ground pattern, not the scorer.
 */

// Small set of English function words. Code/test boilerplate (import, expect, …)
// doesn't need listing: it appears in every spec, so BM25's IDF already ignores it.
const STOPWORDS = new Set([
  'the',
  'and',
  'for',
  'can',
  'from',
  'with',
  'that',
  'this',
  'user',
  'should',
  'when',
  'then',
  'given',
  'but',
  'not',
  'are',
  'was',
  'its',
  'has',
  'have',
  'you',
  'your',
  'into',
  'out',
  'via',
  'per',
]);

/** Lowercase, split camelCase, drop punctuation, short tokens, and stopwords. */
export function tokenize(text: string): string[] {
  return text
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2') // bookingClient -> booking Client
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length >= 3 && !STOPWORDS.has(t));
}

export interface ScoredDoc<T> {
  doc: T;
  score: number;
}

/**
 * Rank `docs` by BM25 relevance to `query`, returning the top `topK` with a
 * positive score (so an unrelated query yields nothing). Pure and synchronous.
 */
export function rankBm25<T extends { text: string }>(
  query: string,
  docs: T[],
  topK = 3,
  k1 = 1.5,
  b = 0.75,
): ScoredDoc<T>[] {
  const queryTerms = [...new Set(tokenize(query))];
  if (queryTerms.length === 0 || docs.length === 0) return [];

  const docTokens = docs.map((d) => tokenize(d.text));
  const docLengths = docTokens.map((t) => t.length);
  const avgdl = docLengths.reduce((a, c) => a + c, 0) / docs.length || 1;
  const n = docs.length;

  const df = new Map<string, number>();
  for (const tokens of docTokens) {
    for (const t of new Set(tokens)) df.set(t, (df.get(t) ?? 0) + 1);
  }
  const idf = (t: string): number => {
    const d = df.get(t) ?? 0;
    return Math.log(1 + (n - d + 0.5) / (d + 0.5));
  };

  const scored = docs.map((doc, i): ScoredDoc<T> => {
    const tf = new Map<string, number>();
    for (const t of docTokens[i]) tf.set(t, (tf.get(t) ?? 0) + 1);
    const dl = docLengths[i];
    let score = 0;
    for (const qt of queryTerms) {
      const f = tf.get(qt) ?? 0;
      if (f === 0) continue;
      score += (idf(qt) * (f * (k1 + 1))) / (f + k1 * (1 - b + (b * dl) / avgdl));
    }
    return { doc, score: Number(score.toFixed(4)) };
  });

  return scored
    .filter((s) => s.score > 0)
    .sort((a, c) => c.score - a.score)
    .slice(0, topK);
}
