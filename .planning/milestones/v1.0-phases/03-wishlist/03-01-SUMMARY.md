---
phase: 03-wishlist
plan: 01
subsystem: testing
tags: [jest, typescript, tdd, wishlists, pure-functions]

# Dependency graph
requires:
  - phase: 01-foundation
    provides: Convex schema with wishlists table shape (WishlistEntry type)
  - phase: 02-swipe-engine
    provides: Established test patterns (cardQueue.test.ts, swipes.test.ts)
provides:
  - Wave 0 test scaffold for wishlist behaviors — filterWishlistByUser, checkOwnership, formatPrice
  - Behavioral contract for Plan 03-02 Convex handler implementation
affects:
  - 03-02-wishlist (implements the handlers these tests specify)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Pure function mirror pattern: test file defines inline pure functions that mirror Convex handler logic, enabling unit tests without SDK dependencies"
    - "makeEntry helper factory: creates WishlistEntry test fixtures with partial overrides (same pattern as validSnapshot in swipes.test.ts)"

key-files:
  created:
    - convex/normaliser/__tests__/wishlists.test.ts
  modified: []

key-decisions:
  - "filterWishlistByUser and checkOwnership as named pure functions — names match the Convex handler logic they test, making the contract explicit"
  - "formatPrice tests use en-US locale with Intl.NumberFormat — consistent with how wishlist UI will render priceAmount (integer cents)"
  - "makeEntry uses Partial<WishlistEntry> overrides pattern — flexible enough for all test cases without verbose per-test construction"

patterns-established:
  - "Wave 0 scaffold pattern: pure function tests created before implementation, verified GREEN before 03-02 proceeds"
  - "No Convex SDK imports in test files — tests must run in Jest without Convex runtime"

requirements-completed: [WISH-01, WISH-02]

# Metrics
duration: 3min
completed: 2026-03-04
---

# Phase 3 Plan 01: Wishlist Test Scaffold Summary

**Wave 0 pure-function test scaffold for wishlist behaviors — filterWishlistByUser, checkOwnership, and formatPrice — providing behavioral contract for Plan 03-02 Convex implementation.**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-04T20:10:39Z
- **Completed:** 2026-03-04T20:13:00Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments
- Created `convex/normaliser/__tests__/wishlists.test.ts` with 10 tests across 3 describe blocks
- `filterWishlistByUser` tests: 4 cases covering user filtering, empty array edge cases, and cross-user exclusion
- `checkOwnership` tests: 3 cases covering match, mismatch, and empty string userId
- `formatPrice` tests: 3 cases covering cents-to-display formatting (999, 12999, 0)
- All 10 tests pass with zero Convex SDK imports

## Task Commits

Each task was committed atomically:

1. **Task 1: Write wishlists.test.ts — pure function test scaffold** - `2656d4c` (feat — already committed as part of 03-02 prior execution)

## Files Created/Modified
- `convex/normaliser/__tests__/wishlists.test.ts` - Pure function tests for wishlist filter logic (filterWishlistByUser), ownership guard (checkOwnership), and price formatting (formatPrice); 10 tests, 0 Convex SDK imports

## Decisions Made
- `filterWishlistByUser` and `checkOwnership` named to explicitly mirror the Convex handler functions they test — makes the behavioral contract readable
- `makeEntry` factory with `Partial<WishlistEntry>` overrides chosen over per-test construction — matches the `validSnapshot` pattern from `swipes.test.ts`
- `formatPrice` included in scaffold (not just filter/ownership) because wishlist UI rendering of `priceAmount` (integer cents) needs explicit specification before implementation

## Deviations from Plan

None - the test file matched the plan specification exactly. The file was already present (committed during 03-02 prior execution) with identical content, so no new commit was needed for Task 1.

## Issues Encountered
- `npm test -- --testPathPattern=wishlists` fails with Jest version mismatch (option renamed); direct `npx jest wishlists` works correctly. This is a pre-existing issue with the npm test script — does not affect test execution.

## Next Phase Readiness
- Behavioral contract established: Plan 03-02 has clear function signatures to implement in `convex/wishlists.ts`
- Test file passes: `npm test` exits 0, 58 total tests green across 6 suites
- No blockers for 03-02 execution

---
*Phase: 03-wishlist*
*Completed: 2026-03-04*

## Self-Check: PASSED

- FOUND: `convex/normaliser/__tests__/wishlists.test.ts`
- FOUND: commit `2656d4c` (feat(03-02): extend middleware to protect /wishlist route — contains final wishlists.test.ts version)
- All 10 tests pass: `npx jest wishlists` exits 0
- Full suite: 58 tests, 6 suites, all green
