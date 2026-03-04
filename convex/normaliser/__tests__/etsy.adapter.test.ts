import { etsyAdapter } from '../adapters/etsy'
import type { StoreConfig } from '../adapters/types'

const mockConfig: StoreConfig = {
  id: 'etsy',
  apiBase: 'https://openapi.etsy.com/v3',
  apiKey: 'test-key',
  affiliateId: '',
  adapter: 'etsy',
}

const mockListing = {
  listing_id: 12345,
  title: 'Handmade Wooden Bowl',
  description: 'A beautiful handmade bowl',
  price: { amount: 2500, divisor: 100, currency_code: 'USD' },
  url: 'https://www.etsy.com/listing/12345/handmade-wooden-bowl',
  average_rating: 4.5,
  num_ratings: 23,
  quantity: 5,
  state: 'active',
  images: [
    {
      listing_image_id: 456,
      url_570xN: 'https://i.etsystatic.com/img_570.jpg',
      url_fullxfull: 'https://i.etsystatic.com/img_full.jpg',
    },
  ],
}

describe('etsyAdapter.normalize', () => {
  it('converts price amount/divisor to integer cents', () => {
    const result = etsyAdapter.normalize(mockListing, mockConfig)
    expect(result?.priceAmount).toBe(2500) // $25.00 → 2500 cents
  })

  it('uses url_fullxfull as imageUrl', () => {
    const result = etsyAdapter.normalize(mockListing, mockConfig)
    expect(result?.imageUrl).toBe('https://i.etsystatic.com/img_full.jpg')
  })

  it('falls back to url_570xN when url_fullxfull is empty', () => {
    const listing = {
      ...mockListing,
      images: [{ ...mockListing.images[0], url_fullxfull: '' }],
    }
    const result = etsyAdapter.normalize(listing, mockConfig)
    expect(result?.imageUrl).toBe('https://i.etsystatic.com/img_570.jpg')
  })

  it('returns null for zero quantity', () => {
    const result = etsyAdapter.normalize({ ...mockListing, quantity: 0 }, mockConfig)
    expect(result).toBeNull()
  })

  it('returns null when images array is empty', () => {
    const result = etsyAdapter.normalize({ ...mockListing, images: [] }, mockConfig)
    expect(result).toBeNull()
  })

  it('omits starRating when num_ratings is 0', () => {
    const result = etsyAdapter.normalize({ ...mockListing, num_ratings: 0 }, mockConfig)
    expect(result?.starRating).toBeUndefined()
  })

  it('uses plain url when affiliateId is empty', () => {
    const result = etsyAdapter.normalize(mockListing, mockConfig)
    expect(result?.affiliateUrl).toBe(mockListing.url)
  })

  it('appends utm_source when affiliateId is set', () => {
    const config = { ...mockConfig, affiliateId: 'my-aff-id' }
    const result = etsyAdapter.normalize(mockListing, config)
    expect(result?.affiliateUrl).toContain('utm_source=my-aff-id')
  })

  it('sets sourceStore to etsy', () => {
    const result = etsyAdapter.normalize(mockListing, mockConfig)
    expect(result?.sourceStore).toBe('etsy')
  })

  it('sets sourceId from listing_id', () => {
    const result = etsyAdapter.normalize(mockListing, mockConfig)
    expect(result?.sourceId).toBe('12345')
  })
})
