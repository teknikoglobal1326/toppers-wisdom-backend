# Revisions to VOCAB-MODULE-PLAN.md — please update before I approve

The overall plan is good and matches the requirements. Before I approve it,
update the plan document with the following fixes, then re-present it for
approval. Do not start implementation yet.

---

## 1. Add a missing "groups" endpoint

The client needs to show a group-picker screen (e.g. "which paper" or "which
theme") before showing paper-wise/theme-wise word lists. Add this route:

```
GET /api/vocabulary/categories/:cat/groups?sub=exam|theme|alpha
Response: { groups: ["SSC CHSL 2020 Tier-I", "SSC CGL 2019", ...] }
```

Update the DB Schema / Service section to note this comes from a distinct
aggregation query (e.g. Mongo `distinct()` on `exams`/`theme` fields filtered
by `cat`), not a new collection.

## 2. Fix MCQ answer exposure (security issue)

`GET /categories/:cat/practice/mcq` must NEVER return `ans`, `expl`, or `tip`
in the response — only `q`, `opts`, `cat`, and a question ID. A student
should not be able to see the answer in the network response before
answering.

The answer check must happen server-side, inside `POST /progress/attempt`:
- Request: `{ questionId, selectedOption }`
- Server looks up the real answer from the DB, compares, and only then
  returns `{ correct, ans, expl }` in the response.

Update both the API Routes section and the Ingestion/Progress flow
description to reflect this two-step reveal.

## 3. Add a search endpoint

The original `S` state object includes a `search` field, but there's no
corresponding route. Add:

```
GET /api/vocabulary/search?q=<term>&cat=<optional>
Response: array of matching Word objects (search on `word`, `en`, `hi`)
```

## 4. Fix `Progress.wordId` reference typing

Currently `wordId` is typed as `String` with `ref: 'Word'`, but `Word`'s
primary identifier is a custom `id` field (e.g. `w_00187`), not Mongo's
`_id`. As written, `.populate()` won't work correctly.

Pick one and document it explicitly in the schema section:
- **Option A (recommended):** Make `Word.id` the actual Mongo `_id` (drop
  the separate custom `id` field), so `ref: 'Word'` and `.populate()` work
  natively.
- **Option B:** Keep the custom `id` string field, drop `ref: 'Word'`, and
  do manual `findOne({ id: wordId })` lookups in the service layer instead
  of relying on Mongoose population.

State which option is used and update the schema and service layer
description to match.

## 5. Explicitly define the compound index

Add this line under the Progress schema section, not just mention it in
prose:

```javascript
progressSchema.index({ studentId: 1, wordId: 1 }, { unique: true });
```

## 6. Answers to your open questions — update the plan to reflect these decisions

1. **Authentication:** Yes — standard JWT middleware. All `/ingest/*` routes
   require `authorize(['admin'])`. All `/progress/*` routes require a logged
   in student (`authenticate` only, no admin role needed).

2. **Spaced repetition params exposed to frontend:** Backend owns the SM-2
   algorithm entirely. Only `nextReviewDate` and a simple `status`
   (`learning`/`reviewing`/`mastered`) should ever be sent to the frontend.
   Do NOT expose `easeFactor` or `interval` in API responses — these are
   internal scheduling state only.

3. **`exam` vs `exams`:** This was an inconsistency in my original spec, not
   intentional. Fix it: `Question` should also use `exams: [String]` (an
   array), matching `Word`, since the same question can appear across
   multiple paper sittings.

4. **Unique ID generation:** Yes — the backend generates IDs automatically
   at the approval step (`POST /ingest/:id/approve`), using a sequential
   counter or UUID. Never trust or use any ID drafted by the AI extraction
   step.

---

Please update `VOCAB-MODULE-PLAN.md` with all of the above and re-share it
for my approval. Do not begin Step 1 until I approve the revised plan.
