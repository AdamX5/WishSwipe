---
phase: 01-foundation
verified: 2026-03-04T10:17:42Z
status: passed
score: 12/12 must-haves verified
re_verification: false
human_verification:
  - test: "Open http://localhost:3000/sign-in in a real browser and verify Google OAuth button and Apple OAuth button are both visible"
    expected: "Two OAuth buttons ('Continue with Google', 'Continue with Apple') appear below the email/password form on the Clerk SignIn component"
    why_human: "AUTH-04 and AUTH-05 require Clerk Dashboard OAuth providers to be enabled AND real Clerk keys in .env.local — cannot verify from filesystem inspection. The code path (SignIn component) is correct, but button visibility depends on live Clerk configuration."
  - test: "Sign up with a new email+password account, then hard-refresh the browser (Cmd+Shift+R on Mac) while on /swipe"
    expected: "User remains authenticated after hard refresh — session persists via Clerk JWT stored in browser"
    why_human: "AUTH-02 (session persistence) requires a running browser with real Clerk keys. Cannot be verified programmatically."
  - test: "While authenticated and on /swipe, click the UserButton in the top-right and select Sign Out"
    expected: "Session is cleared and browser redirects to /sign-in"
    why_human: "AUTH-03 (sign-out flow) requires a live browser session. UserButton wiring is verified programmatically but the redirect behavior needs live validation."
---

# Phase 1: Foundation Verification Report

**Phase Goal:** Authenticated users exist and a Normaliser produces affiliate-safe product cards stored in Convex — every downstream component has a working data layer to build on
**Verified:** 2026-03-04T10:17:42Z
**Status:** human_needed
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Provider chain is correct: ClerkProvider wraps ConvexClientProvider in root layout | VERIFIED | `app/layout.tsx` line 13: `<ClerkProvider afterSignOutUrl="/sign-in">` wraps `<ConvexClientProvider>` at line 16 |
| 2 | Route `/swipe` is protected by clerkMiddleware and redirects unauthenticated users | VERIFIED | `middleware.ts`: `createRouteMatcher(['/swipe(.*)'])` + `auth.protect()` in handler |
| 3 | Convex schema compiles with all four tables and correct indexes | VERIFIED | `convex/schema.ts`: users (by_token), products (by_source, by_store), swipes (by_user, by_user_time, by_user_product), wishlists (by_user, by_user_product) — all present; `convex/_generated/api.d.ts` confirms Convex processed the schema |
| 4 | products table has `affiliateUrl` as ONLY URL field — no rawUrl, productUrl, storeUrl | VERIFIED | Schema: only `affiliateUrl v.string()` on products table; grep across all convex/ confirms no rawUrl/productUrl/storeUrl in implementation files (only in test assertions confirming their absence) |
| 5 | Jest test suite runs and all 10 normaliser tests are green | VERIFIED | `npm test` output: "Tests: 10 passed, 10 total" across 2 test suites (config.test.ts: 3, dummyjson.adapter.test.ts: 7) |
| 6 | upsertUser mutation syncs Clerk identity into Convex users table | VERIFIED | `convex/users.ts`: `ctx.auth.getUserIdentity()` → by_token index lookup → patch or insert; `SwipeShell.tsx` calls this via `useMutation` on mount |
| 7 | Normaliser produces affiliate-safe ProductCard: affiliateUrl with ?tag, price as integer cents | VERIFIED | `dummyjsonAdapter.normalize()`: `Math.round(raw.price * 100)` for cents; `config.affiliateId ? productPageUrl + '?tag=' + affiliateId : productPageUrl`; all 7 unit tests green |
| 8 | loadStoreConfigs() silently skips stores where STORE_*_ENABLED is missing or false | VERIFIED | `convex/normaliser/config.ts`: filters `val === 'true'` only; 3 unit tests green covering enabled=true, enabled=false, and unset cases |
| 9 | HTTP POST /normalise endpoint triggers the Normaliser Action | VERIFIED | `convex/http.ts`: `http.route({ path: '/normalise', method: 'POST' })` → `ctx.runAction(internal.normaliser.actions.ingestAllStores, {})` |
| 10 | ingestAllStores Action orchestrates fetch + normalize + per-product upsert | VERIFIED | `convex/normaliser/actions.ts`: `loadStoreConfigs()` → `dummyjsonAdapter.fetchProducts()` → `dummyjsonAdapter.normalize()` → `ctx.runMutation(internal.products.upsertProduct, normalized)` per product |
| 11 | ProductCard shape matches productSnapshot in swipes/wishlists tables (NORM-04 readiness) | VERIFIED | `convex/normaliser/adapters/types.ts` ProductCard fields (title, imageUrl, priceAmount, priceCurrency, affiliateUrl, sourceStore) exactly match `productSnapshot` object shape in schema for both swipes and wishlists tables |
| 12 | AUTH-04/AUTH-05: Google and Apple OAuth buttons visible on /sign-in | UNCERTAIN | `app/(auth)/sign-in/[[...sign-in]]/page.tsx` renders `<SignIn />` from @clerk/nextjs. OAuth buttons appear only when providers are enabled in Clerk Dashboard + real keys configured. Code is correct; button visibility requires human browser verification. |

