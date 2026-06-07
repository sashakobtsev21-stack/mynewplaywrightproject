import { env } from '../../config/env';
import type { ScoredDoc } from './bm25';
import type { Retriever, RetrievalDoc } from './types';

/**
 * Semantic retrieval: embed the query and the docs, rank by cosine similarity.
 * A drop-in for the BM25 retriever behind the same `Retriever` interface, opt-in
 * via `RETRIEVER=embeddings`. Uses any OpenAI-compatible `/embeddings` endpoint
 * (OpenAI, a local Ollama with `nomic-embed-text`, ...) over `fetch` — no SDK.
 */

type FetchFn = (input: string | URL | Request, init?: RequestInit) => Promise<Response>;

/** Cosine similarity of two vectors. Pure — unit-tested. */
export function cosineSim(a: number[], b: number[]): number {
  const len = Math.min(a.length, b.length);
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < len; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  if (na === 0 || nb === 0) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

interface EmbeddingsConfig {
  baseUrl: string;
  apiKey?: string;
  model: string;
}

interface EmbeddingsResponse {
  data?: { embedding: number[] }[];
}

export class EmbeddingsRetriever implements Retriever {
  readonly name = 'embeddings';
  private readonly cfg: EmbeddingsConfig;
  private readonly fetchImpl: FetchFn;

  constructor(cfg?: Partial<EmbeddingsConfig>, fetchImpl: FetchFn = globalThis.fetch) {
    this.cfg = {
      baseUrl: (cfg?.baseUrl ?? env.OPENAI_BASE_URL).replace(/\/+$/, ''),
      apiKey: cfg?.apiKey ?? env.OPENAI_API_KEY,
      model: cfg?.model ?? env.EMBEDDINGS_MODEL,
    };
    this.fetchImpl = fetchImpl;
  }

  async rank(
    query: string,
    docs: RetrievalDoc[],
    topK: number,
  ): Promise<ScoredDoc<RetrievalDoc>[]> {
    if (docs.length === 0) return [];
    const [queryVec, ...docVecs] = await this.embed([query, ...docs.map((d) => d.text)]);
    if (!queryVec) return [];
    return docs
      .map(
        (doc, i): ScoredDoc<RetrievalDoc> => ({
          doc,
          score: Number(cosineSim(queryVec, docVecs[i] ?? []).toFixed(4)),
        }),
      )
      .filter((s) => s.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, topK);
  }

  private async embed(inputs: string[]): Promise<number[][]> {
    const headers: Record<string, string> = { 'content-type': 'application/json' };
    if (this.cfg.apiKey) headers.authorization = `Bearer ${this.cfg.apiKey}`;
    const res = await this.fetchImpl(`${this.cfg.baseUrl}/embeddings`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ model: this.cfg.model, input: inputs }),
    });
    if (!res.ok) throw new Error(`embeddings HTTP ${res.status}`);
    const data = (await res.json()) as EmbeddingsResponse;
    return (data.data ?? []).map((d) => d.embedding);
  }
}
