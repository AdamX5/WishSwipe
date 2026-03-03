# Stack Research: WishSwipe

**Domain:** Swipe-based product discovery SaaS with Convex backend
**Date:** 2026-03-03
**Confidence:** HIGH (core stack decisions are stable; versions should be verified at package registries before install)

---

## Recommended Stack

### Framework: Next.js 15 (App Router)

**Confidence:** HIGH

Next.js over plain Vite+React because:
- Shared wishlist pages need SSR/SSG for SEO — when a friend opens a wishlist link in a browser, it should render without JS for link previews and social sharing
- API routes handle ENV-based affiliate URL transformation server-side (affiliate IDs never exposed to client)
- App Router supports RSC for static/server-rendered wishlist views alongside client-only swipe UI

**Do NOT use:** Vite+React — no SSR, affiliate IDs would need to be exposed to client or proxied separately. Remix is a reasonable alternative but Next.js has wider Convex community support.

---

### Gesture Handling: @use-gesture/react

**Confidence:** HIGH

```
@use-gesture/react ^10.x
```

- Purpose-built for imperative pointer/touch tracking — gives raw dx/dy/velocity without going through React reconciler
- Direct DOM manipulation during drag (via `useSpringRef` + `api.start()`) — zero React renders during swipe
- Works identically on mouse and touch — pointer unification built in
- Pairs natively with react-spring (same author/ecosystem)

**Do NOT use:** Framer Motion drag — it processes events through React state, causing re-renders mid-drag and breaking 60fps on low-end devices. Also heavier bundle.

---

### Animation / Spring Physics: react-spring v9

**Confidence:** HIGH

```
@react-spring/web ^9.x
```

- Velocity-aware springs — captures pointer velocity at release and uses it as initial spring velocity, making fast swipes feel natural and slow releases feel deliberate
- Imperative API (`useSpringRef` + `api.start()`) means zero React renders during animation
- `config.wobbly` / custom tension+friction give the "weighted bounce" snap-back feel
- Works with `useGesture` in a canonical pair: gesture handler writes to spring, spring writes to DOM

**Do NOT use:** CSS transitions for the active swipe card — they can't receive real-time velocity. CSS transitions are fine for the Next/Preview cards (scale/opacity).

---

### Backend: Convex

**Confidence:** HIGH (specified as project constraint)

```
convex ^1.x
```

Key Convex patterns for this project:
- **Actions** for external API calls (Normaliser fetching from store APIs) — only Actions can do `fetch()`
- **Mutations** for swipe events, wishlist writes, reservations — transactional, consistent
- **Queries** for card queue, wishlist view, share page — reactive, automatically cached
- **Scheduled functions** (`cronJobs`) for data compaction — runs server-side on a timer
- **`ctx.auth`** for user identity in all queries/mutations

---

### Auth: Clerk

**Confidence:** HIGH

```
@clerk/nextjs ^6.x
```

Reasons over Convex built-in auth:
- Built-in email+password UI components — no custom auth UI needed for v1
- Easy OAuth addition (Google, Apple) in v2 without schema changes
- Clerk → Convex integration is first-class: Convex reads Clerk JWT automatically via `CONVEX_AUTH_CLERK_DOMAIN`
- Session persistence across browser refreshes handled by Clerk's session management

**Do NOT use:** NextAuth/Auth.js — Convex integration is community-maintained and more brittle. Custom JWT — unnecessary complexity for v1.

---

### Styling: Tailwind CSS v4

**Confidence:** HIGH

```
tailwindcss ^4.x
```

- Utility-first enables rapid iteration on card layouts without CSS file overhead
- `transform` and `will-change` utilities map directly to the gesture animation requirements
- No-JS wishlist pages render styled without hydration
- v4's CSS-native config (no `tailwind.config.js`) reduces setup friction

---

### TypeScript

**Confidence:** HIGH (non-negotiable with Convex)

Convex schema types flow end-to-end into query/mutation return types. TypeScript catches affiliate URL field mismatches, missing product fields, and share token type errors at compile time.

---

### Environment Config: Standard `.env.local`

```
# Per-store config pattern
STORE_DUMMYJSON_ENABLED=true
STORE_DUMMYJSON_BASE_URL=https://dummyjson.com

# Future stores (commented out = silently skipped)
# STORE_AMAZON_ENABLED=true
# STORE_AMAZON_API_KEY=
# STORE_AMAZON_AFFILIATE_ID=

# STORE_EBAY_ENABLED=true
# STORE_EBAY_APP_ID=
# STORE_EBAY_AFFILIATE_NETWORK_ID=

# STORE_ETSY_ENABLED=true
# STORE_ETSY_API_KEY=
# STORE_ETSY_AFFILIATE_ID=
```

The Normaliser reads `process.env.STORE_*_ENABLED` at runtime inside a Convex Action. Stores with missing/false `ENABLED` flag are skipped without error.

---

## Full Dependency Table

| Package | Version | Purpose |
|---------|---------|---------|
| `next` | ^15.x | Framework, SSR, routing |
| `react` | ^19.x | UI library |
| `convex` | ^1.x | Backend DB, realtime, functions |
| `@clerk/nextjs` | ^6.x | Auth |
| `@use-gesture/react` | ^10.x | Pointer/touch tracking |
| `@react-spring/web` | ^9.x | Physics animation |
| `tailwindcss` | ^4.x | Styling |
| `typescript` | ^5.x | Type safety |
| `nanoid` | ^5.x | Share token generation |

---

## What NOT to Use

| Library | Why not |
|---------|---------|
| Framer Motion (drag) | Processes events through React state → re-renders → jank |
| Vite + React | No SSR → SEO/preview broken for shared wishlist links |
| NextAuth/Auth.js | Convex integration is unstable; Clerk is purpose-built |
| Prisma/Drizzle | Convex IS the database; no external ORM needed |
| Redux/Zustand | Convex reactive queries replace global state for server data; React state suffices for local UI state |
| socket.io | Convex subscriptions handle realtime natively |

---

## Version Verification

Verify before installing:
- `convex` latest: https://www.npmjs.com/package/convex
- `@clerk/nextjs` latest: https://www.npmjs.com/package/@clerk/nextjs
- `@use-gesture/react` latest: https://www.npmjs.com/package/@use-gesture/react
- `@react-spring/web` latest: https://www.npmjs.com/package/@react-spring/web
- Next.js latest: https://www.npmjs.com/package/next

---

*Research date: 2026-03-03 | Confidence: HIGH for stack choices, MEDIUM for exact patch versions*