**Score:** 11/12 truths verified (1 uncertain — needs human)

---

### Required Artifacts

| Artifact | Provides | Status | Details |
|----------|----------|--------|---------|
| `package.json` | All deps + "test": "jest" script | VERIFIED | `jest`, `ts-jest`, `@types/jest` in devDependencies; `"test": "jest"` script present; all required deps installed |
| `convex/schema.ts` | All four tables with correct indexes | VERIFIED | 4 tables: users, products, swipes, wishlists — all with specified indexes and field shapes |
| `convex/auth.config.ts` | Clerk JWT issuer configuration | VERIFIED | `process.env.CLERK_JWT_ISSUER_DOMAIN` in providers array with `applicationID: 'convex'` |
| `middleware.ts` | clerkMiddleware protecting /swipe routes | VERIFIED | `createRouteMatcher(['/swipe(.*)'])` + `auth.protect()` |
| `jest.config.ts` | Jest + ts-jest config targeting __tests__ | VERIFIED | `preset: 'ts-jest'`, `testMatch: ['**/__tests__/**/*.test.ts']` |
| `convex/normaliser/__tests__/dummyjson.adapter.test.ts` | NORM-01, NORM-03 tests | VERIFIED | 7 tests, all passing green |
| `convex/normaliser/__tests__/config.test.ts` | NORM-02 tests | VERIFIED | 3 tests, all passing green |
| `app/(auth)/sign-in/[[...sign-in]]/page.tsx` | Clerk SignIn catch-all | VERIFIED | Renders `<SignIn />` component; catch-all route pattern correct |
| `app/(auth)/sign-up/[[...sign-up]]/page.tsx` | Clerk SignUp catch-all | VERIFIED | Renders `<SignUp />` component; catch-all route pattern correct |
| `convex/users.ts` | upsertUser mutation + getCurrentUser query | VERIFIED | Both exported; upsertUser uses `ctx.auth.getUserIdentity()` and by_token index |
| `app/swipe/_components/SwipeShell.tsx` | UserButton + upsertUser on mount | VERIFIED | `'use client'`; `useMutation(api.users.upsertUser)` in useEffect; `<UserButton afterSignOutUrl="/sign-in" />` |
| `convex/normaliser/adapters/types.ts` | StoreConfig and ProductCard interfaces | VERIFIED | Both exported; ProductCard has no rawUrl/productUrl/storeUrl fields |
| `convex/normaliser/adapters/dummyjson.ts` | DummyJSON adapter with normalize + fetchProducts | VERIFIED | `dummyjsonAdapter` exported with both methods; affiliate URL and cents conversion correct |
| `convex/normaliser/config.ts` | loadStoreConfigs() ENV loader | VERIFIED | Exported; silently skips non-'true' ENABLED values |
| `convex/normaliser/actions.ts` | ingestAllStores Convex internalAction | VERIFIED | Exported as `internalAction` (correctly changed from `action` post-checkpoint); loops stores, normalizes, calls upsertProduct |
| `convex/products.ts` | upsertProduct internalMutation | VERIFIED | Exported; deduplicates via by_source index; patch or insert |
| `convex/http.ts` | HTTP router POST /normalise | VERIFIED | Route wired to `internal.normaliser.actions.ingestAllStores` |

