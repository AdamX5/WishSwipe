import type { StoreConfig } from './adapters/types'

export function loadStoreConfigs(): StoreConfig[] {
  const prefix = 'STORE_'
  const configs: StoreConfig[] = []

  const enabledStores = Object.entries(process.env)
    .filter(([key, val]) => key.startsWith(prefix) && key.endsWith('_ENABLED') && val === 'true')
    .map(([key]) => key.slice(prefix.length, -'_ENABLED'.length).toLowerCase())

  for (const storeId of enabledStores) {
    const upper = storeId.toUpperCase()
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
