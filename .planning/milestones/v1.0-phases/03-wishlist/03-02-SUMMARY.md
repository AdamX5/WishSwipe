---
phase: 03-wishlist
plan: 02
subsystem: database
tags: [convex, wishlist, query, mutation, auth, middleware, clerk]

# Dependency graph
requires:
  - phase: 03-01
    provides: wishlists table schema with by_user and by_user_product indexes
  - phase: 02-swipe-engine
    provides: swipes.ts auth lookup pattern (ctx.auth + by_token index)
provides:
  - getWishlist query returning all wishlist records for authenticated user, ordered desc by savedAt
  - removeFromWishlist mutation with ownership verification before delete
  - /wishlist(.*) route protection via middleware
affects:
  - 03-04 (WishlistShell wires useQuery/useMutation to these functions)
  - 03-03 (affiliate redirect — wishlist items have affiliateUrl in productSnapshot)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Queries return [] for unauthenticated callers (not throw) — safe for pre-Clerk-resolve load"
    - "Mutations throw 'Not authenticated' for missing identity"
    - "Ownership check pattern: ctx.db.get(id) then verify entry.userId === user._id before delete"
    - "Use wishlistId (_id) directly for delete — never by_user_product index"

key-files:
  created:
    - convex/wishlists.ts
    - convex/normaliser/__tests__/wishlists.test.ts
  modified:
    - middleware.ts
    - convex/_generated/api.d.ts

key-decisions:
  - "getWishlist returns [] (not throws) for unauthenticated — matches getCardQueue pattern, safe for initial load"
  - "removeFromWishlist uses wishlistId (_id) as delete key — unguessable, single-step lookup, no scan needed"
  - "Ownership check uses entry.userId !== user._id — both null entry and wrong-owner cases throw 'Not found'"

patterns-established:
  - "Wishlist query/mutation auth: identity check -> user lookup -> operation, same as swipes.ts"
  - "Desc ordering via .order('desc') on by_user index — newest saved items first"

requirements-completed:
  - WISH-01
  - WISH-02

# Metrics
duration: 2min
completed: 2026-03-04
---

# Phase 3 Plan 02: Wishlist Backend Summary

**Convex getWishlist query + removeFromWishlist mutation with ownership check, plus /wishlist middleware protection**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-04T20:23:56Z
- **Completed:** 2026-03-04T20:25:27Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- getWishlist query returns all wishlist records for authenticated user ordered desc by savedAt; returns [] for unauthenticated callers
- removeFromWishlist mutation verifies ownership (entry.userId === user._id) before delete; throws for unauthenticated, missing, or cross-user access
- middleware.ts now protects /wishlist(.*) routes alongside /swipe(.*)
- 10 unit tests covering auth handling, ordering, and ownership validation

## Task Commits

Each task was committed atomically:

1. **Task 1: Implement convex/wishlists.ts** - `a929386` (feat + test TDD)
2. **Task 2: Extend middleware.ts** - `2656d4c` (feat)

**Plan metadata:** committed with docs commit below

## Files Created/Modified
- `convex/wishlists.ts` - getWishlist query + removeFromWishlist mutation
- `convex/normaliser/__tests__/wishlists.test.ts` - 10 unit tests for pure helper logic
- `middleware.ts` - added /wishlist(.*) to createRouteMatcher
- `convex/_generated/api.d.ts` - auto-generated, now includes wishlists module

## Decisions Made
- getWishlist returns [] (not throws) for unauthenticated callers — matches the established getCardQueue pattern, safe for pre-Clerk-resolve load on initial page render
- removeFromWishlist uses wishlistId (_id) as the delete key — _id is unguessable and provides a direct single-step get, no index scan required
- Ownership check collapses null-entry and wrong-owner into single throw ("Not found") — avoids leaking whether an ID exists

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- convex/wishlists.ts exports getWishlist and removeFromWishlist — Plan 03-04 can import api.wishlists.getWishlist and api.wishlists.removeFromWishlist without modification
- /wishlist route is protected — unauthenticated users redirect to /sign-in automatically

---
*Phase: 03-wishlist*
*Completed: 2026-03-04*
