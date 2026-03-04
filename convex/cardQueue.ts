import { query } from './_generated/server'

export const getCardQueue = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) return []

    const user = await ctx.db
      .query('users')
      .withIndex('by_token', q => q.eq('tokenIdentifier', identity.tokenIdentifier))
      .unique()
    if (!user) return []

    const swiped = await ctx.db
      .query('swipes')
      .withIndex('by_user', q => q.eq('userId', user._id))
      .collect()

    const swipedIds = new Set(swiped.map(s => s.productId))

    const allActive = await ctx.db
      .query('products')
      .filter(q => q.eq(q.field('isActive'), true))
      .collect()
    // TODO: replace with paginated query when product count exceeds 1024

    const queue = []
    for (const p of allActive) {
      if (!swipedIds.has(p._id)) {
        queue.push(p)
        if (queue.length === 20) break
      }
    }

    return queue
  },
})
