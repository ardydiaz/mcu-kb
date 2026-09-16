# MCU Departmental Knowledge Base

A permission-aware knowledge base built with React, Vite, Node.js, Express, MySQL, Microsoft Entra ID, Qdrant, and Qwen models served locally by Ollama.

The system extracts and indexes the contents of approved PDF, Word, and Excel files. Signed-in users can ask natural-language questions, receive grounded answers, and open the exact source document at the cited PDF page or Excel sheet/cell range.

## Architecture

```text
React + Vite
    |
    | HTTP-only JWT cookie
    v
Express API
    |-- Microsoft Entra ID authentication
    |-- exact title/code and lexical search
    |-- role/department authorization
    |
    |-- MySQL: users, roles, documents, versions, permissions, chunks, jobs
    |-- Qdrant: semantic vectors and permission payloads
    `-- Ollama
          |-- qwen3-embedding: document and question embeddings
          `-- Qwen instruct model: grounded answer generation
```

MySQL is the source of truth. Qdrant is a derived search index that can be rebuilt from MySQL and the protected upload directory.

## Search flow

```text
User asks a question
        |
        v
Express verifies JWT and loads the current MySQL account
        |
        v
Normalize question and check exact title/document-code matches
        |
        v
Ollama generates the question embedding
        |
        v
Qdrant searches with published/visibility/role/department filters
        |
        v
Express revalidates every candidate against MySQL
        |
        v
Relevant chunks are grouped by document and thresholded
        |
        v
Qwen receives only permitted chunks and generates a grounded answer
        |
        v
Express attaches source document/page/sheet/cell citations
        |
        v
React displays the answer and clickable source files
```

Exact title and document-code matching remains authoritative. Semantic retrieval supplements it when users phrase questions differently. The LLM never decides permissions and never searches the file system directly.

## Upload and indexing flow

1. Admin or Super Admin uploads a PDF, DOC, DOCX, XLS, or XLSX file.
2. Express validates the extension, MIME type, size, category, ownership, and visibility rules.
3. The original file is saved under a randomized protected filename.
4. A MySQL document version and background processing job are created.
5. Text is extracted by page, paragraph, or spreadsheet row.
6. Content is split into overlapping chunks of approximately 2,200 characters.
7. Ollama creates a vector for every chunk using `qwen3-embedding`.
8. Chunks remain in MySQL for audit/fallback purposes and are upserted to Qdrant.
9. Qdrant payloads contain document, version, status, visibility, role, department, and citation metadata.
10. Publishing or changing access synchronizes the Qdrant payload. Uploading a new version replaces the previous version's Qdrant points.

Image-only PDFs require Azure Document Intelligence OCR when local text extraction returns nothing. OCR remains optional.

## Permission model

Normal users can retrieve only published documents allowed by one of these rules:

- `public`: all authenticated active accounts.
- `internal`: users whose department matches the owning department.
- `restricted`: users explicitly allowed through a role or department permission.

Admin and Super Admin can review all published vectors. Express applies the same authorization again after Qdrant retrieval, preventing stale search-index permissions from exposing content to Qwen or React.

## Prerequisites

- Node.js 20 or later
- MySQL 8
- Microsoft Entra application registration
- Docker Desktop, or separately installed Qdrant and Ollama
- Sufficient disk and memory for the selected Qwen models
- An NVIDIA GPU is recommended for responsive answer generation but is not required for basic testing

## Installation

Install application dependencies:

```powershell
cd C:\MCU-Projects\mcu-kb
npm.cmd run install:all
```

Copy the backend configuration template:

```powershell
Copy-Item backend\.env.example backend\.env
```

Configure the database and Microsoft Entra values already used by the application, then configure Qdrant and Ollama as described below.

## Start Qdrant and Ollama

The repository includes [`docker-compose.search.yml`](docker-compose.search.yml):

```powershell
docker compose -f docker-compose.search.yml up -d
```

Download the embedding and answer models:

```powershell
docker exec mcu-ollama ollama pull qwen3-embedding
docker exec mcu-ollama ollama pull qwen3:4b
```

If Ollama is installed natively, run the same `ollama pull` commands without `docker exec mcu-ollama`.

Verify the services:

```text
Ollama: http://127.0.0.1:11434/api/tags
Qdrant: http://127.0.0.1:6333/dashboard
```

## Backend configuration

Add these values to `backend/.env`:

```env
QDRANT_ENABLED=true
QDRANT_URL=http://127.0.0.1:6333
QDRANT_API_KEY=
QDRANT_COLLECTION=mcu_knowledge_chunks
QDRANT_SCORE_THRESHOLD=0.42
QDRANT_FALLBACK_TO_MYSQL=true

OLLAMA_ENABLED=true
OLLAMA_URL=http://127.0.0.1:11434
OLLAMA_EMBEDDING_MODEL=qwen3-embedding
OLLAMA_CHAT_MODEL=qwen3:4b
OLLAMA_TIMEOUT_MS=120000
OLLAMA_MAX_ANSWER_TOKENS=600
```

