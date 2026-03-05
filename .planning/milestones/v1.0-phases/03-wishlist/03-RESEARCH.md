# Phase 3: Wishlist - Research

**Researched:** 2026-03-04
**Domain:** Next.js App Router UI, Convex queries/mutations, bottom sheet interaction, bottom navigation
**Confidence:** HIGH

## Summary

Phase 3 builds a wishlist page on top of data that is already being written correctly in Phase 2. The `wishlists` table exists, is indexed correctly (`by_user`, `by_user_product`), and the `productSnapshot` contains every field needed for both the grid card and the detail sheet. No schema changes are required.

The work splits cleanly into four areas: (1) a new Convex query (`getWishlist`) and mutation (`removeFromWishlist`), (2) a new `/wishlist` route with auth guard and a client shell that subscribes to that query, (3) a 2-column grid of `WishlistCard` components, and (4) a bottom sheet detail view with "Visit Store" and "Remove" actions. The bottom navigation bar is a fifth piece that gets rendered on both `/swipe` and `/wishlist` — the cleanest home for it is a shared route group layout.

All patterns to use are already established in the codebase: server page auth guard (copy from `app/swipe/page.tsx`), client shell with `useConvexAuth` (copy from `SwipeShell`), `useQuery` + `useMutation` from `convex/react` (copy from `SwipeDeck`), and Tailwind v4 utility classes for styling. No new libraries are needed.

**Primary recommendation:** Build everything from project-established patterns; introduce zero new dependencies.

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Layout**
- 2-column card grid (image-forward, scannable)
- Each grid card shows: product image, title, price
- Star rating and store name are not shown on the grid card — saved for the detail view

**Navigation**
- Persistent bottom navigation bar with two tabs: Swipe (discover icon) and Wishlist (heart icon)
- Bottom nav applies to both `/swipe` and `/wishlist` routes — shared component or layout
- Existing SwipeShell top header stays on the swipe page; wishlist page has its own simpler header
- UserButton (Clerk sign-out) remains accessible — either in the wishlist header or the swipe header

**Empty state**
- Friendly message: "Nothing saved yet" (or similar)
- CTA button linking back to `/swipe` — "Start swiping"

**Product detail view (bottom sheet)**
- Tapping any grid card opens a modal/sheet that slides up from the bottom
- Tapping outside or pressing back dismisses the sheet
- Detail sheet shows: large image, title, price, store name, "Visit Store" button
- "Visit Store" opens `affiliateUrl` in a new tab — the affiliate URL is ALWAYS used, never a raw store URL

**Remove from wishlist (pulled from WISH-03)**
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

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope. WISH-03 (remove) was explicitly pulled into Phase 3 by user decision.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| WISH-01 | Authenticated user can view all their saved (right-swiped) products on a wishlist page | `getWishlist` query on `wishlists.by_user` index; client shell with `useQuery`; auth guard pattern from swipe page |
| WISH-02 | Clicking a product in the wishlist opens the store's product page via the affiliate link in a new tab | Detail sheet "Visit Store" button uses `window.open(affiliateUrl, '_blank', 'noopener,noreferrer')`; `affiliateUrl` is the ONLY URL field — enforced by schema |
</phase_requirements>

---

## Standard Stack

### Core (all already installed — zero new dependencies)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js App Router | 16.1.6 | `/wishlist` route, server auth guard, route group layout for bottom nav | Established project framework |
| Convex (`convex/react`) | ^1.32.0 | `useQuery(api.wishlists.getWishlist)`, `useMutation(api.wishlists.removeFromWishlist)` | All data access uses Convex — established pattern |
| Clerk (`@clerk/nextjs`) | ^7.0.1 | Auth guard (`auth()` server-side), `UserButton` in header | Established auth — same as swipe page |
| Tailwind CSS v4 | ^4.2.1 | All styling — `@import "tailwindcss"` in globals.css, no config file | Established styling layer |
| TypeScript | ^5 | Types throughout | Established |