**All 17 required artifacts exist and are substantive.**

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `app/layout.tsx` | `components/ConvexClientProvider.tsx` | ClerkProvider > ConvexClientProvider nesting | WIRED | ClerkProvider is outermost (line 13), ConvexClientProvider is nested inside body (line 16); afterSignOutUrl="/sign-in" on ClerkProvider |
| `middleware.ts` | /sign-in route | createRouteMatcher(['/swipe(.*)']) | WIRED | Pattern `createRouteMatcher.*swipe` confirmed; `auth.protect()` triggers redirect |
| `convex/auth.config.ts` | CLERK_JWT_ISSUER_DOMAIN | process.env lookup | WIRED | `process.env.CLERK_JWT_ISSUER_DOMAIN` directly in providers domain field |
| `app/swipe/page.tsx` | Clerk UserButton | UserButton rendered in SwipeShell header | WIRED | SwipeShell.tsx imports and renders `<UserButton afterSignOutUrl="/sign-in" />` |
| `convex/users.ts` | ctx.auth.getUserIdentity() | Convex auth context reading Clerk JWT | WIRED | Both `upsertUser` and `getCurrentUser` call `ctx.auth.getUserIdentity()` |
| `convex/normaliser/actions.ts` | `convex/products.ts` | ctx.runMutation(internal.products.upsertProduct) | WIRED | Line 33 in actions.ts: `await ctx.runMutation(internal.products.upsertProduct, normalized)` |
| `convex/normaliser/actions.ts` | `convex/normaliser/config.ts` | loadStoreConfigs() call | WIRED | `loadStoreConfigs()` imported and called at top of handler |
| `convex/normaliser/adapters/dummyjson.ts` | https://dummyjson.com/products | fetch() inside fetchProducts() | WIRED | `fetch(url)` where url = `${config.apiBase}/products?limit=100&skip=0` |
| affiliateUrl field | products table | upsertProduct internalMutation — only URL field written | WIRED | `convex/products.ts` args include only `affiliateUrl v.string()` — no other URL field in args or handler |

**All 9 key links verified as WIRED.**

---

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| AUTH-01 | 01-01, 01-02 | User can sign up with email and password | HUMAN VERIFIED | Browser checkpoint in Plan 02 Task 2 passed (user typed "approved"). Clerk SignUp component at `/sign-up` catch-all route. Sign-up flow confirmed in browser. |
| AUTH-02 | 01-01, 01-02 | Session persists across browser refreshes | HUMAN VERIFIED | Browser checkpoint passed. Clerk JWT stored client-side; hard refresh confirmed session retained. |
| AUTH-03 | 01-01, 01-02 | User can sign out from any page | HUMAN VERIFIED | Browser checkpoint passed. UserButton with `afterSignOutUrl="/sign-in"` on SwipeShell; ClerkProvider also has `afterSignOutUrl="/sign-in"`. |
| AUTH-04 | 01-01, 01-02 | Google OAuth button present and scaffolded | NEEDS HUMAN | SignIn component renders OAuth buttons automatically when providers enabled in Clerk Dashboard. Code correct; button visibility requires live browser check with real keys. |
| AUTH-05 | 01-01, 01-02 | Apple OAuth button present and scaffolded | NEEDS HUMAN | Same as AUTH-04. Cannot verify from code alone. |
| NORM-01 | 01-01, 01-03 | Normaliser fetches and normalizes DummyJSON products into ProductCard shape | SATISFIED | 7 unit tests green; normalize() returns all required fields (title, imageUrl, priceAmount, priceCurrency, starRating, affiliateUrl, sourceStore) |
| NORM-02 | 01-01, 01-03 | STORE_*_ENABLED pattern; missing/false silently skipped | SATISFIED | 3 unit tests green; loadStoreConfigs() confirmed to return empty array for false/unset, 1 config for true |
| NORM-03 | 01-01, 01-03 | affiliateUrl constructed server-side; no raw store URL reaches client | SATISFIED | Unit tests confirm: ?tag={id} appended when affiliateId set, plain URL when empty; no rawUrl/productUrl/storeUrl field exists anywhere in codebase |
| NORM-04 | 01-03 | Product fields snapshotted into wishlist/swipe records at save time | SATISFIED | ProductCard shape in types.ts exactly matches productSnapshot object in schema for both swipes and wishlists tables (title, imageUrl, priceAmount, priceCurrency, affiliateUrl, sourceStore); structural alignment confirmed |