For Qdrant Cloud, replace `QDRANT_URL`, set `QDRANT_API_KEY`, and do not expose the key to React.

`QDRANT_FALLBACK_TO_MYSQL=true` is recommended during migration. It lets content search continue when Qdrant is temporarily unavailable. Set it to `false` after production monitoring confirms that Qdrant is reliable if strict failure behavior is preferred.

## Database and initial indexing

Apply the content-index migration:

```powershell
cd backend
npm.cmd run migrate:content
```

With Qdrant and Ollama running and both feature flags enabled, index all latest document versions:

```powershell
npm.cmd run index:documents
```

The command extracts every current file, regenerates embeddings, replaces its Qdrant points, and reports failures. It is safe to rerun.

Whenever `OLLAMA_EMBEDDING_MODEL` changes, use a new `QDRANT_COLLECTION` name or delete/recreate the old collection, then run `npm.cmd run index:documents`. Vectors produced by different embedding models or dimensions must not be mixed.

## Run the application

From the repository root:

```powershell
npm.cmd run dev
```

Default addresses:

- Frontend: `http://localhost:5174`
- API: `http://localhost:4000/api`
- API health: `http://localhost:4000/health`
- Qdrant dashboard: `http://localhost:6333/dashboard`

An Admin or Super Admin can inspect integration health through:

```http
GET /api/knowledge/status
```

The response reports whether Ollama and Qdrant are configured, reachable, which Ollama models are installed, and the Qdrant collection point count.

## Knowledge search API

```http
POST /api/public/ask
Content-Type: application/json
Cookie: mcu_session=<HTTP-only JWT>

{
  "message": "How should faculty operate the smart classroom board?"
}
```

The response contains:

- `answer`: grounded Qwen response or deterministic extracted passages.
- `grounded`: whether approved supporting chunks were found.
- `ai_generated`: whether a configured answer model generated the response.
- `retrieval`: `qdrant-hybrid` or `mysql-hybrid`.
- `citations`: unique documents with page/sheet/cell locations and excerpts.
- `documents`: clickable source-file records.

If evidence is insufficient, the API returns:

```text
No approved document contains enough information to answer this question.
```

## Relevance behavior

The retrieval order is intentionally deterministic:

1. Exact document code
2. Exact or strong document title
3. Normalized keyword/content match
4. Qdrant semantic similarity
5. Relevance threshold
6. Grouping by document

Question filler words, common synonyms, singular/plural differences, and small spelling mistakes are normalized. Search tags are optional supporting metadata rather than a requirement.

Tune `QDRANT_SCORE_THRESHOLD` using real MCU questions. A value that is too low returns loosely related files; a value that is too high hides useful matches. Maintain a test set containing expected questions, expected documents, no-result questions, and accounts with different permission combinations.

## Security requirements

- Never call Qdrant or Ollama directly from React.
- Never expose Qdrant or Ollama ports publicly without network controls and authentication.
- Build search filters from the verified server-side `req.user`, never from request body role values.
- Send only MySQL-revalidated chunks to Qwen.
- Treat uploaded document text as untrusted reference content, not model instructions.
- Require citations for generated answers.
- Keep the original files behind authenticated Express preview routes.
- Log document views, permission changes, indexing failures, and unanswered searches.

## Backups

Back up these components:

1. MySQL database
2. `backend/src/uploads` or the configured protected upload storage
3. Qdrant volume `qdrant_data`
4. Environment configuration through the organization's secret manager

Qdrant can be rebuilt, but MySQL and original uploads cannot. Prioritize their backup and restore testing.

## Troubleshooting

### Ollama is unavailable

Check that the service is running and the models exist:

```powershell
docker ps
docker exec mcu-ollama ollama list
```

Confirm that `OLLAMA_URL` is reachable from the backend process. If the backend itself runs in Docker, `127.0.0.1` refers to that container; use the Compose service hostname such as `http://ollama:11434`.

### Qdrant collection vector-size error

The embedding model changed. Set a new `QDRANT_COLLECTION` name and rerun:

```powershell
npm.cmd run index:documents
```

### Search returns no semantic results

1. Check `GET /api/knowledge/status` as an administrator.
2. Confirm `QDRANT_ENABLED=true` and `OLLAMA_ENABLED=true`.
3. Confirm the embedding model is installed.
4. Run `npm.cmd run index:documents`.
5. Lower `QDRANT_SCORE_THRESHOLD` gradually and evaluate accuracy.
6. Confirm that the document is published and permitted for the test account.

### Answer generation is slow

- Use a smaller Qwen instruct model.
- Reduce `OLLAMA_MAX_ANSWER_TOKENS`.
- Use GPU acceleration for Ollama.
- Retrieve fewer chunks after validating retrieval accuracy.
- Keep answer generation optional; Qdrant can still locate files without it.

## Tests

Run backend tests:

```powershell
cd backend
npm.cmd test
```

Build the production frontend:

```powershell
cd frontend
npm.cmd run build
```
