// SI SafeChat — document ingest. All parsing happens in-memory on the main
// thread; nothing is uploaded anywhere. Privacy: LOCAL mode.

import JSZip from 'jszip';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import mammoth from 'mammoth';
import { Readability } from '@mozilla/readability';
import {
  CHUNK_OVERLAP,
  CHUNK_SIZE,
  MAX_FILE_BYTES,
  MAX_TOTAL_BYTES,
  MAX_ZIP_ENTRIES,
  SUPPORTED_EXTENSIONS,
} from './config';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

export type SourceKind = 'txt' | 'md' | 'pdf' | 'docx' | 'zip' | 'url' | 'paste';

export interface ParsedDoc {
  sourceId: string;
  sourceName: string;
  kind: SourceKind;
  /** One entry per page/section; txt/md/paste produce a single entry. */
  texts: string[];
  charCount: number;
}

export interface Chunk {
  id: string;
  sourceId: string;
  sourceName: string;
  page: number; // 1-based page/section index within the source
  ordinal: number; // chunk index within the source
  text: string;
  embedding?: number[];
}

export class IngestError extends Error {
  sourceName: string;
  constructor(sourceName: string, message: string) {
    super(message);
    this.name = 'IngestError';
    this.sourceName = sourceName;
  }
}

let sourceSeq = 0;
function newSourceId(): string {
  sourceSeq += 1;
  return `src-${Date.now().toString(36)}-${sourceSeq}`;
}

