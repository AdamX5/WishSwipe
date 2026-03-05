// convex/compaction.ts
// INVARIANT: This module ONLY touches the swipes table.
// wishlists table is NEVER modified by this code.
//
// Strategy: count-based per-user retention.
// Keep the most recent KEEP_SWIPES_PER_USER swipes per user.
// Older swipes (any direction) are deleted to keep memory lean.
// This preserves enough history for undo while bounding storage per user.
import { internalMutation } from './_generated/server'
import { internal } from './_generated/api'
import { v } from 'convex/values'

export const KEEP_SWIPES_PER_USER = 10  // keep last N swipes per user for undo

// Entry point called by cron — paginates through users and compacts each one's swipe history.
export const compactUserSwipes = internalMutation({
  args: {},
  handler: async (ctx) => {
    await ctx.scheduler.runAfter(0, internal.compaction.compactUserSwipesPage, {
      cursor: null,
      deletedSoFar: 0,
    })
  },
})

// Paginated worker — processes one batch of users, reschedules if more remain.
export const compactUserSwipesPage = internalMutation({
  args: {
    cursor: v.union(v.string(), v.null()),
    deletedSoFar: v.number(),
  },
  handler: async (ctx, { cursor, deletedSoFar }) => {
    const USERS_PER_BATCH = 50

    const results = await ctx.db
      .query('users')
      .paginate({ cursor, numItems: USERS_PER_BATCH })

    let batchDeleted = 0
    for (const user of results.page) {
      // Get all swipes for this user, newest first (desc order by swipedAt)
      const swipes = await ctx.db
        .query('swipes')
        .withIndex('by_user_time', q => q.eq('userId', user._id))
        .order('desc')
        .collect()

      // Delete everything beyond the keep limit
      const toDelete = swipes.slice(KEEP_SWIPES_PER_USER)
      for (const swipe of toDelete) {
        await ctx.db.delete(swipe._id)
        batchDeleted++
      }
    }

    if (!results.isDone) {
      await ctx.scheduler.runAfter(0, internal.compaction.compactUserSwipesPage, {
        cursor: results.continueCursor,
        deletedSoFar: deletedSoFar + batchDeleted,
      })
    } else {
      console.log(`[compaction] deleted ${deletedSoFar + batchDeleted} excess swipe records (keeping last ${KEEP_SWIPES_PER_USER} per user)`)
    }
  },
})
