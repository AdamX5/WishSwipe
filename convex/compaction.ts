// convex/compaction.ts
// INVARIANT: This module ONLY touches the swipes table, direction='left'.
// wishlists table and right-swipe records are NEVER modified by this code.
import { internalMutation } from './_generated/server'
import { internal } from './_generated/api'
import { v } from 'convex/values'

const COMPACTION_THRESHOLD_MS = 30 * 24 * 60 * 60 * 1000  // 30 days
const DELETE_BATCH_SIZE = 100

// Entry point called by cron — checks if any compactable records exist, then kicks off pagination.
export const compactLeftSwipes = internalMutation({
  args: {},
  handler: async (ctx) => {
    const cutoff = Date.now() - COMPACTION_THRESHOLD_MS
    const exists = await ctx.db
      .query('swipes')
      .withIndex('by_direction_time', q =>
        q.eq('direction', 'left').lt('swipedAt', cutoff)
      )
      .first()
    if (exists) {
      await ctx.scheduler.runAfter(0, internal.compaction.compactLeftSwipesPage, {
        cursor: null,
        cutoff,
        deletedSoFar: 0,
      })
    }
  },
})

// Paginated worker — deletes one batch of 100, reschedules if more remain.
export const compactLeftSwipesPage = internalMutation({
  args: {
    cursor: v.union(v.string(), v.null()),
    cutoff: v.number(),
    deletedSoFar: v.number(),
  },
  handler: async (ctx, { cursor, cutoff, deletedSoFar }) => {
    const results = await ctx.db
      .query('swipes')
      .withIndex('by_direction_time', q =>
        q.eq('direction', 'left').lt('swipedAt', cutoff)
      )
      .paginate({ cursor, numItems: DELETE_BATCH_SIZE })

    for (const swipe of results.page) {
      await ctx.db.delete(swipe._id)
    }

    if (!results.isDone) {
      await ctx.scheduler.runAfter(0, internal.compaction.compactLeftSwipesPage, {
        cursor: results.continueCursor,
        cutoff,
        deletedSoFar: deletedSoFar + results.page.length,
      })
    } else {
      console.log(`[compaction] deleted ${deletedSoFar + results.page.length} old left-swipe records`)
    }
  },
})