### No New Dependencies Needed

The bottom sheet is implemented with CSS transforms + Tailwind — no library required. The grid is CSS Grid. The bottom nav is a simple Tailwind flex component. Animation for the sheet can use a CSS transition (`translate-y` toggled by state) rather than importing react-spring for this UI element.

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| CSS transition bottom sheet | `@react-spring/web` (already installed) | Spring would be smoother but adds complexity; CSS `transition: transform 300ms ease-out` is sufficient and keeps the component simple. Either is acceptable at Claude's discretion. |
| Custom bottom nav | A nav library | No nav library is needed — 2-tab nav is trivial with Tailwind |

**Installation:** None required. All dependencies already in `package.json`.

---

## Architecture Patterns

### Recommended Project Structure

```
app/
├── (app)/                   # NEW route group — shared bottom nav layout
│   ├── layout.tsx           # Renders children + <BottomNav /> below
│   ├── swipe/
│   │   └── page.tsx         # Move or re-export existing swipe page here
│   └── wishlist/
│       └── page.tsx         # NEW — server auth guard
│           └── _components/
│               ├── WishlistShell.tsx   # 'use client', useQuery, renders grid
│               ├── WishlistGrid.tsx    # 2-col grid, maps over items
│               ├── WishlistCard.tsx    # Single card: image, title, price
│               └── WishlistSheet.tsx  # Bottom sheet detail + Visit Store + Remove
components/
└── BottomNav.tsx            # Shared — used by (app) layout
convex/
└── wishlists.ts             # NEW — getWishlist query + removeFromWishlist mutation
```

**Alternative if moving the swipe route is too disruptive:** render `<BottomNav />` inside both `app/swipe/page.tsx` and `app/wishlist/page.tsx` directly (no route group needed). The route group approach is cleaner but requires moving the swipe page into the group.

### Pattern 1: Convex Query — getWishlist

**What:** A `query` that fetches all `wishlists` records for the authenticated user, ordered by `savedAt` descending.
**When to use:** Called by `WishlistShell` via `useQuery`.

```typescript
// convex/wishlists.ts
import { query, mutation } from './_generated/server'
import { v } from 'convex/values'

export const getWishlist = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) return []

    const user = await ctx.db
      .query('users')
      .withIndex('by_token', q => q.eq('tokenIdentifier', identity.tokenIdentifier))
      .unique()
    if (!user) return []

    return await ctx.db
      .query('wishlists')
      .withIndex('by_user', q => q.eq('userId', user._id))
      .order('desc')
      .collect()
  },
})
```

**Note:** Returns `[]` for unauthenticated calls (same as `getCardQueue`) — safe for initial load before Clerk resolves.

### Pattern 2: Convex Mutation — removeFromWishlist

**What:** Deletes a single `wishlists` record by its `_id`. Uses the established pattern of looking up the user record first for security (user can only delete their own records).

```typescript
export const removeFromWishlist = mutation({
  args: {
    wishlistId: v.id('wishlists'),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) throw new Error('Not authenticated')

    const user = await ctx.db
      .query('users')
      .withIndex('by_token', q => q.eq('tokenIdentifier', identity.tokenIdentifier))
      .unique()
    if (!user) throw new Error('User not found')

    const entry = await ctx.db.get(args.wishlistId)
    if (!entry || entry.userId !== user._id) throw new Error('Not found')

    await ctx.db.delete(args.wishlistId)
  },
})
```

**Security note:** Always verify `entry.userId === user._id` before deleting. Never accept `productId` as the sole deletion key — use `_id` which is unguessable.

### Pattern 3: Server Page Auth Guard (copy from swipe page)

```typescript
// app/(app)/wishlist/page.tsx  (or app/wishlist/page.tsx)
import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import WishlistShell from './_components/WishlistShell'

export default async function WishlistPage() {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  return (
    <main className="flex min-h-screen flex-col">
      <WishlistShell />
    </main>
  )
}
```

