# Architecture Patterns

**Domain:** Swipe-based product discovery SaaS with multi-source normalization and affiliate monetization
**Researched:** 2026-03-03
**Confidence:** HIGH (Convex patterns well-documented; swipe app patterns well-established; affiliate normalization is standard pipeline design)

---

## Recommended Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│  CLIENT (Browser)                                               │
│                                                                 │
│  ┌─────────────┐   ┌──────────────┐   ┌─────────────────────┐  │
│  │  Swipe UI   │   │  Wishlist UI │   │  Share/Reserve UI   │  │
│  │  (3-card    │   │  (saved items│   │  (public, no auth   │  │
│  │   stack)    │   │   view)      │   │   required to view) │  │
│  └──────┬──────┘   └──────┬───────┘   └──────────┬──────────┘  │
│         │                 │                       │             │
│  ───────┴─────────────────┴───────────────────────┴──────────── │
│                    Convex React SDK (useQuery / useMutation)     │
└─────────────────────────────┬───────────────────────────────────┘
                              │  WebSocket (Convex protocol)
┌─────────────────────────────▼───────────────────────────────────┐
│  CONVEX BACKEND                                                 │
│                                                                 │
│  ┌──────────────────┐   ┌─────────────────┐  ┌──────────────┐  │
│  │  Card Queue      │   │  Swipe Tracker  │  │  Auth Layer  │  │
│  │  (query layer)   │   │  (mutations)    │  │  (Clerk/     │  │
│  │                  │   │                 │  │   built-in)  │  │
│  │  getNextBatch()  │   │  recordSwipe()  │  │              │  │
│  │  peekCards()     │   │  undoSwipe()    │  └──────────────┘  │
│  └──────┬───────────┘   └────────┬────────┘                    │
│         │                        │                             │
│  ┌──────▼───────────┐   ┌────────▼────────┐  ┌──────────────┐  │
│  │  products table  │   │  swipes table   │  │  wishlists   │  │
│  │  (normalized)    │   │                 │  │  table       │  │
│  └──────────────────┘   └─────────────────┘  └──────┬───────┘  │
│                                                      │          │
│  ┌────────────────────────────────────────┐  ┌──────▼───────┐  │
│  │  Normaliser (Convex Action)            │  │reservations  │  │
│  │                                        │  │  table       │  │
│  │  fetchFromSource() → normalize()       │  └──────────────┘  │
│  │         → affiliatize() → upsert()     │                    │
│  └────────────────────────────────────────┘                    │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Share Links (shareTokens table + public query)         │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────┬───────────────────────────────────┘
                              │  HTTP fetch (server-side, in Actions)
┌─────────────────────────────▼───────────────────────────────────┐
│  EXTERNAL APIs                                                  │
│                                                                 │
│  ┌───────────────┐  ┌──────────────┐  ┌───────────────────────┐ │
│  │  Dummy JSON   │  │  (future)    │  │  (future)             │ │
│  │  API (v1)     │  │  Amazon PA   │  │  Etsy / eBay          │ │
│  │               │  │  API         │  │  APIs                 │ │
│  └───────────────┘  └──────────────┘  └───────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

---

## Component Boundaries

| Component | Responsibility | Communicates With | Lives In |
|-----------|---------------|-------------------|----------|
| **Swipe UI** | Renders 3-card stack, handles gesture/pointer events, triggers swipe mutations | Convex via `useMutation` (recordSwipe, undoSwipe), Convex via `useQuery` (getNextBatch) | Client |
| **Wishlist UI** | Displays saved products for authenticated user; affiliate link redirect | Convex via `useQuery` (getUserWishlist) | Client |
| **Share/Reserve UI** | Public view of a wishlist by token; reserve action requires auth | Convex via `useQuery` (getWishlistByToken), `useMutation` (reserveItem) | Client |
| **Normaliser** | Fetches raw product data from configured store APIs, transforms to canonical ProductCard shape, bakes in affiliate links, upserts to `products` table | External store APIs (HTTP), `products` table (write) | Convex Action |
| **Card Queue** | Serves paginated batches of products not yet swiped by user; tracks position | `products` table (read), `swipes` table (read to exclude seen) | Convex Query |
| **Swipe Tracker** | Records swipe events (right/left), handles undo, enforces data compaction rules | `swipes` table (write/delete), `wishlists` table (write/delete) | Convex Mutation |
| **Auth Layer** | Manages user identity, session tokens, email+password sign-up/in | Clerk (recommended) or Convex built-in auth; `users` table | Convex + Client |
| **Share Token Service** | Generates unique opaque tokens for wishlist sharing; resolves token to wishlist | `shareTokens` table (read/write) | Convex Mutation + Query |
| **Reservation Service** | Marks a wishlist item as reserved by a specific user; broadcasts to all viewers of that share link | `reservations` table (write), real-time via Convex subscription | Convex Mutation |

