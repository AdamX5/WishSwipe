import type { StoreConfig, ProductCard } from './types'

interface EtsyPrice {
  amount: number
  divisor: number
  currency_code: string
}

interface EtsyImage {
  listing_image_id: number
  url_570xN: string
  url_fullxfull: string
}

interface EtsyListing {
  listing_id: number
  title: string
  description: string
  price: EtsyPrice
  url: string
  average_rating: number
  num_ratings: number
  quantity: number
  state: string
  images: EtsyImage[]
}

interface EtsyResponse {
  results: EtsyListing[]
  count: number
}

export const etsyAdapter = {
  async fetchProducts(config: StoreConfig): Promise<EtsyListing[]> {
    const url = `${config.apiBase}/application/listings/active?limit=100&includes=Images&sort_on=score&sort_order=desc`
    const res = await fetch(url, {
      headers: { 'x-api-key': config.apiKey },
    })
    if (!res.ok) throw new Error(`Etsy fetch failed: ${res.status}`)
    const data: EtsyResponse = await res.json()
    return data.results
  },

  normalize(raw: EtsyListing, config: StoreConfig): ProductCard | null {
    if (!raw.title || !raw.images?.length || !raw.price || raw.quantity <= 0) return null

    const image = raw.images[0]
    const imageUrl = image.url_fullxfull || image.url_570xN
    if (!imageUrl) return null

    const priceAmount = Math.round((raw.price.amount / raw.price.divisor) * 100)
    if (priceAmount <= 0) return null

    // Etsy affiliate program is via Awin — plain URL for now, wired up when affiliateId is set
    const affiliateUrl = config.affiliateId
      ? `${raw.url}?utm_source=${config.affiliateId}`
      : raw.url

    return {
      sourceStore: 'etsy',
      sourceId: String(raw.listing_id),
      title: raw.title,
      description: raw.description,
      imageUrl,
      priceAmount,
      priceCurrency: raw.price.currency_code,
      starRating: raw.num_ratings > 0 ? raw.average_rating : undefined,
      affiliateUrl,
      normalizedAt: Date.now(),
      isActive: raw.state === 'active' && raw.quantity > 0,
    }
  },
}
