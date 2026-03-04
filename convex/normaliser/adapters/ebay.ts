import type { StoreConfig, ProductCard } from './types'

// Placeholder — eBay Browse API
// Requirements: eBay Developer Program account + production access contract with eBay
// Docs: https://developer.ebay.com/api-docs/buy/browse/overview.html
// ENV: STORE_EBAY_ENABLED, STORE_EBAY_API_BASE, STORE_EBAY_API_KEY,
//      STORE_EBAY_AFFILIATE_ID, STORE_EBAY_ADAPTER=ebay

export const ebayAdapter = {
  async fetchProducts(_config: StoreConfig): Promise<never[]> {
    throw new Error(
      'eBay adapter not yet implemented. Set STORE_EBAY_ENABLED=false until Browse API production contract is signed.'
    )
  },

  normalize(_raw: unknown, _config: StoreConfig): ProductCard | null {
    return null
  },
}
