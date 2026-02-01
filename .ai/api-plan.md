# REST API Plan

## 1. Resources

### 1.1 Profiles
- **Database Table**: `profiles`
- **Description**: User profile metadata extending Supabase `auth.users`
- **Relationships**: One-to-one with `auth.users`
- **Fields**: `id`, `created_at`, `updated_at`

### 1.2 Flashcards
- **Database Table**: `flashcards`
- **Description**: Main entity storing English sentences and Polish translations
- **Relationships**: Many-to-one with `auth.users` (one user has many flashcards)
- **Fields**: `id`, `user_id`, `sentence_en`, `translation_pl`, `source`, `is_edited`, `created_at`, `updated_at`

### 1.3 Generation Sessions
- **Database Table**: `generation_sessions`
- **Description**: Tracks flashcard generation batches for monitoring and retry logic
- **Relationships**: Many-to-one with `auth.users` (one user has many sessions)
- **Fields**: `id`, `user_id`, `input_sentences_count`, `generated_cards_count`, `status`, `error_message`, `duration_ms`, `created_at`, `updated_at`
- **Note**: Primarily for internal tracking; optional API endpoint for user history

## 2. Endpoints

### 2.1 Flashcards

#### GET /api/flashcards
List all flashcards for the authenticated user with optional filtering and search.

**Query Parameters:**
- `source` (optional, string): Filter by source type (`'ai'` or `'manual'`)
- `search` (optional, string): Search term to match against `sentence_en` or `translation_pl` (uses trigram search with GIN indexes)
- `limit` (optional, number): Maximum number of results (default: 100, max: 500)
- `offset` (optional, number): Pagination offset (default: 0)
- `sort` (optional, string): Sort field (`'created_at'` or `'updated_at'`, default: `'created_at'`)
- `order` (optional, string): Sort order (`'asc'` or `'desc'`, default: `'desc'`)

**Request Payload:** None

**Response Payload (200 OK):**
```json
{
  "data": [
    {
      "id": "uuid",
      "sentence_en": "string",
      "translation_pl": "string",
      "source": "ai" | "manual",
      "is_edited": boolean,
      "created_at": "ISO 8601 timestamp",
      "updated_at": "ISO 8601 timestamp"
    }
  ],
  "meta": {
    "total": number,
    "limit": number,
    "offset": number
  }
}
```

**Success Codes:**
- `200 OK`: Successfully retrieved flashcards

**Error Codes:**
- `401 Unauthorized`: User not authenticated
- `500 Internal Server Error`: Database or server error

---

#### GET /api/flashcards/:id
Retrieve a single flashcard by ID.

**Query Parameters:** None

**Request Payload:** None

**Response Payload (200 OK):**
```json
{
  "data": {
    "id": "uuid",
    "sentence_en": "string",
    "translation_pl": "string",
    "source": "ai" | "manual",
    "is_edited": boolean,
    "created_at": "ISO 8601 timestamp",
    "updated_at": "ISO 8601 timestamp"
  }
}
```

**Success Codes:**
- `200 OK`: Successfully retrieved flashcard

**Error Codes:**
- `401 Unauthorized`: User not authenticated
- `403 Forbidden`: User does not own this flashcard (enforced by RLS)
- `404 Not Found`: Flashcard not found
- `500 Internal Server Error`: Database or server error

---

#### POST /api/flashcards
Create a new manual flashcard.

**Query Parameters:** None

**Request Payload:**
```json
{
  "sentence_en": "string",
  "translation_pl": "string"
}
```

**Response Payload (201 Created):**
```json
{
  "data": {
    "id": "uuid",
    "sentence_en": "string",
    "translation_pl": "string",
    "source": "manual",
    "is_edited": false,
    "created_at": "ISO 8601 timestamp",
    "updated_at": "ISO 8601 timestamp"
  }
}
```

**Success Codes:**
- `201 Created`: Flashcard successfully created

**Error Codes:**
- `400 Bad Request`: Validation error (empty fields, exceeds 200 characters)
- `401 Unauthorized`: User not authenticated
- `500 Internal Server Error`: Database or server error

---

#### PUT /api/flashcards/:id
Update an existing flashcard.

**Query Parameters:** None

**Request Payload:**
```json
{
  "sentence_en": "string",
  "translation_pl": "string"
}
```

**Response Payload (200 OK):**
```json
{
  "data": {
    "id": "uuid",
    "sentence_en": "string",
    "translation_pl": "string",
    "source": "ai" | "manual",
    "is_edited": boolean,
    "created_at": "ISO 8601 timestamp",
    "updated_at": "ISO 8601 timestamp"
  }
}
```

