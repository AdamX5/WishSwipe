---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
status: executing
stopped_at: Completed 03-wishlist-01-PLAN.md
last_updated: "2026-03-04T20:26:59.684Z"
last_activity: "2026-03-04 — Plan 02-04 checkpoint reached: all Phase 2 code complete, awaiting human verification of 8 manual checks"
progress:
  total_phases: 4
  completed_phases: 2
  total_plans: 11
  completed_plans: 10
  percent: 25
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-03)

**Core value:** The swipe engine — product discovery that feels effortless and addictive, where every interaction is captured for future personalization and every outbound click earns affiliate revenue
**Current focus:** Phase 2: Swipe Engine

## Current Position

Phase: 2 of 4 (Swipe Engine)
Plan: 4 of 4 in current phase (checkpoint: awaiting human verify)
Status: Executing
Last activity: 2026-03-04 — Plan 02-04 checkpoint reached: all Phase 2 code complete, awaiting human verification of 8 manual checks

Progress: [███░░░░░░░] 25%

## Performance Metrics

**Velocity:**
- Total plans completed: 1
- Average duration: 4 min
- Total execution time: 0.1 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01-foundation | 3/3 | 8 min | 2.7 min |
| 02-swipe-engine | 1/4 | 2 min | 2 min |

**Recent Trend:**
- Last 5 plans: 4 min, 2 min, 2 min
- Trend: fast execution

*Updated after each plan completion*
| Phase 01-foundation P02 | 60 | 2 tasks | 3 files |
| Phase 02-swipe-engine P01 | 2 | 3 tasks | 9 files |
| Phase 02-swipe-engine P02 | 5 | 2 tasks | 3 files |
| Phase 02-swipe-engine P03 | 5 | 2 tasks | 4 files |
| Phase 03-wishlist P02 | 2 | 2 tasks | 4 files |
| Phase 03-wishlist P03 | 5 | 2 tasks | 3 files |
| Phase 03-wishlist P01 | 2 | 1 tasks | 1 files |

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- Convex as backend (serverless, real-time, low operational overhead)
- Dummy JSON API as v1 data source (unblocks engine build without external API approval)
- Affiliate URLs baked into Normaliser output (monetization structural, not bolted on)
- ENV-based multi-store config (adding a store = one ENV entry, zero code changes)
- Next.js 16 App Router (scaffolded as 16.1.6, latest available — plan referenced 15, same API)
- Clerk for auth (first-class Convex integration; enables OAuth in v2 without schema changes)
- ClerkProvider outermost, ConvexClientProvider nested inside (required Clerk+Convex init order)
- catch-all routes [[...sign-in]] required for Clerk multi-step auth flows
- affiliateUrl as ONLY URL field in schema — no rawUrl, productUrl, storeUrl ever
- wishlists table separate from swipes (compaction isolation for Phase 4)
- TDD RED stubs committed before implementation — Plan 03 turns them GREEN (done)
- @use-gesture/react + react-spring pairing (ref-based gesture tracking bypasses React reconciler; only correct pairing for 60fps)
- affiliateUrl is the ONLY URL field on ProductCard — enforced structurally, not by convention
- Per-product ctx.runMutation pattern (not bulk) — keeps each write within Convex 1-second mutation budget
- loadStoreConfigs() silently skips missing/false ENABLED flags — safe zero-config deployment
- Adapter pattern: each store exports { fetchProducts, normalize } — adding a store = one new adapter file + ENV block
- [Phase 01-foundation]: upsertUser uses patch not replace — preserves future fields added to users table without wiping on re-sync
- [Phase 01-foundation]: SwipeShell as client boundary — server page keeps auth guard, client shell handles useMutation and UserButton
- [Phase 01-foundation]: afterSignOutUrl on both ClerkProvider and UserButton — ensures sign-out always redirects to /sign-in
- [Phase 02-swipe-engine P01]: getCardQueue returns [] for unauthenticated calls (not throws) — safe for initial load before Clerk resolves
- [Phase 02-swipe-engine P01]: TODO comment required after products .collect() as architectural safety marker for future pagination
- [Phase 02-swipe-engine P01]: recordSwipe atomically writes to swipes + wishlists (right-swipe only); undoSwipe deletes both atomically
- [Phase 02-swipe-engine]: SPRING_COUNT fixed at 20 (not queue.length) — React hook count must be stable across renders
- [Phase 02-swipe-engine]: Absolute queue indices (topIndex.current + i) used in gone.current and springs — prevents card-advance bug where next card inherits display position 0 and flies off immediately
- [Phase 02-swipe-engine]: topIndex and gone are useRef not useState — no React re-renders during drag; api_.start() updates springs imperatively for 60fps tracking
- [Phase 02-swipe-engine]: Undo button placed in SwipeDeck JSX directly — avoids prop-drilling handler through server component boundary
- [Phase 02-swipe-engine]: goneCount React state mirrors gone.current Set size — makes Undo disabled state reactive without waiting for unrelated re-render
- [Phase 02-swipe-engine]: glowingCard keyed on absIndex not display position — prevents glow from re-triggering on wrong card after deck advances
- [Phase 03-wishlist]: getWishlist returns [] for unauthenticated callers — matches getCardQueue pattern, safe for pre-Clerk-resolve load
- [Phase 03-wishlist]: removeFromWishlist uses wishlistId (_id) directly for delete — unguessable, no index scan needed
- [Phase 03-wishlist]: Ownership check collapses null-entry and wrong-owner into single 'Not found' throw — avoids leaking whether an ID exists
- [Phase 03-wishlist]: WishlistItem._id typed as string (not Id<'wishlists'>) to keep presentational components fully Convex-free
- [Phase 03-wishlist]: Visit Store uses anchor tag with target=_blank (not window.open) — semantically correct affiliate link pattern
- [Phase 03-wishlist]: filterWishlistByUser and checkOwnership as named pure functions mirror Convex handler logic — makes behavioral contract explicit in test file

### Pending Todos

- Run `npx convex dev` to initialize Convex project (requires Clerk credentials first)
- Create Clerk application and update .env.local with real keys
- Set CLERK_JWT_ISSUER_DOMAIN in both .env.local and Convex dashboard ENV
- Set Convex ENV vars for Normaliser: STORE_DUMMYJSON_ENABLED=true, STORE_DUMMYJSON_API_BASE, STORE_DUMMYJSON_ADAPTER=dummyjson
- Run `npx convex run normaliser/actions:ingestAllStores` after ENV vars set to populate products table

### Blockers/Concerns

- Convex function execution timeout limits should be verified at docs.convex.dev before designing any function that iterates over large datasets (affects Phase 2 swipe tracker and Phase 4 compaction)
- Auth-gate redirect flow for Phase 4 share/reserve (deferred to v2) — note for when share links are added

## Session Continuity

Last session: 2026-03-04T20:26:59.682Z
Stopped at: Completed 03-wishlist-01-PLAN.md
Resume file: None
