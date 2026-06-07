import type { ScoredDoc } from './bm25';

/** A document the retriever ranks: an id (e.g. a file path) and its text. */
export interface RetrievalDoc {
  id: string;
  text: string;
}

/**
 * A retriever ranks docs by relevance to a query. Async so a semantic
 * (embeddings) implementation fits the same shape as the lexical (BM25) one — the
 * test generator depends on this interface, not on a particular scorer.
 */
export interface Retriever {
  readonly name: string;
  rank(query: string, docs: RetrievalDoc[], topK: number): Promise<ScoredDoc<RetrievalDoc>[]>;
}
