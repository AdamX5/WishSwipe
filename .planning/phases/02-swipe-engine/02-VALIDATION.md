---
phase: 2
slug: swipe-engine
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-04
---

# Phase 2 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Jest 30 + ts-jest 29 |
| **Config file** | `jest.config.ts` (exists) |
| **Quick run command** | `npm test` |
| **Full suite command** | `npm test` |
| **Estimated runtime** | ~10 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm test`
- **After every plan wave:** Run `npm test` + manual visual verification on mobile viewport
- **Before `/gsd:verify-work`:** Full suite green + all 5 success criteria verified manually
- **Max feedback latency:** ~10 seconds (unit tests); manual checks per wave

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 2-W0-01 | W0 | 0 | GHOST-01 | unit | `npm test -- --testPathPattern=swipes` | ❌ W0 | ⬜ pending |
| 2-W0-02 | W0 | 0 | GHOST-02 | unit | `npm test -- --testPathPattern=cardQueue` | ❌ W0 | ⬜ pending |
| SWIPE-01 | TBD | 1 | SWIPE-01 | manual | — visual inspection | N/A | ⬜ pending |
| SWIPE-02 | TBD | 1 | SWIPE-02 | manual | — human feel test | N/A | ⬜ pending |
| SWIPE-03 | TBD | 1 | SWIPE-03 | manual | — human feel test | N/A | ⬜ pending |
| SWIPE-04 | TBD | 1 | SWIPE-04 | manual | — Convex dashboard inspection | N/A | ⬜ pending |
| SWIPE-05 | TBD | 2 | SWIPE-05 | manual | — Convex dashboard + deck visual | N/A | ⬜ pending |
| UX-01 | TBD | 2 | UX-01 | manual | — requires physical device | N/A | ⬜ pending |
| UX-02 | TBD | 2 | UX-02 | manual | — visual inspection | N/A | ⬜ pending |
| UX-03 | TBD | 1 | UX-03 | manual | — visual inspection during drag | N/A | ⬜ pending |
| GHOST-01 | TBD | 1 | GHOST-01 | unit | `npm test -- --testPathPattern=swipes` | ❌ W0 | ⬜ pending |
| GHOST-02 | TBD | 1 | GHOST-02 | unit | `npm test -- --testPathPattern=cardQueue` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `convex/normaliser/__tests__/swipes.test.ts` — stubs for GHOST-01 (snapshot shape validation)
- [ ] `convex/normaliser/__tests__/cardQueue.test.ts` — stubs for GHOST-02 (filter/exclusion logic)

*Framework install: not needed — Jest + ts-jest already installed.*

**Note:** Convex mutation/query logic cannot be fully unit-tested with Jest without mocking the Convex context. Tests should validate the shape of mutation args, return value types, and pure filter helper functions — not the database call internals.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| 3 cards in DOM at all times | SWIPE-01 | DOM structure; no React Testing Library for canvas-like stacking | Open `/swipe`, DevTools → Elements, count animated cards |
| 1:1 tracking, no lag | SWIPE-02 | Subjective feel; latency measurement requires device | Drag card slowly on mobile — card must follow finger with no perceivable lag |
| Fling-out vs snap-back | SWIPE-03 | Physics sensation; no automated timing test | Quick flick = card flies; slow drag below threshold = snaps back |
| Right=wishlist, Left=skip | SWIPE-04 | Convex write verification | Swipe right → check Convex dashboard for wishlists + swipes entries |
| Undo reverts both records + deck | SWIPE-05 | Convex + visual state | Swipe right → undo → confirm card re-appears AND wishlist entry deleted |
| Haptic on right-swipe | UX-01 | Requires physical Android device | Right-swipe on Android Chrome → feel 50ms vibration |
| Glow animation on save | UX-02 | Visual animation; no timing assertion | Right-swipe → observe green glow ring on card for ~600ms |
| Tint + icon overlay during drag | UX-03 | Continuous spring-driven visual | Drag right → green tint + heart; drag left → red tint + X |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
