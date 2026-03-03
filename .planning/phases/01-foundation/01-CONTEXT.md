# Phase 1: Foundation - Context

**Gathered:** 2026-03-03
**Status:** Ready for planning

<domain>
## Phase Boundary

Stand up Clerk auth (email/password signup/login, persistent sessions, signout, OAuth buttons scaffolded), Convex schema (users, products, swipes, wishlist tables), and a Normaliser Convex Action that fetches products from Dummy JSON, transforms affiliate URLs, and stores normalised product cards. No swipe UI. This phase creates the data layer every downstream phase depends on.

</domain>

<decisions>
## Implementation Decisions

### Auth (Clerk)
- Email/password signup and login (AUTH-01, AUTH-02)
- Session persists across hard browser refresh (AUTH-02)
- Signout available from any page — clears session (AUTH-03)
- Google OAuth and Apple OAuth buttons visually present and scaffolded — not functionally wired (AUTH-04, AUTH-05)

### Normaliser
- Runs as a **Convex Action** (not Mutation) — only Actions can call `fetch()`
- Fetches products from Dummy JSON API (`https://dummyjson.com/products`)
- Every product record written to Convex must contain an affiliate URL — no raw store URL ever reaches the database or client
- Affiliate URL transformation happens inside the Action using `STORE_DUMMYJSON_AFFILIATE_ID` from ENV
- ENV pattern: `STORE_DUMMYJSON_ENABLED=true|false`; stores with missing or `false` flag are silently skipped — no error, no crash (NORM-02)
- Product snapshot fields: image, title, price, star rating, affiliate URL, source store name (NORM-01)

### Convex Schema
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

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- None yet — greenfield project, no existing components or utilities

### Established Patterns
- Next.js 15 App Router — all routing via `app/` directory
- Tailwind CSS v4 — utility-first styling
- TypeScript — strict typing throughout
- Convex — backend DB, realtime, scheduled functions; Actions for external fetch

### Integration Points
- Clerk integrates with Convex via Clerk's Convex adapter (JWT-based identity)
- Normaliser Action connects to Dummy JSON externally and writes to Convex internally
- Phase 2 (Swipe Engine) reads from the products/swipe tables created here

</code_context>

<specifics>
## Specific Ideas

- Normaliser must be an Action, not a Mutation — this is a hard architecture constraint documented in multiple planning files
- Affiliate URLs must be baked in at normalisation time — raw store URLs must never reach the client under any circumstances
- Wishlist table is intentionally separate from swipe events so Phase 4 compaction can prune left-swipes without touching saved items
- Google and Apple OAuth: buttons appear on auth screen but credential wiring is explicitly out of v1 scope

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 01-foundation*
*Context gathered: 2026-03-03*
