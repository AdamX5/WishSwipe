# Domain Pitfalls

**Domain:** Swipe-based product discovery and wishlist SaaS (WishSwipe)
**Researched:** 2026-03-03
**Confidence note:** WebSearch, WebFetch, and Context7 tools were unavailable during this session. All findings draw on training knowledge (cutoff August 2025). Confidence levels reflect this constraint. Flag any claim marked LOW or MEDIUM for independent verification before committing to implementation.

---

## Critical Pitfalls

Mistakes that cause rewrites, TOS termination, or fundamental UX failure.

---

### Pitfall 1: Affiliate Link Leakage — Raw Product URLs Escaping to the UI

**What goes wrong:** A raw store URL (e.g., `https://amazon.com/dp/B09XYZ`) reaches the client without an affiliate tag. This kills revenue for every click and, for Amazon Associates specifically, can trigger account review if you demonstrably show products but route clicks outside the program.

**Why it happens:** The Normaliser transforms URLs server-side, but developers add a "quick shortcut" path that bypasses the Normaliser (e.g., a debug endpoint, a shared wishlist fetch query that skips the link transform, or a copy-paste of a raw URL into a seed fixture). Over time, multiple code paths exist and only some go through the Normaliser.

**Consequences:**
- Lost affiliate revenue on every untagged click
- Amazon Associates TOS Section 5 violation: affiliate tags must appear on every qualifying link. Multiple untagged links can trigger account suspension.
- No retroactive fix — clicks already made are gone

**Prevention:**
- The Normaliser must be the only exit point for any outbound product URL. Enforce this at the schema level: the `ProductCard` type should have `affiliateUrl: string` — never `rawUrl: string` — as the field that reaches the client.
- Add a Convex schema validator that rejects documents without a non-empty `affiliateUrl`.
- Write a unit test that asserts no raw amazon.com/ebay.com/etsy.com domain appears in any returned `ProductCard.affiliateUrl` value without an affiliate parameter.
- In the wishlist sharing path, re-validate affiliate links at read time rather than assuming stored links are correct.

**Detection (warning signs):**
- Any code path that fetches product data without calling `normalise()` first
- A `ProductCard` type definition that has both `rawUrl` and `affiliateUrl` fields (suggests the raw URL is being passed around)
- Test fixtures that use literal store URLs

**Phase:** Normaliser build (Phase 1 / core engine). Must be correct before any real store is wired.

**Confidence:** HIGH (training knowledge of Amazon Associates TOS policy structure; policy requires affiliate tag on every qualifying link)

---

### Pitfall 2: Amazon Associates PA-API Caching Requirement Violation

**What goes wrong:** The Amazon Product Advertising API (PA-API 5) requires that any product data fetched from the API be cached for no longer than 24 hours. Displaying stale prices or availability beyond that window violates TOS. More critically, PA-API prohibits storing certain fields (full product descriptions, high-res images beyond specific uses) at all.

**Why it happens:** Developers fetch product snapshots and store them permanently in Convex as `ProductCard` documents to avoid re-hitting the API. The wishlist then displays those snapshots indefinitely.

**Consequences:**
- Amazon Associates account suspension
- Legal exposure if you display a stale price and a user purchases expecting that price

**Prevention:**
- Do not store PA-API full product payloads in Convex beyond the allowed window. Store only: product ASIN, title, affiliate URL, and a `fetchedAt` timestamp. Re-fetch price/availability at display time via a Convex action that calls PA-API.
- Alternatively, for v1 with Dummy JSON as the data source, this pitfall is deferred — but the schema must be designed to accommodate a TTL or `staleAt` field from day one, so that when Amazon is wired in Phase N, you are not doing a schema migration under live data.
- Mark all stored `ProductCard` images and prices with `source` and `cachedAt` fields.

**Detection:** No TTL or `cachedAt` field on `ProductCard` documents is the primary warning sign.

**Phase:** Pre-integration design (Phase 1 schema). Enforcement when real store APIs are wired.

**Confidence:** HIGH (PA-API 5 data freshness requirements are well-documented; this is a known compliance trap)

---

### Pitfall 3: Gesture Handling on the Main Thread — Frame Drops During Swipe

