---
phase: 3
slug: wishlist
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-04
---

# Phase 3 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Jest 30 + ts-jest 29 |
| **Config file** | `jest.config.ts` (project root) |
| **Quick run command** | `npm test` |
| **Full suite command** | `npm test` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm test`
- **After every plan wave:** Run `npm test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** ~5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 3-01-01 | 01 | 0 | WISH-01 | unit | `npm test -- --testPathPattern=wishlists` | ❌ W0 | ⬜ pending |
| 3-01-02 | 01 | 0 | WISH-01 | unit | `npm test -- --testPathPattern=wishlists` | ❌ W0 | ⬜ pending |
| 3-01-03 | 01 | 0 | WISH-02 | unit | `npm test -- --testPathPattern=wishlists` | ❌ W0 | ⬜ pending |
| 3-02-01 | 02 | 1 | WISH-01 | unit | `npm test` | ✅ (after W0) | ⬜ pending |
| 3-02-02 | 02 | 1 | WISH-01 | manual | Open wishlist page, verify grid renders | — | ⬜ pending |
| 3-02-03 | 02 | 1 | WISH-02 | manual | Tap card, verify bottom sheet opens | — | ⬜ pending |
| 3-02-04 | 02 | 1 | WISH-02 | manual | Tap "Visit Store", verify affiliate URL opens in new tab | — | ⬜ pending |
| 3-02-05 | 02 | 1 | WISH-02 | manual | Tap "Remove", verify item disappears without reload | — | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `convex/normaliser/__tests__/wishlists.test.ts` — stubs for WISH-01 (`getWishlist` filter logic) and WISH-02 (`removeFromWishlist` ownership check as pure functions)

*All automated tests live in `convex/normaliser/__tests__/` following the established pattern from `swipes.test.ts` and `cardQueue.test.ts`.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Wishlist grid renders saved products | WISH-01 | UI rendering, Convex real-time subscription | Sign in, swipe right on items, navigate to `/wishlist`, verify products appear |
| Bottom sheet opens on card tap | WISH-01 | UI interaction | Tap any wishlist card, verify sheet slides up with product detail |
| "Visit Store" opens affiliate URL in new tab | WISH-02 | Browser tab behavior, affiliate URL enforcement | Tap "Visit Store", verify new tab opens to affiliate URL (not raw store URL) |
| Remove item: instant disappear, no confirm | WISH-02 | UI reactivity, no page reload | Tap "Remove" in sheet, verify item gone from grid immediately |
| Empty state shown when no wishlisted items | WISH-01 | UI state | View wishlist with no saved items, verify "Nothing saved yet" + "Start swiping" link |
| Bottom nav active tab highlights correctly | WISH-01 | UI navigation state | Navigate between `/swipe` and `/wishlist`, verify correct tab is active |
| Unauthenticated access redirects to sign-in | WISH-01 | Auth guard | Navigate to `/wishlist` while signed out, verify redirect to `/sign-in` |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 10s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
