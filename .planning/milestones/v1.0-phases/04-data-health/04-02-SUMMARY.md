---
phase: 04-data-health
plan: 02
subsystem: database
tags: [convex, compaction, cron, swipes, per-user-retention]

# Dependency graph
requires:
  - phase: 04-01
    provides: by_direction_time index added to swipes table + Wave 0 RED test scaffold

provides:
  - Count-based per-user swipe compaction (keep last 10 per user, delete the rest)
  - Daily cron at 03:00 UTC wired to compactUserSwipes internalMutation
  - Paginated user-by-user deletion avoiding mutation timeout (50 users/batch)
  - 10 passing unit tests for count-based retention logic

affects: [future swipe engine changes, any phase reading swipe history]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Per-user count-based retention via by_user_time index + .order('desc') + .slice(KEEP)
    - Paginated cron worker pattern: entry point schedules paginated page worker via ctx.scheduler.runAfter
    - Users-as-cursor pagination: iterate users table in batches, process each user's swipes inside

key-files:
  created: []
  modified:
    - convex/compaction.ts
    - convex/crons.ts
    - convex/normaliser/__tests__/compaction.test.ts

key-decisions:
  - "Count-based per-user retention (KEEP=10) instead of time-based 30-day cutoff — user requested lean memory footprint with undo support"
  - "All swipe directions count against the limit (not just left) — simplifies logic and keeps per-user storage bounded regardless of swipe pattern"
  - "Renamed entry point compactLeftSwipes → compactUserSwipes and cron name compact-old-left-swipes → compact-user-swipes to reflect strategy change"
  - "Paginate users in batches of 50; collect all swipes per user via by_user_time index — acceptable because per-user swipe count is bounded by KEEP_SWIPES_PER_USER after first run"

patterns-established:
  - "Compaction entry point + page worker pair: entry fires once from cron, page worker self-reschedules until done — avoids single-mutation budget risk"
  - "Pure inline helper functions in test file (SDK-free) mirror the Convex handler logic for unit-testable behavioral contracts"

requirements-completed: [GHOST-03]

# Metrics
duration: 8min
completed: 2026-03-05
---

# Phase 4 Plan 02: Data Health — Compaction Summary

**Count-based per-user swipe retention: daily cron keeps last 10 swipes per user via paginated internalMutation pair, supporting undo while bounding storage growth**

## Performance

- **Duration:** ~8 min
- **Started:** 2026-03-05T09:20:00Z
- **Completed:** 2026-03-05T09:28:00Z
- **Tasks:** 1 (continuation from checkpoint — revised implementation)
- **Files modified:** 3

## Accomplishments

- Rewrote compaction strategy from time-based (30-day cutoff, left-swipes only) to count-based per-user (keep last 10, all directions)
- `compactUserSwipes` entry point + `compactUserSwipesPage` paginated worker using `by_user_time` index
- Daily cron at 03:00 UTC wired to renamed handler in `crons.ts`
- 10 new unit tests covering exact, under, over, direction-agnostic, and insertion-order-independent scenarios — all GREEN

## Task Commits

1. **Tasks 1+2 (from prior agent — time-based)** - `0d57c99` (feat: initial compaction.ts time-based)
2. **Cron wiring (from prior agent)** - `1bc5347` (feat: crons.ts daily schedule)
3. **Revised to count-based** - `5dbbf08` (feat: count-based per-user retention, 10 tests GREEN)

## Files Created/Modified

- `convex/compaction.ts` - Rewrote: compactUserSwipes + compactUserSwipesPage internalMutations; KEEP_SWIPES_PER_USER=10; uses by_user_time index
- `convex/crons.ts` - Updated cron name and entry point reference to match renamed handler
- `convex/normaliser/__tests__/compaction.test.ts` - Rewrote: 10 count-based tests (getSwipesToDelete + compactUserSwipes pure functions), all GREEN

## Decisions Made

- **Count-based vs time-based:** Original plan used time-based 30-day cutoff. User feedback at checkpoint requested count-based retention (last 10 swipes) to keep memory lean as user count grows. Count-based is strictly better for this use case: time-based lets a very active user accumulate thousands of records; count-based guarantees O(N users) storage.
- **All directions count:** Both left and right swipes count against the KEEP limit. Simplifies logic and makes the storage bound unconditional. Wishlist records (right-swipes that were saved) live in the `wishlists` table — the swipes table is event log only.
- **KEEP_SWIPES_PER_USER = 10:** Gives undo buffer for the last 10 actions. Exported as named constant so it can be adjusted without hunting through code.
- **Rename compactLeftSwipes → compactUserSwipes:** The old name implied left-swipe-only targeting, which is incorrect under the new strategy.

## Deviations from Plan

The original plan (04-02-PLAN.md) specified:
- Time-based deletion: left-swipes older than 30 days
- `by_direction_time` index for filtering

The actual implementation uses:
- Count-based per-user retention: keep last 10 swipes (any direction), delete the rest
- `by_user_time` index for per-user ordered queries

This was not an auto-fix deviation — it was a deliberate design change requested by the user at the human-verify checkpoint after Tasks 1+2 were committed. The revised approach is strictly better for the stated goal (lean memory, undo support).

**Total deviations:** 1 deliberate design change (user-requested strategy revision at checkpoint)
**Impact on plan:** Strategy change fully implemented, all tests pass, no regressions.

## Issues Encountered

None — the count-based implementation was clean and all 82 tests passed on the full suite run.

## User Setup Required

None - no external service configuration required for the compaction logic itself.

When Convex project is initialized (`npx convex dev`), the cron will appear in the Convex dashboard as `compact-user-swipes` running daily at 03:00 UTC. Verify via dashboard Scheduled Jobs panel.

## Next Phase Readiness

Phase 4 is complete. All 4 phases of WishSwipe v1 have been implemented:
- Phase 1: Foundation (auth, schema, normaliser)
- Phase 2: Swipe engine (gesture, physics, card queue)
- Phase 3: Wishlist (view, affiliate redirect)
- Phase 4: Data health (compaction cron)

Remaining pre-launch steps (from STATE.md Pending Todos):
- Initialize Convex project (`npx convex dev`)
- Create Clerk application and configure `.env.local`
- Set Convex ENV vars for normaliser
- Run `npx convex run normaliser/actions:ingestAllStores` to populate products

## Self-Check: PASSED

- convex/compaction.ts: FOUND
- convex/crons.ts: FOUND
- compaction.test.ts: FOUND
- 04-02-SUMMARY.md: FOUND
- Commit 5dbbf08: FOUND
- No wishlists table usage in compaction.ts: PASS (comment-only reference is the invariant declaration)
- by_user_time index used: PASS

---
*Phase: 04-data-health*
*Completed: 2026-03-05*
