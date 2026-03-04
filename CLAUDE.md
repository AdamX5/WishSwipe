# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

WishSwipe — swipe-based product discovery and wishlist platform.

## Stack

- **Next.js 16** (App Router) — all routing via `app/` directory, SSR for wishlist share pages
- **Convex** — backend DB, realtime subscriptions, scheduled functions; Actions for external fetch
- **Clerk** — auth (email/password + OAuth scaffold); `@clerk/nextjs` v7
- **Tailwind CSS v4** — CSS-first, `@import "tailwindcss"` in globals.css, no tailwind.config.js
- **TypeScript** — strict typing throughout
- **Jest + ts-jest** — unit tests for Normaliser logic in `convex/normaliser/__tests__/`

## Architecture

- **Provider chain:** `ClerkProvider` (outermost) > `html` > `body` > `ConvexClientProvider` > `{children}`
- **Route protection:** `clerkMiddleware` + `createRouteMatcher(['/swipe(.*)'])` in `middleware.ts`
- **Normaliser:** Must be a Convex **Action** (not Mutation) — only Actions can call `fetch()`
- **URL hygiene:** Only `affiliateUrl` field exists on products/snapshots — never `rawUrl`, `productUrl`, `storeUrl`
- **Price:** Stored as integer cents (`priceAmount`) to avoid float bugs
- **Wishlists table:** Intentionally separate from swipes table — Phase 4 compaction targets swipes only
- **Gesture handler (Phase 2):** Must bypass React reconciler — use refs + direct DOM transforms during drag

## ENV Pattern

```
STORE_{NAME}_ENABLED=true|false
STORE_{NAME}_API_BASE=https://...
STORE_{NAME}_AFFILIATE_ID=...
STORE_{NAME}_ADAPTER=etsy
```
Stores with missing or `false` `ENABLED` flag are silently skipped.
**Convex env vars** (not `.env.local`) — set via `npx convex env set KEY value` or Convex dashboard.

## Testing

- `npm test` — runs Jest on `convex/normaliser/__tests__/`

## Phases

1. **Foundation** (current) — Scaffold, schema, auth wiring, Normaliser TDD stubs
2. **Swipe Engine** — 3-card DOM, gesture physics, swipe recording, undo
3. **Wishlist** — View saved items, affiliate redirect
4. **Data Health** — Scheduled compaction cron (left-swipes only, never wishlists)
