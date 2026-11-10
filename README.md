# Compilab

A French-first, bilingual Compilation workbench for L3 at Université Oran 1. The learning path focuses on **analyse lexicale** and **analyse syntaxique**. Compiler results come from a bounded, pure TypeScript solver. NVIDIA NIM supplies optional explanations, never the mathematical checker.

## Quick start on this computer

Requirements: Node **24 LTS, at least 24.15** (tested on **24.18.0**), npm, PostgreSQL 16+, and Python with `PyMuPDF` for PDF imports. Docker is optional. All commands run in this directory:

```powershell
cd C:\Users\VVV\Downloads\compilab
npm install --legacy-peer-deps
npm run db:local
npm run db:migrate
npm run db:seed
npm run dev
```

Open **http://127.0.0.1:3000**. Use `127.0.0.1` consistently: authentication validates the configured origin. The Windows local helper finds PostgreSQL at `C:/Program Files/PostgreSQL/16/bin` by default; override `POSTGRES_BIN` if it is installed elsewhere. It initializes an **isolated cluster on port 55432**, creates a random local database password and authentication secret, and writes them to ignored `.env.local`. It does not modify the existing PostgreSQL service on port 5432.

To run the built application in the background with a hidden Windows process:

```powershell
npm run build
npm run start:local
# Later, stop this project's background server:
npm run stop:local
```

The helper verifies the process belongs to this checkout before stopping it. Logs and its PID stay in ignored `.local/`. Stop the background server before starting `npm run dev` on the same port.

`npm run db:local` is idempotent. To stop the isolated cluster:

```powershell
& 'C:\Program Files\PostgreSQL\16\bin\pg_ctl.exe' stop -D '.local\postgres'
```

For another local/hosted PostgreSQL instance, copy `.env.example` to `.env.local`, set `DATABASE_URL`, a random `AUTH_SECRET` of at least 32 characters, and `BETTER_AUTH_URL`. Run migrations and seed as above. Do not use the local helper if supplying your own URL. Prisma CLI and seed explicitly load `.env.local`; Next.js loads it automatically.

Docker alternative:

```powershell
$env:POSTGRES_PASSWORD = 'choose-a-local-database-password'
docker compose up -d
# Set matching DATABASE_URL in .env.local, then migrate and seed.
```

## Accounts and demo data

Open `/learn`, `/dashboard`, or any lab directly: no login is required. A signed, HTTP-only visitor cookie keeps each browser's progress, attempts, exams and conversations separate for 30 days. Registration remains optional through `/register`; administrator operations still require an administrator account. Passwords are hashed with bcrypt, cost 12. Sessions are stored in PostgreSQL and managed by Better Auth. Ownership is enforced in server handlers. Guest access never inherits the shared demo user's data or administrator privileges.

The 15 bilingual lessons contain 62 sections with worked examples, complete FIRST/FOLLOW calculations, LL(1) and LR traces, an LR(0) state collection and table, and SLR/LALR conflict examples. The sidebar and learning page link directly to `/lab/lr?method=LR0`, `?method=SLR`, `?method=LR1`, and `?method=LALR`.

The local helper enables `DEMO_ENABLED=true`. The seed creates these **development-only** accounts:

| Role | Email | Password |
| --- | --- | --- |
| Student | `demo@compilab.local` | `Compilab-demo-2026!` |
| Administrator | `admin@compilab.local` | `Compilab-demo-2026!` |

Override `DEMO_PASSWORD` before seeding. Do not enable demo seeding on a deployed service. Production seeding refuses demo creation. No fake attempts or progress are seeded. Email verification/reset delivery is not configured; the UI offers no fictional “email sent” flow.

## NVIDIA NIM

Add only to **server-side** `.env.local` or deployment secrets:

```dotenv
NVIDIA_API_KEY=your-secret-key
NVIDIA_BASE_URL=https://integrate.api.nvidia.com/v1
NVIDIA_MODEL=nvidia/nemotron-3.5-lightning-30b-a3b
```