### Pattern 4: Client Shell with useQuery

```typescript
// app/(app)/wishlist/_components/WishlistShell.tsx
'use client'
import { useQuery, useMutation } from 'convex/react'
import { api } from '@/convex/_generated/api'
import WishlistGrid from './WishlistGrid'

export default function WishlistShell() {
  const items = useQuery(api.wishlists.getWishlist)
  const removeFromWishlist = useMutation(api.wishlists.removeFromWishlist)

  if (items === undefined) {
    return <p className="text-center text-gray-400 mt-8">Loading...</p>
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center flex-1 gap-4 p-8">
        <p className="text-gray-500 text-lg">Nothing saved yet</p>
        <a
          href="/swipe"
          className="px-6 py-2 rounded-full bg-black text-white font-medium"
        >
          Start swiping
        </a>
      </div>
    )
  }

  return <WishlistGrid items={items} onRemove={removeFromWishlist} />
}
```

**Key:** `items === undefined` means loading (Convex `useQuery` returns `undefined` while loading, array once resolved). This is the same pattern used in `SwipeDeck` (`queueResult === undefined`).

### Pattern 5: Bottom Sheet (CSS transition, no library)

```typescript
// WishlistSheet.tsx
'use client'
import { useEffect } from 'react'

type Props = {
  item: WishlistItem | null
  onClose: () => void
  onRemove: (id: Id<'wishlists'>) => void
}

export default function WishlistSheet({ item, onClose, onRemove }: Props) {
  const isOpen = item !== null

  // Close on Escape key
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black/40 transition-opacity z-40 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
      />
      {/* Sheet */}
      <div
        className={`fixed bottom-0 left-0 right-0 bg-white rounded-t-2xl z-50 p-6 transition-transform duration-300 ${isOpen ? 'translate-y-0' : 'translate-y-full'}`}
      >
        {item && (
          <>
            <div className="w-12 h-1 bg-gray-300 rounded-full mx-auto mb-4" /> {/* drag handle */}
            <img src={item.productSnapshot.imageUrl} className="w-full h-48 object-cover rounded-xl mb-4" />
            <h2 className="font-semibold text-lg mb-1">{item.productSnapshot.title}</h2>
            <p className="text-gray-500 mb-1">{item.productSnapshot.sourceStore}</p>
            <p className="font-bold text-xl mb-6">{formatPrice(item.productSnapshot.priceAmount, item.productSnapshot.priceCurrency)}</p>
            <div className="flex gap-3">
              <a
                href={item.productSnapshot.affiliateUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 py-3 bg-black text-white rounded-full text-center font-medium"
              >
                Visit Store
              </a>
              <button
                onClick={() => { onRemove(item._id); onClose() }}
                className="px-6 py-3 border border-gray-200 rounded-full text-gray-700 font-medium"
              >
                Remove
              </button>
            </div>
          </>
        )}
      </div>
    </>
  )
}
```

### Pattern 6: Price Formatting

```typescript
function formatPrice(cents: number, currency: string): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(cents / 100)
}
// 999 → "$9.99", 12999 → "$129.99"
```

**Note:** `Intl.NumberFormat` is available in all modern browsers and Node.js — no library needed.

### Pattern 7: Bottom Navigation

```typescript
// components/BottomNav.tsx
'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

export default function BottomNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex z-30">
      <Link
        href="/swipe"
        className={`flex-1 flex flex-col items-center py-3 gap-1 text-xs ${pathname.startsWith('/swipe') ? 'text-black font-semibold' : 'text-gray-400'}`}
      >
        {/* Discover / compass icon */}
        <span className="text-xl">◎</span>
        Discover
      </Link>
      <Link
        href="/wishlist"
        className={`flex-1 flex flex-col items-center py-3 gap-1 text-xs ${pathname.startsWith('/wishlist') ? 'text-black font-semibold' : 'text-gray-400'}`}
      >
        {/* Heart icon */}
        <span className="text-xl">♡</span>
        Wishlist
      </Link>
    </nav>
  )
}
```