**Success Codes:**
- `200 OK`: Flashcard successfully updated

**Error Codes:**
- `400 Bad Request`: Validation error (empty fields, exceeds 200 characters)
- `401 Unauthorized`: User not authenticated
- `403 Forbidden`: User does not own this flashcard (enforced by RLS)
- `404 Not Found`: Flashcard not found
- `500 Internal Server Error`: Database or server error

**Business Logic:**
- If `source` is `'ai'` and flashcard is updated, set `is_edited` to `true`

---

#### DELETE /api/flashcards/:id
Delete a flashcard.

**Query Parameters:** None

**Request Payload:** None

**Response Payload (200 OK):**
```json
{
  "message": "Flashcard deleted successfully"
}
```

**Success Codes:**
- `200 OK`: Flashcard successfully deleted

**Error Codes:**
- `401 Unauthorized`: User not authenticated
- `403 Forbidden`: User does not own this flashcard (enforced by RLS)
- `404 Not Found`: Flashcard not found
- `500 Internal Server Error`: Database or server error

---

### 2.2 Flashcard Generation

#### POST /api/generate
Generate flashcards from input sentences using AI.

**Query Parameters:** None

**Request Payload:**
```json
{
  "sentences": ["string", "string", ...]
}
```

**Response Payload (200 OK):**
```json
{
  "data": {
    "session_id": "uuid",
    "status": "completed" | "partial" | "failed",
    "flashcards": [
      {
        "id": "uuid",
        "sentence_en": "string",
        "translation_pl": "string",
        "source": "ai",
        "is_edited": false,
        "created_at": "ISO 8601 timestamp",
        "updated_at": "ISO 8601 timestamp"
      }
    ],
    "generated_count": number,
    "failed_count": number,
    "duration_ms": number
  }
}
```

**Success Codes:**
- `200 OK`: Generation completed successfully (all or partial)

**Error Codes:**
- `400 Bad Request`: Validation error (invalid sentence count, exceeds character limits, empty sentences)
- `401 Unauthorized`: User not authenticated
- `429 Too Many Requests`: Rate limit exceeded or daily limit reached (100 sentences per user per day)
- `500 Internal Server Error`: AI service error or database error
- `503 Service Unavailable`: AI service temporarily unavailable

**Business Logic:**
- Validates input: 5-30 non-empty sentences, max 200 characters per sentence
- Ignores empty lines
- Creates a `generation_sessions` record with status `'pending'` or `'processing'`
- Calls OpenRouter.ai API to generate translations
- Creates flashcards with `source='ai'` and `is_edited=false`
- Updates session status: `'completed'`, `'partial'`, or `'failed'`
- Tracks duration and error messages in session record
- Enforces daily limit (100 sentences per user per day) and rate limiting
- Returns partial results if some generations fail (status `'partial'`)

---

### 2.3 Profile

#### GET /api/profile
Retrieve the authenticated user's profile.

**Query Parameters:** None

**Request Payload:** None

**Response Payload (200 OK):**
```json
{
  "data": {
    "id": "uuid",
    "created_at": "ISO 8601 timestamp",
    "updated_at": "ISO 8601 timestamp"
  }
}
```

**Success Codes:**
- `200 OK`: Successfully retrieved profile

**Error Codes:**
- `401 Unauthorized`: User not authenticated
- `404 Not Found`: Profile not found (should be auto-created on user signup via trigger)
- `500 Internal Server Error`: Database or server error

---

#### DELETE /api/profile
Delete the authenticated user's account and all associated data.

**Query Parameters:** None

**Request Payload:** None

**Response Payload (200 OK):**
```json
{
  "message": "Account and all data deleted successfully"
}
```

**Success Codes:**
- `200 OK`: Account successfully deleted

**Error Codes:**
- `401 Unauthorized`: User not authenticated
- `500 Internal Server Error`: Database or server error

**Business Logic:**
- Deletes user's profile (CASCADE deletes flashcards and generation_sessions via foreign keys)
- Deletes user from Supabase Auth (requires Supabase Admin API)
- All related data is automatically removed due to CASCADE constraints

---

## 3. Authentication and Authorization

### 3.1 Authentication Mechanism
- **Provider**: Supabase Auth
- **Methods**: Email + Password or Magic Link (as per PRD FR-001)
- **Session Management**: Handled by Supabase Auth (JWT tokens)
- **Session Persistence**: Maintained across page refreshes (FR-002)
- **Implementation**: Use `context.locals.supabase` in Astro API routes (per cursor rules)

