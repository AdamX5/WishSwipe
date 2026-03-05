// Unit tests for compaction filter logic — Wave 0 RED scaffold
// Tests pure helper functions — zero Convex SDK imports

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

function isCompactable(swipe: SwipeRecord, cutoffMs: number): boolean {
  return swipe.direction === 'left' && swipe.swipedAt < cutoffMs
}

function filterCompactable(swipes: SwipeRecord[], cutoffMs: number): SwipeRecord[] {
  return swipes.filter(s => isCompactable(s, cutoffMs))
}

// ---- Constants ----

const CUTOFF = 1_000_000
const OLD = 500_000   // swipedAt < CUTOFF — older than cutoff
const NEW = 2_000_000 // swipedAt > CUTOFF — newer than cutoff

// ---- Tests: isCompactable ----

describe('isCompactable', () => {
  it('returns true for left-swipe older than cutoff', () => {
    const swipe: SwipeRecord = { _id: 's1', userId: 'user1', direction: 'left', swipedAt: OLD }
    expect(isCompactable(swipe, CUTOFF)).toBe(true)
  })

  it('returns false for right-swipe older than cutoff (safety invariant — never compact right-swipes)', () => {
    const swipe: SwipeRecord = { _id: 's2', userId: 'user1', direction: 'right', swipedAt: OLD }
    expect(isCompactable(swipe, CUTOFF)).toBe(false)
  })

  it('returns false for left-swipe newer than cutoff', () => {
    const swipe: SwipeRecord = { _id: 's3', userId: 'user1', direction: 'left', swipedAt: NEW }
    expect(isCompactable(swipe, CUTOFF)).toBe(false)
  })

  it('returns false for right-swipe newer than cutoff', () => {
    const swipe: SwipeRecord = { _id: 's4', userId: 'user1', direction: 'right', swipedAt: NEW }
    expect(isCompactable(swipe, CUTOFF)).toBe(false)
  })
})

// ---- Tests: filterCompactable ----

describe('filterCompactable', () => {
  it('excludes all right-swipes regardless of age', () => {
    const swipes: SwipeRecord[] = [
      { _id: 's1', userId: 'user1', direction: 'right', swipedAt: OLD },
      { _id: 's2', userId: 'user1', direction: 'right', swipedAt: NEW },
      { _id: 's3', userId: 'user1', direction: 'left', swipedAt: NEW },
    ]
    const result = filterCompactable(swipes, CUTOFF)
    expect(result).toEqual([])
  })

  it('returns empty array when no records exceed threshold', () => {
    const swipes: SwipeRecord[] = [
      { _id: 's1', userId: 'user1', direction: 'left', swipedAt: NEW },
      { _id: 's2', userId: 'user1', direction: 'left', swipedAt: NEW },
    ]
    const result = filterCompactable(swipes, CUTOFF)
    expect(result.length).toBe(0)
  })
})
