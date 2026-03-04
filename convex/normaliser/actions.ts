import { action } from '../_generated/server'
import { internal } from '../_generated/api'
import { loadStoreConfigs } from './config'
import { dummyjsonAdapter } from './adapters/dummyjson'

export const ingestAllStores = action({
  args: {},
  handler: async (ctx) => {
    const storeConfigs = loadStoreConfigs()  // reads process.env — silently skips missing/disabled stores

    let totalWritten = 0

    for (const config of storeConfigs) {
      // Only dummyjson adapter in v1 — future stores add their adapter here
      if (config.adapter !== 'dummyjson') {
        console.log(`Skipping unknown adapter: ${config.adapter}`)
        continue
      }

      let rawProducts: Awaited<ReturnType<typeof dummyjsonAdapter.fetchProducts>>
      try {
        rawProducts = await dummyjsonAdapter.fetchProducts(config)
      } catch (err) {
        console.error(`Failed to fetch from ${config.id}:`, err)
        continue  // skip this store, do not crash the whole Action
      }

      for (const raw of rawProducts) {
        const normalized = dummyjsonAdapter.normalize(raw, config)
        if (!normalized) continue  // skip invalid/malformed products

        // Per-product write — one atomic mutation per product (NEVER bulk)
        await ctx.runMutation(internal.products.upsertProduct, normalized)
        totalWritten++
      }
    }

    console.log(`Normaliser complete: ${totalWritten} products written`)
    return { totalWritten }
  },
})
