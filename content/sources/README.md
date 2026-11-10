# Source register and verification policy

The import tool read every extractable page of two local PDFs, not a textbook:

| Local document | Pages | Extracted characters | Use |
| --- | ---: | ---: | --- |
| hey i want to study compilation cours.pdf | 238 | 263,042 | Prior study conversation; unverified context |
| hey read this , act like ur the professore that ex.pdf | 346 | 477,707 | Prior conversation; mostly outside the Compilation scope |

`catalog.json` indexes page numbers by detected topic and production-like lines. The private `pages/*.json` files retain page text and extraction warnings through the default `verified:false` flag. These files, source PDFs and rendered previews are not public application assets or tracked in Git. `prisma/seed.ts` ingests bounded, overlapping chunks from the **238-page Compilation transcript only** into PostgreSQL. The adjacent 346-page conversation was inspected and excluded from the active retrieval corpus because it does not match this course. No OCR is performed; equations stored as drawings or images may be absent from extracted text. A missing equation must never be reconstructed by guesswork.

## Curated Compilation examples

| Source | Pages | Topic / exercise pattern | Treatment |
| --- | --- | --- | --- |
| study-transcript | 1 | `S → A b; A → a A \| C; C → c \| ε`; FOLLOW propagation | Preset reproduced and verified by fixed-point solver; FIRST(S)={a,b,c}, FOLLOW(A)=FOLLOW(C)={b} |
| study-transcript | 17, 19–20 | `E → A := B; B → A + B \| id; A → id`; leftmost production numbering | Normalized rules verified by derivation engine; lost mathematical text on pages 19–20 not used as rules |
| study-transcript | 20–26 | Lexeme/token distinction, toy lexer exercises | Course vocabulary only; individual toy languages remain distinct from Fiche 1 |
| study-transcript | 22 | Toy language including comma and later treating `3,5` as one invalid lexeme | Inconsistent lexer assumptions; previous answer is not seeded as ground truth |
| study-transcript | 27–51 | Left recursion and factoring | Re-authored explanations with explicit transformation preconditions; equations independently computed |
| study-transcript | 57–67 | LR(0), dots, CLOSURE, GOTO and cycles in item automata | Vocabulary and topic scope; tables are recalculated from supplied grammars |
| study-transcript | 96 | Expression FOLLOW table in a prior answer | Do not copy: `*` belongs to FOLLOW(F), not FOLLOW(T), for the factored E/T/F fixture used here |
| study-transcript | 102–160 | SLR/LALR comparisons, ACTION/GOTO and conflict justification | Classification always uses real solver output; no transcript verdict is trusted |
| study-transcript | 98–101, 161 onward | Flex/Bison and later references | Outside active curriculum; not seeded as default lessons |

The standalone Fiche 1 sheet was not found as a separate file. Its exact language constraints come from the user’s full build prompt. No claim is made that its original page was ingested. Seed questions are authored for this application and checked by algorithms where decidable; no separate human review is claimed.

## Retrieval

Authenticated tutor requests retrieve up to three lexical matches, ranked by query-term occurrence, with document ID, exact page, title and verification status. Text is supplied as untrusted user-context data. Document instructions do not become tutor system instructions. A retrieved chunk is evidence of a conversation, not proof of mathematical correctness. Administrators can upload local PDFs, inspect excerpts and mark reviewed chunks. Text-only PDFs are supported; scanned pages need an external OCR step.
