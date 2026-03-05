---
phase: 04-data-health
plan: 01
subsystem: database
tags: [convex, schema, jest, tdd, compaction]

# Dependency graph
requires:
  - phase: 01-foundation
    provides: swipes table schema with direction and swipedAt fields
  - phase: 02-swipe-engine
    provides: swipe recording logic that writes to swipes table
provides:
  - by_direction_time compound index on swipes table enabling efficient compaction queries
  - compaction.test.ts with 6 failing tests defining isCompactable + filterCompactable behavioral contract
affects:
  - 04-02 (implements compaction.ts to turn these RED tests GREEN)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Wave 0 TDD RED scaffold — stub functions throw 'not implemented', tests fail intentionally to define contract before implementation

key-files:
  created:
    - convex/normaliser/__tests__/compaction.test.ts
  modified:
    - convex/schema.ts

key-decisions:
  - "by_direction_time index uses compound ['direction', 'swipedAt'] to enable index-level filtering on direction='left' + swipedAt range — avoids full table scan at compaction time"
  - "Wave 0 stubs defined inline in test file (not imported from compaction.ts) — same mirror pattern as wishlists.test.ts; Plan 04-02 implements the real functions"
  - "Fixed CUTOFF/OLD/NEW constants used instead of Date.now() — deterministic tests that never drift"

patterns-established:
  - "Wave 0 RED: stub functions throw 'not implemented' — commit RED state before implementation, Plan 04-02 turns GREEN"

requirements-completed:
  - GHOST-03

# Metrics
duration: 1min
completed: 2026-03-05
---

# Phase 4 Plan 01: Data Health — Compaction TDD Scaffold Summary

**Wave 0 RED scaffold: by_direction_time schema index + 6 failing pure-function tests defining the isCompactable/filterCompactable behavioral contract for compaction logic**

## Performance

- **Duration:** 1 min
- **Started:** 2026-03-05T09:13:13Z
- **Completed:** 2026-03-05T09:14:22Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Added `by_direction_time` compound index on swipes table — enables O(log n) compaction queries filtering on direction='left' + swipedAt range at the index level
- Created compaction.test.ts with 6 failing tests (Wave 0 RED) defining the full behavioral contract for `isCompactable` and `filterCompactable`
- Zero Convex SDK imports in test file — pure TypeScript, runs in Jest without any Convex environment

## Task Commits

Each task was committed atomically:

1. **Task 1: Add by_direction_time index to schema** - `e6d2202` (feat)
2. **Task 2: Write failing compaction.test.ts — Wave 0 RED scaffold** - `9eea231` (test)

**Plan metadata:** (docs commit follows)

_Note: Task 2 is the TDD RED phase — stubs intentionally throw, all 6 tests fail as designed_

## Files Created/Modified
- `convex/schema.ts` - Added `.index('by_direction_time', ['direction', 'swipedAt'])` to swipes table (additive, no existing indexes changed)
- `convex/normaliser/__tests__/compaction.test.ts` - 6 failing tests in 2 describe blocks (isCompactable: 4 tests, filterCompactable: 2 tests), inline SwipeRecord type and stub functions, zero Convex SDK imports

## Decisions Made
- Compound index `['direction', 'swipedAt']` chosen over separate indexes: allows the DB to filter `direction='left'` first, then range-scan on `swipedAt < cutoff` — optimal for compaction pattern
- Inline stub functions in test file (not empty compaction.ts stub): mirrors wishlists.test.ts pattern exactly; keeps Wave 0 self-contained
- CUTOFF=1_000_000, OLD=500_000, NEW=2_000_000 as fixed constants: clear, readable, and deterministic (no flakiness from system time)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- `--testPathPattern` flag is deprecated in the version of Jest used; `--testPathPatterns` is the correct flag. No impact — tests ran correctly with either. (Plan's verify command uses the deprecated form but it still works.)

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Wave 0 RED confirmed: 6 compaction tests fail with "not implemented", 72 other tests pass
- Plan 04-02 implements `convex/compaction.ts` with the real `isCompactable` and `filterCompactable` functions to turn these tests GREEN
- Schema index is deployed additive — no migration needed

## Self-Check: PASSED

- FOUND: convex/schema.ts (contains by_direction_time index)
- FOUND: convex/normaliser/__tests__/compaction.test.ts (77 lines, 6 tests, 0 Convex SDK imports)
- FOUND: .planning/phases/04-data-health/04-01-SUMMARY.md
- FOUND commit e6d2202: feat(04-01): add by_direction_time index to swipes table
- FOUND commit 9eea231: test(04-01): add failing compaction.test.ts — Wave 0 RED scaffold
- All 6 compaction tests fail with "not implemented" (RED confirmed)
- All 72 non-compaction tests pass (GREEN confirmed)

---
*Phase: 04-data-health*
*Completed: 2026-03-05*
