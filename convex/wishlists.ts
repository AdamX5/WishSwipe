import { query, mutation } from './_generated/server'
import { v } from 'convex/values'

export const getWishlist = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) return []

    const user = await ctx.db
      .query('users')
      .withIndex('by_token', q => q.eq('tokenIdentifier', identity.tokenIdentifier))
      .unique()
    if (!user) return []

    return await ctx.db
      .query('wishlists')
      .withIndex('by_user', q => q.eq('userId', user._id))
      .order('desc')
      .collect()
  },
})

export const removeFromWishlist = mutation({
  args: {
    wishlistId: v.id('wishlists'),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) throw new Error('Not authenticated')

    const user = await ctx.db
      .query('users')
      .withIndex('by_token', q => q.eq('tokenIdentifier', identity.tokenIdentifier))
      .unique()
    if (!user) throw new Error('User not found')

    const entry = await ctx.db.get(args.wishlistId)
    if (!entry || entry.userId !== user._id) throw new Error('Not found')

    await ctx.db.delete(args.wishlistId)
  },
})
