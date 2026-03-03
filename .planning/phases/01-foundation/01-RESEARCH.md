# Phase 1: Foundation - Research

**Researched:** 2026-03-03
**Domain:** Next.js 15 App Router + Clerk Auth + Convex Backend + DummyJSON Normaliser
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Auth (Clerk)**
- Email/password signup and login (AUTH-01, AUTH-02)
- Session persists across hard browser refresh (AUTH-02)
- Signout available from any page — clears session (AUTH-03)
- Google OAuth and Apple OAuth buttons visually present and scaffolded — not functionally wired (AUTH-04, AUTH-05)

**Normaliser**
- Runs as a **Convex Action** (not Mutation) — only Actions can call `fetch()`
- Fetches products from Dummy JSON API (`https://dummyjson.com/products`)
- Every product record written to Convex must contain an affiliate URL — no raw store URL ever reaches the database or client
- Affiliate URL transformation happens inside the Action using `STORE_DUMMYJSON_AFFILIATE_ID` from ENV
- ENV pattern: `STORE_DUMMYJSON_ENABLED=true|false`; stores with missing or `false` flag are silently skipped — no error, no crash (NORM-02)
- Product snapshot fields: image, title, price, star rating, affiliate URL, source store name (NORM-01)

**Convex Schema**
- **Swipe events table**: direction (right/left), timestamp, user ID, full product snapshot (locked for Phase 2)
- **Wishlist table**: separate from swipe events — compaction must never touch wishlist records (architecture constraint)
- Product snapshot is embedded in both swipe records and wishlist records at write time — independent of future re-normalisation (NORM-04)

### Claude's Discretion
- Auth UI layout: Clerk pre-built components vs custom — Claude decides
- Post-auth redirect destination (e.g., `/swipe` or `/`) — Claude decides
- Route structure and app skeleton (what pages exist in Phase 1)
- Number of products fetched from Dummy JSON per Normaliser run
- When/how the Normaliser Action is triggered (on first login, seeded, on demand)
- Convex schema field names and index design (within the constraints above)

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| AUTH-01 | User can sign up with email and password | Clerk `<SignUp />` component with email/password enabled in dashboard; handled by `app/(auth)/sign-up/[[...sign-up]]/page.tsx` |
| AUTH-02 | User can sign in with email and password and session persists across browser refreshes | Clerk session management uses JWT + `localStorage` persistence by default; `ConvexProviderWithClerk` re-fetches token automatically on mount |
| AUTH-03 | User can sign out from any page | Clerk `<UserButton />` includes built-in signout; or custom `<SignOutButton />` in layout |
| AUTH-04 | Google OAuth sign-in button is present and scaffolded | Clerk `<SignIn />` renders OAuth buttons automatically for enabled providers; add Google in Clerk Dashboard (visual-only is the default until credentials are wired) |
| AUTH-05 | Apple OAuth sign-in button is present and scaffolded | Same as AUTH-04 — enable Apple in Clerk Dashboard |
| NORM-01 | Normaliser fetches and normalizes products from Dummy JSON into standard Product Cards (image, title, price, star rating, affiliate URL, source store) | DummyJSON `/products` returns 194 products with `thumbnail`, `title`, `price`, `rating`, `id` fields; Normaliser maps to ProductCard shape |
| NORM-02 | Normaliser reads store config from ENV using `STORE_*_ENABLED` pattern; missing/false silently skipped | ENV config loader pattern documented; `process.env` is available inside Convex Actions; missing keys fall through silently |
| NORM-03 | Normaliser transforms raw product URL into affiliate URL using store-specific affiliate ID before any URL reaches the client | Affiliate URL built from DummyJSON product URL + `STORE_DUMMYJSON_AFFILIATE_ID` ENV; written to `affiliateUrl` field only; raw URL never stored |
| NORM-04 | When a product is saved to wishlist, all product fields are snapshotted into the wishlist record at save time | Snapshot pattern: embed `productSnapshot` object on both swipe and wishlist records at write time using Convex Mutation atomicity |
</phase_requirements>

---

## Summary

Phase 1 Foundation establishes three pillars: Clerk-powered authentication, a Convex backend schema, and a product Normaliser Action that ingests DummyJSON and produces affiliate-safe Product Cards.

**Clerk** integrates with Next.js 15 via `@clerk/nextjs` and with Convex via `ConvexProviderWithClerk` (from `convex/react-clerk`) + `convex/auth.config.ts`. Pre-built `<SignIn />` and `<SignUp />` components handle email/password automatically. OAuth buttons (Google, Apple) appear on auth pages once those providers are enabled in the Clerk Dashboard — even without credentials wired, the buttons render. Sessions persist across hard browser refresh via Clerk's built-in JWT + localStorage management.

**Convex** is initialized with `npx convex dev`, which creates the `convex/` directory and writes `NEXT_PUBLIC_CONVEX_URL` to `.env.local`. The schema (`convex/schema.ts`) defines all four tables upfront: `products`, `swipes`, `wishlists`, and `users`. The `convex/auth.config.ts` file points at the Clerk issuer domain to enable JWT validation.

