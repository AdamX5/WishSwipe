# Project Research Summary

**Project:** WishSwipe
**Domain:** Swipe-based product discovery and wishlist SaaS with affiliate monetization and gift coordination
**Researched:** 2026-03-03
**Confidence:** HIGH (stack and architecture are well-established patterns; features based on training knowledge of comparable products)

## Executive Summary

WishSwipe is a swipe-based product discovery app in the Tinder-for-X genre, combining a gesture-driven shopping UX with wishlist management, gift coordination via shared links, and affiliate revenue through a multi-store product normaliser. Research confirms this is a well-trodden product category with established implementation patterns: a 3-card windowed DOM render with physics-based gesture handling, a backend-normalised affiliate link pipeline, and a reactive realtime backend for wishlist sharing. The recommended stack — Next.js 15 + Convex + Clerk + @use-gesture/react + react-spring + Tailwind CSS v4 — is purpose-fit for each requirement and has no credible alternatives at equivalent complexity budget.

The core engineering challenge is not the swipe UI itself but the intersection of three constraints that must be designed correctly from day one: affiliate link integrity (raw URLs must never reach the client), swipe performance (gesture tracking must bypass the React reconciler entirely), and data model correctness (wishlists and swipe events are separate tables; reservations are hidden from the wishlist owner). All three are schema/architecture decisions that are expensive to retrofit. The recommended build order — Schema, Normaliser, Card Queue, Swipe UI, Wishlist, Share/Reserve, Compaction — follows strict dependency order and matches the layered feature architecture from FEATURES.md.

The primary risks are affiliate compliance (Amazon PA-API data freshness rules, affiliate tag integrity across redirect chains) and swipe animation performance on low-end Android devices. Both are preventable with disciplined implementation patterns identified in the research: ingestion-time affiliate URL baking, ref-based gesture tracking, physics-based springs with velocity capture at release, and a strict 3-card DOM limit. The MVP scope (Layers 1–4: Auth, Normaliser, Swipe Engine, Wishlist, Share, Reservation) is realistic and delivers the full gift-coordination value proposition without premature scope expansion.

## Key Findings

### Recommended Stack

The stack is decisive with no ambiguity. Next.js 15 (App Router) is required — not Vite — because shared wishlist pages need SSR for link previews and SEO, and affiliate IDs must be server-side only. Convex is specified as a project constraint and is the correct choice: reactive queries handle real-time reservation updates without WebSocket plumbing, mutations provide ACID transactions for swipe+wishlist atomicity, and Actions enable external API calls from the Normaliser. Clerk is preferred over NextAuth for Convex integration — it is first-class, ships auth UI components, and adds OAuth in v2 without schema changes.

For gesture and animation, @use-gesture/react + react-spring (same author ecosystem) is the only correct pairing. Framer Motion's drag implementation processes events through React state and causes re-renders mid-drag — disqualifying on performance grounds. The gesture handler writes position directly to the DOM via refs; react-spring's imperative API (`api.start()`) animates without triggering React renders. This combination is the industry-standard approach for 60fps swipe UIs.

**Core technologies:**
- Next.js 15 (App Router): Framework, SSR, routing — required for SSR on shared wishlist pages and server-side affiliate ID handling
- Convex ^1.x: Backend DB, realtime subscriptions, functions — handles reactive queries, ACID mutations, and scheduled normaliser runs
- Clerk ^6.x: Auth — first-class Convex integration, ships email+password UI, enables OAuth without schema changes
- @use-gesture/react ^10.x: Gesture tracking — imperative pointer/touch tracking with zero React renders during drag
- @react-spring/web ^9.x: Physics animation — velocity-aware springs, imperative API, display-refresh-independent integration
- Tailwind CSS v4: Styling — utility-first, CSS-native config, `will-change` and `transform` utilities align with animation requirements
- TypeScript ^5.x: Non-negotiable with Convex — schema types flow end-to-end into query/mutation return types
- nanoid ^5.x: Share token generation — cryptographically random, opaque tokens

### Expected Features

