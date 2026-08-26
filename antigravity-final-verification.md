# Follow-up verification before final sign-off

Implementation looks complete and matches the approved plan. Before I sign
off as done, I need two things clarified/shown, plus I'll be running a
manual test pass on my end.

---

## 1. SM-2 interaction between flashcard and MCQ progress on the same word

Both `POST /progress/flashcard` and `POST /progress/mcq-attempt` write to
the same `Progress` document for a given word. Walk me through the combined
behavior:

- If a student self-rates a word "easy" via flashcard, then later gets it
  wrong in an MCQ, what happens to that word's `easeFactor`, `interval`,
  and `nextReviewDate`? Does the MCQ result override or adjust the
  flashcard-derived state?
- Is there any weighting so that MCQ attempts (server-verified) carry more
  influence on scheduling than flashcard self-ratings (self-reported)? If
  not currently implemented, propose how it should work.

Please show the actual scheduling logic/code for both endpoints so I can
see how they combine, not just a description.

## 2. AI extraction service — show the actual implementation

The walkthrough says `/ingest/upload` "queues jobs for AI extraction" but
doesn't show what that job actually does. Please show:

- The exact prompt(s) sent to the AI for extracting words/questions from an
  uploaded sheet.
- The output schema/format enforced on the AI's response (e.g. is it forced
  JSON, validated against the Word/Question schema before staging?).
- What happens if the AI returns malformed JSON, a missing required field,
  or content that fails the danda/em-dash validation rule — does it retry,
  reject the item, flag it for review, or silently stage something broken?

---

## 3. I will independently verify the following before considering this done

(No action needed from you for this section — just documenting my own test
plan.)

- Hit every read-only endpoint (`categories`, `hub`, `groups`, `words`,
  `search`) with real params and confirm response shapes match the plan.
- Inspect the raw JSON from `/practice/mcq` and confirm `ans`, `expl`, and
  `tip` are genuinely absent, not just hidden by the frontend.
- Submit a wrong answer via `/progress/mcq-attempt` and confirm grading is
  server-side (client cannot override `correct`).
- Upload one real question sheet through `/ingest/upload` and manually
  inspect what lands in the review queue.
- Create one word end-to-end: ingest → approve → confirm it is fetchable
  via `/words/:id` and appears correctly in `/categories/:cat/words`.

Please respond to points 1 and 2 above before I mark this module as final.
