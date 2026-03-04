import type { StoreConfig, ProductCard } from './types'

// Placeholder — Amazon Product Advertising API (PA-API 5.0)
// Requirements: Amazon Associates account with active sales history + AWS credentials
// Docs: https://webservices.amazon.com/paapi5/documentation/
// ENV: STORE_AMAZON_ENABLED, STORE_AMAZON_API_BASE, STORE_AMAZON_API_KEY,
//      STORE_AMAZON_AFFILIATE_ID (Associates tag), STORE_AMAZON_ADAPTER=amazon

export const amazonAdapter = {
  async fetchProducts(_config: StoreConfig): Promise<never[]> {
    throw new Error(
      'Amazon adapter not yet implemented. Set STORE_AMAZON_ENABLED=false until PA-API credentials are configured.'
    )
  },

  normalize(_raw: unknown, _config: StoreConfig): ProductCard | null {
    return null
  },
}
