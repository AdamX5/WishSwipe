---
phase: 1
slug: foundation
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-03
---

# Phase 1 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Jest + ts-jest (none detected — greenfield project) |
| **Config file** | none — Wave 0 installs |
| **Quick run command** | `npx jest --testPathPattern=normaliser` |
| **Full suite command** | `npx jest` |
| **Estimated runtime** | ~5 seconds (unit tests only; AUTH tests are manual) |

---

## Sampling Rate

- **After every task commit:** Run `npx jest --testPathPattern=normaliser`
- **After every plan wave:** Run `npx jest`
- **Before `/gsd:verify-work`:** Full suite must be green + manual AUTH verification complete
- **Max feedback latency:** ~5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 1-??-NORM01 | normaliser | 1 | NORM-01 | unit | `npx jest --testPathPattern=dummyjson.adapter` | ❌ W0 | ⬜ pending |
| 1-??-NORM02 | normaliser | 1 | NORM-02 | unit | `npx jest --testPathPattern=config` | ❌ W0 | ⬜ pending |
| 1-??-NORM03 | normaliser | 1 | NORM-03 | unit | `npx jest --testPathPattern=dummyjson.adapter` | ❌ W0 | ⬜ pending |
| 1-??-NORM04 | normaliser | 1 | NORM-04 | integration | `npx convex run normaliser/actions:ingestAllStores` (verify in Convex dashboard) | ❌ W0 | ⬜ pending |
| 1-??-AUTH01 | auth | 1 | AUTH-01 | manual | n/a — browser test | n/a | ⬜ pending |
| 1-??-AUTH02 | auth | 1 | AUTH-02 | manual | n/a — browser session test | n/a | ⬜ pending |
| 1-??-AUTH03 | auth | 1 | AUTH-03 | manual | n/a — browser session test | n/a | ⬜ pending |
| 1-??-AUTH04 | auth | 1 | AUTH-04 | manual | n/a — visual check | n/a | ⬜ pending |
| 1-??-AUTH05 | auth | 1 | AUTH-05 | manual | n/a — visual check | n/a | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `jest.config.ts` — Jest + ts-jest configuration
- [ ] `package.json` test script: `"test": "jest"` (added during project setup)
- [ ] `convex/normaliser/__tests__/dummyjson.adapter.test.ts` — stubs for NORM-01, NORM-03
- [ ] `convex/normaliser/__tests__/config.test.ts` — stub for NORM-02
- [ ] Install: `npm install --save-dev jest ts-jest @types/jest`

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Sign-up form creates Clerk user | AUTH-01 | Clerk handles auth UI — testing Clerk's rendering is out of scope for WishSwipe unit tests | Open app, click Sign Up, enter email+password, verify account created in Clerk dashboard |
| Session persists after hard browser refresh | AUTH-02 | Requires real browser session state; not unit-testable | Sign in, press Cmd+Shift+R (hard refresh), verify still authenticated |
| Sign-out clears session | AUTH-03 | Browser session state test | Click user button > Sign out, verify redirect to /sign-in |
| Google OAuth button visually present | AUTH-04 | Visual verification; no headless browser in Phase 1 | Open /sign-in, verify "Continue with Google" button is visible |
| Apple OAuth button visually present | AUTH-05 | Visual verification | Open /sign-in, verify "Continue with Apple" button is visible |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 10s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
