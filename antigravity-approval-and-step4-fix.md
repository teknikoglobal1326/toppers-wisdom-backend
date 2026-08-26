# Approval + one more fix needed before Step 4

The plan looks good. All the previous revisions (groups endpoint, MCQ answer
hiding, search route, `_id`/`wordId` reference fix, compound index, and the
four open-question decisions) are correctly reflected.

**Approved: proceed with Step 1, Step 2, and Step 3 as written.**

Before you start Step 4 (Progress & Spaced Repetition), update the plan with
these two fixes and show me the updated Step 4 section for approval first —
do not implement Step 4 until I approve it.

---

## Fix 1: Question needs a link back to Word

`question.model.js` currently has no field connecting a question to the word
it tests. Without this, when a student answers an MCQ correctly, the backend
has no way to know which word's spaced-repetition progress to update.

Add to the Question schema:
```javascript
wordId: { type: String, ref: 'Word' } // optional — not all questions map to a single word
```

`/progress/*` logic in Step 4 should use this to update that word's SM-2
state whenever a question includes it.

## Fix 2: Split `/progress/attempt` into two separate endpoints

Flashcard self-assessment and MCQ answers are different trust levels — one
is self-reported by the student, one is server-verified against the DB.
Merging them into a single endpoint with two different request shapes
(`{wordId, correct}` vs `{questionId, selectedOption}`) is ambiguous and
risks a client faking mastery by sending `{wordId, correct: true}` directly.

Replace the single `/progress/attempt` endpoint with two explicit ones:

```
POST /api/vocabulary/progress/flashcard
  Request: { wordId, selfRating }
  → self-assessed, used for flashcard revise mode

POST /api/vocabulary/progress/mcq-attempt
  Request: { questionId, selectedOption }
  → server looks up the real answer, grades it, and updates progress
    for the linked wordId (via Fix 1) if present
```

Both should update the same `Progress` document, but note in the plan that
MCQ-verified attempts should carry more weight in the SM-2 scheduling than
self-reported flashcard ratings, since only the MCQ path is verifiable. The
exact weighting logic is up to you to propose in the Step 4 write-up.

---

Update the Step 4 section of the plan with these two fixes and share it for
approval before writing any Step 4 code. Steps 1–3 can proceed now as
already approved.
