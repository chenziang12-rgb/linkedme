# LinkedMe

LinkedMe is a context-aware career copilot that constructs a unified knowledge base from every artifact you share — resumes, LinkedIn, GitHub, project documents, and more. That shared profile lets the product extract the right wins for each job description, tailor outreach, and keep HR conversations cohesive.

Under the hood, a Vite/React frontend (`/web`) talks to an Express + TypeScript API (`/api`) that ingests sources, normalizes context via OpenAI, and orchestrates secure storage in Supabase. Five Supabase Edge Functions handle long-running, token-streaming pipelines (resume parsing, LinkedIn/GitHub scraping, profile aggregation).

## Why LinkedMe?

- **Unified knowledge base** – Aggregate every document into Supabase-backed context so the AI always "remembers" the candidate.
- **Immediate personalization** – Use that shared profile to tailor resumes, cover letters, and HR messages for each JD automatically.
- **Semantic job matching** – Jobs are ranked by cosine similarity between your profile embedding and each job's embedding using `text-embedding-3-small`.
- **Actionable job workflow** – Browse curated roles, apply the unified profile as a lens, and ship tailored assets without leaving the product.
- **Extensible architecture** – Storage adapters and modular pipelines keep business logic isolated from any single vendor.

## Tech stack

| Layer | Technology |
| --- | --- |
| Frontend | Vite 5, React 18, TypeScript 5, Tailwind CSS 3, Zustand, TanStack Query, React Router v6 |
| Backend API | Express 4, TypeScript, Zod validation, Multer uploads, Pino logging |
| Database + Auth | Supabase (Postgres with RLS, Google OAuth via PKCE) |
| Serverless compute | Supabase Edge Functions (Deno runtime, SSE streaming) |
| LLM | OpenAI — `gpt-4o` (aggregation), `gpt-4o-mini` (parsing, cover letters, HR outreach, preferences), `gpt-4.1-mini` (resume analysis, fit scoring) |
| Embeddings | `text-embedding-3-small` (1536-dim) — job vectors (in-memory) + knowledge source vectors, profile vector, and generated material vectors (persisted in Supabase) |
| Scraping | Apify (`apimaestro~linkedin-profile-detail`, GitHub), Cheerio (websites) |
| Jobs feed | Static JSON from [sg-jobs](https://eaziym.github.io/sg-jobs/data/jobs.min.json) (~4700 Singapore job listings), 1h cache |

## Repository layout

| Path | Description |
| --- | --- |
| `/api` | Express service — resume parsing pipeline, fit scoring engine, Supabase integration, embeddings, RAG retrieval, automated tests |
| `/api/resources/llm_prompts` | All 9 LLM prompt files (see [LLM Prompts](#llm-prompts)) |
| `/web` | Vite + React frontend — Tailwind UI, Zustand profile store, React Query networking, streaming hooks |
| `/supabase/functions` | Edge Functions: `parse-resume-stream`, `parse-linkedin-stream`, `parse-github-stream`, `parse-project-stream`, `aggregate-profile-stream` |
| `/supabase/migrations` | SQL migrations for Supabase schema |
| `/supabase/schema.sql` | Base database schema |
| `docker-compose.yml` | Spins up API + web with sensible defaults for local dev |

## Database schema

| Table | Purpose |
| --- | --- |
| `profiles` | User profiles with `knowledge_base_summary` (JSONB), skills array, COMPASS scores, `profile_embedding` (float8[]) |
| `knowledge_sources` | Individual parsed sources (resume, LinkedIn, GitHub, etc.) per user, `embedding` (float8[]) per source |
| `user_preferences` | Predicted and confirmed industries, roles, companies with confidence scores |
| `applications` | Job application tracker (status: draft → sent → interview → offer/rejected) |
| `job_assessments` | Cached LLM fit analyses per (user, job) pair |
| `generated_materials` | Cached tailored resumes and cover letters per (user, job) pair, `embedding` (float8[]) |
| `resume_analyses` | History of resume uploads and parsing results |
| `compass_scores` | COMPASS score calculation history with breakdowns |
| `saved_jobs` | Job-user match scores (cached) |

All tables use Row-Level Security (RLS) keyed on `auth.uid()`.

## Getting started

> Requirements: Node 20+, pnpm 8+

```bash
# Install all workspace dependencies
pnpm install

# Copy env templates
cp .env.example .env
cp api/.env.example api/.env

# Create web env (Vite reads from web/, not root)
cat > web/.env << 'EOF'
VITE_API_URL=http://localhost:8080/api
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
EOF

# Update secrets in env files:
# - web/.env: VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY
# - api/.env: OPENAI_API_KEY, SUPABASE_URL, SUPABASE_SECRET_KEY, APIFY_API_TOKEN

# Launch both services
pnpm -w dev   # API on :8080, web on :5173
```

### Project scripts

```bash
pnpm -w dev     # Run API + web in watch mode
pnpm -w test    # Run Vitest suites for both workspaces
pnpm -w build   # Type-checks + builds production bundles
pnpm -w lint    # Type-level linting via tsc --noEmit
```

### Environment variables

**`web/.env`** (Vite build-time — Vite reads from `web/`, not root):
| Variable | Description |
| --- | --- |
| `VITE_API_URL` | Backend API base URL (`http://localhost:8080/api`) |
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon (public) key |

**`api/.env`** (runtime):
| Variable | Description |
| --- | --- |
| `OPENAI_API_KEY` | OpenAI API key for LLM + embeddings |
| `PORT` | Server port (default: 8080) |
| `WEB_ORIGIN` | CORS origin (`http://localhost:5173` for dev) |
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_SECRET_KEY` | Supabase service-role secret key |
| `APIFY_API_TOKEN` | Apify token for LinkedIn/GitHub scraping |
| `ALLOW_FILE_STORE` | Enable file-based storage persistence (default: false) |
| `SEED_JOBS_COUNT` | Sample jobs to seed on startup (default: 30) |
| `UPLOAD_MAX_MB` | Max resume file size in MB (default: 3) |

**Supabase Edge Function secrets** (set via Dashboard or CLI):
| Secret | Description |
| --- | --- |
| `OPENAI_API_KEY` | Same OpenAI key (edge functions have their own env) |
| `APIFY_API_TOKEN` | Same Apify token |

### Supabase setup notes

- **JWT Keys**: If your project uses the new asymmetric (ECC P-256) JWT keys, disable "Verify JWT" on all 5 edge functions — they verify auth internally via `supabase.auth.getUser()`.
- **Google OAuth**: Configure in Supabase Dashboard → Authentication → Providers → Google. Add `http://localhost:5173/knowledge-base` as a redirect URL.

## API routes

### Knowledge base
| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/api/knowledge-sources` | List all sources for the user |
| `GET` | `/api/knowledge-sources/aggregate` | Get unified aggregated profile |
| `PATCH` | `/api/knowledge-sources/aggregate` | Update aggregated profile |
| `DELETE` | `/api/knowledge-sources/aggregate` | Clear aggregated profile |
| `POST` | `/api/knowledge-sources/upload` | Upload resume (PDF/DOCX) |
| `POST` | `/api/knowledge-sources/upload-project` | Upload project document |
| `POST` | `/api/knowledge-sources/linkedin` | Add LinkedIn profile |
| `POST` | `/api/knowledge-sources/github` | Add GitHub profile |
| `POST` | `/api/knowledge-sources/website` | Add website |
| `POST` | `/api/knowledge-sources/text` | Add manual text |
| `DELETE` | `/api/knowledge-sources/:id` | Delete a source |

### Jobs
| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/api/jobs` | List/search jobs (semantic + keyword) |
| `GET` | `/api/jobs/meta/filters` | Available filter options |
| `GET` | `/api/jobs/:id` | Job detail + COMPASS score |
| `POST` | `/api/jobs/:id/analyze` | LLM fit analysis (structured output) |
| `GET` | `/api/jobs/:id/assessment` | Get cached assessment |

### Applications
| Method | Path | Description |
| --- | --- | --- |
| `POST` | `/api/applications` | Track a new application |
| `GET` | `/api/applications` | List all applications |
| `PATCH` | `/api/applications/:id` | Update status/notes |
| `DELETE` | `/api/applications/:id` | Remove an application |

### Preferences
| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/api/preferences` | Get user preferences |
| `POST` | `/api/preferences/predict` | AI-predict industries/roles/companies |
| `PUT` | `/api/preferences` | Update confirmed preferences |
| `DELETE` | `/api/preferences` | Reset preferences |

### Generation
| Method | Path | Description |
| --- | --- | --- |
| `POST` | `/api/generate/resume/:jobId` | Generate tailored resume |
| `POST` | `/api/generate/cover-letter/:jobId` | Generate cover letter |
| `GET` | `/api/generate/:jobId/materials` | Get generated materials |
| `PATCH` | `/api/generate/:id` | Edit generated material |
| `DELETE` | `/api/generate/:id` | Delete generated material |

### Other
| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/api/health` | Health check |
| `GET` | `/api/profile` | Get user profile |
| `POST` | `/api/assessments/compass` | Calculate COMPASS score |
| `POST` | `/api/hr/search` | Search HR contacts |
| `POST` | `/api/hr/outreach/generate` | Generate HR outreach message |

## How it works

### 1. Knowledge base ingestion
Upload resumes, link profiles, or add project documents. Each source is processed by a dedicated Supabase Edge Function that scrapes/parses the content, streams it through an LLM (gpt-4o-mini) for structured extraction, and stores the normalized result in `knowledge_sources`.

### 2. Profile aggregation
When completed sources change, the `aggregate-profile-stream` edge function merges all sources using gpt-4o into a single unified profile — deduplicating skills, merging overlapping experience entries, and normalizing formats. The result is upserted into `profiles.knowledge_base_summary`.

### 3. Semantic job matching
On API boot, all ~4700 jobs are batch-embedded (`title + company + tags`) via `text-embedding-3-small`. When a user browses jobs, the API fetches their stored `profile_embedding` from `profiles` (a 1536-dim vector of the full aggregated knowledge base text) and ranks jobs by cosine similarity. Falls back to a prefs+skills string embedding for users whose profile hasn't been embedded yet. Search queries are also embedded for semantic search.

### 4. Fit analysis (RAG pipeline)
Clicking "Analyze fit" triggers a full RAG retrieval before the LLM call:
1. The fetched job description is embedded
2. All user knowledge sources with stored embeddings are loaded from the DB
3. Sources are ranked by cosine similarity to the JD; the top-2 most relevant are retrieved
4. The retrieved source context is injected into the `gpt-4.1-mini` prompt alongside the aggregated profile
5. Returns: overall score, must-have coverage, 7 subscores, evidence, gaps, interview questions, and recommendations. Results cached per (user, job).

### 5. Asset generation
Tailored resumes and cover letters are generated per-job using the unified profile + JD context. Cover letters support tone selection (formal/professional/enthusiastic). Generated materials are embedded and cached, editable post-generation.

## LLM Prompts

All prompts live in `/api/resources/llm_prompts/`. Each was designed with chain-of-thought reasoning, explicit evidence hierarchies, and anti-pattern constraints.

| File | Model | Purpose |
| --- | --- | --- |
| `extract_resume_info.txt` | `gpt-4o-mini` | Parse resume PDF/DOCX into structured `ParsedKnowledgeData`. Field-by-field extraction rules, normalisation mappings, edge case handling. |
| `extract_project_info.txt` | `gpt-4o-mini` | Parse project documents. Classifies document type first (project report vs internship report) before extracting. |
| `aggregate_profile.txt` | `gpt-4o-mini` | Merge multiple sources into one unified profile. 7-step process: identity → experience merge → education merge → skill dedup → projects/certs → summary synthesis → self-check. |
| `predict_preferences.txt` | `gpt-4o-mini` | Predict industries, roles, and companies from the knowledge base. Evidence-anchored confidence scoring (≥0.65 threshold). Singapore market-aware. |
| `profile_jd_score_system.txt` | `gpt-4.1-mini` | Score candidate fit against a job description. 6-level evidence hierarchy; explicit instruction to use RAG-retrieved source context. 7 weighted subscores. |
| `profile_jd_score_user.txt` | `gpt-4.1-mini` | User-turn template for fit scoring (role, industry, salary, requirements, JD). Candidate profile and RAG context appended in code. |
| `compass_scoring.txt` | `gpt-4.1-mini` | Calculate Singapore Employment Pass COMPASS score. Explicit step-by-step calculation; score breakpoint enforcement; sector benchmark table. |
| `generate_resume.txt` | `gpt-4o-mini` | Generate ATS-optimised tailored resume. Seniority-aware structure (fresh grad / mid / senior). Keyword mirroring, quantification rules, action verb bank. |
| `generate_cover_letter.txt` | `gpt-4o-mini` | Generate personalised cover letter. 4-paragraph formula with hook, 2 proof points, close. Tone-adaptive (formal/professional/enthusiastic). Anti-pattern blacklist. |

## RAG Architecture

LinkedMe uses a tiered embedding strategy across three document types, all using `text-embedding-3-small` (1536-dim):

```
Source upload / aggregation
      │
      ├─ knowledge_sources.embedding     ← text of parsed source (skills + experience + projects)
      ├─ profiles.profile_embedding      ← text of full aggregated knowledge base
      └─ generated_materials.embedding   ← text of generated resume or cover letter

Job browse
      │
      └─ profile_embedding (from DB) vs job embeddings (in-memory)
            → cosine similarity → semanticScore per job → sorted ranking

Job analysis (/jobs/:id/analyze)
      │
      ├─ Embed job description
      ├─ Load user knowledge_sources with embeddings from DB
      ├─ Rank by cosine similarity to JD
      ├─ Retrieve top-2 most relevant sources
      └─ Inject as RETRIEVED SOURCE CONTEXT into LLM prompt
            → gpt-4.1-mini receives both aggregated profile + retrieved granular evidence
```

Embeddings are generated fire-and-forget after each processing event — they do not block the user-facing response.

## Deployment

For detailed production deployment instructions, see [DEPLOYMENT.md](./DEPLOYMENT.md).

```bash
# Build Docker images for AMD64
docker build --platform linux/amd64 -t cto-api:latest -f api/Dockerfile .
docker build --platform linux/amd64 -t cto-web:latest -f web/Dockerfile .

# Transfer and deploy
docker save cto-api:latest | gzip > cto-api.tar.gz
docker save cto-web:latest | gzip > cto-web.tar.gz
```

## Troubleshooting

- **Blank page at localhost:5173** — Vite reads env from `web/.env`, not root `.env`. Create `web/.env` with `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
- **"Invalid JWT" on edge functions** — If using ECC (P-256) JWT keys, disable gateway-level JWT verification on all 5 edge functions. They verify auth internally.
- **"Incorrect API key" on source parsing** — Edge functions have their own env. Update `OPENAI_API_KEY` in Supabase Dashboard → Edge Functions → Secrets.
- **"Insufficient knowledge base" on Refresh Insights** — Aggregation may still be in flight. Wait for the streaming aggregation to complete, then retry.
- **Frontend can't reach API** — Confirm `VITE_API_URL` in `web/.env` and restart `pnpm dev`.
- **File upload rejected** — Max 3 MB PDF/DOCX, enforced by Multer + MIME guards.
- **Rate limiting** — Resume analysis capped at 10/hour per IP.

## Contributing

We welcome contributions! Please see [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.

## License

This project is licensed under the MIT License - see the [LICENSE](./LICENSE) file for details.
