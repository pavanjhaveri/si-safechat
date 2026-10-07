// SI SafeChat — vector store. Orama (vector index) behind a small adapter
// interface, so the engine can be swapped without touching the rest of the
// app. Chunks + embeddings persist in IndexedDB (via idb); the Orama index
// is rebuilt in memory on startup.

import { create, insertMultiple, search, type AnyOrama } from '@orama/orama';
import { openDB, type IDBPDatabase } from 'idb';
import type { Chunk } from './ingest';
import {
  EMBEDDING_DIMS,
  EMBEDDING_MODEL,
  KB_CHUNKS_KEY,
  KB_EXPORT_VERSION,
  KB_IDB_NAME,
  KB_IDB_STORE,
  KB_META_KEY,
  TOP_K,
} from './config';

export interface ScoredChunk {
  chunk: Chunk;
  score: number; // cosine similarity, 0..1
}

export interface VectorStore {
  addChunks(chunks: Chunk[]): Promise<void>;
  search(embedding: number[], k: number, threshold: number): Promise<ScoredChunk[]>;
  count(): Promise<number>;
  allChunks(): Promise<Chunk[]>;
  clear(): Promise<void>;
}

type OramaSchema = {
  id: 'string';
  text: 'string';
  sourceId: 'string';
  sourceName: 'string';
  page: 'number';
  ordinal: 'number';
  embedding: `vector[${number}]`;
};

export class OramaVectorStore implements VectorStore {
  private db: AnyOrama | null = null;
  private idb: Promise<IDBPDatabase> | null = null;

  private getIdb(): Promise<IDBPDatabase> {
    if (!this.idb) {
      this.idb = openDB(KB_IDB_NAME, 1, {
        upgrade(db) {
          db.createObjectStore(KB_IDB_STORE);
        },
      });
    }
    return this.idb;
  }

  private async ensureDb(): Promise<AnyOrama> {
    if (!this.db) {
      this.db = (await create({
        schema: {
          id: 'string',
          text: 'string',
          sourceId: 'string',
          sourceName: 'string',
          page: 'number',
          ordinal: 'number',
          embedding: `vector[${EMBEDDING_DIMS}]` as `vector[${number}]`,
        } satisfies OramaSchema,
      })) as unknown as AnyOrama;
    }
    return this.db;
  }

  /** Load persisted chunks from IndexedDB and rebuild the in-memory index. */
  async load(): Promise<number> {
    const db = await this.getIdb();
    const chunks = (await db.get(KB_IDB_STORE, KB_CHUNKS_KEY)) as Chunk[] | undefined;
    if (!chunks || chunks.length === 0) return 0;
    await this.ensureDb();
    await this.insertIntoOrama(chunks);
    return chunks.length;
  }

  private async insertIntoOrama(chunks: Chunk[]): Promise<void> {
    const db = await this.ensureDb();
    await insertMultiple(
      db,
      chunks.map((c) => ({
        id: c.id,
        text: c.text,
        sourceId: c.sourceId,
        sourceName: c.sourceName,
        page: c.page,
        ordinal: c.ordinal,
        embedding: c.embedding ?? [],
      })),
    );
  }

  private async persist(chunks: Chunk[]): Promise<void> {
    const db = await this.getIdb();
    const existing = ((await db.get(KB_IDB_STORE, KB_CHUNKS_KEY)) as Chunk[] | undefined) ?? [];
    await db.put(KB_IDB_STORE, [...existing, ...chunks], KB_CHUNKS_KEY);
    await db.put(
      KB_IDB_STORE,
      { version: KB_EXPORT_VERSION, embeddingModel: EMBEDDING_MODEL, updatedAt: Date.now() },
      KB_META_KEY,
    );
  }

  async addChunks(chunks: Chunk[]): Promise<void> {
    if (chunks.length === 0) return;
    await this.insertIntoOrama(chunks);
    await this.persist(chunks);
  }

  async search(embedding: number[], k: number, threshold: number): Promise<ScoredChunk[]> {
    const db = await this.ensureDb();
    const results = await search(db, {
      mode: 'vector',
      vector: { value: embedding, property: 'embedding' },
      similarity: threshold,
      limit: k,
    });
    return results.hits.map((h) => ({
      chunk: {
        id: h.document.id as string,
        sourceId: h.document.sourceId as string,
        sourceName: h.document.sourceName as string,
        page: h.document.page as number,
        ordinal: h.document.ordinal as number,
        text: h.document.text as string,
      },
      score: h.score,
    }));
  }

  async count(): Promise<number> {
    const db = await this.getIdb();
    const chunks = ((await db.get(KB_IDB_STORE, KB_CHUNKS_KEY)) as Chunk[] | undefined) ?? [];
    return chunks.length;
  }

  async allChunks(): Promise<Chunk[]> {
    const db = await this.getIdb();
    return ((await db.get(KB_IDB_STORE, KB_CHUNKS_KEY)) as Chunk[] | undefined) ?? [];
  }

  async clear(): Promise<void> {
    const db = await this.getIdb();
    await db.put(KB_IDB_STORE, [], KB_CHUNKS_KEY);
    this.db = null;
  }

  async getMeta(): Promise<{ embeddingModel: string; version: number } | null> {
    const db = await this.getIdb();
    return (await db.get(KB_IDB_STORE, KB_META_KEY)) ?? null;
  }
}

/** Replace the persisted KB wholesale (used by Import). */
export async function replacePersistedChunks(chunks: Chunk[]): Promise<void> {
  const idb = await openDB(KB_IDB_NAME, 1);
  await idb.put(KB_IDB_STORE, chunks, KB_CHUNKS_KEY);
  await idb.put(
    KB_IDB_STORE,
    { version: KB_EXPORT_VERSION, embeddingModel: EMBEDDING_MODEL, updatedAt: Date.now() },
    KB_META_KEY,
  );
}

// Singleton for the single-KB MVP.
export const vectorStore = new OramaVectorStore();
export { TOP_K };