### 3.2 Authorization Implementation
- **Row-Level Security (RLS)**: Enabled on all tables (`profiles`, `flashcards`, `generation_sessions`)
- **API-Level Authorization**: All endpoints (except authentication) require valid Supabase JWT token
- **Token Validation**: Extract user from `context.locals.supabase.auth.getUser()` in Astro middleware
- **User Context**: User ID extracted from authenticated session for database queries
- **Access Control**: Users can only access their own resources (enforced by RLS policies)

### 3.3 Implementation Details
- **Middleware**: Astro middleware (`src/middleware/index.ts`) validates authentication for API routes
- **Supabase Client**: Use `context.locals.supabase` from Astro context (per cursor rules)
- **Error Handling**: Returns `401 Unauthorized` for missing or invalid tokens
- **RLS Policies**: 
  - `profiles`: Users can only SELECT, INSERT, UPDATE, DELETE their own profile
  - `flashcards`: Users can only SELECT, INSERT, UPDATE, DELETE their own flashcards
  - `generation_sessions`: Users can only SELECT, INSERT, UPDATE, DELETE their own sessions

---

## 4. Validation and Business Logic

### 4.1 Flashcard Validation

#### Create/Update Flashcard
- **sentence_en**:
  - Required (NOT NULL)
  - Non-empty string (CHECK: LENGTH(sentence_en) > 0)
  - Maximum 200 characters (application-level validation, per FR-004)
- **translation_pl**:
  - Required (NOT NULL)
  - Non-empty string (CHECK: LENGTH(translation_pl) > 0)
  - Maximum 200 characters (application-level validation, per FR-004)
- **source**:
  - Automatically set to `'manual'` for POST /api/flashcards
  - Automatically set to `'ai'` for generated flashcards
  - Valid values: `'ai'` or `'manual'` (CHECK constraint in database)
- **is_edited**:
  - Automatically set to `false` for new flashcards
  - Set to `true` when updating an AI-generated flashcard (source='ai')

### 4.2 Generation Request Validation

#### POST /api/generate
- **sentences** (array):
  - Required
  - Minimum 5 non-empty sentences (FR-004, enforced by database CHECK: input_sentences_count >= 5)
  - Maximum 30 non-empty sentences (FR-004, enforced by database CHECK: input_sentences_count <= 30)
  - Each sentence: maximum 200 characters (FR-004, application-level)
  - Empty lines are ignored (FR-004)
  - Duplicates may be optionally removed (FR-004, optional feature)

### 4.3 Generation Session Validation

#### Generation Session Record
- **input_sentences_count**:
  - Required (NOT NULL)
  - Range: 5-30 (CHECK: input_sentences_count >= 5 AND input_sentences_count <= 30)
- **generated_cards_count**:
  - Required (NOT NULL)
  - Default: 0
  - Non-negative (CHECK: generated_cards_count >= 0)
- **status**:
  - Required (NOT NULL)
  - Default: `'pending'`
  - Valid values: `'pending'`, `'processing'`, `'completed'`, `'partial'`, `'failed'` (CHECK constraint)
- **duration_ms**:
  - Optional (NULL allowed)
  - Non-negative if provided (CHECK: duration_ms >= 0)

### 4.4 Business Logic Implementation

#### Flashcard Generation (POST /api/generate)
1. **Input Validation**:
   - Validate sentence count (5-30 non-empty sentences)
   - Validate character limits (max 200 per sentence)
   - Remove empty lines
   - Optionally remove duplicates (if feature enabled)

2. **Session Creation**:
   - Create `generation_sessions` record with status `'processing'`
   - Store `input_sentences_count` (count of non-empty sentences after filtering)
   - Initialize `generated_cards_count` to 0

3. **AI Generation**:
   - Call OpenRouter.ai API for each sentence
   - Generate `sentence_en` (English sentence) and `translation_pl` (Polish translation)
   - Maintain 1:1 mapping between input sentence and generated flashcard (FR-006)

4. **Quality Validation** (FR-009):
   - Verify number of generated flashcards equals number of input sentences
   - Verify all `sentence_en` and `translation_pl` fields are non-empty
   - If validation fails, mark problematic flashcards and prevent saving (or allow editing before save)

5. **Flashcard Creation**:
   - Create flashcards with `source='ai'` and `is_edited=false`
   - Associate flashcards with user_id from authenticated session

6. **Session Update**:
   - Update `generated_cards_count`
   - Set status: `'completed'` (all successful), `'partial'` (some failed), or `'failed'` (all failed)
   - Store `error_message` if generation failed
   - Calculate and store `duration_ms`

7. **Error Handling** (FR-008):
   - Handle partial failures: return generated flashcards with status `'partial'`
   - Provide clear error messages for retry
   - Allow retry without duplicating successfully generated flashcards

