# Phase 3: Wishlist - Context

**Gathered:** 2026-03-04
**Status:** Ready for planning

<domain>
## Phase Boundary

Authenticated wishlist page showing all right-swiped products in a browsable grid. Each item opens a detail sheet with full product info, a "Visit Store" affiliate link, and a "Remove" button. Navigation via a persistent bottom nav bar shared with the swipe page. This phase covers WISH-01, WISH-02, and pulls in WISH-03 (remove) from v2.

</domain>

<decisions>
## Implementation Decisions

### Layout
- 2-column card grid (image-forward, scannable)
- Each grid card shows: product image, title, price
- Star rating and store name are not shown on the grid card — saved for the detail view

### Navigation
- Persistent bottom navigation bar with two tabs: **Swipe** (discover icon) and **Wishlist** (heart icon)
- Bottom nav applies to both `/swipe` and `/wishlist` routes — shared component or layout
- Existing SwipeShell top header stays on the swipe page; wishlist page has its own simpler header
- UserButton (Clerk sign-out) remains accessible — either in the wishlist header or the swipe header

### Empty state
- Friendly message: "Nothing saved yet" (or similar)
- CTA button linking back to `/swipe` — "Start swiping"

### Product detail view (bottom sheet)
- Tapping any grid card opens a modal/sheet that slides up from the bottom
- Tapping outside or pressing back dismisses the sheet
- Detail sheet shows: large image, title, price, store name, "Visit Store" button
- "Visit Store" opens `affiliateUrl` in a new tab — the affiliate URL is ALWAYS used, never a raw store URL

### Remove from wishlist (pulled from WISH-03)
- "Remove" button in the detail sheet (alongside "Visit Store")
- On remove: sheet closes immediately, item disappears from the grid (optimistic update — no page reload, no toast, no confirmation prompt)
- Requires a new Convex mutation: `removeFromWishlist` — deletes the record from `wishlists` table using `by_user_product` index

### Claude's Discretion
- Bottom nav icon choice (e.g. grid/home for Swipe, heart/bookmark for Wishlist)
- Active tab indicator style
- Card image aspect ratio and fit (object-cover assumed)
- Sheet animation specifics (height, drag handle, backdrop opacity)
- Price formatting (cents → display string, e.g. "$12.99")
- Error/loading state handling within the wishlist query

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `wishlists` table (`convex/schema.ts`): `by_user` index for fetching all items for a user; `by_user_product` index for targeted delete
- `productSnapshot` object shape (already in wishlists): `{ title, imageUrl, priceAmount, priceCurrency, affiliateUrl, sourceStore }` — all data needed for both the grid card and detail sheet
- Auth guard pattern (`app/swipe/page.tsx`): `const { userId } = await auth(); if (!userId) redirect('/sign-in')` — reuse verbatim on wishlist page
- `SwipeShell` header pattern: client boundary wrapping `useConvexAuth` + Clerk components — reference for wishlist page header

### Established Patterns
- Tailwind CSS v4 — no config file; utility classes only
- Server page (`page.tsx`) handles auth guard; client shell handles Convex subscriptions
- `useQuery` from `convex/react` for real-time data binding
- `useMutation` from `convex/react` for writes (same pattern as `recordSwipe` / `undoSwipe`)
- Price is stored as integer cents (`priceAmount`) — convert to display string in UI (÷ 100, format as currency)

### Integration Points
- New Convex query: `getWishlist` — query `wishlists` by `by_user` index, return all records for the current user
- New Convex mutation: `removeFromWishlist` — accept `wishlistId` (or `productId`), delete matching record for current user
- New route: `app/wishlist/page.tsx` — server page with auth guard
- Bottom nav: shared component rendered in both `/swipe` and `/wishlist` layouts (or a root layout segment)
- No existing shared card or image component — new WishlistCard component needed

</code_context>

<specifics>
## Specific Ideas

- User wants more info in the detail view than the grid card — detail sheet is the "expand to learn more" interaction, not a direct-to-store tap
- Remove should feel instant — optimistic update, no friction (no confirm dialog, no toast)
- Bottom nav is for future extensibility (more tabs in v2) — build it as a standalone shared component

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope. WISH-03 (remove) was explicitly pulled into Phase 3 by user decision.

</deferred>

---

*Phase: 03-wishlist*
*Context gathered: 2026-03-04*
