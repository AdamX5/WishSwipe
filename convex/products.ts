import { internalMutation } from './_generated/server'
import { v } from 'convex/values'

export const upsertProduct = internalMutation({
  args: {
    sourceStore: v.string(),
    sourceId: v.string(),
    title: v.string(),
    description: v.optional(v.string()),
    imageUrl: v.string(),
    priceAmount: v.number(),
    priceCurrency: v.string(),
    starRating: v.optional(v.number()),
    affiliateUrl: v.string(),
    category: v.optional(v.string()),
    normalizedAt: v.number(),
    isActive: v.boolean(),
  },
  handler: async (ctx, args) => {
    // Dedup: find existing product by source store + source ID
    const existing = await ctx.db
      .query('products')
      .withIndex('by_source', (q) =>
        q.eq('sourceStore', args.sourceStore).eq('sourceId', args.sourceId)
      )
      .unique()

    if (existing) {
      // Update existing — overwrites affiliateUrl with freshly computed value
      await ctx.db.patch(existing._id, { ...args })
      return existing._id
    } else {
      return await ctx.db.insert('products', args)
    }
  },
})
