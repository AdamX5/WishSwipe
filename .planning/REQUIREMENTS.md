# Requirements: WishSwipe

**Defined:** 2026-03-03
**Core Value:** The swipe engine — product discovery that feels effortless and addictive, where every interaction is captured for future personalization and every outbound click earns affiliate revenue.

## v1 Requirements

Requirements for initial release. Each maps to roadmap phases.

### Authentication

- [x] **AUTH-01**: User can sign up with email and password
- [x] **AUTH-02**: User can sign in with email and password and session persists across browser refreshes
- [x] **AUTH-03**: User can sign out from any page
- [x] **AUTH-04**: Google OAuth sign-in button is present and scaffolded (credentials wired up separately — not v1 functional)
- [x] **AUTH-05**: Apple OAuth sign-in button is present and scaffolded (credentials wired up separately — not v1 functional)

### Normaliser

- [x] **NORM-01**: Normaliser fetches and normalizes products from Dummy JSON API into standard Product Cards (image, title, price, star rating, affiliate URL, source store)
- [x] **NORM-02**: Normaliser reads store configuration from ENV using `STORE_*_ENABLED` pattern; stores with missing or `false` flag are silently skipped with no error
- [x] **NORM-03**: Normaliser transforms raw product URL into affiliate URL using store-specific affiliate ID from ENV before any URL reaches the client
- [x] **NORM-04**: When a product is saved to wishlist, all product fields are snapshotted into the wishlist record at save time — independent of future re-normalization

### Swipe Engine

- [ ] **SWIPE-01**: Swipe UI renders exactly 3 cards in the DOM at any time: Active, Next, and Preview
- [ ] **SWIPE-02**: Active card tracks 1:1 with pointer/finger position during drag with no perceived lag (gesture handler bypasses React reconciler)
- [ ] **SWIPE-03**: On release, card springs out of view if swipe distance or velocity exceeds threshold; snaps back with spring physics if below threshold — velocity at release is used as initial spring velocity
- [x] **SWIPE-04**: Right swipe saves product to wishlist; Left swipe marks product as skipped
- [x] **SWIPE-05**: User can undo the last swipe, restoring the card to the deck and reverting the swipe record in Convex

### Ghost Database

- [x] **GHOST-01**: Every swipe is recorded in Convex with: direction (right/left), timestamp, user ID, and full product snapshot
- [x] **GHOST-02**: Card queue query returns only products the current user has not yet swiped; client pre-fetches ~20 cards to avoid per-swipe round-trips
- [ ] **GHOST-03**: A scheduled Convex cron job compacts old swipe history (aggregates or prunes records older than threshold) to keep the database lean and algorithm-ready

### Micro-UX

- [ ] **UX-01**: Device haptic feedback (vibration pulse) fires when user right-swipes to save a product
- [ ] **UX-02**: Active card displays a visual pulse or glow effect when saved to wishlist (the "Dopamine Hit")
- [ ] **UX-03**: A directional overlay appears on the card as it tilts during drag — green tint / heart icon for right, red tint / X icon for left

### Wishlist

- [ ] **WISH-01**: Authenticated user can view all their saved (right-swiped) products on a wishlist page
- [ ] **WISH-02**: Clicking a product in the wishlist opens the store's product page via the affiliate link in a new tab

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Wishlist Management

- **WISH-03**: User can remove an item from their wishlist
- **WISH-04**: Shareable wishlist link — public URL allows anyone to view the wishlist without an account

### Gift Coordination

- **GIFT-01**: Non-owner viewer of a shared wishlist can reserve an item ("I'm buying this") — requires account
- **GIFT-02**: Wishlist owner cannot see who has reserved what item (gift surprise preserved — enforced at DB layer)

### Real Store Integrations

- **STORE-01**: Amazon product API integration wired via ENV config
- **STORE-02**: eBay product API integration wired via ENV config
- **STORE-03**: Etsy product API integration wired via ENV config

### Discovery

- **DISC-01**: Algorithm-based product recommendations derived from swipe history (data collected in v1, algorithm built in v2)
- **DISC-02**: Product category / interest filtering on the swipe feed

### Social

- **SOCL-01**: User can follow other users and see their public wishlist activity
- **SOCL-02**: Recommendation engine incorporates what friends have saved

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Mobile app (iOS/Android) | Web-first; architecture not designed against mobile reuse, but native app is a future milestone |
| In-app payments / escrow | Affiliate redirect only — no purchase flow within WishSwipe |
| Price comparison across stores | Adds complexity without improving affiliate revenue model; single affiliate link per product |
| User-uploaded products | Manual catalog defeats the purpose of the Normaliser engine |
| Real-time chat | Not relevant to product discovery or wishlist coordination |
| Admin dashboard | Not needed until moderation is required (v3+) |
| PWA / home screen install | Desirable but not required for v1; auth persistence model should not block this later |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| AUTH-01 | Phase 1 | Complete |
| AUTH-02 | Phase 1 | Complete |
| AUTH-03 | Phase 1 | Complete |
| AUTH-04 | Phase 1 | Complete |
| AUTH-05 | Phase 1 | Complete |
| NORM-01 | Phase 1 | Complete |
| NORM-02 | Phase 1 | Complete |
| NORM-03 | Phase 1 | Complete |
| NORM-04 | Phase 1 | Complete |
| SWIPE-01 | Phase 2 | Pending |
| SWIPE-02 | Phase 2 | Pending |
| SWIPE-03 | Phase 2 | Pending |
| SWIPE-04 | Phase 2 | Complete |
| SWIPE-05 | Phase 2 | Complete |
| GHOST-01 | Phase 2 | Complete |
| GHOST-02 | Phase 2 | Complete |
| GHOST-03 | Phase 4 | Pending |
| UX-01 | Phase 2 | Pending |
| UX-02 | Phase 2 | Pending |
| UX-03 | Phase 2 | Pending |
| WISH-01 | Phase 3 | Pending |
| WISH-02 | Phase 3 | Pending |

**Coverage:**
- v1 requirements: 22 total
- Mapped to phases: 22 (Phase 1: 9, Phase 2: 10, Phase 3: 2, Phase 4: 1)
- Unmapped: 0

---
*Requirements defined: 2026-03-03*
*Last updated: 2026-03-04 after Plan 01-03 (Normaliser) completion — NORM-01 through NORM-04 complete*