The feature research identifies 5 dependency layers with a clear MVP scope at Layers 1–4. The gift-coordination feature set (shareable link, reservation, "already reserved" visibility with owner privacy) is what differentiates WishSwipe from a basic wishlist app and must be included in v1.

**Must have (table stakes):**
- Drag-to-swipe with visual feedback (color overlay), spring snap-back, and card exit animation — users arrive trained by Tinder
- Undo last swipe — users immediately regret hasty swipes; absent undo is a known drop-off trigger
- Keyboard/button fallback for desktop users — the web-first product cannot be touch-only
- Wishlist persistence with affiliate redirect on every outbound click — monetization is structural
- Shareable wishlist link with publicly accessible read-only view — core gift coordination value prop
- Reservation with "already reserved" visibility and sign-up gate — duplicate-gift protection
- Account deletion/data erasure — GDPR/CCPA minimum; legal exposure without it

**Should have (differentiators for v1):**
- 3-card DOM limit with subtle next-card peek — 60fps on low-end devices, visual continuity
- Swipe velocity affects exit animation speed — matches user intent, feels premium
- Haptic feedback on right-swipe (with iOS fallback) — tactile reward loop
- Wishlist notes per item ("Size M, please") — reduces wrong-size gift purchases
- Priority ranking per wishlist item — helps gift-givers choose from long lists
- Click-through tracking per item — know which products convert; add alongside affiliate redirect

**Defer to v2+:**
- Price-drop alerts — requires periodic polling infrastructure and notification channel
- Category inference and personalisation — requires sufficient swipe history to be useful
- Multiple wishlists per user — complicates sharing model
- Image CDN proxying — use direct API image URLs in v1; add if layout shift proves problematic
- Deduplication across stores — only relevant when 2+ real stores are connected
- Push notifications, native mobile app, social graph, in-app payments — all explicitly out of scope

### Architecture Approach

The architecture is a clear 3-tier system: Next.js client renders the Swipe UI (3-card stack), Wishlist UI, and Share/Reserve UI; Convex backend owns all data and business logic via typed queries, mutations, and actions; external store APIs are accessed exclusively through the Normaliser Action running server-side. The critical design decision is that affiliate URLs are constructed inside the Normaliser before the product record is written to the database — the `affiliateUrl` field is the only outbound URL type in the schema. Raw store URLs never touch the database or the client.

The schema separates concerns cleanly: `products` (normalised catalog), `swipes` (event log), `wishlists` (durable entity, separate from swipes), `shareTokens`, `reservations`, `users`. The snapshot pattern on `swipes` and `wishlists` preserves product data and affiliate URLs at save time, protecting wishlist history from Normaliser re-runs or product delisting. Prices stored in cents as integers avoid floating-point issues.

**Major components:**
1. Swipe UI (client) — 3-card windowed render, ref-based gesture tracking, react-spring animation, fires `recordSwipe` / `undoSwipe` mutations
2. Normaliser (Convex Action) — fetches from configured store APIs, normalises to canonical ProductCard schema, bakes affiliate URLs, upserts to `products` table via internal mutation
3. Card Queue (Convex Query) — serves paginated batches of unseen products; client holds ~20-card local buffer, refetches when below 5
4. Swipe Tracker (Convex Mutation) — atomically records swipe event AND wishlist insert (right-swipes); handles undo as a single atomic transaction
5. Share Token Service (Convex Mutation + Query) — generates nanoid-based opaque tokens; public query resolves token to wishlist without exposing user IDs
6. Reservation Service (Convex Mutation) — marks items reserved; Convex reactive subscriptions propagate reservation state to all share-link viewers in real time; owner-vs-friend query branching enforces privacy at the data layer

### Critical Pitfalls

1. **Affiliate link leakage** — Raw store URLs reaching the client means zero revenue on those clicks and potential Amazon Associates account suspension. Prevention: `affiliateUrl` is the only URL field in the `ProductCard` type; unit test asserts no raw store domain appears in any returned card; Normaliser is the sole URL construction exit point.