Restart the server after changing environment variables. Never use `NEXT_PUBLIC_` for these values. The provider uses `POST /chat/completions`, an OpenAI-compatible body, a 45-second timeout, three concurrent requests per process, limited transient retries and sanitized errors. No tools, JSON-schema mode or streaming capability is assumed. Only finalized conversations are persisted.

The [NVIDIA API reference](https://docs.api.nvidia.com/nim/reference/nvidia-nemotron-3-5-lightning-30b-a3b-infer) documents the default model. Nemotron 3.5 requests disable thinking to return direct answers within the response budget. On 2026-11-10, the supplied server key successfully completed a minimal request, a French tutor explanation and solver-validated FIRST/FOLLOW exercise generation through the public tunnel. The retired Llama default returned HTTP 410 and was replaced. The admin health button performs a fresh, minimal completion request; future account access and quota can change. No credential is included in source or browser bundles.

Without a key, lessons, labs, practice, exams, history, and progress work. FIRST/FOLLOW explanations can be requested from the **computed solver** mode in `/tutor`; these are visibly labeled and saved separately from any AI claim. AI-only requests return an explicit configuration error. Generation falls back to the verified bank or deterministic variants. AI generation currently supports FIRST/FOLLOW tasks; every proposed answer is recomputed before persistence, with one repair attempt and a verified fallback.

Error meanings:

| Code | Action |
| --- | --- |
| `NOT_CONFIGURED` | Set server-side `NVIDIA_API_KEY`, restart. |
| `UNAUTHORIZED` | Check account credentials and permissions. |
| `MODEL_UNAVAILABLE` | Select an accessible model ID. |
| `RATE_LIMIT` | Wait for provider/application limit to clear. |
| `TIMEOUT` / `NETWORK` | Retry after checking connectivity. |
| `INVALID_OUTPUT` | Provider content failed structural checks; no invented reply is saved. |
| `EXAM_LOCK` | Submit the active exam before asking for assistance. |

## Course and sources

The seed contains seven modules and substantive bilingual lessons, a glossary, worked examples, prerequisites, pitfalls and original exercises. The source register is in [`content/sources/README.md`](content/sources/README.md). All 238 pages of the Compilation transcript were extracted and indexed. The adjacent 346-page conversation was also inspected, then excluded from active retrieval because it is outside the course scope. Not every equation survives PDF text extraction. Previous assistant answers are explicitly unverified and cannot override solver results.

To reproduce local extraction, place the original PDFs beside this repository and run:

```powershell
python -m pip install -r requirements.txt
npm run sources:import
npm run db:seed
```

Private page files are ignored by Git and kept out of `public/`. The seed stores bounded page chunks in PostgreSQL. Admin `/admin` supports PDF upload (15 MB/500 pages), chunk review, lesson JSON editing, publication toggles, exercise moderation, health checks and metadata/audit logs. New uploads require Python + PyMuPDF on the application server. PDFs are parsed in a timed subprocess under random filenames and removed after ingestion. Scanned documents require OCR outside the application.

## Working journeys

1. Register or sign in → `/learn` → open a lesson → mark complete → open its lab → `/practice` → select a question → submit → see exact missing/extra members → `/progress`.
2. `/lab/lexer`: use Fiche 1, tokenize `Int a` / `a := 10`, inspect symbol references and character offsets. Every lexeme must have whitespace boundaries.
3. `/lab/first-follow`: select the expression grammar and expand the proof log. `/lab/ll1`: parse `id + id * id`; change to the FIRST/FIRST preset and inspect `[S,a]`.
4. `/lab/lr`: build the `S → CC` fixture, select states in the graph/list, inspect ACTION/GOTO and parse `c d d`. Select the LR1-not-LALR preset and compare the genuinely computed tables.
5. `/lab/grammar`: search the ambiguous expression example for two parse trees, or supply leftmost/rightmost production numbers. Transformations show a preview and require an explicit Apply action.
6. `/exams`: start 15/30/60/90 minutes. Answers autosave. The timer never deletes them. Solutions are hidden until submission; all tutor modes are server-blocked during active exam mode.
7. `/tutor`: choose computed mode and ask `Why is FOLLOW(T) {+, ), $}?` with the expression grammar. Reload the saved conversation.

## Algorithms and limits

Pure code lives in `src/lib/compiler`. The engine implements grammar normalization, nullable/FIRST/FOLLOW fixed points with provenance, left-recursion diagnosis and constrained elimination, repeated factoring, direction-checked derivations, bounded two-tree search, Fiche 1 scanning, editable DFA execution, LL(1), LR(0), SLR(1), canonical LR(1), and genuine LALR core merging with recomputed conflicts.

Limits: 12,000 grammar/source characters, 60 productions, 25 nonterminals, 30 symbols per production, 200 states, 12,000 closure items, 1,000 parser steps, and 20,000 searched derivation forms at depth 24. Compact lowercase sequences such as `abc` are rejected when token boundaries are ambiguous; write `a b c` or quote one terminal. `id` is a supported conventional terminal. Never put ε on the parser stack. Parser simulation refuses a conflicted table. State numbers are deterministic but may differ from textbooks; compare item contents.

The transformation checker accepts canonical production sets up to ordering/spacing. It does not prove arbitrary context-free language equivalence. Direct/indirect elimination refuses nullable-input grammars, unit self-cycles and missing base alternatives. A failed bounded tree search proves neither nonmembership nor unambiguity. AST exercises specify their projection explicitly; there is no universal AST converter. NFA determinization and grammar backends are outside the active scope.

Set/table grading uses per-field set F1: `2 × correctMembers / (expectedMembers + submittedMembers)`, averaged over fields; this tolerates permutation while penalizing missing and extra entries. Token rows grade positionally. Derivations are replayed. Open responses are unscored and remain `needs_manual_review`; optional AI advice is not promoted into an authoritative score. Topic mastery is an indicative weighted mean over the latest ten scored practice answers, with weight `1/rank`. Charts use actual submitted attempts only. Exam history shows real session scores separately.

## Verification

```powershell
npm run lint
npm run typecheck
npm run test
npm run build
npx playwright install chromium
npm run test:e2e
```

On this computer, verification also supports the installed Google Chrome without downloading another browser:

```powershell
$env:PLAYWRIGHT_CHANNEL = 'chrome'
npm run test:e2e
```

Playwright requires a running/migrated/seeded PostgreSQL database. It starts or reuses the dev server at `http://127.0.0.1:3000`, registers isolated QA users, exercises the primary journeys and deletes its QA accounts afterward. It produces desktop and 390px screenshots in ignored `test-results/`. Tests include provider HTTP mocks, canonical FIRST/FOLLOW fixtures, nullable chains/cycles, transformation language enumeration, two-tree ambiguity, and the LR(1)-not-LALR counterexample. The LR item fixture is checked structurally against an [independent East Carolina University reference](https://cs.ecu.edu/abrahamsonk/5220/spr16/Notes/Bottom-up/lr1.html).

The optional admin UI test uses the documented local demo admin and skips when that account is unavailable. The normal student journeys do not require demo accounts. The test suite respects authentication limits; wait one minute between rapidly repeated full suites. Source-PDF upload was additionally verified against the real 238-page local file, with the temporary imported copy removed after the check.

See [`IMPLEMENTATION_STATUS.md`](IMPLEMENTATION_STATUS.md) for the actual executed checks and remaining scope.

## Deployment and boundaries

Deploy as a Node server with PostgreSQL; run `npm run db:migrate`, `npm run db:seed` (demo disabled), `npm run build`, then `npm start`. Set `BETTER_AUTH_URL` to the exact HTTPS origin, `AUTH_SECRET`, `DATABASE_URL`, and optional NVIDIA secrets. Keep server-side source documents private. Python/PyMuPDF is needed only for PDF imports. Use a reverse proxy with a 16 MB request limit and HTTPS.

The app uses Zod validation, same-origin mutations, server ownership checks, admin role checks, safe React/Markdown output (raw HTML disabled), and bounded compiler/provider inputs. No user grammar or model-generated code is executed. Account export excludes credentials; deletion cascades through owned learning data. Administrative source changes are audited. Rate and concurrency limits are currently **per process**; use shared rate limiting and managed secrets/backups before a multi-instance public deployment. This is an executable local MVP, not a claim of audited production readiness.
