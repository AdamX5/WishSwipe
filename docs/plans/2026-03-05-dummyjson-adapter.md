# DummyJSON Adapter Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a DummyJSON adapter to the normaliser pipeline so fake products populate the card queue for end-to-end testing without real store credentials.

**Architecture:** Three small changes to the existing normaliser pipeline — register `'dummyjson'` in the known stores list, create the adapter following the established pattern (`fetchProducts` + `normalize`), and wire it into the `ADAPTERS` map. No schema changes. No new Convex functions.

**Tech Stack:** TypeScript, Convex Actions, DummyJSON public API (`dummyjson.com/products`, no auth)

---

## DummyJSON API Shape

`GET https://dummyjson.com/products?limit=30` returns:

```json
{
  "products": [
    {
      "id": 1,
      "title": "Essence Mascara Lash Princess",
      "description": "Popular mascara known for its stunning volume.",
      "category": "beauty",
      "price": 9.99,
      "rating": 4.94,
      "availabilityStatus": "Low Stock",
      "images": ["https://cdn.dummyjson.com/products/images/beauty/.../1.webp"],
      "thumbnail": "https://cdn.dummyjson.com/products/images/beauty/.../thumbnail.webp"
    }
  ]
}
```

Field mapping:
- `id` → `sourceId` (stringified)
- `title` → `title`
- `description` → `description`
- `price` (USD float) → `priceAmount` (`Math.round(price * 100)`)
- `rating` (0–5) → `starRating`
- `images[0]` → `imageUrl` (fall back to `thumbnail` if `images` empty)
- `category` → `category`
- `availabilityStatus !== "Out of Stock"` → `isActive`
- `affiliateUrl`: `https://dummyjson.com/products/{id}?ref={affiliateId}` (no affiliateId → omit `?ref=`)

---

## Task 1: Write failing tests for the normalize function

**Files:**
- Create: `convex/normaliser/__tests__/dummyjson.adapter.test.ts`

**Step 1: Create the test file**

```typescript
import { dummyjsonAdapter } from '../adapters/dummyjson'
import type { StoreConfig } from '../adapters/types'

const mockConfig: StoreConfig = {
  id: 'dummyjson',
  apiBase: 'https://dummyjson.com',
  apiKey: '',
  affiliateId: '',
  adapter: 'dummyjson',
}

const mockProduct = {
  id: 1,
  title: 'Essence Mascara Lash Princess',
  description: 'Popular mascara known for volume.',
  category: 'beauty',
  price: 9.99,
  rating: 4.94,
  availabilityStatus: 'Low Stock',
  images: ['https://cdn.dummyjson.com/products/images/beauty/1.webp'],
  thumbnail: 'https://cdn.dummyjson.com/products/images/beauty/thumbnail.webp',
}

describe('dummyjsonAdapter.normalize', () => {
  it('converts float price to integer cents', () => {
    const result = dummyjsonAdapter.normalize(mockProduct, mockConfig)
    expect(result?.priceAmount).toBe(999)
  })

  it('sets sourceStore to dummyjson', () => {
    const result = dummyjsonAdapter.normalize(mockProduct, mockConfig)
    expect(result?.sourceStore).toBe('dummyjson')
  })

  it('sets sourceId from id', () => {
    const result = dummyjsonAdapter.normalize(mockProduct, mockConfig)
    expect(result?.sourceId).toBe('1')
  })

  it('uses first image as imageUrl', () => {
    const result = dummyjsonAdapter.normalize(mockProduct, mockConfig)
    expect(result?.imageUrl).toBe('https://cdn.dummyjson.com/products/images/beauty/1.webp')
  })

  it('falls back to thumbnail when images array is empty', () => {
    const product = { ...mockProduct, images: [] }
    const result = dummyjsonAdapter.normalize(product, mockConfig)
    expect(result?.imageUrl).toBe(mockProduct.thumbnail)
  })

  it('sets rating as starRating', () => {
    const result = dummyjsonAdapter.normalize(mockProduct, mockConfig)
    expect(result?.starRating).toBe(4.94)
  })

  it('builds affiliateUrl without ref when affiliateId is empty', () => {
    const result = dummyjsonAdapter.normalize(mockProduct, mockConfig)
    expect(result?.affiliateUrl).toBe('https://dummyjson.com/products/1')
  })

  it('appends ref param when affiliateId is set', () => {
    const config = { ...mockConfig, affiliateId: 'wishswipe' }
    const result = dummyjsonAdapter.normalize(mockProduct, config)
    expect(result?.affiliateUrl).toBe('https://dummyjson.com/products/1?ref=wishswipe')
  })

  it('isActive true when availabilityStatus is Low Stock', () => {
    const result = dummyjsonAdapter.normalize(mockProduct, mockConfig)
    expect(result?.isActive).toBe(true)
  })

  it('isActive false when availabilityStatus is Out of Stock', () => {
    const product = { ...mockProduct, availabilityStatus: 'Out of Stock' }
    const result = dummyjsonAdapter.normalize(product, mockConfig)
    expect(result?.isActive).toBe(false)
  })

  it('returns null when price is 0', () => {
    const product = { ...mockProduct, price: 0 }
    const result = dummyjsonAdapter.normalize(product, mockConfig)
    expect(result).toBeNull()
  })

  it('returns null when title is missing', () => {
    const product = { ...mockProduct, title: '' }
    const result = dummyjsonAdapter.normalize(product, mockConfig)
    expect(result).toBeNull()
  })

  it('returns null when both images and thumbnail are missing', () => {
    const product = { ...mockProduct, images: [], thumbnail: '' }
    const result = dummyjsonAdapter.normalize(product, mockConfig)
    expect(result).toBeNull()
  })

  it('sets priceCurrency to USD', () => {
    const result = dummyjsonAdapter.normalize(mockProduct, mockConfig)
    expect(result?.priceCurrency).toBe('USD')
  })
})
```