---

## Data Flow

### 1. Product Ingestion: Raw API → Normalized Card

```
ENV config (STORE_CONFIGS)
  └─► Normaliser Action (scheduled or on-demand)
        └─► fetchFromSource(storeId)  → raw API response
        └─► normalize(raw, storeSchema) → ProductCard shape
        └─► affiliatize(productUrl, affiliateId) → affiliate URL
        └─► convex.db.patch/insert(products, normalizedCard)
```

The Normaliser runs as a Convex Action (not a Mutation) because Actions can make external HTTP calls. After normalization, it calls an internal Mutation to write to the database.

### 2. Card Queue: Normalized Card → Swipe UI

```
Swipe UI mounts
  └─► useQuery("cards/getNextBatch", { userId, batchSize: 20 })
        └─► query products table (exclude already-swiped by this user)
        └─► returns array of ProductCard[]
        └─► client holds in local state as queue
        └─► renders positions [0]=Active, [1]=Next, [2]=Preview
        └─► when queue drops to ≤ 5 cards: re-query for next batch
```

Client-side queue management (not server-side cursor) is preferred: simpler, works offline briefly, avoids round-trip per swipe.

### 3. Swipe Event: Gesture → Database Record

```
User swipes card
  └─► gesture handler resolves direction (left/right)
  └─► useMutation("swipes/recordSwipe")({ userId, productId, direction, timestamp })
        └─► insert into swipes table
        └─► if direction === "right":
              └─► insert into wishlists (userId, productId)
  └─► client pops card from local queue → renders next card
  └─► undo buffer: client keeps last 1 card snapshot
```

Swipe record and wishlist insert happen in the same Mutation (atomic in Convex).

### 4. Undo: Revert Last Swipe

```
User taps Undo
  └─► useMutation("swipes/undoSwipe")({ userId })
        └─► query swipes by userId, orderBy timestamp desc, take 1
        └─► delete that swipe record
        └─► if it was right-swipe: delete corresponding wishlists record
        └─► return the undone ProductCard snapshot
  └─► client re-inserts card at position [0] of local queue
```

### 5. Wishlist: Swipe Records → User View

```
User navigates to /wishlist
  └─► useQuery("wishlists/getUserWishlist", { userId })
        └─► query wishlists table by userId
        └─► join products for full card data
        └─► returns WishlistItem[]  (productSnapshot + affiliateUrl)
  └─► click product → window.open(affiliateUrl)  (never raw store URL)
```

### 6. Share Link: Wishlist → Public URL

```
User clicks "Share"
  └─► useMutation("sharing/createShareToken")({ userId })
        └─► check existing token for userId (one token per user)
        └─► if none: generate crypto.randomUUID() as token
        └─► insert shareTokens { userId, token, createdAt }
        └─► return token
  └─► client constructs URL: /share/{token}
  └─► user copies URL

Recipient visits /share/{token}
  └─► useQuery("sharing/getWishlistByToken", { token })
        └─► resolve token → userId
        └─► query wishlists + products for that userId
        └─► query reservations for those items
        └─► return WishlistItem[] with reservedBy field
  └─► render public wishlist (no auth required to view)
```

### 7. Reservation: Gate Behind Auth

```
Non-member clicks "Reserve"
  └─► redirect to sign-up flow (pre-fill return URL)
  └─► after auth: re-navigate to /share/{token}

Authenticated user clicks "Reserve"
  └─► useMutation("reservations/reserveItem")({ wishlistItemId, reserverId })
        └─► check no existing reservation for this item
        └─► insert reservations { wishlistItemId, reserverId, reservedAt }
        └─► all subscribers to getWishlistByToken instantly see update (Convex reactive)
```

---

## Convex Schema Design