**The Normaliser** is a Convex Action that calls `fetch()` against `https://dummyjson.com/products?limit=100` (194 products available), maps each to the canonical `ProductCard` shape, constructs an affiliate URL, and writes via an `internalMutation`. The Action reads store config entirely from `process.env`; missing/disabled stores are silently skipped.

**Primary recommendation:** Use Clerk pre-built components (`<SignIn />`, `<SignUp />`) in App Router catch-all routes; wrap with `ClerkProvider > ConvexClientProvider (ConvexProviderWithClerk)` in the root layout. Initialize Convex schema with all four tables before writing any functions. Trigger the Normaliser via an explicit HTTP Action or internal scheduled call on first run — not automatically on every user login.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `next` | ^15.x | Framework, SSR, App Router | Locked project choice; SSR needed for wishlist share pages |
| `react` | ^19.x | UI library | Peer dep of Next.js 15 |
| `convex` | ^1.x | Backend DB, realtime queries, actions | Locked project choice; Actions = external fetch capability |
| `@clerk/nextjs` | ^6.x | Auth SDK — Next.js integration | First-class Convex integration; email+password + OAuth out of box |
| `tailwindcss` | ^4.x | Styling | Locked project choice; v4 uses CSS-first config |
| `@tailwindcss/postcss` | ^4.x | Tailwind v4 PostCSS plugin | Required for Tailwind v4 with Next.js |
| `postcss` | latest | CSS transform pipeline | Required peer for Tailwind v4 |
| `typescript` | ^5.x | Type safety | Non-negotiable with Convex end-to-end types |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `convex/react-clerk` | (bundled in `convex`) | `ConvexProviderWithClerk` adapter | Phase 1 Clerk+Convex provider wiring |
| `zod` | ^3.x | Runtime schema validation | Normaliser output validation — catch malformed DummyJSON products |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Clerk | NextAuth/Auth.js | Convex integration is community-maintained and more brittle; Clerk is purpose-built |
| Clerk pre-built `<SignIn />` | Custom auth UI | Custom requires building form, validation, error states, OAuth redirects — weeks of work vs. 30 minutes |
| Tailwind v4 CSS-first config | Tailwind v3 with tailwind.config.js | v3 is still functional but v4 is locked project choice; no migration path needed on greenfield |

**Installation:**
```bash
# Step 1: Create Next.js project
npx create-next-app@latest wishswipe --typescript --eslint --app --no-tailwind

# Step 2: Install Tailwind v4
npm install tailwindcss @tailwindcss/postcss postcss

# Step 3: Install Convex
npm install convex

# Step 4: Install Clerk
npm install @clerk/nextjs

# Step 5: Install Zod for validation
npm install zod

# Step 6: Initialize Convex backend (interactive — creates convex/ folder, writes .env.local)
npx convex dev
```

---

## Architecture Patterns

### Recommended Project Structure

```
wishswipe/
├── app/
│   ├── layout.tsx               # ClerkProvider > ConvexClientProvider > children
│   ├── page.tsx                 # Root — redirects to /swipe if authed, /sign-in if not
│   ├── (auth)/
│   │   ├── sign-in/
│   │   │   └── [[...sign-in]]/
│   │   │       └── page.tsx     # <SignIn /> component (catch-all for Clerk multi-step)
│   │   └── sign-up/
│   │       └── [[...sign-up]]/
│   │           └── page.tsx     # <SignUp /> component
│   └── swipe/
│       └── page.tsx             # Protected — placeholder for Phase 2
├── components/
│   └── ConvexClientProvider.tsx # "use client" — wraps ConvexProviderWithClerk
├── convex/
│   ├── _generated/              # Auto-generated by Convex CLI (do not edit)
│   ├── schema.ts                # All table definitions + indexes
│   ├── auth.config.ts           # Clerk JWT issuer configuration
│   ├── users.ts                 # upsertUser mutation (sync Clerk → Convex)
│   ├── products.ts              # upsertProduct internalMutation
│   └── normaliser/
│       ├── actions.ts           # ingestFromStore Action (fetch + transform)
│       ├── config.ts            # loadStoreConfigs() — reads process.env
│       └── adapters/
│           ├── types.ts         # StoreAdapter interface
│           └── dummyjson.ts     # DummyJSON adapter implementation
├── middleware.ts                # clerkMiddleware() — route protection
├── postcss.config.mjs           # Tailwind v4 PostCSS plugin
└── .env.local                   # Keys — auto-written by npx convex dev
```

### Pattern 1: Clerk + Convex Provider Chain

**What:** Root layout wraps children with `ClerkProvider` (outermost) then `ConvexClientProvider` (inner). The `ConvexClientProvider` is a `"use client"` component that uses `ConvexProviderWithClerk`.

**When to use:** Always — this is the required initialization pattern for the full stack.

