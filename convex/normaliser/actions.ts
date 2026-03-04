import { internalAction } from '../_generated/server'
import { internal } from '../_generated/api'
import { loadStoreConfigs } from './config'
import { etsyAdapter } from './adapters/etsy'

const ADAPTERS = {
  etsy: etsyAdapter,
} as const

export const ingestAllStores = internalAction({
  args: {},
  handler: async (ctx) => {
    const storeConfigs = loadStoreConfigs()

    let totalWritten = 0

    for (const config of storeConfigs) {
      const adapter = ADAPTERS[config.adapter as keyof typeof ADAPTERS]
      if (!adapter) {
        console.log(`Skipping unknown adapter: ${config.adapter}`)
        continue
      }

      let rawProducts: Awaited<ReturnType<typeof adapter.fetchProducts>>
      try {
        rawProducts = await adapter.fetchProducts(config)
      } catch (err) {
        console.error(`Failed to fetch from ${config.id}:`, err)
        continue
      }

      for (const raw of rawProducts) {
        const normalized = adapter.normalize(raw as never, config)
        if (!normalized) continue

        await ctx.runMutation(internal.products.upsertProduct, normalized)
        totalWritten++
      }
    }

    console.log(`Normaliser complete: ${totalWritten} products written`)
    return { totalWritten }
  },
})
