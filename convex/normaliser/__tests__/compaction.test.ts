// Unit tests for compaction filter logic — count-based per-user retention
// Tests pure helper functions — zero Convex SDK imports
//
// Strategy: keep the most recent KEEP_SWIPES_PER_USER swipes per user,
// delete the rest regardless of direction.

// ---- Types ----

type SwipeRecord = {
  _id: string
  userId: string
  direction: 'right' | 'left'
  swipedAt: number
}

// ---- Pure functions ----
// These mirror the compaction logic in convex/compaction.ts.
// Defined inline here (SDK-free) — compaction.ts uses Convex SDK internals that Jest cannot import.

const KEEP_SWIPES_PER_USER = 10

/**
 * Given a list of swipes for a single user (already sorted newest-first),
 * returns the records that should be deleted (everything beyond the keep limit).
 */
function getSwipesToDelete(swipes: SwipeRecord[]): SwipeRecord[] {
  return swipes.slice(KEEP_SWIPES_PER_USER)
}

/**
 * Sort swipes newest-first (descending swipedAt), then return those to delete.
 * Mirrors the by_user_time .order('desc') + .slice(KEEP) pattern in compaction.ts.
 */
function compactUserSwipes(swipes: SwipeRecord[]): SwipeRecord[] {
  const sorted = [...swipes].sort((a, b) => b.swipedAt - a.swipedAt)
  return getSwipesToDelete(sorted)
}

// ---- Helpers ----

function makeSwipe(id: string, userId: string, direction: 'left' | 'right', swipedAt: number): SwipeRecord {
  return { _id: id, userId, direction, swipedAt }
}

function makeSwipes(userId: string, count: number): SwipeRecord[] {
  return Array.from({ length: count }, (_, i) =>
    makeSwipe(`s${i + 1}`, userId, i % 2 === 0 ? 'right' : 'left', i + 1)
  )
}

// ---- Tests: getSwipesToDelete ----

describe('getSwipesToDelete', () => {
  it('returns empty array when user has exactly 10 swipes', () => {
    const swipes = makeSwipes('user1', 10)
    expect(getSwipesToDelete(swipes)).toHaveLength(0)
  })

  it('returns 1 record when user has 11 swipes', () => {
    const swipes = makeSwipes('user1', 11)
    expect(getSwipesToDelete(swipes)).toHaveLength(1)
  })

  it('returns 5 records when user has 15 swipes', () => {
    const swipes = makeSwipes('user1', 15)
    expect(getSwipesToDelete(swipes)).toHaveLength(5)
  })

  it('returns empty array when user has fewer than 10 swipes', () => {
    const swipes = makeSwipes('user1', 5)
    expect(getSwipesToDelete(swipes)).toHaveLength(0)
  })

  it('returns empty array when user has 0 swipes', () => {
    expect(getSwipesToDelete([])).toHaveLength(0)
  })
})

// ---- Tests: compactUserSwipes (sort + delete) ----

describe('compactUserSwipes', () => {
  it('keeps the 10 most recent swipes, deletes oldest when 15 present', () => {
    // swipedAt 1..15; newest 10 are 6..15, oldest 5 are 1..5
    const swipes = makeSwipes('user1', 15)
    const toDelete = compactUserSwipes(swipes)
    expect(toDelete).toHaveLength(5)
    // Deleted records should be the 5 oldest (swipedAt 1..5)
    const deletedTimestamps = toDelete.map(s => s.swipedAt).sort((a, b) => a - b)
    expect(deletedTimestamps).toEqual([1, 2, 3, 4, 5])
  })

  it('applies count limit regardless of swipe direction (left and right both count)', () => {
    const swipes: SwipeRecord[] = [
      makeSwipe('s1', 'user1', 'right', 1),
      makeSwipe('s2', 'user1', 'right', 2),
      makeSwipe('s3', 'user1', 'left',  3),
      makeSwipe('s4', 'user1', 'right', 4),
      makeSwipe('s5', 'user1', 'left',  5),
      makeSwipe('s6', 'user1', 'right', 6),
      makeSwipe('s7', 'user1', 'left',  7),
      makeSwipe('s8', 'user1', 'right', 8),
      makeSwipe('s9', 'user1', 'left',  9),
      makeSwipe('s10', 'user1', 'right', 10),
      makeSwipe('s11', 'user1', 'left',  11),
    ]
    const toDelete = compactUserSwipes(swipes)
    // 11 swipes → delete 1 (the oldest)
    expect(toDelete).toHaveLength(1)
    expect(toDelete[0]._id).toBe('s1')
    expect(toDelete[0].swipedAt).toBe(1)
  })

  it('preserves the 10 newest regardless of insertion order', () => {
    // Provide in random order — function must sort correctly
    const swipes: SwipeRecord[] = [
      makeSwipe('s15', 'user1', 'left',  15),
      makeSwipe('s3',  'user1', 'right',  3),
      makeSwipe('s11', 'user1', 'left',  11),
      makeSwipe('s7',  'user1', 'right',  7),
      makeSwipe('s1',  'user1', 'left',   1),
      makeSwipe('s9',  'user1', 'right',  9),
      makeSwipe('s5',  'user1', 'left',   5),
      makeSwipe('s13', 'user1', 'right', 13),
      makeSwipe('s2',  'user1', 'left',   2),
      makeSwipe('s6',  'user1', 'right',  6),
      makeSwipe('s4',  'user1', 'left',   4),
      makeSwipe('s8',  'user1', 'right',  8),
    ]
    const toDelete = compactUserSwipes(swipes)
    // 12 swipes → delete 2 oldest (swipedAt 1, 2)
    expect(toDelete).toHaveLength(2)
    const deletedTimestamps = toDelete.map(s => s.swipedAt).sort((a, b) => a - b)
    expect(deletedTimestamps).toEqual([1, 2])
  })

  it('returns empty array when user has exactly 10 swipes', () => {
    const swipes = makeSwipes('user1', 10)
    expect(compactUserSwipes(swipes)).toHaveLength(0)
  })

  it('returns empty array when user has fewer than 10 swipes', () => {
    const swipes = makeSwipes('user1', 7)
    expect(compactUserSwipes(swipes)).toHaveLength(0)
  })
})
