import { mutation } from './_generated/server'
import { v } from 'convex/values'

const productSnapshotValidator = v.object({
  title: v.string(),
  imageUrl: v.string(),
  priceAmount: v.number(),
  priceCurrency: v.string(),
  affiliateUrl: v.string(),
  sourceStore: v.string(),
})

export const recordSwipe = mutation({
  args: {
    productId: v.id('products'),
    direction: v.union(v.literal('right'), v.literal('left')),
    productSnapshot: productSnapshotValidator,
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) throw new Error('Not authenticated')

    const user = await ctx.db
      .query('users')
      .withIndex('by_token', q => q.eq('tokenIdentifier', identity.tokenIdentifier))
      .unique()
    if (!user) throw new Error('User not found')

    const swipeId = await ctx.db.insert('swipes', {
      userId: user._id,
      productId: args.productId,
      direction: args.direction,
      swipedAt: Date.now(),
      productSnapshot: args.productSnapshot,
    })

    if (args.direction === 'right') {
      await ctx.db.insert('wishlists', {
        userId: user._id,
        productId: args.productId,
        savedAt: Date.now(),
        productSnapshot: args.productSnapshot,
      })
    }

    return swipeId
  },
})

export const undoSwipe = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) throw new Error('Not authenticated')

    const user = await ctx.db
      .query('users')
      .withIndex('by_token', q => q.eq('tokenIdentifier', identity.tokenIdentifier))
      .unique()
    if (!user) throw new Error('User not found')

    const lastSwipe = await ctx.db
      .query('swipes')
      .withIndex('by_user_time', q => q.eq('userId', user._id))
      .order('desc')
      .first()

    if (!lastSwipe) return null

    await ctx.db.delete(lastSwipe._id)

    if (lastSwipe.direction === 'right') {
      const wishlistEntry = await ctx.db
        .query('wishlists')
        .withIndex('by_user_product', q =>
          q.eq('userId', user._id).eq('productId', lastSwipe.productId)
        )
        .unique()
      if (wishlistEntry) {
        await ctx.db.delete(wishlistEntry._id)
      }
    }

    return lastSwipe
  },
})