```typescript
// app/layout.tsx
import { ClerkProvider } from '@clerk/nextjs'
import ConvexClientProvider from '@/components/ConvexClientProvider'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body>
          <ConvexClientProvider>
            {children}
          </ConvexClientProvider>
        </body>
      </html>
    </ClerkProvider>
  )
}
```

```typescript
// components/ConvexClientProvider.tsx
'use client'
import { ConvexReactClient } from 'convex/react'
import { ConvexProviderWithClerk } from 'convex/react-clerk'
import { useAuth } from '@clerk/nextjs'

const convex = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL!)

export default function ConvexClientProvider({ children }: { children: React.ReactNode }) {
  return (
    <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
      {children}
    </ConvexProviderWithClerk>
  )
}
```

```typescript
// convex/auth.config.ts
// Source: https://docs.convex.dev/auth/clerk
export default {
  providers: [
    {
      domain: process.env.CLERK_JWT_ISSUER_DOMAIN,
      applicationID: 'convex',
    },
  ],
}
```

### Pattern 2: Clerk Sign-In and Sign-Up Pages (App Router Catch-All)

**What:** Clerk requires catch-all routes (`[[...sign-in]]`) so it can handle multi-step flows (email verification, MFA) without additional routing setup.

**When to use:** Always with Clerk in App Router.

```typescript
// app/(auth)/sign-in/[[...sign-in]]/page.tsx
// Source: https://clerk.com/docs/nextjs/getting-started/quickstart
import { SignIn } from '@clerk/nextjs'

export default function SignInPage() {
  return (
    <main className="flex min-h-screen items-center justify-center">
      <SignIn />
    </main>
  )
}
```

Google and Apple OAuth buttons appear automatically on the `<SignIn />` component once those providers are enabled in the Clerk Dashboard. No custom button code is needed. In the Clerk Dashboard: Configure > Social Connections > Add Google / Apple. Even without client credentials wired, the buttons visually appear in the component.

### Pattern 3: Clerk Middleware for Route Protection

**What:** `clerkMiddleware()` in `middleware.ts` guards protected routes. By default all routes are public — opt-in to protection using `createRouteMatcher`.

**When to use:** Required to protect `/swipe` and future app pages from unauthenticated access.

```typescript
// middleware.ts
// Source: https://clerk.com/docs/nextjs/getting-started/quickstart
import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'

const isProtectedRoute = createRouteMatcher(['/swipe(.*)'])

export default clerkMiddleware(async (auth, req) => {
  if (isProtectedRoute(req)) {
    await auth.protect()
  }
})

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
}
```

### Pattern 4: Convex Schema — All Tables Upfront

**What:** Define the complete schema in `convex/schema.ts` before writing any functions. Convex generates TypeScript types from the schema — changing it mid-build is expensive.

**When to use:** Phase 1, before writing any queries or mutations.

```typescript
// convex/schema.ts
// Source: https://docs.convex.dev/database/schemas + planning/research/ARCHITECTURE.md
import { defineSchema, defineTable } from 'convex/server'
import { v } from 'convex/values'

export default defineSchema({

  users: defineTable({
    email: v.string(),
    name: v.optional(v.string()),
    tokenIdentifier: v.string(),  // Clerk token identifier (ctx.auth.getUserIdentity().tokenIdentifier)
    createdAt: v.number(),        // Unix ms
  })
    .index('by_token', ['tokenIdentifier']),

  products: defineTable({
    sourceStore: v.string(),           // "dummyjson" | future stores
    sourceId: v.string(),              // original ID in source system
    title: v.string(),
    description: v.optional(v.string()),
    imageUrl: v.string(),
    priceAmount: v.number(),           // cents (integer) — avoids float bugs
    priceCurrency: v.string(),         // "USD"
    starRating: v.optional(v.number()), // 0–5
    affiliateUrl: v.string(),          // NEVER raw store URL
    category: v.optional(v.string()),
    normalizedAt: v.number(),          // Unix ms — freshness tracking
    isActive: v.boolean(),             // soft-delete for de-listed products
  })
    .index('by_source', ['sourceStore', 'sourceId'])  // dedup on upsert
    .index('by_store', ['sourceStore']),

  // Event log — every swipe (Phase 2 writes, Phase 1 defines schema)
  swipes: defineTable({
    userId: v.id('users'),
    productId: v.id('products'),
    direction: v.union(v.literal('right'), v.literal('left')),
    swipedAt: v.number(),
    productSnapshot: v.object({
      title: v.string(),
      imageUrl: v.string(),
      priceAmount: v.number(),
      priceCurrency: v.string(),
      affiliateUrl: v.string(),
      sourceStore: v.string(),
    }),
  })
    .index('by_user', ['userId'])
    .index('by_user_time', ['userId', 'swipedAt'])
    .index('by_user_product', ['userId', 'productId']),

  // Durable wishlist — separate table, never compacted
  wishlists: defineTable({
    userId: v.id('users'),
    productId: v.id('products'),
    savedAt: v.number(),
    productSnapshot: v.object({
      title: v.string(),
      imageUrl: v.string(),
      priceAmount: v.number(),
      priceCurrency: v.string(),
      affiliateUrl: v.string(),
      sourceStore: v.string(),
    }),
  })
    .index('by_user', ['userId'])
    .index('by_user_product', ['userId', 'productId']),

})
```

