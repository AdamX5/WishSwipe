# WishSwipe

## What This Is

WishSwipe is a web-based product discovery and wishlist platform where users swipe through product catalogs (Tinder-style) to save items they love. Products are pulled from multiple store APIs, normalized into standardized Product Cards with affiliate links baked in, and stored in a Convex backend. Users can share their wishlist via link so friends can view items and reserve them as gifts.

## Core Value

The swipe engine — product discovery that feels effortless and addictive, where every interaction is captured for future personalization and every outbound click earns affiliate revenue.

## Requirements

### Validated

(None yet — ship to validate)

### Active

**Swipe Engine (The Fluid Stack)**
- [ ] Swipe-based product discovery UI rendering exactly 3 cards: Active, Next, Preview
- [ ] 60fps performance on any device
- [ ] Direct 1:1 card tracking with finger/cursor — zero perceived lag
- [ ] Spring physics on release: card slings out of view (swipe) or snaps back (cancel)
- [ ] Haptic feedback and subtle UI pulse on Right swipe (Save)

**The Normaliser**
- [ ] Ingests raw product data from any configured store API
- [ ] Outputs a standardised Product Card: image, title, price, star rating, affiliate link, source store
- [ ] ENV-based config: each store has an API key and affiliate ID; missing entries are silently skipped
- [ ] Ships with Dummy JSON API as the default data source

**The Ghost Database (Convex)**
- [ ] Tracks every swipe: Right = Wishlist, Left = Skip, with timestamp and product snapshot
- [ ] Undo last swipe — restores previous card and reverts swipe record
- [ ] Data compaction strategy: swipe history condensed over time to keep backend lean and algorithm-ready

**Auth & Accounts**
- [ ] User sign up with email and password
- [ ] User log in / log out with persistent session

**Wishlist**
- [ ] User can view all right-swiped (saved) products
- [ ] Shareable wishlist link — anyone can view without an account
- [ ] Non-members viewing a shared wishlist must sign up to reserve an item
- [ ] Reserve = "I'm buying this" flag visible to all viewers of that link (gift coordination)
- [ ] Clicking a product redirects via affiliate link to the store page

### Out of Scope

- Social graph / following / friend feeds — v2 after core is proven
- Algorithm-based recommendations — data is collected now, algorithm built later
- Real store integrations (Amazon, eBay, Etsy) — Dummy JSON until APIs are wired
- Mobile app — web-first; code structured for future mobile reuse
- In-app payments or escrow — affiliate redirect only

## Context

- The affiliate link is the monetization model: every outbound click from the wishlist or card earns a cut. The Normaliser must transform raw product URLs into affiliate URLs before they reach the UI — never raw links.
- Server load is a first-class design constraint. Convex's serverless model covers the backend; the 3-card render limit covers the frontend. Data compaction keeps the swipe history from growing unbounded.
- The project is called "the engine" because the architecture (Normaliser, swipe mechanics, Ghost DB) is designed to be API-agnostic and repurposable — adding a new store is an ENV entry, not a code change.
- Web-first, but no React Native or mobile-specific code yet. Architecture should not make mobile reuse harder.

## Constraints

- **Backend**: Convex — real-time, serverless, low operational overhead
- **Data source**: Dummy JSON API for v1; real APIs added later via ENV config
- **Render budget**: Max 3 cards in DOM at any time — performance is non-negotiable
- **Affiliate links**: Must be in every outbound product URL — no raw store links in production
- **Platform**: Web-first; mobile app is a future milestone, not a v1 deliverable

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Convex as backend | Serverless, real-time, low server load — fits the "Ghost DB" philosophy | — Pending |
| Dummy JSON API as v1 data source | Real store APIs require approval/keys; Dummy JSON unblocks the engine build | — Pending |
| Affiliate links baked into Normaliser output | Monetization must be structural, not bolted on | — Pending |
| ENV-based multi-store config | Adding a store = one ENV entry, zero code changes | — Pending |
| Web-first architecture | Largest addressable audience; mobile reuse possible without mobile-first constraints | — Pending |
| 3-card render limit | Maintains 60fps regardless of device; prevents over-rendering | — Pending |

---
*Last updated: 2026-03-03 after initialization*
