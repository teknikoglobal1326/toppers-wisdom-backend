# Vocabulary Module Plan

This document outlines the architecture, database schema, API routes, and implementation plan for the new Dictionary / Vocabulary module, as requested.

## 1. Final Folder/Module Structure

Following standard Node.js/Express modular architecture (which appears to be used in `src/modules/`), the new module will be organized as follows:

```
src/
└── modules/
    └── vocabulary/
        ├── vocabulary.controller.js  # Request/response handling
        ├── vocabulary.service.js     # Business logic, rep calculation, filtering
        ├── vocabulary.routes.js      # Express route definitions
        ├── vocabulary.model.js       # Mongoose schema for Words
        ├── question.model.js         # Mongoose schema for MCQs
        ├── progress.model.js         # Mongoose schema for student progress/spaced repetition
        ├── ingest.model.js           # Mongoose schema for staging/review queue
        └── vocabulary.validation.js  # Joi validation schemas for requests
```

## 2. Full DB Schema (MongoDB)

Since the project uses `mongoose`, we will use MongoDB. 

### Word Schema (`vocabulary.model.js`)
**Note:** We use Option A for IDs: we define `_id` explicitly as a String to hold our custom identifier (e.g., `w_00187`), dropping Mongoose's default ObjectId so that `ref` and `.populate()` work natively.

```javascript
const wordSchema = new mongoose.Schema({
  _id: { type: String, required: true }, // Custom ID, e.g., "w_00187"
  cat: { 
    type: String, 
    required: true, 
    enum: ['one-word-sub', 'idioms-phrases', 'synonyms', 'antonyms', 'spellings', 'phrasal-verbs', 'homonyms', 'proverbs'] 
  },
  word: { type: String, required: true },
  pron: { type: String },
  pos: { type: String },
  rep: { type: Number, default: 0 },
  en: { type: String, required: true },
  hi: { type: String },
  exams: [{ type: String }],
  syn: [{ type: String }],
  ant: [{ type: String }],
  usage: [{ type: String }], // Human-authored style
  daily: [{ type: String }], // Human-authored style
  hook: { type: String }, // Devanagari mnemonic ending in danda (।)
  note: { type: String }, // Concept line ending in danda (।)
  deriv: [{ type: String }],
  theme: { type: String },
  src: { type: String }
}, { timestamps: true });
```
*(Validation hooks will ensure no em-dashes and proper danda usage before saving).*

### Question Schema (`question.model.js`)
```javascript
const questionSchema = new mongoose.Schema({
  cat: { type: String, required: true },
  exams: [{ type: String }],
  q: { type: String, required: true },
  opts: [{ type: String, required: true }],
  ans: { type: String, required: true },
  expl: { type: String },
  tip: { type: String },
  wordId: { type: String, ref: 'Word' } // optional — not all questions map to a single word
}, { timestamps: true });
```

### Progress & Spaced Repetition Schema (`progress.model.js`)
```javascript
const progressSchema = new mongoose.Schema({
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  wordId: { type: String, ref: 'Word', required: true }, // Native reference to Word._id
  status: { type: String, enum: ['learning', 'reviewing', 'mastered'], default: 'learning' },
  nextReviewDate: { type: Date, required: true, default: Date.now },
  interval: { type: Number, default: 0 }, // Spaced repetition interval in days
  easeFactor: { type: Number, default: 2.5 }, // SuperMemo-2 style ease factor
  consecutiveCorrect: { type: Number, default: 0 }
}, { timestamps: true });

progressSchema.index({ studentId: 1, wordId: 1 }, { unique: true });
```

### Staging / Review Queue Schema (`ingest.model.js`)
```javascript
const ingestSchema = new mongoose.Schema({
  type: { type: String, enum: ['word', 'question'], required: true },
  payload: { type: mongoose.Schema.Types.Mixed, required: true }, // The draft word or question object
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  aiDraftedFields: [{ type: String }], // Track which fields were AI-generated
  submittedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  reviewerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });
```

## 3. All API Routes

> **Authentication Policy:**
> - `/ingest/*` routes require Admin authorization (`authorize(['admin'])`).
> - `/progress/*` routes require a logged-in student (`authenticate`).

### Read-Only / Content Delivery
- `GET /api/vocabulary/categories`
- `GET /api/vocabulary/categories/:cat/hub`
- `GET /api/vocabulary/categories/:cat/groups`
  - *Query Params:* `sub` (exam|theme|alpha)
- `GET /api/vocabulary/categories/:cat/words`
  - *Query Params:* `sub` (rep/exam/theme/alpha), `group` (specific exam/theme/letter), `page`, `limit`
