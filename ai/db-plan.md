# Database Schema Plan - FiszkiAI MVP

## Overview

This document defines the PostgreSQL database schema for FiszkiAI MVP, designed to support flashcard generation and user management. The schema is optimized for Supabase (PostgreSQL) and follows best practices for security, performance, and maintainability.

## 1. Tables

### 1.1 profiles

Extends Supabase's `auth.users` table to store user-specific metadata.

| Column Name | Data Type | Constraints | Description |
|------------|-----------|-------------|-------------|
| `id` | UUID | PRIMARY KEY, NOT NULL, REFERENCES auth.users(id) ON DELETE CASCADE | User identifier, matches auth.users.id |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT now() | Account creation timestamp |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT now() | Last profile update timestamp |

**Notes:**
- One-to-one relationship with `auth.users`
- Automatically created when user signs up (via trigger or application logic)
- CASCADE delete ensures profile is removed when auth user is deleted

### 1.2 flashcards

Main entity storing user flashcards with English sentences and Polish translations.

| Column Name | Data Type | Constraints | Description |
|------------|-----------|-------------|-------------|
| `id` | UUID | PRIMARY KEY, NOT NULL, DEFAULT gen_random_uuid() | Unique flashcard identifier |
| `user_id` | UUID | NOT NULL, REFERENCES auth.users(id) ON DELETE CASCADE | Owner of the flashcard |
| `sentence_en` | TEXT | NOT NULL, CHECK (LENGTH(sentence_en) > 0) | English sentence (front of card) |
| `translation_pl` | TEXT | NOT NULL, CHECK (LENGTH(translation_pl) > 0) | Polish translation (back of card) |
| `source` | VARCHAR(20) | NOT NULL, DEFAULT 'ai', CHECK (source IN ('ai', 'manual')) | Source of flashcard creation |
| `is_edited` | BOOLEAN | NOT NULL, DEFAULT false | Whether AI-generated card was edited |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT now() | Creation timestamp |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT now() | Last update timestamp |

**Notes:**
- Many-to-one relationship with `auth.users` (one user has many flashcards)
- Text fields use TEXT type (unlimited length); 200-character limit enforced at application level
- `is_edited` tracks if an AI-generated card (source='ai') was modified by user
- Hard deletes (no soft delete) as per PRD requirements

### 1.3 generation_sessions

Tracks flashcard generation batches for monitoring, retry logic, and partial failure handling.

| Column Name | Data Type | Constraints | Description |
|------------|-----------|-------------|-------------|
| `id` | UUID | PRIMARY KEY, NOT NULL, DEFAULT gen_random_uuid() | Unique session identifier |
| `user_id` | UUID | NOT NULL, REFERENCES auth.users(id) ON DELETE CASCADE | User who initiated generation |
| `input_sentences_count` | INTEGER | NOT NULL, CHECK (input_sentences_count >= 5 AND input_sentences_count <= 30) | Number of input sentences in batch |
| `generated_cards_count` | INTEGER | NOT NULL, DEFAULT 0, CHECK (generated_cards_count >= 0) | Number of successfully generated flashcards |
| `status` | VARCHAR(20) | NOT NULL, DEFAULT 'pending', CHECK (status IN ('pending', 'processing', 'completed', 'partial', 'failed')) | Current session status |
| `error_message` | TEXT | NULL | Error details if generation failed |
| `duration_ms` | INTEGER | NULL, CHECK (duration_ms >= 0) | Generation duration in milliseconds |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT now() | Session creation timestamp |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT now() | Last status update timestamp |

**Notes:**
- Many-to-one relationship with `auth.users` (one user has many sessions)
- Supports tracking partial failures (status='partial') as per FR-008
- Duration tracking for performance metrics (SLO: <= 20s for 30 sentences)
- Original input sentences are not stored (simplest approach, per planning decisions)


## 2. Relationships

### 2.1 Entity Relationship Diagram

```
auth.users (Supabase managed)
    │
    ├── 1:1 ──> profiles
    │
    ├── 1:N ──> flashcards
    │
    └── 1:N ──> generation_sessions
```

### 2.2 Relationship Details

1. **auth.users → profiles** (One-to-One)
   - Each authenticated user has exactly one profile
   - Profile is created when user signs up
   - CASCADE delete: profile removed when user deleted

2. **auth.users → flashcards** (One-to-Many)
   - Each user can have many flashcards
   - CASCADE delete: all user's flashcards removed when user deleted
   - Foreign key ensures data integrity

3. **auth.users → generation_sessions** (One-to-Many)
   - Each user can have many generation sessions
   - CASCADE delete: all user's sessions removed when user deleted
   - Tracks generation history per user

## 3. Indexes

### 3.1 flashcards Table

| Index Name | Columns | Type | Purpose |
|-----------|---------|------|---------|
| `idx_flashcards_user_id` | `user_id` | B-tree | Fast user-specific queries (RLS, list views) |
| `idx_flashcards_source` | `source` | B-tree | Filter by AI vs manual cards |
| `idx_flashcards_created_at` | `created_at` | B-tree | Sort by creation date |
| `idx_flashcards_user_source` | `(user_id, source)` | B-tree | Composite index for filtered user queries |
| `idx_flashcards_text_search_en` | `sentence_en` | GIN (pg_trgm) | Full-text search on English sentences |
| `idx_flashcards_text_search_pl` | `translation_pl` | GIN (pg_trgm) | Full-text search on Polish translations |

**Notes:**
- GIN indexes require `pg_trgm` extension for trigram-based text search
- Supports efficient filtering per FR-012 (search in EN or PL)

### 3.2 generation_sessions Table

