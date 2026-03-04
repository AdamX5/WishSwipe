# Roadmap: WishSwipe

## Overview

WishSwipe is built in four phases that follow strict dependency order. Phase 1 establishes the data foundation: a working Convex backend, authenticated users, and a Normaliser that produces affiliate-safe product cards from Dummy JSON. Phase 2 builds the core product — the swipe engine — on top of that data layer, including gesture physics, swipe recording, undo, card queue, and micro-UX feedback. Phase 3 surfaces the wishlist as a usable page with affiliate redirect on every click. Phase 4 adds the scheduled compaction job that keeps the swipe history lean and algorithm-ready. Nothing can be built out of order: the Normaliser feeds the swipe UI, swipes populate the wishlist, and compaction presupposes a populated swipe history.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Foundation** - Convex schema, authenticated users, and a Normaliser producing affiliate-safe product cards from Dummy JSON (completed 2026-03-04)
- [x] **Phase 2: Swipe Engine** - 3-card gesture UI with spring physics, right/left save/skip, undo, swipe recording, card queue, and micro-UX feedback (completed 2026-03-04)
- [ ] **Phase 3: Wishlist** - Authenticated wishlist page with all saved items and affiliate link redirect on every product click
- [ ] **Phase 4: Data Health** - Scheduled Convex cron that compacts old swipe history while protecting wishlist records

## Phase Details

### Phase 1: Foundation
**Goal**: Authenticated users exist and a Normaliser produces affiliate-safe product cards stored in Convex — every downstream component has a working data layer to build on
**Depends on**: Nothing (first phase)
**Requirements**: AUTH-01, AUTH-02, AUTH-03, AUTH-04, AUTH-05, NORM-01, NORM-02, NORM-03, NORM-04
**Success Criteria** (what must be TRUE):
  1. A new user can create an account with email and password, sign in, and remain signed in after a hard browser refresh
  2. A signed-in user can sign out from any page and the session is cleared
  3. Google and Apple OAuth buttons appear on the auth screen (visually present and scaffolded; credential wiring is not required)
  4. The Normaliser fetches products from Dummy JSON and every product record in Convex contains an affiliate URL — no raw store URL reaches the database
  5. Adding a store via ENV config enables it; omitting or setting the flag to false silently skips it with no error or crash
**Plans**: 3 plans

Plans:
- [x] 01-01-PLAN.md — Project scaffold: Next.js 15, Convex schema (all 4 tables), Clerk provider chain, middleware, Jest + test stubs
- [ ] 01-02-PLAN.md — Auth wiring: upsertUser mutation, UserButton sign-out, human verification of AUTH-01 through AUTH-05
- [x] 01-03-PLAN.md — Normaliser: StoreConfig types, DummyJSON adapter, ENV config loader, Convex Action + upsertProduct + HTTP endpoint

### Phase 2: Swipe Engine
**Goal**: Users can discover products through a fluid, physics-based swipe UI where every interaction is recorded in Convex and micro-UX feedback makes saving feel rewarding
**Depends on**: Phase 1
**Requirements**: SWIPE-01, SWIPE-02, SWIPE-03, SWIPE-04, SWIPE-05, GHOST-01, GHOST-02, UX-01, UX-02, UX-03
**Success Criteria** (what must be TRUE):
  1. Exactly 3 cards are present in the DOM at all times (Active, Next, Preview) — no more, no fewer while the queue has products
  2. The active card tracks the user's finger or cursor 1:1 during drag with no visible lag; releasing above threshold slings the card out with spring physics; releasing below threshold snaps it back
  3. Right-swipe saves the product to the user's wishlist and left-swipe marks it skipped; both are recorded in Convex with direction, timestamp, user ID, and full product snapshot
  4. Tapping Undo restores the last-swiped card to the top of the deck and reverts the Convex swipe record — the previous product is visible and swipeable again
  5. Right-swiping triggers haptic feedback on supported devices, a visual pulse/glow on the card, and a green tint with heart icon overlay during the drag; left drag shows red tint with X icon
**Plans**: 4 plans

Plans:
- [x] 02-01-PLAN.md — Install gesture/physics libraries, Convex backend (recordSwipe, undoSwipe, getCardQueue), Wave 0 test stubs
- [ ] 02-02-PLAN.md — SwipeCard presentational component, SwipeDeck gesture engine (useSprings + useDrag), page wiring
- [ ] 02-03-PLAN.md — SwipeOverlay (directional tint + icons), glow-pulse keyframe, haptic feedback, Undo button
- [ ] 02-04-PLAN.md — Human verification of all 5 Phase 2 success criteria

### Phase 3: Wishlist
**Goal**: Users can review every product they have saved and navigate directly to the store via the affiliate link
**Depends on**: Phase 2
**Requirements**: WISH-01, WISH-02
**Success Criteria** (what must be TRUE):
  1. An authenticated user can open the wishlist page and see all products they have right-swiped, using the product snapshot data saved at swipe time
  2. Clicking any product in the wishlist opens the store's product page in a new tab via the affiliate URL — no raw store URL is ever used
**Plans**: 4 plans

Plans:
- [ ] 03-01-PLAN.md — Wave 0 test scaffold: wishlists.test.ts (pure function tests for getWishlist filter logic and removeFromWishlist ownership check)
- [ ] 03-02-PLAN.md — Convex backend: getWishlist query + removeFromWishlist mutation + middleware /wishlist protection
- [ ] 03-03-PLAN.md — Presentational components: BottomNav, WishlistCard, WishlistSheet (bottom sheet with affiliate link + remove)
- [ ] 03-04-PLAN.md — Page wiring: WishlistShell client component, wishlist page.tsx, swipe page bottom nav integration + human verification

### Phase 4: Data Health
**Goal**: Old swipe history is automatically compacted on a schedule, keeping the Convex database lean without touching wishlist records or right-swipe data
**Depends on**: Phase 3
**Requirements**: GHOST-03
**Success Criteria** (what must be TRUE):
  1. A Convex scheduled cron job runs on a defined cadence and aggregates or prunes left-swipe records older than the configured threshold — wishlist records and right-swipe records are never modified or deleted by the job
  2. After the cron runs, the database contains fewer old left-swipe records and all previously saved wishlist items remain intact and retrievable
**Plans**: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation | 3/3 | Complete   | 2026-03-04 |
| 2. Swipe Engine | 4/4 | Complete   | 2026-03-04 |
| 3. Wishlist | 0/4 | Not started | - |
| 4. Data Health | 0/TBD | Not started | - |
