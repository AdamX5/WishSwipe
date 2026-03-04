export interface StoreConfig {
  id: string
  apiBase: string
  apiKey: string
  affiliateId: string
  adapter: string
}

export interface ProductCard {
  sourceStore: string
  sourceId: string
  title: string
  description?: string
  imageUrl: string
  priceAmount: number      // cents (integer) — DO NOT store floats
  priceCurrency: string    // "USD"
  starRating?: number      // 0-5
  affiliateUrl: string     // ONLY URL field — no rawUrl/productUrl/storeUrl anywhere
  category?: string
  normalizedAt: number     // Unix ms
  isActive: boolean
}