### Pattern 5: Normaliser Action → internalMutation Write

**What:** The Normaliser is a Convex Action (can call `fetch()`). After normalizing, it calls an `internalMutation` to write to the database. Actions cannot directly write to the DB — they delegate to mutations.

**When to use:** Any time an external HTTP call is needed before writing to Convex.

```typescript
// convex/normaliser/actions.ts
// Source: https://docs.convex.dev/functions/actions
import { action } from '../_generated/server'
import { internal } from '../_generated/api'
import { v } from 'convex/values'
import { loadStoreConfigs } from './config'
import { dummyjsonAdapter } from './adapters/dummyjson'

export const ingestAllStores = action({
  args: {},
  handler: async (ctx) => {
    const storeConfigs = loadStoreConfigs()  // reads process.env — silently skips missing/disabled

    for (const config of storeConfigs) {
      const adapter = config.adapter === 'dummyjson' ? dummyjsonAdapter : null
      if (!adapter) continue

      const rawProducts = await adapter.fetchProducts(config)

      for (const raw of rawProducts) {
        const normalized = adapter.normalize(raw, config)
        if (!normalized) continue  // skip invalid products (missing required fields)

        // Delegate DB write to internalMutation (transactional)
        await ctx.runMutation(internal.products.upsertProduct, normalized)
      }
    }
  },
})
```

```typescript
// convex/products.ts
import { internalMutation } from './_generated/server'
import { v } from 'convex/values'

export const upsertProduct = internalMutation({
  args: {
    sourceStore: v.string(),
    sourceId: v.string(),
    title: v.string(),
    imageUrl: v.string(),
    priceAmount: v.number(),
    priceCurrency: v.string(),
    starRating: v.optional(v.number()),
    affiliateUrl: v.string(),
    category: v.optional(v.string()),
    description: v.optional(v.string()),
    normalizedAt: v.number(),
    isActive: v.boolean(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query('products')
      .withIndex('by_source', (q) =>
        q.eq('sourceStore', args.sourceStore).eq('sourceId', args.sourceId)
      )
      .unique()

    if (existing) {
      await ctx.db.patch(existing._id, { ...args })
    } else {
      await ctx.db.insert('products', args)
    }
  },
})
```

### Pattern 6: ENV Config Loader for Stores

**What:** Discover enabled stores from `process.env` by scanning for `STORE_*_ENABLED=true`. Missing or `false` entries are silently skipped — no error, no crash.

**When to use:** Inside the Normaliser Action.

```typescript
// convex/normaliser/config.ts
interface StoreConfig {
  id: string
  apiBase: string
  apiKey: string
  affiliateId: string
  adapter: string
}

export function loadStoreConfigs(): StoreConfig[] {
  const prefix = 'STORE_'
  const configs: StoreConfig[] = []

  const enabledStores = Object.entries(process.env)
    .filter(([key, val]) => key.startsWith(prefix) && key.endsWith('_ENABLED') && val === 'true')
    .map(([key]) => key.slice(prefix.length, -'_ENABLED'.length).toLowerCase())

  for (const storeId of enabledStores) {
    const upper = storeId.toUpperCase()
    configs.push({
      id: storeId,
      apiBase: process.env[`STORE_${upper}_API_BASE`] ?? '',
      apiKey: process.env[`STORE_${upper}_API_KEY`] ?? '',
      affiliateId: process.env[`STORE_${upper}_AFFILIATE_ID`] ?? '',
      adapter: process.env[`STORE_${upper}_ADAPTER`] ?? storeId,
    })
  }

  return configs
}
```

### Pattern 7: DummyJSON Adapter

**What:** The DummyJSON adapter fetches products and maps them to the canonical ProductCard shape. Affiliate URL is constructed from the product's DummyJSON URL + affiliate ID. If affiliate ID is empty, a passthrough URL is used (acceptable for v1 where DummyJSON has no affiliate program).

**DummyJSON API facts (verified):**
- Endpoint: `GET https://dummyjson.com/products?limit=100&skip=0`
- Default response: 30 products; `limit=0` returns all 194
- Response fields: `id`, `title`, `description`, `price` (USD float), `rating` (0–5), `thumbnail`, `images[]`, `category`, `brand`, `stock`
- No API key required
- No HTTPS restrictions; public endpoint

