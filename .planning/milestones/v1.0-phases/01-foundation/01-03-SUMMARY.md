---
phase: 01-foundation
plan: 03
subsystem: api
tags: [convex, normaliser, dummyjson, affiliate-urls, tdd, jest, typescript]

# Dependency graph
requires:
  - phase: 01-01
    provides: Convex schema (products table with affiliateUrl field), Jest test infrastructure, TDD RED stubs in convex/normaliser/__tests__/

provides:
  - StoreConfig and ProductCard TypeScript interfaces (convex/normaliser/adapters/types.ts)
  - DummyJSON adapter: fetchProducts + normalize with affiliate URL construction (convex/normaliser/adapters/dummyjson.ts)
  - ENV-driven store config loader: loadStoreConfigs() silently skips disabled stores (convex/normaliser/config.ts)
  - ingestAllStores Convex Action: orchestrates fetch + normalize + per-product upsert (convex/normaliser/actions.ts)
  - upsertProduct internalMutation: deduplicates by source index, writes to products table (convex/products.ts)
  - HTTP router with POST /normalise endpoint to trigger ingestion (convex/http.ts)

affects:
  - 02-swipe-engine (reads from products table populated by this Normaliser)
  - 03-wishlist (affiliateUrl field in productSnapshot snapshots written by this Normaliser)
  - 04-data-health (products table structure this created)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Convex Action (not Mutation) for external fetch — only Actions can call fetch()"
    - "Per-product mutation pattern — one ctx.runMutation per product, never bulk, for Convex 1s budget compliance"
    - "affiliateUrl as sole URL field — no rawUrl/productUrl/storeUrl ever stored"
    - "Price as integer cents (priceAmount) — float->cents via Math.round(price*100)"
    - "ENV config pattern: STORE_{NAME}_ENABLED=true|false — stores with missing/false silently skipped"
    - "TDD RED->GREEN: stubs written in Plan 01, turned GREEN in Plan 03"

key-files:
  created:
    - convex/normaliser/adapters/types.ts
    - convex/normaliser/adapters/dummyjson.ts
    - convex/normaliser/config.ts
    - convex/normaliser/actions.ts
    - convex/products.ts
    - convex/http.ts
  modified: []

key-decisions:
  - "affiliateUrl is the ONLY URL field on ProductCard and products table — enforced structurally, not by convention"
  - "Per-product runMutation pattern chosen over bulk to stay within Convex 1-second mutation budget"
  - "loadStoreConfigs() silently skips missing/false ENABLED flags — no errors, no warnings — enables safe ENV deployment"
  - "DummyJSON v1 has no affiliate program — affiliateId left empty in Convex dashboard, plain product URL stored"

patterns-established:
  - "Adapter pattern: each store adapter exports { fetchProducts, normalize } — adding a store = one new adapter + one ENV block"
  - "Null return from normalize() signals invalid/malformed product — silently skipped by Action loop"
  - "HTTP trigger endpoint at POST /normalise — enables manual ingestion without Convex dashboard access"

requirements-completed: [NORM-01, NORM-02, NORM-03, NORM-04]

# Metrics
duration: 2min
completed: 2026-03-04
---

# Phase 1 Plan 03: Normaliser Summary

**DummyJSON-to-Convex Normaliser with affiliate URL construction, ENV-gated multi-store config, and per-product upsert Action — all 10 TDD unit tests green**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-04T09:08:13Z
- **Completed:** 2026-03-04T09:10:00Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments
- StoreConfig/ProductCard types establish the shared contract between all Normaliser components and Phase 2's swipe engine
- DummyJSON adapter normalises float prices to integer cents and constructs affiliate URLs — affiliateUrl is the only URL field anywhere
- ENV config loader (`loadStoreConfigs`) reads STORE_*_ENABLED from process.env; silently skips stores where flag is missing or 'false'
- `ingestAllStores` Convex Action orchestrates fetch + normalize + per-product internalMutation loop
- `upsertProduct` internalMutation deduplicates against by_source index — idempotent re-runs
- HTTP endpoint POST /normalise enables manual trigger without Convex dashboard access
- All 10 TDD unit tests turned GREEN (3 in config.test.ts + 7 in dummyjson.adapter.test.ts)

