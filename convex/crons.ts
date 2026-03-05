// convex/crons.ts
// Source: https://docs.convex.dev/scheduling/cron-jobs
//
// INVARIANT: compact-user-swipes ONLY touches swipes table.
// wishlists table is NEVER affected by this job.
import { cronJobs } from 'convex/server'
import { internal } from './_generated/api'

const crons = cronJobs()

// Runs daily at 03:00 UTC — keeps last 10 swipes per user, deletes the rest.
crons.daily(
  'compact-user-swipes',
  { hourUTC: 3, minuteUTC: 0 },
  internal.compaction.compactUserSwipes,
)

export default crons