export function normalizeText(raw: string): string {
  return raw
    .replace(/\r\n?/g, '\n')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function extOf(name: string): string {
  const m = /\.([a-z0-9]+)$/i.exec(name.trim());
  return (m?.[1] ?? '').toLowerCase();
}

/** Sentence-aware chunking: ~CHUNK_SIZE windows with CHUNK_OVERLAP overlap. */
export function chunkText(text: string): string[] {
  const clean = normalizeText(text);
  if (!clean) return [];
  if (clean.length <= CHUNK_SIZE) return [clean];

  // Split on sentence boundaries, keeping the delimiter.
  const sentences = clean.match(/[^.!?\n]+[.!?]+["'”’)]?|\n+|[^\n]+/g) ?? [clean];
  const chunks: string[] = [];
  let current = '';

  for (const s of sentences) {
    const piece = s.trim();
    if (!piece) continue;
    if ((current + ' ' + piece).trim().length > CHUNK_SIZE && current) {
      chunks.push(current.trim());
      // Overlap: carry the tail of the previous chunk forward.
      const tail = current.slice(-CHUNK_OVERLAP);
      const cut = Math.max(tail.search(/[.!?]\s/), tail.search(/\n/));
      current = (cut >= 0 ? tail.slice(cut + 1) : tail) + ' ' + piece;
    } else {
      current = current ? current + ' ' + piece : piece;
    }
  }
  if (current.trim()) chunks.push(current.trim());
  return chunks.filter((c) => c.length > 0);
}

export function chunksFromParsed(doc: ParsedDoc): Chunk[] {
  const chunks: Chunk[] = [];
  let ordinal = 0;
  doc.texts.forEach((pageText, pageIdx) => {
    for (const text of chunkText(pageText)) {
      chunks.push({
        id: `${doc.sourceId}:c${ordinal}`,
        sourceId: doc.sourceId,
        sourceName: doc.sourceName,
        page: pageIdx + 1,
        ordinal,
        text,
      });
      ordinal += 1;
    }
  });
  return chunks;
}

async function parsePdf(file: File): Promise<string[]> {
  const buf = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: buf }).promise;
  const texts: string[] = [];
  for (let p = 1; p <= pdf.numPages; p++) {
    const page = await pdf.getPage(p);
    const content = await page.getTextContent();
    const str = content.items
      .map((it) => ('str' in it ? (it.str as string) : ''))
      .join(' ');
    texts.push(str);
  }
  return texts;
}

async function parseDocx(file: File): Promise<string[]> {
  const buf = await file.arrayBuffer();
  const result = await mammoth.extractRawText({ arrayBuffer: buf });
  return [result.value];
}

async function parseZip(file: File, depth = 0): Promise<ParsedDoc[]> {
  if (depth > 2) {
    throw new IngestError(file.name, 'Zip nesting too deep (max 2 levels).');
  }
  const zip = await JSZip.loadAsync(file);
  const entries = Object.values(zip.files).filter((f) => !f.dir);
  if (entries.length > MAX_ZIP_ENTRIES) {
    throw new IngestError(
      file.name,
      `Zip has ${entries.length} files (max ${MAX_ZIP_ENTRIES}).`,
    );
  }
  const docs: ParsedDoc[] = [];
  for (const entry of entries) {
    const ext = extOf(entry.name);
    if (!(SUPPORTED_EXTENSIONS as readonly string[]).includes(ext) || ext === 'zip') {
      if (ext === 'zip' && depth < 2) {
        const blob = await entry.async('blob');
        const nested = new File([blob], entry.name, { type: 'application/zip' });
        docs.push(...(await parseZip(nested, depth + 1)));
      }
      continue; // skip unsupported types silently
    }
    const blob = await entry.async('blob');
    const inner = new File([blob], entry.name.split('/').pop() ?? entry.name);
    try {
      docs.push(await parseSingleFile(inner));
    } catch (e) {
      // One bad file inside a zip must not kill the whole import.
      console.warn(`Skipping ${entry.name}:`, e);
    }
  }
  if (docs.length === 0) {
    throw new IngestError(file.name, 'No supported documents found in zip.');
  }
  return docs;
}

async function parseSingleFile(file: File): Promise<ParsedDoc> {
  const ext = extOf(file.name);
  const sourceId = newSourceId();
  let texts: string[];
  let kind: SourceKind;

  if (ext === 'txt' || ext === 'md') {
    kind = ext;
    texts = [await file.text()];
  } else if (ext === 'pdf') {
    kind = 'pdf';
    texts = await parsePdf(file);
  } else if (ext === 'docx') {
    kind = 'docx';
    texts = await parseDocx(file);
  } else {
    throw new IngestError(file.name, `Unsupported file type ".${ext}".`);
  }

  const joined = normalizeText(texts.join('\n\n'));
  if (!joined) {
    throw new IngestError(file.name, 'No extractable text found.');
  }
  return {
    sourceId,
    sourceName: file.name,
    kind,
    texts,
    charCount: joined.length,
  };
}

/** Parse one or more dropped/selected files (zip expands to many docs). */
export async function parseFiles(
  files: File[],
  alreadyIndexedBytes: number,
): Promise<ParsedDoc[]> {
  const docs: ParsedDoc[] = [];
  let totalBytes = alreadyIndexedBytes;
  for (const file of files) {
    if (file.size > MAX_FILE_BYTES) {
      throw new IngestError(
        file.name,
        `File is ${(file.size / 1048576).toFixed(1)} MB (max ${MAX_FILE_BYTES / 1048576} MB).`,
      );
    }
    totalBytes += file.size;
    if (totalBytes > MAX_TOTAL_BYTES) {
      throw new IngestError(
        file.name,
        `Knowledge base would exceed ${MAX_TOTAL_BYTES / 1048576} MB total.`,
      );
    }
    const ext = extOf(file.name);
    if (ext === 'zip') {
      docs.push(...(await parseZip(file)));
    } else {
      docs.push(await parseSingleFile(file));
    }
  }
  return docs;
}

/** Fetch a URL directly (works for CORS-enabled sites) and extract article text. */
export async function parseUrl(rawUrl: string): Promise<ParsedDoc> {
  let url: URL;
  try {
    url = new URL(rawUrl.trim());
  } catch {
    throw new IngestError(rawUrl, 'Not a valid URL.');
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') {
    throw new IngestError(rawUrl, 'Only http(s) URLs are supported.');
  }
  let html: string;
  try {
    const res = await fetch(url.toString());
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    html = await res.text();
  } catch (e) {
    throw new IngestError(
      url.hostname,
      `Could not fetch this page directly (likely blocked by CORS). Paste the article text instead — SI SafeChat never routes your content through a proxy.`,
    );
  }
  const dom = new DOMParser().parseFromString(html, 'text/html');
  const article = new Readability(dom).parse();
  const text = normalizeText(
    [article?.title ?? '', article?.textContent ?? ''].join('\n\n'),
  );
  if (!text || text.length < 200) {
    throw new IngestError(
      url.hostname,
      'No readable article text found. Paste the content instead.',
    );
  }
  return {
    sourceId: newSourceId(),
    sourceName: url.hostname + url.pathname,
    kind: 'url',
    texts: [text],
    charCount: text.length,
  };
}

/** Paste raw text/HTML directly (the privacy-safe fallback for blocked URLs). */
export async function parsePasted(raw: string): Promise<ParsedDoc> {
  const trimmed = raw.trim();
  if (!trimmed) throw new IngestError('pasted text', 'Nothing to import.');
  let text = trimmed;
  if (/^\s*</.test(trimmed)) {
    // Looks like HTML — strip tags via DOMParser.
    const dom = new DOMParser().parseFromString(trimmed, 'text/html');
    text = dom.body.textContent ?? '';
  }
  const clean = normalizeText(text);
  if (clean.length < 50) {
    throw new IngestError('pasted text', 'Pasted content is too short.');
  }
  return {
    sourceId: newSourceId(),
    sourceName: `pasted text (${new Date().toLocaleString()})`,
    kind: 'paste',
    texts: [clean],
    charCount: clean.length,
  };
}
