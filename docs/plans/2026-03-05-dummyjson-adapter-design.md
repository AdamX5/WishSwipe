# DummyJSON Adapter Design

**Date:** 2026-03-05
**Goal:** Populate the `products` table with fake products for end-to-end testing of the swipe and wishlist flows, without requiring real store API credentials.

## Approach

Add a DummyJSON adapter to the existing normaliser pipeline. DummyJSON (`dummyjson.com/products`) is a free, no-auth API returning 30 realistic products with titles, prices, ratings, images, and categories.

## Files Changed

| File | Change |
|------|--------|
| `convex/normaliser/config.ts` | Add `'dummyjson'` to `KNOWN_STORES` |
| `convex/normaliser/adapters/dummyjson.ts` | New adapter (fetch + normalize) |
| `convex/normaliser/actions.ts` | Register `dummyjsonAdapter` in `ADAPTERS` map |

## Adapter Mapping

| DummyJSON field | ProductCard field | Notes |
|-----------------|-------------------|-------|
| `id` | `sourceId` | Stringified |
| `title` | `title` | Direct |
| `description` | `description` | Direct |
| `price` (USD float) | `priceAmount` | `Math.round(price * 100)` |
| `"USD"` | `priceCurrency` | Hardcoded |
| `rating` | `starRating` | 0–5, direct |
| `images[0]` | `imageUrl` | Fallback to `thumbnail` |
| `category` | `category` | Direct |
| `{apiBase}/products/{id}?ref={affiliateId}` | `affiliateUrl` | Fake but functional |

## Activation

```
npx convex env set STORE_DUMMYJSON_ENABLED true
npx convex env set STORE_DUMMYJSON_API_BASE https://dummyjson.com
npx convex run normaliser/actions:ingestAllStores
```

No `apiKey` or `affiliateId` required. Products appear in the card queue immediately after ingest.