2. **Gesture handling on the main thread** — Using `setState` inside `onPointerMove` causes React renders mid-drag, destroying 60fps on any non-trivial device. Prevention: all position tracking via `useRef` + direct DOM transform writes during gesture; commit to React state only on pointer release; `will-change: transform` + `touch-action: none` on card container.

3. **Undo race condition breaking queue order** — Rapid swipe + immediate undo sends overlapping async mutations; undo may arrive before save completes. Prevention: serialize mutations through a client queue (await each before firing next); disable Undo button while any mutation is in-flight; undo mutation queries for most recent record atomically rather than targeting a captured ID.

4. **Reservation visibility without privacy controls** — The wishlist owner seeing reservation data ruins the gift-surprise UX; zero gift-coordination adoption follows. Prevention: `getWishlistByToken` branches on `ctx.auth.userId === wishlist.ownerId` at the Convex query layer — owner view never fetches the `reservations` table.

5. **Data compaction deleting wishlist items** — Treating all swipes as compactable destroys wishlist items months later. Prevention: right-swipe atomically creates both a `swipes` record (compactable) and a separate `wishlists` record (permanent until user removes it); compaction only touches `swipes`.

## Implications for Roadmap

Based on the dependency layers in FEATURES.md and the build order in ARCHITECTURE.md, the recommended phase structure is:

### Phase 1: Foundation — Schema, Auth, and Normaliser

**Rationale:** Every downstream component depends on the Convex schema being correct. Auth provides the `userId` pattern used everywhere. The Normaliser is required before any product can be displayed — the swipe UI is useless without data. Dummy JSON gives immediate test data without external API approval. These three components have no dependencies on each other beyond schema, so they can be parallelised within the phase.

**Delivers:** A running Convex backend with authenticated users, a populated `products` table with affiliate URLs baked in, and a verified ingestion pipeline.

**Addresses:** Auth (email + password sign-up/in, persistent session), Normaliser (Dummy JSON adapter, affiliate URL transformation, Zod schema validation, ENV-based store config)

**Avoids:** Affiliate link leakage (affiliate URL enforced at schema level before any UI exists), data compaction destroying wishlists (separate tables designed before any swipe data is written), silent store misconfiguration (startup logging + health check)

**Research flag:** Standard patterns — no additional research needed. Convex schema design and Clerk integration are well-documented.

### Phase 2: Swipe Engine and Ghost Database

**Rationale:** The swipe engine is the product's core value proposition and must be built on top of a working data layer. The 3-card windowed render and gesture handling are a single integrated system — they must be built together, not sequentially, because the gesture handler directly drives the animation which directly drives card advancement.

**Delivers:** A fully functional swipe experience: 3-card DOM stack, drag tracking, spring physics with velocity capture, right/left save/skip, undo, keyboard fallback, and swipe event recording in Convex.

**Addresses:** Drag-to-swipe, visual swipe feedback, spring snap-back, card exit animation, undo last swipe, keyboard fallback, loading/end-of-deck state, Ghost DB (swipe recording + undo support), 3-card DOM limit, swipe velocity affecting exit animation, haptic feedback with iOS fallback

**Avoids:** Main-thread gesture jank (ref-based tracking + direct DOM writes), spring physics miscalibration (react-spring velocity capture at release; tested on real hardware), undo race condition (serialized mutations, Undo disabled while in-flight), card image layout shift (fixed card dimensions + eager load for Active and Next), touch-action scroll conflict (`touch-action: none` on card container)

**Research flag:** Standard patterns — react-spring + use-gesture combination is well-documented. The specific spring configuration values require hardware testing, not research.

### Phase 3: Wishlist View and Affiliate Redirect

**Rationale:** The wishlist is populated by right-swipes from Phase 2. Affiliate redirect is structural monetization — it must be wired before any user click reaches an external store. Click-through tracking is lightweight and belongs alongside the redirect.

**Delivers:** A working wishlist UI with saved items, affiliate link redirect on every outbound click, click-through event logging, and the ability to remove items from the wishlist.