**Note:** `usePathname()` requires `'use client'`. The component uses `pathname.startsWith()` so nested routes still highlight the correct tab.

### Pattern 8: Middleware Update

The middleware currently only protects `/swipe(.*)`. It must be extended to protect `/wishlist` as well:

```typescript
const isProtectedRoute = createRouteMatcher(['/swipe(.*)', '/wishlist(.*)'])
```

### Pattern 9: Bottom Nav Padding

Both swipe and wishlist pages must add bottom padding so the fixed bottom nav does not overlap content:

```
pb-16   /* 64px — clears the ~56px nav bar */
```

Add to the swipe page's `<main>` and wishlist page's `<main>`.

### Anti-Patterns to Avoid

- **Opening affiliateUrl with `window.location.href`:** Always use `target="_blank"` with `rel="noopener noreferrer"` on an `<a>` tag or `window.open(..., '_blank', 'noopener,noreferrer')`. Never navigate away from WishSwipe on affiliate click.
- **Passing `productId` as delete key without security check:** Always use `wishlistId` (`_id`) and verify `entry.userId === user._id` in the mutation before deleting.
- **Fetching from the `swipes` table to build the wishlist:** The `wishlists` table is the source of truth. Do NOT query swipes and filter by `direction === 'right'`.
- **Using `rawUrl`, `productUrl`, or `storeUrl`:** The schema enforces `affiliateUrl` as the only URL field. Never introduce alternate URL field names.
- **Showing a confirmation dialog before remove:** User decision is "instant remove, no friction." No confirm prompt.
- **Re-fetching after remove:** Convex real-time subscriptions automatically update the `useQuery` result when the mutation completes. No manual refetch needed.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Price display | Custom number formatter | `Intl.NumberFormat` (built-in) | Handles currency symbols, decimal places, locale correctly |
| Real-time wishlist update after remove | Manual refetch / polling | Convex `useQuery` subscription (automatic) | Convex pushes diffs; client updates automatically |
| Auth check in Convex mutation | Client-side guard only | `ctx.auth.getUserIdentity()` in mutation handler | Client is untrusted; always verify server-side |
| Bottom sheet animation | Full animation library | CSS `transition: transform 300ms` | Sufficient; avoids new dependency |
| Active tab detection | Manual URL parsing | `usePathname()` from `next/navigation` | Built-in, SSR-safe, no parsing needed |

**Key insight:** Everything this phase needs is either a built-in browser/platform API or an already-installed library. Zero new packages required.

---

## Common Pitfalls

### Pitfall 1: Convex useQuery loading state — undefined vs empty array

**What goes wrong:** Treating `undefined` and `[]` the same. If you render the empty state when `items === undefined`, users see "Nothing saved yet" before the query resolves.
**Why it happens:** Convex `useQuery` returns `undefined` while the subscription is establishing, then the actual value.
**How to avoid:** Always three-branch: `if (items === undefined) → loading`, `if (items.length === 0) → empty state`, `else → render grid`.
**Warning signs:** Empty state flashes briefly on every page load.

### Pitfall 2: Bottom nav covers page content

**What goes wrong:** The fixed bottom nav (height ~56px) overlaps the bottom of the page content.
**Why it happens:** Fixed positioning takes the nav out of flow.
**How to avoid:** Add `pb-16` (64px) to the `<main>` element on both swipe and wishlist pages.
**Warning signs:** Bottom cards/items are partially hidden.

### Pitfall 3: Middleware not protecting /wishlist

**What goes wrong:** An unauthenticated user navigates to `/wishlist` and sees the page (or gets a Convex error).
**Why it happens:** `middleware.ts` currently only lists `/swipe(.*)`.
**How to avoid:** Update `createRouteMatcher` to include `/wishlist(.*)`.
**Warning signs:** Direct URL navigation to `/wishlist` when signed out shows the page instead of redirecting.