```typescript
// convex/normaliser/adapters/dummyjson.ts
import type { StoreConfig } from './types'

interface DummyJsonProduct {
  id: number
  title: string
  description: string
  price: number           // USD float — convert to cents
  rating: number          // 0–5
  thumbnail: string       // primary image URL
  category: string
  stock: number
}

export const dummyjsonAdapter = {
  async fetchProducts(config: StoreConfig): Promise<DummyJsonProduct[]> {
    const url = `${config.apiBase}/products?limit=100&skip=0`
    const res = await fetch(url)
    if (!res.ok) throw new Error(`DummyJSON fetch failed: ${res.status}`)
    const data = await res.json()
    return data.products as DummyJsonProduct[]
  },

  normalize(raw: DummyJsonProduct, config: StoreConfig) {
    // Validate required fields — skip malformed products
    if (!raw.title || !raw.thumbnail || raw.price <= 0) return null

    const productPageUrl = `${config.apiBase}/products/${raw.id}`
    const affiliateUrl = config.affiliateId
      ? `${productPageUrl}?tag=${config.affiliateId}`
      : productPageUrl   // passthrough if no affiliate program

    return {
      sourceStore: 'dummyjson',
      sourceId: String(raw.id),
      title: raw.title,
      description: raw.description,
      imageUrl: raw.thumbnail,
      priceAmount: Math.round(raw.price * 100),  // float → cents
      priceCurrency: 'USD',
      starRating: raw.rating,
      affiliateUrl,                              // NEVER raw store URL — affiliate URL always
      category: raw.category,
      normalizedAt: Date.now(),
      isActive: raw.stock > 0,
    }
  },
}
```

### Pattern 8: User Sync — Clerk → Convex

**What:** After Clerk authentication, sync the user to Convex by calling a mutation. Uses `ctx.auth.getUserIdentity()` to read the Clerk JWT server-side.

**When to use:** Called from a hook on the client after sign-in, or from a protected page on mount.

```typescript
// convex/users.ts
import { mutation } from './_generated/server'
import { v } from 'convex/values'

export const upsertUser = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) throw new Error('Not authenticated')

    const existing = await ctx.db
      .query('users')
      .withIndex('by_token', (q) =>
        q.eq('tokenIdentifier', identity.tokenIdentifier)
      )
      .unique()

    if (existing) {
      await ctx.db.patch(existing._id, {
        name: identity.name ?? existing.name,
        email: identity.email ?? existing.email,
      })
      return existing._id
    }

    return await ctx.db.insert('users', {
      email: identity.email ?? '',
      name: identity.name,
      tokenIdentifier: identity.tokenIdentifier,
      createdAt: Date.now(),
    })
  },
})
```

### Anti-Patterns to Avoid

- **Raw store URLs stored in `products` table:** The `affiliateUrl` field is the only outbound URL. Never store `rawUrl` or `productUrl` in the schema — they must not exist in the DB at all.
- **Normaliser as a Convex Mutation:** Mutations cannot call `fetch()`. Only Actions can. The Normaliser MUST be an Action; the DB write delegates to an `internalMutation`.
- **Two separate mutations for swipe + wishlist write:** Use one atomic mutation (Phase 2). Splitting creates a data consistency gap.
- **Per-login Normaliser trigger:** Do not run the Normaliser on every user login — it would hit DummyJSON on every auth event. Run once on setup, then via scheduled cron or manual invocation.
- **`tailwind.config.js` for v4:** Tailwind v4 uses CSS-first config via `@theme` directive in `globals.css`. No JavaScript config file is needed or used.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Email/password auth UI | Custom sign-in form, session management, password hashing | `@clerk/nextjs` `<SignIn />` / `<SignUp />` | Clerk handles JWT, session persistence, CSRF, token refresh |
| OAuth button rendering | Custom "Sign in with Google" buttons | Clerk `<SignIn />` with providers enabled in dashboard | Clerk renders correct buttons per enabled provider automatically |
| Token validation for Convex | Custom JWT middleware in Convex functions | `convex/auth.config.ts` + `ConvexProviderWithClerk` | Convex validates Clerk JWTs automatically; `ctx.auth.getUserIdentity()` always safe |
| Session persistence | `localStorage` / `sessionStorage` management | Clerk session management | Clerk handles token refresh, persistence, cross-tab sync |
| Schema runtime validation | Custom field presence checks in the Normaliser | `zod` with `.min(1)`, `.url()`, `.positive()` | Edge cases (null price, empty title, broken image URL) are common in real APIs |
| Database migrations | Manual data fixes | Design schema correctly upfront | Convex schema changes on live data require re-ingestion or patches — expensive |

**Key insight:** Clerk and Convex are both opinionated full-stack frameworks. Do not fight their conventions — use `ConvexProviderWithClerk`, `auth.config.ts`, and `clerkMiddleware()` exactly as documented. Custom auth paths in Convex are possible but unnecessary and maintenance-heavy.

---

## Common Pitfalls

### Pitfall 1: `ClerkProvider` and `ConvexProviderWithClerk` Order

**What goes wrong:** `ConvexProviderWithClerk` internally calls `useAuth()` from Clerk. If `ClerkProvider` does not wrap it, `useAuth()` returns no context and the Convex client cannot obtain a token — all authenticated queries fail silently.

**Why it happens:** Developers place `ConvexClientProvider` at the same level as `ClerkProvider` instead of inside it.