**Addresses:** Saved items list, remove item from wishlist, item detail view, affiliate redirect on click, wishlist persistence across sessions, click-through tracking per item, item availability signal (stale data indicator)

**Avoids:** Affiliate link redirect not going through Normaliser-generated URLs (enforced by schema; wishlist query returns `productSnapshot.affiliateUrl` only)

**Research flag:** Standard patterns — no additional research needed.

### Phase 4: Share Links and Gift Coordination

**Rationale:** Share links depend on wishlists existing (Phase 3) and auth working (Phase 1). Reservation depends on share links. This is the most complex user flow — public view + auth gate + real-time reservation updates + owner privacy — and must be built last because it orchestrates all prior components.

**Delivers:** Shareable wishlist URLs, publicly accessible read-only wishlist view (no auth required), gift reservation with "already reserved" badge, sign-up gate for non-member reservers, and real-time reservation propagation to all share-link viewers.

**Addresses:** Shareable wishlist link, viewable wishlist for non-members, reserve/claim an item, sign-up gate for reservation, duplicate-gift protection, owner privacy (owner never sees who reserved what), wishlist notes per item, priority ranking

**Avoids:** Guessable share tokens (nanoid-based opaque tokens), owner seeing reservation data (query branches on identity at Convex layer), sequential token enumeration (index lookup by token, not by document ID)

**Research flag:** The auth gate redirect flow (non-member clicks Reserve, redirects to sign-up, returns to share link) warrants careful implementation planning. This is a conversion funnel — friction kills it. May benefit from targeted UX research or reference implementation review before planning.

### Phase 5: Data Compaction and Observability

**Rationale:** Compaction is a maintenance concern, not a feature. It can only run once there is swipe history to compact. Scheduling it as a separate phase keeps earlier phases focused and prevents premature optimisation.

**Delivers:** A scheduled Convex cron job that compacts old left-swipe event records while protecting wishlist items and right-swipe records, plus operational observability (health endpoint, store config logging, affiliate click monitoring).

**Addresses:** Swipe history compaction (retain last N months of left-swipes), data storage cost management at scale, affiliate link health monitoring, store-level revenue attribution reporting

**Avoids:** Compaction accidentally deleting wishlist items (only `swipes` table is compacted; `wishlists` table is never touched), ENV misconfiguration causing silent empty queues (health endpoint surfacing store config state)

**Research flag:** Convex scheduled functions and their execution limits should be verified against current Convex documentation before implementation. MEDIUM confidence on exact timeout/rate limits.

### Phase Ordering Rationale

- Schema is phase-gated: changing the Convex schema mid-build requires migration or data reload. All tables and indexes must be designed before any component writes data.
- Normaliser before swipe UI: the swipe UI has zero utility without products. DummyJSON gives test data immediately and validates the full ingestion pipeline before any real API is wired.
- Swipe before Wishlist: the `wishlists` table is populated by right-swipe mutations. The wishlist query returns nothing until swipe mutations work.
- Share/Reserve after Wishlist: the share page queries the `wishlists` table; reservations point to `wishlists` records. Both must exist before share/reserve UI is built.
- Compaction last: it presupposes swipe history and must not be built speculatively.

### Research Flags

Phases needing deeper research during planning:
- **Phase 4 (Share/Reserve):** The non-member reservation auth-gate redirect flow is a multi-step conversion funnel. The UX pattern (pre-fill return URL, minimal sign-up form, return to share context) should be validated against reference implementations before detailed task breakdown. Also: verify Convex query branching on `ctx.auth` for unauthenticated callers before assuming the pattern works as described.

