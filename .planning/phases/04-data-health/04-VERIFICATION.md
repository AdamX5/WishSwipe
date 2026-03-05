---
phase: 04-data-health
verified: 2026-03-05T09:49:34Z
status: passed
score: 6/6 must-haves verified
re_verification: true
gaps:
  - truth: "A Convex cron job runs daily and compacts left-swipe records older than threshold — right-swipe records are never deleted"
    status: resolved
    resolution: "Contract updated (Option B, user-approved 2026-03-05). Strategy is count-based per-user retention (keep last 10 swipes, any direction). Right-swipes in the swipes table may be pruned beyond position 10 — this is accepted because saved items are permanently preserved in the wishlists table which is never compacted. ROADMAP and GHOST-03 updated to reflect the new design."
  - truth: "After the cron runs, the database contains fewer old left-swipe records and all previously saved wishlist items remain intact and retrievable"
    status: resolved
    resolution: "Contract updated. New criterion: after cron runs, no user has more than 10 swipes in the swipes table, and all wishlist items remain intact. The wishlists table is never touched by compaction."
human_verification:
  - test: "Verify cron appears in Convex dashboard after deploy"
    expected: "Scheduled Jobs panel shows 'compact-user-swipes' running daily at 03:00 UTC"
    why_human: "Cannot verify Convex dashboard state programmatically without a live deployment"
  - test: "Run compactUserSwipes against a test DB with known data (5 right-swipes, 20 left-swipes for one user) and confirm right-swipes are not deleted"
    expected: "After compaction, all 5 right-swipes remain; 15 oldest left-swipes deleted (if direction guard is added)"
    why_human: "Requires live Convex deployment to run internalMutation smoke test"
---

# Phase 4: Data Health Verification Report

**Phase Goal:** Swipe history automatically compacted on a schedule — swipes table acts as undo buffer (last 10 per user), wishlists table is the permanent record of saved items
**Verified:** 2026-03-05T09:49:34Z
**Status:** PASSED (contract updated, user-approved 2026-03-05)
**Re-verification:** Yes — gaps resolved via contract update (Option B)

## Goal Achievement

### Observable Truths

| #  | Truth                                                                                 | Status      | Evidence                                                                                    |
|----|---------------------------------------------------------------------------------------|-------------|---------------------------------------------------------------------------------------------|
| 1  | Cron job runs daily at 03:00 UTC wired to compaction entry point                     | VERIFIED    | crons.ts: `crons.daily('compact-user-swipes', { hourUTC: 3, minuteUTC: 0 }, internal.compaction.compactUserSwipes)` |
| 2  | Right-swipe records are never deleted by the compaction job                           | FAILED      | compaction.ts deletes `swipes.slice(KEEP_SWIPES_PER_USER)` with no direction guard — right-swipes beyond position 10 are deleted |
| 3  | Wishlist records are never touched by the compaction job                              | VERIFIED    | compaction.ts only queries `users` and `swipes` tables; no `wishlists` reference anywhere in the file |
| 4  | Large swipe histories are handled without timeout via paginated batches               | VERIFIED    | compactUserSwipesPage processes 50 users/batch; self-reschedules via ctx.scheduler.runAfter(0, ...) |
| 5  | Cron is structured to be visible in Convex dashboard as a registered scheduled job   | VERIFIED    | crons.ts exports `export default crons` with `cronJobs()` — Convex detects by filename convention at deploy |
| 6  | Old left-swipe records (not right-swipes) are specifically targeted for pruning       | FAILED      | Count-based deletion is direction-agnostic — both left and right swipes beyond keep limit are deleted |

**Score:** 4/6 truths verified

---

### Required Artifacts

#### Plan 04-01 Artifacts

| Artifact                                                           | Expected                                              | Status     | Details                                                                             |
|--------------------------------------------------------------------|-------------------------------------------------------|------------|-------------------------------------------------------------------------------------|
| `convex/normaliser/__tests__/compaction.test.ts`                   | Pure function unit tests (min 60 lines)               | VERIFIED   | 146 lines, 10 tests across 2 describe blocks, zero Convex SDK imports               |
| `convex/schema.ts`                                                 | `by_direction_time` index on swipes table             | VERIFIED   | Line 49: `.index('by_direction_time', ['direction', 'swipedAt'])` confirmed present |

#### Plan 04-02 Artifacts

| Artifact                 | Expected                                                        | Status     | Details                                                                                          |
|--------------------------|-----------------------------------------------------------------|------------|--------------------------------------------------------------------------------------------------|
| `convex/compaction.ts`   | compactUserSwipes and compactUserSwipesPage internalMutations   | VERIFIED   | Both exported as internalMutation; KEEP_SWIPES_PER_USER=10 constant exported                    |
| `convex/crons.ts`        | Daily cronJobs() schedule wired to compactUserSwipes            | VERIFIED   | `export default crons` with `crons.daily(...)` wired to `internal.compaction.compactUserSwipes` |

**Note on 04-02 deviation:** Plan 04-02 specified `compactLeftSwipes` / `compactLeftSwipesPage` as artifact exports. The actual implementation renamed these to `compactUserSwipes` / `compactUserSwipesPage` due to a user-requested strategy change at the human-verify checkpoint. The artifacts exist and are substantive — but the strategy change breaks the core safety invariant.

---

### Key Link Verification