8. **Rate Limiting** (FR-016):
   - Enforce daily limit: 100 sentences per user per day
   - Implement rate limiting on endpoint (e.g., max requests per minute)
   - Return `429 Too Many Requests` when limits exceeded
   - Check daily limit by querying `generation_sessions` for user's today's total `input_sentences_count`

#### Flashcard Update (PUT /api/flashcards/:id)
1. **Ownership Verification**:
   - Verified by RLS policies (user_id = auth.uid())

2. **Edit Tracking**:
   - If `source='ai'`, set `is_edited=true` after update
   - Track edit event for telemetry (FR-017)

3. **Validation**:
   - Validate updated fields (non-empty, max 200 characters)

#### Flashcard Deletion (DELETE /api/flashcards/:id)
1. **Ownership Verification**:
   - Verified by RLS policies (user_id = auth.uid())

2. **Hard Delete**:
   - Permanently delete flashcard (no soft delete per PRD)
   - Optionally track deletion event for telemetry (FR-017)

#### Account Deletion (DELETE /api/profile)
1. **Cascade Delete**:
   - Delete user's profile (triggers CASCADE delete of flashcards and generation_sessions via foreign keys)
   - Delete user from Supabase Auth (requires Supabase Admin API)

2. **Data Removal**:
   - All user data permanently removed (FR-015)

### 4.5 Telemetry and Metrics (FR-017)

#### Events Tracked
- **generate_requested**: Number of input sentences, timestamp (stored in `generation_sessions`)
- **generate_succeeded**: Number of generated flashcards, duration_ms (stored in `generation_sessions`)
- **generate_failed**: Error type, session_id (stored in `generation_sessions.error_message`)
- **card_edited**: Flashcard source, timestamp (when PUT /api/flashcards/:id updates AI-generated card, `is_edited` flag set)
- **card_deleted**: Optional, timestamp (can be tracked via application logs)
- **limit_reached**: Daily limit or rate limit type (returned as 429 error)

#### Implementation
- Events stored in `generation_sessions` table (for generation events)
- Edit tracking via `is_edited` flag in `flashcards` table
- Metrics calculated from database records for success metrics (SM-001, SM-002, SM-003, SM-004)

### 4.6 Performance Requirements (NFR-001)

#### Generation Performance
- **SLO**: Generation completes within 20 seconds for 30 sentences
- **Measurement**: Track `duration_ms` in `generation_sessions`
- **Optimization**: Consider batch processing or parallel API calls to OpenRouter.ai

### 4.7 Search and Filtering (FR-012)

#### Text Search Implementation
- **Database**: Use GIN indexes with `pg_trgm` extension for full-text search
- **Search Fields**: `sentence_en` and `translation_pl`
- **Query**: Use PostgreSQL trigram similarity (`similarity()` function) or `ILIKE` for pattern matching
- **Performance**: Indexes (`idx_flashcards_text_search_en`, `idx_flashcards_text_search_pl`) support efficient search
- **Implementation**: Can use database function `show_trgm` if available, or implement search in API using `ILIKE '%search%'` with GIN index support

---

## 5. Assumptions and Notes

### 5.1 Assumptions
1. **Authentication**: Supabase Auth handles all authentication flows (signup, login, logout, session management). API endpoints assume authenticated requests.
2. **Profile Creation**: Profile is automatically created when user signs up (via database trigger `on_auth_user_created`).
3. **Generation Processing**: Generation is synchronous (returns 200 OK with results). Can be extended to async if needed.
4. **Error Messages**: Error messages are user-friendly and do not expose sensitive system details.
5. **Pagination**: Default pagination limits prevent excessive data transfer. Maximum limits prevent abuse.
6. **RLS**: Row-Level Security is enabled in production but may be disabled for local development (as per migration file).

### 5.2 Out of Scope (Not in API)
- User registration and login endpoints (handled by Supabase Auth SDK)
- Password reset (handled by Supabase Auth)
- Email verification (handled by Supabase Auth)
- File upload/import (out of scope per PRD)
- Flashcard collections/decks (single default collection per PRD)
- Sharing between users (out of scope per PRD)
- Generation session history endpoint (sessions are for internal tracking; can be added if needed for UI)

### 5.3 Implementation Notes
- Use Zod schemas for request validation (per cursor rules)
- Use `context.locals.supabase` instead of importing supabaseClient directly (per cursor rules)
- Use SupabaseClient type from `src/db/supabase.client.ts` (per cursor rules)
- API routes should use `export const prerender = false` (per Astro guidelines)
- Use uppercase HTTP methods (GET, POST, PUT, DELETE) in Astro endpoint handlers