```typescript
// convex/schema.ts

import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({

  // Canonical product records — output of the Normaliser
  products: defineTable({
    sourceStore: v.string(),           // "dummyjson" | "amazon" | "etsy"
    sourceId: v.string(),              // original ID in source system
    title: v.string(),
    description: v.optional(v.string()),
    imageUrl: v.string(),
    priceAmount: v.number(),           // always in cents to avoid float issues
    priceCurrency: v.string(),         // "USD"
    starRating: v.optional(v.number()), // 0–5
    reviewCount: v.optional(v.number()),
    affiliateUrl: v.string(),          // NEVER raw store URL
    category: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
    normalizedAt: v.number(),          // Unix ms — for compaction/freshness
    isActive: v.boolean(),             // soft-delete for de-listed products
  })
    .index("by_source", ["sourceStore", "sourceId"])  // dedup on upsert
    .index("by_category", ["category"])               // future: filter by category
    .index("by_store", ["sourceStore"]),              // future: store filter

  // Every swipe interaction — the raw event log
  swipes: defineTable({
    userId: v.id("users"),
    productId: v.id("products"),
    direction: v.union(v.literal("right"), v.literal("left")),
    swipedAt: v.number(),              // Unix ms
    // Snapshot of card at swipe time — preserves history if product changes
    productSnapshot: v.object({
      title: v.string(),
      imageUrl: v.string(),
      priceAmount: v.number(),
      priceCurrency: v.string(),
      affiliateUrl: v.string(),
      sourceStore: v.string(),
    }),
  })
    .index("by_user", ["userId"])
    .index("by_user_time", ["userId", "swipedAt"])   // for undo (latest first)
    .index("by_user_product", ["userId", "productId"]) // for exclusion in card queue

  // Saved products (right-swipes only) — the user's wishlist
  wishlists: defineTable({
    userId: v.id("users"),
    productId: v.id("products"),
    savedAt: v.number(),               // Unix ms
    // Denormalized snapshot — wishlist survives product edits/deletes
    productSnapshot: v.object({
      title: v.string(),
      imageUrl: v.string(),
      priceAmount: v.number(),
      priceCurrency: v.string(),
      affiliateUrl: v.string(),
      sourceStore: v.string(),
    }),
  })
    .index("by_user", ["userId"])
    .index("by_user_product", ["userId", "productId"])  // dedup check

  // Share tokens — one per user wishlist
  shareTokens: defineTable({
    userId: v.id("users"),
    token: v.string(),                 // crypto.randomUUID() — opaque, non-guessable
    createdAt: v.number(),
    isActive: v.boolean(),             // allow token revocation
  })
    .index("by_token", ["token"])      // primary lookup
    .index("by_user", ["userId"]),     // check existing before creating

  // Gift reservations — who is buying what
  reservations: defineTable({
    wishlistItemId: v.id("wishlists"),
    reserverId: v.id("users"),         // user claiming this gift
    reservedAt: v.number(),
    isActive: v.boolean(),             // allow unreserving
  })
    .index("by_wishlist_item", ["wishlistItemId"])
    .index("by_reserver", ["reserverId"]),

  // Users — managed by auth layer (Clerk or Convex built-in)
  users: defineTable({
    email: v.string(),
    name: v.optional(v.string()),
    clerkId: v.optional(v.string()),   // if using Clerk
    createdAt: v.number(),
  })
    .index("by_email", ["email"])
    .index("by_clerk_id", ["clerkId"]),

});
```

**Schema design decisions:**

- **Snapshot pattern on swipes and wishlists:** Product data is snapshotted at swipe/save time. This means wishlist history survives product price changes, delisting, or Normaliser re-runs. The affiliate URL is locked at save time — always the correct version.
- **Prices in cents (integer):** Avoids floating-point comparison bugs across currency operations.
- **`isActive` flags instead of hard deletes:** Allows soft-delete of products, tokens, and reservations without breaking foreign key equivalents.
- **Compound indexes for queue exclusion:** `by_user_product` on swipes allows efficient "exclude already-seen products" queries without full table scans.

---

## ENV-Based Multi-Store API Config

The Normaliser reads store configuration entirely from environment variables. Adding a store requires zero code changes.

### ENV Schema