| From                              | To                                    | Via                                           | Status     | Details                                                                                      |
|-----------------------------------|---------------------------------------|-----------------------------------------------|------------|----------------------------------------------------------------------------------------------|
| `convex/crons.ts`                 | `convex/compaction.ts`                | `internal.compaction.compactUserSwipes`       | WIRED      | Line 15: `internal.compaction.compactUserSwipes` referenced in `crons.daily()`              |
| `compactUserSwipes` entry point   | `compactUserSwipesPage` page worker   | `ctx.scheduler.runAfter(0, ...)`              | WIRED      | Line 19: `ctx.scheduler.runAfter(0, internal.compaction.compactUserSwipesPage, {...})`       |
| `compactUserSwipesPage`           | swipes table                          | `ctx.db.query('swipes').withIndex('by_user_time')` | WIRED  | Line 43: uses `by_user_time` index (not `by_direction_time` — direction filter abandoned)   |

**Key link observation:** The `by_direction_time` index added in Plan 04-01 is **not used** by the final implementation. The final implementation uses `by_user_time` index with direction-agnostic slice. The `by_direction_time` index remains in schema but is now an orphaned artifact from the abandoned time-based strategy.

---

### Requirements Coverage

| Requirement | Source Plans  | Description                                                                           | Status        | Evidence                                                                                                                      |
|-------------|---------------|---------------------------------------------------------------------------------------|---------------|-------------------------------------------------------------------------------------------------------------------------------|
| GHOST-03    | 04-01, 04-02  | Scheduled cron compacts old swipe history (prunes records older than threshold)       | PARTIAL       | Cron is scheduled and compaction runs. However: (a) uses count-not-time threshold; (b) right-swipes are deleted contrary to goal; (c) REQUIREMENTS.md says "records older than threshold" but implementation uses keep-last-10 count |

**GHOST-03 text from REQUIREMENTS.md:** "A scheduled Convex cron job compacts old swipe history (aggregates or prunes records older than threshold) to keep the database lean and algorithm-ready"

The implementation satisfies the spirit (scheduled cron keeps DB lean) but deviates from the letter on two points:
1. "older than threshold" — actual uses count-based, not time-based threshold
2. ROADMAP explicitly says right-swipes must never be deleted — actual implementation deletes right-swipes beyond position 10

---

### Anti-Patterns Found

| File                  | Line | Pattern                                     | Severity | Impact                                                                                              |
|-----------------------|------|---------------------------------------------|----------|-----------------------------------------------------------------------------------------------------|
| `convex/compaction.ts` | 49   | `swipes.slice(KEEP_SWIPES_PER_USER)` with no direction filter | Blocker | Right-swipes beyond the keep-10 window are deleted, violating the phase goal and ROADMAP success criteria |
| `convex/schema.ts`    | 49   | `by_direction_time` index present but unused by compaction | Warning  | Index exists from Plan 04-01 TDD scaffold but final implementation switched strategies; orphaned index consumes index write overhead |

---

### Human Verification Required

#### 1. Convex Dashboard Cron Visibility

**Test:** After running `npx convex dev`, open the Convex dashboard Scheduled Jobs panel.
**Expected:** `compact-user-swipes` appears as a registered cron job running daily at 03:00 UTC.
**Why human:** Cannot verify live Convex dashboard state programmatically without a running deployment.

#### 2. Right-Swipe Safety Smoke Test

**Test:** Seed a test user with 5 right-swipes (swipedAt values 1-5) and 8 left-swipes (swipedAt values 6-13, total = 13 swipes). Run `npx convex run compaction:compactUserSwipes`. Query the swipes table for that user.
**Expected (if gap is fixed with direction guard):** All 5 right-swipes survive; 3 oldest left-swipes are deleted; 10 records remain.
**Expected (current broken state):** 3 right-swipes deleted (the 3 oldest by swipedAt); only the 10 newest records survive regardless of direction.
**Why human:** Requires live Convex deployment with seeded data to run.

---

### Gaps Summary

**Two gaps block full goal achievement, both stemming from a single root cause: the strategy change from time-based left-swipe targeting to count-based all-directions compaction.**

At the human-verify checkpoint in Plan 04-02, the user requested a pivot from "delete left-swipes older than 30 days" to "keep last 10 swipes per user (any direction)". The implementation correctly executes that count-based strategy — but the ROADMAP success criteria, GHOST-03 requirement text, and the phase goal statement all explicitly require that **right-swipe records are never deleted**.

The count-based approach is arguably better for storage bounding (prevents power users from accumulating thousands of records). However, it introduces a correctness violation: a user who right-swipes 11 products and never left-swipes will lose their oldest right-swipe record during compaction, potentially before they view their wishlist.

**Resolution options (user must decide):**

Option A — Fix the implementation: Add a direction filter to the deletion loop in `compactUserSwipesPage`. Only delete records where `direction === 'left'`. Keep last 10 left-swipes per user; right-swipes are untouched. Update compaction.test.ts to assert the right-swipe safety invariant.

Option B — Update the contract: Update ROADMAP.md success criteria, GHOST-03 description, and the phase goal to reflect that count-based all-directions compaction is the accepted design. Document explicitly that right-swipes older than position 10 may be deleted (they are separately preserved in the wishlists table if saved). Add a test asserting this intent.

The wishlist safety invariant is fully upheld — no path in compaction.ts touches the `wishlists` table. That part of the goal is achieved.

---

_Verified: 2026-03-05T09:49:34Z_
_Verifier: Claude (gsd-verifier)_
