# Project Retrospective

*A living document updated after each milestone. Lessons feed forward into future planning.*

## Milestone: v1.0 — MVP

**Shipped:** 2026-03-05
**Phases:** 4 | **Plans:** 13 | **Timeline:** 3 days (2026-03-02 → 2026-03-05)

### What Was Built
- Physics-based swipe engine: 3-card DOM, 1:1 gesture tracking bypassing React reconciler, spring physics on release
- ENV-driven Normaliser with DummyJSON adapter — affiliate URLs baked in server-side at ingestion time
- Full auth flow: Clerk email/password + OAuth scaffolding, Convex user sync, session persistence
- Wishlist page: product grid, bottom-sheet detail, affiliate redirect, BottomNav shared between routes
- Automated data health: daily cron at 03:00 UTC, count-based per-user compaction (keep last 10 swipes)
- TDD discipline maintained: Wave 0 RED → GREEN pattern used consistently for Normaliser, swipes, wishlists, and compaction

### What Worked
- **TDD Wave 0 discipline**: Writing failing tests first in every phase gave high confidence and caught contract mismatches early (especially in compaction logic)
- **Separate swipes/wishlists tables from the start**: Made Phase 4 compaction trivially safe — no risk of touching wishlist records
- **ENV-based multi-store config**: The STORE_*_ENABLED pattern made the Normaliser genuinely API-agnostic; DummyJSON plugged in without any core changes
- **Bypassing React reconciler for gestures**: The refs + DOM transforms approach was the right call — React state mutations during drag produce frame drops; this pattern should be carried forward for any drag UI
- **Parallel plan execution**: Wave-based parallelization kept execution fast across all phases
- **Convex internalMutations for compaction**: Using internal (not public) mutations for the cron job prevented accidental external calls

### What Was Inefficient
- **ROADMAP.md plan checkboxes went stale**: Individual plan checkboxes in ROADMAP.md were not updated as plans completed — required a retroactive cleanup at milestone completion. Should be updated atomically with SUMMARY.md creation.
- **No milestone audit**: Completed without running `/gsd:audit-milestone` first — a cross-phase integration check was skipped. For v1.1, run audit before completing.
- **Phase 4 compaction strategy pivot**: The strategy changed from time-based left-swipe deletion to count-based per-user retention mid-phase. This was the right call but required revising the research and plan. Earlier discussion of compaction semantics would have avoided the pivot.
- **accomplishments not captured in MILESTONES.md automatically**: The gsd-tools CLI didn't extract one-liners from SUMMARY.md files (field returned empty). Required manual extraction. This may be a summary format issue.

### Patterns Established
- **useSprings with fixed SPRING_COUNT=20**: React hooks cannot have dynamic counts — pre-allocate enough springs and address by absolute queue index
- **topIndex + gone useRef (not useState)**: No React state mutations during drag; imperative `api.start()` calls only
- **Wave 0 = behavioral contract**: First plan in every phase writes RED tests that define what the next plan must implement
- **Separate tables = separate concerns**: Swipes = ephemeral undo buffer. Wishlists = permanent record. Never mix compaction targets.
- **Paginated cron mutations**: Process 50 users/batch to avoid Convex mutation timeout limits

### Key Lessons
1. **Draw the data model boundary before writing code**: The swipes/wishlists separation was decided at roadmap time and paid dividends at every subsequent phase. Architectural clarity early > refactoring later.
2. **Gesture handlers must bypass the React reconciler**: Any drag UI that needs 1:1 tracking must use refs + direct DOM transforms. `useSprings` with imperative `api.start()` is the pattern.
3. **Compaction semantics matter**: "Delete old swipes" is ambiguous — does it delete by age or by count? Define the retention model explicitly (count-based per-user) before implementation.
4. **Run an audit before completing a milestone**: Cross-phase integration checks catch things unit tests miss. Make `/gsd:audit-milestone` a mandatory gate for v1.1.

### Cost Observations
- Model mix: ~100% sonnet (balanced profile)
- Sessions: ~8-10 sessions across 3 days
- Notable: Parallel wave execution significantly reduced wall-clock time per phase; TDD discipline reduced rework

---

## Cross-Milestone Trends

### Process Evolution

| Milestone | Phases | Plans | Key Change |
|-----------|--------|-------|------------|
| v1.0 MVP | 4 | 13 | Established: TDD Wave 0, parallel waves, separate tables pattern |

### Cumulative Quality

| Milestone | Tests | Pattern |
|-----------|-------|---------|
| v1.0 | Unit tests for Normaliser, swipes, wishlists, compaction | RED → GREEN Wave 0 per phase |

### Top Lessons (Verified Across Milestones)

1. Separate data concerns at the schema level before implementation — architectural clarity compounds across phases
2. Gesture handlers must bypass React reconciler — this is non-negotiable for 60fps drag UX