## Task Commits

Each task was committed atomically:

1. **Task 1: Type contracts + DummyJSON adapter + ENV config loader** - `d342a6c` (feat)
2. **Task 2: Convex Action orchestrator + upsertProduct mutation + HTTP trigger endpoint** - `be2d13e` (feat)

**Plan metadata:** (docs commit follows)

_Note: Task 1 followed TDD RED->GREEN flow; tests were RED before implementation, GREEN after._

## Files Created/Modified
- `convex/normaliser/adapters/types.ts` - StoreConfig and ProductCard interfaces
- `convex/normaliser/adapters/dummyjson.ts` - DummyJSON adapter: fetchProducts + normalize with affiliate URL and price cents conversion
- `convex/normaliser/config.ts` - loadStoreConfigs(): reads STORE_*_ENABLED, silently skips missing/false
- `convex/normaliser/actions.ts` - ingestAllStores Convex Action: orchestrates per-store fetch + normalize + upsert loop
- `convex/products.ts` - upsertProduct internalMutation: deduplicates by by_source index, patches or inserts
- `convex/http.ts` - HTTP router with POST /normalise endpoint triggering ingestAllStores

## Decisions Made
- affiliateUrl is the ONLY URL field on ProductCard and the products table — enforced structurally by type and schema, not by convention
- Per-product `ctx.runMutation` pattern chosen to stay within Convex's 1-second mutation budget (not bulk)
- `loadStoreConfigs()` silently skips missing/false ENABLED flags — enables zero-error deployment without ENV vars set
- DummyJSON has no affiliate program in v1 — STORE_DUMMYJSON_AFFILIATE_ID left empty; plain product URL stored

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None. The `--testPathPattern` flag had changed to `--testPathPatterns` in the installed Jest version (minor CLI difference, not a code issue). Tests ran successfully with corrected flag.

## User Setup Required

**External services require manual configuration before running `npx convex run normaliser/actions:ingestAllStores`.**

Set the following in Convex Dashboard -> Settings -> Environment Variables:

| Variable | Value |
|---|---|
| `STORE_DUMMYJSON_ENABLED` | `true` |
| `STORE_DUMMYJSON_API_BASE` | `https://dummyjson.com` |
| `STORE_DUMMYJSON_AFFILIATE_ID` | _(leave empty — no affiliate program in v1)_ |
| `STORE_DUMMYJSON_ADAPTER` | `dummyjson` |

After setting ENV vars, trigger ingestion:
```bash
npx convex run normaliser/actions:ingestAllStores
```

Then verify in Convex dashboard -> Data -> products table: records should appear with `affiliateUrl` field.

## Next Phase Readiness
- Products table will be populated once Convex ENV vars are set and `ingestAllStores` is run
- Phase 2 (Swipe Engine) can read from products table using the by_store and by_source indexes
- affiliateUrl in ProductCard matches the productSnapshot shape in swipes/wishlists tables — snapshots in Phase 2 write correctly
- Adapter pattern is extensible — adding a new store = new adapter file + STORE_{NAME}_* ENV block, zero code changes to actions.ts

---
*Phase: 01-foundation*
*Completed: 2026-03-04*

## Self-Check: PASSED

All files present and all commits verified:
- convex/normaliser/adapters/types.ts: FOUND
- convex/normaliser/adapters/dummyjson.ts: FOUND
- convex/normaliser/config.ts: FOUND
- convex/normaliser/actions.ts: FOUND
- convex/products.ts: FOUND
- convex/http.ts: FOUND
- .planning/phases/01-foundation/01-03-SUMMARY.md: FOUND
- Commit d342a6c: FOUND
- Commit be2d13e: FOUND
