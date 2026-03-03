# Feature Landscape

**Domain:** Swipe-based product discovery and wishlist platform with affiliate monetization and gift coordination
**Researched:** 2026-03-03
**Confidence note:** Web search and WebFetch tools were unavailable in this environment. All findings are drawn from training-data knowledge of the domain (Wish, ShopStyle, Amazon Wishlist, Giftster, MyRegistry, Zola, Joy, Honeyfund, Wanderlist, and Tinder-for-X UX patterns). Confidence is MEDIUM for widely-established patterns, LOW for emerging or niche observations. No live competitor data was fetchable.

---

## Table Stakes

Features users expect from a swipe-based product discovery + wishlist app. Missing = product feels incomplete or broken.

### Swipe Mechanics

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Drag-to-swipe card UI | Tinder established this as the universal affordance for binary decisions; users arrive expecting it | Med | Must track finger/cursor 1:1 with zero perceived lag |
| Visual swipe feedback (color overlay / label) | Green "Save" / red "Skip" overlay on drag — users have been trained by Tinder and imitators | Low | Appears during drag, not just on release |
| Spring snap-back on cancel | Card must return to center when released below threshold — hard abandon feels like a bug | Med | Spring physics (not linear) make this feel premium |
| Card exit animation | Card must fly off screen convincingly — flat disappearance kills the tactile illusion | Med | Direction of exit must match swipe direction |
| Swipe threshold | Clear, consistent threshold where swipe commits vs cancels — too sensitive = mis-saves, too stiff = tedious | Low | Typically 20–35% of card width |
| Undo last swipe | Users immediately regret hasty swipes; no undo = frustration and early drop | Med | Restores previous card + reverts DB record |
| Keyboard / button fallback | Touch-only UIs exclude desktop users; left/right arrows or buttons needed | Low | Web-first product must support non-touch |
| Loading / end-of-deck state | What happens when cards run out? Infinite loop, "no more items," or "come back tomorrow" — must be explicit | Low | Undefined state = users think the app is broken |

### Wishlist Management

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Saved items list | Core product value; users need to retrieve what they swiped right on | Low | Grid or list view; sortable by date saved |
| Remove item from wishlist | Tastes change; inability to remove feels like a trap | Low | Soft delete — keep in swipe history, remove from wishlist |
| Item detail view | Price, image, title, source store — enough to make a purchase decision without leaving the app | Low | Opens before affiliate redirect |
| Affiliate redirect on click | Every outbound click must go through affiliate link — monetization is structural, not optional | Low | Must be enforced at Normaliser level, not UI level |
| Wishlist persistence across sessions | Saved items must survive logout and browser refresh | Low | Requires backend persistence (Convex) |
| Item availability signal | "This item may no longer be available" indicator if price/URL is stale | Med | Depends on API refresh cadence |

### Auth and Accounts

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Email + password sign-up | Table stakes for any authenticated product | Low | Password strength validation, email verification optional for v1 |
| Email + password log in | — | Low | — |
| Persistent session | Stay logged in across browser restarts | Low | JWT or session cookie; Convex handles natively |
| Log out | — | Low | — |
| Account deletion / data erasure | GDPR/CCPA baseline; missing = legal exposure in EU | Med | Must purge swipe history and wishlist |

### Product Display (Normalised Card)

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Product image | Users cannot evaluate a product without seeing it | Low | First image from API; fallback to placeholder |
| Product title | — | Low | Truncate to 2 lines max |
| Price | Primary purchase-decision signal | Low | Display currency; handle missing price gracefully |
| Source store label | Users want to know where they're being sent | Low | Store name + optional logo |
| Star rating / review count | Social proof; expected on any e-commerce surface | Low | Display only if available; omit rather than show zero |
| "Tap to see more" affordance | Users need to know they can get more detail before committing a click | Low | Subtle indicator; not a blocking modal |

