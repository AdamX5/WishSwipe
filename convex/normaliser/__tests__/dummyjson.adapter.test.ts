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
