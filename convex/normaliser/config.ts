import type { StoreConfig } from './adapters/types'

// All known store IDs. Adding a new store: add the ID here + implement its adapter.
const KNOWN_STORES = ['etsy', 'bestbuy', 'amazon', 'ebay', 'aliexpress', 'dummyjson'] as const

export function loadStoreConfigs(): StoreConfig[] {
  const configs: StoreConfig[] = []

  for (const storeId of KNOWN_STORES) {
    const upper = storeId.toUpperCase()
    // Direct key access — required in Convex runtime (Object.entries(process.env) doesn't enumerate)
    if (process.env[`STORE_${upper}_ENABLED`] !== 'true') continue

    configs.push({
      id: storeId,
      apiBase: process.env[`STORE_${upper}_API_BASE`] ?? '',
      apiKey: process.env[`STORE_${upper}_API_KEY`] ?? '',
      affiliateId: process.env[`STORE_${upper}_AFFILIATE_ID`] ?? '',
      adapter: process.env[`STORE_${upper}_ADAPTER`] ?? storeId,
    })
  }

  return configs
}