### Sharing and Gift Coordination

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Shareable wishlist link | Core use case for gift season; without it, the gift coordination angle is zero | Low | Unique URL per user; publicly accessible without auth |
| Viewable wishlist for non-members | The gift-giver must not need an account to see the list | Low | Read-only view; no swipe engine exposed |
| Reserve / claim an item | "I'm buying this" signal prevents duplicate gifts — the entire gift coordination value prop | Med | Visible to all viewers of the shared link; NOT to the list owner |
| Sign-up gate for reservation | Capturing gift-givers as users is legitimate growth mechanic; reservation requires account | Low | Gated registration flow; must explain why account needed |
| Duplicate-gift protection | If item is already reserved, make that clearly visible to other viewers | Low | UI badge on reserved items |

---

## Differentiators

Features that distinguish WishSwipe. Users don't expect these, but they create stickiness and competitive advantage.

### Swipe Mechanics

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Haptic feedback on right swipe | Tactile reward loop — makes saving feel satisfying, increases session length | Low | Web Vibration API; silently skip if unsupported |
| 3-card DOM limit (Active / Next / Preview) | 60fps on any device, including low-end phones; competitors load dozens of cards | Med | Requires card queue management logic |
| Subtle peek of next card behind active | Creates visual continuity and implied infinite supply — reduces "am I done?" anxiety | Med | z-index stacking with offset/scale transform |
| Swipe velocity affects exit animation speed | Slow drag feels slow; fast fling feels fast — matches user intent | Med | Read release velocity; scale animation duration accordingly |
| Session progress indicator | "You've seen 40 products today" — creates sense of accomplishment and re-engagement hook | Low | Simple counter; no progress bar needed |

### Wishlist Management

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Price-drop alert for saved items | "That dress you saved dropped 20%" — drives re-engagement and affiliate clicks | High | Requires periodic price polling per saved item; push/email notification |
| "Already reserved" hiding for list owner | Owner sees full list; gift-givers see reserved status. Owner never knows what's being bought | Med | Row-level visibility rules; critical for surprise-gift UX |
| Wishlist notes per item | "Size M, please" — reduces wrong-size gift purchases; increases list utility | Low | Short free-text field attached to wishlist entry |
| Priority ranking | "Most wanted" flag — helps gift-givers pick the right item from a long list | Low | Simple boolean or 1–5 priority |
| Category / tag grouping | Group by "For the kitchen", "Clothing" — usable for large wishlists | Med | User-defined tags; filter UI needed |
| Item count and estimated total | "Your wishlist: 12 items, ~$340 total" — useful context for gift-givers budgeting | Low | Computed from saved prices; note prices may be stale |

### Affiliate Monetization

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Click-through tracking (per item, per session) | Know which products convert; which categories drive revenue | Med | Log affiliate redirect events in Convex |
| Affiliate link health monitoring | Dead affiliate URLs = zero revenue; proactive detection | High | Scheduled check of redirect chains; alert on 4xx/5xx |
| Store-level revenue attribution | "Amazon clicks generated $X this month" — informs which APIs to prioritise | Med | Aggregate click events by source store |
| Affiliate ID rotation by store | Different affiliate programs per store; Normaliser must map store → affiliate ID from ENV | Low | Already in PROJECT.md design; make it multi-tenant capable |
| Conversion tracking pixel support | Some affiliate networks provide tracking pixels for confirmed purchases | High | Complex; requires network-specific integration; v2+ |

### Product Normalization (The Normaliser)

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| ENV-based store config | Adding a store = one ENV entry, zero code changes — the "engine" value prop | Med | Validated at startup; missing keys silently skip store |
| Schema validation on ingest | Bad API response doesn't crash the swipe deck | Low | Zod or similar schema; log + skip invalid products |
| Image CDN proxying / resizing | Serve consistently-sized card images regardless of source API image dimensions | Med | Cloudflare Images or similar; prevents layout shift |
| Deduplication across stores | Same product from two stores shouldn't appear twice in a session | Med | Hash on title + price + brand; prefer highest affiliate value |
| Currency normalisation | APIs return prices in native currency; must normalise to user locale | Med | Exchange rate API or fixed-conversion for v1 |
| Out-of-stock filtering | Don't show products the user cannot buy | Low | Filter on ingest; store stock status in normalised schema |
| Freshness TTL per store | Cached products expire based on store's update cadence | Med | Configurable per store in ENV |