| Index Name | Columns | Type | Purpose |
|-----------|---------|------|---------|
| `idx_generation_sessions_user_id` | `user_id` | B-tree | Fast user-specific session queries |
| `idx_generation_sessions_created_at` | `created_at` | B-tree | Sort sessions by date |
| `idx_generation_sessions_status` | `status` | B-tree | Filter by session status |
| `idx_generation_sessions_user_created` | `(user_id, created_at DESC)` | B-tree | Composite index for user's recent sessions |

### 3.3 profiles Table

| Index Name | Columns | Type | Purpose |
|-----------|---------|------|---------|
| `idx_profiles_id` | `id` | B-tree, PRIMARY KEY | Primary key index (automatic) |

## 4. Row-Level Security (RLS) Policies

All tables except `auth.users` (Supabase managed) have RLS enabled. Policies are granular: one policy per operation (SELECT, INSERT, UPDATE, DELETE) for authenticated users.

### 4.1 profiles

**RLS Enabled:** Yes

| Policy Name | Operation | Role | Policy Definition | Description |
|------------|-----------|------|-------------------|-------------|
| `profiles_select_own` | SELECT | authenticated | `id = auth.uid()` | Users can read their own profile |
| `profiles_insert_own` | INSERT | authenticated | `id = auth.uid()` | Users can create their own profile |
| `profiles_update_own` | UPDATE | authenticated | `id = auth.uid()` | Users can update their own profile |
| `profiles_delete_own` | DELETE | authenticated | `id = auth.uid()` | Users can delete their own profile |

### 4.2 flashcards

**RLS Enabled:** Yes

| Policy Name | Operation | Role | Policy Definition | Description |
|------------|-----------|------|-------------------|-------------|
| `flashcards_select_own` | SELECT | authenticated | `user_id = auth.uid()` | Users can read their own flashcards |
| `flashcards_insert_own` | INSERT | authenticated | `user_id = auth.uid()` | Users can create flashcards for themselves |
| `flashcards_update_own` | UPDATE | authenticated | `user_id = auth.uid()` | Users can update their own flashcards |
| `flashcards_delete_own` | DELETE | authenticated | `user_id = auth.uid()` | Users can delete their own flashcards |

**Notes:**
- Enforces NFR-002: users can only access their own flashcards
- Supports FR-011 (list), FR-013 (edit), FR-014 (delete)

### 4.3 generation_sessions

**RLS Enabled:** Yes

| Policy Name | Operation | Role | Policy Definition | Description |
|------------|-----------|------|-------------------|-------------|
| `generation_sessions_select_own` | SELECT | authenticated | `user_id = auth.uid()` | Users can read their own sessions |
| `generation_sessions_insert_own` | INSERT | authenticated | `user_id = auth.uid()` | Users can create sessions for themselves |
| `generation_sessions_update_own` | UPDATE | authenticated | `user_id = auth.uid()` | Users can update their own sessions |
| `generation_sessions_delete_own` | DELETE | authenticated | `user_id = auth.uid()` | Users can delete their own sessions |


## 5. Additional Design Decisions and Notes

### 5.1 Data Types

- **UUID**: Used for all primary keys and foreign keys for better distribution and security
- **TEXT**: Used for sentence fields (unlimited length); 200-character limit enforced at application level (FR-004)
- **TIMESTAMPTZ**: All timestamps use timezone-aware type for consistency across timezones
- **VARCHAR**: Used for enum-like fields (source, status) for simplicity; CHECK constraints enforce valid values

### 5.2 Constraints

- **NOT NULL**: Applied to all critical fields to ensure data integrity
- **CHECK constraints**: Enforce business rules (e.g., sentence count 5-30, status values, non-empty text)
- **Foreign keys with CASCADE**: Ensure referential integrity; user deletion removes all related data (FR-015)

### 5.3 Normalization

Schema follows 3NF (Third Normal Form):
- No redundant data storage
- Each entity in separate table
- Foreign keys maintain relationships
- No denormalization needed for MVP scale (dozens to hundreds of users)

### 5.4 Performance Considerations

- Indexes optimized for common query patterns:
  - User-specific queries (user_id indexes)
  - Filtering by source/status (source, status indexes)
  - Text search (GIN indexes with pg_trgm)
  - Time-based queries (created_at indexes)
- Composite indexes for multi-column queries
- GIN indexes for efficient full-text search (FR-012)

### 5.5 Security

- RLS enabled on all user-accessible tables
- Granular policies (one per operation) for maintainability
- All policies use `auth.uid()` to ensure users only access their own data
- Foreign key constraints prevent orphaned records
- CASCADE deletes ensure complete data removal on account deletion (FR-015)

### 5.6 Scalability

- Schema designed for small scale (dozens to hundreds of users) per PRD
- Indexes support efficient queries at this scale
- No partitioning needed for MVP

### 5.7 Missing Features (Out of Scope for MVP)

- No flashcard collections/decks (single default collection per PRD)
- No tags or categories
- No difficulty levels
- No audio or IPA support
- No sharing between users
- No import from files
- No advanced spaced repetition algorithms
- No history/versioning of flashcard edits

### 5.8 Migration Considerations

- All tables should be created in a single migration file
- Enable RLS immediately after table creation
- Create indexes after table creation for better performance
- Add triggers for `updated_at` timestamp updates (if not handled in application)
- Consider adding trigger to auto-create profile on user signup

### 5.9 Extensions Required

- `pg_trgm`: For trigram-based text search indexes on flashcards
  ```sql
  CREATE EXTENSION IF NOT EXISTS pg_trgm;
  ```

### 5.10 Triggers (Optional but Recommended)

- **updated_at trigger**: Automatically update `updated_at` timestamp on row updates
  - Apply to: profiles, flashcards, generation_sessions
- **profile creation trigger**: Automatically create profile when user signs up
  - Trigger on `auth.users` INSERT to create corresponding profile record
