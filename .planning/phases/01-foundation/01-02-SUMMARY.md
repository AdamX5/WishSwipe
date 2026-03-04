---
phase: 01-foundation
plan: 02
subsystem: auth
tags: [clerk, convex, nextjs, typescript, oauth, session]

# Dependency graph
requires:
  - phase: 01-01
    provides: Clerk provider chain in root layout, catch-all sign-in/sign-up routes, Convex users table schema with by_token index

provides:
  - upsertUser mutation: syncs Clerk JWT identity into Convex users table on sign-in (convex/users.ts)
  - getCurrentUser query: reads authenticated user record from Convex users table (convex/users.ts)
  - SwipeShell component: calls upsertUser on mount, renders UserButton for sign-out (app/swipe/_components/SwipeShell.tsx)
  - Swipe page wired to SwipeShell with server-side auth guard (app/swipe/page.tsx)
  - Full auth flow verified: sign-up, sign-in, session persistence, sign-out, OAuth buttons, Convex user record

affects:
  - 02-swipe-engine (uses SwipeShell layout component and getCurrentUser query for per-user product filtering)
  - 03-wishlist (authenticated user identity from Convex users table used for wishlist writes)
  - 04-data-health (users table records anchored to tokenIdentifier — compaction must never touch users table)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "upsertUser mutation pattern: getUserIdentity() -> by_token index lookup -> patch or insert"
    - "SwipeShell as client boundary: 'use client' component calls useMutation on mount, renders Clerk UserButton"
    - "Server component auth guard: await auth() -> redirect('/sign-in') before rendering client shell"
    - "afterSignOutUrl on UserButton and ClerkProvider ensures sign-out redirects to /sign-in, not /"

key-files:
  created:
    - convex/users.ts
    - app/swipe/_components/SwipeShell.tsx
  modified:
    - app/swipe/page.tsx

key-decisions:
  - "upsertUser uses patch (not replace) — preserves any future fields not known at sign-in time"
  - "SwipeShell is a dedicated 'use client' component rather than making swipe/page.tsx a client component — keeps server-side auth guard in the page component"
  - "afterSignOutUrl='/sign-in' added to both ClerkProvider and UserButton to guarantee redirect target after sign-out"
  - "ingestAllStores changed to internalAction (not action) — Convex TypeScript error caught post-checkpoint; internal actions cannot be called from HTTP without explicit export"

patterns-established:
  - "Client shell pattern: server page renders 'use client' shell component that calls mutations on mount"
  - "Auth sync on mount: upsertUser called via useEffect on SwipeShell mount — fires once per session entry to /swipe"

requirements-completed: [AUTH-01, AUTH-02, AUTH-03, AUTH-04, AUTH-05]

# Metrics
duration: ~60min (includes human verification window)
completed: 2026-03-04
---

# Phase 1 Plan 02: Auth Wiring Summary

**Clerk sign-up/sign-in/session/sign-out flow verified in browser with upsertUser syncing Clerk JWT identity to Convex users table and UserButton providing sign-out access from /swipe**

## Performance

- **Duration:** ~60 min (includes human verification window)
- **Started:** 2026-03-04T09:08:43Z
- **Completed:** 2026-03-04T10:00:53Z
- **Tasks:** 2 (1 auto + 1 human-verify checkpoint)
- **Files modified:** 3

## Accomplishments
- `upsertUser` Convex mutation syncs Clerk JWT identity (tokenIdentifier, email, name) into the Convex users table — idempotent, patch-on-update
- `getCurrentUser` query provides authenticated user lookup for downstream phases (swipe engine, wishlist)
- `SwipeShell` client component calls `upsertUser` on mount and renders `UserButton` — gives users a sign-out control directly on the swipe page
- `SwipePage` server component maintains server-side auth guard (redirects to /sign-in if no session) while delegating client interactivity to SwipeShell
- Full auth flow manually verified in browser: sign-up, sign-in, session persistence across hard refresh, sign-out redirect, Google and Apple OAuth buttons visible, Convex user record confirmed — all 5 AUTH requirements satisfied

## Task Commits

Each task was committed atomically:

1. **Task 1: Convex upsertUser mutation + UserButton on swipe page** - `d529da5` (feat)
2. **Task 2: Verify full auth flow in browser (AUTH-01 through AUTH-05)** - human-verify checkpoint (approved)

**Post-checkpoint fix:** `2bd8ef9` — ingestAllStores changed to internalAction, afterSignOutUrl added to ClerkProvider

