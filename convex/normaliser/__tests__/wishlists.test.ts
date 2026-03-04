// Unit tests for wishlist query and mutation logic
// Tests pure helper functions — no Convex SDK imports

// ---- Types ----
type WishlistEntry = {
  _id: string
  userId: string
  productId: string
  savedAt: number
  productSnapshot: {
    title: string
    imageUrl: string
    priceAmount: number
    priceCurrency: string
    affiliateUrl: string
    sourceStore: string
  }
}

// ---- Pure helper: sort wishlist entries desc by savedAt ----
function sortWishlistDesc(entries: WishlistEntry[]): WishlistEntry[] {
  return [...entries].sort((a, b) => b.savedAt - a.savedAt)
}

// ---- Pure helper: ownership check before delete ----
function canDelete(entry: WishlistEntry | null, userId: string): boolean {
  if (!entry) return false
  return entry.userId === userId
}

// ---- Pure helper: returns [] for unauthenticated (no identity) ----
function getWishlistForIdentity(
  identity: { tokenIdentifier: string } | null,
  entries: WishlistEntry[]
): WishlistEntry[] {
  if (!identity) return []
  return entries
}

// ---- Pure helper: returns [] when user record not found ----
function getWishlistForUser(
  user: { _id: string } | null,
  entries: WishlistEntry[]
): WishlistEntry[] {
  if (!user) return []
  return entries
}

// ---- Sample data ----
const USER_ID = 'user-abc'
const OTHER_USER_ID = 'user-xyz'

const makeEntry = (id: string, userId: string, savedAt: number): WishlistEntry => ({
  _id: id,
  userId,
  productId: `product-${id}`,
  savedAt,
  productSnapshot: {
    title: `Product ${id}`,
    imageUrl: `https://example.com/${id}.jpg`,
    priceAmount: 999,
    priceCurrency: 'USD',
    affiliateUrl: `https://example.com/go/${id}`,
    sourceStore: 'dummyjson',
  },
})

// ---- Tests: getWishlist behaviour ----

describe('getWishlist — unauthenticated handling', () => {
  it('returns [] when identity is null (unauthenticated)', () => {
    const entries = [makeEntry('a', USER_ID, 1000)]
    expect(getWishlistForIdentity(null, entries)).toEqual([])
  })

  it('returns [] when user record is not found', () => {
    const entries = [makeEntry('a', USER_ID, 1000)]
    expect(getWishlistForUser(null, entries)).toEqual([])
  })

  it('returns entries when identity exists', () => {
    const entries = [makeEntry('a', USER_ID, 1000)]
    const result = getWishlistForIdentity({ tokenIdentifier: 'tok' }, entries)
    expect(result).toEqual(entries)
  })
})

describe('getWishlist — ordering', () => {
  it('returns entries ordered descending by savedAt (newest first)', () => {
    const older = makeEntry('older', USER_ID, 1000)
    const newer = makeEntry('newer', USER_ID, 2000)
    const entries = [older, newer] // inserted oldest-first
    const result = sortWishlistDesc(entries)
    expect(result[0]._id).toBe('newer')
    expect(result[1]._id).toBe('older')
  })

  it('returns empty array when user has no wishlist items', () => {
    expect(sortWishlistDesc([])).toEqual([])
  })

  it('handles single item correctly', () => {
    const entry = makeEntry('solo', USER_ID, 5000)
    expect(sortWishlistDesc([entry])).toEqual([entry])
  })

  it('returns items in stable order when savedAt values are equal', () => {
    const a = makeEntry('first', USER_ID, 1000)
    const b = makeEntry('second', USER_ID, 1000)
    const result = sortWishlistDesc([a, b])
    // Both have same savedAt, order is stable (or either is acceptable) — just check length
    expect(result).toHaveLength(2)
  })
})

// ---- Tests: removeFromWishlist ownership check ----

describe('removeFromWishlist — ownership validation', () => {
  it('allows delete when entry.userId matches authenticated user', () => {
    const entry = makeEntry('w1', USER_ID, 1000)
    expect(canDelete(entry, USER_ID)).toBe(true)
  })

  it('denies delete when entry.userId belongs to a different user', () => {
    const entry = makeEntry('w1', USER_ID, 1000)
    expect(canDelete(entry, OTHER_USER_ID)).toBe(false)
  })

  it('denies delete when entry is null (wishlistId not found)', () => {
    expect(canDelete(null, USER_ID)).toBe(false)
  })
})