```bash
# Each store block follows the pattern: STORE_{ID}_{KEY}
# The Normaliser discovers stores by finding all STORE_*_ENABLED=true entries

STORE_DUMMYJSON_ENABLED=true
STORE_DUMMYJSON_API_BASE=https://dummyjson.com
STORE_DUMMYJSON_API_KEY=             # Dummy JSON needs no key — leave blank
STORE_DUMMYJSON_AFFILIATE_ID=        # No affiliate program — leave blank
STORE_DUMMYJSON_ADAPTER=dummyjson    # Which adapter module to use

# Future stores (not built yet — just shown for shape)
STORE_AMAZON_ENABLED=false
STORE_AMAZON_API_BASE=https://webservices.amazon.com
STORE_AMAZON_API_KEY=AKIAIOSFODNN7EXAMPLE
STORE_AMAZON_AFFILIATE_ID=wishswipe-20
STORE_AMAZON_ADAPTER=amazon-pa

STORE_ETSY_ENABLED=false
STORE_ETSY_API_BASE=https://openapi.etsy.com/v3
STORE_ETSY_API_KEY=etsyapikey123
STORE_ETSY_AFFILIATE_ID=wishswipe_etsy
STORE_ETSY_ADAPTER=etsy
```

### Normaliser Config Loader Pattern

```typescript
// convex/normaliser/config.ts

interface StoreConfig {
  id: string;
  apiBase: string;
  apiKey: string;
  affiliateId: string;
  adapter: string;
}

function loadStoreConfigs(): StoreConfig[] {
  const configs: StoreConfig[] = [];
  const prefix = "STORE_";

  // Discover all store IDs from ENV keys matching STORE_*_ENABLED=true
  const enabledStores = Object.entries(process.env)
    .filter(([key, val]) => key.startsWith(prefix) && key.endsWith("_ENABLED") && val === "true")
    .map(([key]) => key.replace(prefix, "").replace("_ENABLED", "").toLowerCase());

  for (const storeId of enabledStores) {
    const upper = storeId.toUpperCase();
    configs.push({
      id: storeId,
      apiBase: process.env[`STORE_${upper}_API_BASE`] ?? "",
      apiKey: process.env[`STORE_${upper}_API_KEY`] ?? "",
      affiliateId: process.env[`STORE_${upper}_AFFILIATE_ID`] ?? "",
      adapter: process.env[`STORE_${upper}_ADAPTER`] ?? storeId,
    });
  }

  return configs;  // Missing/disabled entries are silently skipped
}
```

### Adapter Interface

Each store implements one interface. New stores = new adapter file, no changes to core:

```typescript
// convex/normaliser/adapters/types.ts

interface StoreAdapter {
  fetchProducts(config: StoreConfig, page: number): Promise<RawProduct[]>;
  normalize(raw: RawProduct, config: StoreConfig): NormalizedProduct;
  buildAffiliateUrl(productUrl: string, affiliateId: string): string;
}
```

---

## Patterns to Follow

### Pattern 1: 3-Card Windowed Render with Client-Side Queue

**What:** Maintain a local array of ~20 products on the client. Render only indices 0, 1, 2 into the DOM. Advance the window on each swipe. Refetch when buffer drops to ≤5.

**When:** Always — this is a hard constraint from the product spec.

**Why:** Avoids re-rendering a growing DOM list. Each card is a fixed element with CSS transform animations, not a list item. Transition cost is O(1) regardless of queue depth.

```typescript
// Pseudocode — actual implementation uses React state + Framer Motion / custom physics
const [queue, setQueue] = useState<ProductCard[]>([]);
const activeCard = queue[0];
const nextCard = queue[1];
const previewCard = queue[2];

function onSwipeComplete(direction: "left" | "right") {
  recordSwipe({ productId: activeCard.id, direction });
  setQueue(prev => prev.slice(1));  // advance window
  if (queue.length <= 5) fetchMoreCards();
}
```

### Pattern 2: Convex Mutation Atomicity for Swipe + Wishlist

**What:** Record the swipe event AND update the wishlist in a single Convex Mutation — never two separate calls.

**When:** Every right-swipe. Every undo.

**Why:** Convex Mutations are ACID transactions. Splitting into two calls creates a window where a crash leaves swipe recorded but wishlist not updated (or vice versa).

```typescript
// convex/swipes/mutations.ts
export const recordSwipe = mutation({
  args: { productId: v.id("products"), direction: v.union(v.literal("right"), v.literal("left")) },
  handler: async (ctx, { productId, direction }) => {
    const userId = await requireAuth(ctx);
    const product = await ctx.db.get(productId);

    await ctx.db.insert("swipes", {
      userId, productId, direction,
      swipedAt: Date.now(),
      productSnapshot: extractSnapshot(product),
    });

    if (direction === "right") {
      await ctx.db.insert("wishlists", {
        userId, productId,
        savedAt: Date.now(),
        productSnapshot: extractSnapshot(product),
      });
    }
  },
});
```