**Step 2: Run tests to confirm they fail**

```bash
npm test -- --testPathPattern=dummyjson
```

Expected: FAIL — `Cannot find module '../adapters/dummyjson'`

**Step 3: Commit the failing tests**

```bash
git add convex/normaliser/__tests__/dummyjson.adapter.test.ts
git commit -m "test(dummyjson): add failing adapter normalize tests"
```

---

## Task 2: Implement the dummyjson adapter

**Files:**
- Create: `convex/normaliser/adapters/dummyjson.ts`

**Step 1: Create the adapter**

```typescript
import type { StoreConfig, ProductCard } from './types'

interface DummyJsonProduct {
  id: number
  title: string
  description: string
  category: string
  price: number
  rating: number
  availabilityStatus: string
  images: string[]
  thumbnail: string
}

interface DummyJsonResponse {
  products: DummyJsonProduct[]
  total: number
}

export const dummyjsonAdapter = {
  async fetchProducts(config: StoreConfig): Promise<DummyJsonProduct[]> {
    const url = `${config.apiBase}/products?limit=30`
    const res = await fetch(url)
    if (!res.ok) throw new Error(`DummyJSON fetch failed: ${res.status}`)
    const data: DummyJsonResponse = await res.json()
    return data.products
  },

  normalize(raw: DummyJsonProduct, config: StoreConfig): ProductCard | null {
    if (!raw.title || !raw.price) return null

    const imageUrl = raw.images[0] || raw.thumbnail
    if (!imageUrl) return null

    const priceAmount = Math.round(raw.price * 100)
    if (priceAmount <= 0) return null

    const base = `${config.apiBase}/products/${raw.id}`
    const affiliateUrl = config.affiliateId ? `${base}?ref=${config.affiliateId}` : base

    return {
      sourceStore: 'dummyjson',
      sourceId: String(raw.id),
      title: raw.title,
      description: raw.description,
      imageUrl,
      priceAmount,
      priceCurrency: 'USD',
      starRating: raw.rating,
      affiliateUrl,
      category: raw.category,
      normalizedAt: Date.now(),
      isActive: raw.availabilityStatus !== 'Out of Stock',
    }
  },
}
```

**Step 2: Run tests to confirm they pass**

```bash
npm test -- --testPathPattern=dummyjson
```

Expected: PASS — 14 tests passing

**Step 3: Run the full test suite to confirm no regressions**

```bash
npm test
```

Expected: all tests pass

**Step 4: Commit**

```bash
git add convex/normaliser/adapters/dummyjson.ts
git commit -m "feat(dummyjson): implement adapter with fetchProducts and normalize"
```

---

## Task 3: Register the adapter in config and actions

**Files:**
- Modify: `convex/normaliser/config.ts`
- Modify: `convex/normaliser/actions.ts`

**Step 1: Add `'dummyjson'` to KNOWN_STORES in config.ts**

In `convex/normaliser/config.ts`, change:

```typescript
const KNOWN_STORES = ['etsy', 'bestbuy', 'amazon', 'ebay', 'aliexpress'] as const
```

to:

```typescript
const KNOWN_STORES = ['etsy', 'bestbuy', 'amazon', 'ebay', 'aliexpress', 'dummyjson'] as const
```

**Step 2: Register the adapter in actions.ts**

In `convex/normaliser/actions.ts`, add the import:

```typescript
import { dummyjsonAdapter } from './adapters/dummyjson'
```

Then add to the `ADAPTERS` map:

```typescript
const ADAPTERS = {
  etsy: etsyAdapter,
  bestbuy: bestbuyAdapter,
  amazon: amazonAdapter,
  ebay: ebayAdapter,
  aliexpress: aliexpressAdapter,
  dummyjson: dummyjsonAdapter,
} as const
```

**Step 3: Run full test suite**

```bash
npm test
```

Expected: all tests pass (config and actions have no unit tests to break)

**Step 4: Commit**

```bash
git add convex/normaliser/config.ts convex/normaliser/actions.ts
git commit -m "feat(dummyjson): register adapter in normaliser pipeline"
```

---

## Activation After Implementation

Once the code is merged, populate the products table:

```bash
npx convex env set STORE_DUMMYJSON_ENABLED true
npx convex env set STORE_DUMMYJSON_API_BASE https://dummyjson.com
npx convex run normaliser/actions:ingestAllStores
```

Then start the dev server and verify products appear on the swipe screen:

```bash
npx convex dev   # terminal 1
npm run dev      # terminal 2
```

Navigate to `/swipe` — cards should appear immediately.