**How to avoid:** In `app/layout.tsx`, `ClerkProvider` must be the outermost wrapper, `ConvexClientProvider` (containing `ConvexProviderWithClerk`) must be a child of `ClerkProvider`.

**Warning signs:** `ctx.auth.getUserIdentity()` returns `null` even when the user is visibly signed in on the client.

### Pitfall 2: Missing Catch-All Route for Clerk Components

**What goes wrong:** Clerk's `<SignIn />` component initiates multi-step flows (email verification codes, MFA). Without a catch-all route (`[[...sign-in]]`), Clerk redirects to sub-paths that 404 in Next.js App Router.

**How to avoid:** Always use `app/(auth)/sign-in/[[...sign-in]]/page.tsx` — never `app/sign-in/page.tsx`.

**Warning signs:** Sign-in works for simple email/password but fails after verification code step.

### Pitfall 3: `auth.config.ts` ENV Variable Not Set in Convex Dashboard

**What goes wrong:** `CLERK_JWT_ISSUER_DOMAIN` is set in `.env.local` but not in the Convex deployment environment. Convex actions and functions run in the Convex cloud, not the Next.js server — they read environment variables from the Convex dashboard, not `.env.local`.

**How to avoid:** After creating `convex/auth.config.ts`, run `npx convex dev` and also set `CLERK_JWT_ISSUER_DOMAIN` in the Convex dashboard (Settings > Environment Variables). Similarly, set `STORE_DUMMYJSON_ENABLED`, `STORE_DUMMYJSON_API_BASE`, and `STORE_DUMMYJSON_AFFILIATE_ID` in Convex dashboard ENV — not just `.env.local`.

**Warning signs:** `ctx.auth.getUserIdentity()` returns `null` in production or staging despite working locally. Normaliser action throws "Cannot read process.env.STORE_*" errors.

### Pitfall 4: Normaliser Writing Raw URLs (Affiliate Leakage)

**What goes wrong:** DummyJSON products have a URL path. If the Normaliser writes this URL directly to `affiliateUrl` without appending the affiliate tag, raw product URLs reach the database. Every downstream query returns unmonetized links.

**How to avoid:** The `affiliateUrl` field must always be constructed by the adapter's `buildAffiliateUrl()` / `normalize()` function. Even if `STORE_DUMMYJSON_AFFILIATE_ID` is empty (acceptable for v1 — DummyJSON has no affiliate program), the URL should be the passthrough URL — not a field labeled differently. The `affiliateUrl` field must be the only URL field written. No `rawUrl`, `productUrl`, or `storeUrl` field should exist in the schema.

**Warning signs:** Schema has both `affiliateUrl` and any second URL-shaped field on the products table.

### Pitfall 5: Convex ENV Variables vs Next.js ENV Variables

**What goes wrong:** Variables prefixed with `NEXT_PUBLIC_` are for the Next.js browser bundle. Variables without that prefix are for the Next.js server. Convex Action functions run in the Convex cloud — they do NOT have access to either Next.js env scope. They have their own environment variable system set via `npx convex env set` or the Convex dashboard.

**How to avoid:**
- `NEXT_PUBLIC_CONVEX_URL` → Next.js client (for `ConvexReactClient`)
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` → Next.js client (for Clerk UI)
- `CLERK_SECRET_KEY` → Next.js server only
- `CLERK_JWT_ISSUER_DOMAIN`, `STORE_*` → Convex dashboard ENV (for Convex Actions/functions)

**Warning signs:** `process.env.STORE_DUMMYJSON_ENABLED` is `undefined` inside the Normaliser Action despite being in `.env.local`.

### Pitfall 6: Tailwind v4 Missing `@tailwindcss/postcss` Package

**What goes wrong:** Installing `tailwindcss` alone without `@tailwindcss/postcss` means the PostCSS pipeline does not pick up Tailwind classes. Build succeeds but no Tailwind styles are applied.

**How to avoid:** Install both `tailwindcss` AND `@tailwindcss/postcss`. Create `postcss.config.mjs` with `"@tailwindcss/postcss": {}` as the only plugin. Add `@import "tailwindcss"` to `globals.css`. No `tailwind.config.js` needed.

**Warning signs:** `className="text-red-500"` does not apply any color in the browser. Build output has no Tailwind utilities.

### Pitfall 7: Convex Function Scope — Mutation Doing Too Much

**What goes wrong:** A Convex Mutation or Query that iterates over large result sets (e.g., collecting all products, running aggregates inline) hits the 1-second execution budget or document scan limits (32,000 docs scanned per function).

**How to avoid:** Mutations do one atomic thing: insert or patch one record. The `upsertProduct` internalMutation should be called per-product from the Action's loop — not in a single bulk mutation. Queries return slices, not full table scans.

**Warning signs:** Convex dashboard shows function timeout errors. Any mutation that calls `.collect()` and then iterates over the result.

---

## Code Examples

Verified patterns from official sources:

### ENV Setup (`.env.local`)

```bash
# Next.js client — written by npx convex dev
NEXT_PUBLIC_CONVEX_URL=https://your-deployment.convex.cloud

