# Deferred Items — Phase 02 Swipe Engine

## Out-of-scope issues discovered during execution

### Pre-existing TypeScript error in SwipeShell.tsx

**File:** `app/swipe/_components/SwipeShell.tsx` line 17
**Error:** `Property 'afterSignOutUrl' does not exist on type '...UserButtonProps...'`
**Origin:** Phase 01 Plan 02 (commit d529da5) — existed before Phase 02 began
**Cause:** Clerk v7 `UserButton` no longer accepts `afterSignOutUrl` prop directly; likely needs `afterSignOutUrl` configured via `ClerkProvider` instead
**Impact:** TypeScript compile error but runtime behaviour unchanged (Clerk ignores unknown props)
**Plan to fix:** Phase 03 or standalone chore — update `SwipeShell.tsx` to remove deprecated prop and configure redirect via `ClerkProvider`
