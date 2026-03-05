---
phase: 03-wishlist
plan: 03
subsystem: ui
tags: [react, nextjs, tailwind, typescript, components]

# Dependency graph
requires:
  - phase: 03-01
    provides: WishlistItem type shape and productSnapshot schema from Convex backend
provides:
  - BottomNav component with active-state routing via usePathname
  - WishlistCard presentational grid cell (image, title, price only)
  - WishlistSheet bottom sheet with affiliate link, Escape key, remove action
affects: [03-04]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Bottom sheet via CSS translate-y-0/translate-y-full transition (no JS animation library)
    - Active nav state via usePathname().startsWith() — no additional routing logic
    - Escape key handler in useEffect with cleanup (addEventListener/removeEventListener)
    - formatPrice utility using Intl.NumberFormat with explicit en-US locale

key-files:
  created:
    - components/BottomNav.tsx
    - app/wishlist/_components/WishlistCard.tsx
    - app/wishlist/_components/WishlistSheet.tsx
  modified: []

key-decisions:
  - "WishlistItem._id typed as string (not Id<'wishlists'>) to keep components fully Convex-free — Plan 03-04 will cast when calling mutations"
  - "WishlistItem type exported from WishlistCard and imported in WishlistSheet — single source of truth, no duplication"
  - "formatPrice duplicated in both WishlistCard and WishlistSheet rather than shared utils file — avoids new package/file for a 2-line helper; can be extracted in v2"
  - "Visit Store uses <a href target=_blank> anchor tag (not window.open) — href pattern is semantically correct and opens affiliate link in new tab"

patterns-established:
  - "Bottom sheet: fixed bottom-0 rounded-t-2xl, translate-y-0 open / translate-y-full closed, backdrop opacity toggle with pointer-events-none"
  - "No Convex SDK imports in presentational components — all Convex calls happen in page/shell layer (03-04)"

requirements-completed:
  - WISH-01
  - WISH-02

# Metrics
duration: 5min
completed: 2026-03-04
---

# Phase 3 Plan 03: Wishlist UI Components Summary

**Three prop-driven Tailwind components: persistent BottomNav with active-state routing, WishlistCard grid cell, and WishlistSheet bottom sheet with affiliate anchor and instant remove — zero Convex imports**

## Performance

- **Duration:** 5 min
- **Started:** 2026-03-04T20:23:47Z
- **Completed:** 2026-03-04T20:28:30Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- BottomNav with usePathname active state highlighting Discover/Wishlist tabs
- WishlistCard presentational grid cell (image, title, price — no star rating or store name)
- WishlistSheet bottom sheet with CSS transform transition, Escape key handler, affiliate anchor with target="_blank", instant remove (no confirmation dialog)

## Task Commits

Each task was committed atomically:

1. **Task 1: BottomNav component** - `a1e3feb` (feat)
2. **Task 2: WishlistCard + WishlistSheet components** - `a4c9052` (feat) + `2656d4c` (fix: remove Convex Id type import)

## Files Created/Modified
- `components/BottomNav.tsx` - Two-tab persistent nav with active state via usePathname; 'use client' for hook usage
- `app/wishlist/_components/WishlistCard.tsx` - Grid card showing image/title/price; onOpen callback; formatPrice helper
- `app/wishlist/_components/WishlistSheet.tsx` - Bottom sheet with CSS translate-y transition; affiliateUrl in anchor tag; Escape key useEffect; instant remove

## Decisions Made
- WishlistItem._id typed as `string` (not Convex `Id<'wishlists'>`) to keep all three components fully Convex-free. Plan 03-04 (page wiring) will handle the type bridge when calling mutations.
- WishlistItem type exported from WishlistCard.tsx and imported in WishlistSheet.tsx — single source of truth for the shared type between both components.
- formatPrice helper duplicated in both WishlistCard and WishlistSheet rather than creating a shared utils file. The helper is 2 lines; extraction is a v2 concern.
- Visit Store uses `<a href={affiliateUrl} target="_blank" rel="noopener noreferrer">` — semantically correct anchor tag that opens affiliate link in new tab, never navigates away.

## Deviations from Plan

None - plan executed exactly as written.

The only unplanned change was removing an `import type { Id } from 'convex/_generated/dataModel'` that was initially added. The plan's success criteria stated "No Convex SDK imports" — removing the type import and replacing with `string` was a correctness alignment, not a deviation from intent.

## Issues Encountered
None - all three components built cleanly in a single pass.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All three components ready for Plan 03-04 (WishlistShell page wiring)
- WishlistItem type exported from WishlistCard.tsx — Plan 03-04 imports directly
- BottomNav ready to be placed in app/wishlist/layout.tsx and app/swipe/layout.tsx
- No blockers

---
*Phase: 03-wishlist*
*Completed: 2026-03-04*