### Pitfall 4: Route group restructuring breaks swipe page

**What goes wrong:** If the swipe page is moved into an `(app)` route group but the import paths or layout wrapping aren't updated, the swipe page breaks.
**Why it happens:** File moves change module resolution paths.
**How to avoid:** If using a route group layout for the bottom nav, carefully update all imports. Alternatively, place `<BottomNav />` in each page directly to avoid moving files.
**Warning signs:** Swipe page 404s or layout duplicates.

### Pitfall 5: Sheet content renders when item is null

**What goes wrong:** Sheet renders (and images request) before an item is selected.
**Why it happens:** Conditional rendering not guarded on `item !== null`.
**How to avoid:** Wrap all sheet content in `{item && (...)}`. The sheet div itself can remain in DOM for animation purposes; only its contents are conditionally rendered.

### Pitfall 6: Convex mutation called without wishlistId verification

**What goes wrong:** A malicious client could delete another user's wishlist entry by passing a different user's `_id`.
**Why it happens:** Trusting the client-provided ID without DB-level ownership check.
**How to avoid:** In `removeFromWishlist`, always `ctx.db.get(args.wishlistId)` and verify `entry.userId === user._id` before `ctx.db.delete(...)`.

### Pitfall 7: Intl.NumberFormat on the server (SSR)

**What goes wrong:** Price formatter behaves differently server vs client if locale defaults differ.
**Why it happens:** Server locale vs browser locale mismatch.
**How to avoid:** Always pass explicit locale string: `new Intl.NumberFormat('en-US', ...)`. Never rely on system default locale.

---

## Code Examples

### Exact productSnapshot shape available in wishlists records

```typescript
// From convex/schema.ts — this is what getWishlist returns for each item's productSnapshot
productSnapshot: {
  title: string,
  imageUrl: string,
  priceAmount: number,    // integer cents — divide by 100 for display
  priceCurrency: string,  // "USD"
  affiliateUrl: string,   // ONLY URL field — open this in new tab
  sourceStore: string,    // "dummyjson" | future stores
}
```

### useQuery loading pattern (established in SwipeDeck)

```typescript
// Established pattern from app/swipe/_components/SwipeDeck.tsx
const queueResult = useQuery(api.cardQueue.getCardQueue)
const isLoading = queueResult === undefined
const queue = queueResult ?? []
```

Apply same pattern on wishlist:
```typescript
const items = useQuery(api.wishlists.getWishlist)
const isLoading = items === undefined
```

### useMutation pattern (established in SwipeDeck)

```typescript
// From SwipeDeck — same pattern for removeFromWishlist
const removeFromWishlist = useMutation(api.wishlists.removeFromWishlist)
// Call:
removeFromWishlist({ wishlistId: item._id }).catch(console.error)
```

### Optimistic update behavior with Convex

Convex `useQuery` is a real-time subscription. After `removeFromWishlist` mutation succeeds, Convex pushes an update to all subscribers automatically. The item disappears from the `items` array without any manual refetch. This is the "optimistic" feel — no extra code needed. The UI update is reactive.

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Custom bottom sheet libraries (react-modal-sheet etc.) | CSS transitions with Tailwind | 2023+ | Simpler, no bundle weight |
| Manual cache invalidation after mutations | Convex real-time subscriptions | Convex v0.x+ | Zero-code reactive updates |
| Separate auth check in every Convex function | `ctx.auth.getUserIdentity()` pattern | Convex current | Consistent, server-enforced |

**Note on Next.js App Router layouts:** A route group `(app)` with a shared `layout.tsx` is the idiomatic way to share UI (like a bottom nav) across multiple routes without affecting URL structure. The parentheses group name is omitted from the URL. This is a stable Next.js App Router feature.

---

## Open Questions