### Algorithm and Personalisation

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Swipe history as training signal | Every swipe is labeled data (right = positive, left = negative) — valuable even before the algorithm exists | Low | Already in PROJECT.md; just ensure schema is ML-ready |
| Category preference inference | After 10+ swipes, infer preferred categories from right-swipe patterns | Med | Simple frequency analysis; no ML needed for v1 |
| "Similar to items you liked" surfacing | Show products in categories the user has right-swiped before | Med | Tag-based filtering using swipe history |
| Cold-start fallback | New users see curated best-sellers or trending items before personalisation kicks in | Low | Static curated list or "popular this week" query |

### Social and Gift Coordination

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Multiple wishlists per user | "Birthday list", "Apartment wishlist" — standard expectation for heavy users | Med | Named lists; shareable link per list |
| Gift occasion tagging | "Christmas 2026" tag on a list — shareable context for gift-givers | Low | Free-text or dropdown; display on shared view |
| Group gifting signal | "3 people are going in on this together" — useful for expensive items | High | Complex coordination; v2+ only |
| Anonymous reservation | Gift-giver can reserve without revealing their identity to other gift-givers | Low | Name shown to other viewers but not to list owner |
| "Purchased" confirmation | Gift-giver marks item as actually purchased (not just reserved) — clears it from the list | Low | State machine: available → reserved → purchased |

---

## Anti-Features

Features to deliberately NOT build in v1, with rationale.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| Social graph / following / friend feeds | Adds social network cold-start problem on top of product discovery cold-start problem; doubles scope | Build sharing via link only; no social graph |
| In-app chat or messaging | Every gift coordination chat message is a support ticket waiting to happen; WhatsApp/iMessage is better | Deep-link share to native messaging apps |
| In-app payments or escrow | Requires PCI compliance, dispute resolution, and payment processor integration; doesn't improve affiliate revenue | Affiliate redirect only — purchasing happens on the store |
| User-generated product uploads | Spam, counterfeit goods, moderation overhead; no affiliate revenue from user-uploaded products | API-sourced products only via the Normaliser |
| Real-time collaborative wishlists | Operational transform / CRDTs for wishlist editing is complex; gift-givers don't edit the list | Read-only shared view; only the owner edits |
| Push notifications (v1) | Requires service worker + push subscription + notification permission — high engineering cost for low v1 value | Email notifications for price drops and reservations |
| Native mobile app (v1) | Doubles platform maintenance; web PWA achieves 80% of mobile UX | Web-first; PWA manifest for home-screen install |
| Infinite swipe history replay | Replaying all historical swipes is expensive and rarely useful; users want to move forward | Undo last swipe only; no full history replay UI |
| Admin product curation dashboard | Manual curation doesn't scale; the Normaliser and algorithm replace editorial | API-sourced products + algorithm; no editorial UI |
| Multi-currency checkout | Purchasing happens on the external store, not in-app — currency handling is the store's problem | Show prices in source currency with locale formatting |
| A/B testing framework | Significant infrastructure overhead; premature before product-market fit | Ship one version; iterate based on qualitative feedback |
| Gamification / badges / streaks | Adds complexity without clear revenue uplift for an affiliate model | The swipe mechanic itself is the engagement loop |
| Price comparison across stores | Requires real-time price fetching from multiple stores for the same product simultaneously; affiliate conflict | Show one listing per product; pick highest-commission source |

---

## Feature Dependencies

