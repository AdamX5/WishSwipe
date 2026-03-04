import type { StoreConfig, ProductCard } from './types'

interface BestBuyProduct {
  sku: number
  name: string
  salePrice: number
  regularPrice: number
  image: string
  url: string                       // relative path, e.g. /site/name/sku.p
  customerReviewAverage: number | null
  customerReviewCount: number
  active: boolean
  onlineAvailability: boolean
  class: string
}

interface BestBuyResponse {
  products: BestBuyProduct[]
  total: number
}

const BESTBUY_ORIGIN = 'https://www.bestbuy.com'
const SHOW_FIELDS = [
  'sku', 'name', 'salePrice', 'regularPrice', 'image', 'url',
  'customerReviewAverage', 'customerReviewCount', 'active', 'onlineAvailability', 'class',
].join(',')

export const bestbuyAdapter = {
  async fetchProducts(config: StoreConfig): Promise<BestBuyProduct[]> {
    const params = new URLSearchParams({
      format: 'json',
      apiKey: config.apiKey,
      show: SHOW_FIELDS,
      pageSize: '100',
      sort: 'bestSellingRank.asc',
    })
    const url = `${config.apiBase}/products(active=true&onlineAvailability=true)?${params}`
    const res = await fetch(url)
    if (!res.ok) throw new Error(`Best Buy fetch failed: ${res.status}`)
    const data: BestBuyResponse = await res.json()
    return data.products
  },

  normalize(raw: BestBuyProduct, config: StoreConfig): ProductCard | null {
    if (!raw.name || !raw.image || !raw.salePrice || !raw.active || !raw.onlineAvailability) {
      return null
    }

    const priceAmount = Math.round(raw.salePrice * 100)
    if (priceAmount <= 0) return null

    // url is a relative path — prepend origin
    const productUrl = raw.url.startsWith('http')
      ? raw.url
      : `${BESTBUY_ORIGIN}${raw.url}`

    const affiliateUrl = config.affiliateId
      ? `${productUrl}?ref=${config.affiliateId}`
      : productUrl

    return {
      sourceStore: 'bestbuy',
      sourceId: String(raw.sku),
      title: raw.name,
      imageUrl: raw.image,
      priceAmount,
      priceCurrency: 'USD',
      starRating: raw.customerReviewCount > 0 && raw.customerReviewAverage != null
        ? raw.customerReviewAverage
        : undefined,
      affiliateUrl,
      category: raw.class,
      normalizedAt: Date.now(),
      isActive: raw.active && raw.onlineAvailability,
    }
  },
}
