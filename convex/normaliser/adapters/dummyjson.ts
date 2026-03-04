import type { StoreConfig, ProductCard } from './types'

interface DummyJsonProduct {
  id: number
  title: string
  description: string
  price: number          // USD float — convert to cents in normalize()
  rating: number         // 0-5
  thumbnail: string      // primary image URL
  category: string
  stock: number
}

export const dummyjsonAdapter = {
  async fetchProducts(config: StoreConfig): Promise<DummyJsonProduct[]> {
    const url = `${config.apiBase}/products?limit=100&skip=0`
    const res = await fetch(url)
    if (!res.ok) throw new Error(`DummyJSON fetch failed: ${res.status}`)
    const data = await res.json()
    return data.products as DummyJsonProduct[]
  },

  normalize(raw: DummyJsonProduct, config: StoreConfig): ProductCard | null {
    // Validate required fields — skip malformed products silently
    if (!raw.title || !raw.thumbnail || raw.price <= 0) return null

    // Affiliate URL construction (NORM-03):
    // - If affiliateId is set: append ?tag={affiliateId}
    // - If affiliateId is empty: use plain product URL (DummyJSON has no affiliate program in v1)
    // IMPORTANT: This is the ONLY URL field. Never store raw.thumbnail URL as a separate field.
    const productPageUrl = `${config.apiBase}/products/${raw.id}`
    const affiliateUrl = config.affiliateId
      ? `${productPageUrl}?tag=${config.affiliateId}`
      : productPageUrl

    return {
      sourceStore: 'dummyjson',
      sourceId: String(raw.id),
      title: raw.title,
      description: raw.description,
      imageUrl: raw.thumbnail,
      priceAmount: Math.round(raw.price * 100),  // float -> integer cents
      priceCurrency: 'USD',
      starRating: raw.rating,
      affiliateUrl,   // Only URL field in ProductCard
      category: raw.category,
      normalizedAt: Date.now(),
      isActive: raw.stock > 0,
    }
  },
}
