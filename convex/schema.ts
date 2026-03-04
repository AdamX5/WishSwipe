import { defineSchema, defineTable } from 'convex/server'
import { v } from 'convex/values'

export default defineSchema({

  users: defineTable({
    email: v.string(),
    name: v.optional(v.string()),
    tokenIdentifier: v.string(),  // Clerk token identifier
    createdAt: v.number(),        // Unix ms
  })
    .index('by_token', ['tokenIdentifier']),

  products: defineTable({
    sourceStore: v.string(),            // "dummyjson" | future stores
    sourceId: v.string(),              // original ID in source system
    title: v.string(),
    description: v.optional(v.string()),
    imageUrl: v.string(),
    priceAmount: v.number(),           // cents (integer) — avoids float bugs
    priceCurrency: v.string(),         // "USD"
    starRating: v.optional(v.number()), // 0-5
    affiliateUrl: v.string(),          // NEVER raw store URL — only this URL field exists
    category: v.optional(v.string()),
    normalizedAt: v.number(),          // Unix ms — freshness tracking
    isActive: v.boolean(),             // soft-delete for de-listed products
  })
    .index('by_source', ['sourceStore', 'sourceId'])
    .index('by_store', ['sourceStore']),

  // Event log — every swipe. Phase 2 writes to this; Phase 1 defines the schema.
  swipes: defineTable({
    userId: v.id('users'),
    productId: v.id('products'),
    direction: v.union(v.literal('right'), v.literal('left')),
    swipedAt: v.number(),
    productSnapshot: v.object({
      title: v.string(),
      imageUrl: v.string(),
      priceAmount: v.number(),
      priceCurrency: v.string(),
      affiliateUrl: v.string(),
      sourceStore: v.string(),
    }),
  })
    .index('by_user', ['userId'])
    .index('by_user_time', ['userId', 'swipedAt'])
    .index('by_user_product', ['userId', 'productId']),

  // Durable wishlist — separate table, NEVER compacted (Phase 4 compaction targets swipes only)
  wishlists: defineTable({
    userId: v.id('users'),
    productId: v.id('products'),
    savedAt: v.number(),
    productSnapshot: v.object({
      title: v.string(),
      imageUrl: v.string(),
      priceAmount: v.number(),
      priceCurrency: v.string(),
      affiliateUrl: v.string(),
      sourceStore: v.string(),
    }),
  })
    .index('by_user', ['userId'])
    .index('by_user_product', ['userId', 'productId']),

})