**What goes wrong:** Touch/pointer event handlers update React state directly. Each pointer move triggers a re-render, and if any render takes >4ms (likely once the component tree is non-trivial), frames are dropped. The card feels sticky or laggy, especially on mid-range Android devices.

**Why it happens:** Developers wire `onPointerMove` to `setState({ x, y })`. React's reconciler batches state updates, but under rapid input (120Hz screens, fast swipes) the queue backs up.

**Consequences:**
- Perceived lag destroying the "fluid" core value proposition
- 60fps target missed on any device doing real work (auth, background queries)
- Cannot be fixed after-the-fact without rewriting gesture handling

**Prevention:**
- Track card position exclusively via refs (`useRef`) during the active gesture. Only commit to React state on pointer release (swipe decision). This keeps the hot path entirely off the React reconciler.
- Apply position transforms directly to the DOM node via `ref.current.style.transform = ...` in the pointer move handler. This bypasses React entirely for the 1:1 tracking requirement.
- Use `touch-action: none` on the card container to prevent browser scroll interference.
- Use `will-change: transform` on the card element to promote it to its own compositor layer. This ensures GPU-accelerated transforms without layout recalculation.
- Avoid `pointer-events` changes mid-gesture — they trigger layout.

**Detection (warning signs):**
- `useState` or `useReducer` inside a `onPointerMove` / `onTouchMove` handler
- Chrome DevTools Performance tab showing "Forced reflow" or "Layout" events during swipe
- React DevTools Profiler showing component renders triggered at >30/second during drag

**Phase:** Swipe engine (Phase 1). Must be architected correctly from the first card implementation — retrofitting is a partial rewrite.

**Confidence:** HIGH (React DOM imperative updates vs. state-based re-renders is a well-understood pattern; `will-change` compositor promotion is standard practice)

---

### Pitfall 4: Spring Physics Feeling Wrong — Overshoot vs. Snap-Back Miscalibration

**What goes wrong:** The spring configuration (stiffness, damping, mass) is tuned on a desktop browser but feels wrong on mobile: either it snaps back too fast (feels digital, not physical), overshoots and bounces too many times (feels like a toy), or takes too long to settle (card hangs in limbo).

**Why it happens:** Spring physics are display-refresh-dependent. A spring tuned at 60Hz behaves differently at 90Hz or 120Hz if the animation library integrates physics per-frame. Additionally, human perception of "snap" differs between cursor-drag (desktop) and thumb-swipe (mobile) due to the inertia of the gesture itself.

**Consequences:**
- Users abandon swipes mid-gesture because the feedback doesn't match expectations
- A/B testing is difficult because the feel is subjective — teams debate endlessly instead of shipping

**Prevention:**
- Use `react-spring` (physics-based) rather than CSS transitions or `framer-motion`'s spring presets. `react-spring` integrates physics using wall-clock time deltas, not frame counts, so it is display-refresh-independent.
- Test on real mobile hardware (iOS Safari + Android Chrome) at every spring tuning iteration. Emulation is insufficient.
- Start with `stiffness: 300, damping: 30` as the baseline snap-back. For sling-out (confirmed swipe), use a different config: `stiffness: 200, damping: 25` to give the card momentum feel.
- Never calculate swipe-sling velocity from pointer position alone — capture pointer velocity at release (pixels/ms over last 16ms window) and use it as the initial velocity fed into the spring. Without this, all flings feel identical regardless of how fast the user swiped.

**Detection (warning signs):**
- Spring animation configured with `duration` rather than `stiffness`/`damping` (means it is CSS-based, not physics-based)
- No velocity capture on pointer release
- Spring configs in a single constant object shared between snap-back and sling-out animations

**Phase:** Swipe engine (Phase 1). Spring feel must be validated with real hardware before UX sign-off.

**Confidence:** HIGH (react-spring time-based integration vs. frame-based is well-documented; velocity capture at release is standard in swipe implementations)

---

### Pitfall 5: Card Queue Race Condition — Undo Breaking Queue Order

**What goes wrong:** The 3-card render window (Active, Next, Preview) and the Convex swipe history must stay in sync. When a user swipes right, triggers a Convex mutation (record the swipe), and immediately hits Undo, two async operations are in flight: the save mutation and the undo mutation. If the undo arrives before the save completes, the database record may be incorrect (undo with no record to revert, or the wrong record reverted).

