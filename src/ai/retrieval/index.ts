import { env } from '../../config/env';
import { rankBm25, type ScoredDoc } from './bm25';
import type { Retriever, RetrievalDoc } from './types';
import { EmbeddingsRetriever } from './embeddings';

/** The default retriever: lexical BM25, wrapped to the async Retriever shape. */
class Bm25Retriever implements Retriever {
  readonly name = 'bm25';
  rank(query: string, docs: RetrievalDoc[], topK: number): Promise<ScoredDoc<RetrievalDoc>[]> {
    return Promise.resolve(rankBm25(query, docs, topK));
  }
}

/** The configured retriever, chosen by `RETRIEVER` (defaults to lexical BM25). */
export function getRetriever(): Retriever {
  return env.RETRIEVER === 'embeddings' ? new EmbeddingsRetriever() : new Bm25Retriever();
}

export { rankBm25, tokenize, type ScoredDoc } from './bm25';
export { cosineSim, EmbeddingsRetriever } from './embeddings';
export type { Retriever, RetrievalDoc } from './types';