## Files Created/Modified
- `convex/users.ts` - upsertUser mutation (sync Clerk identity to Convex users table) + getCurrentUser query
- `app/swipe/_components/SwipeShell.tsx` - "use client" shell: calls upsertUser on mount, renders UserButton with afterSignOutUrl="/sign-in"
- `app/swipe/page.tsx` - Server component: server-side auth guard + renders SwipeShell

## Decisions Made
- **SwipeShell as client boundary:** Kept `app/swipe/page.tsx` as a server component for the auth guard, extracted the client-interactive header into `SwipeShell`. This preserves the server-side redirect performance while enabling `useMutation` in the header.
- **Patch not replace:** `upsertUser` uses `ctx.db.patch()` on existing records to update name/email — preserves any future fields that may be added to the users table without wiping them on re-sync.
- **afterSignOutUrl on both ClerkProvider and UserButton:** Belt-and-suspenders approach to ensure sign-out always lands on /sign-in regardless of which code path triggers sign-out.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] `ingestAllStores` changed from `action` to `internalAction`**
- **Found during:** Post-Task-1 Convex TypeScript validation
- **Issue:** `ingestAllStores` was exported as a public `action` but was intended as an internal-only function triggered by the HTTP endpoint — Convex TypeScript type mismatch surfaced after initial commit
- **Fix:** Changed export from `action` to `internalAction`; updated the HTTP endpoint call from `api.normaliser.actions.ingestAllStores` to `internal.normaliser.actions.ingestAllStores`
- **Files modified:** `convex/normaliser/actions.ts`, `convex/http.ts`
- **Verification:** Convex TypeScript compilation clean
- **Committed in:** `2bd8ef9`

**2. [Rule 2 - Missing Critical] `afterSignOutUrl` added to `ClerkProvider`**
- **Found during:** Browser verification (Task 2 checkpoint)
- **Issue:** Sign-out redirected to `/` (Next.js root) rather than `/sign-in` — `ClerkProvider` was missing `afterSignOutUrl` prop even though `UserButton` had it
- **Fix:** Added `afterSignOutUrl="/sign-in"` to `<ClerkProvider>` in `app/layout.tsx`
- **Files modified:** `app/layout.tsx`
- **Verification:** Sign-out confirmed to redirect to /sign-in in browser verification
- **Committed in:** `2bd8ef9`

---

**Total deviations:** 2 auto-fixed (1 bug, 1 missing critical)
**Impact on plan:** Both fixes required for correct behavior. No scope creep.

## Issues Encountered

None beyond the two auto-fixed deviations above.

## User Setup Required

**External services required manual configuration before this plan could be verified:**

| Step | Action | Location |
|------|--------|----------|
| Create Clerk application | Get NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY and CLERK_SECRET_KEY | Clerk Dashboard -> API Keys |
| Enable Google OAuth | Enable Google social connection (credentials optional for visual scaffold) | Clerk Dashboard -> Configure -> Social Connections -> Google |
| Enable Apple OAuth | Enable Apple social connection (credentials optional for visual scaffold) | Clerk Dashboard -> Configure -> Social Connections -> Apple |
| Set CLERK_JWT_ISSUER_DOMAIN | Add to both .env.local AND Convex dashboard ENV | Clerk Dashboard -> JWT Templates -> Issuer |
| Initialize Convex | Run `npx convex dev` to link project | Terminal |

All setup steps were completed by the user before the Task 2 human-verify checkpoint was raised.

## Next Phase Readiness
- Auth foundation complete — authenticated user identity available in all downstream Convex functions via `ctx.auth.getUserIdentity()`
- `getCurrentUser` query ready for Phase 2 swipe engine to use for per-user product filtering and swipe recording
- Convex users table populated with real user records from verified sign-up flow
- SwipeShell layout component ready for Phase 2 to extend with card stack and gesture controls

---
*Phase: 01-foundation*
*Completed: 2026-03-04*

## Self-Check: PASSED

All created/modified files verified to exist on disk:
- convex/users.ts: FOUND
- app/swipe/_components/SwipeShell.tsx: FOUND
- app/swipe/page.tsx: FOUND
- .planning/phases/01-foundation/01-02-SUMMARY.md: FOUND

All commits verified in git log:
- d529da5 (Task 1: upsertUser + SwipeShell): FOUND
- 2bd8ef9 (post-checkpoint fix: internalAction + afterSignOutUrl): FOUND