**Why it happens:** Swipe actions are optimistic — the card leaves the screen before the Convex mutation confirms. Undo is also optimistic. Under normal conditions this is fine, but at high swipe velocity (rapid swiping) or on slow connections, mutations pile up and the ordering guarantee breaks.

**Consequences:**
- Wishlist contains items the user tried to un-save, or vice versa
- Undo button in incorrect enabled/disabled state
- Data integrity issues that are hard to audit

**Prevention:**
- Serialize swipe mutations through a client-side queue. Before dispatching a new swipe mutation, confirm the previous mutation has settled (Convex's `useMutation` returns a promise — await it). Only advance the card queue after confirmation.
- Limit Undo to one level deep (the project already specifies "undo last swipe"). Disable the Undo button while any swipe mutation is in flight.
- Store swipe records with a monotonically increasing `sequence` field (use `Date.now()` or Convex's `_creationTime`). The undo operation should target the highest-`sequence` record for the user, not assume "last inserted."
- Use Convex transactions: the undo mutation should read the current last swipe record and delete it atomically in a single mutation — not two round-trips (read then delete).

**Detection (warning signs):**
- Undo button enabled while `isMutating` is true for the swipe mutation
- Undo implementation that deletes by document ID captured at swipe time rather than querying for the most recent record
- No client-side mutation serialization (fire-and-forget pattern)

**Phase:** Ghost Database / swipe tracking (Phase 1-2). Must be addressed when Undo is implemented.

**Confidence:** HIGH (Convex mutation ordering and optimistic updates are standard patterns; this specific race is common in swipe apps)

---

### Pitfall 6: Wishlist Sharing — Gift Reservation Visibility Without Privacy Controls

**What goes wrong:** The "reserve" flag (I'm buying this) is visible to all viewers of a shared wishlist — including the wishlist owner. If the owner can see what has been reserved, the gift surprise is ruined. This is also a UX trap: if reservations are private but shown to the buyer, buyers have no way to coordinate (two people buying the same gift).

**Why it happens:** The simplest implementation shows all reservation data to all viewers of the link. The privacy requirement (hide from owner) is only discovered when a real user tries it.

**Consequences:**
- Core gift-coordination feature is broken by design
- Users route around it (don't share, don't use reservations) → feature has zero adoption
- Retrofitting owner-hide after launch requires a schema change and UI rework

**Prevention:**
- Model reservations as a separate Convex table from wishlist items. The query for "wishlist owner view" never fetches the reservations table. The query for "friend/guest view" fetches reservations and shows reserved status.
- Implement viewer identity check at the Convex query level: if `ctx.auth.userId === wishlist.ownerId`, return items without reservation data.
- The shareable link should encode a `shareToken` (opaque, non-guessable) — never the wishlist owner's user ID directly — to prevent enumeration.
- Clearly communicate in the UI that the owner cannot see who reserved what (privacy by design disclosure builds trust).

**Detection (warning signs):**
- Single query function returning all wishlist data regardless of who is calling
- `shareToken` is the owner's user ID or a sequential integer
- Reservations stored as a field on the `WishlistItem` document rather than a separate table

**Phase:** Wishlist sharing (Phase 2-3). Design the schema separation before any sharing UI is built.

**Confidence:** HIGH (this is a known gift registry UX pattern; the owner-visibility problem appears in every gift registry product review thread)

---

## Moderate Pitfalls

### Pitfall 7: API Normalization — Missing Fields Silently Producing Broken Cards

**What goes wrong:** A store API returns a product with a missing image, null price, or empty title. The Normaliser doesn't validate required fields and passes the card through. The UI renders a broken card (missing image, "$0", empty title) which users swipe past without understanding why, eroding trust.

**Why it happens:** Dummy JSON API is well-formed and complete. When a real API is wired, edge cases (out-of-stock items, draft listings, API partial responses) are not anticipated.

**Prevention:**
- Define a strict `ProductCard` Zod schema with `.min(1)` on strings, positive number validation on price, and URL validation on image and affiliateUrl. The Normaliser must validate against this schema and throw (or return `null` with a logged reason) rather than passing invalid cards downstream.
- At the data source level, filter out null/incomplete cards before they enter the swipe queue.
- Log every skipped/invalid card with the raw API payload for debugging.

**Detection:** Any `ProductCard` in the queue with an empty string, null, or 0 value for required fields.

**Phase:** Normaliser build (Phase 1). Validation schema is foundational.

**Confidence:** HIGH

---

### Pitfall 8: Convex Function Complexity Limits and Timeout Behavior

**What goes wrong:** A Convex query or mutation that does too much work (iterating all swipes for a user to compute statistics, normalizing a large batch of products inline) hits Convex's execution time limits and fails with a timeout error.

**Why it happens:** Developers treat Convex like a traditional server with unbounded execution time. Convex functions have strict time budgets (queries: ~1s, mutations: ~1s, actions: ~2 minutes but with different cost semantics).

**Consequences:**
- Swipe recording fails silently if the mutation also tries to compute aggregates
- Wishlist load fails if it tries to join across too many tables in one query

**Prevention:**
- Keep mutations minimal: record the swipe event, nothing else. Any aggregation (skip count, wishlist count) should be computed in a separate query that the UI subscribes to reactively.
- Use Convex scheduled functions for any batch processing (data compaction, aggregate recomputation) rather than inline in mutations.
- Read Convex's current function limits documentation before designing any function that iterates over user data. The limits as of late 2024 were: 1MB argument/return size, ~1s for queries and mutations, action timeout varies by plan.

**Detection:** Any mutation that contains a `.collect()` followed by iteration over the result set is a red flag.

**Phase:** Ghost Database design (Phase 1-2). Function scope discipline must be established early.

**Confidence:** MEDIUM (specific timeout numbers may have changed; verify against current Convex docs before relying on exact limits)

---

### Pitfall 9: touch-action and Scroll Conflict on Mobile

**What goes wrong:** On a scrollable page, horizontal swipe gestures conflict with vertical scroll. The browser interprets the gesture as scroll and the card doesn't move, or the card and page scroll simultaneously.

**Why it happens:** The browser's default touch handling intercepts pointer events for scroll. If `touch-action` is not set correctly on the swipe container, the browser owns the gesture.

**Prevention:**
- Set `touch-action: none` on the card swipe container element. This tells the browser: "I am handling all touch gestures inside this element."
- Ensure the swipe container is full-screen (or large enough that the user never needs to scroll inside it). If the user must scroll to see cards, the gesture model is broken.
- Test on iOS Safari specifically — it has historically differed from Chrome in how it handles `touch-action` and passive event listeners.

**Detection:** Any card container that has a CSS `overflow` setting or that sits inside a scrollable parent without `touch-action: none` on the card container itself.

**Phase:** Swipe engine (Phase 1).

**Confidence:** HIGH

---

### Pitfall 10: Wishlist Sharing Link — Token Guessability and Enumeration

**What goes wrong:** Shared wishlist URLs use sequential IDs (`/wishlist/123`) or user IDs (`/wishlist/user_abc123`). An attacker enumerates all wishlist IDs and scrapes all public wishlists.

**Why it happens:** Convex document IDs are opaque but potentially predictable depending on implementation. Developers often use the document ID directly as the share token.

**Prevention:**
- Generate a cryptographically random `shareToken` (e.g., `nanoid()` with 21 characters) on wishlist creation. Store it in the Convex `wishlists` table.
- The shareable URL is `/w/{shareToken}` — not the Convex document ID.
- The Convex query for public wishlist view takes `shareToken` as argument and looks up by index — never by document ID.
- Add a rate limit on the public wishlist query (Convex actions can implement this via a rate-limit table pattern).

**Detection:** Share URL that contains the Convex `_id` field value or the user's auth ID.

**Phase:** Wishlist sharing (Phase 2-3).

**Confidence:** HIGH

---

### Pitfall 11: Affiliate Link Click Attribution — Losing the Tag on Redirect Chains

**What goes wrong:** The affiliate URL is correctly formed at the Normaliser level, but the redirect path strips the affiliate tag. This happens when: (a) a URL shortener is used without preserving query params, (b) the store's redirect chain drops unknown query params, or (c) the `<a>` tag uses `rel="noreferrer"` which, for some affiliate systems that rely on the referrer header rather than query params, kills attribution.

**Why it happens:** The affiliate tag is assumed to survive the redirect, but it is never tested end-to-end.

**Prevention:**
- Test every configured store's affiliate link end-to-end by clicking through and verifying the affiliate dashboard registers the click.
- Avoid URL shorteners for affiliate links. Pass the full affiliate URL directly.
- For Amazon Associates specifically: use the `tag=` query parameter (query-param-based attribution), not referrer-based attribution. `rel="noreferrer"` is fine as long as the `tag=` param is present.
- Log outbound affiliate clicks as Convex events. If clicks are logged but affiliate dashboard shows 0 clicks, the link chain is broken.

**Detection:** Affiliate dashboard showing 0 attributed clicks despite user activity on the wishlist/card.

**Phase:** Normaliser build + wishlist (Phase 1-2).

**Confidence:** MEDIUM (Amazon Associates uses query-param attribution; other affiliate programs vary — verify per-program before launching)

---

### Pitfall 12: Card Image Loading Causing Layout Shift During Swipe

**What goes wrong:** The next card in the queue starts loading its product image after it becomes visible. If the image takes 300-500ms to load, the card renders at a different height initially (or with a blank box), and then jumps when the image arrives. During a swipe, this causes visual instability and can break the spring animation (the card dimensions change mid-animation).

**Why it happens:** Images are not preloaded. The "3-card render limit" is interpreted as "render 3 cards lazily" rather than "pre-load the image assets for all 3 cards."

**Prevention:**
- Use `<img loading="eager">` (or preload via `new Image()`) for the Active and Next cards. The Preview card can lazy-load.
- Fix card dimensions in CSS (e.g., `aspect-ratio: 3/4`, `width: 100%`) so the layout is stable regardless of image load state. Show a skeleton/placeholder at the fixed dimensions.
- Pre-fetch the 4th card's image URL while the user is swiping the 3rd, so it is cached by the time it becomes Next.

**Detection:** Chrome DevTools Lighthouse "Cumulative Layout Shift" score > 0.1 on the swipe screen; visual flicker visible in screen recordings on a throttled network connection.

**Phase:** Swipe engine UI (Phase 1).

**Confidence:** HIGH

---

## Minor Pitfalls

### Pitfall 13: Haptic Feedback API Coverage

**What goes wrong:** `navigator.vibrate()` is used for haptic feedback on right swipe. It works on Android Chrome but is not supported on iOS Safari (as of 2025, iOS still does not expose the Vibration API). iOS users get no haptic feedback, and the feature feels inconsistent.

**Prevention:**
- Wrap haptic calls in a feature-detect: `if (navigator.vibrate) navigator.vibrate(10)`.
- For iOS, pair the right-swipe with a visible UI "pulse" (the project already specifies "UI pulse") so the feedback is always present regardless of haptic support.
- Do not rely on haptics as the sole confirmation signal.

**Phase:** Swipe engine (Phase 1).

**Confidence:** HIGH (iOS Vibration API non-support is well-documented)

---

### Pitfall 14: Convex Auth — Session Persistence on Browser Refresh

**What goes wrong:** Convex's auth integration (e.g., with Clerk or the built-in auth) stores the session token in memory by default in some configurations. On browser refresh, the user is logged out. For a wishlist app, this is a critical usability failure — returning to find yourself logged out is unacceptable.

**Prevention:**
- Use Convex's recommended auth integration (Clerk or Auth.js) with `localStorage` or `sessionStorage` persistence explicitly configured.
- Test the auth flow with a hard browser refresh (Cmd+Shift+R) as part of every auth milestone acceptance criterion.

**Phase:** Auth (Phase 2).

**Confidence:** MEDIUM (Convex auth configuration specifics depend on which auth provider is chosen; verify against current Convex auth docs)

---

### Pitfall 15: Data Compaction Deleting the Wishlist

**What goes wrong:** The "data compaction strategy" that condenses swipe history also compacts or deletes the underlying wishlist items. A user opens their wishlist 3 months later and items are missing.

**Why it happens:** Compaction logic treats all old swipes equally (Right swipes and Left swipes) and removes them. Wishlist items are derived from Right swipes, not stored as a separate record.

**Prevention:**
- Store wishlist items as a **separate Convex table** from swipe events. A Right swipe creates both a `swipeEvent` record (compactable) and a `wishlistItem` record (permanent until the user removes it). Compaction only touches `swipeEvent`.
- Never derive the wishlist by querying swipe history at runtime. The wishlist is its own durable state.

**Phase:** Ghost Database design (Phase 1). Schema decision is foundational.

**Confidence:** HIGH

---

### Pitfall 16: ENV-Based Multi-Store Config — Missing Key Causes Silent Skip With No Observability

**What goes wrong:** The project specifies that missing ENV entries cause stores to be "silently skipped." In production, a misconfigured deployment (wrong variable name, missing secret) causes 0 products to load. The swipe queue is empty and no error is surfaced.

**Prevention:**
- At startup, log which stores are configured vs. skipped (non-secret info: "Amazon: CONFIGURED", "eBay: SKIPPED — missing ENV"). Never log the key values themselves.
- Add a `/api/health` or Convex action that returns which data sources are active. Use this in deployment verification.
- If ALL configured sources return 0 products, surface an observable error (Convex dashboard alert, Sentry event) rather than showing an empty swipe queue silently.

**Phase:** Normaliser (Phase 1).

**Confidence:** HIGH

---

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation |
|-------------|---------------|------------|
| Swipe engine — gesture tracking | Main-thread state updates causing frame drops | Use refs + direct DOM transforms; commit to state only on release |
| Swipe engine — spring physics | Velocity not captured at release; springs feel uniform | Capture pointer velocity over last 16ms window; feed into react-spring |
| Swipe engine — card images | Layout shift on image load during animation | Fix card dimensions; preload Next card image |
| Normaliser — output schema | Raw URLs escaping to UI | `affiliateUrl` only field type; unit test for raw domain presence |
| Normaliser — validation | Null/missing fields silently producing broken cards | Zod schema with .min(1) and URL validation; filter before queue |
| Normaliser — store config | Silent skip with no observability | Startup logging + health endpoint |
| Ghost DB — schema | Wishlist derived from swipe history (compactable) | Separate `wishlistItem` table from `swipeEvent` table |
| Ghost DB — mutations | Undo race condition | Serialize mutations; disable Undo while in-flight |
| Ghost DB — function design | Mutation doing too much work | One mutation = one atomic event; aggregates in separate queries |
| Auth | Session not persisted across browser refresh | Verify localStorage persistence with hard-refresh test |
| Wishlist sharing — privacy | Owner sees reservation data | Owner-vs-friend query branching at Convex layer |
| Wishlist sharing — security | Sequential/guessable share tokens | nanoid() shareToken; index lookup by token, not by ID |
| Affiliate links — compliance | Amazon PA-API data freshness violation | TTL/`cachedAt` on all stored product data; re-fetch price at display |
| Affiliate links — attribution | Tag stripped in redirect chain | End-to-end click test; verify affiliate dashboard counts |
| Haptic feedback | iOS Safari Vibration API missing | Feature-detect; UI pulse as fallback |

---

## Sources

- Training knowledge of React gesture patterns, DOM imperative updates, `will-change`, `touch-action` CSS (HIGH confidence)
- Training knowledge of react-spring time-integration physics model (HIGH confidence)
- Training knowledge of Amazon Associates PA-API 5 TOS: data freshness and affiliate tag requirements (HIGH confidence — but verify against current Associates Central policy before launch as TOS evolves)
- Training knowledge of Convex mutation/query time limits and schema patterns (MEDIUM confidence — verify exact limits at docs.convex.dev before implementation)
- Training knowledge of Convex auth session persistence patterns (MEDIUM confidence — depends on chosen auth provider)
- Gift registry "owner visibility" UX pattern — documented in gift registry product reviews and UX studies (HIGH confidence)
- `nanoid` for share token generation — standard cryptographic token practice (HIGH confidence)
- iOS Safari Vibration API non-support — MDN compatibility data as of 2025 (HIGH confidence)
- Network tools (WebSearch, WebFetch) were unavailable during this session. All external source claims should be independently verified.
