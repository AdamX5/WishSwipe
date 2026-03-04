import { bestbuyAdapter } from '../adapters/bestbuy'
import type { StoreConfig } from '../adapters/types'

const mockConfig: StoreConfig = {
  id: 'bestbuy',
  apiBase: 'https://api.bestbuy.com/v1',
  apiKey: 'test-key',
  affiliateId: '',
  adapter: 'bestbuy',
}

const mockProduct = {
  sku: 6525063,
  name: 'Sony WH-1000XM5 Wireless Headphones',
  salePrice: 279.99,
  regularPrice: 349.99,
  image: 'https://pisces.bbystatic.com/image2/BestBuy_US/images/products/6525/6525063_sd.jpg',
  url: '/site/sony-wh-1000xm5/6525063.p',
  customerReviewAverage: 4.7,
  customerReviewCount: 2843,
  active: true,
  onlineAvailability: true,
  class: 'HEADPHONES',
}

describe('bestbuyAdapter.normalize', () => {
  it('converts salePrice float to integer cents', () => {
    const result = bestbuyAdapter.normalize(mockProduct, mockConfig)
    expect(result?.priceAmount).toBe(27999)
  })

  it('prepends bestbuy origin to relative url', () => {
    const result = bestbuyAdapter.normalize(mockProduct, mockConfig)
    expect(result?.affiliateUrl).toBe('https://www.bestbuy.com/site/sony-wh-1000xm5/6525063.p')
  })

  it('leaves absolute url as-is', () => {
    const product = { ...mockProduct, url: 'https://www.bestbuy.com/site/sony/6525063.p' }
    const result = bestbuyAdapter.normalize(product, mockConfig)
    expect(result?.affiliateUrl).toContain('https://www.bestbuy.com/site/sony')
  })

  it('appends ref param when affiliateId is set', () => {
    const config = { ...mockConfig, affiliateId: 'my-aff' }
    const result = bestbuyAdapter.normalize(mockProduct, config)
    expect(result?.affiliateUrl).toContain('ref=my-aff')
  })

  it('includes starRating when reviews exist', () => {
    const result = bestbuyAdapter.normalize(mockProduct, mockConfig)
    expect(result?.starRating).toBe(4.7)
  })

  it('omits starRating when customerReviewCount is 0', () => {
    const product = { ...mockProduct, customerReviewCount: 0 }
    const result = bestbuyAdapter.normalize(product, mockConfig)
    expect(result?.starRating).toBeUndefined()
  })

  it('returns null when not active', () => {
    const result = bestbuyAdapter.normalize({ ...mockProduct, active: false }, mockConfig)
    expect(result).toBeNull()
  })

  it('returns null when not available online', () => {
    const result = bestbuyAdapter.normalize({ ...mockProduct, onlineAvailability: false }, mockConfig)
    expect(result).toBeNull()
  })

  it('returns null when salePrice is 0', () => {
    const result = bestbuyAdapter.normalize({ ...mockProduct, salePrice: 0 }, mockConfig)
    expect(result).toBeNull()
  })

  it('sets sourceStore to bestbuy', () => {
    const result = bestbuyAdapter.normalize(mockProduct, mockConfig)
    expect(result?.sourceStore).toBe('bestbuy')
  })

  it('sets sourceId from sku', () => {
    const result = bestbuyAdapter.normalize(mockProduct, mockConfig)
    expect(result?.sourceId).toBe('6525063')
  })
})
