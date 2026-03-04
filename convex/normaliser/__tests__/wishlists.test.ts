// Unit tests for wishlist filter and ownership check logic
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
    priceAmount: number      // integer cents
    priceCurrency: string
    affiliateUrl: string     // ONLY URL field — no rawUrl/productUrl/storeUrl
    sourceStore: string
  }
}

// ---- Test helpers ----

function makeEntry(overrides: Partial<WishlistEntry> = {}): WishlistEntry {
  return {
    _id: 'entry1',
    userId: 'user1',
    productId: 'prod1',
    savedAt: 1700000000000,
    productSnapshot: {
      title: 'Test Product',
      imageUrl: 'https://example.com/image.jpg',
      priceAmount: 999,
      priceCurrency: 'USD',
      affiliateUrl: 'https://example.com/affiliate?ref=wishswipe',
      sourceStore: 'dummyjson',
    },
    ...overrides,
  }
}

// ---- Pure helper: filter wishlist entries by userId ----
// Mirrors getWishlist query filter in convex/wishlists.ts

function filterWishlistByUser(
  entries: Array<WishlistEntry>,
  userId: string
): Array<WishlistEntry> {
  return entries.filter(e => e.userId === userId)
}

// ---- Pure helper: ownership check before delete ----
// Mirrors removeFromWishlist guard in convex/wishlists.ts

function checkOwnership(entry: WishlistEntry, userId: string): boolean {
  return entry.userId === userId
}

// ---- Pure helper: format price for display ----
// Used in wishlist UI to render productSnapshot.priceAmount

function formatPrice(cents: number, currency: string): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(cents / 100)
}

// ---- Tests: filterWishlistByUser ----

describe('filterWishlistByUser', () => {
  it('returns only entries matching userId', () => {
    const entries = [
      makeEntry({ _id: 'e1', userId: 'user1' }),
      makeEntry({ _id: 'e2', userId: 'user2' }),
      makeEntry({ _id: 'e3', userId: 'user1' }),
    ]
    const result = filterWishlistByUser(entries, 'user1')
    expect(result).toHaveLength(2)
    expect(result.map(e => e._id)).toEqual(['e1', 'e3'])
  })

  it('returns empty array when no entries match userId', () => {
    const entries = [
      makeEntry({ _id: 'e1', userId: 'user2' }),
      makeEntry({ _id: 'e2', userId: 'user3' }),
    ]
    const result = filterWishlistByUser(entries, 'user1')
    expect(result).toEqual([])
  })

  it('returns empty array when entries list is empty', () => {
    const result = filterWishlistByUser([], 'user1')
    expect(result).toEqual([])
  })

  it('excludes entries from other users', () => {
    const entries = [
      makeEntry({ _id: 'e1', userId: 'userA' }),
      makeEntry({ _id: 'e2', userId: 'userB' }),
      makeEntry({ _id: 'e3', userId: 'userC' }),
    ]
    const result = filterWishlistByUser(entries, 'userB')
    expect(result).toHaveLength(1)
    expect(result[0]._id).toBe('e2')
    expect(result[0].userId).toBe('userB')
  })
})

// ---- Tests: checkOwnership ----

describe('checkOwnership', () => {
  it('returns true when entry.userId matches userId', () => {
    const entry = makeEntry({ userId: 'user1' })
    expect(checkOwnership(entry, 'user1')).toBe(true)
  })

  it('returns false when entry.userId does not match (different user — prevents delete of another user entry)', () => {
    const entry = makeEntry({ userId: 'user1' })
    expect(checkOwnership(entry, 'user2')).toBe(false)
  })

  it('returns false with empty string userId', () => {
    const entry = makeEntry({ userId: 'user1' })
    expect(checkOwnership(entry, '')).toBe(false)
  })
})

// ---- Tests: formatPrice ----

describe('formatPrice', () => {
  it('formats 999 cents as "$9.99"', () => {
    expect(formatPrice(999, 'USD')).toBe('$9.99')
  })

  it('formats 12999 cents as "$129.99"', () => {
    expect(formatPrice(12999, 'USD')).toBe('$129.99')
  })

  it('formats 0 cents as "$0.00"', () => {
    expect(formatPrice(0, 'USD')).toBe('$0.00')
  })
})
