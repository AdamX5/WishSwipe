---
phase: 4
slug: data-health
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-05
---

# Phase 4 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Jest 30 + ts-jest 29 |
| **Config file** | `jest.config.ts` (exists) |
| **Quick run command** | `npm test -- --testPathPattern=compaction` |
| **Full suite command** | `npm test` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm test -- --testPathPattern=compaction`
- **After every plan wave:** Run `npm test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** ~5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 4-01-01 | 01 | 0 | GHOST-03 | unit | `npm test -- --testPathPattern=compaction` | ❌ W0 | ⬜ pending |
| 4-01-02 | 01 | 1 | GHOST-03 | unit | `npm test -- --testPathPattern=compaction` | ❌ W0 | ⬜ pending |
| 4-01-03 | 01 | 1 | GHOST-03 | unit | `npm test -- --testPathPattern=compaction` | ❌ W0 | ⬜ pending |
| 4-01-04 | 01 | 1 | GHOST-03 | unit | `npm test -- --testPathPattern=compaction` | ❌ W0 | ⬜ pending |
| 4-01-05 | 01 | 2 | GHOST-03 | manual | n/a — requires live Convex deployment | n/a | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `convex/normaliser/__tests__/compaction.test.ts` — stubs for GHOST-03 pure filter logic (`isCompactable`, `filterCompactable`)

*Framework already exists — Jest, ts-jest, and jest.config.ts all present. No framework install needed.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Cron job visible in Convex dashboard after deploy | GHOST-03 | Convex scheduled functions require live deployment — not testable with Jest | Run `npx convex deploy`, open Convex dashboard → Scheduled Jobs, verify `compact-old-left-swipes` appears |
| Paginated delete runs without mutation timeout | GHOST-03 | Requires actual DB records and live Convex runtime | Seed old left-swipe records via `npx convex run`, then trigger `npx convex run compaction:compactLeftSwipes` and verify completion in dashboard logs |
| Wishlist records unaffected after compaction run | GHOST-03 | Requires live Convex deployment with actual data | Verify wishlist items remain retrievable after running compaction on a dev deployment with seeded data |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 10s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