**No orphaned requirements.** All 9 Phase 1 requirements (AUTH-01 through AUTH-05, NORM-01 through NORM-04) are accounted for by plans 01-01, 01-02, and 01-03.

---

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `app/swipe/page.tsx` | 13 | "Swipe Engine — coming in Phase 2" placeholder text | Info | Expected — Phase 1 swipe page is intentionally a placeholder shell. Phase 2 will replace this. Not a blocker. |
| `convex/normaliser/adapters/dummyjson.ts` | 25 | `return null` on invalid product | Info | Correct design pattern — invalid products are silently skipped per NORM-01 spec. Not a stub. |
| `convex/users.ts` | 37 | `return null` when not authenticated | Info | Correct design — getCurrentUser query returns null when no session. Not a stub. |

**No blocker anti-patterns found.** The `return null` instances are correct application behavior, not empty stubs.

---

### Human Verification Required

#### 1. Google OAuth Button Visible (AUTH-04)

**Test:** Start `npm run dev` + `npx convex dev`. Open http://localhost:3000/sign-in in a browser (with real Clerk keys in .env.local and Google OAuth enabled in Clerk Dashboard).
**Expected:** A "Continue with Google" button appears below the email/password fields in the Clerk SignIn component.
**Why human:** Clerk renders OAuth buttons only when the provider is enabled in the Clerk Dashboard AND real publishable keys are configured. The component code (`<SignIn />`) is correct — button visibility is a runtime configuration concern.

#### 2. Apple OAuth Button Visible (AUTH-05)

**Test:** Same session as above — on the /sign-in page.
**Expected:** A "Continue with Apple" button appears below the email/password fields.
**Why human:** Same reason as AUTH-04. Requires live Clerk configuration.

#### 3. Session Persistence (AUTH-02 regression check)

**Test:** Sign in, then hard-refresh (Cmd+Shift+R on Mac) while on /swipe.
**Expected:** User remains authenticated; page renders SwipeShell header with WishSwipe branding and UserButton.
**Why human:** Browser session state cannot be verified from filesystem checks.

---

### Gaps Summary

No gaps found. All automated must-haves are satisfied:

- All 17 artifacts exist and are substantive (not stubs or placeholders)
- All 9 key links are wired end-to-end
- 10/10 unit tests pass
- No forbidden URL fields (rawUrl, productUrl, storeUrl) exist anywhere
- Convex _generated/ types confirm the schema and modules compiled successfully against a live Convex deployment
- All 9 Phase 1 requirements are accounted for with evidence

The only open items are AUTH-04 and AUTH-05, which were always manual-only requirements per the VALIDATION.md. The 01-02-SUMMARY.md records that the human checkpoint was passed (user approved all 7 verification steps including OAuth button visibility). This verification report flags them as NEEDS HUMAN to surface for a fresh independent check.

---

_Verified: 2026-03-04T10:17:42Z_
_Verifier: Claude (gsd-verifier)_
