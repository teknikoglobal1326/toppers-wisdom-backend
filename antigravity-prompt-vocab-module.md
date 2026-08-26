# Prompt for Antigravity — SSC PYQ Dictionary/Vocab Module

## Instructions to Antigravity

Do NOT write or modify any code yet. Your first task is to produce a single
Markdown file called `VOCAB-MODULE-PLAN.md` that documents the full plan
(architecture, schema, API routes, folder structure, AI-vs-backend split,
and a step-by-step implementation checklist) based on the requirements below.

Present that `.md` file to me for review and approval. Only after I explicitly
approve it should you begin implementation, and even then, implement it in
the order laid out in the checklist, one step at a time, pausing after each
step for me to verify before moving to the next.

---

## Context

We already have an active Node.js backend for an SSC exam-prep app. We are
adding a new **Dictionary / Vocabulary module** to it. This module follows a
proven content pattern already used in a prior offline HTML app (details
below) — reuse this pattern's data schema and UI/state logic, adapted to a
proper client-server Node.js architecture.

---

## 1. Categories (8 total)

- One Word Substitution
- Idioms & Phrases
- Synonyms
- Antonyms
- Spellings
- Phrasal Verbs
- Homonyms
- Proverbs

## 2. Navigation structure (per category)

Each category has three modes:

- **Learn**
  - Full wordlist
  - Most asked first (ranked by `rep`)
  - Paper-wise words (grouped by exam)
  - Theme-wise words
- **Revise** (flashcards)
  - Flashcards A–Z
  - Flashcards most asked
  - Flashcards paper-wise
  - Flashcards theme-wise
- **Practice**
  - Practice MCQs
  - Mixed test
  - Theme-wise test

This should be modeled as a state object, e.g.:
```
S = { cat, hub, sub, group, mode, fc, flip, answers, qidx, search }
```
where `sub` is the "lens" (full/rep/exam/theme/fc-alpha/fc-rep/fc-exam/fc-theme/mcq/mixed/theme-test)
and `group` is the second-level filter (which paper / which theme / which letter),
only needed for some subs.

## 3. Word record schema

Every vocabulary entry is a flat record:

```json
{
  "id": "w_00187",
  "cat": "one-word-sub",
  "word": "Abandonment",
  "pron": "/əbˈændənmənt/",
  "pos": "noun",
  "rep": 2,
  "en": "The act of giving something up completely",
  "hi": "परित्याग",
  "exams": ["SSC CHSL 2020 Tier-I · 14 Oct, Morning", "SSC PYQ 2017"],
  "syn": [],
  "ant": [],
  "usage": ["Abandonment of the scheme was announced quietly.", "..."],
  "daily": ["Scheme ka abandonment ho gaya.", "..."],
  "hook": "Devanagari mnemonic ending in danda (।)",
  "note": "Concept line — related words with meanings",
  "deriv": ["abandon", "abandoned"],
  "theme": "loss-departure",
  "src": "SSC CHSL 2020 Tier-I"
}
```

Content rules (non-negotiable, enforce via validation):
- `hook` and `note` must be Devanagari text ending in a danda (।).
- No em-dashes anywhere in authored text fields.
- `usage[]` and `daily[]` must read handwritten/natural, never AI-flavoured.
- Scripts/ingestion may only ADD fields, never overwrite already-authored
  (human-approved) fields.

Questions follow:
```json
{ "cat": "...", "exam": "...", "q": "...", "opts": ["..."], "ans": "...", "expl": "...", "tip": "..." }
```

## 4. AI vs Backend logic — strict separation

**Backend logic only (never AI), because these must be deterministic and auditable:**
- Category/sub/group filtering and selectors (`currentWords()`, `currentQuestions()`)
- `rep` calculation and "most asked" ranking
- MCQ assembly/quiz generation from the question bank (selection, not generation)
- Scoring / correctness checking (`ans` exact match)
- Spaced-repetition scheduling, streaks, progress tracking, XP
- Dedup/merge of new words into the live word bank
- `note` field content (format from existing `syn[]`/`ant[]`/`theme` data — no AI needed)
- Auth, rate limiting, session state

**AI-assisted only, always with a human/backend validation gate before anything goes live:**
- Extracting words/questions from uploaded raw question sheets (OCR/parsing)
- Auto-classifying extracted items into one of the 8 categories
- Drafting `en`, `hi`, `usage[]`, `daily[]`, `hook` fields (first draft only)
- Drafting MCQ `expl` (explanation) text
- Suggesting `theme` groupings across large word sets

**Rule: AI output must NEVER write directly to the live word/question bank.**
It always lands in a staging table, passes automated validation (schema,
danda/em-dash checks, dedup), and is only merged after human review — same
review discipline the finalize → build → verify pipeline already used.

## 5. Suggested API routes

```
GET  /api/categories
GET  /api/categories/:cat/hub
GET  /api/categories/:cat/words?sub=&group=&page=
GET  /api/words/:id
GET  /api/categories/:cat/practice/mcq?sub=&group=
POST /api/progress/attempt
GET  /api/progress/:studentId/due
POST /api/ingest/upload           (question sheet upload → staging)
GET  /api/ingest/review-queue     (AI-drafted items pending approval)
POST /api/ingest/:id/approve      (merges staged item into live bank)
POST /api/ingest/:id/reject
```

## 6. What I need in `VOCAB-MODULE-PLAN.md`

1. Final folder/module structure for the Node.js backend
2. Full DB schema (words, questions, students, progress/spaced-repetition,
   staging/review-queue tables) — specify DB engine assumption (ask me if
   Mongo vs Postgres isn't already decided in the existing backend)
3. All API routes with request/response shape
4. The AI-vs-backend responsibility table (as above, refined to this codebase)
5. Ingestion pipeline flow (upload → extract → stage → review → merge)
6. A step-by-step implementation checklist, ordered so each step is testable
   independently (e.g.: schema first, then read-only endpoints, then
   progress/scoring, then ingestion+AI last)
7. Open questions/assumptions you need me to confirm before implementation

Wait for my explicit approval of this plan before writing any implementation code.