Phases with standard patterns (skip research-phase):
- **Phase 1 (Foundation):** Convex schema definition, Clerk integration, and Convex Actions for external API calls are all well-documented in official docs.
- **Phase 2 (Swipe Engine):** react-spring + use-gesture integration pattern is established. Spring calibration requires hardware testing, not research.
- **Phase 3 (Wishlist):** Standard Convex query + UI pattern; no novel integration challenges.
- **Phase 5 (Compaction):** Standard Convex cron job pattern; verify exact limits but no architectural uncertainty.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All technology choices are well-established; rationale is sound; versions should be verified at npm before install |
| Features | MEDIUM | Web search was unavailable; findings based on training knowledge of comparable products (Wish, Amazon Wishlist, Giftster, Zola). Core swipe and wishlist features are HIGH; affiliate optimisation tactics and post-August-2025 competitor features are LOW |
| Architecture | HIGH | Convex schema patterns, swipe app architecture, and affiliate normalization pipeline are all well-documented patterns with no credible alternatives |
| Pitfalls | HIGH | Critical pitfalls (affiliate leakage, gesture performance, undo race, reservation privacy, compaction) are well-understood; MEDIUM on exact Convex function timeout limits and auth session persistence specifics — verify against current Convex docs |

**Overall confidence:** HIGH — sufficient to proceed to roadmap creation without additional research, with targeted verification of Convex-specific limits during Phase 1 implementation.

### Gaps to Address

- **Convex function execution limits:** Exact timeout values for queries, mutations, and actions may have changed. Verify at docs.convex.dev before designing any function that iterates over large user datasets. Flag in Phase 2 (Swipe Tracker) and Phase 5 (Compaction) planning.
- **Amazon PA-API v5 caching requirements:** TOS evolves. Verify current data freshness window and prohibited storage fields against Associates Central before wiring any real Amazon integration (not needed for v1 Dummy JSON scope, but schema must accommodate it from day one — `cachedAt` field required).
- **Affiliate link attribution per store:** Amazon Associates uses query-parameter attribution (`tag=`); other programs vary. Each store added beyond Dummy JSON requires an end-to-end click test before launch.
- **Auth-gate redirect flow UX:** The non-member reservation sign-up funnel is a conversion-critical flow. Reference implementation review or user testing is recommended before Phase 4 detailed task breakdown.
- **Convex auth session persistence specifics:** Depends on Clerk configuration details. Hard-refresh test must be an acceptance criterion at the end of Phase 1.

## Sources

### Primary (HIGH confidence)
- Convex schema, mutation, query, action, and auth patterns — training knowledge of docs.convex.dev (stable, well-documented API)
- react-spring v9 imperative API and time-based physics integration — training knowledge of react-spring.dev docs
- @use-gesture/react pointer/touch unification pattern — training knowledge of use-gesture.netlify.app docs
- Next.js 15 App Router SSR and API routes — training knowledge of nextjs.org docs
- Clerk + Convex JWT integration — training knowledge of Clerk and Convex integration documentation
- Tinder-style swipe UX patterns — established HCI/product design literature (Tinder, 2012–present)
- Amazon Associates affiliate tag requirements — training knowledge of Associates Central TOS structure
- Gift registry owner-visibility UX pattern — documented in gift registry product reviews and UX literature
- React `useRef` imperative DOM updates for gesture performance — well-documented React performance pattern
- `will-change: transform` GPU layer promotion — MDN Web Docs / CSS specification
- `nanoid` for cryptographic token generation — standard cryptographic token practice
- iOS Safari Vibration API non-support — MDN Browser Compatibility Data (2025)
- 12-factor app ENV-based configuration — 12factor.net

### Secondary (MEDIUM confidence)
- Training knowledge of Wish, Amazon Wishlist, Giftster, MyRegistry, Zola, Joy, Honeyfund, Wanderlist feature sets — used for FEATURES.md table stakes and differentiator analysis; no live competitor data fetched
- Convex function timeout limits (queries ~1s, mutations ~1s, actions up to ~2min) — training data from late 2024; verify before implementation
- Convex auth session persistence configuration — depends on chosen auth provider; verify against current Clerk + Convex integration guide

### Tertiary (LOW confidence)
- Emerging affiliate marketing optimisation tactics post-August 2025 — not covered by training knowledge; independent research recommended before Phase 5 affiliate attribution work
- Specific competitor feature changes post-August 2025 — no live data; validate assumptions if entering market requires competitive differentiation analysis

---
*Research completed: 2026-03-03*
*Ready for roadmap: yes*