1. **Bottom nav placement: route group vs per-page**
   - What we know: Route group layout is the cleaner long-term pattern; per-page inclusion is simpler to implement without moving files
   - What's unclear: Whether moving `app/swipe/` into `app/(app)/swipe/` risks any current import path issues
   - Recommendation: Start with per-page inclusion of `<BottomNav />` to avoid touching the swipe page structure; refactor to route group in Phase 4 if desired

2. **WishlistShell vs passing `removeFromWishlist` as prop**
   - What we know: `useMutation` can only be called in a client component; it can be called in WishlistShell and passed down, or called in WishlistSheet directly
   - What's unclear: Which level of the component tree is most natural
   - Recommendation: Call `useMutation` in WishlistShell (the top-level client boundary) and pass the handler down as a prop — mirrors how SwipeDeck owns all mutation calls

3. **Scroll behavior with fixed bottom nav**
   - What we know: Fixed nav overlaps content; `pb-16` on `<main>` prevents the issue
   - What's unclear: Mobile Safari fixed positioning sometimes has quirks with 100vh
   - Recommendation: Use `min-h-dvh` (dynamic viewport height) if available, or `min-h-screen` with explicit `pb-16` as fallback

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Jest 30 + ts-jest 29 |
| Config file | `jest.config.ts` (or `jest.config.js`) in project root |
| Quick run command | `npm test` |
| Full suite command | `npm test` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| WISH-01 | `getWishlist` returns only wishlists for authenticated user | unit | `npm test -- --testPathPattern=wishlists` | Wave 0 |
| WISH-01 | `getWishlist` returns `[]` for unauthenticated call | unit | `npm test -- --testPathPattern=wishlists` | Wave 0 |
| WISH-02 | `removeFromWishlist` deletes record only if `userId` matches | unit | `npm test -- --testPathPattern=wishlists` | Wave 0 |
| WISH-02 | `affiliateUrl` is used for Visit Store (schema enforced) | manual | Open wishlist, tap Visit Store, verify URL starts with affiliate | — |

**Note:** UI behavior (grid render, bottom sheet open/close, affiliate link target) requires manual verification. Pure logic can be unit tested as helper functions following the established `swipes.test.ts` / `cardQueue.test.ts` pattern (pure functions, no Convex SDK imports).

### Sampling Rate

- **Per task commit:** `npm test`
- **Per wave merge:** `npm test`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `convex/normaliser/__tests__/wishlists.test.ts` — covers WISH-01 (getWishlist filter logic) and WISH-02 (removeFromWishlist ownership check as pure functions)

---

## Sources

### Primary (HIGH confidence)

- Codebase direct read — `convex/schema.ts`, `convex/swipes.ts`, `convex/cardQueue.ts`, `app/swipe/page.tsx`, `app/swipe/_components/SwipeShell.tsx`, `app/swipe/_components/SwipeDeck.tsx`, `middleware.ts`, `app/layout.tsx`, `package.json` — all patterns verified from working Phase 2 code
- Convex `query` / `mutation` API — consistent with all existing Convex functions in this codebase

### Secondary (MEDIUM confidence)

- Next.js App Router route groups `(group)/layout.tsx` — standard Next.js App Router feature, stable since Next.js 13; version in use is 16.1.6 which fully supports this
- `usePathname()` from `next/navigation` — standard App Router hook for client-side pathname

### Tertiary (LOW confidence)

- CSS `translate-y-full` / `translate-y-0` transition for bottom sheet — common pattern, works with Tailwind v4; specific browser behavior on mobile Safari not verified in this codebase

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries already installed; patterns verified from existing code
- Architecture: HIGH — directly extends established patterns with no new concepts
- Pitfalls: HIGH — derived from existing code examination and known Convex/Next.js behaviors

**Research date:** 2026-03-04
**Valid until:** 2026-04-04 (stable stack, but Convex and Clerk release frequently — verify if delayed)