### Pattern 3: Normaliser as Convex Action with Internal Mutation Write

**What:** Fetch and normalize data in a Convex Action (which can make HTTP calls). Write results by calling an internal Mutation (which is transactional).

**When:** During product ingestion — whether scheduled or triggered.

**Why:** Convex Queries and Mutations cannot make external HTTP calls. Actions can, but are not transactional. The correct split: Action owns the HTTP fetch, Mutation owns the DB write.

```typescript
// convex/normaliser/actions.ts
export const ingestFromStore = action({
  args: { storeId: v.string() },
  handler: async (ctx, { storeId }) => {
    const config = loadStoreConfig(storeId);
    const adapter = loadAdapter(config.adapter);
    const rawProducts = await adapter.fetchProducts(config, page=1);

    for (const raw of rawProducts) {
      const normalized = adapter.normalize(raw, config);
      // Call internal mutation — transactional upsert
      await ctx.runMutation(internal.products.upsertProduct, normalized);
    }
  },
});
```

### Pattern 4: Snapshot Denormalization for Wishlist Durability

**What:** When saving to `wishlists`, copy the product's key fields (title, price, affiliateUrl, image) into a `productSnapshot` field on the wishlist record itself.

**When:** Every right-swipe write.

**Why:** Products can be re-normalized (price change, URL change, delisting). The user's wishlist must reflect what they saved, not what the product is today. The affiliate URL locked at save time is also correct — avoids showing broken links if the product is later removed from the store.

### Pattern 5: Real-Time Reservation Updates via Convex Reactive Queries

**What:** The `getWishlistByToken` query joins `reservations`. Because Convex queries are reactive by default, all clients subscribed to that query receive the reservation update instantly when any user reserves an item — no polling required.

**When:** Share link page is open by multiple users simultaneously.

**Why:** This is Convex's core value proposition. No WebSocket management, no pub/sub plumbing — write to `reservations`, all subscribers see it.

---

## Anti-Patterns to Avoid

### Anti-Pattern 1: Raw Store URLs in Any Client-Visible Field

**What:** Storing or returning `product.rawUrl` from queries and letting the client handle affiliate URL construction.

**Why bad:** Any path where the affiliate URL is not constructed forces a code change per store. If the client constructs the affiliate URL, the construction logic leaks into the frontend. If a bug skips construction, real clicks earn nothing.

**Instead:** The Normaliser constructs the affiliate URL before writing to `products`. The `affiliateUrl` field is the ONLY outbound URL. The `rawUrl` is never written to the database at all — it's used only transiently inside the Normaliser.

### Anti-Pattern 2: Per-Swipe Server Round-Trip

**What:** Fetching a new card from the server after every swipe (cursor-based server-side pagination per card).

**Why bad:** At 60fps swipe velocity, a round-trip per card means latency is user-perceptible. Card animation must complete before next card is available.

**Instead:** Client-side queue of 20 cards. Pre-fetch next batch when buffer is low. Swipe mutation is fire-and-forget from the UI perspective — optimistic update, not blocked on server response.

### Anti-Pattern 3: Full Swipe Table Scan for Card Queue Exclusion

**What:** `SELECT * FROM products WHERE id NOT IN (SELECT productId FROM swipes WHERE userId = ?)` without the right index.

**Why bad:** As swipe history grows, this query scales with user's entire swipe history. At 1000 swipes, this is slow. At 10,000 swipes, it's a timeout.

**Instead:** Use Convex's `by_user_product` index on `swipes`. Fetch the next batch of products using a paginated scan of `products`, and filter out seen IDs by checking the index — not a full join. Or maintain a `seenCount` cursor per user to avoid re-scanning old swipes.

### Anti-Pattern 4: Wishlist as a View Derived from Swipes

**What:** Not having a separate `wishlists` table — instead querying `swipes WHERE direction = "right"` for the wishlist.

**Why bad:** Wishlist items need their own lifecycle (removing from wishlist without deleting swipe history, reservations pointing to a specific wishlist item). A swipe record is an event log entry; a wishlist record is a durable entity. Conflating them makes reservation logic much harder.

**Instead:** Right-swipe atomically creates both a `swipes` record (event log) and a `wishlists` record (durable entity). Undo deletes both. This gives reservations a stable target.

### Anti-Pattern 5: Hardcoded Store Adapters in Core Logic

**What:** `if (store === "amazon") { ... } else if (store === "etsy") { ... }` inside the Normaliser's main loop.

