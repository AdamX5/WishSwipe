import type { StoreConfig, ProductCard } from './types'

// Placeholder — AliExpress Affiliate Open Platform API
// Requirements: AliExpress developer account approval (similar process to Etsy)
// Docs: https://developers.aliexpress.com/
// ENV: STORE_ALIEXPRESS_ENABLED, STORE_ALIEXPRESS_API_BASE, STORE_ALIEXPRESS_API_KEY,
//      STORE_ALIEXPRESS_AFFILIATE_ID, STORE_ALIEXPRESS_ADAPTER=aliexpress

export const aliexpressAdapter = {
  async fetchProducts(_config: StoreConfig): Promise<never[]> {
    throw new Error(
      'AliExpress adapter not yet implemented. Set STORE_ALIEXPRESS_ENABLED=false until API approval is granted.'
    )
  },

  normalize(_raw: unknown, _config: StoreConfig): ProductCard | null {
    return null
  },
}
