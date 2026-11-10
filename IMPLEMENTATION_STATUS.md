# Implementation status

## Implemented

- Next.js App Router / strict TypeScript application with a restrained responsive light/dark workbench, FR/EN interface and bilingual course content.
- Learning, labs, practice, exams, tutor and progress now open without login. Signed visitor cookies isolate each browser's records for 30 days; admin privileges remain account-protected. Registration is optional.
- All 15 lessons expanded to 62 bilingual sections, with worked calculations, LR(0) collection/table, parsing traces and SLR/LR(1)/LALR counterexamples. Separate navigation entries open each LR method directly.
- Landing with real FIRST/FOLLOW and LL(1) preview; public curriculum; credentials registration/login; onboarding; dashboard; lessons; practice and attempts; six labs; saved tutor conversations; exams; review/bookmarks; progress; settings/export/deletion; protected admin studio.
- PostgreSQL persistence through Prisma, migration workflow and repeatable seeds. Better Auth sessions, bcrypt password hashing and server-side ownership/admin checks.
- Seven course modules, 15 substantive bilingual lessons and 34 original seed exercises. MC/multi-select, sets, tables, grammar parts, token rows, production sequences, graphical tree construction, grammar transformations and rubric-based open answers. FIRST/FOLLOW generation accepts custom grammars and targets, with independently recomputed solutions.
- Pure grammar/lexer/DFA/derivation/FIRST/FOLLOW/LL(1)/LR(0)/SLR(1)/LR(1)/LALR(1) engines. Real state graphs, parse trees, conflict evidence and bounded parsing traces.
- Autosaved practice drafts and exam answers; idempotent submission; partial set/table grades with exact missing/extra members; persistent progress and real-history plots.
- NVIDIA NIM server adapter, sanitised errors, cancellation, bounded transient retry, context-grounded non-streaming tutor, source retrieval and solver-validated FIRST/FOLLOW generation with verified fallback. Computed tutor mode works without NIM and is clearly labelled.
- Page-indexed extraction and private PostgreSQL chunks for the 238-page Compilation transcript, with page numbers and unverified status. The adjacent 346-page conversation was inspected and excluded from active retrieval as out of scope. Admin PDF import/review, lesson editing/publication, exercise moderation and audit logs.

## Validation

- Unit/integration suite: **39 passed**, including expanded lesson examples, the ten required algorithm regressions, the independent LR item/transition fixture, all canonical seed answers, original/custom-grammar generation, answer widgets and mocked NVIDIA HTTP responses.
- Browser suite: **15 passed against the optimized production server through the public Cloudflare URL**, using installed Google Chrome. Journeys cover guest isolation/persistence/direct LR method links, actual registration/onboarding/login forms, lesson completion, Fiche 1, FIRST/FOLLOW proofs, LL(1) acceptance/conflicts, LR(1)/LALR classification, two-tree ambiguity, transformations, draft reloads, exact partial feedback, computed tutor/history, exams, origin/ownership/role boundaries, concurrent submissions, settings persistence, mobile navigation/graph visibility, generator, DFA acceptance/rejection, dark mode and admin editing/provider status.
- Additional admin API check passed: source catalog, lesson edit, publication moderation, successful real **238-page PDF upload**, and the explicit missing-NIM-key response. Its temporary source copy was removed afterward.
- Desktop (1280px) and mobile (390px) screenshots were visually reviewed. A mobile graph fitting issue and a hidden skip-link layout issue were corrected and rechecked. In-app browser host was unavailable; Chrome/Playwright and screenshots provided the browser verification.
- Final gate, executed **2026-11-10**: `npm run lint` passed; `npm run typecheck` passed; `npm run test` passed (**39 tests**); `npm run build` passed; `PLAYWRIGHT_CHANNEL=chrome npm run test:e2e` passed (**15 tests through the public tunnel, 1.2 minutes**). Dependency installation audit and production-only audit reported **0 known vulnerabilities**. Migration deploy is current, with no pending migration.
- The production server is running at **http://127.0.0.1:3000**, verified with HTTP 200 after the final suite. Background start/stop helpers were exercised. All task-created QA accounts were removed; demo and user accounts were preserved.

## Deliberate limits / remaining scope

- Live NVIDIA checks passed using `nvidia/nemotron-3.5-lightning-30b-a3b`: minimal completion, a French tutor explanation and public API FIRST/FOLLOW generation (`nim-validated`). The key stays in ignored server environment configuration. Other generation topics still use verified deterministic questions. Provider availability and quota remain external dependencies.
- AI exercise generation supports FIRST/FOLLOW only. Other topics select from the verified bank. Topic, format, count, level and custom FIRST/FOLLOW grammar/target are exposed. Arbitrary AI generation for every question type, requested exercise length and a general-purpose authoring wizard remain extensions.
- Seed content is authored and algorithmically checked where decidable; no independent human review is claimed.
- AST practice includes an explicit expression projection question and a computed operator-tree projection for supported expression parse trees; there is no general interactive AST editor. Parser traces have forward/back navigation; trees are built through production selection and bounded search, rather than arbitrary nonterminal dragging.
- Grammar transformation grading compares normalized expected production sets, not arbitrary language equivalence. Nullable-input left-recursion elimination is explicitly refused. NFA conversion, semantics, backends and Flex/Yacc labs are outside the active scope.
- Source extraction does not OCR image-only equations. Imported conversation claims remain unverified. Retrieval is bounded lexical matching without embeddings.
- Admin supports source upload/review, existing lesson editing and publication, and exercise publication moderation. General-purpose module/exercise CRUD, content-version history and a full per-chunk search UI remain extensions.
- No mail service is configured. Verification/reset delivery flows are not exposed. No simulated mail-success or AI-streaming behaviour is used.
- Per-process rate/concurrency controls suit one Node instance. Distributed limits, production observability, email delivery, deployment automation and an independent security/accessibility audit remain deployment work.
- Mastery uses scored practice answers; exam scores are shown separately. Reading duration is not measured. No predictive exam-readiness percentage is fabricated.

## Local commands

See README for exact setup. On this computer: `npm run db:local`, `npm run db:migrate`, `npm run db:seed`, `npm run dev`; open `http://127.0.0.1:3000`.
