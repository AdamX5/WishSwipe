// Tests for convex/normaliser/adapters/dummyjson.ts
// Covers NORM-01: correct ProductCard shape
// Covers NORM-03: affiliate URL contains no raw store URL format; only affiliateUrl field

import { dummyjsonAdapter } from '../adapters/dummyjson'
import type { StoreConfig } from '../adapters/types'

const baseConfig: StoreConfig = {
  id: 'dummyjson',
  apiBase: 'https://dummyjson.com',
  apiKey: '',
  affiliateId: 'my-tag',
  adapter: 'dummyjson',
}

const validRaw = {
  id: 1,
  title: 'Test Product',
  description: 'A test product',
  price: 9.99,
  rating: 4.5,
  thumbnail: 'https://dummyjson.com/image/1',
  category: 'electronics',
  stock: 10,
}

describe('dummyjsonAdapter.normalize', () => {
  it('returns a ProductCard with affiliateUrl field (NORM-01, NORM-03)', () => {
    const result = dummyjsonAdapter.normalize(validRaw, baseConfig)
    expect(result).not.toBeNull()
    expect(result).toHaveProperty('affiliateUrl')
    expect(result).not.toHaveProperty('rawUrl')
    expect(result).not.toHaveProperty('productUrl')
    expect(result).not.toHaveProperty('storeUrl')
  })

  it('returns null when title is missing (NORM-01 validation)', () => {
    const raw = { ...validRaw, title: '' }
    expect(dummyjsonAdapter.normalize(raw, baseConfig)).toBeNull()
  })

  it('returns null when price is zero or negative', () => {
    const raw = { ...validRaw, price: 0 }
    expect(dummyjsonAdapter.normalize(raw, baseConfig)).toBeNull()
  })

  it('converts float price to integer cents (e.g. 9.99 -> 999)', () => {
    const result = dummyjsonAdapter.normalize(validRaw, baseConfig)
    expect(result!.priceAmount).toBe(999)
  })

  it('appends ?tag={affiliateId} when affiliateId is non-empty (NORM-03)', () => {
    const result = dummyjsonAdapter.normalize(validRaw, baseConfig)
    expect(result!.affiliateUrl).toContain('?tag=my-tag')
  })

  it('returns plain product URL when affiliateId is empty (NORM-03 passthrough)', () => {
    const config = { ...baseConfig, affiliateId: '' }
    const result = dummyjsonAdapter.normalize(validRaw, config)
    expect(result!.affiliateUrl).not.toContain('?tag=')
    expect(result!.affiliateUrl).toContain('/products/1')
  })

  it('returns all required ProductCard fields (NORM-01)', () => {
    const result = dummyjsonAdapter.normalize(validRaw, baseConfig)
    expect(result).toMatchObject({
      sourceStore: 'dummyjson',
      sourceId: '1',
      title: 'Test Product',
      imageUrl: 'https://dummyjson.com/image/1',
      priceCurrency: 'USD',
      starRating: 4.5,
    })
  })
})
