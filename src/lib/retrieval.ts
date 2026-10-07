// SI SafeChat — retrieval: embed the question, cosine top-k via the vector
// store, hard threshold filter. Below-threshold => short-circuit, no LLM call.

import { embedTexts } from './embeddings';
import { NO_MATCH_MESSAGE, TOP_K } from './config';
import { vectorStore, type ScoredChunk } from './store';

export interface RetrievalResult {
  matches: ScoredChunk[];
  noMatch: boolean;
}

export async function retrieve(
  question: string,
  threshold: number,
  k: number = TOP_K,
): Promise<RetrievalResult> {
  const [qEmbedding] = await embedTexts([question]);
  const matches = await vectorStore.search(qEmbedding, k, threshold);
  // Orama already applies the similarity threshold; belt-and-braces filter here
  // keeps the guard correct even if the store implementation changes.
  const passing = matches.filter((m) => m.score > threshold);
  return { matches: passing, noMatch: passing.length === 0 };
}

export { NO_MATCH_MESSAGE };
