# Sample: SI SafeChat guide

> Demo snapshot for trying SI SafeChat — ask the chatbot about itself. Written for this demo · October 2026.

## What is SI SafeChat?

SI SafeChat is a 100% serverless, privacy-first chatbot that answers questions only from the documents you give it. It is a static web app: parsing, embeddings, search, and the AI itself all run inside your browser. There is no backend, no database service, and no account.

## How does it work?

Three steps. First, you drop in documents — PDF, Word, text, Markdown, zip archives, web pages, or pasted text — and everything is parsed in memory on your device. Second, your question is turned into a vector and matched against your content with cosine similarity, right in the browser. Third, an on-device AI answers strictly from the matched chunks, with citations. If nothing matches, it says so instead of hallucinating.

## What are the privacy modes?

The badge in the chat header always shows the current mode. LOCAL means everything runs on the device — parse, embed, retrieve, generate — and zero document content ever leaves the browser. NETWORK appears only while you fetch a web page, which contacts that site directly; there is no proxy, and parsing, embeddings, and chat stay on-device regardless.

## What AI models does it use?

Document understanding uses the all-MiniLM-L6-v2 embedding model (384 dimensions), running in a Web Worker. Chat uses Llama 3.2 1B Instruct through WebGPU via the MLC web-llm runtime. Both are set up on-device with a one-time setup step, then cached in the browser.

## How is content chunked and retrieved?

Documents are split into 500-character chunks with 100 characters of overlap, split at sentence boundaries. Retrieval takes the top 5 chunks by cosine similarity, and only chunks scoring above a 0.65 similarity threshold are used — anything below that produces a "no matching information found" response instead of a guess.

## What are the honest limits?

Chat needs WebGPU, so desktop Chrome or Edge is the sweet spot. The first-time chatbot setup is a one-time step of about 1GB, so WiFi is recommended. Retrieval, evaluation, and export all work without the chat model. The app is built for focused collections of tens of megabytes, not the whole internet.

## What does the Eval tab do?

The Eval tab runs a built-in question set through embed-and-retrieve (no chat model needed) and reports per-question top similarity scores and pass/fail against the threshold. It is the tool for tuning the similarity threshold with evidence instead of guessing.

## Can I back up my knowledge base?

Yes. The Sources tab can export the whole knowledge base (chunks plus embeddings) as a JSON snapshot and import it back later. Share links carry configuration only — never your documents.