# Clerk — from Clerk Dashboard
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...

# Convex function ENV (also set in Convex dashboard — NOT just here)
CLERK_JWT_ISSUER_DOMAIN=https://verb-noun-00.clerk.accounts.dev

# Normaliser store config (set in Convex dashboard ENV for Actions to read)
STORE_DUMMYJSON_ENABLED=true
STORE_DUMMYJSON_API_BASE=https://dummyjson.com
STORE_DUMMYJSON_AFFILIATE_ID=   # empty for v1 — DummyJSON has no affiliate program
STORE_DUMMYJSON_ADAPTER=dummyjson
```

### Tailwind v4 Setup

```javascript
// postcss.config.mjs
// Source: https://tailwindcss.com/docs/guides/nextjs
const config = {
  plugins: {
    '@tailwindcss/postcss': {},
  },
}
export default config
```

```css
/* app/globals.css */
@import "tailwindcss";

/* Custom theme tokens go here using @theme directive if needed */
```

### Reading Auth Identity in Convex Functions

```typescript
// Source: https://docs.convex.dev/auth/functions-auth
import { query } from './_generated/server'

export const getCurrentUser = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) return null  // unauthenticated

    return ctx.db
      .query('users')
      .withIndex('by_token', (q) =>
        q.eq('tokenIdentifier', identity.tokenIdentifier)
      )
      .unique()
  },
})
```

### Triggering the Normaliser (HTTP Action for manual/dev trigger)

```typescript
// convex/http.ts
// Source: https://docs.convex.dev/functions/http-actions
import { httpRouter } from 'convex/server'
import { httpAction } from './_generated/server'
import { internal } from './_generated/api'

const http = httpRouter()

http.route({
  path: '/normalise',
  method: 'POST',
  handler: httpAction(async (ctx) => {
    await ctx.runAction(internal.normaliser.actions.ingestAllStores, {})
    return new Response('OK', { status: 200 })
  }),
})

export default http
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `tailwind.config.js` + `@tailwind base/components/utilities` directives | CSS-first config with `@import "tailwindcss"` + `@theme` | Tailwind v4 (2025) | No JS config file; simpler setup |
| `clerkMiddleware` from `@clerk/nextjs/server` with separate route configs | `clerkMiddleware` + `createRouteMatcher` | Clerk v5+ | More explicit, type-safe route matching |
| Convex `ConvexProvider` + manual JWT passing | `ConvexProviderWithClerk` from `convex/react-clerk` | 2023+ | Automatic token refresh; no manual JWT management |
| `next/13` Pages Router with Clerk | App Router with `ClerkProvider` in `app/layout.tsx` | Next.js 13+ | Server Components support; Clerk `auth()` in Server Components |

**Deprecated/outdated:**
- `tailwind.config.js`: Not needed in v4; CSS-first replaces it
- `authMiddleware` from `@clerk/nextjs`: Replaced by `clerkMiddleware` — do not use
- `withClerkMiddleware`: Old Clerk middleware pattern, deprecated

---

## Open Questions

1. **Normaliser trigger strategy**
   - What we know: The Action can be triggered via HTTP Action (manual/dev), scheduled cron, or on-demand from the client
   - What's unclear: Whether to seed products once on setup or run a cron immediately in Phase 1
   - Recommendation: For Phase 1, provide an HTTP Action endpoint (`POST /normalise`) that can be called manually after setup. Phase 4 adds the scheduled cron. This avoids complexity while guaranteeing data exists for testing.

2. **DummyJSON affiliate URL shape**
   - What we know: DummyJSON has no real affiliate program; `STORE_DUMMYJSON_AFFILIATE_ID` will be empty in v1
   - What's unclear: What the passthrough affiliate URL should look like (plain DummyJSON product URL vs. a `?tag=` param with an empty value)
   - Recommendation: Use `https://dummyjson.com/products/{id}` as the passthrough URL. Do not append `?tag=` with an empty value — that is misleading. The v1 affiliate URL for DummyJSON is the canonical product URL. Real affiliate transformation is the pattern to establish; the value matters when real stores are wired.

3. **Convex project creation — cloud vs. local**
   - What we know: `npx convex dev` supports both local dev (no account) and cloud deployment
   - What's unclear: Whether to use local Convex or cloud Convex for initial development
   - Recommendation: Use cloud Convex (create free account) — it's the production path and avoids environment mismatch issues when ENV vars are set. Local Convex is useful for CI but adds setup complexity for a greenfield project.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | None detected — greenfield project |
| Config file | none — see Wave 0 |
| Quick run command | `npx jest --testPathPattern=normaliser` (after setup) |
| Full suite command | `npx jest` (after setup) |

No test infrastructure exists yet. The project is greenfield. Wave 0 must establish a test framework before any tests can run.

