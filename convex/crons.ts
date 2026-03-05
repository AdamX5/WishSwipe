// convex/crons.ts
// Source: https://docs.convex.dev/scheduling/cron-jobs
//
// INVARIANT: compact-old-left-swipes ONLY touches swipes table, direction='left'.
// wishlists and right-swipe records are NEVER affected by this job.
import { cronJobs } from 'convex/server'
import { internal } from './_generated/api'

const crons = cronJobs()

// Runs daily at 03:00 UTC — deletes left-swipe records older than 30 days.
crons.daily(
  'compact-old-left-swipes',
  { hourUTC: 3, minuteUTC: 0 },
  internal.compaction.compactLeftSwipes,
)

export default crons
