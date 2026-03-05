---
phase: 02-swipe-engine
plan: 01
subsystem: database
tags: [convex, mutations, queries, gesture, react-spring, tdd, swipes, wishlists]

# Dependency graph
requires:
  - phase: 01-foundation
    provides: schema.ts with swipes/wishlists/products/users tables and indexes

provides:
  - convex/swipes.ts with recordSwipe and undoSwipe mutations
  - convex/cardQueue.ts with getCardQueue query
  - "@use-gesture/react and @react-spring/web installed"
  - Unit tests for snapshot shape validation and queue filter logic
  - Generated Convex API types including swipes and cardQueue

affects: [02-02-swipe-deck, 02-03-gesture-physics, 02-04-undo-queue, 03-wishlist]

# Tech tracking
tech-stack:
  added:
    - "@use-gesture/react@10.3.1 — gesture tracking library"
    - "@react-spring/web@10.0.3 — physics-based animation library"
  patterns:
    - "recordSwipe always writes to swipes; conditionally writes to wishlists on direction='right'"
    - "undoSwipe deletes last swipe and corresponding wishlist entry atomically in one mutation"
    - "getCardQueue returns [] (not throws) for unauthenticated calls — safe for initial page load"
    - "filterUnswiped pure helper extracted as testable function mirroring getCardQueue filter logic"
    - "URL hygiene enforced structurally — validateSnapshotShape rejects rawUrl/productUrl/storeUrl"

key-files:
  created:
    - convex/swipes.ts
    - convex/cardQueue.ts
    - convex/normaliser/__tests__/swipes.test.ts
    - convex/normaliser/__tests__/cardQueue.test.ts
    - convex/_generated/api.d.ts
    - convex/_generated/api.js
    - convex/_generated/dataModel.d.ts
    - convex/_generated/server.d.ts
    - convex/_generated/server.js
  modified:
    - package.json
    - package-lock.json

key-decisions:
  - "getCardQueue returns [] for unauthenticated calls instead of throwing — enables safe initial load before auth completes"
  - "TODO comment required after products .collect() as architectural safety marker for future pagination"
  - "validateSnapshotShape inline in test file (not shared helper) — mirrors existing test pattern, avoids premature abstraction"
  - "TDD for test stubs: helper functions defined inline in tests since Convex context cannot be unit-tested without full mock"

patterns-established:
  - "Swipe recording: always insert to swipes; conditionally insert to wishlists on right-swipe"
  - "Undo: delete last swipe by by_user_time index desc; delete wishlist entry by by_user_product if direction was right"
  - "Card queue: collect swipes, build Set of swipedIds, iterate active products, return first 20 not in set"
  - "URL hygiene: affiliateUrl is the only valid URL field — rawUrl/productUrl/storeUrl are forbidden in snapshots"

requirements-completed: [GHOST-01, GHOST-02, SWIPE-04, SWIPE-05]

# Metrics
duration: 2min
completed: 2026-03-04
---

# Phase 2 Plan 01: Swipe Engine Backend Summary

**Convex mutations (recordSwipe/undoSwipe) and getCardQueue query with gesture/physics libraries installed and 33 tests passing**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-04T13:17:36Z
- **Completed:** 2026-03-04T13:19:31Z
- **Tasks:** 3
- **Files modified:** 9

## Accomplishments

- Created `recordSwipe` mutation: inserts to swipes table + conditionally to wishlists on right-swipe, returns swipe ID
- Created `undoSwipe` mutation: deletes last swipe by time index, removes wishlist entry atomically if direction was right
- Created `getCardQueue` query: returns up to 20 unswiped active products, safe for unauthenticated calls
- Installed `@use-gesture/react@10.3.1` and `@react-spring/web@10.0.3` — unblocks all gesture/animation plans
- Added 23 new unit tests (16 for snapshot shape/direction, 7 for filterUnswiped) — all passing alongside 10 existing tests
- Ran `npx convex codegen` — `api.swipes.recordSwipe`, `api.swipes.undoSwipe`, `api.cardQueue.getCardQueue` now typed

## Task Commits

Each task was committed atomically:

1. **Task 1: Install gesture libraries and create Convex backend mutations** - `7c0bd6c` (feat)
2. **Task 2: Wave 0 test stubs — snapshot shape and queue filter logic** - `b9dfd2f` (test)
3. **Task 3: Export Convex API types by verifying generated types include new functions** - `30cea29` (chore)

**Plan metadata:** (docs commit — created after SUMMARY)

## Files Created/Modified

- `convex/swipes.ts` — recordSwipe mutation (swipes + optional wishlists insert) and undoSwipe mutation
- `convex/cardQueue.ts` — getCardQueue query with 20-item limit and TODO pagination marker
- `convex/normaliser/__tests__/swipes.test.ts` — 16 tests for snapshot shape validation and direction validation
- `convex/normaliser/__tests__/cardQueue.test.ts` — 7 tests for filterUnswiped pure helper function
- `convex/_generated/api.d.ts` — TypeScript bindings for all Convex functions including new swipes/cardQueue
- `package.json` — added @use-gesture/react and @react-spring/web

## Decisions Made

- `getCardQueue` returns `[]` rather than throwing for unauthenticated calls — prevents Next.js SSR errors during initial page load before Clerk auth resolves
- `// TODO: replace with paginated query when product count exceeds 1024` comment placed immediately after products `.collect()` call as required architectural safety marker
- Test helper functions defined inline in test files (not extracted to shared module) — avoids premature abstraction, consistent with existing test pattern

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None. All 3 tasks completed cleanly on first attempt.

## Next Phase Readiness

- `api.swipes.recordSwipe`, `api.swipes.undoSwipe`, `api.cardQueue.getCardQueue` are typed and importable
- Gesture and physics libraries installed — SwipeDeck component (02-02) can import without module errors
- All 33 tests passing — green baseline for future TDD work

---
*Phase: 02-swipe-engine*
*Completed: 2026-03-04*

## Self-Check: PASSED

All files verified:
- FOUND: convex/swipes.ts
- FOUND: convex/cardQueue.ts
- FOUND: convex/normaliser/__tests__/swipes.test.ts
- FOUND: convex/normaliser/__tests__/cardQueue.test.ts
- FOUND: convex/_generated/api.d.ts

All commits verified:
- 7c0bd6c: feat(02-01) install gesture libraries and create Convex swipe backend
- b9dfd2f: test(02-01) add Wave 0 test stubs
- 30cea29: chore(02-01) regenerate Convex API types
