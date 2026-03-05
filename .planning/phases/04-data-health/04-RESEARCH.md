# Phase 4: Data Health - Research

**Researched:** 2026-03-05
**Domain:** Convex scheduled cron jobs, batched deletion, mutation budget management
**Confidence:** HIGH

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| GHOST-03 | A scheduled Convex cron job compacts old swipe history (aggregates or prunes records older than threshold) to keep the database lean and algorithm-ready | Convex `cronJobs()` + `internalMutation` pattern with `ctx.scheduler.runAfter` recursive batching directly enables this; `by_user_time` index on `swipedAt` enables threshold filtering without table scans |
</phase_requirements>

---

## Summary

Phase 4 has a single requirement: implement a scheduled Convex cron job that prunes old left-swipe records while leaving wishlist records and right-swipe records untouched. The Convex backend already has the schema separation needed — `swipes` and `wishlists` are intentionally distinct tables, and `swipes` has a `by_user_time` index on `swipedAt` that makes age-based filtering index-efficient.

The authoritative implementation pattern is the self-scheduling paginated-batch delete: a cron-triggered `internalMutation` queries left-swipes older than a configured threshold in bounded pages, deletes each page, then schedules itself for the next page via `ctx.scheduler.runAfter(0, ...)` until no records remain. This pattern is production-validated in the Convex ecosystem (ai-town, Convex's own stack articles) and respects the mutation execution budget of 1 second / 8,192 documents per transaction.

The compaction logic is pure functional (filter by direction + age threshold, delete matching IDs) and can be fully unit-tested without the Convex SDK — matching the project's existing Jest pattern. The only new Convex file needed is `convex/crons.ts` with `export default crons`, which Convex detects by filename convention at deploy time.

**Primary recommendation:** Use `cronJobs()` in `convex/crons.ts` scheduled daily, calling an `internalMutation` in `convex/compaction.ts` that paginates left-swipes older than 30 days and self-schedules until complete. Filter on `direction === 'left'` AND `swipedAt < threshold` using the existing `by_user_time` index (range on `swipedAt` after equality on `userId`) — or a full-table scan filtered in code for simplicity, batched to stay inside budget.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `convex` (server) | ^1.32.0 (installed) | `cronJobs()`, `internalMutation`, `ctx.scheduler.runAfter`, `ctx.db.query(...).paginate()` | Convex's own primitives — no additional install |

### Supporting

None required. Everything needed is already in the installed `convex` package.

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `internalMutation` (direct DB access) | `internalAction` calling a mutation | Action adds indirection without benefit for pure DB ops; mutations have serializable isolation |
| Recursive self-scheduling batch | Single large delete mutation | Single mutation risks hitting 1-second budget on large swipe history; recursive batch is safe at any scale |
| Filter by `swipedAt` (existing index) | Filter by `_creationTime` (built-in) | `swipedAt` is the semantic field for age — exactly what schema stores; `_creationTime` would be coincidentally close but semantically wrong |

**Installation:**

No new packages required.

---

## Architecture Patterns

### Recommended File Structure

```
convex/
├── crons.ts            # NEW — cronJobs() definition, export default crons
├── compaction.ts       # NEW — internalMutation: compactLeftSwipes + compactLeftSwipesPage
├── swipes.ts           # EXISTING — recordSwipe, undoSwipe (untouched)
├── wishlists.ts        # EXISTING — getWishlist, removeFromWishlist (untouched)
├── schema.ts           # EXISTING — no changes needed
normaliser/
└── __tests__/
    └── compaction.test.ts  # NEW — pure function tests for compaction filter logic
```

### Pattern 1: Convex Cron Job Registration

**What:** `convex/crons.ts` is the conventional file Convex detects at deploy time. Define schedules on a `cronJobs()` instance and export it as default.

**When to use:** Any recurring background work in Convex. Must be a single default export named `crons`.

```typescript
// convex/crons.ts
// Source: https://docs.convex.dev/scheduling/cron-jobs
import { cronJobs } from 'convex/server'
import { internal } from './_generated/api'

const crons = cronJobs()

crons.daily(
  'compact-old-left-swipes',
  { hourUTC: 3, minuteUTC: 0 },
  internal.compaction.compactLeftSwipes,
)

export default crons
```

### Pattern 2: Paginated Self-Scheduling Batch Delete

**What:** An `internalMutation` deletes one page of matching documents, then schedules itself with the pagination cursor if more records remain. Keeps every execution inside the 1-second mutation budget.

**When to use:** Any bulk delete over potentially large datasets. The page size of 100 is safe (well below the 8,192 document write limit) and keeps each mutation well inside 1 second.

```typescript
// convex/compaction.ts
// Source: ai-town/convex/crons.ts (production reference) + https://docs.convex.dev/scheduling/scheduled-functions
import { internalMutation } from './_generated/server'
import { internal } from './_generated/api'
import { v } from 'convex/values'

const COMPACTION_THRESHOLD_MS = 30 * 24 * 60 * 60 * 1000  // 30 days
const DELETE_BATCH_SIZE = 100

// Entry point called by cron — checks if any old left-swipes exist then kicks off paging
export const compactLeftSwipes = internalMutation({
  args: {},
  handler: async (ctx) => {
    const cutoff = Date.now() - COMPACTION_THRESHOLD_MS
    // Check if there's anything to do before scheduling batches
    const exists = await ctx.db
      .query('swipes')
      .withIndex('by_user_time', q => q.lt('swipedAt', cutoff))
      .filter(q => q.eq(q.field('direction'), 'left'))
      .first()
    if (exists) {
      await ctx.scheduler.runAfter(0, internal.compaction.compactLeftSwipesPage, {
        cursor: null,
        cutoff,
        deletedSoFar: 0,
      })
    }
  },
})

// Paginated worker — deletes one batch, reschedules if more remain
export const compactLeftSwipesPage = internalMutation({
  args: {
    cursor: v.union(v.string(), v.null()),
    cutoff: v.number(),
    deletedSoFar: v.number(),
  },
  handler: async (ctx, { cursor, cutoff, deletedSoFar }) => {
    const results = await ctx.db
      .query('swipes')
      .withIndex('by_user_time', q => q.lt('swipedAt', cutoff))
      .filter(q => q.eq(q.field('direction'), 'left'))
      .paginate({ cursor, numItems: DELETE_BATCH_SIZE })

    for (const swipe of results.page) {
      await ctx.db.delete(swipe._id)
    }

    if (!results.isDone) {
      await ctx.scheduler.runAfter(0, internal.compaction.compactLeftSwipesPage, {
        cursor: results.continueCursor,
        cutoff,
        deletedSoFar: deletedSoFar + results.page.length,
      })
    } else {
      console.log(`[compaction] deleted ${deletedSoFar + results.page.length} left-swipe records`)
    }
  },
})
```

**Critical safety invariant:** The `filter(q => q.eq(q.field('direction'), 'left'))` guard ensures right-swipes are never deleted. Wishlist records live in a completely separate table and are never touched by this code.

### Pattern 3: Pure Function Test Helpers

**What:** Extract the compaction filter predicate as a pure function (no Convex SDK) so it can be unit-tested with Jest — matching all existing test files in `convex/normaliser/__tests__/`.

```typescript
// Test helper — mirrors the DB filter logic
function isCompactable(
  swipe: { direction: string; swipedAt: number },
  cutoffMs: number
): boolean {
  return swipe.direction === 'left' && swipe.swipedAt < cutoffMs
}
```

### Anti-Patterns to Avoid

- **Single large delete mutation:** A mutation that collects all old records and deletes them in one shot will hit the 1-second execution budget on any user with significant swipe history. Always paginate.
- **Using an Action for direct DB deletes:** Actions cannot directly call `ctx.db.delete()`. Actions must call mutations. For pure DB compaction use `internalMutation` directly.
- **Deleting from `wishlists` table:** The requirement explicitly prohibits this. The compaction code must only touch the `swipes` table.
- **Deleting right-swipes:** The requirement says "left-swipe records older than threshold." Right-swipe records must be preserved (they are the algorithm training data).
- **Using `internalMutation` from client code:** `internalMutation` functions are not callable from the browser. They are only callable from other Convex functions or cron jobs — which is exactly what we want.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Recurring schedule | Custom HTTP cron trigger | `cronJobs()` in `convex/crons.ts` | Convex manages scheduling, retries, at-most-one-concurrent-execution guarantee, and visibility in the Dashboard |
| Bulk iteration | Manual offset-based loops | `.paginate({ cursor, numItems })` | Convex's paginate cursor is stable across mutations; offset-based approaches can skip or double-process documents when records are deleted mid-iteration |
| Inter-mutation data passing | Storing intermediate state in DB | Pass `cursor` + `deletedSoFar` as scheduler args | Avoids extra DB writes; scheduler args are durable |

**Key insight:** The `ctx.scheduler.runAfter(0, ...)` self-scheduling pattern is the idiomatic Convex way to perform work that exceeds a single mutation's time budget. The cursor from `.paginate()` is the safe iteration primitive — do not use `skip()` or manual offset counting.

---

## Common Pitfalls

### Pitfall 1: Accidental Deletion of Right-Swipes

**What goes wrong:** Compaction logic omits the `direction === 'left'` filter, wiping all old swipes including right-swipes (the algorithm's training data).
**Why it happens:** Schema field filter is easy to forget when iterating by time index.
**How to avoid:** The `.filter(q => q.eq(q.field('direction'), 'left'))` call must be on every query in the compaction chain — both in `compactLeftSwipes` (existence check) and `compactLeftSwipesPage` (the deleter).
**Warning signs:** Test that a right-swipe record with `swipedAt` older than cutoff is NOT deleted.

### Pitfall 2: Mutation Execution Budget Exceeded

**What goes wrong:** A single mutation attempts to delete thousands of records, exceeds the 1-second budget, and throws a timeout error.
**Why it happens:** Collecting `.collect()` on a large result set and then looping deletes in one transaction.
**How to avoid:** Use `.paginate({ numItems: 100 })` and the self-scheduling pattern. Each page of 100 deletes comfortably fits within budget.
**Warning signs:** Convex dashboard shows mutation timeouts or "execution too long" errors.

### Pitfall 3: Index Range Mismatch

**What goes wrong:** Using `by_user_time` index with only `lt('swipedAt', cutoff)` on `swipedAt` without first binding `userId` causes a full-table range scan instead of per-user.
**Why it happens:** `by_user_time` is a compound index `['userId', 'swipedAt']` — you must provide `userId` first to get the index benefit, or accept the full-table scan.
**How to avoid:** For global compaction (all users), the full-table range scan on `swipedAt` is acceptable — the index still narrows by time. Alternatively, use `by_creation_time` (Convex's built-in auto-index) if only filtering by time. For this use case, `swipedAt` is the correct semantic field even if the index isn't perfectly selective.
**Warning signs:** Convex dashboard showing high document reads relative to deletes.

### Pitfall 4: Touching the Wishlists Table

**What goes wrong:** A developer assumes wishlists should also be "compacted" and adds the table to the job.
**Why it happens:** Misreading "keep the database lean" as applying to all tables.
**How to avoid:** The architecture decision is explicit — wishlists are durable and must never be compacted. The compaction code must import only from `swipes`. Add a comment in `convex/crons.ts` and `convex/compaction.ts` stating this invariant.
**Warning signs:** Any query to `wishlists` table inside compaction functions.

### Pitfall 5: Cron Not Registering

**What goes wrong:** Cron jobs don't appear in the Convex dashboard after deploy.
**Why it happens:** File is not named `crons.ts`, or does not export a `cronJobs()` instance as the default export.
**How to avoid:** The file MUST be `convex/crons.ts` with `export default crons` where `crons = cronJobs()`.
**Warning signs:** No scheduled jobs visible in Convex dashboard under "Scheduled Jobs."

---

## Code Examples

### Complete crons.ts

```typescript
// convex/crons.ts
// Source: https://docs.convex.dev/scheduling/cron-jobs
import { cronJobs } from 'convex/server'
import { internal } from './_generated/api'

const crons = cronJobs()

// Runs daily at 03:00 UTC — compacts left-swipes older than COMPACTION_THRESHOLD_MS
// INVARIANT: this job ONLY touches the swipes table, direction='left'
// wishlists and right-swipe records are NEVER modified by this job
crons.daily(
  'compact-old-left-swipes',
  { hourUTC: 3, minuteUTC: 0 },
  internal.compaction.compactLeftSwipes,
)

export default crons
```

### Pure function for test isolation

```typescript
// In convex/normaliser/__tests__/compaction.test.ts
type SwipeRecord = {
  _id: string
  userId: string
  direction: 'right' | 'left'
  swipedAt: number
}

function isCompactable(swipe: SwipeRecord, cutoffMs: number): boolean {
  return swipe.direction === 'left' && swipe.swipedAt < cutoffMs
}

function filterCompactable(swipes: SwipeRecord[], cutoffMs: number): SwipeRecord[] {
  return swipes.filter(s => isCompactable(s, cutoffMs))
}
```

### Scheduler method signatures (reference)

```typescript
// ctx.scheduler.runAfter — schedule a function to run after a delay
// Source: https://docs.convex.dev/scheduling/scheduled-functions
await ctx.scheduler.runAfter(
  0,                              // delay in ms (0 = as soon as possible)
  internal.compaction.compactLeftSwipesPage,
  { cursor: null, cutoff: 123, deletedSoFar: 0 }
)

// cronJobs scheduling methods
crons.daily('name', { hourUTC: 3, minuteUTC: 0 }, internal.module.fn)
crons.weekly('name', { dayOfWeek: 'sunday', hourUTC: 0, minuteUTC: 0 }, internal.module.fn)
crons.interval('name', { hours: 24 }, internal.module.fn)
crons.cron('name', '0 3 * * *', internal.module.fn)  // standard cron syntax alternative
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| HTTP-triggered cron via external service | `cronJobs()` native in Convex | Convex 0.17+ | No external scheduler needed; visible in dashboard |
| Single-shot bulk delete mutation | Paginated self-scheduling batch | Current best practice | Scales to any dataset size |

**Deprecated/outdated:**
- Manual `skip()`-based pagination: Convex's `.paginate()` with cursors is the correct approach; skip() can produce incorrect results when records are deleted mid-iteration.

---

## Open Questions

1. **Compaction threshold value**
   - What we know: GHOST-03 says "older than threshold" but does not specify what the threshold should be
   - What's unclear: Should it be configurable via ENV or a hardcoded constant?
   - Recommendation: Hardcode `30 * 24 * 60 * 60 * 1000` (30 days) as a named constant in `compaction.ts`. ENV configuration is overkill for v1; the value can be changed in one place if needed.

2. **Cron schedule cadence**
   - What we know: GHOST-03 requires a "defined cadence" but doesn't specify
   - What's unclear: Daily vs weekly vs hourly
   - Recommendation: Daily at 03:00 UTC. Frequent enough to keep the table lean; infrequent enough to not generate excessive scheduled function activity.

3. **Index strategy for cross-user compaction**
   - What we know: `by_user_time` is `['userId', 'swipedAt']` — compound; using it for global compaction requires full-table range
   - What's unclear: Whether Convex has a dedicated cross-user time-range index for `swipes`
   - Recommendation: Add a new index `by_direction_time` (`['direction', 'swipedAt']`) to the schema — this enables efficient filtering of `direction='left'` with `swipedAt < cutoff` without touching right-swipes at the index level. This is a schema additive change (no migration needed).

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Jest 30 + ts-jest 29 |
| Config file | `jest.config.ts` (exists) |
| Quick run command | `npm test -- --testPathPattern=compaction` |
| Full suite command | `npm test` |

### Phase Requirements to Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| GHOST-03 | `isCompactable` returns true for left-swipe older than cutoff | unit | `npm test -- --testPathPattern=compaction` | Wave 0 |
| GHOST-03 | `isCompactable` returns false for right-swipe older than cutoff | unit | `npm test -- --testPathPattern=compaction` | Wave 0 |
| GHOST-03 | `isCompactable` returns false for left-swipe newer than cutoff | unit | `npm test -- --testPathPattern=compaction` | Wave 0 |
| GHOST-03 | `filterCompactable` excludes all right-swipes regardless of age | unit | `npm test -- --testPathPattern=compaction` | Wave 0 |
| GHOST-03 | `filterCompactable` returns empty when no records exceed threshold | unit | `npm test -- --testPathPattern=compaction` | Wave 0 |
| GHOST-03 | Cron job wiring smoke test (manual) | manual-only | n/a — Convex crons not testable with Jest | n/a |

**Note on manual-only test:** Convex's scheduler and `internalMutation` require a live Convex deployment to exercise end-to-end. The Jest suite covers the pure filter logic; the cron trigger and paginated delete require `npx convex dev` + `npx convex run compaction:compactLeftSwipes` for verification.

### Sampling Rate

- **Per task commit:** `npm test -- --testPathPattern=compaction`
- **Per wave merge:** `npm test`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `convex/normaliser/__tests__/compaction.test.ts` — covers GHOST-03 pure filter logic
  - Test pattern mirrors `swipes.test.ts` and `wishlists.test.ts` — no Convex SDK imports, pure functions only

*(No framework gaps — Jest, ts-jest, and jest.config.ts all exist)*

---

## Sources

### Primary (HIGH confidence)

- [Convex Cron Jobs documentation](https://docs.convex.dev/scheduling/cron-jobs) — cron syntax, `cronJobs()`, scheduling methods
- [Convex Scheduled Functions documentation](https://docs.convex.dev/scheduling/scheduled-functions) — `ctx.scheduler.runAfter`, transactional scheduling guarantees
- [Convex Limits documentation](https://docs.convex.dev/production/state/limits) — mutation budget: 1 second, 8,192 documents per transaction
- [ai-town/convex/crons.ts](https://github.com/a16z-infra/ai-town/blob/main/convex/crons.ts) — production reference: `vacuumOldEntries` + `vacuumTable` with exact paginated self-scheduling pattern

### Secondary (MEDIUM confidence)

- [Convex stack article: Lightweight Migrations](https://stack.convex.dev/lightweight-zero-downtime-migrations) — paginated mutation pattern for bulk operations
- [Convex stack article: Configure Cron Jobs at Runtime](https://stack.convex.dev/cron-jobs) — runtime cron configuration patterns
- WebSearch confirmation of `_creationTime` built-in index on all tables

### Tertiary (LOW confidence)

None — all critical findings verified against official docs or production reference code.

---

## Metadata

**Confidence breakdown:**

- Standard stack: HIGH — `convex` package already installed; cron + internalMutation APIs verified against docs.convex.dev
- Architecture: HIGH — ai-town is a production Convex app by a16z using the exact same vacuum/compaction pattern; code reviewed directly
- Pitfalls: HIGH — mutation budget limits verified (1s / 8192 docs); index structure verified from schema.ts; Convex-specific concerns verified against official docs

**Research date:** 2026-03-05
**Valid until:** 2026-06-05 (Convex APIs are stable; cron syntax has not changed across recent major versions)
