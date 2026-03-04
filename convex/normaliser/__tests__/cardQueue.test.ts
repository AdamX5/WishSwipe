// Unit tests for card queue filter logic
// Tests pure helper function — no Convex SDK imports

type Product = { _id: string; [key: string]: unknown }

function filterUnswiped(
  products: Array<Product>,
  swipedIds: Set<string>,
  limit: number = 20
): Array<Product> {
  const queue: Array<Product> = []
  for (const product of products) {
    if (!swipedIds.has(product._id)) {
      queue.push(product)
      if (queue.length === limit) break
    }
  }
  return queue
}

describe('filterUnswiped', () => {
  it('excludes products that have been swiped', () => {
    const products = [{ _id: 'a' }, { _id: 'b' }, { _id: 'c' }]
    const swipedIds = new Set(['a'])
    const result = filterUnswiped(products, swipedIds)
    expect(result).toEqual([{ _id: 'b' }, { _id: 'c' }])
  })

  it('enforces limit — returns exactly limit items from a larger array', () => {
    const products = Array.from({ length: 10 }, (_, i) => ({ _id: String(i) }))
    const swipedIds = new Set(['0', '1', '2']) // 3 swiped
    const result = filterUnswiped(products, swipedIds, 2)
    expect(result).toHaveLength(2)
    expect(result[0]._id).toBe('3')
    expect(result[1]._id).toBe('4')
  })

  it('returns all products when swipedIds is empty (up to limit)', () => {
    const products = [{ _id: 'x' }, { _id: 'y' }, { _id: 'z' }]
    const swipedIds = new Set<string>()
    const result = filterUnswiped(products, swipedIds)
    expect(result).toEqual([{ _id: 'x' }, { _id: 'y' }, { _id: 'z' }])
  })

  it('returns empty array when all products are swiped', () => {
    const products = [{ _id: 'a' }, { _id: 'b' }]
    const swipedIds = new Set(['a', 'b'])
    const result = filterUnswiped(products, swipedIds)
    expect(result).toEqual([])
  })

  it('returns empty array when products list is empty', () => {
    const products: Product[] = []
    const swipedIds = new Set<string>()
    const result = filterUnswiped(products, swipedIds)
    expect(result).toEqual([])
  })

  it('defaults to limit of 20 — returns at most 20 items', () => {
    const products = Array.from({ length: 30 }, (_, i) => ({ _id: String(i) }))
    const swipedIds = new Set<string>()
    const result = filterUnswiped(products, swipedIds)
    expect(result).toHaveLength(20)
  })

  it('handles mixed swiped/unswiped correctly with exact limit', () => {
    // 5 products, 2 swiped, limit=2 — should return first 2 unswiped
    const products = [
      { _id: 'a' }, // swiped
      { _id: 'b' }, // not swiped
      { _id: 'c' }, // swiped
      { _id: 'd' }, // not swiped
      { _id: 'e' }, // not swiped
    ]
    const swipedIds = new Set(['a', 'c'])
    const result = filterUnswiped(products, swipedIds, 2)
    expect(result).toHaveLength(2)
    expect(result.map(p => p._id)).toEqual(['b', 'd'])
  })
})