```
Auth (email sign-up) → Wishlist persistence
Auth (email sign-up) → Reservation (gift coordinator must have account)
Normaliser (affiliate URL) → Any affiliate revenue
Normaliser (affiliate URL) → Wishlist redirect click
Normaliser (schema) → Swipe card display
Swipe engine → Swipe history (Ghost DB)
Swipe history → Personalisation / category inference
Shareable wishlist link → Gift coordination
Shareable wishlist link → Reservation feature
Reservation → "Already reserved" visibility
Reserve sign-up gate → Auth (email sign-up)
Price-drop alerts → Wishlist persistence + notification channel
Click-through tracking → Affiliate link redirect
```

### Dependency Layers (build order implied)

```
Layer 1 (foundation):  Auth, Normaliser, Convex schema
Layer 2 (core loop):   Swipe engine, Ghost DB (swipe recording)
Layer 3 (value):       Wishlist view, affiliate redirect, shareable link
Layer 4 (coordination): Reservation, "already reserved" visibility
Layer 5 (growth):      Price-drop alerts, category inference, personalisation
```

---

## MVP Recommendation

Prioritise (Layers 1–4 only):

1. Auth — email + password sign-up / log in / persistent session
2. Normaliser — Dummy JSON ingest, normalised Product Card schema, affiliate URL transformation
3. Swipe engine — 3-card DOM, drag tracking, spring physics, right/left save/skip, undo
4. Ghost DB — swipe recording in Convex, undo support
5. Wishlist view — saved items list, affiliate redirect on click
6. Shareable link — publicly accessible read-only wishlist view
7. Reservation — reserve/unreserve, "already reserved" badge, sign-up gate for non-members

Defer to later phases:

- Price-drop alerts: requires periodic polling infrastructure and notification channel; v2
- Category inference / personalisation: requires sufficient swipe history; v2
- Multiple wishlists per user: complicates sharing model; v2
- Click-through tracking: valuable but not blocking; add in Layer 3 alongside affiliate redirect
- Image CDN proxying: use direct API image URLs for v1; add CDN if layout shift is a real problem
- Deduplication across stores: only relevant when 2+ real stores are connected; deferred until post-Dummy JSON

---

## Phase-Specific Feature Warnings

| Phase Topic | Feature Risk | Mitigation |
|-------------|-------------|------------|
| Swipe engine | 60fps on low-end Android is hard without a 3-card DOM limit | Enforce card count at the queue level, not just at render |
| Swipe engine | Undo requires atomic DB operation (revert + restore) | Design Ghost DB write as a transaction from day one |
| Normaliser | Affiliate URL structure differs per store (Amazon, eBay, Etsy all have different param formats) | Abstract affiliate URL building behind a per-store formatter function from day one |
| Wishlist sharing | Public wishlist URL must not expose internal user IDs | Use opaque share tokens, not user UUIDs |
| Reservation | Owner must not see who reserved what (gift surprise) | Enforce visibility rules at query layer, not just UI |
| Auth | Session persistence across Convex restarts needs testing | Use Convex Auth or Clerk; don't roll your own JWT |
| Gift coordination | Non-member reservation flow is a conversion funnel; friction kills it | Minimal sign-up form (email + password only); no email verification required to reserve |
| Affiliate links | Raw store URLs accidentally leaking into production = lost revenue | Enforce affiliate URL in Normaliser output schema; add test assertion |

---

## Sources

- Training-data knowledge of: Tinder swipe UX patterns (2012–present), Wish app feature set, Amazon Wishlist, Giftster, MyRegistry, Zola, Joy, Honeyfund, Wanderlist
- PROJECT.md requirements and constraints (WishSwipe, 2026-03-03)
- General knowledge of: affiliate marketing mechanics (Amazon Associates, ShareASale, CJ Affiliate), product API normalisation patterns, Convex data modelling
- Web search and WebFetch tools were unavailable — no live competitor data was fetched
- Overall confidence: MEDIUM for swipe mechanics and wishlist features (established patterns), LOW for specific affiliate revenue optimisation tactics and emerging app features post-August 2025