- `GET /api/vocabulary/words/:id`
- `GET /api/vocabulary/search`
  - *Query Params:* `q=<term>&cat=<optional>`

### Practice & MCQ
- `GET /api/vocabulary/categories/:cat/practice/mcq`
  - *Query Params:* `sub` (mixed/theme), `group`
  - *Response:* Array of assembled Question objects safely omitting answers: `{ _id, cat, q, opts, wordId }`. *Security: `ans`, `expl`, and `tip` are explicitly excluded.*

### Progress & Tracking
- `POST /api/vocabulary/progress/flashcard`
  - *Request Body:* `{ wordId, selfRating }`
  - *Description:* Self-assessed progress tracking for flashcards. Standard SM-2 adjustments.
- `POST /api/vocabulary/progress/mcq-attempt`
  - *Request Body:* `{ questionId, selectedOption }`
  - *Description:* Server validates option against real answer in DB and returns `{ correct, ans, expl }`. Updates `Progress` for the question's linked `wordId`. *Weighting:* Carries higher confidence multiplier for SM-2 state than flashcards.
- `GET /api/vocabulary/progress/:studentId/due`
  - *Response:* Array of Word objects due for review today.

### Ingestion & AI Pipeline (Admin Only)
- `POST /api/vocabulary/ingest/upload`
- `GET /api/vocabulary/ingest/review-queue`
- `POST /api/vocabulary/ingest/:id/approve`
- `POST /api/vocabulary/ingest/:id/reject`

## 4. AI vs Backend Logic Matrix

| Feature | Responsibility | Description / Rule |
| :--- | :--- | :--- |
| **Filtering & Selectors** | Backend | Deterministic querying based on `sub`, `group`, `mode`. |
| **`rep` Calculation** | Backend | Aggregate counts based on exams array. |
| **MCQ Assembly** | Backend | Random/weighted selection of questions from the DB. |
| **Scoring / Validation** | Backend | Exact match for answers inside `/progress/mcq-attempt`. |
| **Spaced Repetition** | Backend | SM-2 scheduling in `progress.model.js`. MCQ attempts receive higher weight (e.g., 1.5x effect on interval) compared to self-reported flashcard ratings. |
| **Data Dedup & ID Gen** | Backend | IDs are generated by the backend on approval. Schema validation. |
| **Data Extraction (OCR)** | AI-assisted | Extracting text from uploaded images/PDFs. |
| **Categorization** | AI-assisted | Classifying extracted items into the 8 categories. |
| **Drafting Content** | AI-assisted | First draft of `en`, `hi`, `usage`, `daily`, `hook`, `expl`. |
| **Theme Suggestion** | AI-assisted | Clustering words for `theme` metadata. |

## 5. Ingestion Pipeline Flow
*(Identical to previous plan; pending staging -> human review -> auto ID generation -> live)*

## 6. Implementation Checklist

- [ ] **Step 1: Scaffolding & DB Schemas**
  - Create the folder structure inside `src/modules/vocabulary`.
  - Implement Mongoose models (`Word`, `Question`, `Progress`, `Ingest`) utilizing `_id: String` where specified.
  - Implement Mongoose pre-save hooks/Joi validators for content rules (danda, no em-dash).
- [ ] **Step 2: Read-Only Core Endpoints**
  - Implement `GET /categories` and `GET /categories/:cat/hub`.
  - Implement `GET /categories/:cat/groups`.
  - Implement `GET /search`.
  - Implement `GET /categories/:cat/words` with filtering logic (`sub`, `group`).
  - Implement `GET /words/:id`.
- [ ] **Step 3: Practice & MCQ Routes**
  - Implement `GET /categories/:cat/practice/mcq` (stripped of sensitive fields).
- [ ] **Step 4: Progress & Spaced Repetition (AWAITING APPROVAL)**
  - Implement `POST /progress/flashcard` (self-reported SM-2 logic).
  - Implement `POST /progress/mcq-attempt` (server verified evaluation with higher SM-2 weighting applied to the underlying `wordId`). Proposed weighting: Correct MCQ modifies `interval` and `easeFactor` more strongly (e.g. 1.2x boost) while incorrect MCQ penalizes more heavily, given it is an objective failure.
  - Implement `GET /progress/:studentId/due`.
- [ ] **Step 5: Admin Ingestion & Review Queue**
  - Implement staging models and read/write endpoints (`/ingest/review-queue`, `/approve`, `/reject`).
- [ ] **Step 6: AI Extraction Service Integration**
  - Implement the `/ingest/upload` background pipeline calling AI models.
