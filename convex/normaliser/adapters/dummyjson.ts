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