Given the stack (Next.js + TypeScript), **Jest with `ts-jest`** is the standard choice for unit testing the Normaliser's pure transformation functions. Integration tests for Convex functions are best done via Convex's own dev environment (call functions directly via `npx convex run`).

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| AUTH-01 | Sign-up form submits and creates Clerk user | manual-only | n/a — Clerk handles auth UI; manual browser test | ❌ Wave 0 |
| AUTH-02 | Session persists after hard browser refresh | manual-only | n/a — requires browser session state | ❌ Wave 0 |
| AUTH-03 | Sign-out clears session | manual-only | n/a — browser session test | ❌ Wave 0 |
| AUTH-04 | Google OAuth button visually present | manual-only | n/a — visual check; no headless browser in Phase 1 | ❌ Wave 0 |
| AUTH-05 | Apple OAuth button visually present | manual-only | n/a — visual check | ❌ Wave 0 |
| NORM-01 | `normalize()` returns correct ProductCard shape | unit | `npx jest --testPathPattern=dummyjson.adapter` | ❌ Wave 0 |
| NORM-02 | `loadStoreConfigs()` skips missing/false ENV entries | unit | `npx jest --testPathPattern=config` | ❌ Wave 0 |
| NORM-03 | `normalize()` affiliate URL contains no raw store URL format | unit | `npx jest --testPathPattern=dummyjson.adapter` | ❌ Wave 0 |
| NORM-04 | `upsertProduct` internalMutation writes all required fields | integration | `npx convex run normaliser/actions:ingestAllStores` (manual verification in Convex dashboard) | ❌ Wave 0 |

**Manual-only justification for AUTH-01–05:** Clerk's pre-built UI components are third-party code. Unit testing Clerk's rendering is testing Clerk's library, not WishSwipe code. Auth acceptance tests are browser-level integration tests (manual or Playwright in a later phase).

### Sampling Rate

- **Per task commit:** `npx jest --testPathPattern=normaliser` (NORM-01, NORM-02, NORM-03 unit tests)
- **Per wave merge:** `npx jest` (full suite)
- **Phase gate:** All NORM unit tests green + manual verification of AUTH-01–05 before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `jest.config.ts` — Jest + ts-jest configuration
- [ ] `package.json` test script: `"test": "jest"`
- [ ] `convex/normaliser/__tests__/dummyjson.adapter.test.ts` — covers NORM-01, NORM-03
- [ ] `convex/normaliser/__tests__/config.test.ts` — covers NORM-02
- [ ] Install: `npm install --save-dev jest ts-jest @types/jest`

---

## Sources

### Primary (HIGH confidence)

- [Clerk Next.js Quickstart](https://clerk.com/docs/nextjs/getting-started/quickstart) — ClerkProvider setup, middleware, catch-all routes
- [Clerk + Convex Integration](https://clerk.com/docs/integration/convex) — ConvexProviderWithClerk, auth.config.ts, env vars
- [Convex Auth with Clerk](https://docs.convex.dev/auth/clerk) — CLERK_JWT_ISSUER_DOMAIN, auth.config.ts pattern
- [Convex Actions docs](https://docs.convex.dev/functions/actions) — action() + ctx.runMutation() + internalMutation pattern
- [Convex Storing Users](https://docs.convex.dev/auth/database-auth) — tokenIdentifier, by_token index, upsert pattern
- [Convex Limits](https://docs.convex.dev/production/state/limits) — 1s queries/mutations, 10min actions, 32k docs scanned
- [Tailwind v4 + Next.js guide](https://tailwindcss.com/docs/guides/nextjs) — @tailwindcss/postcss, postcss.config.mjs, @import "tailwindcss"
- [DummyJSON Products API](https://dummyjson.com/docs/products) — endpoint, fields, pagination, 194 total products

### Secondary (MEDIUM confidence)

- [Convex Next.js App Router docs](https://docs.convex.dev/client/nextjs/app-router/) — ConvexClientProvider pattern
- [Planning research: ARCHITECTURE.md](/.planning/research/ARCHITECTURE.md) — Schema design, snapshot pattern, adapter pattern (prior session research)
- [Planning research: STACK.md](/.planning/research/STACK.md) — Stack rationale, version table
- [Planning research: PITFALLS.md](/.planning/research/PITFALLS.md) — Pitfalls 1, 7, 14, 15, 16 particularly relevant to Phase 1

### Tertiary (LOW confidence)

- Web search results re: Convex ENV variable scope — corroborated by Convex docs but nuance (Convex dashboard ENV vs .env.local) was inferred; verify at [Convex Project Configuration](https://docs.convex.dev/production/project-configuration)

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all packages verified against official docs; versions from official quickstarts
- Architecture patterns: HIGH — all patterns from official Convex and Clerk documentation
- Pitfalls: HIGH for Pitfalls 1–5, MEDIUM for Pitfall 7 (limits may change — verified at docs.convex.dev/production/state/limits as of research date)
- DummyJSON API: HIGH — verified against live docs at dummyjson.com/docs/products

**Research date:** 2026-03-03
**Valid until:** 2026-04-03 (30 days — stack is stable; Clerk and Convex release frequently but rarely break these core patterns)