**Why bad:** Every new store requires touching core code. Risk of regressions per addition.

**Instead:** Adapter registry pattern — map adapter name (from ENV) to adapter module. Core never mentions store names.

---

## Scalability Considerations

| Concern | At 100 users | At 10K users | At 1M users |
|---------|--------------|--------------|-------------|
| Swipe history size | Trivial — compact freely | Apply compaction (keep last N months) | Partition by date; archive old swipes to cold storage |
| Card queue exclusion query | No issue | Monitor index performance; may need seen-cursor approach | Seen-cursor is mandatory; full user-product join is too expensive |
| Product catalog size | 1 source, ~1K products | Multi-source, ~50K products | Sharding by category or store required |
| Affiliate URL construction | At ingestion time, cost = zero at query time | Same | Same — ingestion-time construction always wins |
| Wishlist page load | Trivial | Add pagination (by_user index + pagination token) | Pagination + CDN-cached share pages |
| Real-time reservations | Convex handles without config | Convex handles without config | May hit Convex subscription limits — evaluate at scale |
| Normaliser run frequency | Cron every hour is fine | Per-store crons with staggered schedule | Per-store queues with rate limiting and backoff |

---

## Suggested Build Order

Dependencies drive order. Components lower in the list depend on components above them.

```
1. Schema + Auth
   └─► Define Convex schema (all tables, all indexes)
   └─► Wire auth (Clerk recommended — email+password + future OAuth)
   └─► Establish userId pattern used everywhere downstream

2. Normaliser + Products Table
   └─► Implement StoreAdapter interface
   └─► Implement DummyJSON adapter (v1 data source)
   └─► Implement affiliatize() (even if no affiliate ID yet — no-op passthrough)
   └─► Implement ingestFromStore Action + upsertProduct Mutation
   └─► Run once — populate products table with test data
   └─► Dependency: Schema must exist

3. Card Queue (Query Layer)
   └─► Implement getNextBatch query (paginated, excludes seen)
   └─► Verify data is readable and shaped correctly
   └─► Dependency: Products table populated

4. Swipe UI + Swipe Tracker
   └─► Build 3-card stack component (CSS + gesture handling)
   └─► Wire recordSwipe and undoSwipe mutations
   └─► Wire getNextBatch query with client-side queue management
   └─► Verify 60fps on target devices
   └─► Dependency: Card Queue ready

5. Wishlist
   └─► Build wishlist query (getUserWishlist)
   └─► Build wishlist UI (saved items, affiliate link redirect)
   └─► Dependency: Swipe Tracker (right-swipes populate wishlists table)

6. Share Links + Reservation
   └─► Implement createShareToken mutation
   └─► Implement getWishlistByToken query (public)
   └─► Build share/reserve UI (public view)
   └─► Implement reserveItem mutation (requires auth gate)
   └─► Dependency: Wishlist table exists; Auth gate works

7. Data Compaction
   └─► Implement compaction scheduled function
   └─► Define retention policy (keep last N months of left-swipes)
   └─► Right-swipes that result in wishlist items must NOT be compacted
   └─► Dependency: Swipe history must exist to compact
```

**Why this order:**

- Schema first — every other component depends on it. Changing schema mid-build is expensive in Convex (requires migration or data reload).
- Normaliser before UI — the swipe UI is useless without products. DummyJSON gives instant test data without API approval.
- Swipe before Wishlist — wishlists are populated by swipes; the wishlist query only returns useful data once swipe mutations work.
- Share/Reserve last — it depends on wishlists existing and auth working. Also the most complex user flow (public view + auth gate + real-time updates).
- Compaction is a maintenance concern, not a feature. Defer until the rest of the system is stable.

---

## Sources

- Convex schema and mutation patterns: training data (HIGH confidence — Convex API is stable and well-documented at docs.convex.dev)
- Swipe-based card stack patterns: established pattern from Tinder-style app implementations (HIGH confidence — widely documented)
- Affiliate URL normalization at ingestion time: standard affiliate marketing engineering pattern (HIGH confidence — no credible alternative exists)
- ENV-based multi-tenant adapter config: established 12-factor app pattern (HIGH confidence)
- Snapshot denormalization for wishlist durability: standard event-sourcing / CQRS pattern adapted to Convex's document model (HIGH confidence)
- Convex Action + internal Mutation split for external HTTP: documented Convex pattern for side-effectful operations (HIGH confidence)
