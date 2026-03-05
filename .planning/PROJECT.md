# WishSwipe

## What This Is

WishSwipe is a web-based product discovery and wishlist platform where users swipe through product catalogs (Tinder-style) to save items they love. Products are pulled from store APIs (Dummy JSON in v1), normalized into standardized Product Cards with affiliate links baked in server-side, and stored in a Convex real-time backend. The v1 MVP is fully shipped — auth, swipe engine, wishlist, and automated data health are all complete.

## Core Value

The swipe engine — product discovery that feels effortless and addictive, where every interaction is captured for future personalization and every outbound click earns affiliate revenue.

## Requirements

### Validated

- ✓ User can sign up / sign in / sign out with email and password, session persists — v1.0 (AUTH-01, AUTH-02, AUTH-03)
- ✓ Google and Apple OAuth buttons present and scaffolded — v1.0 (AUTH-04, AUTH-05)
- ✓ Normaliser fetches from Dummy JSON, outputs standardised Product Cards with affiliate URLs — v1.0 (NORM-01, NORM-02, NORM-03)
- ✓ Product fields snapshotted into wishlist record at save time — v1.0 (NORM-04)
- ✓ Swipe UI renders exactly 3 cards (Active, Next, Preview) at all times — v1.0 (SWIPE-01)
- ✓ Active card tracks 1:1 with pointer/finger, gesture handler bypasses React reconciler — v1.0 (SWIPE-02)
- ✓ Card springs out on release above threshold, snaps back below threshold — v1.0 (SWIPE-03)
- ✓ Right swipe saves to wishlist, left marks skipped; both recorded in Convex with full snapshot — v1.0 (SWIPE-04, GHOST-01)
- ✓ Undo restores last-swiped card and reverts Convex record — v1.0 (SWIPE-05)
- ✓ Card queue pre-fetches ~20 cards, filters already-swiped products per user — v1.0 (GHOST-02)
- ✓ Daily compaction cron enforces per-user swipe retention (keep last 10), wishlists never touched — v1.0 (GHOST-03)
- ✓ Haptic feedback on right-swipe, glow-pulse animation, directional overlays during drag — v1.0 (UX-01, UX-02, UX-03)
- ✓ Authenticated wishlist page showing all saved products — v1.0 (WISH-01)
- ✓ Affiliate redirect on product click, opens in new tab — v1.0 (WISH-02)

### Active

**Wishlist Management**
- [ ] User can remove an item from their wishlist (WISH-03)
- [ ] Shareable wishlist link — public URL allows anyone to view without an account (WISH-04)

**Gift Coordination**
- [ ] Non-owner viewer can reserve an item ("I'm buying this") — requires account (GIFT-01)
- [ ] Wishlist owner cannot see who reserved what — enforced at DB layer (GIFT-02)

**Real Store Integrations**
- [ ] Amazon product API integration wired via ENV config (STORE-01)
- [ ] eBay product API integration wired via ENV config (STORE-02)
- [ ] Etsy product API integration wired via ENV config (STORE-03)

**Discovery**
- [ ] Algorithm-based recommendations derived from swipe history (DISC-01)
- [ ] Product category / interest filtering on the swipe feed (DISC-02)

### Out of Scope

- Social graph / following / friend feeds — v3+ after core is proven
- Mobile app — web-first; architecture does not preclude mobile reuse, but native is future
- In-app payments or escrow — affiliate redirect only
- Real-time chat — not relevant to product discovery
- Admin dashboard — needed at v3+ when moderation is required
- Price comparison across stores — single affiliate link per product by design

## Context

**v1.0 shipped 2026-03-05.** Full stack in production-ready state:
- ~2,600 lines TypeScript across 120 files
- Convex backend with 4 tables: users, products, swipes, wishlists
- Clerk auth with email/password + OAuth scaffolding (credentials wired separately)
- Physics-based swipe engine bypassing React reconciler for smooth 60fps performance
- Automated daily compaction cron keeping swipes table lean
- DummyJSON as data source; any store is one ENV entry away

**Architecture is deliberately API-agnostic:** Adding a new store = one ENV entry, zero code changes. The Normaliser transforms raw URLs to affiliate URLs server-side — raw links never reach the client.

**Data model insight from v1:** The swipes table acts as an undo buffer (last 10 per user); the wishlists table is the permanent record. These are intentionally separate — compaction must never touch wishlists.

## Constraints

- **Backend**: Convex — real-time, serverless, low operational overhead
- **Data source**: Dummy JSON for v1; real APIs added via ENV config
- **Render budget**: Max 3 cards in DOM at any time — performance is non-negotiable
- **Affiliate links**: Must be in every outbound product URL — no raw store links
- **Platform**: Web-first; mobile is a future milestone

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Convex as backend | Serverless, real-time, low server load — fits the "Ghost DB" philosophy | ✓ Good — real-time subscriptions seamless, minimal ops overhead |
| Dummy JSON API as v1 data source | Real store APIs require approval/keys; Dummy JSON unblocks the engine build | ✓ Good — unblocked v1; ENV pattern ready for real APIs |
| Affiliate links baked into Normaliser output | Monetization must be structural, not bolted on | ✓ Good — raw URLs never reached client in any phase |
| ENV-based multi-store config | Adding a store = one ENV entry, zero code changes | ✓ Good — clean pattern validated through DummyJSON adapter |
| Web-first architecture | Largest addressable audience; mobile reuse possible without mobile-first constraints | ✓ Good — no blockers identified for future mobile |
| 3-card render limit | Maintains 60fps regardless of device; prevents over-rendering | ✓ Good — gesture physics stayed smooth; constraint held throughout |
| Separate swipes / wishlists tables | Compaction must never touch wishlist records | ✓ Good — Phase 4 compaction trivially safe; query isolation clean |
| Count-based compaction (keep last 10) | Time-based deletion risked removing recently-saved items; count-based is user-scoped | ✓ Good — revised at Phase 4 checkpoint; cleaner semantics than time-based |
| Gesture handler bypasses React reconciler (refs + DOM transforms) | React state mutations during drag cause frame drops | ✓ Good — 1:1 tracking achieved; required useSprings with fixed SPRING_COUNT=20 |

---
*Last updated: 2026-03-05 after v1.0 milestone*
